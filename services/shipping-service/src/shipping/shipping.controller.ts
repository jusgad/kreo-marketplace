// ==============================================================================
// SHIPPING CONTROLLER
// Endpoints para cálculo de costos de envío y tracking
// ==============================================================================

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CalculateShippingDto } from './dto/calculate-shipping.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  /**
   * GET /shipping/health
   * Health check endpoint
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'shipping-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /shipping/calculate
   * Calcular costo de envío basado en peso, dimensiones y destino
   */
  @Post('calculate')
  async calculateShipping(@Body() calculateDto: CalculateShippingDto) {
    return this.shippingService.calculateShipping(calculateDto);
  }

  /**
   * GET /shipping/rates
   * Obtener tarifas de envío disponibles
   */
  @Get('rates')
  async getShippingRates() {
    return this.shippingService.getShippingRates();
  }

  /**
   * GET /shipping/track/:trackingNumber
   * Rastrear un envío por número de tracking
   */
  @Get('track/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.trackShipment(trackingNumber);
  }

  /**
   * GET /shipping/carriers
   * Obtener lista de transportistas disponibles
   */
  @Get('carriers')
  async getCarriers() {
    return this.shippingService.getCarriers();
  }
}
