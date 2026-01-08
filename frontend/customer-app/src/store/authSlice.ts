/**
 * SECURITY FIX: Auth slice corregido para usar cookies HTTP-Only
 *
 * CAMBIOS APLICADOS:
 * - Eliminado almacenamiento de tokens en localStorage (vulnerable a XSS)
 * - Los tokens ahora se manejan automáticamente vía cookies HTTP-Only
 * - El estado solo mantiene información del usuario, NO tokens
 * - Las cookies son gestionadas por el backend (más seguro)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  email: string
  role: string
  first_name?: string
  last_name?: string
  email_verified?: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // true initially while checking auth status
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * SECURITY FIX: No almacenamos tokens en el estado
     * Los tokens están en cookies HTTP-Only gestionadas por el servidor
     */
    setCredentials: (state, action: PayloadAction<{ user: User }>) => {
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
      // NO guardamos token - está en cookie HTTP-Only del servidor
    },

    /**
     * Limpia el estado de autenticación
     * El logout real se hace en el servidor que limpia las cookies
     */
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
      // NO necesitamos limpiar localStorage - no hay tokens ahí
    },

    /**
     * Marca como cargando durante verificación de auth
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    /**
     * Establece error de autenticación
     */
    setAuthError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },

    /**
     * Limpia errores de autenticación
     */
    clearAuthError: (state) => {
      state.error = null
    },
  },
})

export const {
  setCredentials,
  logout,
  setLoading,
  setAuthError,
  clearAuthError
} = authSlice.actions

export default authSlice.reducer
