// Global test setup for Product Service
process.env.NODE_ENV = 'test';
process.env.ELASTICSEARCH_URL = 'http://localhost:9200';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_S3_BUCKET = 'test-bucket';
