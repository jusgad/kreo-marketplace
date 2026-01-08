// ==============================================================================
// VENDOR CONTROLLER
// Endpoints para gestión de vendedores y tiendas
// ==============================================================================

import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Controller('vendors')
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  /**
   * GET /vendors/health
   * Health check endpoint
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'vendor-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /vendors/:id
   * Obtener información de vendedor por ID
   */
  @Get(':id')
  async getVendor(@Param('id') id: string) {
    return this.vendorsService.getVendor(id);
  }

  /**
   * POST /vendors/apply
   * Solicitud para convertirse en vendedor
   */
  @Post('apply')
  async applyAsVendor(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.applyAsVendor(createVendorDto);
  }

  /**
   * GET /vendors/:id/products
   * Obtener productos de un vendedor
   */
  @Get(':id/products')
  async getVendorProducts(
    @Param('id') vendorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.vendorsService.getVendorProducts(vendorId, page, limit);
  }

  /**
   * PUT /vendors/:id/profile
   * Actualizar perfil de vendedor
   */
  @Put(':id/profile')
  async updateVendorProfile(
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto
  ) {
    return this.vendorsService.updateVendorProfile(id, updateVendorDto);
  }

  /**
   * GET /vendors/:id/stats
   * Obtener estadísticas de ventas del vendedor
   */
  @Get(':id/stats')
  async getVendorStats(@Param('id') id: string) {
    return this.vendorsService.getVendorStats(id);
  }
}
