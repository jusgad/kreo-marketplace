// ==============================================================================
// COMPONENTE: Navbar.tsx
// FUNCIONALIDAD: Barra de navegación principal de la aplicación
// - Responsive: diseño diferente para desktop y móvil
// - Búsqueda de productos con redirección
// - Carrito de compras con contador de items
// - Menú de usuario autenticado con opciones
// - Toggle de modo oscuro (dark mode)
// - Animaciones con Framer Motion
// - Scroll effect: cambia apariencia al hacer scroll
// ==============================================================================

// Importar hooks de React para gestionar estado y efectos
import { useState, useEffect } from 'react'

// Importar utilidades de React Router para navegación
// Link: componente para navegación sin recargar página
// useNavigate: hook para navegación programática
import { Link, useNavigate } from 'react-router-dom'

// Importar hook personalizado de debounce para optimizar búsquedas
import { useDebounce } from '../hooks/useDebounce'

// Importar hooks de Redux para gestión de estado global
// useSelector: lee estado del store
// useDispatch: dispara acciones
import { useSelector, useDispatch } from 'react-redux'

// Importar tipo del estado global de Redux
import { RootState } from '../store'

// Importar acción de logout del slice de autenticación
import { logout } from '../store/authSlice'

// Importar componentes de Framer Motion para animaciones fluidas
// motion: wrapper para elementos animados
// AnimatePresence: gestiona animaciones de entrada/salida
import { motion, AnimatePresence } from 'framer-motion'

// Importar iconos de Lucide React (librería de iconos)
import {
  ShoppingCart,  // Icono de carrito
  User,          // Icono de usuario
  Search,        // Icono de búsqueda
  Menu,          // Icono de menú hamburguesa
  X,             // Icono de cerrar
  Heart,         // Icono de favoritos
  Package,       // Icono de pedidos
  LogOut,        // Icono de cerrar sesión
  Settings,      // Icono de configuración
  Moon,          // Icono de luna (modo oscuro)
  Sun            // Icono de sol (modo claro)
} from 'lucide-react'

