import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store'
import { logout } from '../store/authSlice'
import { FiShoppingCart, FiUser, FiSearch } from 'react-icons/fi'

export default function Navbar() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)
  const { items } = useSelector((state: RootState) => state.cart)
  const dispatch = useDispatch()

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">Kreo</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Right menu */}
          <div className="flex items-center space-x-6">
            <Link to="/cart" className="relative">
              <FiShoppingCart className="text-2xl text-gray-700 hover:text-blue-600" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/orders" className="text-gray-700 hover:text-blue-600">
                  Orders
                </Link>
                <div className="flex items-center space-x-2">
                  <FiUser />
                  <span className="text-sm">{user?.first_name || user?.email}</span>
                </div>
                <button
                  onClick={() => dispatch(logout())}
                  className="text-sm text-gray-700 hover:text-blue-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
