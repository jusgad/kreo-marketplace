import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    process.env.CUSTOMER_APP_URL || 'http://localhost:5173',
    process.env.VENDOR_PORTAL_URL || 'http://localhost:5174',
  ],
  credentials: true,
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Service routes configuration
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  vendor: process.env.VENDOR_SERVICE_URL || 'http://localhost:3003',
  product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3004',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:3005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  shipping: process.env.SHIPPING_SERVICE_URL || 'http://localhost:3007',
};

// Proxy routes
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
  onError: (err, req, res: any) => {
    console.error('Auth service error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  },
}));

app.use('/api/users', createProxyMiddleware({
  target: services.user,
  changeOrigin: true,
  pathRewrite: { '^/api/users': '/users' },
}));

app.use('/api/vendors', createProxyMiddleware({
  target: services.vendor,
  changeOrigin: true,
  pathRewrite: { '^/api/vendors': '/vendors' },
}));

app.use('/api/products', createProxyMiddleware({
  target: services.product,
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
}));

app.use('/api/orders', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' },
}));

app.use('/api/cart', createProxyMiddleware({
  target: services.order,
  changeOrigin: true,
  pathRewrite: { '^/api/cart': '/cart' },
}));

app.use('/api/payments', createProxyMiddleware({
  target: services.payment,
  changeOrigin: true,
  pathRewrite: { '^/api/payments': '/payments' },
}));

app.use('/api/shipping', createProxyMiddleware({
  target: services.shipping,
  changeOrigin: true,
  pathRewrite: { '^/api/shipping': '/shipping' },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: services.auth,
      user: services.user,
      vendor: services.vendor,
      product: services.product,
      order: services.order,
      payment: services.payment,
      shipping: services.shipping,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🌐 API Gateway running on port ${port}`);
  console.log(`📡 Proxying to services:`, services);
});
