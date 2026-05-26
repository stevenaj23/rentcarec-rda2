<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-black text-white tracking-tight">Catálogos</h1>
      <p class="text-zinc-500 text-sm mt-1">Gestiona los datos base del sistema</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-1 mb-6 overflow-x-auto">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
        :class="activeTab === tab.key
          ? 'bg-orange-500 text-black shadow'
          : 'text-zinc-400 hover:text-white'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Marcas ─────────────────────────────────────── -->
    <div v-if="activeTab === 'marcas'">
      <AdminTable title="Marcas" :data="marcas" :columns="[{ key:'nombre', label:'Nombre' }]"
        :is-loading="ldMarcas" :on-add="() => openModal('marcas')"
        :on-edit="(r) => openModal('marcas', r)" :on-delete="(id) => delMarca.mutate(id)"
        :is-deleting="delMarca.isPending.value" :search-keys="['nombre']">
        <template #cell-nombre="{ row }">
          <div class="flex items-center gap-3">
            <img v-if="row.logoUrl" :src="row.logoUrl" class="w-6 h-6 object-contain rounded" />
            <div v-else class="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center">
              <Tag class="w-3 h-3 text-zinc-600" />
            </div>
            <span class="font-medium text-zinc-200">{{ row.nombre }}</span>
          </div>
        </template>
      </AdminTable>
    </div>

    <!-- ── Modelos ─────────────────────────────────────── -->
    <div v-else-if="activeTab === 'modelos'">
      <AdminTable title="Modelos" :data="modelos"
        :columns="[{ key:'nombre', label:'Modelo' }, { key:'marca', label:'Marca' }]"
        :is-loading="ldModelos" :on-add="() => openModal('modelos')"
        :on-edit="(r) => openModal('modelos', r)" :on-delete="(id) => delModelo.mutate(id)"
        :is-deleting="delModelo.isPending.value" :search-keys="['nombre']">
        <template #cell-nombre="{ row }">
          <span class="font-medium text-zinc-200">{{ row.nombre }}</span>
        </template>
        <template #cell-marca="{ row }">
          <span class="text-zinc-400">{{ row.marca?.nombre ?? '—' }}</span>
        </template>
      </AdminTable>
    </div>

    <!-- ── Categorías ──────────────────────────────────── -->
    <div v-else-if="activeTab === 'categorias'">
      <AdminTable title="Categorías" :data="categorias"
        :columns="[{ key:'nombre', label:'Nombre' }, { key:'descripcion', label:'Descripción' }]"
        :is-loading="ldCategorias" :on-add="() => openModal('categorias')"
        :on-edit="(r) => openModal('categorias', r)" :on-delete="(id) => delCategoria.mutate(id)"
        :is-deleting="delCategoria.isPending.value" :search-keys="['nombre']">
        <template #cell-descripcion="{ row }">
          <span class="text-zinc-500 text-xs">{{ row.descripcion ?? '—' }}</span>
        </template>
      </AdminTable>
    </div>

    <!-- ── Combustibles ────────────────────────────────── -->
    <div v-else-if="activeTab === 'combustibles'">
      <AdminTable title="Tipos de Combustible" :data="combustibles"
        :columns="[{ key:'nombre', label:'Nombre' }]"
        :is-loading="ldCombustibles" :on-add="() => openModal('combustibles')"
        :on-edit="(r) => openModal('combustibles', r)" :on-delete="(id) => delCombustible.mutate(id)"
        :is-deleting="delCombustible.isPending.value" :search-keys="['nombre']" />
    </div>

    <!-- ── Transmisiones ───────────────────────────────── -->
    <div v-else-if="activeTab === 'transmisiones'">
      <AdminTable title="Tipos de Transmisión" :data="transmisiones"
        :columns="[{ key:'nombre', label:'Nombre' }]"
        :is-loading="ldTransmisiones" :on-add="() => openModal('transmisiones')"
        :on-edit="(r) => openModal('transmisiones', r)" :on-delete="(id) => delTransmision.mutate(id)"
        :is-deleting="delTransmision.isPending.value" :search-keys="['nombre']" />
    </div>

    <!-- ── Extras ─────────────────────────────────────── -->
    <div v-else-if="activeTab === 'extras'">
      <AdminTable title="Extras / Equipamiento" :data="extras"
        :columns="[{ key:'nombre', label:'Nombre' }, { key:'descripcion', label:'Descripción' }, { key:'precioDia', label:'Precio/día' }]"
        :is-loading="ldExtras" :on-add="() => openModal('extras')"
        :on-edit="(r) => openModal('extras', r)" :on-delete="(id) => delExtra.mutate(id)"
        :is-deleting="delExtra.isPending.value" :search-keys="['nombre']">
        <template #cell-descripcion="{ row }">
          <span class="text-zinc-500 text-xs">{{ row.descripcion ?? '—' }}</span>
        </template>
        <template #cell-precioDia="{ row }">
          <span class="font-semibold text-orange-400">${{ Number(row.precioDia).toFixed(2) }}</span>
        </template>
      </AdminTable>
    </div>

    <!-- ── Seguros ─────────────────────────────────────── -->
    <div v-else-if="activeTab === 'seguros'">
      <AdminTable title="Seguros" :data="seguros"
        :columns="[{ key:'nombre', label:'Nombre' }, { key:'precioDia', label:'Precio/día' }, { key:'cobertura', label:'Cobertura' }]"
        :is-loading="ldSeguros" :on-add="() => openModal('seguros')"
        :on-edit="(r) => openModal('seguros', r)" :on-delete="(id) => delSeguro.mutate(id)"
        :is-deleting="delSeguro.isPending.value" :search-keys="['nombre']">
        <template #cell-precioDia="{ row }">
          <span class="font-semibold text-orange-400">${{ Number(row.precioDia).toFixed(2) }}</span>
        </template>
        <template #cell-cobertura="{ row }">
          <span class="text-zinc-500 text-xs">{{ row.cobertura ?? '—' }}</span>
        </template>
      </AdminTable>
    </div>

    <!-- Modal unificado -->
    <AdminFormModal
      :title="modalState.id ? `Editar ${tabLabel}` : `Nuevo ${tabLabel}`"
      :open="modalState.open"
      :is-loading="isPending"
      :error="formError"
      @close="closeModal"
      @submit="handleSubmit"
    >
      <!-- Marcas -->
      <template v-if="activeTab === 'marcas'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls" placeholder="Ej: Toyota" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL del logo</label>
          <input v-model="form.logoUrl" :class="iCls" placeholder="https://..." />
        </div>
      </template>

      <!-- Modelos -->
      <template v-else-if="activeTab === 'modelos'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Marca <span class="text-red-500">*</span></label>
          <select v-model="form.marcaId" required :class="iCls">
            <option value="">— Selecciona marca —</option>
            <option v-for="m in marcas" :key="m.id" :value="m.id">{{ m.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del modelo <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls" placeholder="Ej: Corolla" />
        </div>
      </template>

      <!-- Categorías -->
      <template v-else-if="activeTab === 'categorias'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls" placeholder="Ej: SUV, Sedán..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input v-model="form.descripcion" :class="iCls" placeholder="Descripción opcional" />
        </div>
      </template>

      <!-- Combustibles / Transmisiones — solo nombre -->
      <template v-else-if="activeTab === 'combustibles' || activeTab === 'transmisiones'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls"
            :placeholder="activeTab === 'combustibles' ? 'Ej: Gasolina, Diésel...' : 'Ej: Manual, Automática...'" />
        </div>
      </template>

      <!-- Extras -->
      <template v-else-if="activeTab === 'extras'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls" placeholder="Ej: GPS, Silla bebé..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input v-model="form.descripcion" :class="iCls" placeholder="Descripción opcional" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Precio por día ($) <span class="text-red-500">*</span></label>
          <input v-model.number="form.precioDia" type="number" min="0" step="0.01" required :class="iCls" />
        </div>
      </template>

      <!-- Seguros -->
      <template v-else-if="activeTab === 'seguros'">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
          <input v-model="form.nombre" required :class="iCls" placeholder="Ej: Seguro básico..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Precio por día ($) <span class="text-red-500">*</span></label>
          <input v-model.number="form.precioDia" type="number" min="0" step="0.01" required :class="iCls" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Cobertura</label>
          <input v-model="form.cobertura" :class="iCls" placeholder="Descripción de cobertura..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input v-model="form.descripcion" :class="iCls" placeholder="Descripción opcional" />
        </div>
      </template>
    </AdminFormModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Tag } from 'lucide-vue-next';
import AdminTable from '@/components/admin/AdminTable.vue';
import AdminFormModal from '@/components/admin/AdminFormModal.vue';
import {
  useAdminMarcas, useCreateMarca, useUpdateMarca, useDeleteMarca,
  useAdminModelos, useCreateModelo, useUpdateModelo, useDeleteModelo,
  useAdminCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria,
  useAdminCombustibles, useCreateCombustible, useUpdateCombustible, useDeleteCombustible,
  useAdminTransmisiones, useCreateTransmision, useUpdateTransmision, useDeleteTransmision,
  useAdminExtras, useCreateExtra, useUpdateExtra, useDeleteExtra,
  useAdminSeguros, useCreateSeguro, useUpdateSeguro, useDeleteSeguro,
} from '@/composables/useAdmin';

const iCls = 'input-base';

type TabKey = 'marcas' | 'modelos' | 'categorias' | 'combustibles' | 'transmisiones' | 'extras' | 'seguros';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'marcas',        label: 'Marcas'        },
  { key: 'modelos',       label: 'Modelos'       },
  { key: 'categorias',    label: 'Categorías'    },
  { key: 'combustibles',  label: 'Combustibles'  },
  { key: 'transmisiones', label: 'Transmisiones' },
  { key: 'extras',        label: 'Extras'        },
  { key: 'seguros',       label: 'Seguros'       },
];

