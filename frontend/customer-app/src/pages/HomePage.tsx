import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Kreo Marketplace</h1>
          <p className="text-xl mb-8">Discover millions of products from thousands of sellers</p>
          <Link
            to="/products"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block"
          >
            Start Shopping
          </Link>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Automotive'].map((category) => (
            <Link
              key={category}
              to={`/products?category=${category.toLowerCase()}`}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition text-center"
            >
              <div className="text-4xl mb-4">📦</div>
              <h3 className="font-semibold">{category}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4">
                <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
                <h3 className="font-semibold mb-2">Product Title {i}</h3>
                <p className="text-2xl font-bold text-blue-600">$99.99</p>
                <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Become a Vendor CTA */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Start Selling on Kreo</h2>
          <p className="text-xl mb-8">Join thousands of vendors and grow your business</p>
          <a
            href={import.meta.env.VITE_VENDOR_PORTAL_URL || 'http://localhost:5174'}
            className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 inline-block"
          >
            Become a Vendor
          </a>
        </div>
      </div>
    </div>
  )
}
