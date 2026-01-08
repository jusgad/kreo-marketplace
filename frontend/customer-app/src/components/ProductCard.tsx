// ==============================================================================
// COMPONENTE: ProductCard.tsx
// FUNCIONALIDAD: Tarjeta de producto con animaciones y interacciones
// - Imagen con zoom al hacer hover
// - Badges dinámicos (descuento, nuevo, trending)
// - Botón de favoritos con estado
// - Rating con estrellas
// - Precio con descuento calculado
// - Botón "Add to Cart" con gradiente
// - Animaciones Framer Motion para UX fluida
// ==============================================================================

// Importar hook useState de React para manejar estado local
import { useState } from 'react'

// Importar Link para navegación sin recargar página
import { Link } from 'react-router-dom'

// Importar motion y AnimatePresence de Framer Motion para animaciones
import { motion } from 'framer-motion'

// Importar iconos de Lucide React
import { ShoppingCart, Heart, Star, Eye, TrendingUp } from 'lucide-react'

// INTERFACE: Props del componente ProductCard
// Define los tipos de datos que acepta el componente
interface ProductCardProps {
  id: string              // ID único del producto
  title: string           // Nombre del producto
  base_price: number      // Precio base sin descuento
  images?: any[]          // Array de imágenes (opcional)
  vendor_id?: string      // ID del vendedor (opcional)
  status?: string         // Estado del producto (opcional)
  rating?: number         // Calificación promedio (opcional, default: 4.5)
  reviews?: number        // Cantidad de reviews (opcional, default: 0)
  discount?: number       // Porcentaje de descuento (opcional)
  isTrending?: boolean    // Badge de "Trending" (opcional)
  isNew?: boolean         // Badge de "New" (opcional)
}

