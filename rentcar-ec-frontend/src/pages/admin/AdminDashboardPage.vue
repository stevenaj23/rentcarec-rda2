<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">Dashboard</h1>
        <p class="text-zinc-500 text-sm mt-1 capitalize">{{ fechaHoy }}</p>
      </div>
      <RouterLink to="/admin/reservas" class="btn-primary text-sm px-4 py-2">
        + Nueva reserva
      </RouterLink>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-24">
      <Loader2 class="w-8 h-8 animate-spin text-orange-500" />
    </div>

    <template v-else>

      <!-- ── KPI Cards ───────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">

        <!-- Flota -->
        <RouterLink to="/admin/vehiculos"
          class="card p-5 hover:border-zinc-700 hover:-translate-y-0.5 transition-all group">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Car class="w-5 h-5 text-orange-400" />
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              {{ pctDisponible }}% libre
            </span>
          </div>
          <p class="text-3xl font-black text-white mt-3">{{ vehiculos.length }}</p>
          <p class="text-xs text-zinc-500 mt-0.5 font-medium">Vehículos en flota</p>
          <p class="text-[11px] text-zinc-600 mt-1.5">
            <span class="text-emerald-400 font-semibold">{{ disponibles }}</span> disponibles ·
            <span class="text-blue-400 font-semibold">{{ enUso }}</span> en uso
          </p>
        </RouterLink>

        <!-- Reservas -->
        <RouterLink to="/admin/reservas"
          class="card p-5 hover:border-zinc-700 hover:-translate-y-0.5 transition-all group">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <BookOpen class="w-5 h-5 text-blue-400" />
            </div>
            <span v-if="reservasActivas > 0"
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
              {{ reservasActivas }} activas
            </span>
          </div>
          <p class="text-3xl font-black text-white mt-3">{{ reservas.length }}</p>
          <p class="text-xs text-zinc-500 mt-0.5 font-medium">Reservas totales</p>
          <p class="text-[11px] text-zinc-600 mt-1.5">
            <span class="text-emerald-400 font-semibold">{{ reservasConfirmadas }}</span> confirmadas ·
            <span class="text-amber-400 font-semibold">{{ reservasPendientes }}</span> pendientes
          </p>
        </RouterLink>

        <!-- Ingresos -->
        <div class="card p-5 col-span-2 lg:col-span-1">
          <div class="flex items-start justify-between">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign class="w-5 h-5 text-emerald-400" />
            </div>
            <span class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Acumulado</span>
          </div>
          <p class="text-3xl font-black text-emerald-400 mt-3">${{ ingresosConfirmados }}</p>
          <p class="text-xs text-zinc-500 mt-0.5 font-medium">Ingresos confirmados</p>
          <p class="text-[11px] text-zinc-600 mt-1.5">
            <span class="text-orange-400 font-semibold">${{ ingresosPotenciales }}</span> potenciales en curso
          </p>
        </div>
      </div>

      <!-- ── Alertas ─────────────────────────────────────────── -->
      <div v-if="alerts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div v-for="a in alerts" :key="a.label"
          class="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" :class="a.cls">
          <component :is="a.icon" class="w-4 h-4 shrink-0" />
          <span class="font-medium">{{ a.label }}</span>
        </div>
      </div>

      <!-- ── Gráficos ────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Donut flota -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white text-sm">Estado de la flota</h2>
            <RouterLink to="/admin/vehiculos" class="text-xs text-orange-400 hover:text-orange-300">Ver flota →</RouterLink>
          </div>
          <div class="flex items-center gap-8">
            <div class="relative shrink-0">
              <svg width="110" height="110" viewBox="0 0 110 110" class="-rotate-90">
                <circle cx="55" cy="55" r="42" fill="none" stroke="#27272a" stroke-width="14" />
                <circle
                  v-for="seg in donutSegments" :key="seg.status"
                  cx="55" cy="55" r="42" fill="none"
                  :stroke="seg.hex" stroke-width="14"
                  :stroke-dasharray="`${seg.dash} ${seg.gap}`"
                  :stroke-dashoffset="-seg.offset"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-black text-white">{{ vehiculos.length }}</span>
                <span class="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">total</span>
              </div>
            </div>
            <div class="space-y-2.5 flex-1">
              <div v-for="s in flotaStats" :key="s.status" class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: s.hex }"></span>
                  <span class="text-xs text-zinc-400">{{ s.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black text-white">{{ s.count }}</span>
                  <span class="text-[10px] text-zinc-600">
                    {{ vehiculos.length ? Math.round((s.count / vehiculos.length) * 100) : 0 }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Reservas por estado -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white text-sm">Reservas por estado</h2>
            <RouterLink to="/admin/reservas" class="text-xs text-orange-400 hover:text-orange-300">Ver todas →</RouterLink>
          </div>
          <div class="space-y-3.5">
            <div v-for="s in reservaStats" :key="s.status" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="s.dot"></span>
                  <span class="text-xs text-zinc-400 font-medium">{{ s.label }}</span>
                </div>
                <span class="text-xs font-black text-white">{{ s.count }}</span>
              </div>
              <div class="bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-1.5 rounded-full transition-all duration-700"
                  :class="s.barColor"
                  :style="{ width: reservas.length ? `${(s.count / reservas.length) * 100}%` : '0%' }"
                />
              </div>
            </div>
          </div>
          <div class="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span class="text-xs text-zinc-500">Tasa de completación</span>
            <span class="text-sm font-black text-white">{{ tasaExito }}%</span>
          </div>
        </div>
      </div>

      <!-- ── Últimas reservas + Acciones rápidas ────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Últimas reservas -->
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 class="font-bold text-white text-sm">Últimas reservas</h2>
            <RouterLink to="/admin/reservas" class="text-xs text-orange-400 hover:text-orange-300 font-medium">Ver todas →</RouterLink>
          </div>
          <div v-if="ultimasReservas.length === 0"
            class="flex items-center justify-center py-12 text-zinc-600 text-sm">
            Sin reservas registradas
          </div>
          <div v-else class="divide-y divide-zinc-800/60">
            <div
              v-for="r in ultimasReservas" :key="r.id"
              class="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
            >
              <div class="min-w-0 flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Car class="w-4 h-4 text-zinc-500" />
                </div>
                <div class="min-w-0">
                  <p class="text-zinc-200 text-xs font-semibold truncate">
                    {{ r.vehiculo?.nombre ?? r.vehiculo?.placa ?? '—' }}
                  </p>
                  <p class="text-zinc-500 text-[10px] truncate">
                    {{ r.usuario?.nombres ?? 'Cliente' }} {{ r.usuario?.apellidos ?? '' }}
                    · <span class="font-mono">{{ r.codigoReserva }}</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2.5 shrink-0">
                <span class="text-xs font-black text-white">${{ Number(r.totalAmount).toFixed(2) }}</span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  :class="STATUS_CLS[r.status as ReservaStatus] ?? 'bg-zinc-800 text-zinc-400'"
                >
                  {{ STATUS_LABEL[r.status as ReservaStatus] ?? r.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones rápidas -->
        <div class="flex flex-col gap-3">
          <h2 class="font-bold text-white text-sm">Acciones rápidas</h2>
          <RouterLink
            v-for="a in quickActions" :key="a.label"
            :to="a.to"
            class="card p-4 flex items-center gap-3 hover:border-zinc-600 hover:-translate-y-0.5 transition-all group"
          >
            <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="a.iconBg">
              <component :is="a.icon" class="w-4 h-4" :class="a.iconColor" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-white group-hover:text-orange-400 transition-colors truncate">{{ a.label }}</p>
              <p class="text-[10px] text-zinc-500 truncate">{{ a.desc }}</p>
            </div>
            <ChevronRight class="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
          </RouterLink>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  Car, BookOpen, DollarSign, Loader2,
  AlertTriangle, Clock, Wrench,
  Users, ChevronRight, FileText, CreditCard, RotateCcw,
} from 'lucide-vue-next';
import { useAdminReservas } from '@/composables/useAdmin';
import { useVehiculos } from '@/composables/useVehiculos';
import type { Reserva, ReservaStatus, Vehiculo } from '@/types/domain';

const { data: reservasRaw, isLoading: lr } = useAdminReservas();
const { data: vehiculosRaw, isLoading: lv } = useVehiculos(1, 500);

const isLoading = computed(() => lr.value || lv.value);

const reservas = computed<Reserva[]>(() =>
  Array.isArray(reservasRaw.value) ? reservasRaw.value as Reserva[] : []
);
const vehiculos = computed<Vehiculo[]>(() => {
  const d = vehiculosRaw.value as any;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.data))       return d.data;
  return [];
});

const fechaHoy = new Date().toLocaleDateString('es-EC', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

// ── Flota ─────────────────────────────────────────────────
const disponibles     = computed(() => vehiculos.value.filter(v => v.status === 'DISPONIBLE').length);
const enUso           = computed(() => vehiculos.value.filter(v => v.status === 'EN_USO').length);
const reservados      = computed(() => vehiculos.value.filter(v => v.status === 'RESERVADO').length);
const enMantenimiento = computed(() => vehiculos.value.filter(v => v.status === 'MANTENIMIENTO').length);
const inactivos       = computed(() => vehiculos.value.filter(v => v.status === 'INACTIVO').length);
const pctDisponible   = computed(() =>
  vehiculos.value.length ? Math.round((disponibles.value / vehiculos.value.length) * 100) : 0
);

// ── Reservas ──────────────────────────────────────────────
const reservasActivas     = computed(() => reservas.value.filter(r => r.status === 'ACTIVA').length);
const reservasConfirmadas = computed(() => reservas.value.filter(r => r.status === 'CONFIRMADA').length);
const reservasPendientes  = computed(() => reservas.value.filter(r => r.status === 'PENDIENTE').length);
const tasaExito = computed(() => {
  const completadas = reservas.value.filter(r => r.status === 'COMPLETADA').length;
  return reservas.value.length ? ((completadas / reservas.value.length) * 100).toFixed(0) : '0';
});

// ── Ingresos ──────────────────────────────────────────────
const ingresosConfirmados = computed(() =>
  reservas.value
    .filter(r => r.status === 'CONFIRMADA' || r.status === 'COMPLETADA')
    .reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)
    .toFixed(2)
);
const ingresosPotenciales = computed(() =>
  reservas.value
    .filter(r => r.status === 'PENDIENTE' || r.status === 'ACTIVA')
    .reduce((s, r) => s + Number(r.totalAmount ?? 0), 0)
    .toFixed(2)
);

// ── Últimas reservas ──────────────────────────────────────
const ultimasReservas = computed(() =>
  [...reservas.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
);

// ── Status maps ───────────────────────────────────────────
const STATUS_LABEL: Record<ReservaStatus, string> = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada',
  ACTIVA: 'Activa', COMPLETADA: 'Completada', CANCELADA: 'Cancelada',
};
const STATUS_CLS: Record<ReservaStatus, string> = {
  PENDIENTE:  'bg-amber-500/20 text-amber-400',
  CONFIRMADA: 'bg-emerald-500/20 text-emerald-400',
  ACTIVA:     'bg-blue-500/20 text-blue-400',
  COMPLETADA: 'bg-zinc-700 text-zinc-400',
  CANCELADA:  'bg-red-500/20 text-red-400',
};

// ── Flota stats + donut ───────────────────────────────────
const flotaStats = computed(() => [
  { status: 'DISPONIBLE',    label: 'Disponible',    hex: '#10b981', count: disponibles.value    },
  { status: 'RESERVADO',     label: 'Reservado',     hex: '#f59e0b', count: reservados.value     },
  { status: 'EN_USO',        label: 'En uso',        hex: '#3b82f6', count: enUso.value           },
  { status: 'MANTENIMIENTO', label: 'Mantenimiento', hex: '#f97316', count: enMantenimiento.value },
  { status: 'INACTIVO',      label: 'Inactivo',      hex: '#ef4444', count: inactivos.value       },
]);

const donutSegments = computed(() => {
  const circumference = 2 * Math.PI * 42;
  const total = vehiculos.value.length || 1;
  let offset = 0;
  return flotaStats.value.map(s => {
    const dash = (s.count / total) * circumference;
    const seg = { ...s, dash, gap: circumference - dash, offset };
    offset += dash;
    return seg;
  });
});

// ── Reservas por estado ───────────────────────────────────
const reservaStats = computed(() => [
  { status: 'PENDIENTE',  label: 'Pendiente',  barColor: 'bg-amber-500',   dot: 'bg-amber-500',   count: reservasPendientes.value },
  { status: 'CONFIRMADA', label: 'Confirmada', barColor: 'bg-emerald-500', dot: 'bg-emerald-500', count: reservasConfirmadas.value },
  { status: 'ACTIVA',     label: 'Activa',     barColor: 'bg-blue-500',    dot: 'bg-blue-500',    count: reservasActivas.value },
  { status: 'COMPLETADA', label: 'Completada', barColor: 'bg-zinc-500',    dot: 'bg-zinc-500',    count: reservas.value.filter(r => r.status === 'COMPLETADA').length },
  { status: 'CANCELADA',  label: 'Cancelada',  barColor: 'bg-red-500',     dot: 'bg-red-500',     count: reservas.value.filter(r => r.status === 'CANCELADA').length },
]);

// ── Alertas ───────────────────────────────────────────────
const alerts = computed(() => {
  const list: { label: string; icon: any; cls: string }[] = [];
  if (reservasPendientes.value > 0)
    list.push({
      icon: Clock,
      label: `${reservasPendientes.value} reserva${reservasPendientes.value > 1 ? 's' : ''} pendiente${reservasPendientes.value > 1 ? 's' : ''} de confirmar`,
      cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    });
  if (enMantenimiento.value > 0)
    list.push({
      icon: Wrench,
      label: `${enMantenimiento.value} vehículo${enMantenimiento.value > 1 ? 's' : ''} en mantenimiento`,
      cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    });
  if (inactivos.value > 0)
    list.push({
      icon: AlertTriangle,
      label: `${inactivos.value} vehículo${inactivos.value > 1 ? 's' : ''} inactivo${inactivos.value > 1 ? 's' : ''}`,
      cls: 'bg-red-500/10 border-red-500/30 text-red-400',
    });
  return list;
});

// ── Acciones rápidas ──────────────────────────────────────
const quickActions = [
  { label: 'Reservas',     desc: 'Ver y gestionar reservas',   to: '/admin/reservas',   icon: BookOpen,   iconBg: 'bg-blue-500/10',    iconColor: 'text-blue-400'    },
  { label: 'Pagos',        desc: 'Registrar un nuevo pago',    to: '/admin/pagos',      icon: CreditCard, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
  { label: 'Alquileres',   desc: 'Iniciar o finalizar uso',    to: '/admin/alquileres', icon: RotateCcw,  iconBg: 'bg-orange-500/10',  iconColor: 'text-orange-400'  },
  { label: 'Usuarios',     desc: 'Administrar clientes',       to: '/admin/users',      icon: Users,      iconBg: 'bg-purple-500/10',  iconColor: 'text-purple-400'  },
  { label: 'Facturas',     desc: 'Generar y consultar',        to: '/admin/facturas',   icon: FileText,   iconBg: 'bg-zinc-700',       iconColor: 'text-zinc-300'    },
];
</script>
