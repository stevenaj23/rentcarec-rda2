import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { useToast } from './useToast';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

function getToken() {
  return localStorage.getItem('rentcar_ec_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

function extractData(response: unknown) {
  const r = response as Record<string, unknown>;
  const inner = (r?.data as Record<string, unknown>)?.data;
  if (inner !== undefined) return inner;
  if (r?.data !== undefined) return r.data;
  if (Array.isArray(response)) return response;
  return response;
}

function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('rentcar_ec_token');
    localStorage.removeItem('rentcar_ec_user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
}

async function adminGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  handleUnauthorized(res);
  if (!res.ok) throw new Error(`Error al cargar ${path}`);
  const json = await res.json();
  return extractData(json);
}

async function adminPost(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err?.error as Record<string, unknown>)?.message as string || 'Error al crear');
  }
  return res.json();
}

async function adminPatch(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err?.error as Record<string, unknown>)?.message as string || 'Error al actualizar');
  }
  return res.json();
}

async function adminDelete(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  handleUnauthorized(res);
  if (!res.ok) throw new Error('Error al eliminar');
  return res.json();
}

// Dashboard
export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/vehiculos?limit=1`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Error al cargar dashboard');
      const json = await res.json() as Record<string, unknown>;
      const d = json?.data as Record<string, unknown>;
      return { totalVehiculos: (d?.total as number) ?? 0 };
    },
  });
}

// Usuarios
export function useAdminUsers() {
  return useQuery({ queryKey: ['admin-usuarios'], queryFn: () => adminGet('/usuarios') });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/usuarios/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); show('Usuario actualizado'); },
  });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/usuarios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-usuarios'] }); show('Usuario eliminado'); },
  });
}

// Agencias
export function useAdminAgencias() {
  return useQuery({ queryKey: ['admin-agencias'], queryFn: () => adminGet('/agencias') });
}
export function useCreateAgencia() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/agencias', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-agencias'] }); show('Agencia creada'); },
  });
}
export function useUpdateAgencia() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/agencias/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-agencias'] }); show('Agencia actualizada'); },
  });
}
export function useDeleteAgencia() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/agencias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-agencias'] }); show('Agencia eliminada'); },
  });
}

// Ciudades
export function useCiudades() {
  return useQuery({ queryKey: ['ciudades'], queryFn: () => adminGet('/ciudades') });
}

// Empresas
export function useAdminEmpresas() {
  return useQuery({ queryKey: ['admin-empresas'], queryFn: () => adminGet('/empresas') });
}
export function useCreateEmpresa() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/empresas', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); show('Empresa creada'); },
  });
}
export function useUpdateEmpresa() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/empresas/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); show('Empresa actualizada'); },
  });
}
export function useDeleteEmpresa() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/empresas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-empresas'] }); show('Empresa eliminada'); },
  });
}

// Reservas admin
export function useAdminReservas() {
  return useQuery({ queryKey: ['admin-reservas'], queryFn: () => adminGet('/reservas') });
}
export function useAdminUpdateReservaStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminPatch(`/reservas/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reservas'] }),
  });
}

// Alquileres
export function useAdminAlquileres() {
  return useQuery({ queryKey: ['admin-alquileres'], queryFn: () => adminGet('/alquileres') });
}
export function useIniciarAlquiler() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/alquileres', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-alquileres'] });
      qc.invalidateQueries({ queryKey: ['admin-reservas'] });
      show('Alquiler iniciado');
    },
  });
}
export function useRegistrarDevolucion() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/devoluciones', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-alquileres'] });
      qc.invalidateQueries({ queryKey: ['admin-reservas'] });
      show('Devolución registrada');
    },
  });
}

// Pagos
export function useAdminPagos() {
  return useQuery({ queryKey: ['admin-pagos'], queryFn: () => adminGet('/pagos') });
}
export function useCrearPago() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/pagos', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pagos'] });
      qc.invalidateQueries({ queryKey: ['admin-reservas'] });
      show('Pago registrado');
    },
  });
}

// Facturas
export function useAdminFacturas() {
  return useQuery({ queryKey: ['admin-facturas'], queryFn: () => adminGet('/facturas') });
}
export function useGenerarFactura() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/facturas', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-facturas'] });
      show('Factura generada');
    },
  });
}

// Devoluciones
export function useAdminDevoluciones() {
  return useQuery({ queryKey: ['admin-devoluciones'], queryFn: () => adminGet('/devoluciones') });
}

// Historial
export function useAdminHistorial() {
  return useQuery({ queryKey: ['admin-historial'], queryFn: () => adminGet('/historial') });
}

