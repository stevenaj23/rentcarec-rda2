export type EventType =
  | 'RESERVA_CREADA'
  | 'RESERVA_CANCELADA'
  | 'RESERVA_ACTUALIZADA'
  | 'VEHICULO_ACTUALIZADO'
  | 'ALQUILER_INICIADO'
  | 'ALQUILER_CANCELADO'
  | 'DEVOLUCION_REGISTRADA';

export interface BusEvent {
  id:          string;
  tipo:        EventType;
  usuarioId:   string;
  entidadId:   string;
  payload:     Record<string, unknown>;
  publicadoEn: string;
  destino:     'rabbitmq' | 'local';
}

// Sobre estándar que viaja por RabbitMQ — todos los servicios lo respetan
export interface EventEnvelope {
  eventId:       string;   // UUID único — usado para idempotencia en consumidores
  eventType:     EventType;
  eventVersion:  string;   // '1.0' — permite evolucionar el contrato sin romper consumidores
  correlationId: string;   // une todos los eventos de un mismo flujo de negocio
  causationId?:  string;   // eventId del evento que originó este
  aggregateId:   string;   // ID de la entidad principal
  aggregateType: string;   // 'Reserva' | 'Alquiler' | 'Devolucion' | 'Pago'
  occurredAt:    string;   // ISO 8601
  source:        string;   // nombre del servicio que publicó
  payload:       Record<string, unknown>;
  meta:          { usuarioId?: string; [key: string]: unknown };
}
