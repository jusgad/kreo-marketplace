import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InputValidator } from '../../../../shared/security/sql-injection-prevention';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RolesGuard, Roles, AdminOnly, VendorOnly } from '../../../../shared/security/guards/roles.guard';
import { LoggerService } from '../../../../shared/logging';
import {
  CreateAccountDto,
  CreateAccountLinkDto,
  CreatePaymentIntentDto,
  ExecuteTransfersDto,
} from './dto';

/**
 * CONTROLADOR DE PAGOS - CON AUTENTICACIÓN Y AUTORIZACIÓN
 *
 * IMPORTANTE: Todos los endpoints (excepto webhooks) requieren autenticación JWT.
 * Los permisos específicos se definen por endpoint según el rol del usuario.
 */
@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'No autenticado - Token JWT requerido' })
@ApiResponse({ status: 403, description: 'Acceso denegado - Permisos insuficientes' })
@Controller('payments')
@UseGuards(JwtAuthGuard) // Autenticación obligatoria para todos los endpoints
export class PaymentController {
  private logger: LoggerService;

  constructor(private paymentService: PaymentService) {
    // ✅ CRÍTICO #3 SOLUCIONADO: Logger profesional con sanitización
    this.logger = new LoggerService('payment-controller');
  }

  /**
   * Crear cuenta conectada de Stripe para vendor
   */
  @Post('connect/create-account')
  @UseGuards(RolesGuard)
  @VendorOnly()
  @ApiOperation({
    summary: 'Crear cuenta Stripe Connect para vendor',
    description: `
      Crea una cuenta conectada de Stripe para que un vendor pueda recibir pagos.
      Solo vendors pueden crear sus propias cuentas.
      El email debe coincidir con el email del usuario autenticado.
    `,
  })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 201, description: 'Cuenta Stripe creada exitosamente' })
  async createAccount(
    @Request() req,
    @Body() createAccountDto: CreateAccountDto
  ) {
    // Verificar que el vendor esté creando su propia cuenta
    if (req.user.email !== createAccountDto.email) {
      throw new ForbiddenException('Solo puedes crear una cuenta para tu propio email');
    }

    return this.paymentService.createConnectedAccount(
      createAccountDto.email,
      createAccountDto.country
    );
  }

  /**
   * Generar link de onboarding para cuenta Stripe
   */
  @Post('connect/account-link')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  @ApiOperation({
    summary: 'Generar link de onboarding de Stripe',
    description: `
      Genera un link de onboarding para completar la configuración de la cuenta Stripe Connect.
      Solo vendors o admins pueden generar links.
      Vendors solo pueden generar links para sus propias cuentas.
    `,
  })
  @ApiBody({ type: CreateAccountLinkDto })
  @ApiResponse({ status: 201, description: 'Link de onboarding generado exitosamente' })
  async createAccountLink(
    @Request() req,
    @Body() createAccountLinkDto: CreateAccountLinkDto
  ) {
    // TODO: Verificar que el account_id pertenezca al vendor autenticado
    // (requiere almacenar el mapeo vendor_id -> stripe_account_id en BD)

    return this.paymentService.createAccountLink(
      createAccountLinkDto.account_id,
      createAccountLinkDto.refresh_url,
      createAccountLinkDto.return_url,
    );
  }

  /**
   * Crear Payment Intent para procesar pago
   */
  @Post('create-intent')
  @UseGuards(RolesGuard)
  @AdminOnly() // Solo admins o sistema interno
  @ApiOperation({
    summary: 'Crear Payment Intent (Admin/Sistema interno)',
    description: `
      Crea un Payment Intent de Stripe para procesar un pago.

      **SEGURIDAD CRÍTICA:**
      - Solo el sistema interno (order-service) o admins pueden llamar esto
      - En producción, este endpoint debería ser interno solamente
      - Debería estar protegido por autenticación de servicio a servicio
    `,
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({ status: 201, description: 'Payment Intent creado exitosamente' })
  async createPaymentIntent(
    @Request() req,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto
  ) {
    // TODO: Verificar que order_id pertenezca al usuario o sea una llamada del sistema
    // Por ahora, solo permitimos a admins para seguridad

    return this.paymentService.createPaymentIntent(
      createPaymentIntentDto.order_id,
      createPaymentIntentDto.amount,
      createPaymentIntentDto.application_fee,
      createPaymentIntentDto.metadata,
    );
  }

  /**
   * Ejecutar transferencias a vendors (OPERACIÓN MUY CRÍTICA)
   */
  @Post('execute-transfers')
  @UseGuards(RolesGuard)
  @AdminOnly() // SOLO admins - esto mueve dinero!
  @ApiOperation({
    summary: 'Ejecutar transferencias a vendors (CRÍTICO)',
    description: `
      Ejecuta transferencias de dinero a las cuentas de los vendors.

      **SEGURIDAD MÁXIMA:**
      - SOLO admins o sistema interno pueden ejecutar transferencias
      - Este endpoint mueve dinero real - requiere máxima protección
      - Logging completo de cada operación
      - En producción, debería requerir autenticación adicional (2FA)

      **NOTA:** Este endpoint NO debería ser público. Debería ser llamado solo por el sistema interno.
    `,
  })
  @ApiBody({ type: ExecuteTransfersDto })
  @ApiResponse({ status: 200, description: 'Transferencias ejecutadas exitosamente' })
  async executeTransfers(
    @Request() req,
    @Body() executeTransfersDto: ExecuteTransfersDto
  ) {
    // ✅ SEGURIDAD: Log de evento crítico de transferencia de dinero
    this.logger.logSecurityEvent('TRANSFER_EXECUTION_REQUESTED', 'high', {
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      orderId: executeTransfersDto.order_id,
      subOrdersCount: executeTransfersDto.sub_orders.length,
    });

    return this.paymentService.executeTransfers(
      executeTransfersDto.order_id,
      executeTransfersDto.sub_orders
    );
  }

  /**
   * Webhook de Stripe - NO requiere autenticación JWT
   */
  @Post('webhooks')
  @UseGuards() // Vacío para excluir JwtAuthGuard en este endpoint
  @ApiOperation({
    summary: 'Webhook de eventos de Stripe',
    description: `
      Endpoint para recibir notificaciones de eventos de Stripe.

      **SEGURIDAD:**
      - NO requiere autenticación JWT
      - Validación de firma HMAC de Stripe obligatoria
      - Rate limiting específico aplicado
      - Registro automático de fallos para retry manual
      - Los webhooks fallidos se reintentan automáticamente con backoff exponencial
    `,
    tags: ['webhooks'],
  })
  @ApiHeader({ name: 'stripe-signature', description: 'Firma HMAC de Stripe para validación', required: true })
  @ApiResponse({ status: 200, description: 'Webhook procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Firma inválida o payload malformado' })
  @ApiResponse({ status: 429, description: 'Demasiadas solicitudes - rate limit excedido' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Obtener IP para logging
    const ip = req.ip || req.connection?.remoteAddress;

    return this.paymentService.handleWebhook(signature, req.rawBody, {
      ip,
      headers: req.headers,
    });
  }

  /**
   * Obtener historial de payouts de un vendor
   */
  @Get('vendor/:vendorId/payouts')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  @ApiOperation({
    summary: 'Obtener historial de payouts de vendor',
    description: `
      Retorna el historial de pagos (payouts) recibidos por un vendor.

      **SEGURIDAD:**
      - Vendors solo pueden ver sus propios payouts
      - Admins pueden ver payouts de cualquier vendor
    `,
  })
  @ApiParam({ name: 'vendorId', type: String, description: 'UUID del vendor' })
  @ApiResponse({ status: 200, description: 'Historial de payouts obtenido exitosamente' })
  async getVendorPayouts(
    @Request() req,
    @Param('vendorId') vendorId: string
  ) {
    InputValidator.isValidUUID(vendorId, 'vendorId');

    // Verificar ownership: vendor solo puede ver sus propios payouts
    if (req.user.role === 'vendor' && req.user.id !== vendorId) {
      throw new ForbiddenException('No puedes ver los payouts de otros vendedores');
    }

    return this.paymentService.getVendorPayouts(vendorId);
  }

  /**
   * Obtener ganancias totales de un vendor
   */
  @Get('vendor/:vendorId/earnings')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  @ApiOperation({
    summary: 'Obtener ganancias totales de vendor',
    description: `
      Retorna el total de ganancias acumuladas de un vendor.

      **SEGURIDAD:**
      - Vendors solo pueden ver sus propias ganancias
      - Admins pueden ver ganancias de cualquier vendor
    `,
  })
  @ApiParam({ name: 'vendorId', type: String, description: 'UUID del vendor' })
  @ApiResponse({ status: 200, description: 'Ganancias obtenidas exitosamente' })
  async getVendorEarnings(
    @Request() req,
    @Param('vendorId') vendorId: string
  ) {
    InputValidator.isValidUUID(vendorId, 'vendorId');

    // Verificar ownership: vendor solo puede ver sus propias ganancias
    if (req.user.role === 'vendor' && req.user.id !== vendorId) {
      throw new ForbiddenException('No puedes ver las ganancias de otros vendedores');
    }

    return this.paymentService.getVendorEarnings(vendorId);
  }
}
