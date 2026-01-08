// ==============================================================================
// ARCHIVO: services/product-service/src/swagger.config.ts
// FUNCIONALIDAD: Configuración de Swagger/OpenAPI para documentación de API
//
// ✅ MEDIA PRIORIDAD #28 SOLUCIONADO: Documentación OpenAPI/Swagger
//
// CARACTERÍSTICAS:
// - Documentación interactiva de API
// - Esquemas de request/response
// - Ejemplos de uso
// - Autenticación JWT
// ==============================================================================

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

/**
 * Configuración de Swagger para Product Service
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Kreo Marketplace - Product Service API')
    .setDescription(`
      API REST para la gestión de productos en Kreo Marketplace.

      ## Características
      - CRUD completo de productos
      - Búsqueda con Elasticsearch
      - Gestión de inventario
      - Reservas de stock para órdenes
      - Soft delete de productos
      - Sistema de categorías y tags

      ## Autenticación
      Todos los endpoints que requieren autenticación esperan un JWT válido
      en el header Authorization: Bearer <token>

      ## Rate Limiting
      - Endpoints públicos: 100 req/min
      - Endpoints de escritura: 30 req/min
      - Búsquedas: 60 req/min
    `)
    .setVersion('1.0')
    .setContact(
      'Kreo Marketplace Team',
      'https://kreo-marketplace.com',
      'support@kreo-marketplace.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addTag('products', 'Operaciones CRUD de productos')
    .addTag('search', 'Búsqueda y filtrado de productos')
    .addTag('inventory', 'Gestión de inventario y stock')
    .addTag('categories', 'Gestión de categorías')
    .addTag('health', 'Health checks y métricas')

    // Esquemas de autenticación
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )

    // Headers comunes
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key para servicios internos',
      },
      'API-Key'
    )

    // Servidores
    .addServer('http://localhost:3004', 'Local Development')
    .addServer('https://api-dev.kreo-marketplace.com', 'Development')
    .addServer('https://api-staging.kreo-marketplace.com', 'Staging')
    .addServer('https://api.kreo-marketplace.com', 'Production')

    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // Opciones adicionales
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
    extraModels: [], // Agregar models extras si es necesario
  });

  // Configurar UI de Swagger
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Kreo Product Service API',
    customfavIcon: 'https://kreo-marketplace.com/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { font-size: 2.5em }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none', // 'list' | 'full' | 'none'
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  console.log('📚 Swagger documentation available at: /api/docs');
}

/**
 * Ejemplos de respuestas comunes para reutilizar en decoradores
 */
export const SwaggerResponses = {
  // Respuestas de éxito
  Created: {
    status: 201,
    description: 'Recurso creado exitosamente',
  },

  Updated: {
    status: 200,
    description: 'Recurso actualizado exitosamente',
  },

  Deleted: {
    status: 200,
    description: 'Recurso eliminado exitosamente',
  },

  // Respuestas de error
  BadRequest: {
    status: 400,
    description: 'Solicitud inválida - verifique los datos enviados',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  },

  Unauthorized: {
    status: 401,
    description: 'No autenticado - token JWT inválido o ausente',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  },

  Forbidden: {
    status: 403,
    description: 'No autorizado - permisos insuficientes',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Forbidden resource' },
      },
    },
  },

  NotFound: {
    status: 404,
    description: 'Recurso no encontrado',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Resource not found' },
      },
    },
  },

  Conflict: {
    status: 409,
    description: 'Conflicto - el recurso ya existe',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Resource already exists' },
      },
    },
  },

  TooManyRequests: {
    status: 429,
    description: 'Demasiadas solicitudes - rate limit excedido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 429 },
        message: { type: 'string', example: 'Too many requests' },
      },
    },
  },

  InternalServerError: {
    status: 500,
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
      },
    },
  },
};

/**
 * Decoradores Swagger comunes para queries de paginación
 */
export const PaginationQuery = {
  page: {
    name: 'page',
    required: false,
    description: 'Número de página (default: 1)',
    example: 1,
    type: Number,
  },

  limit: {
    name: 'limit',
    required: false,
    description: 'Resultados por página (default: 20, max: 100)',
    example: 20,
    type: Number,
  },

  sortBy: {
    name: 'sortBy',
    required: false,
    description: 'Campo para ordenar',
    example: 'created_at',
  },

  sortOrder: {
    name: 'sortOrder',
    required: false,
    description: 'Orden de clasificación',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  },
};
