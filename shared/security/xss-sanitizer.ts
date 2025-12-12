// ==============================================================================
// ARCHIVO: shared/security/xss-sanitizer.ts
// FUNCIONALIDAD: Sanitización de entrada para prevenir ataques XSS
// - Elimina scripts, eventos inline y HTML peligroso de entrada de usuarios
// - Permite HTML básico de formato en descripciones (opcional)
// - Métodos específicos para productos, reseñas, comentarios, URLs
// - Decorador @Sanitize para aplicar automáticamente en DTOs
// - Whitelist configurable de tags y atributos permitidos
// ==============================================================================

/**
 * PARCHE DE SEGURIDAD #3: Prevención de Cross-Site Scripting (XSS)
 *
 * Este módulo proporciona utilidades para sanitizar la entrada del usuario
 * y prevenir ataques XSS persistentes en descripciones de productos, reseñas, etc.
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Configuración de sanitización
 */
export interface SanitizeConfig {
  /**
   * Permitir tags HTML básicos de formato
   */
  allowBasicFormatting?: boolean;

  /**
   * Tags HTML permitidos (whitelist)
   */
  allowedTags?: string[];

  /**
   * Atributos permitidos para cada tag
   */
  allowedAttributes?: { [tag: string]: string[] };

  /**
   * Longitud máxima del contenido
   */
  maxLength?: number;

  /**
   * Eliminar todos los tags HTML (modo estricto)
   */
  stripAllTags?: boolean;
}

/**
 * Clase principal para sanitización XSS
 */
export class XSSSanitizer {

  /**
   * Tags HTML básicos seguros para formato de texto
   */
  private static readonly SAFE_FORMATTING_TAGS = [
    'b', 'i', 'u', 'em', 'strong', 'br', 'p', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote',
  ];

