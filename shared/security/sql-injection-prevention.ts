// ==============================================================================
// ARCHIVO: shared/security/sql-injection-prevention.ts
// FUNCIONALIDAD: Prevención de inyecciones SQL/NoSQL
// - Validadores estrictos de tipos de entrada (UUIDs, enteros, emails)
// - Sanitización de patrones LIKE para búsquedas seguras
// - Validación de paginación y ordenamiento
// - Limitación de tamaño de arrays para prevenir DoS
// - Utilidades para queries seguras con TypeORM
// - Ejemplos de migración de código inseguro a seguro
// ==============================================================================

/**
 * PARCHE DE SEGURIDAD #1: Prevención de Inyección SQL/NoSQL
 *
 * Este módulo proporciona utilidades para prevenir inyecciones SQL/NoSQL
 * mediante validación estricta de entrada y uso correcto de TypeORM.
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Validador de tipos de entrada para prevenir inyección
 * Asegura que los valores coincidan con el tipo esperado
 */
export class InputValidator {

  /**
   * Valida que un valor sea un entero positivo
   * Útil para IDs, cantidades, precios, etc.
   */
  static isPositiveInteger(value: any, fieldName: string = 'value'): number {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      throw new BadRequestException(
        `${fieldName} debe ser un número entero positivo`
      );
    }

    return parsed;
  }

  /**
   * Valida que un valor sea un número decimal positivo
   * Útil para precios, cantidades con decimales
   */
  static isPositiveDecimal(value: any, fieldName: string = 'value'): number {
    const parsed = parseFloat(value);

    if (isNaN(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${fieldName} debe ser un número positivo`
      );
    }

    return parsed;
  }

  /**
   * Valida que un valor sea un UUID válido
   * Previene inyección en queries que usan IDs
   */
  static isValidUUID(value: any, fieldName: string = 'ID'): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!value || typeof value !== 'string' || !uuidRegex.test(value)) {
      throw new BadRequestException(
        `${fieldName} debe ser un UUID válido`
      );
    }

    return value;
  }

  /**
   * Valida que un string solo contenga caracteres alfanuméricos y guiones
   * Útil para slugs, usernames, etc.
   */
  static isAlphanumericWithDashes(value: any, fieldName: string = 'value'): string {
    const regex = /^[a-zA-Z0-9-_]+$/;

    if (!value || typeof value !== 'string' || !regex.test(value)) {
      throw new BadRequestException(
        `${fieldName} solo puede contener letras, números, guiones y guiones bajos`
      );
    }

    return value;
  }

  /**
   * Valida un email
   */
  static isValidEmail(value: any, fieldName: string = 'email'): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value || typeof value !== 'string' || !emailRegex.test(value)) {
      throw new BadRequestException(`${fieldName} debe ser un email válido`);
    }

    return value.toLowerCase();
  }

  /**
   * Sanitiza strings para búsqueda SQL LIKE
   * Escapa caracteres especiales de SQL
   */
  static sanitizeLikePattern(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Escapa caracteres especiales de SQL LIKE: %, _, \
    return value
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  /**
   * Valida un array de UUIDs
   * Útil para queries con IN clauses
   */
  static isValidUUIDArray(values: any[], fieldName: string = 'IDs'): string[] {
    if (!Array.isArray(values) || values.length === 0) {
      throw new BadRequestException(`${fieldName} debe ser un array no vacío`);
    }

    return values.map((value, index) =>
      this.isValidUUID(value, `${fieldName}[${index}]`)
    );
  }

  /**
   * Limita el tamaño de una lista para prevenir DoS
   */
  static limitArraySize<T>(
    array: T[],
    maxSize: number = 100,
    fieldName: string = 'array'
  ): T[] {
    if (!Array.isArray(array)) {
      throw new BadRequestException(`${fieldName} debe ser un array`);
    }

    if (array.length > maxSize) {
      throw new BadRequestException(
        `${fieldName} no puede contener más de ${maxSize} elementos`
      );
    }

    return array;
  }
}

/**
 * Ejemplo de migración de query insegura a segura
 *
 * ❌ INSEGURO (Concatenación directa):
 * const query = `SELECT * FROM products WHERE title LIKE '%${userInput}%'`;
 *
 * ✅ SEGURO (TypeORM con parámetros):
 * const products = await productRepository
 *   .createQueryBuilder('product')
 *   .where('product.title LIKE :search', {
 *     search: `%${InputValidator.sanitizeLikePattern(userInput)}%`
 *   })
 *   .getMany();
 *
 * ✅ SEGURO (TypeORM con ILike para case-insensitive):
 * const products = await productRepository.find({
 *   where: {
 *     title: ILike(`%${InputValidator.sanitizeLikePattern(userInput)}%`)
 *   }
 * });
 */

/**
 * Clase de utilidades para queries seguras con TypeORM
 */
export class SecureQueryBuilder {

  /**
   * Crea una búsqueda segura con LIKE
   */
  static createLikeSearch(searchTerm: string): string {
    const sanitized = InputValidator.sanitizeLikePattern(searchTerm);
    return `%${sanitized}%`;
  }

  /**
   * Valida parámetros de paginación
   */
  static validatePagination(page?: number, limit?: number): {
    page: number;
    limit: number;
    skip: number;
  } {
    const validPage = page && page > 0 ? parseInt(String(page), 10) : 1;
    const validLimit = limit && limit > 0 && limit <= 100
      ? parseInt(String(limit), 10)
      : 20;

    return {
      page: validPage,
      limit: validLimit,
      skip: (validPage - 1) * validLimit,
    };
  }

  /**
   * Valida opciones de ordenamiento
   */
  static validateSortField(
    sortField: string,
    allowedFields: string[]
  ): string {
    if (!allowedFields.includes(sortField)) {
      throw new BadRequestException(
        `Campo de ordenamiento inválido. Valores permitidos: ${allowedFields.join(', ')}`
      );
    }

    return sortField;
  }

  /**
   * Valida dirección de ordenamiento
   */
  static validateSortOrder(order: string): 'ASC' | 'DESC' {
    const upperOrder = order?.toUpperCase();

    if (upperOrder !== 'ASC' && upperOrder !== 'DESC') {
      return 'ASC';
    }

    return upperOrder;
  }
}

/**
 * Decorador personalizado para validación de UUIDs en parámetros
 */
export function ValidateUUID(fieldName?: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    // Este decorador se puede usar con NestJS Pipes para validación automática
  };
}
