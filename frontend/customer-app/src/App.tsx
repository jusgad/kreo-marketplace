// ==============================================================================
// ARCHIVO: frontend/customer-app/src/App.tsx
// FUNCIONALIDAD: Componente raíz de la aplicación de clientes (React)
// - Define el router principal con React Router DOM
// - Configura layout global con Navbar y Footer
// - Rutas principales:
//   - /: Página de inicio
//   - /products: Listado de productos
//   - /products/:id: Detalle de producto
//   - /cart: Carrito de compras
//   - /checkout: Proceso de pago
//   - /login: Inicio de sesión
//   - /register: Registro de usuario
//   - /orders: Historial de pedidos
// ==============================================================================

import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductListPage from './pages/ProductListPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OrdersPage from './pages/OrdersPage'

function App() {
  return (
<<<<<<< HEAD
    // Layout global con fondo gris claro (light) / oscuro (dark)
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Barra de navegación fija en la parte superior */}
      <Navbar />

      {/* Contenido principal con padding-top para evitar que Navbar lo cubra */}
      <main className="pt-20">
        <Routes>
          {/* Página de inicio con hero y productos destacados */}
          <Route path="/" element={<HomePage />} />

          {/* Catálogo de productos con filtros */}
          <Route path="/products" element={<ProductListPage />} />

          {/* Detalle de producto individual */}
          <Route path="/products/:id" element={<ProductDetailPage />} />

          {/* Carrito de compras */}
          <Route path="/cart" element={<CartPage />} />

          {/* Proceso de checkout y pago */}
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Autenticación */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Historial de pedidos del usuario */}
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </main>

      {/* Footer con información de la empresa */}
=======
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </main>
>>>>>>> c731df26401408171e200c4d85d5708ac1e76637
      <Footer />
    </div>
  )
}

export default App
