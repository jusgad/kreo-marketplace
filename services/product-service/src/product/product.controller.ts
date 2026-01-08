import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { RolesGuard, Roles, VendorOnly, VendorOrAdmin, AdminOnly } from '../../../../shared/security/guards/roles.guard';
import { InputValidator } from '../../../../shared/security/sql-injection-prevention';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

/**
 * CONTROLADOR DE PRODUCTOS - CON AUTENTICACIÓN Y AUTORIZACIÓN
 *
 * SEGURIDAD CRÍTICA:
 * - Solo vendors pueden crear/editar sus propios productos
 * - Vendors NO pueden modificar productos de otros vendors
 * - Admins pueden modificar cualquier producto
 * - Las búsquedas y vistas de productos son públicas (sin auth)
 */
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  /**
   * Buscar productos (PÚBLICO - sin autenticación)
   *
   * Este endpoint es público porque los clientes necesitan buscar productos
   * sin estar autenticados
   */
  @Get('search')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async searchProducts(@Query() searchProductDto: SearchProductDto) {
    return this.productService.searchProducts(searchProductDto);
  }

  /**
   * Obtener múltiples productos en una sola petición (PÚBLICO)
   *
   * OPTIMIZACIÓN: Soluciona N+1 queries
   * En lugar de hacer N llamadas para N productos, hacer 1 sola llamada
   *
   * @example GET /products/batch?ids=uuid1,uuid2,uuid3
   * @example POST /products/batch { "ids": ["uuid1", "uuid2"] }
   */
  @Get('batch')
  async getProductsBatch(@Query('ids') ids: string) {
    // Parsear IDs (pueden venir como string separado por comas)
    const productIds = ids.split(',').map(id => id.trim()).filter(Boolean);

    // Validar cada UUID
    productIds.forEach(id => {
      try {
        InputValidator.isValidUUID(id, 'product_id');
      } catch (error) {
        throw new BadRequestException(`Invalid UUID: ${id}`);
      }
    });

    // Limitar cantidad
    if (productIds.length > 100) {
      throw new BadRequestException('Cannot request more than 100 products at once');
    }

    if (productIds.length === 0) {
      throw new BadRequestException('At least one product ID is required');
    }

    return this.productService.getProductsBatch(productIds);
  }

  /**
   * Obtener detalles de un producto (PÚBLICO)
   */
  @Get(':productId')
  async getProduct(@Param('productId') productId: string) {
    InputValidator.isValidUUID(productId, 'productId');
    return this.productService.getProduct(productId);
  }

  /**
   * Crear nuevo producto (SOLO VENDORS)
   *
   * SEGURIDAD:
   * - Solo usuarios con rol 'vendor' pueden crear productos
   * - El vendor_id se obtiene del JWT, NO del body
   * - Evita que un vendor cree productos a nombre de otro
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @VendorOnly()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createProduct(
    @Request() req,
    @Body() createProductDto: CreateProductDto
  ) {
    // CRÍTICO: Usar vendor_id del JWT, NO permitir override
    const vendorId = req.user.id;

    console.log('📦 Creating product for vendor:', {
      vendorId,
      productTitle: createProductDto.title,
      email: req.user.email,
    });

    return this.productService.createProduct(vendorId, createProductDto);
  }

  /**
   * Actualizar producto existente (SOLO VENDOR DUEÑO O ADMIN)
   *
   * SEGURIDAD:
   * - Vendors solo pueden actualizar sus propios productos
   * - Admins pueden actualizar cualquier producto
   * - Se verifica ownership antes de permitir actualización
   */
  @Put(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @VendorOrAdmin()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async updateProduct(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    InputValidator.isValidUUID(productId, 'productId');

    // Obtener producto para verificar ownership
    const product = await this.productService.getProduct(productId);

    // Verificar que el vendor sea el dueño (a menos que sea admin)
    if (req.user.role !== 'admin' && product.vendor_id !== req.user.id) {
      throw new ForbiddenException('No puedes modificar productos de otros vendedores');
    }

    console.log('✏️  Updating product:', {
      productId,
      vendorId: req.user.id,
      role: req.user.role,
    });

    return this.productService.updateProduct(productId, req.user.id, updateProductDto);
  }

  /**
   * Eliminar producto (SOLO VENDOR DUEÑO O ADMIN)
   *
   * NOTA: En lugar de eliminar físicamente, cambia el estado a 'deleted'
   */
  @Delete(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @VendorOrAdmin()
  async deleteProduct(
    @Request() req,
    @Param('productId') productId: string
  ) {
    InputValidator.isValidUUID(productId, 'productId');

    // Obtener producto para verificar ownership
    const product = await this.productService.getProduct(productId);

    // Verificar ownership
    if (req.user.role !== 'admin' && product.vendor_id !== req.user.id) {
      throw new ForbiddenException('No puedes eliminar productos de otros vendedores');
    }

    console.log('🗑️  Deleting product:', {
      productId,
      vendorId: req.user.id,
    });

    // Soft delete: cambiar estado a 'deleted' en lugar de eliminar
    return this.productService.updateProduct(productId, req.user.id, {
      status: 'deleted',
    });
  }

  /**
   * Listar productos de un vendor específico (PÚBLICO)
   *
   * Los clientes necesitan ver productos de vendors
   */
  @Get('vendor/:vendorId')
  async getVendorProducts(
    @Param('vendorId') vendorId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20
  ) {
    InputValidator.isValidUUID(vendorId, 'vendorId');

    return this.productService.getVendorProducts(vendorId, page, limit);
  }

  /**
   * Listar MIS productos (SOLO VENDOR AUTENTICADO)
   *
   * Un vendor ve sus propios productos para gestión
   */
  @Get('vendor/me/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @VendorOnly()
  async getMyProducts(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('status') status?: string
  ) {
    // El vendor ve solo sus productos
    return this.productService.getVendorProducts(
      req.user.id,
      page,
      limit,
      status
    );
  }

  /**
   * ENDPOINTS DE ADMINISTRACIÓN
   */

  /**
   * Listar todos los productos con filtros (ADMIN ONLY)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  async getAllProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string
  ) {
    // TODO: Implementar query de admin con filtros avanzados
    return {
      message: 'Admin product listing not yet implemented',
      filters: { page, limit, status, vendorId },
    };
  }

  /**
   * Aprobar/rechazar producto (ADMIN ONLY)
   *
   * Para marketplaces que requieren aprobación de productos
   */
  @Post('admin/:productId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @AdminOnly()
  async approveProduct(
    @Param('productId') productId: string,
    @Body() body: { approved: boolean; reason?: string }
  ) {
    InputValidator.isValidUUID(productId, 'productId');

    const newStatus = body.approved ? 'active' : 'rejected';

    console.log('✅ Product approval:', {
      productId,
      approved: body.approved,
      adminId: productId,
    });

    // TODO: Implementar sistema de aprobación
    return {
      message: 'Product approval not yet implemented',
      productId,
      newStatus,
    };
  }

  /**
   * Gestión de inventario (VENDOR O ADMIN)
   */
  @Post(':productId/inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @VendorOrAdmin()
  async updateInventory(
    @Request() req,
    @Param('productId') productId: string,
    @Body() body: { stock_quantity: number; operation: 'set' | 'add' | 'subtract' }
  ) {
    InputValidator.isValidUUID(productId, 'productId');

    // Verificar ownership
    const product = await this.productService.getProduct(productId);
    if (req.user.role !== 'admin' && product.vendor_id !== req.user.id) {
      throw new ForbiddenException('No puedes modificar el inventario de otros vendedores');
    }

    // TODO: Implementar actualización de inventario
    return {
      message: 'Inventory update not yet implemented',
      productId,
      operation: body.operation,
      quantity: body.stock_quantity,
    };
  }

  /**
   * RESERVAR INVENTARIO (SOLO PARA SISTEMA INTERNO - Order Service)
   *
   * Este endpoint es llamado por order-service para reservar inventario de forma atómica.
   * Previene race conditions y overselling usando locks pesimistas.
   *
   * SEGURIDAD: Solo debe ser accesible por servicios internos, NO por clientes
   */
  @Post('reserve')
  async reserveInventory(
    @Body() reserveInventoryDto: { items: Array<{ product_id: string; quantity: number }> }
  ) {
    // TODO: Agregar autenticación de servicio a servicio (API key interna)
    return this.productService.reserveInventory(reserveInventoryDto.items);
  }

  /**
   * LIBERAR INVENTARIO (Rollback de reserva)
   *
   * Llamado cuando una orden falla después de reservar inventario
   */
  @Post('release')
  async releaseInventory(
    @Body() releaseInventoryDto: { items: Array<{ product_id: string; quantity: number }> }
  ) {
    // TODO: Agregar autenticación de servicio a servicio
    return this.productService.releaseInventory(releaseInventoryDto.items);
  }
}
