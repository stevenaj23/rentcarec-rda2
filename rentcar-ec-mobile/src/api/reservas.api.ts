import { api } from './client';

export interface VehiculoReserva {
  nombre: string; placa: string; precio_dia: number; status: string;
  imagen_url?: string; categoria?: string;
}

export interface PagoReserva {
  id: string; monto: number; metodoPago: string;
  referencia?: string; status: string; createdAt: string;
}

export interface ExtraReserva {
  extraId: string; cantidad: number; precioDia: number; subtotal: number;
}

export interface SeguroReserva {
  id: string; nombre: string; precioDia: number;
}

export interface Reserva {
  id: string; codigoReserva: string; status: string;
  vehiculoId: string; fechaInicio: string; fechaFin: string;
  diasTotal: number; precioBase: number; precioExtras: number;
  precioSeguro: number; totalAmount: number;
  clienteNombre?: string; notas?: string;
  extras?: ExtraReserva[];
  pagos?: PagoReserva[];
  vehiculo?: VehiculoReserva | null;
  seguro?: SeguroReserva | null;
  agencia?: { nombre?: string; ciudad?: string } | null;
  createdAt: string;
}

export interface ReservaPayload {
  vehiculoId: string; agenciaId?: string;
  fechaInicio: string; fechaFin: string;
  seguroId?: string;
  extras?: { extraId: string; cantidad: number }[];
  notas?: string;
}

export const reservasApi = {
  create:  (dto: ReservaPayload) =>
    api.post<{ success: true; data: Reserva }>('/reservas', dto),

  myList:  (params?: { page?: number; limit?: number }) =>
    api.get<{ success: true; data: Reserva[] }>('/reservas/my', { params }),

  getById: (id: string) =>
    api.get<{ success: true; data: Reserva }>(`/reservas/${id}`),

  cancel:  (id: string) =>
    api.patch<{ success: true; data: Reserva }>(`/reservas/${id}/cancelar`),
};
