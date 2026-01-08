// ==============================================================================
// ARCHIVO: api-gateway/src/index.ts
// FUNCIONALIDAD: Punto de entrada del API Gateway
// - Actúa como punto único de acceso para todos los microservicios
// - Configura CORS para permitir peticiones desde las aplicaciones frontend
// - Implementa rate limiting para prevenir abuso de la API
// - Enruta peticiones a los microservicios correspondientes usando proxy
// - Proporciona endpoint de health check para monitoreo
// ==============================================================================

// Importar Express: framework web para Node.js
import express from 'express';

// Importar CORS: middleware para habilitar Cross-Origin Resource Sharing
// Permite que el frontend (en diferente dominio) pueda hacer peticiones al backend
import cors from 'cors';

// Importar express-rate-limit: middleware para limitar cantidad de peticiones
// Previene ataques de denegación de servicio (DoS) y fuerza bruta
import rateLimit from 'express-rate-limit';

// Importar http-proxy-middleware: permite crear proxies para redirigir peticiones
// Actúa como intermediario entre cliente y microservicios
import { createProxyMiddleware } from 'http-proxy-middleware';

// Importar dotenv: carga variables de entorno desde archivo .env
import dotenv from 'dotenv';

// Importar LoggerService: sistema de logging estructurado y seguro
import { LoggerService } from '../../shared/logging';

// Cargar variables de entorno del archivo .env al proceso
// Las variables estarán disponibles en process.env
dotenv.config();

// Crear logger para el API Gateway
const logger = new LoggerService('api-gateway');

// Crear instancia de la aplicación Express
// Esta instancia manejará todas las peticiones HTTP
const app = express();

// Definir puerto en el que escuchará el servidor
// Usa variable de entorno PORT, o 3000 por defecto
const port = process.env.PORT || 3000;

// ==============================================================================
// MIDDLEWARE DE SEGURIDAD
// Los middleware se ejecutan en orden para cada petición recibida
// ==============================================================================

// CONFIGURAR CORS (Cross-Origin Resource Sharing)
// Permite que el navegador acepte peticiones desde dominios específicos
app.use(cors({
  // origin: lista de URLs permitidas para hacer peticiones a esta API
  origin: [
    // URL de la aplicación de clientes (frontend React)
    // Lee de variable de entorno o usa localhost:5173 en desarrollo
    process.env.CUSTOMER_APP_URL || 'http://localhost:5173',

    // URL del portal de vendedores (frontend React)
    // Lee de variable de entorno o usa localhost:5174 en desarrollo
    process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
  ],

  // credentials: true permite que el navegador envíe cookies en peticiones cross-origin
  // Necesario para que funcione la autenticación con cookies HTTP-Only
  credentials: true,
}));

// PARSER DE JSON
// Convierte automáticamente el body de peticiones JSON a objeto JavaScript
// Permite acceder a req.body en los handlers
// Ejemplo: POST con body {"name": "Juan"} → req.body.name === "Juan"
app.use(express.json());

/**
 * SECURITY FIX: Rate limiting configurado apropiadamente
 *
 * CAMBIOS APLICADOS:
 * - Reducido límite general de 1000 a 100 req/min (más seguro)
 * - Agregado rate limiting específico para rutas sensibles
 * - Rate limiting más estricto para auth endpoints
 * - Headers informativos para el cliente
 */

// Rate limiter general para todas las APIs
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // FIXED: 100 requests por minuto (antes 1000 - demasiado alto)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter estricto para endpoints de autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Solo 10 intentos en 15 minutos
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true, // No contar requests exitosos
});

// Rate limiter para endpoints de escritura (POST, PUT, DELETE)
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // 30 operaciones de escritura por minuto
  message: 'Too many write operations, please slow down.',
});

// Aplicar rate limiting general a todas las rutas de API
app.use('/api/', generalLimiter);

// Aplicar rate limiting estricto a rutas de autenticación
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

