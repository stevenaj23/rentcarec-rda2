import { api } from './client';

export interface PagoPayload {
  reservaId: string; monto: number; metodoPago: string; referencia?: string;
}

export interface Factura {
  id: string; numeroFactura: string; rucCliente?: string;
  razonSocial?: string; subtotal: number; iva: number;
  total: number; createdAt: string; detalles?: any[];
}

export const pagosApi = {
  pagar:          (dto: PagoPayload) =>
    api.post<{ success: true; data: any }>('/pagos', dto),
  getByReserva:   (reservaId: string) =>
    api.get<{ success: true; data: any[] }>('/pagos', { params: { reservaId } }),
  generarFactura: (dto: { reservaId: string; rucCliente: string; razonSocial: string }) =>
    api.post<{ success: true; data: Factura }>('/facturas', dto),
  getFacturaByReserva: (reservaId: string) =>
    api.get<{ success: true; data: Factura[] }>('/facturas', { params: { reservaId } }),
};
