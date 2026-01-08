// ==============================================================================
// ARCHIVO: shared/circuit-breaker/index.ts
// FUNCIONALIDAD: Exports centralizados para el módulo de circuit breaker
// ==============================================================================

export { CircuitBreakerService } from './circuit-breaker.service';
export {
  CircuitBreakerConfig,
  CircuitBreakerPresets,
  ServiceCircuitBreakerConfigs,
} from './circuit-breaker.config';
