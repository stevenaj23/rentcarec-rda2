import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const VehiculoEventsContext = createContext<{ version: number }>({ version: 0 });

export function VehiculoEventsProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let delay  = 1_000;
    let controller: AbortController | null = null;

    async function connect() {
      if (!active) return;
      controller = new AbortController();
      try {
        const baseUrl = (api.defaults.baseURL as string).replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/bus/stream`, {
          signal:  controller.signal,
          headers: { Accept: 'text/event-stream', 'Cache-Control': 'no-cache' },
        });
        if (!res.body) throw new Error('no body');

        const reader    = res.body.getReader();
        const decoder   = new TextDecoder();
        let   buffer    = '';
        let   eventName = '';
        delay = 1_000;

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
              if (
                eventName === 'VEHICULO_ACTUALIZADO' ||
                eventName === 'RESERVA_CANCELADA'    ||
                eventName === 'RESERVA_CREADA'
              ) {
                setVersion(v => v + 1);
              }
              eventName = '';
            }
          }
        }
      } catch { /* reconectar con back-off */ }

      if (active) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 1.5, 10_000);
      }
    }

    connect();
    return () => { active = false; controller?.abort(); };
  }, []);

  return (
    <VehiculoEventsContext.Provider value={{ version }}>
      {children}
    </VehiculoEventsContext.Provider>
  );
}

export function useVehiculoVersion() {
  return useContext(VehiculoEventsContext).version;
}
