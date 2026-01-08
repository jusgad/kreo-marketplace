import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard compartido para autenticación JWT
 *
 * Verifica que el usuario esté autenticado mediante JWT token.
 * Debe ser usado en conjunto con JwtStrategy configurado en cada servicio.
 *
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * async getProfile(@Request() req) {
 *   return req.user; // Usuario autenticado
 * }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  /**
   * Manejo personalizado de errores de autenticación
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Si hay un error o no hay usuario, lanzar excepción
    if (err || !user) {
      throw err || new UnauthorizedException('Token inválido o expirado');
    }

    return user;
  }

  /**
   * Método opcional para extraer token de diferentes fuentes
   */
  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