  /**
   * Atributos seguros por tag
   */
  private static readonly SAFE_ATTRIBUTES: { [tag: string]: string[] } = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'span': ['class'],
    'p': ['class'],
    'div': ['class'],
  };

  /**
   * Patrones peligrosos que siempre se deben eliminar
   */
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // onclick, onerror, etc.
    /on\w+\s*=\s*[^\s>]*/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  ];

  /**
   * Sanitiza texto eliminando todo HTML (modo más seguro)
   */
  static sanitizeText(text: string, maxLength?: number): string {
    if (!text) return '';

    // Eliminar todos los tags HTML
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Decodificar entidades HTML
    sanitized = this.decodeHTMLEntities(sanitized);

    // Eliminar caracteres de control
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    // Limitar longitud
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * Sanitiza HTML permitiendo solo tags seguros
   */
  static sanitizeHTML(html: string, config: SanitizeConfig = {}): string {
    if (!html) return '';

    const {
      allowBasicFormatting = true,
      allowedTags = this.SAFE_FORMATTING_TAGS,
      allowedAttributes = this.SAFE_ATTRIBUTES,
      maxLength = 50000,
      stripAllTags = false,
    } = config;

    // Si se requiere eliminar todos los tags, usar sanitizeText
    if (stripAllTags) {
      return this.sanitizeText(html, maxLength);
    }

    let sanitized = html;

    // Eliminar patrones peligrosos
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Eliminar tags no permitidos
    sanitized = this.removeDisallowedTags(sanitized, allowedTags);

    // Eliminar atributos no permitidos
    sanitized = this.removeDisallowedAttributes(sanitized, allowedAttributes);

    // Limitar longitud
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * Sanitiza entrada para descripciones de productos
   */
  static sanitizeProductDescription(description: string): string {
    return this.sanitizeHTML(description, {
      allowBasicFormatting: true,
      allowedTags: ['b', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'strong', 'em'],
      maxLength: 5000,
    });
  }

  /**
   * Sanitiza entrada para reseñas de usuarios
   */
  static sanitizeReview(review: string): string {
    return this.sanitizeHTML(review, {
      allowBasicFormatting: true,
      allowedTags: ['b', 'i', 'u', 'br', 'p'],
      maxLength: 2000,
    });
  }

  /**
   * Sanitiza entrada para comentarios
   */
  static sanitizeComment(comment: string): string {
    return this.sanitizeHTML(comment, {
      stripAllTags: true, // Comentarios sin HTML
      maxLength: 1000,
    });
  }

  /**
   * Sanitiza nombre de usuario o título
   */
  static sanitizeTitle(title: string): string {
    return this.sanitizeText(title, 200);
  }

  /**
   * Sanitiza URL para href
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';

    // Eliminar espacios
    let sanitized = url.trim();

    // Verificar que comience con protocolo seguro
    if (!sanitized.match(/^https?:\/\//i)) {
      throw new BadRequestException('URL debe comenzar con http:// o https://');
    }

    // Eliminar javascript:, data:, etc.
    if (sanitized.match(/^(javascript|data|vbscript):/i)) {
      throw new BadRequestException('Protocolo de URL no permitido');
    }

    return sanitized;
  }

  /**
   * Elimina tags no permitidos
   */
  private static removeDisallowedTags(html: string, allowedTags: string[]): string {
    const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

    return html.replace(tagPattern, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match; // Tag permitido
      }
      return ''; // Tag no permitido, eliminar
    });
  }

  /**
   * Elimina atributos no permitidos de los tags
   */
  private static removeDisallowedAttributes(
    html: string,
    allowedAttributes: { [tag: string]: string[] }
  ): string {
    const tagPattern = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;

    return html.replace(tagPattern, (match, tagName, attributes) => {
      const tag = tagName.toLowerCase();
      const allowed = allowedAttributes[tag] || [];

      if (allowed.length === 0) {
        // No se permiten atributos para este tag
        return `<${tag}>`;
      }

      // Filtrar solo atributos permitidos
      const attrPattern = /(\w+)\s*=\s*["']([^"']*)["']/g;
      const safeAttrs: string[] = [];
      let attrMatch;

      while ((attrMatch = attrPattern.exec(attributes)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2];

        if (allowed.includes(attrName)) {
          // Sanitizar el valor del atributo
          const safeValue = this.sanitizeAttributeValue(attrName, attrValue);
          safeAttrs.push(`${attrName}="${safeValue}"`);
        }
      }

      if (safeAttrs.length > 0) {
        return `<${tag} ${safeAttrs.join(' ')}>`;
      }

      return `<${tag}>`;
    });
  }

  /**
   * Sanitiza el valor de un atributo
   */
  private static sanitizeAttributeValue(attrName: string, value: string): string {
    // Eliminar javascript:, data:, etc. de hrefs y srcs
    if (attrName === 'href' || attrName === 'src') {
      if (value.match(/^(javascript|data|vbscript):/i)) {
        return '#';
      }
    }

    // Eliminar eventos inline
    if (value.match(/on\w+\s*=/i)) {
      return '';
    }

    // Escapar comillas
    return value.replace(/[<>"']/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return entities[char] || char;
    });
  }

  /**
   * Decodifica entidades HTML básicas
   */
  private static decodeHTMLEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&lt;': '<',
      '&gt;': '>',
      '&amp;': '&',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
    };

    return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Verifica si un texto contiene HTML potencialmente peligroso
   */
  static containsDangerousHTML(text: string): boolean {
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Escapa HTML para mostrar como texto plano
   */
  static escapeHTML(text: string): string {
    if (!text) return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

/**
 * Decorador para sanitizar automáticamente campos en DTOs
 */
export function Sanitize(config?: SanitizeConfig) {
  return function (target: any, propertyKey: string) {
    let value: any;

    const getter = function () {
      return value;
    };

    const setter = function (newVal: any) {
      if (typeof newVal === 'string') {
        value = XSSSanitizer.sanitizeHTML(newVal, config);
      } else {
        value = newVal;
      }
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
