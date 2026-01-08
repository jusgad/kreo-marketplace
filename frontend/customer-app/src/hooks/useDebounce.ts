// ==============================================================================
// CUSTOM HOOK: useDebounce
// FUNCIONALIDAD: Retrasa la actualización de un valor hasta que el usuario
//                deja de escribir por un período determinado
//
// USO: Optimiza búsquedas y peticiones API evitando llamadas excesivas
// BENEFICIO: Reduce de 6 a 1 petición HTTP al escribir "laptop" (85% menos)
// ==============================================================================

import { useState, useEffect } from 'react'

/**
 * Hook que retorna un valor "debounced" (retrasado)
 *
 * @param value - Valor que se quiere "debouncear"
 * @param delay - Tiempo de espera en milisegundos (default: 300ms)
 * @returns El valor debounced
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState('')
 * const debouncedSearch = useDebounce(searchQuery, 300)
 *
 * useEffect(() => {
 *   // Solo se ejecuta 300ms después de que el usuario deja de escribir
 *   if (debouncedSearch) {
 *     fetchProducts(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  // Estado que almacena el valor debounced
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Crear timer que actualiza el valor después del delay
    // Si el usuario sigue escribiendo, este timer se cancela y se crea uno nuevo
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: limpiar timer si el valor cambia antes de que expire
    // Esto previene que se actualice el valor si el usuario sigue escribiendo
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay]) // Re-ejecutar efecto si value o delay cambian

  return debouncedValue
}
