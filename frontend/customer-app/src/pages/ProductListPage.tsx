import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Filter, Grid, List, ChevronDown } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import FilterSidebar from '../components/FilterSidebar'
import { ProductCardSkeleton } from '../components/LoadingSkeleton'

// Mock products - in real app, fetch from API
const mockProducts = Array.from({ length: 24 }, (_, i) => ({
  id: `${i + 1}`,
  title: `Product ${i + 1} - ${['Wireless Headphones', 'Smart Watch', 'Camera Kit', 'Leather Backpack', '4K TV', 'Gaming Chair', 'Bluetooth Speaker', 'Coffee Maker'][i % 8]}`,
  base_price: Math.floor(Math.random() * 1000) + 50,
  rating: 4 + Math.random(),
  reviews: Math.floor(Math.random() * 2000) + 100,
  discount: Math.random() > 0.5 ? Math.floor(Math.random() * 40) + 10 : undefined,
  isTrending: Math.random() > 0.7,
  isNew: Math.random() > 0.8,
  images: [{ url: `https://images.unsplash.com/photo-${1500000000000 + i * 100000000}?w=400` }],
}))

export default function ProductListPage() {
  const [searchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState({
    categories: [] as string[],
    priceRange: [0, 10000] as [number, number],
    rating: 0,
    sortBy: 'featured',
  })

  const searchQuery = searchParams.get('search') || ''
  const categoryParam = searchParams.get('category') || ''

  useEffect(() => {
    // Simulate loading
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [searchQuery, categoryParam, filters])

  useEffect(() => {
    if (categoryParam) {
      setFilters(prev => ({
        ...prev,
        categories: [categoryParam]
      }))
    }
  }, [categoryParam])

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
          >
            {searchQuery ? `Search Results for "${searchQuery}"` : categoryParam ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)} Products` : 'All Products'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-gray-600 dark:text-gray-400"
          >
            Showing {mockProducts.length} products
          </motion.p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Filter Toggle & View Mode */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-soft hover:shadow-md transition-all duration-300"
            >
              <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="font-medium text-gray-700 dark:text-gray-300">Filters</span>
              {(filters.categories.length > 0 || filters.rating > 0) && (
                <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full font-semibold">
                  {filters.categories.length + (filters.rating > 0 ? 1 : 0)}
                </span>
              )}
            </motion.button>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-2 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-soft">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Grid className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <List className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
              className="w-full sm:w-64 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 dark:text-gray-300"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <FilterSidebar
              isOpen={true}
              onClose={() => {}}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Mobile Sidebar */}
          <div className="lg:hidden">
            <FilterSidebar
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className={`grid ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              } gap-6`}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : mockProducts.length > 0 ? (
              <motion.div
                layout
                className={`grid ${
                  viewMode === 'grid'
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                } gap-6`}
              >
                {mockProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20"
              >
                <div className="w-32 h-32 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Filter className="w-16 h-16 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No Products Found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your filters or search terms
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleFilterChange({
                    categories: [],
                    priceRange: [0, 10000],
                    rating: 0,
                    sortBy: 'featured',
                  })}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Clear Filters
                </motion.button>
              </motion.div>
            )}

            {/* Pagination */}
            {!isLoading && mockProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center items-center gap-2 mt-12"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-soft hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled
                >
                  Previous
                </motion.button>

                {[1, 2, 3, 4, 5].map((page) => (
                  <motion.button
                    key={page}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`w-10 h-10 rounded-xl font-semibold transition-all duration-300 ${
                      page === 1
                        ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-soft hover:shadow-md'
                    }`}
                  >
                    {page}
                  </motion.button>
                ))}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl shadow-soft hover:shadow-md transition-all duration-300"
                >
                  Next
                </motion.button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
