// ==============================================================================
// ARCHIVO: shared/queue/job-types.ts
// FUNCIONALIDAD: Definición de tipos de jobs para el sistema de colas
// ==============================================================================

// Email jobs
export const JobTypes = {
  // Emails
  SEND_WELCOME_EMAIL: 'email:welcome',
  SEND_ORDER_CONFIRMATION: 'email:order-confirmation',
  SEND_SHIPPING_NOTIFICATION: 'email:shipping',
  SEND_PASSWORD_RESET: 'email:password-reset',
  SEND_EMAIL_VERIFICATION: 'email:verification',

  // Notifications
  SEND_PUSH_NOTIFICATION: 'notification:push',
  SEND_SMS: 'notification:sms',

  // Image processing
  PROCESS_PRODUCT_IMAGE: 'image:product',
  GENERATE_THUMBNAILS: 'image:thumbnails',
  OPTIMIZE_IMAGE: 'image:optimize',

  // Analytics
  UPDATE_PRODUCT_VIEWS: 'analytics:product-views',
  UPDATE_SEARCH_STATS: 'analytics:search',
  GENERATE_REPORT: 'analytics:report',

  // Search indexing
  INDEX_PRODUCT: 'search:index-product',
  REINDEX_PRODUCTS: 'search:reindex',

  // Payments
  PROCESS_PAYOUT: 'payment:payout',
  PROCESS_REFUND: 'payment:refund',

  // Webhooks
  PROCESS_STRIPE_WEBHOOK: 'webhook:stripe',
  SEND_WEBHOOK: 'webhook:send',

  // Cleanup
  CLEANUP_EXPIRED_CARTS: 'cleanup:carts',
  CLEANUP_OLD_SESSIONS: 'cleanup:sessions',
};

// Job data interfaces
export interface SendEmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface ProcessImageJobData {
  imageUrl: string;
  productId: string;
  sizes: Array<{ width: number; height: number; name: string }>;
}

export interface IndexProductJobData {
  productId: string;
  action: 'index' | 'update' | 'delete';
}

export interface ProcessPayoutJobData {
  subOrderId: string;
  vendorId: string;
  amount: number;
  stripeAccountId: string;
}
