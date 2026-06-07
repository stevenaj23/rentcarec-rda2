import { useEffect, useRef } from 'react';
import { api } from '../api/client';

type EventCallback = () => void;

/**
 * Conecta al SSE del bus-service vía fetch streaming.
 * Llama a onVehiculoActualizado cuando el backend emite VEHICULO_ACTUALIZADO.
 * Se reconecta automáticamente con back-off exponencial.
 */
export function useBusEvents(onVehiculoActualizado: EventCallback) {
  const callbackRef = useRef(onVehiculoActualizado);
  callbackRef.current = onVehiculoActualizado;

  useEffect(() => {
    let active  = true;
    let delay   = 3_000;
    let controller: AbortController | null = null;

    async function connect() {
      if (!active) return;
      controller = new AbortController();
      try {
        const baseUrl = (api.defaults.baseURL as string).replace(/\/+$/, '');
        const url = `${baseUrl}/bus/stream`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
        });

        if (!res.body) throw new Error('no body');

        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';
        let   eventName = '';

        delay = 3_000; // reset back-off on successful connection

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              if (eventName === 'VEHICULO_ACTUALIZADO' || eventName === 'RESERVA_CANCELADA') {
                callbackRef.current();
              }
              eventName = '';
            }
          }
        }
      } catch {
        // connection closed or error — retry with back-off
      }

      if (active) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 1.5, 30_000);
      }
    }

    connect();

    return () => {
      active = false;
      controller?.abort();
    };
  }, []);
}
