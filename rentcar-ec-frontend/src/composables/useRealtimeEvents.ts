import { onMounted, onUnmounted } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';

// Mapea cada tipo de evento SSE con las query keys que debe invalidar
const REFRESH_MAP: Record<string, string[][]> = {
  RESERVA_CREADA:       [['admin-reservas'], ['vehiculos']],
  RESERVA_CANCELADA:    [['admin-reservas'], ['vehiculos']],
  RESERVA_ACTUALIZADA:  [['admin-reservas'], ['vehiculos']],
  VEHICULO_ACTUALIZADO: [['vehiculos'], ['admin-reservas']],
  ALQUILER_INICIADO:    [['admin-alquileres'], ['admin-reservas'], ['vehiculos']],
  ALQUILER_CANCELADO:   [['admin-alquileres'], ['vehiculos']],
  DEVOLUCION_REGISTRADA:[['admin-alquileres'], ['admin-reservas'], ['vehiculos']],
};

export function useRealtimeEvents() {
  const qc = useQueryClient();
  let es: EventSource | null = null;
  let retryTimeout: ReturnType<typeof setTimeout> | null = null;
  let retryDelay = 2000;

  function connect() {
    // VITE_API_URL = '/api/v1/stevenariel' → SSE en /api/v1/stevenariel/bus/stream
    const apiBase = (import.meta.env.VITE_API_URL as string ?? '/api/v1/stevenariel').replace(/\/$/, '');
    const streamUrl = `${apiBase}/bus/stream`;

    es = new EventSource(streamUrl);

    es.addEventListener('connected', () => {
      console.log('[SSE] conectado al bus de eventos');
      retryDelay = 2000; // reset backoff
    });

    Object.entries(REFRESH_MAP).forEach(([eventName, keys]) => {
      es!.addEventListener(eventName, () => {
        keys.forEach(key => qc.invalidateQueries({ queryKey: key }));
      });
    });

    es.onerror = () => {
      es?.close();
      es = null;
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = setTimeout(() => {
        retryDelay = Math.min(retryDelay * 1.5, 30_000);
        connect();
      }, retryDelay);
    };
  }

  onMounted(() => connect());

  onUnmounted(() => {
    if (retryTimeout) clearTimeout(retryTimeout);
    es?.close();
    es = null;
  });
}
