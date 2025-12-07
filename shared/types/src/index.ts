// User Types
export interface User {
  id: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  role: 'customer' | 'vendor';
  first_name?: string;
  last_name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Vendor Types
export interface Vendor {
  id: string;
  user_id: string;
  shop_name: string;
  shop_slug: string;
  shop_description?: string;
  shop_logo_url?: string;
  stripe_account_id?: string;
  commission_rate: number;
  is_verified: boolean;
  average_rating: number;
  created_at: Date;
}

export interface CreateVendorDto {
  shop_name: string;
  shop_slug: string;
  shop_description?: string;
  business_type?: string;
}

// Product Types
export interface Product {
  id: string;
  vendor_id: string;
  category_id?: string;
  title: string;
  slug: string;
  description?: string;
  base_price: number;
  compare_at_price?: number;
  inventory_quantity: number;
  status: 'draft' | 'active' | 'archived';
  images?: ProductImage[];
  tags?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ProductImage {
  url: string;
  alt?: string;
  sort: number;
}

export interface CreateProductDto {
  title: string;
  description?: string;
  base_price: number;
  category_id?: string;
  inventory_quantity: number;
  sku?: string;
  weight_value?: number;
  images?: ProductImage[];
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: 'draft' | 'active' | 'archived';
}

export interface ProductVariant {
  id: string;
  product_id: string;
  title: string;
  sku?: string;
  price?: number;
  inventory_quantity: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

// Order Types
export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  email: string;
  shipping_address: Address;
  billing_address: Address;
  subtotal: number;
  shipping_total: number;
  tax_total: number;
  grand_total: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  fulfillment_status: 'unfulfilled' | 'partial' | 'fulfilled';
  created_at: Date;
}

export interface SubOrder {
  id: string;
  order_id: string;
  vendor_id: string;
  suborder_number: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  commission_rate: number;
  commission_amount: number;
  vendor_payout: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking_number?: string;
  tracking_url?: string;
}

export interface OrderItem {
  id: string;
  sub_order_id: string;
  product_id?: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Address {
  first_name: string;
  last_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

export interface CreateOrderDto {
  user_id?: string;
  email: string;
  shipping_address: Address;
  billing_address: Address;
  items: CartItem[];
  payment_method_id: string;
}

// Cart Types
export interface Cart {
  user_id: string;
  items: CartItem[];
  grouped_by_vendor: Record<string, VendorCart>;
  total: number;
}

export interface CartItem {
  product_id: string;
  vendor_id: string;
  quantity: number;
  variant_id?: string;
  price_snapshot: number;
}

export interface VendorCart {
  vendor_id: string;
  items: CartItem[];
  subtotal: number;
  shipping_method?: string;
  shipping_cost: number;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface VendorPayout {
  id: string;
  vendor_id: string;
  sub_order_id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  stripe_transfer_id?: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at?: Date;
}

// Shipping Types
export interface ShippingRate {
  carrier: string;
  service: string;
  amount: number;
  estimated_days: number;
}

export interface ShippingZone {
  id: string;
  vendor_id: string;
  name: string;
  countries: string[];
}

// Review Types
export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  created_at: Date;
}

export interface CreateReviewDto {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Search Types
export interface SearchQuery {
  q?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  vendor_id?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
}

export interface SearchResult {
  products: Product[];
  total: number;
  facets: {
    categories: Array<{ id: string; name: string; count: number }>;
    price_ranges: Array<{ min: number; max: number; count: number }>;
    vendors: Array<{ id: string; name: string; count: number }>;
  };
}
