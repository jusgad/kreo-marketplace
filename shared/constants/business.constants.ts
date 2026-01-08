// ==============================================================================
// ARCHIVO: shared/constants/business.constants.ts
// FUNCIONALIDAD: Constantes de negocio para el marketplace
//
// ✅ MEDIA PRIORIDAD #31 SOLUCIONADO: Magic numbers reemplazados con constantes
//
// CARACTERÍSTICAS:
// - Valores de negocio centralizados
// - Fácil modificación sin buscar en código
// - Documentación integrada
// - Type-safe con TypeScript
// ==============================================================================

/**
 * Constantes de comisiones y pagos
 */
export const COMMISSION = {
  // Comisión por defecto de la plataforma (%)
  DEFAULT_RATE: 10.0,

  // Comisión mínima permitida (%)
  MIN_RATE: 5.0,

  // Comisión máxima permitida (%)
  MAX_RATE: 30.0,

  // Comisiones por categoría (%)
  BY_CATEGORY: {
    electronics: 8.0,
    fashion: 12.0,
    home_garden: 10.0,
    sports: 10.0,
    books: 15.0,
    toys: 11.0,
    beauty: 13.0,
    automotive: 9.0,
  },
} as const;

/**
 * Constantes de carrito de compras
 */
export const CART = {
  // TTL del carrito en segundos (7 días)
  TTL_SECONDS: 7 * 24 * 60 * 60,

  // Máximo de items en el carrito
  MAX_ITEMS: 50,

  // Máxima cantidad por item
  MAX_QUANTITY_PER_ITEM: 100,

  // Mínimo de items para checkout
  MIN_ITEMS_FOR_CHECKOUT: 1,
} as const;

/**
 * Constantes de órdenes
 */
export const ORDER = {
  // Prefijo para números de orden
  NUMBER_PREFIX: 'ORD',

  // Tiempo máximo para confirmar pago (minutos)
  PAYMENT_TIMEOUT_MINUTES: 30,

  // Tiempo para auto-cancelar orden sin pago (horas)
  AUTO_CANCEL_HOURS: 24,

  // Estados válidos
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    PAID: 'paid',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },
} as const;

/**
 * Constantes de productos
 */
export const PRODUCT = {
  // Precio mínimo ($)
  MIN_PRICE: 0.01,

  // Precio máximo ($)
  MAX_PRICE: 999999.99,

  // Longitud mínima del título
  MIN_TITLE_LENGTH: 3,

  // Longitud máxima del título
  MAX_TITLE_LENGTH: 200,

  // Longitud mínima de la descripción
  MIN_DESCRIPTION_LENGTH: 10,

  // Longitud máxima de la descripción
  MAX_DESCRIPTION_LENGTH: 5000,

  // Máximo de imágenes por producto
  MAX_IMAGES: 10,

  // Máximo de tags por producto
  MAX_TAGS: 20,

  // Máximo de productos en bulk upload
  MAX_BULK_UPLOAD: 100,

  // Estados
  STATUS: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    OUT_OF_STOCK: 'out_of_stock',
    DELETED: 'deleted',
    REJECTED: 'rejected',
  },
} as const;

/**
 * Constantes de búsqueda y paginación
 */
export const PAGINATION = {
  // Resultados por defecto por página
  DEFAULT_LIMIT: 20,

  // Límite máximo de resultados
  MAX_LIMIT: 100,

  // Límite mínimo de resultados
  MIN_LIMIT: 1,

  // Página por defecto
  DEFAULT_PAGE: 1,
} as const;

/**
 * Constantes de caché
 */
export const CACHE = {
  // TTL por defecto (5 minutos)
  DEFAULT_TTL: 5 * 60,

  // TTL corto (1 minuto) - datos que cambian frecuentemente
  SHORT_TTL: 60,

  // TTL medio (15 minutos) - datos semi-estáticos
  MEDIUM_TTL: 15 * 60,

  // TTL largo (1 hora) - datos estáticos
  LONG_TTL: 60 * 60,

  // TTL extra largo (24 horas) - configuración
  EXTRA_LONG_TTL: 24 * 60 * 60,
} as const;

/**
 * Constantes de rate limiting
 */
export const RATE_LIMIT = {
  // Requests generales por minuto
  GENERAL_PER_MINUTE: 100,

  // Requests de autenticación por ventana
  AUTH_PER_WINDOW: 10,

  // Ventana de tiempo para autenticación (15 minutos)
  AUTH_WINDOW_MS: 15 * 60 * 1000,

  // Requests de escritura por minuto
  WRITE_PER_MINUTE: 30,

  // Requests de búsqueda por minuto
  SEARCH_PER_MINUTE: 60,
} as const;

/**
 * Constantes de validación de archivos
 */
export const FILE = {
  // Tamaño máximo de imagen (5MB)
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,

  // Tipos de imagen permitidos
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Extensiones de imagen permitidas
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

/**
 * Constantes de notificaciones
 */
export const NOTIFICATION = {
  // Tipos de notificación
  TYPES: {
    ORDER_PLACED: 'order_placed',
    ORDER_SHIPPED: 'order_shipped',
    ORDER_DELIVERED: 'order_delivered',
    PAYMENT_RECEIVED: 'payment_received',
    REVIEW_RECEIVED: 'review_received',
  },

  // Canales de notificación
  CHANNELS: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app',
  },
} as const;

/**
 * Exportar todas las constantes como un objeto
 */
export const BUSINESS_CONSTANTS = {
  COMMISSION,
  CART,
  ORDER,
  PRODUCT,
  PAGINATION,
  CACHE,
  RATE_LIMIT,
  FILE,
  NOTIFICATION,
} as const;
