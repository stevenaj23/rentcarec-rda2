-- Tabla de idempotencia: evita procesar el mismo evento dos veces
CREATE TABLE IF NOT EXISTS "eventos_procesados" (
    "event_id"     TEXT        NOT NULL,
    "procesado_at" TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT "eventos_procesados_pkey" PRIMARY KEY ("event_id")
);