// Kardex
export function useAdminKardex() {
  return useQuery({ queryKey: ['admin-kardex'], queryFn: () => adminGet('/kardex') });
}

// Mantenimientos
export function useAdminMantenimientos() {
  return useQuery({ queryKey: ['admin-mantenimientos'], queryFn: () => adminGet('/mantenimientos') });
}
export function useCrearMantenimiento() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/mantenimientos', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-mantenimientos'] }); show('Mantenimiento creado'); },
  });
}
export function useUpdateMantenimiento() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/mantenimientos/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-mantenimientos'] }); show('Mantenimiento actualizado'); },
  });
}
export function useDeleteMantenimiento() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/mantenimientos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-mantenimientos'] }); show('Mantenimiento eliminado'); },
  });
}

// Marcas
export function useAdminMarcas() {
  return useQuery({ queryKey: ['admin-marcas'], queryFn: () => adminGet('/marcas') });
}
export function useCreateMarca() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/marcas', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-marcas'] }); show('Marca creada'); },
  });
}
export function useUpdateMarca() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/marcas/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-marcas'] }); show('Marca actualizada'); },
  });
}
export function useDeleteMarca() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/marcas/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-marcas'] }); show('Marca eliminada'); },
  });
}

// Modelos
export function useAdminModelos() {
  return useQuery({ queryKey: ['admin-modelos'], queryFn: () => adminGet('/modelos') });
}
export function useCreateModelo() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/modelos', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modelos'] }); show('Modelo creado'); },
  });
}
export function useUpdateModelo() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/modelos/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modelos'] }); show('Modelo actualizado'); },
  });
}
export function useDeleteModelo() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/modelos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-modelos'] }); show('Modelo eliminado'); },
  });
}

// Categorías
export function useAdminCategorias() {
  return useQuery({ queryKey: ['admin-categorias'], queryFn: () => adminGet('/categorias') });
}
export function useCreateCategoria() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/categorias', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categorias'] }); show('Categoría creada'); },
  });
}
export function useUpdateCategoria() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/categorias/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categorias'] }); show('Categoría actualizada'); },
  });
}
export function useDeleteCategoria() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/categorias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categorias'] }); show('Categoría eliminada'); },
  });
}

// Combustibles
export function useAdminCombustibles() {
  return useQuery({ queryKey: ['admin-combustibles'], queryFn: () => adminGet('/tipos-combustible') });
}
export function useCreateCombustible() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/tipos-combustible', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-combustibles'] }); show('Combustible creado'); },
  });
}
export function useUpdateCombustible() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/tipos-combustible/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-combustibles'] }); show('Combustible actualizado'); },
  });
}
export function useDeleteCombustible() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/tipos-combustible/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-combustibles'] }); show('Combustible eliminado'); },
  });
}

// Transmisiones
export function useAdminTransmisiones() {
  return useQuery({ queryKey: ['admin-transmisiones'], queryFn: () => adminGet('/tipos-transmision') });
}
export function useCreateTransmision() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/tipos-transmision', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-transmisiones'] }); show('Transmisión creada'); },
  });
}
export function useUpdateTransmision() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/tipos-transmision/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-transmisiones'] }); show('Transmisión actualizada'); },
  });
}
export function useDeleteTransmision() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/tipos-transmision/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-transmisiones'] }); show('Transmisión eliminada'); },
  });
}

// Extras
export function useAdminExtras() {
  return useQuery({ queryKey: ['admin-extras'], queryFn: () => adminGet('/extras') });
}
export function useCreateExtra() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/extras', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-extras'] }); show('Extra creado'); },
  });
}
export function useUpdateExtra() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/extras/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-extras'] }); show('Extra actualizado'); },
  });
}
export function useDeleteExtra() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/extras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-extras'] }); show('Extra eliminado'); },
  });
}

// Seguros
export function useAdminSeguros() {
  return useQuery({ queryKey: ['admin-seguros'], queryFn: () => adminGet('/seguros') });
}
export function useCreateSeguro() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (body: unknown) => adminPost('/seguros', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-seguros'] }); show('Seguro creado'); },
  });
}
export function useUpdateSeguro() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) =>
      adminPatch(`/seguros/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-seguros'] }); show('Seguro actualizado'); },
  });
}
export function useDeleteSeguro() {
  const qc = useQueryClient();
  const { show } = useToast();
  return useMutation({
    mutationFn: (id: string) => adminDelete(`/seguros/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-seguros'] }); show('Seguro eliminado'); },
  });
}
