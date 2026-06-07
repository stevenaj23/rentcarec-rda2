<template>
  <div>
    <div v-if="statusError" class="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
      <span class="flex-1">{{ statusError }}</span>
      <button @click="statusError = null" class="text-red-400 hover:text-red-200 text-lg leading-none">&times;</button>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <select v-model="filterStatus" class="input-base text-sm py-2 px-3 w-auto">
        <option value="">Todos los estados</option>
        <option v-for="[val, { label }] in Object.entries(STATUS_MAP)" :key="val" :value="val">{{ label }}</option>
      </select>
      <div class="flex items-center gap-2">
        <input v-model="filterDesde" type="date" class="input-base text-sm py-2 px-3 w-auto" title="Desde" />
        <span class="text-zinc-600 text-xs">—</span>
        <input v-model="filterHasta" type="date" class="input-base text-sm py-2 px-3 w-auto" title="Hasta" />
      </div>
      <button
        v-if="filterStatus || filterDesde || filterHasta"
        @click="filterStatus = ''; filterDesde = ''; filterHasta = ''"
        class="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
      >
        <X class="w-3 h-3" /> Limpiar filtros
      </button>
    </div>

    <AdminTable
      title="Reservas"
      :data="reservasFiltradas"
      :columns="columns"
      :is-loading="isLoading"
      :on-view="openDetail"
      :search-keys="['codigoReserva', 'clienteNombre', 'placa']"
    >
      <template #cell-codigoReserva="{ row }">
        <span class="font-mono text-xs text-zinc-400">{{ row.codigoReserva ?? row.id.slice(0, 8) }}</span>
      </template>
      <template #cell-vehiculo="{ row }">
        <div>
          <p class="text-zinc-200 font-medium text-sm">{{ row.vehiculo?.nombre ?? '—' }}</p>
          <p class="text-xs text-zinc-500 font-mono">{{ row.vehiculo?.placa }}</p>
        </div>
      </template>
      <template #cell-usuario="{ row }">
        <div>
          <p class="text-zinc-200 text-sm">{{ row.usuario ? `${row.usuario.nombres} ${row.usuario.apellidos}` : '—' }}</p>
          <p class="text-xs text-zinc-500">{{ row.usuario?.email }}</p>
        </div>
      </template>
      <template #cell-fechas="{ row }">
        <div class="text-xs text-zinc-400">
          <p>{{ fmtDate(row.fechaInicio) }}</p>
          <p>{{ fmtDate(row.fechaFin) }}</p>
        </div>
      </template>
      <template #cell-totalAmount="{ row }">
        <span class="font-bold text-white">${{ Number(row.totalAmount).toFixed(2) }}</span>
      </template>
      <template #cell-status="{ row }">
        <select
          :value="row.status"
          @change="confirmStatusChange(row.id, row.status, ($event.target as HTMLSelectElement).value, $event.target as HTMLSelectElement)"
          @click.stop
          class="badge border-0 cursor-pointer focus:outline-none bg-transparent"
          :class="STATUS_MAP[row.status as ReservaStatus]?.cls ?? 'bg-zinc-800 text-zinc-400'"
        >
          <option v-for="[val, { label }] in Object.entries(STATUS_MAP)" :key="val" :value="val">{{ label }}</option>
        </select>
      </template>
    </AdminTable>

    <!-- Modal de detalle -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detail" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="detail = null">
          <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div class="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800 shrink-0">
              <div>
                <h2 class="text-base font-bold text-white">Detalle de reserva</h2>
                <p class="text-xs font-mono text-zinc-500 mt-0.5">#{{ detail.codigoReserva }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="badge" :class="STATUS_MAP[detail.status as ReservaStatus]?.cls">
                  {{ STATUS_MAP[detail.status as ReservaStatus]?.label ?? detail.status }}
                </span>
                <button @click="detail = null" class="text-zinc-500 hover:text-white p-1.5 hover:bg-zinc-800 rounded-lg transition-all">
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5 custom-scrollbar">

              <!-- Vehículo -->
              <section>
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Vehículo</p>
                <div class="card-light p-4 flex items-center gap-3">
                  <div class="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Car class="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p class="font-bold text-white text-sm">{{ detail.vehiculo?.nombre ?? '—' }}</p>
                    <p class="text-xs text-zinc-500">
                      {{ detail.vehiculo?.placa }}
                      <template v-if="detail.vehiculo?.precio_dia"> · ${{ Number(detail.vehiculo?.precio_dia).toFixed(2) }}/día</template>
                    </p>
                  </div>
                </div>
              </section>

              <!-- Cliente -->
              <section>
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Cliente</p>
                <div class="card-light p-4">
                  <p class="font-semibold text-white text-sm">{{ detail.usuario?.nombres }} {{ detail.usuario?.apellidos }}</p>
                  <p class="text-xs text-zinc-500 mt-0.5">{{ detail.usuario?.email }}</p>
                </div>
              </section>

              <!-- Agencia -->
              <section v-if="detail.agencia">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Agencia de recogida</p>
                <div class="card-light p-4 flex items-center gap-2">
                  <MapPin class="w-4 h-4 text-zinc-500 shrink-0" />
                  <div>
                    <p class="text-sm font-semibold text-white">{{ detail.agencia.nombre }}</p>
                    <p class="text-xs text-zinc-500">{{ detail.agencia.ciudad?.nombre }} — {{ detail.agencia.direccion }}</p>
                  </div>
                </div>
              </section>

              <!-- Fechas -->
              <section>
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Período</p>
                <div class="grid grid-cols-3 gap-2">
                  <div class="card-light p-3 text-center">
                    <p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Inicio</p>
                    <p class="text-sm font-bold text-white">{{ fmtDate(detail.fechaInicio) }}</p>
                  </div>
                  <div class="card-light p-3 text-center">
                    <p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Fin</p>
                    <p class="text-sm font-bold text-white">{{ fmtDate(detail.fechaFin) }}</p>
                  </div>
                  <div class="card-light p-3 text-center">
                    <p class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Días</p>
                    <p class="text-sm font-bold text-orange-400">{{ detail.diasTotal }}d</p>
                  </div>
                </div>
              </section>

              <!-- Seguro -->
              <section v-if="detail.seguro">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Seguro</p>
                <div class="flex items-center gap-2">
                  <span class="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {{ detail.seguro.nombre }}
                  </span>
                  <span class="text-xs text-zinc-500">${{ Number(detail.seguro.precioDia).toFixed(2) }}/día</span>
                </div>
              </section>

              <!-- Extras -->
              <section v-if="detail.extras?.length">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Extras</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="re in detail.extras" :key="re.id"
                    class="badge bg-zinc-800 text-zinc-300 border border-zinc-700"
                  >{{ re.extra?.nombre }} ×{{ re.cantidad }}</span>
                </div>
              </section>

              <!-- Precios -->
              <section>
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Desglose</p>
                <div class="card-light p-4 space-y-2 text-sm">
                  <div class="flex justify-between text-zinc-400">
                    <span>Tarifa base</span><span>${{ Number(detail.precioBase).toFixed(2) }}</span>
                  </div>
                  <div v-if="Number(detail.precioSeguro) > 0" class="flex justify-between text-zinc-400">
                    <span>Seguro</span><span>${{ Number(detail.precioSeguro).toFixed(2) }}</span>
                  </div>
                  <div v-if="Number(detail.precioExtras) > 0" class="flex justify-between text-zinc-400">
                    <span>Extras</span><span>${{ Number(detail.precioExtras).toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between font-black text-white border-t border-zinc-700 pt-2 mt-1">
                    <span>Total</span><span class="text-orange-400">${{ Number(detail.totalAmount).toFixed(2) }}</span>
                  </div>
                </div>
              </section>

              <!-- Pagos -->
              <section v-if="detail.pagos?.length">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Pagos</p>
                <div class="space-y-2">
                  <div v-for="p in detail.pagos" :key="p.id" class="card-light px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <span class="text-zinc-300 font-medium">{{ p.metodoPago?.replace(/_/g, ' ') }}</span>
                      <span v-if="p.referencia" class="text-zinc-500 text-xs ml-2">· {{ p.referencia }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white">${{ Number(p.monto).toFixed(2) }}</span>
                      <span class="badge text-[10px]" :class="PAGO_STATUS[p.status] ?? 'bg-zinc-800 text-zinc-400'">{{ p.status }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Facturas -->
              <section v-if="detail.facturas?.length">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Facturas</p>
                <div v-for="f in detail.facturas" :key="f.id" class="card-light px-4 py-3 flex items-center justify-between text-sm">
                  <span class="font-mono text-xs text-emerald-400">{{ f.numeroFactura }}</span>
                  <span class="font-bold text-white">${{ Number(f.total).toFixed(2) }}</span>
                </div>
              </section>

              <!-- Notas -->
              <section v-if="detail.notas">
                <p class="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-2">Notas</p>
                <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-200">
                  {{ detail.notas }}
                </div>
              </section>

            </div>

            <div class="px-6 py-4 border-t border-zinc-800 shrink-0">
              <button @click="detail = null" class="w-full btn-outline py-2.5 text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { X, Car, MapPin } from 'lucide-vue-next';
import AdminTable from '@/components/admin/AdminTable.vue';
import { useAdminReservas, useAdminUpdateReservaStatus } from '@/composables/useAdmin';
import type { Reserva, ReservaStatus } from '@/types/domain';

const STATUS_MAP: Record<ReservaStatus, { label: string; cls: string }> = {
  PENDIENTE:  { label: 'Pendiente',  cls: 'bg-amber-500/20  text-amber-400  border border-amber-500/30'   },
  CONFIRMADA: { label: 'Confirmada', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  ACTIVA:     { label: 'Activa',     cls: 'bg-blue-500/20   text-blue-400   border border-blue-500/30'    },
  COMPLETADA: { label: 'Completada', cls: 'bg-zinc-700      text-zinc-400'                                },
  CANCELADA:  { label: 'Cancelada',  cls: 'bg-red-500/20    text-red-400    border border-red-500/30'     },
};

const PAGO_STATUS: Record<string, string> = {
  PENDIENTE:   'bg-amber-500/20  text-amber-400',
  COMPLETADO:  'bg-emerald-500/20 text-emerald-400',
  FALLIDO:     'bg-red-500/20    text-red-400',
  REEMBOLSADO: 'bg-zinc-700      text-zinc-400',
};

type ReservaRow = Reserva & { clienteNombre?: string; placa?: string };

const columns = [
  { key: 'codigoReserva', label: 'Código'   },
  { key: 'vehiculo',      label: 'Vehículo', sortable: false },
  { key: 'usuario',       label: 'Cliente',  sortable: false },
  { key: 'fechas',        label: 'Fechas',   sortable: false },
  { key: 'totalAmount',   label: 'Total'    },
  { key: 'status',        label: 'Estado'   },
];

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

const { data, isLoading } = useAdminReservas();
const updateStatus = useAdminUpdateReservaStatus();
const statusError  = ref<string | null>(null);
const detail       = ref<Reserva | null>(null);
const filterStatus = ref('');
const filterDesde  = ref('');
const filterHasta  = ref('');

const reservas = computed<ReservaRow[]>(() => {
  const arr = Array.isArray(data.value) ? data.value as Reserva[] : [];
  return arr.map(r => ({
    ...r,
    clienteNombre: `${r.usuario?.nombres ?? ''} ${r.usuario?.apellidos ?? ''}`.trim(),
    placa: r.vehiculo?.placa ?? '',
  }));
});

const reservasFiltradas = computed(() => {
  return reservas.value
    .filter(r => {
      if (filterStatus.value && r.status !== filterStatus.value) return false;
      if (filterDesde.value && r.fechaInicio < filterDesde.value) return false;
      if (filterHasta.value && r.fechaFin   > filterHasta.value) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

function openDetail(row: ReservaRow) { detail.value = row; }

async function handleStatusChange(id: string, status: string) {
  statusError.value = null;
  try { await updateStatus.mutateAsync({ id, status }); }
  catch (err: unknown) {
    statusError.value = (err as { message?: string }).message ?? 'Error al actualizar estado';
  }
}

function confirmStatusChange(id: string, currentStatus: string, newStatus: string, selectEl: HTMLSelectElement) {
  if (newStatus === currentStatus) return;
  const label = STATUS_MAP[newStatus as ReservaStatus]?.label ?? newStatus;
  const ok = window.confirm(`¿Cambiar estado a "${label}"?`);
  if (!ok) {
    selectEl.value = currentStatus;
    return;
  }
  handleStatusChange(id, newStatus);
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
