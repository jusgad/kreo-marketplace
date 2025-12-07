import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CartItem {
  product_id: string
  vendor_id: string
  quantity: number
  variant_id?: string
  price_snapshot: number
  product_title: string
  product_image?: string
}

interface CartState {
  items: CartItem[]
  total: number
}

const initialState: CartState = {
  items: [],
  total: 0,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<CartState>) => {
      state.items = action.payload.items
      state.total = action.payload.total
    },
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(
        item => item.product_id === action.payload.product_id && item.variant_id === action.payload.variant_id
      )

      if (existingItem) {
        existingItem.quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }

      state.total = state.items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0)
    },
    removeFromCart: (state, action: PayloadAction<{ product_id: string; variant_id?: string }>) => {
      state.items = state.items.filter(
        item => !(item.product_id === action.payload.product_id && item.variant_id === action.payload.variant_id)
      )
      state.total = state.items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0)
    },
    updateQuantity: (state, action: PayloadAction<{ product_id: string; variant_id?: string; quantity: number }>) => {
      const item = state.items.find(
        item => item.product_id === action.payload.product_id && item.variant_id === action.payload.variant_id
      )

      if (item) {
        item.quantity = action.payload.quantity
      }

      state.total = state.items.reduce((sum, item) => sum + item.price_snapshot * item.quantity, 0)
    },
    clearCart: (state) => {
      state.items = []
      state.total = 0
    },
  },
})

export const { setCart, addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions
export default cartSlice.reducer
