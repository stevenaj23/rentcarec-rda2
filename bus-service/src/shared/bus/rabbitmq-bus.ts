import amqp, { Channel, ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';
import { BusEvent, EventEnvelope, EventType } from './event-types.js';
import { broadcastSse } from '../sse-hub.js';

const EXCHANGE      = process.env.RABBITMQ_EXCHANGE ?? 'rentcar.eventos';
const EXCHANGE_DLX  = 'rentcar.eventos.dlx';
const RABBITMQ_URL  = process.env.RABBITMQ_URL ?? 'amqp://rentcar:rentcar2024@localhost:5672/rentcar';

const inMemoryLog: BusEvent[] = [];

let connection: ChannelModel | null = null;
let channel: Channel | null         = null;
let connected                    = false;
let reconnecting                 = false;

async function connect(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    // Exchange principal (topic) — enruta por routing key
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    // Exchange Dead Letter — recibe mensajes fallidos
    await channel.assertExchange(EXCHANGE_DLX, 'direct', { durable: true });

    // Queues de consumo por servicio
    const queues: Array<{ name: string; patterns: string[]; dlqKey: string }> = [
      { name: 'financiero.inbox',    patterns: ['reserva.*', 'devolucion.*'], dlqKey: 'dlq.financiero'    },
      { name: 'inventario.inbox',    patterns: ['reserva.cancelada', 'alquiler.*', 'devolucion.*'], dlqKey: 'dlq.inventario' },
      { name: 'operaciones.inbox',   patterns: ['pago.*'],                    dlqKey: 'dlq.operaciones'   },
      { name: 'auditoria.inbox',     patterns: ['#'],                         dlqKey: 'dlq.auditoria'     },
    ];

    for (const q of queues) {
      // DLQ para esta queue
      await channel.assertQueue(`rentcar.${q.dlqKey}`, { durable: true });
      await channel.bindQueue(`rentcar.${q.dlqKey}`, EXCHANGE_DLX, q.dlqKey);

      // Queue principal — sin argumentos extra para ser compatible con los consumidores
      await channel.assertQueue(q.name, { durable: true });

      for (const pattern of q.patterns) {
        await channel.bindQueue(q.name, EXCHANGE, pattern);
      }
    }

    connected = true;
    console.log(`[bus-service] RabbitMQ conectado → exchange: ${EXCHANGE}`);

    connection.on('error', (err) => {
      console.error('[bus-service] RabbitMQ error de conexión:', err.message);
      connected = false;
      scheduleReconnect();
    });

    connection.on('close', () => {
      console.warn('[bus-service] RabbitMQ conexión cerrada — reconectando...');
      connected = false;
      scheduleReconnect();
    });

  } catch (err) {
    console.error('[bus-service] No se pudo conectar a RabbitMQ:', err);
    connected = false;
    scheduleReconnect();
  }
}

function scheduleReconnect(): void {
  if (reconnecting) return;
  reconnecting = true;
  setTimeout(() => { reconnecting = false; connect(); }, 5000);
}

// Iniciar conexión al importar el módulo
connect();

// ── Publicar evento ────────────────────────────────────────────────────────────

export async function publishEvent(
  tipo: EventType,
  usuarioId: string,
  entidadId: string,
  payload: Record<string, unknown>,
): Promise<BusEvent> {
  const eventId    = randomUUID();
  const occurredAt = new Date().toISOString();

  const envelope: EventEnvelope = {
    eventId,
    eventType:     tipo,
    eventVersion:  '1.0',
    correlationId: (payload['correlationId'] as string | undefined) ?? randomUUID(),
    aggregateId:   entidadId,
    aggregateType: resolveAggregateType(tipo),
    occurredAt,
    source:        'bus-service',
    payload,
    meta: { usuarioId },
  };

  const event: BusEvent = {
    id:          eventId,
    tipo,
    usuarioId,
    entidadId,
    payload,
    publicadoEn: occurredAt,
    destino:     connected ? 'rabbitmq' : 'local',
  };

  if (connected && channel) {
    const routingKey = toRoutingKey(tipo);
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true, contentType: 'application/json', messageId: eventId },
    );
  } else {
    console.log('[bus-service][local-event]', JSON.stringify(event));
  }

  // Push SSE a todos los clientes conectados (admin panel, mobile app)
  broadcastSse(tipo, { eventId, entidadId, payload, occurredAt });

  inMemoryLog.unshift(event);
  if (inMemoryLog.length > 200) inMemoryLog.pop();

  return event;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRoutingKey(tipo: EventType): string {
  const map: Record<EventType, string> = {
    'RESERVA_CREADA':        'reserva.creada',
    'RESERVA_CANCELADA':     'reserva.cancelada',
    'RESERVA_ACTUALIZADA':   'reserva.actualizada',
    'ALQUILER_INICIADO':     'alquiler.iniciado',
    'ALQUILER_CANCELADO':    'alquiler.cancelado',
    'DEVOLUCION_REGISTRADA': 'devolucion.registrada',
    'VEHICULO_ACTUALIZADO':  'vehiculo.actualizado',
  };
  return map[tipo] ?? tipo.toLowerCase().replace(/_/g, '.');
}

function resolveAggregateType(tipo: EventType): string {
  if (tipo.startsWith('RESERVA'))    return 'Reserva';
  if (tipo.startsWith('ALQUILER'))   return 'Alquiler';
  if (tipo.startsWith('DEVOLUCION')) return 'Devolucion';
  return 'Unknown';
}

// ── Consultas de estado (compatibilidad con API existente) ─────────────────────

export function isSenderConnected(): boolean {
  return connected;
}

export function getEventLog(page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    items:      inMemoryLog.slice(start, start + limit),
    total:      inMemoryLog.length,
    page,
    limit,
    totalPages: Math.ceil(inMemoryLog.length / limit),
  };
}
