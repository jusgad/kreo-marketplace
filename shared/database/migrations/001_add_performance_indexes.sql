-- ==============================================================================
-- MIGRATION: 001_add_performance_indexes.sql
-- DESCRIPCIÓN: Agregar índices de performance a todas las tablas
-- FECHA: 2025-12-28
-- ==============================================================================

-- ==============================================================================
-- USERS TABLE INDEXES
-- ==============================================================================

-- Composite index para login (email + deleted_at)
CREATE INDEX IF NOT EXISTS idx_users_email_deleted ON users(email, deleted_at);

-- Index para filtrar por rol
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index para email verification
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Index para last login (analytics)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Index para created_at (sorting y date ranges)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ==============================================================================
-- PRODUCTS TABLE INDEXES
-- ==============================================================================

-- Composite indexes para queries comunes
CREATE INDEX IF NOT EXISTS idx_products_status_vendor ON products(status, vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_status_category ON products(status, category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_views ON products(status, view_count DESC);

-- GIN index para JSONB columns (búsqueda en atributos)
CREATE INDEX IF NOT EXISTS idx_products_images_gin ON products USING GIN (images);
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON products USING GIN (attributes);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_title_search ON products USING GIN (to_tsvector('english', title));

-- ==============================================================================
-- ORDERS TABLE INDEXES
-- ==============================================================================

-- Composite index para user order history (más común)
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- Index para order lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- Indexes para filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ==============================================================================
-- SUB_ORDERS TABLE INDEXES
-- ==============================================================================

-- Composite indexes para queries comunes
CREATE INDEX IF NOT EXISTS idx_suborders_order_vendor ON sub_orders(order_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_suborders_vendor_status ON sub_orders(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_suborders_status ON sub_orders(status);
CREATE INDEX IF NOT EXISTS idx_suborders_created_at ON sub_orders(created_at DESC);

-- ==============================================================================
-- ORDER_ITEMS TABLE INDEXES
-- ==============================================================================

-- Index para joining con sub_orders
CREATE INDEX IF NOT EXISTS idx_order_items_suborder ON order_items(sub_order_id);

-- Index para product analytics
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ==============================================================================
-- VENDOR_PAYOUTS TABLE INDEXES (si existe)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_created ON vendor_payouts(created_at DESC);

-- ==============================================================================
-- QUERY PERFORMANCE OPTIMIZATIONS
-- ==============================================================================

-- Analyze tables para actualizar estadísticas del query planner
ANALYZE users;
ANALYZE products;
ANALYZE orders;
ANALYZE sub_orders;
ANALYZE order_items;

-- ==============================================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ==============================================================================

SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_indexes
JOIN pg_class ON pg_class.relname = indexname
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
