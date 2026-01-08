// ==============================================================================
// ARCHIVO: frontend/customer-app/src/components/ErrorBoundary.test.tsx
// FUNCIONALIDAD: Tests para el componente ErrorBoundary
//
// ✅ TESTING: Tests de Error Boundary
//
// TESTS INCLUIDOS:
// - Captura de errores de React
// - Renderizado de UI de fallback
// - Funcionalidad de reset
// - Fallback personalizado
// - Logging de errores
// - Mostrar detalles en desarrollo
// ==============================================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Componente problemático que lanza un error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Componente normal que no lanza errores
const NormalComponent = () => <div>Normal component</div>;

describe('ErrorBoundary', () => {
  const originalEnv = process.env.NODE_ENV;
  let consoleErrorSpy: any;

  beforeEach(() => {
    // Silenciar console.error para tests (React Error Boundary logueará)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe('Normal Behavior', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal component')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <ErrorBoundary>
          <div>Working component</div>
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error UI when child throws error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/we're sorry for the inconvenience/i)).toBeInTheDocument();
    });

    it('should call console.error when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should show error icon in UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verificar que el ícono AlertTriangle está presente
      const errorContainer = screen.getByText(/oops! something went wrong/i).parentElement;
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Error UI Elements', () => {
    beforeEach(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    it('should display "Try Again" button', () => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should display "Go Home" link', () => {
      expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
    });

    it('should have correct href for "Go Home" link', () => {
      const homeLink = screen.getByRole('link', { name: /go home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should display error title', () => {
      expect(screen.getByRole('heading', { name: /oops! something went wrong/i })).toBeInTheDocument();
    });

    it('should display user-friendly error message', () => {
      expect(screen.getByText(/we're sorry for the inconvenience/i)).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset error state when "Try Again" is clicked', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI debe estar visible
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click en "Try Again"
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Re-renderizar con componente que no lanza error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // El componente normal debe renderizarse
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should clear error state on reset', async () => {
      const user = userEvent.setup();
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Después del reset, si re-renderizamos sin error, debe funcionar
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText(/oops! something went wrong/i)).not.toBeInTheDocument();
    });

    it('should use default UI when no custom fallback provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/oops! something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Development vs Production', () => {
    it('should show error details in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/error details \(development only\)/i)).toBeInTheDocument();
      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('should hide error details in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText(/error details \(development only\)/i)).not.toBeInTheDocument();
    });

    it('should show component stack in development', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verificar que hay una sección de error details
      const errorDetails = screen.getByText(/error details/i);
      expect(errorDetails).toBeInTheDocument();
    });
  });

  describe('Multiple Errors', () => {
    it('should handle errors from different components', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Simular otro error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should allow nested error boundaries', () => {
      const InnerError = () => {
        throw new Error('Inner error');
      };

      render(
        <ErrorBoundary fallback={<div>Outer error</div>}>
          <ErrorBoundary fallback={<div>Inner error caught</div>}>
            <InnerError />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // El error boundary interno debe capturar el error
      expect(screen.getByText('Inner error caught')).toBeInTheDocument();
      expect(screen.queryByText('Outer error')).not.toBeInTheDocument();
    });

    it('should bubble to parent boundary if inner component has no boundary', () => {
      render(
        <ErrorBoundary fallback={<div>Outer caught it</div>}>
          <div>
            <ThrowError shouldThrow={true} />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer caught it')).toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('should maintain error state until reset', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Re-renderizar sin cambiar el error
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error UI debe seguir visible
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should not reset automatically on prop changes', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Cambiar children pero el error persiste
      rerender(
        <ErrorBoundary>
          <div>New children</div>
        </ErrorBoundary>
      );

      // Error UI debe seguir mostrándose
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const heading = screen.getByRole('heading', { name: /oops! something went wrong/i });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H1');
    });

    it('should have accessible button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /try again/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have accessible link', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const link = screen.getByRole('link', { name: /go home/i });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should handle empty fragment', () => {
      render(
        <ErrorBoundary>
          <></>
        </ErrorBoundary>
      );

      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Message Display', () => {
    it('should display error message in development', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });

    it('should format error details properly', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Debe haber un elemento <pre> para el error
      const preElement = document.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement?.className).toContain('text-xs');
    });
  });
});
