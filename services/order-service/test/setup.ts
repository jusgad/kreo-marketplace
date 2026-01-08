// Global test setup for Order Service
process.env.NODE_ENV = 'test';
process.env.PRODUCT_SERVICE_URL = 'http://localhost:3002';
process.env.PAYMENT_SERVICE_URL = 'http://localhost:3004';
process.env.PLATFORM_COMMISSION_RATE = '10.0';
