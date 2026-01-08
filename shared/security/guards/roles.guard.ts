/**
 * PARCHE DE SEGURIDAD #2B: Prevención de Escalada de Privilegios
 *
 * Este guard verifica que solo usuarios con roles específicos puedan
 * acceder a rutas sensibles (ej: rutas de administración).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key para roles requeridos
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar roles requeridos
 *
 * @example
 * @Roles('admin')
 * @Get('admin/users')
 * async getAllUsers() {
 *   // Solo admin puede acceder
 * }
 *
 * @example
 * @Roles('admin', 'vendor')
 * @Get('products')
 * async getProducts() {
 *   // Admin o vendor pueden acceder
 * }
 */
export const Roles = (...roles: string[]) =>
  Reflect.metadata(ROLES_KEY, roles);

/**
 * Guard para verificar roles de usuario
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar que el usuario esté autenticado
    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Verificar que el usuario tenga uno de los roles requeridos
    const hasRole = requiredRoles.some(role => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}

/**
 * Decorador combinado para requerir autenticación + rol específico
 *
 * @example
 * @AdminOnly()
 * @Delete('users/:id')
 * async deleteUser(@Param('id') id: string) {
 *   // Solo admin puede acceder
 * }
 */
export const AdminOnly = () => Roles('admin');

/**
 * Solo para vendors
 */
export const VendorOnly = () => Roles('vendor');

/**
 * Solo para customers
 */
export const CustomerOnly = () => Roles('customer');

/**
 * Para vendors o admins
 */
export const VendorOrAdmin = () => Roles('vendor', 'admin');

/**
 * Tipo de usuario para TypeScript
 */
export enum UserRole {
  ADMIN = 'admin',
  VENDOR = 'vendor',
  CUSTOMER = 'customer',
}

/**
 * Interfaz de usuario con rol
 */
export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole | string;
  [key: string]: any;
}

/**
 * Helper para verificar roles en servicios (fuera de guards)
 */
export class RoleChecker {

  /**
   * Verifica que un usuario tenga un rol específico
   */
  static hasRole(user: UserWithRole, role: UserRole | string): boolean {
    return user.role === role;
  }

  /**
   * Verifica que un usuario tenga uno de varios roles
   */
  static hasAnyRole(user: UserWithRole, roles: (UserRole | string)[]): boolean {
    return roles.includes(user.role);
  }

  /**
   * Verifica que un usuario sea admin
   */
  static isAdmin(user: UserWithRole): boolean {
    return user.role === UserRole.ADMIN;
  }

  /**
   * Verifica que un usuario sea vendor
   */
  static isVendor(user: UserWithRole): boolean {
    return user.role === UserRole.VENDOR;
  }

  /**
   * Verifica que un usuario sea customer
   */
  static isCustomer(user: UserWithRole): boolean {
    return user.role === UserRole.CUSTOMER;
  }

  /**
   * Lanza excepción si el usuario no tiene el rol requerido
   */
  static requireRole(user: UserWithRole, role: UserRole | string): void {
    if (!this.hasRole(user, role)) {
      throw new ForbiddenException(
        `Se requiere el rol '${role}' para realizar esta acción`
      );
    }
  }

  /**
   * Lanza excepción si el usuario no tiene ninguno de los roles requeridos
   */
  static requireAnyRole(user: UserWithRole, roles: (UserRole | string)[]): void {
    if (!this.hasAnyRole(user, roles)) {
      throw new ForbiddenException(
        `Se requiere uno de los siguientes roles: ${roles.join(', ')}`
      );
    }
  }
}
