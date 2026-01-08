// ==============================================================================
// 🛡️ COMPONENTE: ErrorBoundary (Límite de Errores)
//
// PROPÓSITO:
// Este componente actúa como una "red de seguridad" que atrapa errores de JavaScript
// que ocurren en cualquier parte del árbol de componentes hijo durante el renderizado.
// Previene el temido "white screen of death" (pantalla blanca de la muerte) mostrando
// una interfaz amigable cuando algo sale mal.
//
// ¿POR QUÉ ES IMPORTANTE?
// Sin este componente, un error en cualquier parte de la aplicación puede hacer que
// toda la interfaz se vuelva blanca, dejando al usuario sin ninguna forma de
// recuperarse excepto recargar la página. Con ErrorBoundary, el usuario puede:
// - Ver qué salió mal (en modo desarrollo)
// - Intentar recuperarse con el botón "Try Again"
// - Volver al inicio con el botón "Go Home"
//
// CARACTERÍSTICAS:
// ✅ Captura errores durante el renderizado de componentes hijos
// ✅ Muestra interfaz de usuario amigable con opciones de recuperación
// ✅ Registra errores en consola para debugging
// ✅ Preparado para integración con servicios de tracking (Sentry, Rollbar, etc.)
// ✅ Muestra detalles técnicos solo en modo desarrollo
// ✅ Permite UI personalizada mediante prop 'fallback'
//
// EJEMPLOS DE USO:
//
// Básico (proteger toda la aplicación):
// <ErrorBoundary>
//   <App />
// </ErrorBoundary>
//
// Con interfaz personalizada:
// <ErrorBoundary fallback={<MiPantallaDeError />}>
//   <MiComponente />
// </ErrorBoundary>
//
// Múltiples boundaries (granularidad):
// <ErrorBoundary>
//   <NavBar />
//   <ErrorBoundary>
//     <ContenidoPrincipal />
//   </ErrorBoundary>
//   <Footer />
// </ErrorBoundary>
//
// NOTA TÉCNICA:
// Error Boundaries deben ser componentes de clase porque React no proporciona
// hooks equivalentes para getDerivedStateFromError y componentDidCatch.
// ==============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Propiedades del componente ErrorBoundary
 */
interface Props {
  children: ReactNode    // Los componentes hijos que queremos proteger de errores
  fallback?: ReactNode   // Interfaz personalizada para mostrar cuando hay error (opcional)
}

/**
 * Estado interno del componente ErrorBoundary
 */
interface State {
  hasError: boolean              // Indica si se ha capturado un error
  error: Error | null            // El objeto de error capturado (si existe)
  errorInfo: ErrorInfo | null    // Información adicional como el stack trace del componente
}

/**
 * Componente ErrorBoundary (Límite de Errores)
 *
 * Este es un componente especial de React que actúa como un "guardián" que atrapa
 * errores que ocurren durante el renderizado de sus componentes hijos.
 *
 * 🔴 IMPORTANTE - Error Boundaries NO capturan errores en:
 * ❌ Event handlers (onClick, onChange, etc.) - usa try/catch normal
 * ❌ Código asíncrono (setTimeout, Promises, async/await)
 * ❌ Server-side rendering (SSR)
 * ❌ Errores lanzados en el propio error boundary
 *
 * ✅ SÍ captura errores en:
 * ✅ Durante el renderizado de componentes
 * ✅ En métodos del ciclo de vida de componentes clase
 * ✅ En constructores de componentes hijos
 */
export class ErrorBoundary extends Component<Props, State> {
  // Estado inicial: sin errores detectados
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  /**
   * MÉTODO ESTÁTICO: getDerivedStateFromError
   *
   * Este es el primer método que React llama cuando un componente hijo lanza un error.
   * Su trabajo es actualizar el estado para que podamos mostrar la UI de fallback
   * en el siguiente render.
   *
   * Es estático porque React necesita llamarlo antes de que el componente se monte
   * completamente. No tiene acceso a 'this' ni a instancias del componente.
   *
   * @param error - El error que fue lanzado por un componente hijo
   * @returns El nuevo estado que indica que hubo un error
   */
  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,      // Marcar que hubo un error
      error,               // Guardar el error para mostrarlo después
      errorInfo: null,     // Se llenará en componentDidCatch
    }
  }

  /**
   * MÉTODO DEL CICLO DE VIDA: componentDidCatch
   *
   * Este método se llama DESPUÉS de que getDerivedStateFromError ya actualizó el estado.
   * Es el lugar perfecto para:
   * - Registrar el error en consola durante desarrollo
   * - Enviar el error a servicios de monitoreo (Sentry, Rollbar, etc.) en producción
   * - Realizar análisis o logging adicional
   *
   * Tiene acceso al stack trace completo del error, incluyendo qué componentes
   * fueron los que causaron el problema.
   *
   * @param error - El error capturado
   * @param errorInfo - Información adicional: stack trace de componentes React
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registrar el error en consola para que los desarrolladores puedan verlo
    console.error('🛑 ErrorBoundary capturó un error:', error, errorInfo)

    // ✅ TODO: Integrar con servicio de error tracking en producción
    // Ejemplos: Sentry, Rollbar, Bugsnag, LogRocket
    if (process.env.NODE_ENV === 'production') {
      // Ejemplo con Sentry:
      // Sentry.captureException(error, {
      //   extra: {
      //     componentStack: errorInfo.componentStack
      //   }
      // })

      // Ejemplo con custom API:
      // logErrorToService({
      //   message: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack,
      //   timestamp: new Date().toISOString(),
      //   userAgent: navigator.userAgent,
      //   url: window.location.href
      // })
    }

    // Actualizar estado con información del error
    this.setState({
      error,
      errorInfo,
    })
  }

  /**
   * Handler para resetear el error boundary
   * Permite al usuario intentar de nuevo
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  /**
   * Renderizar componente
   * Muestra UI de error si hasError es true, sino renderiza children
   */
  public render() {
    // Si hay error, mostrar UI de fallback
    if (this.state.hasError) {
      // Si se provee un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback
      }

      // UI de error por defecto
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              We're sorry for the inconvenience. The application encountered an unexpected error.
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-6 overflow-auto max-h-48">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development Only):
                </p>
                <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <a
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      )
    }

    // Si no hay error, renderizar children normalmente
    return this.props.children
  }
}