// ==============================================================================
// RATE LIMITING PARA OPERACIONES DE ESCRITURA
// Aplica límites más estrictos a POST, PUT, DELETE, PATCH
// ==============================================================================
app.use('/api/', (req, res, next) => {
  const writeOperations = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (writeOperations.includes(req.method)) {
    // Aplicar writeLimiter solo a operaciones de escritura
    return writeLimiter(req, res, next);
  }

  // Para GET, OPTIONS, HEAD - continuar sin límite adicional
  next();
});

// ==============================================================================
// CONFIGURACIÓN DE MICROSERVICIOS
// Mapeo de URLs de cada microservicio backend
// Este objeto contiene las direcciones de todos los servicios del sistema
// ==============================================================================
const services = {
  // Auth Service: maneja registro, login, JWT, sesiones
  // En producción usa variable de entorno, en desarrollo usa localhost:3001
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',

  // User Service: maneja perfiles de usuario, preferencias, actualización de datos
  // En producción usa variable de entorno, en desarrollo usa localhost:3002
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',

  // Vendor Service: maneja vendedores, tiendas, productos del vendedor
  // En producción usa variable de entorno, en desarrollo usa localhost:3003
  vendor: process.env.VENDOR_SERVICE_URL || 'http://localhost:3003',

  // Product Service: maneja catálogo, búsqueda, inventario, variantes
  // En producción usa variable de entorno, en desarrollo usa localhost:3004
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3004',

  // Order Service: maneja órdenes, carrito, sub-órdenes, comisiones
  // En producción usa variable de entorno, en desarrollo usa localhost:3005
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',

  // Payment Service: maneja pagos con Stripe, reembolsos, transferencias
  // En producción usa variable de entorno, en desarrollo usa localhost:3006
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',

  // Shipping Service: maneja envíos, seguimiento, cálculo de costos
  // En producción usa variable de entorno, en desarrollo usa localhost:3007
  shipping: process.env.SHIPPING_SERVICE_URL || 'http://localhost:3007',
};

// ==============================================================================
// PROXY ROUTES - Enrutamiento a microservicios
// Cada ruta intercepta peticiones y las redirige al microservicio correspondiente
// ==============================================================================

// PROXY PARA AUTH SERVICE
// Intercepta: GET/POST /api/auth/*
// Redirige a: http://localhost:3001/auth/*
app.use('/api/auth', createProxyMiddleware({
  // target: URL base del servicio de destino
  target: services.auth,

  // changeOrigin: cambia el header 'host' para que coincida con el target
  // Necesario para que el servicio de destino acepte la petición
  changeOrigin: true,

  // pathRewrite: reescribe la URL antes de enviar al servicio
  // Elimina el prefijo '/api/auth' y lo reemplaza con '/auth'
  // Ejemplo: /api/auth/login → /auth/login
  pathRewrite: { '^/api/auth': '/auth' },

  // onError: manejador de errores si el servicio no está disponible
  onError: (err, req, res: any) => {
    // Registrar el error en consola para debugging
    logger.error('Auth service error', err as Error);

    // Responder al cliente con código 503 (Service Unavailable)
    res.status(503).json({ error: 'Auth service unavailable' });
  },
}));

// PROXY PARA USER SERVICE
// Intercepta: /api/users/* → http://localhost:3002/users/*
app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  // Reescribe /api/users/profile → /users/profile
  pathRewrite: { '^/api/users': '/users' },
}));

// PROXY PARA VENDOR SERVICE
// Intercepta: /api/vendors/* → http://localhost:3003/vendors/*
app.use('/api/vendors', createProxyMiddleware({
  target: services.vendor,
  changeOrigin: true,
  // Reescribe /api/vendors/123/products → /vendors/123/products
  pathRewrite: { '^/api/vendors': '/vendors' },
}));

// PROXY PARA PRODUCT SERVICE
// Intercepta: /api/products/* → http://localhost:3004/products/*
app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true,
  // Reescribe /api/products/search → /products/search
  pathRewrite: { '^/api/products': '/products' },
}));