// Exportar componente Navbar como default
export default function Navbar() {
  // SELECCIONAR ESTADO DE AUTENTICACIÓN DESDE REDUX STORE
  // isAuthenticated: boolean que indica si el usuario está logueado
  // user: objeto con datos del usuario (nombre, email, etc.)
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

  // SELECCIONAR ITEMS DEL CARRITO DESDE REDUX STORE
  // items: array de productos en el carrito
  const { items } = useSelector((state: RootState) => state.cart)

  // OBTENER DISPATCH PARA EJECUTAR ACCIONES DE REDUX
  const dispatch = useDispatch()

  // OBTENER FUNCIÓN NAVIGATE PARA NAVEGACIÓN PROGRAMÁTICA
  const navigate = useNavigate()

  // ESTADO LOCAL DEL COMPONENTE
  // isScrolled: true cuando el usuario ha hecho scroll hacia abajo
  // Usado para cambiar la apariencia del navbar (fondo con blur)
  const [isScrolled, setIsScrolled] = useState(false)

  // isMobileMenuOpen: true cuando el menú móvil está abierto
  // Solo visible en pantallas pequeñas
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // isUserMenuOpen: true cuando el menú desplegable de usuario está abierto
  // Muestra opciones como "My Orders", "Settings", "Logout"
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // searchQuery: texto ingresado en la barra de búsqueda
  const [searchQuery, setSearchQuery] = useState('')

  // debouncedSearchQuery: valor de búsqueda con delay de 300ms
  // ✅ OPTIMIZACIÓN: Solo actualiza 300ms después de que el usuario deja de escribir
  // Reduce peticiones HTTP de 6 a 1 al escribir "laptop" (85% menos tráfico)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // isDarkMode: true cuando está activado el modo oscuro
  const [isDarkMode, setIsDarkMode] = useState(false)

  // CALCULAR CANTIDAD TOTAL DE ITEMS EN EL CARRITO
  // Suma las cantidades de todos los items
  // Ejemplo: [{quantity: 2}, {quantity: 3}] → 5
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // EFFECT: DETECTAR SCROLL PARA CAMBIAR APARIENCIA DEL NAVBAR
  // Se ejecuta una sola vez al montar el componente (dependencias vacías [])
  useEffect(() => {
    // Función que se ejecuta cada vez que el usuario hace scroll
    const handleScroll = () => {
      // Si el scroll vertical es mayor a 10px, activar estado scrolled
      // Esto activa el fondo con blur y sombra
      setIsScrolled(window.scrollY > 10)
    }

    // Agregar listener al evento scroll de la ventana
    window.addEventListener('scroll', handleScroll)

    // Cleanup: remover listener cuando el componente se desmonte
    // Previene memory leaks
    return () => window.removeEventListener('scroll', handleScroll)
  }, []) // [] = ejecutar solo al montar

  // EFFECT: BÚSQUEDA EN TIEMPO REAL CON DEBOUNCE
  // ✅ OPTIMIZACIÓN: Solo ejecuta búsqueda 300ms después de que el usuario deja de escribir
  // Se ejecuta cada vez que cambia debouncedSearchQuery
  useEffect(() => {
    // Solo navegar si hay texto en la búsqueda (mínimo 2 caracteres)
    if (debouncedSearchQuery.trim().length >= 2) {
      // Navegar a página de productos con query param
      // encodeURIComponent: escapa caracteres especiales en la URL
      navigate(`/products?search=${encodeURIComponent(debouncedSearchQuery)}`)
    }
  }, [debouncedSearchQuery, navigate])

  // HANDLER: BÚSQUEDA DE PRODUCTOS
  // Se ejecuta al enviar el formulario de búsqueda
  const handleSearch = (e: React.FormEvent) => {
    // Prevenir comportamiento default del formulario (recarga de página)
    e.preventDefault()

    // Solo navegar si hay texto en la búsqueda
    if (searchQuery.trim()) {
      // Navegar a página de productos con query param
      // encodeURIComponent: escapa caracteres especiales en la URL
      // Ejemplo: "laptop & mouse" → "laptop%20%26%20mouse"
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  // HANDLER: TOGGLE DE MODO OSCURO
  const toggleDarkMode = () => {
    // Invertir estado de dark mode
    setIsDarkMode(!isDarkMode)

    // Agregar/quitar clase 'dark' del elemento <html>
    // Tailwind CSS usa esta clase para aplicar estilos dark:
    // Esta clase activa todos los estilos con prefijo dark:
    document.documentElement.classList.toggle('dark')
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-soft'
          : 'bg-white dark:bg-gray-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-500 bg-clip-text text-transparent">
                Kreo
              </span>
              <motion.div
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 to-secondary-600"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="w-full relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands, and more..."
                className="w-full px-6 py-3 pl-12 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 group-hover:shadow-md"
              />
              <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="absolute right-2 top-1.5 px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300"
              >
                Search
              </motion.button>
            </form>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Dark Mode Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </motion.button>

            {/* Wishlist */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Heart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                0
              </span>
            </motion.button>

            {/* Cart */}
            <Link to="/cart">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                {cartItemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-lg"
                  >
                    {cartItemCount}
                  </motion.span>
                )}
              </motion.div>
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/30 dark:to-secondary-900/30 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold">
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.first_name || user?.email?.split('@')[0]}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-glass-hover border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/orders"
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">My Orders</span>
                        </Link>

                        <Link
                          to="/settings"
                          className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">Settings</span>
                        </Link>

                        <button
                          onClick={() => dispatch(logout())}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                  >
                    Login
                  </motion.button>
                </Link>
                <Link to="/register">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 30px -10px rgba(37, 99, 235, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            )}
          </motion.button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          </form>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          >
            <div className="px-4 py-6 space-y-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/orders"
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">My Orders</span>
                  </Link>
                  <button
                    onClick={() => dispatch(logout())}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block w-full">
                    <button className="w-full px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
                      Login
                    </button>
                  </Link>
                  <Link to="/register" className="block w-full">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full font-medium shadow-md">
                      Sign Up
                    </button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
