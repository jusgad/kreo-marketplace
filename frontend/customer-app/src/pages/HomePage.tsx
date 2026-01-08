// ==============================================================================
// PÁGINA: HomePage.tsx
// FUNCIONALIDAD: Página principal del marketplace (landing page)
// - Hero section con animaciones y CTAs
// - Grid de categorías con iconos y gradientes
// - Productos destacados con loading skeletons
// - Sección de features/beneficios
// - CTA para convertirse en vendedor
// - Diseño responsive con animaciones Framer Motion
// ==============================================================================

// Importar Link de React Router para navegación sin recargar página
import { Link } from 'react-router-dom'

// Importar motion de Framer Motion para animaciones fluidas
import { motion } from 'framer-motion'

// Importar iconos de Lucide React
import {
  Smartphone,   // Icono de celular para Electrónicos
  Shirt,        // Icono de camisa para Moda
  Home,         // Icono de casa para Hogar y Jardín
  Dumbbell,     // Icono de pesas para Deportes
  Book,         // Icono de libro para Libros
  Baby,         // Icono de bebé para Juguetes y Niños
  Sparkles,     // Icono de destellos para Belleza
  Car,          // Icono de auto para Automotriz
  TrendingUp,   // Icono de tendencia para productos populares
  Shield,       // Icono de escudo para Seguridad
  Truck,        // Icono de camión para Envío
  CreditCard,   // Icono de tarjeta para Pagos
} from 'lucide-react'

// Importar componentes personalizados
import HeroSection from '../components/HeroSection'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/LoadingSkeleton'

// Importar hooks de React
import { useState, useEffect } from 'react'

// CONSTANTE: CATEGORÍAS DE PRODUCTOS
// Array con las categorías principales del marketplace
// Cada categoría tiene:
// - name: nombre visible al usuario
// - icon: componente de icono de Lucide
// - color: gradiente Tailwind CSS para el diseño
// - path: slug para la URL (/products?category=electronics)
const categories = [
  { name: 'Electronics', icon: Smartphone, color: 'from-blue-500 to-cyan-500', path: 'electronics' },
  { name: 'Fashion', icon: Shirt, color: 'from-pink-500 to-purple-500', path: 'fashion' },
  { name: 'Home & Garden', icon: Home, color: 'from-green-500 to-emerald-500', path: 'home-garden' },
  { name: 'Sports', icon: Dumbbell, color: 'from-orange-500 to-red-500', path: 'sports' },
  { name: 'Books', icon: Book, color: 'from-yellow-500 to-orange-500', path: 'books' },
  { name: 'Toys & Kids', icon: Baby, color: 'from-purple-500 to-pink-500', path: 'toys' },
  { name: 'Beauty', icon: Sparkles, color: 'from-pink-500 to-rose-500', path: 'beauty' },
  { name: 'Automotive', icon: Car, color: 'from-gray-600 to-gray-800', path: 'automotive' },
]

// CONSTANTE: FEATURES/BENEFICIOS DEL MARKETPLACE
// Sección "Why Choose Kreo?" con beneficios clave
// Cada feature muestra un icono, título y descripción
const features = [
  {
    icon: Shield,
    title: 'Secure Shopping',
    description: 'Your data is protected with industry-leading security',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Get your orders delivered quickly and reliably',
  },
  {
    icon: CreditCard,
    title: 'Easy Returns',
    description: '30-day hassle-free returns on all products',
  },
  {
    icon: TrendingUp,
    title: 'Best Prices',
    description: 'Competitive pricing and exclusive deals daily',
  },
]

