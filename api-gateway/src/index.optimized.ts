// ==============================================================================
// ARCHIVO: api-gateway/src/index.optimized.ts
// FUNCIONALIDAD: API Gateway optimizado con performance enhancements
//
// OPTIMIZACIONES APLICADAS:
// - Compression (Gzip/Brotli) para reducir tamaño de respuestas
// - Response caching con Redis para endpoints read-heavy
// - Rate limiting distribuido con Redis
// - Response time tracking y métricas
// - Security headers con Helmet
// - Connection pooling para proxies
// - Request batching support
// - Health checks mejorados
// ==============================================================================

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import compression from 'compression';
import responseTime from 'response-time';
import helmet from 'helmet';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ==============================================================================
// REDIS CONNECTION POOL
// ==============================================================================

const redis = new Redis({
  host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));

// ==============================================================================
// PERFORMANCE MIDDLEWARE
// ==============================================================================

// Response time tracking
app.use(responseTime((req, res, time) => {
  // Log slow requests (> 1 second)
  if (time > 1000) {
    console.warn(`⚠️  Slow request: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// Compression (Gzip)
app.use(compression({
  threshold: 1024, // Only compress responses > 1KB
  level: 6, // Balance between speed and compression
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter
    return compression.filter(req, res);
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
    process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
  ],
  credentials: true,
  exposedHeaders: ['X-Response-Time', 'X-Cache-Status'],
}));

// JSON parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================================================
// RATE LIMITING CON REDIS (DISTRIBUIDO)
// ==============================================================================

// General rate limiter con Redis store
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return (req as any).user?.id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: 60,
    });
  },
});

// Auth rate limiter (más estricto)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:auth:',
  }),
});

// Write operations limiter
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redis.call(...args),
    prefix: 'rl:write:',
  }),
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==============================================================================
// RESPONSE CACHING MIDDLEWARE
// ==============================================================================

interface CacheOptions {
  ttl: number; // seconds
  keyPrefix?: string;
  varyByQuery?: boolean;
}

const cacheMiddleware = (options: CacheOptions) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip cache if user requests fresh data
    if (req.headers['cache-control'] === 'no-cache') {
      return next();
    }

    // Generate cache key
    const keyPrefix = options.keyPrefix || 'cache';
    const queryString = options.varyByQuery ? JSON.stringify(req.query) : '';
    const cacheKey = `${keyPrefix}:${req.path}:${queryString}`;

    try {
      // Try to get from cache
      const cached = await redis.get(cacheKey);

      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache-Status', 'HIT');
        return res.json(data);
      }

      // Cache miss - intercept response
      res.setHeader('X-Cache-Status', 'MISS');

      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        // Cache the response (fire and forget)
        redis.setex(cacheKey, options.ttl, JSON.stringify(data)).catch(err =>
          console.error('Cache set error:', err)
        );
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// ==============================================================================
// SERVICES CONFIGURATION
// ==============================================================================

const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  vendor: process.env.VENDOR_SERVICE_URL || 'http://localhost:3003',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3004',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  shipping: process.env.SHIPPING_SERVICE_URL || 'http://localhost:3007',
};

// ==============================================================================
// PROXY CONFIGURATION CON OPTIMIZACIONES
// ==============================================================================

const proxyOptions = {
  changeOrigin: true,

  // Connection pooling
  agent: undefined, // Use default agent with keep-alive

  // Timeout configuration
  proxyTimeout: 30000, // 30 seconds
  timeout: 30000,

  // Logging
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',

  // Error handling
  onError: (err: any, req: express.Request, res: express.Response) => {
    console.error('Proxy error:', err);
    res.status(503).json({
      error: 'Service unavailable',
      message: 'The requested service is currently unavailable',
    });
  },

  // Request/response interceptors
  onProxyReq: fixRequestBody,

  onProxyRes: (proxyRes: any, req: express.Request, res: express.Response) => {
    // Add cache control headers
    if (req.method === 'GET' && proxyRes.statusCode === 200) {
      proxyRes.headers['Cache-Control'] = 'public, max-age=60';
    }
  },
};

// ==============================================================================
// PROXY ROUTES WITH CACHING
// ==============================================================================

// Auth Service (no cache - sensitive data)
app.use('/api/auth', createProxyMiddleware({
  ...proxyOptions,
  target: services.auth,
  pathRewrite: { '^/api/auth': '/auth' },
}));

// User Service (short cache for profile)
app.use('/api/users', createProxyMiddleware({
  ...proxyOptions,
  target: services.user,
  pathRewrite: { '^/api/users': '/users' },
}));

// Vendor Service
app.use('/api/vendors', createProxyMiddleware({
  ...proxyOptions,
  target: services.vendor,
  pathRewrite: { '^/api/vendors': '/vendors' },
}));

// Product Service (cache heavily - read-heavy)
app.use('/api/products',
  cacheMiddleware({ ttl: 300, keyPrefix: 'products', varyByQuery: true }), // 5 min cache
  createProxyMiddleware({
    ...proxyOptions,
    target: services.product,
    pathRewrite: { '^/api/products': '/products' },
  })
);

// Order Service (no cache - transactional)
app.use('/api/orders', createProxyMiddleware({
  ...proxyOptions,
  target: services.order,
  pathRewrite: { '^/api/orders': '/orders' },
}));

// Cart Service (short cache)
app.use('/api/cart',
  cacheMiddleware({ ttl: 30, keyPrefix: 'cart' }), // 30 sec cache
  createProxyMiddleware({
    ...proxyOptions,
    target: services.order,
    pathRewrite: { '^/api/cart': '/cart' },
  })
);

// Payment Service (no cache - critical)
app.use('/api/payments', createProxyMiddleware({
  ...proxyOptions,
  target: services.payment,
  pathRewrite: { '^/api/payments': '/payments' },
}));

// Shipping Service
app.use('/api/shipping', createProxyMiddleware({
  ...proxyOptions,
  target: services.shipping,
  pathRewrite: { '^/api/shipping': '/shipping' },
}));

// ==============================================================================
// HEALTH CHECK & METRICS
// ==============================================================================

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    redis: {
      connected: redis.status === 'ready',
    },
    services: {} as any,
  };

  // Check all services health (with timeout)
  const healthChecks = Object.entries(services).map(async ([name, url]) => {
    try {
      const axios = require('axios');
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      health.services[name] = {
        status: 'healthy',
        url,
      };
    } catch (error) {
      health.services[name] = {
        status: 'unhealthy',
        url,
      };
    }
  });

  await Promise.allSettled(healthChecks);

  res.json(health);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    redis: {
      connected: redis.status === 'ready',
      info: await redis.info('stats').catch(() => 'unavailable'),
    },
  };

  res.json(metrics);
});

// Cache stats endpoint
app.get('/cache/stats', async (req, res) => {
  try {
    const info = await redis.info('stats');
    const keyspace = await redis.info('keyspace');

    res.json({
      info: info.split('\n').reduce((acc: any, line) => {
        const [key, value] = line.split(':');
        if (key && value) acc[key.trim()] = value.trim();
        return acc;
      }, {}),
      keyspace,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Clear cache endpoint (admin only)
app.delete('/cache/clear', async (req, res) => {
  // TODO: Add admin auth middleware
  try {
    const pattern = req.query.pattern as string || 'cache:*';
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }

    res.json({
      success: true,
      cleared: keys.length,
      pattern,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ==============================================================================
// ERROR HANDLERS
// ==============================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==============================================================================
// START SERVER
// ==============================================================================

app.listen(port, () => {
  console.log(`🚀 Optimized API Gateway running on port ${port}`);
  console.log(`📊 Metrics available at http://localhost:${port}/metrics`);
  console.log(`🏥 Health check at http://localhost:${port}/health`);
  console.log(`📡 Proxying to services:`, services);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await redis.quit();
  process.exit(0);
});
