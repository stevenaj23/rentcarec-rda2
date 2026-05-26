<template>
  <div class="space-y-6">

    <div>
      <h1 class="text-2xl font-black text-white tracking-tight">Dashboard</h1>
      <p class="text-zinc-500 text-sm mt-1">Resumen general del sistema</p>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-24">
      <Loader2 class="w-8 h-8 animate-spin text-orange-500" />
    </div>

    <template v-else>

      <!-- ── Stat cards ─────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RouterLink
          v-for="stat in statCards" :key="stat.label"
          :to="stat.to"
          class="card p-5 hover:border-zinc-700 hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" :class="stat.iconBg">
              <component :is="stat.icon" class="w-4 h-4" :class="stat.iconColor" />
            </div>
            <span class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{{ stat.sub }}</span>
          </div>
          <p class="text-2xl font-black text-white">{{ stat.value }}</p>
          <p class="text-xs text-zinc-500 mt-0.5 font-medium">{{ stat.label }}</p>
        </RouterLink>
      </div>

      <!-- ── Charts row ─────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- Reservas por estado -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white text-sm">Reservas por estado</h2>
            <RouterLink to="/admin/reservas" class="text-xs text-orange-400 hover:text-orange-300">Ver todas →</RouterLink>
          </div>
          <div class="space-y-3">
            <div v-for="s in reservaStats" :key="s.status" class="flex items-center gap-3">
              <span class="text-xs text-zinc-500 w-24 shrink-0 font-medium">{{ s.label }}</span>
              <div class="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-all duration-700"
                  :class="s.barColor"
                  :style="{ width: reservas.length ? `${(s.count / reservas.length) * 100}%` : '0%' }"
                />
              </div>
              <span class="text-xs font-bold text-white w-6 text-right shrink-0">{{ s.count }}</span>
            </div>
            <p v-if="reservas.length === 0" class="text-center text-zinc-600 text-xs py-4">Sin reservas</p>
          </div>
        </div>

        <!-- Estado de la flota -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-5">
            <h2 class="font-bold text-white text-sm">Estado de la flota</h2>
            <RouterLink to="/admin/vehiculos" class="text-xs text-orange-400 hover:text-orange-300">Ver flota →</RouterLink>
          </div>
          <div class="space-y-3">
            <div v-for="s in flotaStats" :key="s.status" class="flex items-center gap-3">
              <span class="text-xs text-zinc-500 w-28 shrink-0 font-medium">{{ s.label }}</span>
              <div class="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  class="h-2 rounded-full transition-all duration-700"
                  :class="s.barColor"
                  :style="{ width: vehiculos.length ? `${(s.count / vehiculos.length) * 100}%` : '0%' }"
                />
              </div>
              <span class="text-xs font-bold text-white w-6 text-right shrink-0">{{ s.count }}</span>
            </div>
            <p v-if="vehiculos.length === 0" class="text-center text-zinc-600 text-xs py-4">Sin vehículos</p>
          </div>
        </div>
      </div>

      <!-- ── Actividad reciente + Resumen financiero ─────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Últimas reservas (2/3) -->
        <div class="lg:col-span-2 card overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 class="font-bold text-white text-sm">Últimas reservas</h2>
            <RouterLink to="/admin/reservas" class="text-xs text-orange-400 hover:text-orange-300 font-medium">Ver todas →</RouterLink>
          </div>
          <div v-if="reservas.length === 0" class="flex items-center justify-center py-12 text-zinc-600 text-sm">
            Sin reservas registradas
          </div>
          <div v-else class="divide-y divide-zinc-800/60">
            <div
              v-for="r in reservas.slice(0, 6)" :key="r.id"
              class="px-5 py-3 flex items-center justify-between text-sm hover:bg-zinc-800/30 transition-colors"
            >
              <div class="min-w-0 flex items-center gap-3">
                <div class="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Car class="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div class="min-w-0">
                  <p class="text-zinc-200 text-xs font-semibold truncate">
                    {{ r.vehiculo?.modelo?.marca?.nombre }} {{ r.vehiculo?.modelo?.nombre }}
                  </p>
                  <p class="text-zinc-600 text-[10px] font-mono truncate">
                    #{{ r.codigoReserva }} · {{ r.usuario?.nombres }} {{ r.usuario?.apellidos }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3 shrink-0 ml-3">
                <span class="font-bold text-white text-xs">${{ Number(r.totalAmount).toFixed(2) }}</span>
                <span class="badge text-[10px]" :class="STATUS_CLS[r.status as ReservaStatus] ?? 'bg-zinc-800 text-zinc-400'">
                  {{ STATUS_LABEL[r.status as ReservaStatus] ?? r.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen financiero (1/3) -->
        <div class="card p-5 flex flex-col gap-4">
          <h2 class="font-bold text-white text-sm">Resumen financiero</h2>

          <div class="space-y-3 flex-1">
            <div class="card-light p-4 text-center">
              <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Ingresos confirmados</p>
              <p class="text-2xl font-black text-emerald-400">${{ ingresos.confirmados }}</p>
            </div>
            <div class="card-light p-4 text-center">
              <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Ingresos potenciales</p>
              <p class="text-xl font-black text-orange-400">${{ ingresos.pendientes }}</p>
              <p class="text-[10px] text-zinc-600 mt-0.5">reservas pendientes/activas</p>
            </div>
            <div class="card-light p-4 text-center">
              <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Tasa de conversión</p>
              <p class="text-xl font-black text-white">{{ ingresos.tasaExito }}%</p>
              <p class="text-[10px] text-zinc-600 mt-0.5">reservas completadas</p>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Car, BookOpen, Users, TrendingUp, Loader2, Wrench } from 'lucide-vue-next';
import { useAdminReservas, useAdminUsers } from '@/composables/useAdmin';
import { useVehiculos } from '@/composables/useVehiculos';
import type { Reserva, ReservaStatus, VehicleStatus, Vehiculo } from '@/types/domain';

const { data: reservasRaw, isLoading: lr } = useAdminReservas();
const { data: usuariosRaw, isLoading: lu } = useAdminUsers();
const { data: vehiculosRaw, isLoading: lv } = useVehiculos(1, 500);

const isLoading = computed(() => lr.value || lu.value || lv.value);

const reservas = computed<Reserva[]>(() =>
  Array.isArray(reservasRaw.value) ? reservasRaw.value as Reserva[] : []
);
const usuarios = computed<unknown[]>(() =>
  Array.isArray(usuariosRaw.value) ? usuariosRaw.value as unknown[] : []
);
const vehiculos = computed<Vehiculo[]>(() => {
  const d = vehiculosRaw.value as any;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  if (Array.isArray(d?.data))       return d.data;
  return [];
});

// ── Status maps ──────────────────────────────────────────
const STATUS_LABEL: Record<ReservaStatus, string> = {
  PENDIENTE:  'Pendiente', CONFIRMADA: 'Confirmada',
  ACTIVA:     'Activa',    COMPLETADA: 'Completada', CANCELADA: 'Cancelada',
};
const STATUS_CLS: Record<ReservaStatus, string> = {
  PENDIENTE:  'bg-amber-500/20  text-amber-400  border border-amber-500/30',
  CONFIRMADA: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  ACTIVA:     'bg-blue-500/20   text-blue-400   border border-blue-500/30',
  COMPLETADA: 'bg-zinc-700      text-zinc-400',
  CANCELADA:  'bg-red-500/20    text-red-400    border border-red-500/30',
};

// ── Reservas por estado ───────────────────────────────────
const reservaStats = computed(() => [
  { status: 'PENDIENTE',  label: 'Pendiente',  barColor: 'bg-amber-500',   count: reservas.value.filter(r => r.status === 'PENDIENTE').length  },
  { status: 'CONFIRMADA', label: 'Confirmada', barColor: 'bg-emerald-500', count: reservas.value.filter(r => r.status === 'CONFIRMADA').length },
  { status: 'ACTIVA',     label: 'Activa',     barColor: 'bg-blue-500',    count: reservas.value.filter(r => r.status === 'ACTIVA').length     },
  { status: 'COMPLETADA', label: 'Completada', barColor: 'bg-zinc-500',    count: reservas.value.filter(r => r.status === 'COMPLETADA').length },
  { status: 'CANCELADA',  label: 'Cancelada',  barColor: 'bg-red-500',     count: reservas.value.filter(r => r.status === 'CANCELADA').length  },
]);

// ── Flota por estado ──────────────────────────────────────
const flotaStats = computed(() => [
  { status: 'DISPONIBLE',    label: 'Disponible',    barColor: 'bg-emerald-500', count: vehiculos.value.filter(v => v.status === 'DISPONIBLE').length    },
  { status: 'RESERVADO',     label: 'Reservado',     barColor: 'bg-amber-500',   count: vehiculos.value.filter(v => v.status === 'RESERVADO').length     },
  { status: 'EN_USO',        label: 'En uso',        barColor: 'bg-blue-500',    count: vehiculos.value.filter(v => v.status === 'EN_USO').length        },
  { status: 'MANTENIMIENTO', label: 'Mantenimiento', barColor: 'bg-orange-500',  count: vehiculos.value.filter(v => v.status === 'MANTENIMIENTO').length },
  { status: 'INACTIVO',      label: 'Inactivo',      barColor: 'bg-red-500',     count: vehiculos.value.filter(v => v.status === 'INACTIVO').length      },
]);

// ── Financiero ────────────────────────────────────────────
const ingresos = computed(() => {
  const confirmados = reservas.value
    .filter(r => r.status === 'CONFIRMADA' || r.status === 'COMPLETADA')
    .reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const pendientes = reservas.value
    .filter(r => r.status === 'PENDIENTE' || r.status === 'ACTIVA')
    .reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const completadas = reservas.value.filter(r => r.status === 'COMPLETADA').length;
  const total       = reservas.value.length;
  return {
    confirmados: confirmados.toFixed(2),
    pendientes:  pendientes.toFixed(2),
    tasaExito:   total ? ((completadas / total) * 100).toFixed(0) : '0',
  };
});

// ── Stat cards ────────────────────────────────────────────
const disponibles = computed(() => vehiculos.value.filter(v => v.status === 'DISPONIBLE').length);

const statCards = computed(() => [
  {
    label: 'Vehículos totales', sub: 'Flota',
    value: vehiculos.value.length,
    icon: Car, iconBg: 'bg-orange-500/10', iconColor: 'text-orange-400',
    to: '/admin/vehiculos',
  },
  {
    label: 'Disponibles ahora', sub: 'Flota libre',
    value: disponibles.value,
    icon: Wrench, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400',
    to: '/admin/vehiculos',
  },
  {
    label: 'Reservas totales', sub: 'Operaciones',
    value: reservas.value.length,
    icon: BookOpen, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400',
    to: '/admin/reservas',
  },
  {
    label: 'Usuarios registrados', sub: 'Clientes',
    value: usuarios.value.length,
    icon: Users, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400',
    to: '/admin/users',
  },
]);
</script>
