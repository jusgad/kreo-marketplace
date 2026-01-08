import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart,
  Heart,
  Star,
  Check,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Minus,
  Plus,
  Share2,
  MessageCircle
} from 'lucide-react'
import { useDispatch } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import ProductCard from '../components/ProductCard'

// Mock product data
const mockProduct = {
  id: '1',
  title: 'Premium Wireless Headphones with Active Noise Cancellation',
  description: 'Experience audio like never before with our Premium Wireless Headphones. Featuring industry-leading active noise cancellation, premium sound quality, and up to 30 hours of battery life. Perfect for music lovers, travelers, and professionals who demand the best.',
  base_price: 299.99,
  discount: 25,
  vendor_id: 'vendor-1',
  vendor_name: 'AudioTech Pro',
  rating: 4.8,
  reviews: 1234,
  inStock: true,
  stock: 45,
  images: [
    { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
    { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800' },
    { url: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800' },
    { url: 'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800' },
  ],
  features: [
    'Active Noise Cancellation (ANC)',
    '30-hour battery life',
    'Premium sound quality',
    'Comfortable over-ear design',
    'Bluetooth 5.0 connectivity',
    'Built-in microphone for calls',
    'Foldable design with carrying case',
    'Multi-device connectivity'
  ],
  specifications: {
    'Driver Size': '40mm',
    'Frequency Response': '20Hz - 20kHz',
    'Impedance': '32 Ohms',
    'Weight': '250g',
    'Bluetooth Version': '5.0',
    'Battery Life': '30 hours (ANC on)',
    'Charging Time': '2 hours',
    'Range': '10 meters'
  }
}

// Mock related products
const relatedProducts = Array.from({ length: 4 }, (_, i) => ({
  id: `${i + 2}`,
  title: `Related Product ${i + 1}`,
  base_price: Math.floor(Math.random() * 500) + 50,
  rating: 4 + Math.random(),
  reviews: Math.floor(Math.random() * 1000) + 100,
  discount: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : undefined,
  images: [{ url: `https://images.unsplash.com/photo-${1500000000000 + i * 100000000}?w=400` }],
}))

export default function ProductDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isLiked, setIsLiked] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description')

  const product = mockProduct
  const discountedPrice = product.discount
    ? product.base_price * (1 - product.discount / 100)
    : product.base_price

  const handleAddToCart = () => {
    dispatch(addToCart({
      product_id: product.id,
      vendor_id: product.vendor_id,
      quantity,
      price_snapshot: discountedPrice,
      product_title: product.title,
      product_image: product.images[0]?.url,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/products" className="hover:text-primary-600 dark:hover:text-primary-400">
              Products
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white truncate">{product.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="relative aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-glass">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={product.images[selectedImage]?.url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>

              {/* Badges */}
              {product.discount && (
                <div className="absolute top-4 left-4 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold rounded-full shadow-lg">
                  -{product.discount}% OFF
                </div>
              )}

              {/* Share & Wishlist */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg"
                >
                  <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsLiked(!isLiked)}
                  className={`p-3 rounded-full shadow-lg backdrop-blur-md ${
                    isLiked
                      ? 'bg-red-500 text-white'
                      : 'bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </motion.button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-primary-600 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image.url}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Vendor */}
            <Link to={`/vendor/${product.vendor_id}`}>
              <motion.div
                whileHover={{ x: 4 }}
                className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Shield className="w-4 h-4" />
                Sold by {product.vendor_name}
              </motion.div>
            </Link>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                ${discountedPrice.toFixed(2)}
              </span>
              {product.discount && (
                <div className="flex flex-col">
                  <span className="text-2xl text-gray-400 dark:text-gray-500 line-through">
                    ${product.base_price.toFixed(2)}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                    Save ${(product.base_price - discountedPrice).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    In Stock ({product.stock} available)
                  </span>
                </>
              ) : (
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Quantity:</span>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-soft px-4 py-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Minus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </motion.button>
                <span className="text-xl font-semibold w-12 text-center text-gray-900 dark:text-white">
                  {quantity}
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </motion.button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                className="flex-1 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-6 h-6" />
                Add to Cart
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-4 bg-white dark:bg-gray-800 border-2 border-primary-600 text-primary-600 dark:text-primary-400 rounded-xl font-bold text-lg shadow-soft hover:shadow-md transition-all duration-300"
              >
                Buy Now
              </motion.button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-2 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <Truck className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Free Shipping</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">On orders over $50</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-2 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Easy Returns</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">30-day guarantee</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-2 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Secure Payment</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">100% protected</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          {/* Tab Headers */}
          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            {['description', 'specifications', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-6 py-4 font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="py-8">
            <AnimatePresence mode="wait">
              {activeTab === 'description' && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {product.description}
                  </p>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Key Features
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-3">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

              {activeTab === 'specifications' && (
                <motion.div
                  key="specifications"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-soft"
                      >
                        <span className="font-semibold text-gray-900 dark:text-white">{key}</span>
                        <span className="text-gray-600 dark:text-gray-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Be the first to review this product
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Write a Review
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Related Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
