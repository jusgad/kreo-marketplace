// ==============================================================================
// COMPONENTE: HeroSection.tsx
// FUNCIONALIDAD: Banner principal (hero) de la página de inicio
// - Fondo gradiente vibrante con animaciones
// - Elementos decorativos animados (círculos difuminados)
// - Texto principal con gradientes y animaciones de entrada
// - CTAs (Call to Action) con efectos hover
// - Estadísticas del marketplace (productos, vendedores, clientes)
// - Tarjetas flotantes decorativas con animaciones
// - Wave divider al final para transición suave
// ==============================================================================

// Importar motion de Framer Motion para animaciones
import { motion } from 'framer-motion'

// Importar Link de React Router para navegación
import { Link } from 'react-router-dom'

// Importar iconos de Lucide React
import { ArrowRight, Sparkles, ShoppingBag, Zap } from 'lucide-react'

// COMPONENTE: HeroSection
// No recibe props, es un componente estático con animaciones
export default function HeroSection() {
  return (
    // CONTENEDOR PRINCIPAL
    // Altura mínima de 600px, fondo gradiente multicolor
    <div className="relative min-h-[600px] bg-gradient-to-br from-primary-600 via-secondary-600 to-accent-500 overflow-hidden">
      {/* ELEMENTOS DE FONDO ANIMADOS */}
      {/* Círculos difuminados que rotan y pulsan constantemente */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Círculo 1: Esquina superior derecha */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],          // Pulsa entre 100% y 120%
            rotate: [0, 90, 0],          // Rota 90 grados y vuelve
          }}
          transition={{
            duration: 20,                // Ciclo de 20 segundos
            repeat: Infinity,            // Se repite infinitamente
            ease: "linear"               // Velocidad constante
          }}
          className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />

        {/* Círculo 2: Esquina inferior izquierda */}
        {/* Animación opuesta al círculo 1 para crear efecto de balance */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],        // Empieza grande, se achica, vuelve a crecer
            rotate: [90, 0, 90],         // Rotación inversa
          }}
          transition={{
            duration: 15,                // Ciclo más rápido (15 segundos)
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {/* Max width de 7xl con padding responsive */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        {/* Grid de 2 columnas en desktop */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* COLUMNA IZQUIERDA: Contenido de texto y CTAs */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}         // Empieza invisible y 50px a la izquierda
            animate={{ opacity: 1, x: 0 }}           // Aparece y se mueve a posición normal
            transition={{ duration: 0.8 }}           // Transición de 0.8 segundos
            className="text-white space-y-8"         // Espacio vertical entre elementos
          >
            {/* Badge de bienvenida */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}            // Aparece después del contenedor principal
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Welcome to the Future of Shopping
            </motion.div>

            {/* Título principal (H1) */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl lg:text-7xl font-bold leading-tight"
            >
              Discover Your
              <br />
              {/* Texto con gradiente amarillo-naranja */}
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Perfect Style
              </span>
            </motion.h1>

            {/* Descripción/subtítulo */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-white/90 leading-relaxed"
            >
              Shop from millions of products from thousands of trusted sellers.
              Find exactly what you're looking for at unbeatable prices.
            </motion.p>

            {/* Botones CTA (Call to Action) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"   // Columna en móvil, fila en desktop
            >
              {/* Botón primario: "Start Shopping" */}
              <Link to="/products">
                <motion.button
                  whileHover={{
                    scale: 1.05,                             // Crece 5%
                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)"  // Sombra dramática
                  }}
                  whileTap={{ scale: 0.95 }}                 // Se achica al hacer click
                  className="px-8 py-4 bg-white text-primary-600 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Start Shopping
                  {/* Flecha que se mueve a la derecha al hacer hover */}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>

              {/* Botón secundario: "Explore Deals" */}
              <Link to="/products?featured=true">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-full font-bold text-lg border-2 border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Explore Deals
                </motion.button>
              </Link>
            </motion.div>

            {/* ESTADÍSTICAS DEL MARKETPLACE */}
            {/* Muestra métricas clave: productos, vendedores, clientes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-8 pt-8"
            >
              {/* Stat 1: Productos */}
              <div>
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-white/80 text-sm">Products</div>
              </div>

              {/* Divider vertical */}
              <div className="w-px bg-white/20" />

              {/* Stat 2: Vendedores */}
              <div>
                <div className="text-3xl font-bold">500+</div>
                <div className="text-white/80 text-sm">Vendors</div>
              </div>

              {/* Divider vertical */}
              <div className="w-px bg-white/20" />

              {/* Stat 3: Clientes */}
              <div>
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-white/80 text-sm">Happy Customers</div>
              </div>
            </motion.div>
          </motion.div>

          {/* COLUMNA DERECHA: Tarjetas de producto flotantes decorativas */}
          {/* Solo visible en pantallas grandes (lg:) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}          // Empieza invisible y 50px a la derecha
            animate={{ opacity: 1, x: 0 }}           // Aparece y se mueve a posición normal
            transition={{ duration: 0.8 }}
            className="relative hidden lg:block"     // hidden en móvil, block en desktop
          >
            {/* Contenedor de las tarjetas flotantes */}
            <div className="relative w-full h-[500px]">
              {/* Tarjeta flotante 1 (Esquina superior derecha) */}
              {/* Movimiento: sube y baja, rota ligeramente */}
              <motion.div
                animate={{
                  y: [0, -20, 0],                    // Sube 20px, vuelve
                  rotate: [-2, 2, -2],               // Rota -2°, 2°, -2°
                }}
                transition={{
                  duration: 5,                       // Ciclo de 5 segundos
                  repeat: Infinity,                  // Infinito
                  ease: "easeInOut"                  // Suavizado al inicio y final
                }}
                className="absolute top-0 right-0 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Imagen decorativa con gradiente */}
                <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400" />
                {/* Contenido: placeholders de texto y precio */}
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />    {/* Título simulado */}
                  <div className="h-6 bg-gradient-to-r from-primary-600 to-secondary-600 rounded w-1/2" />  {/* Precio simulado */}
                </div>
              </motion.div>

              {/* Tarjeta flotante 2 (Esquina inferior izquierda) */}
              {/* Movimiento opuesto a tarjeta 1 para crear balance */}
              <motion.div
                animate={{
                  y: [0, 20, 0],                     // Baja 20px, vuelve
                  rotate: [2, -2, 2],                // Rotación inversa
                }}
                transition={{
                  duration: 6,                       // Ciclo más lento (6 segundos)
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute bottom-0 left-0 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                {/* Imagen con gradiente azul */}
                <div className="h-48 bg-gradient-to-br from-blue-400 to-cyan-400" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-6 bg-gradient-to-r from-primary-600 to-secondary-600 rounded w-1/2" />
                </div>
              </motion.div>

              {/* Tarjeta flotante 3 (Centro) */}
              {/* z-10: aparece encima de las otras 2 tarjetas */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [1, -1, 1],
                }}
                transition={{
                  duration: 4,                       // Ciclo más rápido (4 segundos)
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                // transform utilities centran la tarjeta perfectamente
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
              >
                {/* Imagen con gradiente naranja-rojo */}
                <div className="h-48 bg-gradient-to-br from-orange-400 to-red-400" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-6 bg-gradient-to-r from-primary-600 to-secondary-600 rounded w-1/2" />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* WAVE DIVIDER (Divisor en forma de ola) */}
      {/* Crea transición suave entre el hero y la siguiente sección */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* SVG que dibuja una ola */}
        <svg
          viewBox="0 0 1440 120"                     // ViewBox define el sistema de coordenadas
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"                  // width 100%, height automático
        >
          {/* Path que define la forma de la ola */}
          {/* La ola usa curvas Bezier para crear forma orgánica */}
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            // Color se adapta al modo light/dark
            className="fill-gray-50 dark:fill-gray-900"
          />
        </svg>
      </div>
    </div>
  )
}
