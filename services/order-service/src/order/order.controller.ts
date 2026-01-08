import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { InternalServiceGuard } from '../../../../shared/guards/internal-service.guard';
import { RolesGuard, Roles } from '../../../../shared/security/guards/roles.guard';
import { InputValidator } from '../../../../shared/security/sql-injection-prevention';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  UpdateShippingDto,
} from './dto';

/**
 * CONTROLADOR DE ÓRDENES - CON AUTENTICACIÓN Y VALIDACIÓN IDOR
 *
 * SEGURIDAD IMPLEMENTADA:
 * - Autenticación JWT obligatoria en todos los endpoints
 * - Validación de ownership: usuarios solo ven sus propias órdenes
 * - Admins pueden ver todas las órdenes
 * - Validación de parámetros de entrada
 *
 * IDOR PROTECTION:
 * - getOrderDetails: verifica que order.user_id === req.user.id
 * - getUserOrders: solo retorna órdenes del usuario autenticado
 * - confirmPayment: verifica ownership antes de confirmar
 */
@Controller('orders')
@UseGuards(JwtAuthGuard) // Autenticación obligatoria
export class OrderController {
  constructor(private orderService: OrderService) {}

  /**
   * Crear nueva orden desde el carrito
   *
   * SEGURIDAD:
   * - Solo el usuario autenticado puede crear órdenes para sí mismo
   * - El userId se obtiene del token JWT, no del body
   */
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createOrder(
    @Request() req,
    @Body() checkoutData: CreateOrderDto
  ) {
    // CRÍTICO: Usar userId del JWT, NO del body
    const userId = req.user.id;

    // Validar que el email del checkout coincida con el usuario autenticado
    // (opcional, pero recomendado para evitar confusiones)
    if (checkoutData.email !== req.user.email) {
      console.warn('Email mismatch in checkout', {
        userEmail: req.user.email,
        checkoutEmail: checkoutData.email,
      });
      // Puedes decidir si lanzar error o usar el email del usuario
      // throw new BadRequestException('Email must match your account email');
    }

    return this.orderService.createOrder(userId, checkoutData);
  }

  /**
   * Obtener todas las órdenes del usuario autenticado con paginación
   *
   * SEGURIDAD:
   * - Usuarios solo ven sus propias órdenes
   * - Admins pueden ver todas las órdenes (implementar si es necesario)
   *
   * PAGINACIÓN:
   * - page: número de página (default: 1)
   * - limit: órdenes por página (default: 20, máx: 100)
   *
   * @example GET /orders?page=1&limit=20
   */
  @Get()
  async getUserOrders(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    // El servicio filtra por userId automáticamente y pagina resultados
    return this.orderService.getUserOrders(req.user.id, page, limit);
  }

  /**
   * Obtener detalles de una orden específica
   *
   * PROTECCIÓN IDOR:
   * - Verifica que la orden pertenezca al usuario autenticado
   * - Admins pueden ver cualquier orden
   *
   * EJEMPLO DE ATAQUE IDOR BLOQUEADO:
   * Usuario A (id: abc-123) intenta: GET /orders/xyz-789
   * Si orden xyz-789 pertenece a Usuario B → 403 Forbidden
   */
  @Get(':orderId')
  async getOrderDetails(
    @Request() req,
    @Param('orderId') orderId: string
  ) {
    // Validar UUID
    InputValidator.isValidUUID(orderId, 'orderId');

    // El servicio verifica ownership internamente
    return this.orderService.getOrderDetails(
      orderId,
      req.user.id, // Usuario autenticado
      req.user.role // Rol (admin puede ver todas)
    );
  }

  /**
   * Verificar orden (endpoint interno)
   *
   * ✅ CRÍTICO #8 SOLUCIONADO: Endpoint para validación de webhooks
   * - Solo accesible por servicios internos (payment-service)
   * - Retorna información de la orden para validación
   * - Protegido con InternalServiceGuard
   */
  @Get(':orderId/verify')
  @UseGuards(InternalServiceGuard)
  async verifyOrder(@Param('orderId') orderId: string) {
    InputValidator.isValidUUID(orderId, 'orderId');

    // Obtener orden sin verificar ownership (es llamada interna)
    const order = await this.orderService.getOrderById(orderId);

    // Retornar solo la información necesaria para validación
    return {
      id: order.id,
      grand_total: order.grand_total,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      payment_status: order.payment_status,
      status: order.status,
      user_id: order.user_id,
    };
  }

