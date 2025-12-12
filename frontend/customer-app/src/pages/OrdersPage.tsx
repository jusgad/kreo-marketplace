import { motion } from 'framer-motion'
import { Package } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Package className="w-24 h-24 text-gray-400 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          My Orders
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          This page is under construction
        </p>
      </motion.div>
    </div>
  )
}