// COMPONENTE: ProductCard
// Recibe props destructuradas con valores por defecto
export default function ProductCard({
  id,
  title,
  base_price,
  images,
  rating = 4.5,          // Default: 4.5 estrellas si no se proporciona
  reviews = 0,          // Default: 0 reviews si no se proporciona
  discount,
  isTrending,
  isNew,
}: ProductCardProps) {
  // ESTADO LOCAL: isHovered
  // true cuando el mouse está sobre la tarjeta
  // Controla animaciones y visibilidad de botones
  const [isHovered, setIsHovered] = useState(false)

  // ESTADO LOCAL: isLiked
  // true cuando el usuario ha marcado el producto como favorito
  // Cambia el color del icono de corazón
  const [isLiked, setIsLiked] = useState(false)

  // COMPUTAR URL DE IMAGEN
  // Usa la primera imagen del array o un placeholder si no hay imágenes
  // Optional chaining (?.) previene errores si images es undefined
  const imageUrl = images?.[0]?.url || 'https://via.placeholder.com/400x400?text=Product'

  // COMPUTAR PRECIO CON DESCUENTO
  // Si hay descuento: aplica porcentaje al precio base
  // Si no hay descuento: usa el precio base
  // Ejemplo: $100 con 25% descuento = $100 * (1 - 0.25) = $75
  const discountedPrice = discount ? base_price * (1 - discount / 100) : base_price

  return (
    // CONTENEDOR PRINCIPAL DE LA TARJETA
    <motion.div
      layout                                        // Anima cambios de layout automáticamente
      initial={{ opacity: 0, y: 20 }}              // Estado inicial: invisible y 20px abajo
      animate={{ opacity: 1, y: 0 }}               // Estado animado: visible y posición normal
      exit={{ opacity: 0, y: 20 }}                 // Estado de salida: invisible y 20px abajo
      whileHover={{ y: -8 }}                       // Al hacer hover: sube 8px
      onHoverStart={() => setIsHovered(true)}      // Callback cuando empieza hover
      onHoverEnd={() => setIsHovered(false)}       // Callback cuando termina hover
      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-soft hover:shadow-glass-hover transition-all duration-300"
    >
      {/* SECCIÓN: BADGES (Esquina superior izquierda) */}
      {/* Badges condicionales que se muestran según las props */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {/* Badge de descuento (solo se muestra si hay descuento) */}
        {discount && (
          <motion.div
            initial={{ scale: 0 }}               // Empieza con tamaño 0
            animate={{ scale: 1 }}               // Crece a tamaño normal
            className="px-3 py-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs font-bold rounded-full shadow-lg"
          >
            -{discount}%
          </motion.div>
        )}

        {/* Badge de "NEW" (solo se muestra si isNew es true) */}
        {isNew && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}          // Delay de 0.1s para efecto escalonado
            className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg"
          >
            NEW
          </motion.div>
        )}

        {/* Badge de "Trending" (solo se muestra si isTrending es true) */}
        {isTrending && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}          // Delay de 0.2s para efecto escalonado
            className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3" />
            Trending
          </motion.div>
        )}
      </div>

      {/* SECCIÓN: ACTION BUTTONS (Esquina superior derecha) */}
      {/* Botones de acción: favoritos y quick view */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {/* Botón de favoritos (siempre visible) */}
        <motion.button
          whileHover={{ scale: 1.1 }}            // Crece 10% al hacer hover
          whileTap={{ scale: 0.9 }}              // Se achica 10% al hacer click
          onClick={(e) => {
            // Prevenir navegación del Link padre
            e.preventDefault()
            // Toggle del estado isLiked
            setIsLiked(!isLiked)
          }}
          // Clases condicionales según si está en favoritos o no
          className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
            isLiked
              ? 'bg-red-500 text-white shadow-lg'                                              // Estilo cuando está liked
              : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'  // Estilo cuando no está liked
          }`}
        >
          {/* Icono de corazón, relleno si está liked */}
          <Heart
            className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
          />
        </motion.button>

        {/* Botón de Quick View (solo visible al hacer hover en la tarjeta) */}
        {/* AnimatePresence permite animar la entrada/salida del elemento */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}    // Empieza invisible y 20px a la derecha
              animate={{ opacity: 1, x: 0 }}     // Aparece y se mueve a posición normal
              exit={{ opacity: 0, x: 20 }}       // Desaparece y se mueve a la derecha
              className="flex flex-col gap-2"
            >
              {/* Link a la página de detalle del producto */}
              <Link to={`/products/${id}`}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300"
                >
                  <Eye className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECCIÓN: IMAGEN DEL PRODUCTO */}
      {/* Link clickeable que navega a la página de detalle */}
      <Link to={`/products/${id}`} className="block relative overflow-hidden aspect-square">
        {/* Imagen con efecto zoom al hacer hover */}
        <motion.img
          src={imageUrl}                                    // URL de la imagen
          alt={title}                                       // Texto alternativo para accesibilidad
          className="w-full h-full object-cover"            // Cubre todo el contenedor
          animate={{ scale: isHovered ? 1.1 : 1 }}         // Zoom de 110% al hacer hover
          transition={{ duration: 0.4 }}                   // Transición suave de 0.4s
        />

        {/* Overlay gradiente que aparece al hacer hover */}
        {/* Oscurece la imagen desde abajo hacia arriba */}
        <motion.div
          initial={{ opacity: 0 }}                         // Empieza invisible
          animate={{ opacity: isHovered ? 1 : 0 }}         // Aparece al hacer hover
          className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
        />
      </Link>

      {/* SECCIÓN: CONTENIDO (Título, Rating, Precio, Botón) */}
      <div className="p-4 space-y-3">
        {/* Título del producto */}
        <Link to={`/products/${id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors min-h-[3rem]">
            {/* line-clamp-2: limita a 2 líneas con ... */}
            {/* min-h-[3rem]: altura mínima para alinear todas las tarjetas */}
            {title}
          </h3>
        </Link>

        {/* Rating con estrellas */}
        <div className="flex items-center gap-2">
          {/* Estrellas */}
          <div className="flex items-center gap-1">
            {/* Crear array de 5 elementos para las 5 estrellas */}
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                // Clases condicionales: amarillo si la estrella está dentro del rating
                // Ejemplo: rating=4.5 → primeras 4 estrellas amarillas, última gris
                className={`w-4 h-4 ${
                  i < Math.floor(rating)                    // Math.floor redondea hacia abajo
                    ? 'fill-yellow-400 text-yellow-400'     // Estrella llena amarilla
                    : 'text-gray-300 dark:text-gray-600'    // Estrella vacía gris
                }`}
              />
            ))}
          </div>

          {/* Cantidad de reviews */}
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({reviews})
          </span>
        </div>

        {/* Precio con descuento */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {/* Precio final con gradiente */}
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              {/* toFixed(2): formatea a 2 decimales */}
              ${discountedPrice.toFixed(2)}
            </span>

            {/* Precio original tachado (solo se muestra si hay descuento) */}
            {discount && (
              <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                ${base_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Botón "Add to Cart" */}
        <motion.button
          whileHover={{ scale: 1.02 }}                     // Crece 2% al hacer hover
          whileTap={{ scale: 0.98 }}                       // Se achica 2% al hacer click
          className="w-full py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group/btn"
        >
          {/* Icono de carrito con animación bounce sutil al hacer hover */}
          {/* group/btn permite aplicar animación al icono cuando se hace hover en el botón */}
          <ShoppingCart className="w-5 h-5 group-hover/btn:animate-bounce-subtle" />
          Add to Cart
        </motion.button>
      </div>
    </motion.div>
  )
}

// IMPORTAR AnimatePresence
// (Se importa al final para claridad en el código, aunque debería estar arriba)
import { AnimatePresence } from 'framer-motion'
