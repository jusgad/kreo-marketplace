/**
 * PARCHE DE SEGURIDAD #2: Prevención de IDOR (Insecure Direct Object Reference)
 *
 * Este guard verifica que un usuario solo pueda acceder a sus propios recursos.
 * Previene que un usuario acceda a pedidos, perfiles, o recursos de otros usuarios.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';

/**
 * Metadata key para el decorador de ownership
 */
export const OWNERSHIP_KEY = 'ownership_config';

/**
 * Configuración de verificación de ownership
 */
export interface OwnershipConfig {
  /**
   * Nombre de la entidad a verificar (ej: 'Order', 'Product')
   */
  entity: string;

  /**
   * Nombre del repositorio inyectado
   */
  repositoryToken: string;

  /**
   * Nombre del parámetro en la ruta que contiene el ID del recurso
   * Por defecto: 'id'
   */
  resourceIdParam?: string;

  /**
   * Nombre del campo en la entidad que contiene el ID del usuario dueño
   * Por defecto: 'user_id'
   */
  ownerField?: string;

  /**
   * Permitir acceso si el usuario es admin
   * Por defecto: true
   */
  allowAdmin?: boolean;

  /**
   * Mensaje de error personalizado
   */
  errorMessage?: string;
}

/**
 * Decorador para marcar rutas que requieren verificación de ownership
 *
 * @example
 * @CheckOwnership({
 *   entity: 'Order',
 *   repositoryToken: 'OrderRepository',
 *   resourceIdParam: 'orderId',
 *   ownerField: 'user_id'
 * })
 * @Get('orders/:orderId')
 * async getOrder(@Param('orderId') orderId: string, @Request() req) {
 *   // Solo el dueño o un admin puede acceder
 * }
 */
export const CheckOwnership = (config: OwnershipConfig) =>
  Reflect.metadata(OWNERSHIP_KEY, config);

/**
 * Guard genérico para verificar ownership de recursos
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.get<OwnershipConfig>(
      OWNERSHIP_KEY,
      context.getHandler(),
    );

    if (!config) {
      // Si no hay configuración, permitir acceso (el guard no está activo)
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario esté autenticado
    if (!user || !user.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Si el usuario es admin y se permite, dar acceso
    if (config.allowAdmin !== false && user.role === 'admin') {
      return true;
    }

    // Obtener el ID del recurso desde los parámetros
    const resourceIdParam = config.resourceIdParam || 'id';
    const resourceId = request.params[resourceIdParam];

    if (!resourceId) {
      throw new ForbiddenException(
        `Parámetro ${resourceIdParam} no encontrado en la ruta`
      );
    }

    // Obtener el repositorio desde el request
    // NOTA: El repositorio debe ser inyectado en el controlador y pasado al contexto
    const repository = this.getRepository(request, config.repositoryToken);

    if (!repository) {
      throw new Error(
        `Repositorio ${config.repositoryToken} no encontrado. ` +
        `Asegúrate de inyectarlo en el controlador.`
      );
    }

    // Buscar el recurso
    const ownerField = config.ownerField || 'user_id';
    const resource = await repository.findOne({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException(
        config.errorMessage || `${config.entity} no encontrado`
      );
    }

    // Verificar que el usuario sea el dueño
    if (resource[ownerField] !== user.id) {
      throw new ForbiddenException(
        config.errorMessage || `No tienes permiso para acceder a este ${config.entity.toLowerCase()}`
      );
    }

    return true;
  }

  private getRepository(request: any, token: string): Repository<any> | null {
    // El repositorio debe estar disponible en el request
    return request[token] || null;
  }
}

/**
 * Función helper más simple para verificar ownership directamente en servicios
 */
export class OwnershipChecker {

  /**
   * Verifica que un recurso pertenezca al usuario
   *
   * @throws ForbiddenException si el usuario no es el dueño
   * @throws NotFoundException si el recurso no existe
   */
  static async checkOwnership<T>(
    repository: Repository<T>,
    resourceId: string,
    userId: string,
    options: {
      ownerField?: string;
      resourceName?: string;
      allowAdmin?: boolean;
      userRole?: string;
    } = {}
  ): Promise<T> {
    const {
      ownerField = 'user_id',
      resourceName = 'Recurso',
      allowAdmin = true,
      userRole = null,
    } = options;

    // Si es admin, permitir acceso sin verificar ownership
    if (allowAdmin && userRole === 'admin') {
      const resource = await repository.findOne({
        where: { id: resourceId } as any,
      });

      if (!resource) {
        throw new NotFoundException(`${resourceName} no encontrado`);
      }

      return resource;
    }

    // Buscar el recurso verificando ownership en una sola query
    const resource = await repository.findOne({
      where: {
        id: resourceId,
        [ownerField]: userId,
      } as any,
    });

    if (!resource) {
      // No revelar si el recurso existe pero no es del usuario (prevenir información leak)
      throw new NotFoundException(
        `${resourceName} no encontrado o no tienes permiso para acceder`
      );
    }

    return resource;
  }

  /**
   * Verifica que un usuario tenga un rol específico
   */
  static checkRole(userRole: string, requiredRole: string | string[]): boolean {
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return required.includes(userRole);
  }

  /**
   * Verifica múltiples condiciones de ownership
   */
  static checkMultipleOwnership(
    resource: any,
    userId: string,
    ownerFields: string[]
  ): boolean {
    return ownerFields.some(field => resource[field] === userId);
  }
}
