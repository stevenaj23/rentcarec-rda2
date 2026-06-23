import amqp, { Channel, ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma        = new PrismaClient();
const EXCHANGE      = process.env.RABBITMQ_EXCHANGE ?? 'rentcar.eventos';
const RABBITMQ_URL  = process.env.RABBITMQ_URL ?? 'amqp://rentcar:rentcar2024@localhost:5672/rentcar';
const POLL_INTERVAL = 10_000; // 10 segundos
const MAX_INTENTOS  = 5;

let channel: Channel | null         = null;
let connection: ChannelModel | null = null;
let connected                  = false;
let isRunning                  = false;

async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    connected  = true;
    console.log('[outbox-processor] Conectado a RabbitMQ');

    connection.on('error', () => { connected = false; setTimeout(connectRabbitMQ, 5000); });
    connection.on('close', () => { connected = false; setTimeout(connectRabbitMQ, 5000); });
  } catch {
    connected = false;
    setTimeout(connectRabbitMQ, 5000);
  }
}

function eventoToRoutingKey(evento: string): string {
  // 'RESERVA_CREADA' → 'reserva.creada'
  return evento.toLowerCase().replace(/_/g, '.');
}

async function processOutbox(): Promise<void> {
  if (!connected || !channel || isRunning) return;
  isRunning = true;
  try { await _processOutbox(); } finally { isRunning = false; }
}

async function _processOutbox(): Promise<void> {
  if (!connected || !channel) return;

  // Tomar hasta 10 eventos pendientes, ordenados por antigüedad
  const pendientes = await prisma.outboxEvent.findMany({
    where: {
      status:   'PENDIENTE',
      intentos: { lt: MAX_INTENTOS },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  for (const outbox of pendientes) {
    try {
      const eventId    = randomUUID();
      const routingKey = eventoToRoutingKey(outbox.evento ?? '');

      const envelope = {
        eventId,
        eventType:     outbox.evento,
        eventVersion:  '1.0',
        correlationId: outbox.correlationId ?? randomUUID(),
        aggregateId:   (outbox.payload as any)?.reservaId
        ?? (outbox.payload as any)?.alquilerId
        ?? (outbox.payload as any)?.devolucionId
        ?? (outbox.payload as any)?.pagoId
        ?? outbox.id,
        aggregateType: resolveAggregateType(outbox.evento ?? ''),
        occurredAt:    outbox.createdAt?.toISOString() ?? new Date().toISOString(),
        source:        'operaciones-service',
        payload:       outbox.payload ?? {},
        meta:          { usuarioId: outbox.usuarioId },
      };

      channel!.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(envelope)),
        { persistent: true, contentType: 'application/json', messageId: eventId },
      );

      await prisma.outboxEvent.update({
        where: { id: outbox.id },
        data:  { status: 'PROCESADO', procesadoAt: new Date() },
      });

    } catch (err) {
      const nuevosIntentos = (outbox.intentos ?? 0) + 1;
      await prisma.outboxEvent.update({
        where: { id: outbox.id },
        data:  {
          intentos: nuevosIntentos,
          status:   nuevosIntentos >= MAX_INTENTOS ? 'FALLIDO' : 'PENDIENTE',
        },
      });
      console.error(`[outbox-processor] Error procesando evento ${outbox.id} (intento ${nuevosIntentos}):`, err);
    }
  }
}

function resolveAggregateType(evento: string): string {
  if (evento.startsWith('RESERVA'))    return 'Reserva';
  if (evento.startsWith('ALQUILER'))   return 'Alquiler';
  if (evento.startsWith('DEVOLUCION')) return 'Devolucion';
  if (evento.startsWith('PAGO'))       return 'Pago';
  return 'Unknown';
}

export function startOutboxProcessor(): void {
  connectRabbitMQ();
  setInterval(processOutbox, POLL_INTERVAL);
  console.log(`[outbox-processor] Iniciado — polling cada ${POLL_INTERVAL / 1000}s`);
}
