import CircuitBreaker from 'opossum';

// Configuración compartida para todos los circuit breakers gRPC
const BREAKER_OPTIONS: CircuitBreaker.Options = {
  timeout:                  5000,  // falla si tarda más de 5s
  errorThresholdPercentage: 50,    // abre si más del 50% de llamadas fallan
  resetTimeout:             30000, // intenta cerrar el circuito tras 30s
  volumeThreshold:          3,     // mínimo de llamadas antes de evaluar
};

export function makeBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  fallbackFn: (...args: TArgs) => TResult,
  name: string,
): (...args: TArgs) => Promise<TResult> {
  const breaker = new CircuitBreaker(fn, { ...BREAKER_OPTIONS, name });

  breaker.fallback(fallbackFn);

  breaker.on('open',     () => console.warn(`[circuit-breaker] ABIERTO   → ${name}`));
  breaker.on('halfOpen', () => console.info(`[circuit-breaker] HALF-OPEN → ${name}`));
  breaker.on('close',    () => console.info(`[circuit-breaker] CERRADO   → ${name}`));

  return (...args: TArgs) => breaker.fire(...args);
}
