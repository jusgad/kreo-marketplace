// Global test setup for Payment Service
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.ALLOWED_REDIRECT_DOMAINS = 'localhost,example.com';
