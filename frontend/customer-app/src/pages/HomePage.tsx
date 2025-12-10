import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Smartphone,
  Shirt,
  Home,
  Dumbbell,
  Book,
  Baby,
  Sparkles,
  Car,
  TrendingUp,
  Shield,
  Truck,
  CreditCard,
} from 'lucide-react'
import HeroSection from '../components/HeroSection'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/LoadingSkeleton'
import { useState, useEffect } from 'react'

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

// Mock featured products - in real app, fetch from API
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

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <HeroSection />

      {/* Categories Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Explore our diverse range of products
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/products?category=${category.path}`}>
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft hover:shadow-glass-hover transition-all duration-300 overflow-hidden"
                  >
                    {/* Gradient Background */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />

                    <div className="relative">
                      <div
                        className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}
                      >
                        <category.icon className="w-8 h-8 text-white" />
                      </div>
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

      {/* Featured Products */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-between items-center mb-12"
          >
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Featured Products
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Handpicked items just for you
              </p>
            </div>
            <Link to="/products">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300"
              >
                View All
              </motion.button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : mockProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Become a Vendor */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500" />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Start Selling?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of successful vendors on Kreo Marketplace and grow your business with our powerful tools and dedicated support.
            </p>
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
