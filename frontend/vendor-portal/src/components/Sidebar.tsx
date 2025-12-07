import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiPackage, FiShoppingBag, FiDollarSign, FiSettings, FiLogOut } from 'react-icons/fi'

export default function Sidebar() {
  const location = useLocation()

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/products', icon: FiPackage, label: 'Products' },
    { path: '/orders', icon: FiShoppingBag, label: 'Orders' },
    { path: '/payouts', icon: FiDollarSign, label: 'Payouts' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ]

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">Kreo Vendor</h1>
      </div>

      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 ${
                isActive ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' : ''
              }`}
            >
              <Icon className="mr-3" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-6">
        <button className="flex items-center text-gray-700 hover:text-red-600">
          <FiLogOut className="mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
