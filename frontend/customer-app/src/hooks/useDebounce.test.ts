// ==============================================================================
// ARCHIVO: frontend/customer-app/src/hooks/useDebounce.test.ts
// FUNCIONALIDAD: Tests para el hook useDebounce
//
// ✅ TESTING: Tests de hook personalizado
// ==============================================================================

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 300));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 300 },
      }
    );

    expect(result.current).toBe('initial');

    // Cambiar valor
    rerender({ value: 'updated', delay: 300 });

    // Valor aún no debe cambiar
    expect(result.current).toBe('initial');

    // Avanzar tiempo pero no completamente
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe('initial');

    // Completar el delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('should cancel previous timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'first', delay: 300 },
      }
    );

    // Cambios rápidos
    rerender({ value: 'second', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'third', delay: 300 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'fourth', delay: 300 });

    // Después de 300ms desde el último cambio
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Solo el último valor debe aplicarse
    expect(result.current).toBe('fourth');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'test', delay: 500 },
      }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(result.current).toBe('test');

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'initial' },
    });

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(result.current).toBe('updated');
  });

  it('should work with different value types', () => {
    // Test con números
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    numRerender({ value: 42 });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(numResult.current).toBe(42);

    // Test con objetos
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { count: 0 } } }
    );

    objRerender({ value: { count: 1 } });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(objResult.current).toEqual({ count: 1 });

    // Test con arrays
    const { result: arrResult, rerender: arrRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: [] } }
    );

    arrRerender({ value: [1, 2, 3] });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(arrResult.current).toEqual([1, 2, 3]);
  });

  it('should cleanup timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Desmontar antes de que el timer complete
    unmount();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // El valor no debe actualizarse después de desmontar
    expect(result.current).toBe('initial');
  });

  it('should handle empty strings', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'text' } }
    );

    rerender({ value: '' });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe('');
  });
});
