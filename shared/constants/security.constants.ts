// ==============================================================================
// ARCHIVO: shared/constants/security.constants.ts
// FUNCIONALIDAD: Constantes de seguridad para el marketplace
//
// ✅ MEDIA PRIORIDAD #31 SOLUCIONADO: Magic numbers de seguridad
//
// CARACTERÍSTICAS:
// - Valores de seguridad centralizados
// - Configuración de bcrypt, JWT, rate limiting
// - Fácil ajuste de parámetros de seguridad
// ==============================================================================

/**
 * Constantes de bcrypt y hashing
 */
export const HASHING = {
  // Rondas de salt para bcrypt (12 es seguro y performante)
  BCRYPT_SALT_ROUNDS: 12,

  // Algoritmo de hash para tokens
  TOKEN_HASH_ALGORITHM: 'sha256',
} as const;

/**
 * Constantes de JWT
 */
export const JWT = {
  // Expiración del access token (15 minutos)
  ACCESS_TOKEN_EXPIRY: '15m',

  // Expiración del refresh token (7 días)
  REFRESH_TOKEN_EXPIRY: '7d',

  // Expiración del token de verificación de email (24 horas)
  EMAIL_VERIFICATION_TOKEN_EXPIRY: '24h',

  // Expiración del token de reset de contraseña (1 hora)
  PASSWORD_RESET_TOKEN_EXPIRY: '1h',
} as const;

/**
 * Constantes de sesión
 */
export const SESSION = {
  // Timeout de sesión (24 horas)
  TIMEOUT_MS: 24 * 60 * 60 * 1000,

  // Cookie options
  COOKIE_MAX_AGE_ACCESS: 15 * 60 * 1000, // 15 minutos
  COOKIE_MAX_AGE_REFRESH: 7 * 24 * 60 * 60 * 1000, // 7 días
} as const;

/**
 * Constantes de intentos de login
 */
export const LOGIN_ATTEMPTS = {
  // Máximo de intentos fallidos antes de bloqueo
  MAX_ATTEMPTS: 5,

  // Ventana de tiempo para contar intentos (15 minutos)
  WINDOW_MS: 15 * 60 * 1000,

  // Tiempo de bloqueo después de max intentos (30 minutos)
  LOCKOUT_DURATION_MS: 30 * 60 * 1000,
} as const;

/**
 * Constantes de contraseñas
 */
export const PASSWORD = {
  // Longitud mínima
  MIN_LENGTH: 8,

  // Longitud máxima
  MAX_LENGTH: 128,

  // Regex para validar fortaleza
  // Al menos: 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
  STRENGTH_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  // Caracteres especiales permitidos
  ALLOWED_SPECIAL_CHARS: '@$!%*?&',
} as const;

/**
 * Constantes de CORS
 */
export const CORS = {
  // Métodos permitidos
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Headers permitidos
  ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
  ],

  // Headers expuestos
  EXPOSED_HEADERS: ['X-Total-Count', 'X-Page-Count'],

  // Max age del preflight (24 horas)
  MAX_AGE: 24 * 60 * 60,

  // Permitir credenciales
  CREDENTIALS: true,
} as const;

/**
 * Constantes de 2FA
 */
export const TWO_FACTOR = {
  // Nombre de la app para TOTP
  APP_NAME: 'Kreo Marketplace',

  // Longitud del código de backup
  BACKUP_CODE_LENGTH: 8,

  // Cantidad de códigos de backup
  BACKUP_CODE_COUNT: 10,

  // Ventana de tiempo para TOTP (30 segundos)
  TOTP_WINDOW: 1,
} as const;

/**
 * Constantes de sanitización
 */
export const SANITIZATION = {
  // Campos sensibles a redactar en logs
  SENSITIVE_FIELDS: [
    'password',
    'password_hash',
    'credit_card',
    'creditCard',
    'cvv',
    'ssn',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'api_key',
    'apiKey',
    'stripe_secret',
    'stripeSecret',
    'jwt',
    'authorization',
    'cookie',
    'session',
  ],

  // Tags HTML permitidos en descripciones
  ALLOWED_HTML_TAGS: ['b', 'i', 'u', 'br', 'p', 'ul', 'ol', 'li', 'strong', 'em'],

  // Atributos HTML permitidos
  ALLOWED_HTML_ATTRIBUTES: ['class', 'id'],
} as const;

/**
 * Exportar todas las constantes de seguridad
 */
export const SECURITY_CONSTANTS = {
  HASHING,
  JWT,
  SESSION,
  LOGIN_ATTEMPTS,
  PASSWORD,
  CORS,
  TWO_FACTOR,
  SANITIZATION,
} as const;