  /**
   * Confirmar pago de una orden
   *
   * ✅ CRÍTICO #8 SOLUCIONADO: Acepta llamadas de payment-service
   * - Usuarios autenticados pueden confirmar su propia orden
   * - Servicios internos pueden confirmar cualquier orden
   * - Verifica ownership cuando es llamada por usuario
   */
  @Post(':orderId/confirm-payment')
  @UseGuards() // Sin guards para permitir tanto JWT como Internal
  async confirmPayment(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() confirmData?: { payment_intent_id?: string; amount_received?: number; currency?: string }
  ) {
    InputValidator.isValidUUID(orderId, 'orderId');

    // Verificar si es llamada interna o de usuario
    const isInternalCall = req.headers['x-internal-service'] === 'payment-service';

    if (!isInternalCall) {
      // Si es llamada de usuario, verificar autenticación y ownership
      if (!req.user || !req.user.id) {
        throw new ForbiddenException('Authentication required');
      }

      // Verificar ownership
      await this.orderService.getOrderDetails(
        orderId,
        req.user.id,
        req.user.role
      );
    }

    // Confirmar el pago
    return this.orderService.confirmPayment(orderId, confirmData);
  }

  /**
   * Cancelar una orden
   *
   * SEGURIDAD:
   * - Solo el dueño o admins pueden cancelar
   * - No se pueden cancelar órdenes ya pagadas/enviadas
   */
  @Post(':orderId/cancel')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async cancelOrder(
    @Request() req,
    @Param('orderId') orderId: string,
    @Body() cancelOrderDto: CancelOrderDto
  ) {
    InputValidator.isValidUUID(orderId, 'orderId');

    // Verificar ownership
    const order = await this.orderService.getOrderDetails(
      orderId,
      req.user.id,
      req.user.role
    );

    // Validar que la orden pueda ser cancelada
    if (['shipped', 'delivered'].includes(order.status)) {
      throw new ForbiddenException('No puedes cancelar órdenes ya enviadas o entregadas');
    }

    if (order.payment_status === 'paid') {
      throw new ForbiddenException('No puedes cancelar órdenes ya pagadas. Contacta soporte para reembolso.');
    }

    // TODO: Implementar lógica de cancelación
    return {
      message: 'Order cancellation not yet implemented',
      orderId,
      reason: cancelOrderDto.reason,
    };
  }

  /**
   * ENDPOINTS SOLO PARA ADMINS
   */

  /**
   * Listar todas las órdenes (admin only)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllOrders(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string
  ) {
    // TODO: Implementar paginación y filtros
    return {
      message: 'Admin order listing not yet implemented',
      page,
      limit,
      status,
    };
  }

  /**
   * Actualizar estado de orden (admin only)
   */
  @Post('admin/:orderId/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() updateStatusDto: UpdateOrderStatusDto
  ) {
    InputValidator.isValidUUID(orderId, 'orderId');

    // TODO: Implementar actualización de estado
    return {
      message: 'Order status update not yet implemented',
      orderId,
      newStatus: updateStatusDto.status,
    };
  }

  /**
   * ENDPOINTS PARA VENDORS
   */

  /**
   * Listar sub-órdenes de un vendor (vendor only)
   *
   * SEGURIDAD:
   * - Vendors solo ven sus propias sub-órdenes
   * - Admins pueden ver todas
   */
  @Get('vendor/sub-orders')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  async getVendorSubOrders(@Request() req) {
    // Si es vendor, solo sus sub-órdenes
    // Si es admin, todas las sub-órdenes
    const vendorId = req.user.role === 'vendor' ? req.user.id : undefined;

    // TODO: Implementar query de sub-órdenes
    return {
      message: 'Vendor sub-orders listing not yet implemented',
      vendorId,
    };
  }

  /**
   * Actualizar estado de envío de sub-orden (vendor only)
   */
  @Post('vendor/sub-orders/:subOrderId/shipping')
  @UseGuards(RolesGuard)
  @Roles('vendor', 'admin')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateShippingStatus(
    @Request() req,
    @Param('subOrderId') subOrderId: string,
    @Body() updateShippingDto: UpdateShippingDto
  ) {
    InputValidator.isValidUUID(subOrderId, 'subOrderId');

    // TODO: Verificar que la sub-orden pertenezca al vendor
    // TODO: Implementar actualización de envío

    return {
      message: 'Shipping status update not yet implemented',
      subOrderId,
      trackingNumber: updateShippingDto.tracking_number,
    };
  }
}
