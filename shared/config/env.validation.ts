import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  validateSync,
  MinLength,
  IsUrl,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

/**
 * VALIDACIÓN DE VARIABLES DE ENTORNO
 *
 * CRÍTICO: Este validador asegura que todas las variables de entorno requeridas
 * estén presentes y sean válidas ANTES de que la aplicación inicie.
 *
 * Si alguna validación falla, la aplicación NO ARRANCARÁ.
 */

/**
 * Ambientes soportados
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Variables de entorno comunes a todos los servicios
 */
export class CommonEnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsNumber()
  @Min(1000)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsUrl({ require_tld: false })
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT?: number = 5432;

  @IsOptional()
  @IsString()
  DB_USERNAME?: string;

  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DB_DATABASE?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  DB_POOL_MAX?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  DB_POOL_MIN?: number = 2;
}

/**
 * Variables específicas para auth-service
 */
export class AuthServiceEnvironmentVariables extends CommonEnvironmentVariables {
  @IsString()
  @MinLength(32, {
    message: 'JWT_SECRET debe tener al menos 32 caracteres para ser seguro. Usa: openssl rand -base64 32'
  })
  JWT_SECRET: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres. Usa: openssl rand -base64 32'
  })
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string = '15m';

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRATION?: string = '7d';

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  REDIS_URL?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  MAX_LOGIN_ATTEMPTS?: number = 5;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  LOGIN_ATTEMPT_WINDOW_MINUTES?: number = 15;
}

/**
 * Variables específicas para payment-service
 */
export class PaymentServiceEnvironmentVariables extends CommonEnvironmentVariables {
  @IsString()
  @MinLength(10, {
    message: 'STRIPE_SECRET_KEY es requerida. Obtén tu key en https://dashboard.stripe.com/apikeys'
  })
  STRIPE_SECRET_KEY: string;

  @IsString()
  @MinLength(10, {
    message: 'STRIPE_WEBHOOK_SECRET es requerida para validar webhooks de Stripe'
  })
  STRIPE_WEBHOOK_SECRET: string;

  @IsOptional()
  @IsString()
  ALLOWED_REDIRECT_DOMAINS?: string = 'localhost';
}

/**
 * Variables específicas para product-service
 */
export class ProductServiceEnvironmentVariables extends CommonEnvironmentVariables {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  ELASTICSEARCH_URL?: string = 'http://localhost:9200';

  @IsOptional()
  @IsString()
  AWS_S3_BUCKET?: string;

  @IsOptional()
  @IsString()
  AWS_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsOptional()
  @IsString()
  AWS_REGION?: string = 'us-east-1';
}

/**
 * Variables específicas para order-service
 */
export class OrderServiceEnvironmentVariables extends CommonEnvironmentVariables {
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  REDIS_URL?: string;

  @IsString()
  @IsUrl({ require_tld: false })
  PRODUCT_SERVICE_URL: string;

  @IsString()
  @IsUrl({ require_tld: false })
  PAYMENT_SERVICE_URL: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  PLATFORM_COMMISSION_RATE?: number = 10.0;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  MIN_ORDER_AMOUNT?: number = 0.50;
}

/**
 * Función de validación genérica
 */
export function validate<T extends object>(
  config: Record<string, unknown>,
  ClassType: new () => T
): T {
  const validatedConfig = plainToClass(
    ClassType,
    config,
    { enableImplicitConversion: true }
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints
        ? Object.values(error.constraints)
        : ['Unknown error'];
      return `  ❌ ${error.property}: ${constraints.join(', ')}`;
    }).join('\n');

    throw new Error(
      `\n\n❌❌❌ VALIDACIÓN DE VARIABLES DE ENTORNO FALLÓ ❌❌❌\n\n${errorMessages}\n\n` +
      `📝 Revisa tu archivo .env y asegúrate de que todas las variables requeridas estén presentes.\n\n`
    );
  }

  return validatedConfig;
}

/**
 * Validadores específicos por servicio
 */
export const validateAuthServiceEnv = (config: Record<string, unknown>) =>
  validate(config, AuthServiceEnvironmentVariables);

export const validatePaymentServiceEnv = (config: Record<string, unknown>) =>
  validate(config, PaymentServiceEnvironmentVariables);

export const validateProductServiceEnv = (config: Record<string, unknown>) =>
  validate(config, ProductServiceEnvironmentVariables);

export const validateOrderServiceEnv = (config: Record<string, unknown>) =>
  validate(config, OrderServiceEnvironmentVariables);

export const validateCommonEnv = (config: Record<string, unknown>) =>
  validate(config, CommonEnvironmentVariables);

/**
 * Helper para generar valores seguros
 */
export class SecretGenerator {
  static generateJwtSecret(): string {
    // En desarrollo, sugerir comando
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '\n⚠️  JWT_SECRET no configurado. Genera uno seguro con:\n' +
        '   openssl rand -base64 32\n'
      );
    }
    throw new Error('JWT_SECRET es requerido');
  }

  static isSecure(secret: string, minLength: number = 32): boolean {
    return secret.length >= minLength;
  }
}
