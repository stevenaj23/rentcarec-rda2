import { api } from './client';

export interface Vehiculo {
  id: string; placa: string; color: string; anio: number;
  precioDia: number; status: string; imagenUrl?: string; descripcion?: string;
  modelo:          { nombre: string; marca: { nombre: string } };
  categoria:       { nombre: string };
  tipoCombustible: { nombre: string };
  tipoTransmision: { nombre: string };
  numeroPasajeros: number; kilometraje: number; agenciaId?: string;
}

export interface VehiculoListResponse {
  success: true;
  data: { data: Vehiculo[]; total: number; page: number; limit: number; totalPages: number };
}

export const vehiculosApi = {
  list:    (params?: { page?: number; limit?: number; status?: string; categoriaId?: string }) =>
    api.get<VehiculoListResponse>('/vehiculos', { params }),
  getById: (id: string) =>
    api.get<{ success: true; data: Vehiculo }>(`/vehiculos/${id}`),
  extras:  () =>
    api.get<{ success: true; data: any[] }>('/extras'),
  seguros: () =>
    api.get<{ success: true; data: any[] }>('/seguros'),
};