const activeTab = ref<TabKey>('marcas');

const tabLabel = computed(() => TABS.find(t => t.key === activeTab.value)?.label ?? '');

// Queries
const { data: dMarcas,        isLoading: ldMarcas        } = useAdminMarcas();
const { data: dModelos,       isLoading: ldModelos       } = useAdminModelos();
const { data: dCategorias,    isLoading: ldCategorias    } = useAdminCategorias();
const { data: dCombustibles,  isLoading: ldCombustibles  } = useAdminCombustibles();
const { data: dTransmisiones, isLoading: ldTransmisiones } = useAdminTransmisiones();
const { data: dExtras,        isLoading: ldExtras        } = useAdminExtras();
const { data: dSeguros,       isLoading: ldSeguros       } = useAdminSeguros();

function toArr(d: unknown): any[] {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  const inner = (d as any)?.data;
  if (Array.isArray(inner)) return inner;
  return [];
}

const marcas        = computed(() => toArr(dMarcas.value));
const modelos       = computed(() => toArr(dModelos.value));
const categorias    = computed(() => toArr(dCategorias.value));
const combustibles  = computed(() => toArr(dCombustibles.value));
const transmisiones = computed(() => toArr(dTransmisiones.value));
const extras        = computed(() => toArr(dExtras.value));
const seguros       = computed(() => toArr(dSeguros.value));

