// ==============================================================================
// ARCHIVO: services/auth-service/src/main.ts
// FUNCIONALIDAD: Bootstrap del servicio de autenticación (NestJS)
// - Configura seguridad global: Helmet, CORS, cookies seguras
// - Implementa ValidationPipe para sanitización automática de datos
// - Configura headers de seguridad para prevenir XSS, clickjacking, etc.
// - Habilita parsing de cookies para tokens HTTP-Only
// ==============================================================================

// Importar NestFactory: clase que permite crear una aplicación NestJS
// NestFactory.create() inicializa el servidor HTTP y el sistema de inyección de dependencias
import { NestFactory } from '@nestjs/core';

// Importar ValidationPipe: pipe que valida automáticamente DTOs
// Trabaja con decoradores de class-validator (@IsEmail, @IsString, etc.)
import { ValidationPipe } from '@nestjs/common';

// Importar cookie-parser: middleware que parsea cookies de las peticiones
// Permite acceder a req.cookies en los controladores
// Necesario para leer tokens JWT almacenados en cookies HTTP-Only
import * as cookieParser from 'cookie-parser';

// Importar helmet: middleware que configura headers de seguridad HTTP
// Protege contra XSS, clickjacking, MIME sniffing, etc.
import helmet from 'helmet';

// Importar AppModule: módulo raíz de la aplicación
// Contiene todos los imports, controllers, providers del servicio
import { AppModule } from './app.module';

// Importar Logger profesional centralizado
// Reemplaza console.log con logging estructurado y seguro
import { LoggerService } from '../../../shared/logging';

// Importar utilidades de seguridad personalizadas
// SecureCORS: configuración de CORS segura
// SecurityHeaders: configuración de headers de seguridad con Helmet
import { SecureCORS, SecurityHeaders } from '../../../shared/security/secure-session';

// Función asíncrona que inicializa y configura la aplicación
// Se ejecuta automáticamente al arrancar el servicio
async function bootstrap() {
  // Crear instancia de la aplicación NestJS
  // AppModule contiene toda la configuración del servicio de autenticación
  const app = await NestFactory.create(AppModule);

  // ===========================================================================
  // ✅ CONFIGURACIÓN DE SEGURIDAD GLOBAL
  // Cada configuración protege contra tipos específicos de ataques
  // ===========================================================================

  // 1. CONFIGURAR HELMET - HEADERS DE SEGURIDAD
  // Helmet agrega múltiples headers HTTP que protegen contra ataques comunes
  // Protecciones incluidas:
  // - Content-Security-Policy: previene XSS especificando fuentes permitidas
  // - X-Frame-Options: previene clickjacking bloqueando iframes
  // - X-Content-Type-Options: previene MIME sniffing
  // - Strict-Transport-Security (HSTS): fuerza uso de HTTPS
  // - X-XSS-Protection: activa filtro XSS del navegador
  app.use(helmet(SecurityHeaders.getHelmetOptions()));

  // 2. CONFIGURAR COOKIE PARSER
  // Este middleware parsea las cookies del header 'Cookie' de las peticiones
  // Las convierte en un objeto JavaScript accesible en req.cookies
  // Ejemplo: Cookie: "access_token=abc123" → req.cookies.access_token === "abc123"
  // CRÍTICO para leer tokens JWT almacenados en cookies HTTP-Only
  app.use(cookieParser());

  // 3. CONFIGURAR CORS (Cross-Origin Resource Sharing)
  // Determina qué dominios pueden hacer peticiones a esta API
  // La configuración varía según el entorno:

  // En PRODUCCIÓN: usa lista estricta de dominios permitidos desde .env
  // En DESARROLLO: permite localhost para facilitar desarrollo local
  const corsOptions = process.env.NODE_ENV === 'production'
    ? // CORS de producción: solo dominios específicos en ALLOWED_ORIGINS
      SecureCORS.getProductionCORSOptions()
    : // CORS de desarrollo: permite localhost del frontend
      {
        // origin: dominio del frontend que puede hacer peticiones
        origin: process.env.CUSTOMER_APP_URL || 'http://localhost:5173',

        // credentials: true permite envío de cookies en peticiones cross-origin
        // Sin esto, las cookies HTTP-Only no se enviarían al backend
        credentials: true,

        // methods: métodos HTTP permitidos en peticiones cross-origin
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

        // allowedHeaders: headers que el cliente puede enviar
        allowedHeaders: ['Content-Type', 'Authorization'],
      };

  // Habilitar CORS en la aplicación con las opciones configuradas
  app.enableCors(corsOptions);

  // 4. CONFIGURAR VALIDATION PIPE GLOBAL
  // Este pipe valida y transforma automáticamente todos los DTOs de la aplicación
  // Es la primera línea de defensa contra datos maliciosos
  app.useGlobalPipes(new ValidationPipe({
    // whitelist: true → ELIMINA propiedades no definidas en el DTO
    // Previene ataques de "mass assignment" donde el atacante envía campos extra
    // Ejemplo: si DTO solo tiene {email, password}, ignora {email, password, isAdmin: true}
    whitelist: true,

    // forbidNonWhitelisted: true → RECHAZA peticiones con propiedades extra
    // Más estricto que whitelist: en lugar de ignorar, devuelve error 400
    // Alerta al desarrollador cuando el frontend envía campos incorrectos
    forbidNonWhitelisted: true,

    // transform: true → HABILITA transformaciones automáticas
    // Permite usar decoradores @Transform() en DTOs para sanitizar datos
    // Ejemplo: @Transform(({ value }) => XSSSanitizer.sanitize(value))
    transform: true,

    // transformOptions: opciones adicionales de transformación
    transformOptions: {
      // enableImplicitConversion: false → MÁS SEGURO
      // Requiere conversiones explícitas de tipos
      // Previene conversiones automáticas que podrían causar bugs de seguridad
      // Ejemplo: string "123" NO se convierte automáticamente a number 123
      enableImplicitConversion: false,
    },
  }));

  // 5. DESHABILITAR HEADER X-Powered-By
  // Por defecto, Express envía header "X-Powered-By: Express"
  // Esto revela la tecnología usada, facilitando ataques dirigidos
  // Deshabilitarlo oculta esta información (seguridad por oscuridad)
  // Obtener instancia de Express y deshabilitar el header
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // OBTENER PUERTO DEL SERVIDOR
  // Lee puerto de variable de entorno PORT, o usa 3001 por defecto
  // En producción, el puerto será asignado por el orquestador (Docker, K8s)
  const port = process.env.PORT || 3001;

  // INICIAR EL SERVIDOR
  // La aplicación empieza a escuchar peticiones HTTP en el puerto configurado
  // await espera a que el servidor esté completamente iniciado
  await app.listen(port);

  // Logger profesional para mensajes informativos
  // ✅ CRÍTICO #3 SOLUCIONADO: Reemplazado console.log con logger estructurado
  const logger = new LoggerService('auth-service');
  logger.info(`Auth Service started successfully on port ${port}`, {
    port,
    nodeEnv: process.env.NODE_ENV,
    securityFeatures: ['Helmet', 'Rate Limiting', 'Secure Cookies', 'CORS', 'ValidationPipe'],
  });
}

// EJECUTAR LA FUNCIÓN BOOTSTRAP
// Inicia el proceso de arranque del servicio
// Si ocurre algún error, el proceso se detendrá
bootstrap();
