import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { PrismaClient } from '@prisma/client';

const prisma       = new PrismaClient();
const QUEUE        = 'inventario.inbox';
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://rentcar:rentcar2024@localhost:5672/rentcar';
const EXCHANGE     = process.env.RABBITMQ_EXCHANGE ?? 'rentcar.eventos';

let connection: ChannelModel | null = null;
let channel: Channel | null         = null;

// ── Mapa de eventos → nuevo estado del vehículo ───────────────────────────────
const STATUS_MAP: Record<string, string> = {
  'ALQUILER_INICIADO':     'EN_USO',
  'RESERVA_CANCELADA':     'DISPONIBLE',
  'DEVOLUCION_REGISTRADA': 'DISPONIBLE',
};

async function handleMessage(msg: ConsumeMessage): Promise<void> {
  let envelope: any;
  try {
    envelope = JSON.parse(msg.content.toString());
  } catch {
    // Mensaje corrupto — descartar sin requeue
    channel!.nack(msg, false, false);
    return;
  }

  const { eventId, eventType, payload } = envelope;

  // ── Idempotencia: si ya procesamos este eventId, ignorar ──────────────────
  const yaExiste = await prisma.eventoProcesado.findUnique({ where: { eventId } });
  if (yaExiste) {
    channel!.ack(msg);
    return;
  }

  const nuevoStatus = STATUS_MAP[eventType];
  if (!nuevoStatus) {
    // Evento que no manejamos — ACK sin procesar
    channel!.ack(msg);
    return;
  }

  const vehiculoId = (payload as any)?.vehiculoId as string | undefined;
  if (!vehiculoId) {
    console.warn(`[inventario.consumer] Evento ${eventType} sin vehiculoId — descartando`);
    channel!.nack(msg, false, false);
    return;
  }

  try {
    await prisma.$transaction([
      prisma.vehiculo.update({
        where: { id: vehiculoId },
        data:  { status: nuevoStatus as any },
      }),
      prisma.eventoProcesado.create({ data: { eventId } }),
    ]);

    console.log(`[inventario.consumer] ${eventType} → vehiculo ${vehiculoId} → ${nuevoStatus}`);
    channel!.ack(msg);

  } catch (err) {
    console.error(`[inventario.consumer] Error procesando ${eventType}:`, err);
    // NACK sin requeue — va a DLQ tras los reintentos configurados en la queue
    channel!.nack(msg, false, false);
  }
}

async function connect(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.prefetch(5); // procesar hasta 5 mensajes en paralelo

    await channel.consume(QUEUE, (msg) => {
      if (msg) handleMessage(msg).catch((err) => {
        console.error('[inventario.consumer] Error no capturado en handleMessage:', err);
        channel?.nack(msg, false, false);
      });
    });

    console.log(`[inventario.consumer] Escuchando queue: ${QUEUE}`);

    connection.on('error', () => { connection = null; channel = null; setTimeout(connect, 5000); });
    connection.on('close', () => { connection = null; channel = null; setTimeout(connect, 5000); });

  } catch (err) {
    console.error('[inventario.consumer] Error conectando a RabbitMQ:', err);
    setTimeout(connect, 5000);
  }
}

export function startInventarioConsumer(): void {
  connect();
}
