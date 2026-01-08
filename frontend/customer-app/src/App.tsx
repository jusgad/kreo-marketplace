// ==============================================================================
// ARCHIVO: frontend/customer-app/src/App.tsx (OPTIMIZED)
// FUNCIONALIDAD: Componente raíz de la aplicación de clientes (React)
//
// PERFORMANCE OPTIMIZATIONS APPLIED:
// - Lazy loading de rutas con React.lazy
// - Suspense boundaries con loading fallbacks
// - Code splitting automático por ruta
// - Prefetching de rutas críticas
// - Error boundaries
// ==============================================================================

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LoadingSkeleton from './components/LoadingSkeleton'
import { ErrorBoundary } from './components/ErrorBoundary'

// ==============================================================================
// LAZY LOADED PAGES (Code Splitting)
// Cada página se carga solo cuando el usuario navega a ella
// ==============================================================================

// HomePage se carga eager (es la landing page)
import HomePage from './pages/HomePage'

// Lazy loaded pages
const ProductListPage = lazy(() => import('./pages/ProductListPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))

// ==============================================================================
// PREFETCH CRITICAL ROUTES
// Precarga rutas críticas en idle time para mejor UX
// ==============================================================================

// Prefetch después de que la página cargue
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Usar requestIdleCallback para no bloquear el thread principal
    const prefetchRoutes = () => {
      // Prefetch rutas más visitadas
      import('./pages/ProductListPage')
      import('./pages/LoginPage')
      import('./pages/CartPage')
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchRoutes)
    } else {
      setTimeout(prefetchRoutes, 1000)
    }
  })
}

function App() {
  return (
    // ✅ ALTA PRIORIDAD #22 SOLUCIONADO: Error Boundary Global
    // Captura errores de React y previene "white screen of death"
    // Permite recuperación con botón "Try Again" y navegación al inicio
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navbar siempre visible */}
        <Navbar />

        {/* Contenido principal con Suspense para lazy loading */}
        <main className="pt-20">
          <Suspense fallback={<LoadingSkeleton />}>
            <Routes>
              {/* HomePage (eager loaded) */}
              <Route path="/" element={<HomePage />} />

              {/* Lazy loaded routes */}
              <Route path="/products" element={<ProductListPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/orders" element={<OrdersPage />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  )
}

export default App