// Mutations
const createMarca    = useCreateMarca();    const updateMarca    = useUpdateMarca();    const delMarca    = useDeleteMarca();
const createModelo   = useCreateModelo();   const updateModelo   = useUpdateModelo();   const delModelo   = useDeleteModelo();
const createCategoria = useCreateCategoria(); const updateCategoria = useUpdateCategoria(); const delCategoria = useDeleteCategoria();
const createCombustible = useCreateCombustible(); const updateCombustible = useUpdateCombustible(); const delCombustible = useDeleteCombustible();
const createTransmision = useCreateTransmision(); const updateTransmision = useUpdateTransmision(); const delTransmision = useDeleteTransmision();
const createExtra    = useCreateExtra();    const updateExtra    = useUpdateExtra();    const delExtra    = useDeleteExtra();
const createSeguro   = useCreateSeguro();   const updateSeguro   = useUpdateSeguro();   const delSeguro   = useDeleteSeguro();

const isPending = computed(() => [
  createMarca, updateMarca, createModelo, updateModelo,
  createCategoria, updateCategoria, createCombustible, updateCombustible,
  createTransmision, updateTransmision, createExtra, updateExtra,
  createSeguro, updateSeguro,
].some(m => m.isPending.value));

// Modal
const modalState = reactive({ open: false, id: '' });
const formError  = ref<string | null>(null);
const form       = reactive<Record<string, any>>({});

