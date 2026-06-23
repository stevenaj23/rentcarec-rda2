import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { PrismaClient } from '@prisma/client';

const prisma       = new PrismaClient();
const QUEUE        = 'financiero.inbox';
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? 'amqp://rentcar:rentcar2024@localhost:5672/rentcar';
const EXCHANGE     = process.env.RABBITMQ_EXCHANGE ?? 'rentcar.eventos';

let connection: ChannelModel | null = null;
let channel: Channel | null         = null;

// ── Handlers por tipo de evento ───────────────────────────────────────────────

async function onReservaCreada(payload: any, eventId: string): Promise<void> {
  // Registrar cobro pendiente asociado a la reserva
  await prisma.$transaction([
    prisma.pago.create({
      data: {
        reservaId:  payload.reservaId,
        monto:      payload.totalAmount ?? 0,
        metodoPago: 'PENDIENTE',
        status:     'PENDIENTE',
      },
    }),
    prisma.eventoProcesado.create({ data: { eventId } }),
  ]);
  console.log(`[financiero.consumer] reserva.creada → pago pendiente reserva ${payload.reservaId}`);
}

async function onDevolucionRegistrada(payload: any, eventId: string): Promise<void> {
  // Marcar pagos de la reserva como listos para cobro final
  const pagos = await prisma.pago.findMany({
    where: { reservaId: payload.reservaId, status: 'PENDIENTE' },
  });

  if (pagos.length === 0) {
    await prisma.eventoProcesado.create({ data: { eventId } });
    return;
  }

  await prisma.$transaction([
    ...pagos.map((p) =>
      prisma.pago.update({
        where: { id: p.id },
        data:  { monto: payload.montoFinal ?? p.monto },
      }),
    ),
    prisma.eventoProcesado.create({ data: { eventId } }),
  ]);
  console.log(`[financiero.consumer] devolucion.registrada → monto actualizado reserva ${payload.reservaId}`);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

async function handleMessage(msg: ConsumeMessage): Promise<void> {
  let envelope: any;
  try {
    envelope = JSON.parse(msg.content.toString());
  } catch {
    channel!.nack(msg, false, false);
    return;
  }

  const { eventId, eventType, payload } = envelope;

  // Idempotencia
  const yaExiste = await prisma.eventoProcesado.findUnique({ where: { eventId } });
  if (yaExiste) {
    channel!.ack(msg);
    return;
  }

  try {
    switch (eventType) {
      case 'RESERVA_CREADA':
        await onReservaCreada(payload, eventId);
        break;
      case 'DEVOLUCION_REGISTRADA':
        await onDevolucionRegistrada(payload, eventId);
        break;
      default:
        // Evento no manejado — ACK sin procesar
        await prisma.eventoProcesado.create({ data: { eventId } });
        break;
    }
    channel!.ack(msg);

  } catch (err) {
    console.error(`[financiero.consumer] Error procesando ${eventType}:`, err);
    channel!.nack(msg, false, false);
  }
}

// ── Conexión con reconexión automática ────────────────────────────────────────

async function connect(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.prefetch(5);

    await channel.consume(QUEUE, (msg) => {
      if (msg) handleMessage(msg).catch((err) => {
        console.error('[financiero.consumer] Error no capturado en handleMessage:', err);
        channel?.nack(msg, false, false);
      });
    });

    console.log(`[financiero.consumer] Escuchando queue: ${QUEUE}`);

    connection.on('error', () => { connection = null; channel = null; setTimeout(connect, 5000); });
    connection.on('close', () => { connection = null; channel = null; setTimeout(connect, 5000); });

  } catch (err) {
    console.error('[financiero.consumer] Error conectando a RabbitMQ:', err);
    setTimeout(connect, 5000);
  }
}

export function startFinancieroConsumer(): void {
  connect();
}
