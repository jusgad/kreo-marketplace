import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Heart, Star, Eye, TrendingUp } from 'lucide-react'

interface ProductCardProps {
  id: string
  title: string
  base_price: number
  images?: any[]
  vendor_id?: string
  status?: string
  rating?: number
  reviews?: number
  discount?: number
  isTrending?: boolean
  isNew?: boolean
}

export default function ProductCard({
  id,
  title,
  base_price,
  images,
  rating = 4.5,
  reviews = 0,
  discount,
  isTrending,
  isNew,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLiked, setIsLiked] = useState(false)

  const imageUrl = images?.[0]?.url || 'https://via.placeholder.com/400x400?text=Product'
  const discountedPrice = discount ? base_price * (1 - discount / 100) : base_price

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-soft hover:shadow-glass-hover transition-all duration-300"
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {discount && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-3 py-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs font-bold rounded-full shadow-lg"
          >
            -{discount}%
          </motion.div>
        )}
        {isNew && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg"
          >
            NEW
          </motion.div>
        )}
        {isTrending && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3" />
            Trending
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault()
            setIsLiked(!isLiked)
          }}
          className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-300 ${
            isLiked
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
          }`}
        >
          <Heart
            className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`}
          />
        </motion.button>

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-2"
            >
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

      {/* Image */}
      <Link to={`/products/${id}`} className="block relative overflow-hidden aspect-square">
        <motion.img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
          animate={{ scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* Gradient Overlay on Hover */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"
        />
      </Link>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Link to={`/products/${id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors min-h-[3rem]">
            {title}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            ({reviews})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              ${discountedPrice.toFixed(2)}
            </span>
            {discount && (
              <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                ${base_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 group/btn"
        >
          <ShoppingCart className="w-5 h-5 group-hover/btn:animate-bounce-subtle" />
          Add to Cart
        </motion.button>
      </div>
    </motion.div>
  )
}

// AnimatePresence component (imported from framer-motion, but adding it here for clarity)
import { AnimatePresence } from 'framer-motion'
