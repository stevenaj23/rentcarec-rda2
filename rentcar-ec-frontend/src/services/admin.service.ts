import { apiClient } from '@/lib/api-client';
import type {
  ApiSuccess, PagedResult, Usuario, Agencia, Empresa,
  Marca, Modelo, Categoria, TipoCombustible, TipoTransmision,
  ExtraEquipamiento, Seguro, Tarifa, CanalVenta,
  Provincia, Ciudad,
} from '@/types/domain';

export const adminService = {
  getDashboard: () =>
    apiClient.get<ApiSuccess<any>>('/admin/dashboard'),

  // Usuarios
  getUsuarios: (page = 1, limit = 20) =>
    apiClient.get<ApiSuccess<PagedResult<Usuario>>>('/usuarios', { page, limit }),

  // Agencias
  getAgencias: () =>
    apiClient.get<ApiSuccess<any>>('/agencias'),
  createAgencia: (data: object) =>
    apiClient.post<ApiSuccess<Agencia>>('/agencias', data),
  updateAgencia: (id: string, data: object) =>
    apiClient.patch<ApiSuccess<Agencia>>(`/agencias/${id}`, data),
  deleteAgencia: (id: string) =>
    apiClient.delete<ApiSuccess<any>>(`/agencias/${id}`),

  // Empresas
  getEmpresas: () =>
    apiClient.get<ApiSuccess<any>>('/empresas'),
  createEmpresa: (data: object) =>
    apiClient.post<ApiSuccess<Empresa>>('/empresas', data),
  updateEmpresa: (id: string, data: object) =>
    apiClient.patch<ApiSuccess<Empresa>>(`/empresas/${id}`, data),
  deleteEmpresa: (id: string) =>
    apiClient.delete<ApiSuccess<any>>(`/empresas/${id}`),

  // Catálogos — lectura
  getProvincias:    () => apiClient.get<ApiSuccess<Provincia[]>>('/provincias'),
  getCiudades:      () => apiClient.get<ApiSuccess<Ciudad[]>>('/ciudades'),
  getMarcas:        () => apiClient.get<ApiSuccess<Marca[]>>('/marcas'),
  getModelos:       () => apiClient.get<ApiSuccess<Modelo[]>>('/modelos'),
  getCategorias:    () => apiClient.get<ApiSuccess<Categoria[]>>('/categorias'),
  getCombustibles:  () => apiClient.get<ApiSuccess<TipoCombustible[]>>('/tipos-combustible'),
  getTransmisiones: () => apiClient.get<ApiSuccess<TipoTransmision[]>>('/tipos-transmision'),
  getExtras:        () => apiClient.get<ApiSuccess<ExtraEquipamiento[]>>('/extras'),
  getSeguros:       () => apiClient.get<ApiSuccess<Seguro[]>>('/seguros'),
  getTarifas:       () => apiClient.get<ApiSuccess<Tarifa[]>>('/tarifas'),
  getCanalesVenta:  () => apiClient.get<ApiSuccess<CanalVenta[]>>('/canales-venta'),

  // Catálogos — escritura
  createMarca:       (data: object) => apiClient.post<ApiSuccess<Marca>>('/marcas', data),
  updateMarca:       (id: string, data: object) => apiClient.patch<ApiSuccess<Marca>>(`/marcas/${id}`, data),
  deleteMarca:       (id: string) => apiClient.delete<ApiSuccess<any>>(`/marcas/${id}`),

  createModelo:      (data: object) => apiClient.post<ApiSuccess<Modelo>>('/modelos', data),
  updateModelo:      (id: string, data: object) => apiClient.patch<ApiSuccess<Modelo>>(`/modelos/${id}`, data),
  deleteModelo:      (id: string) => apiClient.delete<ApiSuccess<any>>(`/modelos/${id}`),

  createCategoria:   (data: object) => apiClient.post<ApiSuccess<Categoria>>('/categorias', data),
  updateCategoria:   (id: string, data: object) => apiClient.patch<ApiSuccess<Categoria>>(`/categorias/${id}`, data),
  deleteCategoria:   (id: string) => apiClient.delete<ApiSuccess<any>>(`/categorias/${id}`),

  createCombustible: (data: object) => apiClient.post<ApiSuccess<TipoCombustible>>('/tipos-combustible', data),
  updateCombustible: (id: string, data: object) => apiClient.patch<ApiSuccess<TipoCombustible>>(`/tipos-combustible/${id}`, data),
  deleteCombustible: (id: string) => apiClient.delete<ApiSuccess<any>>(`/tipos-combustible/${id}`),

  createTransmision: (data: object) => apiClient.post<ApiSuccess<TipoTransmision>>('/tipos-transmision', data),
  updateTransmision: (id: string, data: object) => apiClient.patch<ApiSuccess<TipoTransmision>>(`/tipos-transmision/${id}`, data),
  deleteTransmision: (id: string) => apiClient.delete<ApiSuccess<any>>(`/tipos-transmision/${id}`),

  createExtra:       (data: object) => apiClient.post<ApiSuccess<ExtraEquipamiento>>('/extras', data),
  updateExtra:       (id: string, data: object) => apiClient.patch<ApiSuccess<ExtraEquipamiento>>(`/extras/${id}`, data),
  deleteExtra:       (id: string) => apiClient.delete<ApiSuccess<any>>(`/extras/${id}`),

  createSeguro:      (data: object) => apiClient.post<ApiSuccess<Seguro>>('/seguros', data),
  updateSeguro:      (id: string, data: object) => apiClient.patch<ApiSuccess<Seguro>>(`/seguros/${id}`, data),
  deleteSeguro:      (id: string) => apiClient.delete<ApiSuccess<any>>(`/seguros/${id}`),

  // Mantenimientos
  getMantenimientos: (page = 1, limit = 50) => apiClient.get<ApiSuccess<any>>('/mantenimientos', { page, limit }),

  // Auditoría
  getHistorial:    (page = 1, limit = 50) => apiClient.get<ApiSuccess<any>>('/historial', { page, limit }),
  getKardex:       (page = 1, limit = 50) => apiClient.get<ApiSuccess<any>>('/kardex', { page, limit }),
  getOutboxEvents: (page = 1, limit = 50) => apiClient.get<ApiSuccess<any>>('/outbox-events', { page, limit }),
};

export const pagosService = {
  crear:  (data: object) => apiClient.post<ApiSuccess<any>>('/pagos', data),
  getAll: ()             => apiClient.get<ApiSuccess<any>>('/pagos'),
  getById:(id: string)   => apiClient.get<ApiSuccess<any>>(`/pagos/${id}`),
};

export const facturasService = {
  generar: (data: object) => apiClient.post<ApiSuccess<any>>('/facturas', data),
  getAll:  ()             => apiClient.get<ApiSuccess<any>>('/facturas'),
  getById: (id: string)   => apiClient.get<ApiSuccess<any>>(`/facturas/${id}`),
};

export const alquileresService = {
  iniciar: (data: object) => apiClient.post<ApiSuccess<any>>('/alquileres', data),
  getAll:  ()             => apiClient.get<ApiSuccess<any>>('/alquileres'),
  getById: (id: string)   => apiClient.get<ApiSuccess<any>>(`/alquileres/${id}`),
};

export const devolucionesService = {
  registrar: (data: object) => apiClient.post<ApiSuccess<any>>('/devoluciones', data),
  getAll:    ()             => apiClient.get<ApiSuccess<any>>('/devoluciones'),
  getById:   (id: string)   => apiClient.get<ApiSuccess<any>>(`/devoluciones/${id}`),
};
