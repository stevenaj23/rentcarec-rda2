import { GraphQLError } from 'graphql';

export interface Context {
  token: string;
}

const AUTH_URL        = process.env['AUTH_SERVICE_URL']        ?? 'http://auth-service:3001';
const INVENTARIO_URL  = process.env['INVENTARIO_SERVICE_URL']  ?? 'http://inventario-service:3002';
const ORG_URL         = process.env['ORG_SERVICE_URL']         ?? 'http://org-service:3003';
const OPERACIONES_URL = process.env['OPERACIONES_SERVICE_URL'] ?? 'http://operaciones-service:3004';
const FINANCIERO_URL  = process.env['FINANCIERO_SERVICE_URL']  ?? 'http://financiero-service:3005';

const BASE = '/api/v1/stevenariel';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) } });
  } catch {
    throw new GraphQLError('No se pudo conectar con el servicio', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (json as any)?.error?.message ?? (json as any)?.message ?? `HTTP ${res.status}`;
    throw new GraphQLError(msg, { extensions: { code: res.status === 401 ? 'UNAUTHENTICATED' : 'BAD_REQUEST', http: { status: res.status } } });
  }

  return json;
}

function extractList(json: unknown): unknown[] {
  const j = json as any;
  if (Array.isArray(j?.data?.data)) return j.data.data;
  if (Array.isArray(j?.data))       return j.data;
  if (Array.isArray(j))             return j;
  return [];
}

function extractPaginated(json: unknown): { data: unknown[]; total: number; page: number; limit: number; totalPages: number } {
  const j = json as any;
  if (j?.data?.data !== undefined) {
    return {
      data:       Array.isArray(j.data.data) ? j.data.data : [],
      total:      j.data.total      ?? 0,
      page:       j.data.page       ?? 1,
      limit:      j.data.limit      ?? 20,
      totalPages: j.data.totalPages ?? 1,
    };
  }
  const list = extractList(json);
  return { data: list, total: list.length, page: 1, limit: list.length, totalPages: 1 };
}

function extractOne(json: unknown): unknown {
  const j = json as any;
  if (j?.data && typeof j.data === 'object' && !Array.isArray(j.data) && j.data.data === undefined) return j.data;
  if (j?.data?.data && !Array.isArray(j.data.data)) return j.data.data;
  return j?.data ?? j;
}

function authHeader(token: string): Record<string, string> {
  return token ? { Authorization: token } : {};
}

// ── Resolvers ────────────────────────────────────────────────────────────────

export const resolvers = {
  Query: {
    // ── Vehículos ─────────────────────────────────────────────────────────────
    async vehiculos(_: unknown, args: { page?: number; limit?: number; status?: string }) {
      const params = new URLSearchParams();
      if (args.page)   params.set('page',   String(args.page));
      if (args.limit)  params.set('limit',  String(args.limit));
      if (args.status) params.set('status', args.status);
      const qs = params.toString() ? `?${params}` : '';
      const json = await apiFetch(`${INVENTARIO_URL}${BASE}/vehiculos${qs}`);
      return extractPaginated(json);
    },

    async vehiculo(_: unknown, args: { id: string }) {
      const json = await apiFetch(`${INVENTARIO_URL}${BASE}/vehiculos/${args.id}`);
      return extractOne(json);
    },

    // ── Reservas ──────────────────────────────────────────────────────────────
    async reservas(_: unknown, args: { page?: number; limit?: number; status?: string }, ctx: Context) {
      const params = new URLSearchParams();
      if (args.page)   params.set('page',   String(args.page));
      if (args.limit)  params.set('limit',  String(args.limit ?? 200));
      if (args.status) params.set('status', args.status);
      const qs = params.toString() ? `?${params}` : '?limit=200';
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas${qs}`, { headers: authHeader(ctx.token) });
      return extractList(json);
    },

    async reserva(_: unknown, args: { id: string }, ctx: Context) {
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas/${args.id}`, { headers: authHeader(ctx.token) });
      return extractOne(json);
    },

    async misReservas(_: unknown, __: unknown, ctx: Context) {
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas/my`, { headers: authHeader(ctx.token) });
      return extractList(json);
    },

    // ── Financiero ────────────────────────────────────────────────────────────
    async pagosPorReserva(_: unknown, args: { reservaId: string }, ctx: Context) {
      const json = await apiFetch(`${FINANCIERO_URL}${BASE}/pagos?reservaId=${args.reservaId}`, { headers: authHeader(ctx.token) });
      return extractList(json);
    },

    async facturasPorReserva(_: unknown, args: { reservaId: string }, ctx: Context) {
      const json = await apiFetch(`${FINANCIERO_URL}${BASE}/facturas?reservaId=${args.reservaId}`, { headers: authHeader(ctx.token) });
      return extractList(json);
    },

    // ── Org ───────────────────────────────────────────────────────────────────
    async agencias() {
      const json = await apiFetch(`${ORG_URL}${BASE}/agencias`);
      return extractList(json);
    },

    async empresas() {
      const json = await apiFetch(`${ORG_URL}${BASE}/empresas`);
      return extractList(json);
    },
  },

  Mutation: {
    // ── Auth ──────────────────────────────────────────────────────────────────
    async login(_: unknown, args: { email: string; password: string }) {
      const json = await apiFetch(`${AUTH_URL}${BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: args.email, password: args.password }),
      });
      return extractOne(json);
    },

    async register(_: unknown, args: { input: Record<string, unknown> }) {
      const json = await apiFetch(`${AUTH_URL}${BASE}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(args.input),
      });
      return extractOne(json);
    },

    // ── Reservas ──────────────────────────────────────────────────────────────
    async crearReserva(_: unknown, args: { input: Record<string, unknown> }, ctx: Context) {
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas`, {
        method: 'POST',
        headers: authHeader(ctx.token),
        body: JSON.stringify(args.input),
      });
      return extractOne(json);
    },

    async cancelarReserva(_: unknown, args: { id: string }, ctx: Context) {
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas/${args.id}/cancelar`, {
        method: 'PATCH',
        headers: authHeader(ctx.token),
      });
      return extractOne(json);
    },

    async actualizarEstadoReserva(_: unknown, args: { id: string; status: string }, ctx: Context) {
      const json = await apiFetch(`${OPERACIONES_URL}${BASE}/reservas/${args.id}`, {
        method: 'PATCH',
        headers: authHeader(ctx.token),
        body: JSON.stringify({ status: args.status }),
      });
      return extractOne(json);
    },

    // ── Financiero ────────────────────────────────────────────────────────────
    async registrarPago(_: unknown, args: { input: Record<string, unknown> }, ctx: Context) {
      const json = await apiFetch(`${FINANCIERO_URL}${BASE}/pagos`, {
        method: 'POST',
        headers: authHeader(ctx.token),
        body: JSON.stringify(args.input),
      });
      return extractOne(json);
    },

    async generarFactura(_: unknown, args: { input: Record<string, unknown> }, ctx: Context) {
      const json = await apiFetch(`${FINANCIERO_URL}${BASE}/facturas`, {
        method: 'POST',
        headers: authHeader(ctx.token),
        body: JSON.stringify(args.input),
      });
      return extractOne(json);
    },
  },
};