// PROXY PARA ORDER SERVICE (rutas de órdenes)
// Intercepta: /api/orders/* → http://localhost:3005/orders/*
app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  // Reescribe /api/orders/123 → /orders/123
  pathRewrite: { '^/api/orders': '/orders' },
}));

// PROXY PARA ORDER SERVICE (rutas de carrito)
// Nota: el carrito también va al order service
// Intercepta: /api/cart/* → http://localhost:3005/cart/*
app.use('/api/cart', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  // Reescribe /api/cart/items → /cart/items
  pathRewrite: { '^/api/cart': '/cart' },
}));

// PROXY PARA PAYMENT SERVICE
// Intercepta: /api/payments/* → http://localhost:3006/payments/*
app.use('/api/payments', createProxyMiddleware({
  target: services.payment,
  changeOrigin: true,
  // Reescribe /api/payments/create-intent → /payments/create-intent
  pathRewrite: { '^/api/payments': '/payments' },
}));

// PROXY PARA SHIPPING SERVICE
// Intercepta: /api/shipping/* → http://localhost:3007/shipping/*
app.use('/api/shipping', createProxyMiddleware({
  target: services.shipping,
  changeOrigin: true,
  // Reescribe /api/shipping/calculate → /shipping/calculate
  pathRewrite: { '^/api/shipping': '/shipping' },
}));

// ==============================================================================
// ENDPOINTS DE MONITOREO Y MANEJO DE ERRORES
// Estos handlers se ejecutan al final de la cadena de middleware
// ==============================================================================

// ENDPOINT DE HEALTH CHECK
// GET /health
// Propósito: Permite a herramientas de monitoreo verificar que el gateway está funcionando
// Usado por: Docker healthcheck, Kubernetes liveness/readiness probes, load balancers
app.get('/health', (req, res) => {
  // Responder con JSON indicando que el servicio está saludable
  res.json({
    // status: indica que el gateway está operativo
    status: 'healthy',

    // timestamp: momento exacto de la verificación (formato ISO 8601)
    // Útil para detectar si el servicio está "congelado"
    timestamp: new Date().toISOString(),

    // services: muestra las URLs configuradas de cada microservicio
    // Útil para debugging y verificar configuración
    services: {
      auth: services.auth,        // URL del auth service
      user: services.user,        // URL del user service
      vendor: services.vendor,    // URL del vendor service
      product: services.product,  // URL del product service
      order: services.order,      // URL del order service
      payment: services.payment,  // URL del payment service
      shipping: services.shipping, // URL del shipping service
    },
  });
});

// MANEJADOR 404 - RUTA NO ENCONTRADA
// Este middleware se ejecuta solo si ninguna ruta anterior coincidió
// Captura todas las peticiones a rutas que no existen
app.use((req, res) => {
  // Responder con código 404 (Not Found)
  // Enviar JSON con mensaje de error amigable
  res.status(404).json({ error: 'Route not found' });
});

// MANEJADOR GLOBAL DE ERRORES
// Este middleware captura todos los errores que ocurran en cualquier parte del gateway
// Debe tener exactamente 4 parámetros: (err, req, res, next)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Registrar el error completo en consola para debugging
  // En producción, esto debería ir a un sistema de logging como Winston o Bunyan
  logger.error('Gateway error', err as Error);

  // Responder al cliente con código 500 (Internal Server Error)
  // NO revelar detalles del error al cliente por seguridad
  res.status(500).json({ error: 'Internal server error' });
});

// INICIAR EL SERVIDOR
// Escuchar en el puerto configurado y empezar a recibir peticiones
app.listen(port, () => {
  // Mostrar mensaje en consola indicando que el servidor está listo
  logger.info('API Gateway started successfully', { port });

  // Mostrar las URLs de los servicios configurados para verificación
  logger.info('Proxying to services', { services });
});