function openModal(tab: TabKey, row?: any) {
  activeTab.value = tab;
  formError.value = null;
  modalState.id   = row?.id ?? '';
  Object.assign(form, {
    nombre:      row?.nombre      ?? '',
    logoUrl:     row?.logoUrl     ?? '',
    descripcion: row?.descripcion ?? '',
    marcaId:     row?.marca?.id   ?? row?.marcaId ?? '',
    precioDia:   row?.precioDia   ?? 0,
    cobertura:   row?.cobertura   ?? '',
  });
  modalState.open = true;
}

function closeModal() {
  modalState.open = false;
  formError.value = null;
}

async function handleSubmit() {
  formError.value = null;
  if (!form.nombre?.trim()) { formError.value = 'El nombre es requerido'; return; }

  try {
    const id = modalState.id;

    if (activeTab.value === 'marcas') {
      const body: any = { nombre: form.nombre };
      if (form.logoUrl) body.logoUrl = form.logoUrl;
      id ? await updateMarca.mutateAsync({ id, ...body }) : await createMarca.mutateAsync(body);
    } else if (activeTab.value === 'modelos') {
      if (!form.marcaId) { formError.value = 'La marca es requerida'; return; }
      const body = { nombre: form.nombre, marcaId: form.marcaId };
      id ? await updateModelo.mutateAsync({ id, ...body }) : await createModelo.mutateAsync(body);
    } else if (activeTab.value === 'categorias') {
      const body: any = { nombre: form.nombre };
      if (form.descripcion) body.descripcion = form.descripcion;
      id ? await updateCategoria.mutateAsync({ id, ...body }) : await createCategoria.mutateAsync(body);
    } else if (activeTab.value === 'combustibles') {
      id ? await updateCombustible.mutateAsync({ id, nombre: form.nombre }) : await createCombustible.mutateAsync({ nombre: form.nombre });
    } else if (activeTab.value === 'transmisiones') {
      id ? await updateTransmision.mutateAsync({ id, nombre: form.nombre }) : await createTransmision.mutateAsync({ nombre: form.nombre });
    } else if (activeTab.value === 'extras') {
      if (!form.precioDia && form.precioDia !== 0) { formError.value = 'El precio es requerido'; return; }
      const body: any = { nombre: form.nombre, precioDia: Number(form.precioDia) };
      if (form.descripcion) body.descripcion = form.descripcion;
      id ? await updateExtra.mutateAsync({ id, ...body }) : await createExtra.mutateAsync(body);
    } else if (activeTab.value === 'seguros') {
      if (!form.precioDia && form.precioDia !== 0) { formError.value = 'El precio es requerido'; return; }
      const body: any = { nombre: form.nombre, precioDia: Number(form.precioDia) };
      if (form.cobertura)   body.cobertura   = form.cobertura;
      if (form.descripcion) body.descripcion = form.descripcion;
      id ? await updateSeguro.mutateAsync({ id, ...body }) : await createSeguro.mutateAsync(body);
    }

    closeModal();
  } catch (err: unknown) {
    formError.value = (err as { message?: string }).message ?? 'Error al guardar';
  }
}
</script>
