import { motion } from 'framer-motion'

export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-soft">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="aspect-square bg-gray-200 dark:bg-gray-700"
      />
      <div className="p-4 space-y-3">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
        />
      </div>
    </div>
  )
}

export function CategoryCardSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft"
    >
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto" />
    </motion.div>
  )
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"
        />
      ))}
    </div>
  )
}
