import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag,
  CreditCard,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Package,
  Truck,
  AlertCircle,
  Calendar,
} from 'lucide-react'

const STEPS = [
  { id: 1, name: 'Shipping', icon: MapPin },
  { id: 2, name: 'Payment', icon: CreditCard },
  { id: 3, name: 'Review', icon: Package },
]

export default function CheckoutPage() {
  const { items, total } = useSelector((state: RootState) => state.cart)
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)

  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  })

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const shippingCost = total > 50 ? 0 : 9.99
  const tax = total * 0.08
  const finalTotal = total + shippingCost + tax

  // Redirect if cart is empty or user not authenticated
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingBag className="w-24 h-24 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Your cart is empty
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Add some items to your cart before checking out
          </p>
          <Link to="/products">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
            >
              Browse Products
            </motion.button>
          </Link>
        </motion.div>
      </div>
    )
  }

  const validateShipping = () => {
    const newErrors: Record<string, string> = {}

    if (!shippingData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!shippingData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!shippingData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingData.email))
      newErrors.email = 'Invalid email format'
    if (!shippingData.phone.trim()) newErrors.phone = 'Phone is required'
    if (!shippingData.address.trim()) newErrors.address = 'Address is required'
    if (!shippingData.city.trim()) newErrors.city = 'City is required'
    if (!shippingData.state.trim()) newErrors.state = 'State is required'
    if (!shippingData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePayment = () => {
    const newErrors: Record<string, string> = {}

    if (!paymentData.cardNumber.trim()) newErrors.cardNumber = 'Card number is required'
    else if (paymentData.cardNumber.replace(/\s/g, '').length !== 16)
      newErrors.cardNumber = 'Card number must be 16 digits'
    if (!paymentData.cardName.trim()) newErrors.cardName = 'Cardholder name is required'
    if (!paymentData.expiryDate.trim()) newErrors.expiryDate = 'Expiry date is required'
    if (!paymentData.cvv.trim()) newErrors.cvv = 'CVV is required'
    else if (paymentData.cvv.length !== 3) newErrors.cvv = 'CVV must be 3 digits'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    setErrors({})

    if (currentStep === 1) {
      if (validateShipping()) {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      if (validatePayment()) {
        setCurrentStep(3)
      }
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
    setErrors({})
  }

  const handlePlaceOrder = async () => {
    setIsProcessing(true)

    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false)
      navigate('/orders')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                    currentStep >= step.id
                      ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                  <span className="font-semibold hidden sm:inline">{step.name}</span>
                </motion.div>

                {index < STEPS.length - 1 && (
                  <div
                    className={`w-12 sm:w-24 h-1 mx-2 rounded transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-gradient-to-r from-primary-600 to-secondary-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Shipping Information */}
              {currentStep === 1 && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Shipping Information
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Name Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.firstName}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, firstName: e.target.value })
                          }
                          className={`input-field ${
                            errors.firstName ? 'ring-2 ring-error-500' : ''
                          }`}
                          placeholder="John"
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.lastName}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, lastName: e.target.value })
                          }
                          className={`input-field ${
                            errors.lastName ? 'ring-2 ring-error-500' : ''
                          }`}
                          placeholder="Doe"
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={shippingData.email}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, email: e.target.value })
                          }
                          className={`input-field ${errors.email ? 'ring-2 ring-error-500' : ''}`}
                          placeholder="john@example.com"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={shippingData.phone}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, phone: e.target.value })
                          }
                          className={`input-field ${errors.phone ? 'ring-2 ring-error-500' : ''}`}
                          placeholder="+1 (555) 123-4567"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={shippingData.address}
                        onChange={(e) =>
                          setShippingData({ ...shippingData, address: e.target.value })
                        }
                        className={`input-field ${errors.address ? 'ring-2 ring-error-500' : ''}`}
                        placeholder="123 Main Street, Apt 4B"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.address}
                        </p>
                      )}
                    </div>

                    {/* City, State, ZIP */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={shippingData.city}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, city: e.target.value })
                          }
                          className={`input-field ${errors.city ? 'ring-2 ring-error-500' : ''}`}
                          placeholder="New York"
                        />
                        {errors.city && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.city}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          State *
                        </label>
                        <input
                          type="text"
                          value={shippingData.state}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, state: e.target.value })
                          }
                          className={`input-field ${errors.state ? 'ring-2 ring-error-500' : ''}`}
                          placeholder="NY"
                        />
                        {errors.state && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.state}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          value={shippingData.zipCode}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, zipCode: e.target.value })
                          }
                          className={`input-field ${
                            errors.zipCode ? 'ring-2 ring-error-500' : ''
                          }`}
                          placeholder="10001"
                        />
                        {errors.zipCode && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.zipCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Payment Information */}
              {currentStep === 2 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card p-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Payment Information
                    </h2>
                  </div>

                  <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl flex items-start gap-3">
                    <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800 dark:text-primary-300">
                      Your payment information is encrypted and secure. We never store your full card details.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Card Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        value={paymentData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
                          setPaymentData({ ...paymentData, cardNumber: value })
                        }}
                        className={`input-field ${
                          errors.cardNumber ? 'ring-2 ring-error-500' : ''
                        }`}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                      {errors.cardNumber && (
                        <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.cardNumber}
                        </p>
                      )}
                    </div>

                    {/* Cardholder Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        value={paymentData.cardName}
                        onChange={(e) =>
                          setPaymentData({ ...paymentData, cardName: e.target.value })
                        }
                        className={`input-field ${
                          errors.cardName ? 'ring-2 ring-error-500' : ''
                        }`}
                        placeholder="JOHN DOE"
                      />
                      {errors.cardName && (
                        <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.cardName}
                        </p>
                      )}
                    </div>

                    {/* Expiry & CVV */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Expiry Date *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={paymentData.expiryDate}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2')
                              setPaymentData({ ...paymentData, expiryDate: value })
                            }}
                            className={`input-field pl-10 ${
                              errors.expiryDate ? 'ring-2 ring-error-500' : ''
                            }`}
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                          <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        </div>
                        {errors.expiryDate && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.expiryDate}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={paymentData.cvv}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '')
                            setPaymentData({ ...paymentData, cvv: value })
                          }}
                          className={`input-field ${errors.cvv ? 'ring-2 ring-error-500' : ''}`}
                          placeholder="123"
                          maxLength={3}
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-sm text-error-600 dark:text-error-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.cvv}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Save Card */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paymentData.saveCard}
                        onChange={(e) =>
                          setPaymentData({ ...paymentData, saveCard: e.target.checked })
                        }
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Save this card for future purchases
                      </span>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review Order */}
              {currentStep === 3 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  {/* Shipping Address Review */}
                  <div className="card p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl">
                          <MapPin className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Shipping Address
                        </h2>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentStep(1)}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                      >
                        Edit
                      </motion.button>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      <p className="font-semibold">
                        {shippingData.firstName} {shippingData.lastName}
                      </p>
                      <p>{shippingData.address}</p>
                      <p>
                        {shippingData.city}, {shippingData.state} {shippingData.zipCode}
                      </p>
                      <p className="mt-2">{shippingData.email}</p>
                      <p>{shippingData.phone}</p>
                    </div>
                  </div>

                  {/* Payment Method Review */}
                  <div className="card p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Payment Method
                        </h2>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCurrentStep(2)}
                        className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                      >
                        Edit
                      </motion.button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-10 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <p className="font-semibold">
                          {paymentData.cardName}
                        </p>
                        <p className="text-sm">
                          •••• •••• •••• {paymentData.cardNumber.slice(-4)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Review */}
                  <div className="card p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Order Items ({items.length})
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={`${item.product_id}-${item.variant_id}`}
                          className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                        >
                          <img
                            src={item.product_image || 'https://via.placeholder.com/80'}
                            alt={item.product_title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {item.product_title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Quantity: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-primary-600 dark:text-primary-400">
                              ${(item.price_snapshot * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {items.length > 3 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          +{items.length - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBack}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </motion.button>
              )}

              {currentStep < 3 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 btn-primary flex items-center justify-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="spinner w-5 h-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Place Order
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 sticky top-24">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Order Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-semibold">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping
                  </span>
                  <span className="font-semibold">
                    {shippingCost === 0 ? (
                      <span className="text-success-600 dark:text-success-400">Free</span>
                    ) : (
                      `$${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax (8%)</span>
                  <span className="font-semibold">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="text-gradient-primary">${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {shippingCost > 0 && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                  <p className="text-sm text-primary-800 dark:text-primary-300">
                    Add ${(50 - total).toFixed(2)} more to get free shipping!
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <Lock className="w-5 h-5 text-success-600 dark:text-success-400" />
                  <span>Secure checkout with 256-bit SSL encryption</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
