// ==============================================================================
// USER CONTROLLER
// Endpoints para gestión de perfiles de usuario
// ==============================================================================

import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users/health
   * Health check endpoint
   */
  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /users/:id
   * Obtener perfil de usuario por ID
   */
  @Get(':id')
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  /**
   * PUT /users/:id/profile
   * Actualizar perfil de usuario
   */
  @Put(':id/profile')
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  /**
   * GET /users/:id/addresses
   * Obtener direcciones del usuario
   */
  @Get(':id/addresses')
  async getUserAddresses(@Param('id') id: string) {
    return this.usersService.getUserAddresses(id);
  }
}
