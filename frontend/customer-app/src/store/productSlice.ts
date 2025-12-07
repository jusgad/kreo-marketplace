import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Product {
  id: string
  title: string
  description?: string
  base_price: number
  vendor_id: string
  images?: any[]
  status: string
}

interface ProductState {
  products: Product[]
  currentProduct: Product | null
  total: number
  page: number
  limit: number
  isLoading: boolean
}

const initialState: ProductState = {
  products: [],
  currentProduct: null,
  total: 0,
  page: 1,
  limit: 20,
  isLoading: false,
}

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<{ products: Product[]; total: number; page: number }>) => {
      state.products = action.payload.products
      state.total = action.payload.total
      state.page = action.payload.page
      state.isLoading = false
    },
    setCurrentProduct: (state, action: PayloadAction<Product>) => {
      state.currentProduct = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setProducts, setCurrentProduct, setLoading } = productSlice.actions
export default productSlice.reducer