// CONSTANTE: PRODUCTOS DESTACADOS (MOCK DATA)
// En producción, estos productos se obtendrían de la API del product-service
// Cada producto tiene: id, title, precio, rating, reviews, descuento, badges, imagen
const mockProducts = [
  {
    id: '1',
    title: 'Premium Wireless Headphones with Active Noise Cancellation',
    base_price: 299.99,
    rating: 4.8,
    reviews: 1234,
    discount: 25,
    isTrending: true,
    images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' }],
  },
  {
    id: '2',
    title: 'Smart Watch Pro - Fitness Tracker with Heart Rate Monitor',
    base_price: 399.99,
    rating: 4.6,
    reviews: 856,
    discount: 15,
    isNew: true,
    images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' }],
  },
  {
    id: '3',
    title: 'Professional Camera Kit with Lens Bundle',
    base_price: 1299.99,
    rating: 4.9,
    reviews: 445,
    images: [{ url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400' }],
  },
  {
    id: '4',
    title: 'Designer Leather Backpack - Perfect for Travel',
    base_price: 189.99,
    rating: 4.7,
    reviews: 623,
    discount: 20,
    images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400' }],
  },
  {
    id: '5',
    title: 'Ultra HD 4K Smart TV - 55 Inch Display',
    base_price: 799.99,
    rating: 4.5,
    reviews: 2341,
    discount: 30,
    isTrending: true,
    images: [{ url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400' }],
  },
  {
    id: '6',
    title: 'Ergonomic Gaming Chair with Lumbar Support',
    base_price: 349.99,
    rating: 4.6,
    reviews: 789,
    isNew: true,
    images: [{ url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=400' }],
  },
  {
    id: '7',
    title: 'Portable Bluetooth Speaker - Waterproof',
    base_price: 79.99,
    rating: 4.4,
    reviews: 1567,
    discount: 35,
    images: [{ url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400' }],
  },
  {
    id: '8',
    title: 'Stainless Steel Coffee Maker - Programmable',
    base_price: 129.99,
    rating: 4.7,
    reviews: 934,
    images: [{ url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400' }],
  },
]

// COMPONENTE: HomePage
// Página principal del marketplace
export default function HomePage() {
  // ESTADO: isLoading
  // Controla si se muestran skeletons de carga o los productos reales
  // Se usa para simular carga de datos (en producción sería un fetch a la API)
  const [isLoading, setIsLoading] = useState(true)

  // EFFECT: SIMULAR CARGA DE DATOS
  // En producción, aquí haríamos un fetch a la API para obtener productos
  // El timeout simula latencia de red (1 segundo)
  useEffect(() => {
    // Crear timer que cambia isLoading a false después de 1 segundo
    const timer = setTimeout(() => setIsLoading(false), 1000)

    // Cleanup: limpiar el timer si el componente se desmonta
    // Previene memory leaks y actualizaciones de estado en componente desmontado
    return () => clearTimeout(timer)
  }, []) // [] = ejecutar solo al montar el componente

  return (
    // Contenedor principal con altura mínima de pantalla completa
    // bg-gray-50: fondo gris claro en modo light
    // dark:bg-gray-900: fondo gris oscuro en modo dark
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SECCIÓN 1: HERO */}
      {/* Banner principal con animaciones, texto destacado y CTAs */}
      <HeroSection />

      {/* SECCIÓN 2: CATEGORÍAS */}
      {/* Grid de tarjetas con las categorías principales */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título de sección con animación de entrada */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}        // Estado inicial: invisible y 20px abajo
            whileInView={{ opacity: 1, y: 0 }}     // Al entrar en viewport: visible y posición normal
            viewport={{ once: true }}              // Solo animar una vez
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Explore our diverse range of products
            </p>
          </motion.div>

          {/* Grid responsive de categorías */}
          {/* 2 columnas en móvil, 4 columnas en desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {/* Mapear cada categoría a una tarjeta animada */}
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                // Delay escalonado: cada tarjeta aparece 0.1s después de la anterior
                transition={{ delay: index * 0.1 }}
              >
                {/* Link a página de productos filtrada por categoría */}
                <Link to={`/products?category=${category.path}`}>
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}   // Al hacer hover: sube 8px y crece 2%
                    whileTap={{ scale: 0.98 }}            // Al hacer click: se achica 2%
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft hover:shadow-glass-hover transition-all duration-300 overflow-hidden"
                  >
                    {/* Fondo gradiente que aparece al hacer hover */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    {/* Contenido de la tarjeta */}
                    <div className="relative">
                      {/* Icono con gradiente de color único por categoría */}
                      <div
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}
                      >
                        {/* Renderizar componente de icono dinámicamente */}
                        <category.icon className="w-8 h-8 text-white" />
                      </div>

                      {/* Nombre de la categoría */}
                      <h3 className="text-center font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {category.name}
                      </h3>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: PRODUCTOS DESTACADOS */}
      {/* Grid de productos con loading skeletons mientras carga */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header de sección con título y botón "View All" */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-center mb-12"
          >
            {/* Título y subtítulo */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Featured Products
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Handpicked items just for you
              </p>
            </div>

            {/* Botón para ver todos los productos */}
            <Link to="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}       // Crece 5% al hacer hover
                whileTap={{ scale: 0.95 }}         // Se achica 5% al hacer click
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                View All
              </motion.button>
            </Link>
          </motion.div>

          {/* Grid responsive de productos */}
          {/* 1 columna en móvil, 2 en tablet, 4 en desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Renderizado condicional: skeletons mientras carga, productos cuando termina */}
            {isLoading
              ? // Mostrar 8 skeletons de carga (placeholders animados)
                // Array.from crea array de 8 elementos vacíos
                Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : // Mostrar productos reales una vez cargados
                // Spread operator {...product} pasa todas las props al componente
                mockProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 4: WHY CHOOSE KREO? (FEATURES) */}
      {/* Beneficios y características principales del marketplace */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título de sección */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Kreo?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Experience the best in online shopping
            </p>
          </motion.div>

          {/* Grid de features/beneficios */}
          {/* 1 columna en móvil, 2 en tablet, 4 en desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Mapear cada feature a una tarjeta */}
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                // Delay escalonado para efecto cascada
                transition={{ delay: index * 0.1 }}
                // Efecto hover: sube 5px
                whileHover={{ y: -5 }}
                className="text-center"
              >
                {/* Icono circular con gradiente */}
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <feature.icon className="w-8 h-8" />
                </div>

                {/* Título del beneficio */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>

                {/* Descripción del beneficio */}
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 5: CTA - BECOME A VENDOR */}
      {/* Call to Action para que usuarios se conviertan en vendedores */}
      <section className="py-20 relative overflow-hidden">
        {/* Fondo gradiente verde */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />

        {/* Elemento decorativo animado (círculo difuminado que rota) */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],        // Pulsa entre tamaño normal y 120%
            rotate: [0, 90, 0],        // Rota 90 grados
          }}
          transition={{
            duration: 20,              // Animación de 20 segundos
            repeat: Infinity,          // Se repite infinitamente
            ease: "linear"             // Velocidad constante
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />

        {/* Contenido del CTA */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Título principal */}
            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Start Selling?
            </h2>

            {/* Descripción del beneficio */}
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of successful vendors on Kreo Marketplace and grow your business with our powerful tools and dedicated support.
            </p>

            {/* Link al Vendor Portal (segunda aplicación frontend) */}
            {/* target="_blank": abre en nueva pestaña */}
            {/* rel="noopener noreferrer": seguridad contra tabnabbing */}
            <a
              href={import.meta.env.VITE_VENDOR_PORTAL_URL || 'http://localhost:5174'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 bg-white text-green-600 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                Become a Vendor Today
              </motion.button>
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
