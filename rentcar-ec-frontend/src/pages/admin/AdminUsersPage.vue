<template>
  <div>
    <AdminTable
      title="Usuarios"
      :data="usuarios"
      :columns="columns"
      :is-loading="isLoading"
      :on-add="openCreate"
      :on-edit="openEdit"
      :on-delete="(id) => del.mutate(id)"
      :is-deleting="del.isPending.value"
      :search-keys="['email', 'nombres', 'apellidos']"
    >
      <template #cell-nombres="{ row }">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
            <span class="text-xs font-bold text-orange-400">{{ row.nombres?.charAt(0)?.toUpperCase() }}</span>
          </div>
          <span class="font-medium text-zinc-200">{{ row.nombres }} {{ row.apellidos }}</span>
        </div>
      </template>
      <template #cell-email="{ row }">
        <span class="text-zinc-400 text-sm">{{ row.email }}</span>
      </template>
      <template #cell-role="{ row }">
        <span class="badge" :class="ROLE_CLS[row.role as UserRole] ?? 'bg-zinc-800 text-zinc-400'">
          {{ row.role }}
        </span>
      </template>
      <template #cell-isActive="{ row }">
        <span class="badge" :class="row.isActive
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-red-500/20    text-red-400    border border-red-500/30'">
          {{ row.isActive ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
    </AdminTable>

    <AdminFormModal
      :title="modal.id ? 'Editar Usuario' : 'Nuevo Usuario'"
      :open="modal.open"
      :is-loading="isPending"
      :error="formError"
      @close="close"
      @submit="handleSubmit"
    >
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email <span class="text-red-500">*</span></label>
        <input v-model="modal.row.email" type="email" required :class="iCls" placeholder="usuario@email.com" />
      </div>

      <!-- Contraseña solo en modo creación -->
      <template v-if="!modal.id">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña <span class="text-red-500">*</span></label>
          <input v-model="modal.row.password" type="password" required :class="iCls" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
        </div>
      </template>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombres <span class="text-red-500">*</span></label>
          <input v-model="modal.row.nombres" required :class="iCls" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Apellidos <span class="text-red-500">*</span></label>
          <input v-model="modal.row.apellidos" required :class="iCls" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input v-model="modal.row.telefono" placeholder="+593 99 000 0000" :class="iCls" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Rol <span class="text-red-500">*</span></label>
        <select v-model="modal.row.role" :class="iCls">
          <option value="CLIENTE">CLIENTE</option>
          <option value="OPERADOR">OPERADOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <label v-if="modal.id" class="flex items-center gap-2 cursor-pointer">
        <input v-model="modal.row.isActive" type="checkbox" class="w-4 h-4 rounded" />
        <span class="text-sm text-gray-700">Usuario activo</span>
      </label>
    </AdminFormModal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import AdminTable from '@/components/admin/AdminTable.vue';
import AdminFormModal from '@/components/admin/AdminFormModal.vue';
import { useAdminUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/composables/useAdmin';
import type { Usuario, UserRole } from '@/types/domain';
import * as V from '@/utils/validators';

const iCls = 'input-base';

const ROLE_CLS: Record<UserRole, string> = {
  ADMIN:    'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  OPERADOR: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  CLIENTE:  'bg-blue-500/20   text-blue-400   border border-blue-500/30',
};

const columns = [
  { key: 'nombres',  label: 'Nombre'  },
  { key: 'email',    label: 'Email'   },
  { key: 'role',     label: 'Rol'     },
  { key: 'isActive', label: 'Estado'  },
];

const { data, isLoading } = useAdminUsers();
const create = useCreateUser();
const update = useUpdateUser();
const del    = useDeleteUser();

const isPending = computed(() => create.isPending.value || update.isPending.value);
const usuarios  = computed<Usuario[]>(() => Array.isArray(data.value) ? data.value as Usuario[] : []);

function makeEmpty(row?: Usuario) {
  return {
    email:    row?.email    ?? '',
    password: '',
    nombres:  row?.nombres  ?? '',
    apellidos:row?.apellidos?? '',
    telefono: row?.telefono ?? '',
    role:    (row?.role     ?? 'CLIENTE') as UserRole,
    isActive: row?.isActive ?? true,
  };
}

const modal     = reactive({ open: false, id: '', row: makeEmpty() });
const formError = ref<string | null>(null);

function openCreate() { formError.value = null; Object.assign(modal, { open: true, id: '', row: makeEmpty() }); }
function openEdit(row: Usuario) { formError.value = null; Object.assign(modal, { open: true, id: row.id, row: makeEmpty(row) }); }
function close() { formError.value = null; Object.assign(modal, { open: false, id: '', row: makeEmpty() }); }

function validate(): string {
  const r = modal.row;
  const checks = [
    V.email(r.email),
    !modal.id ? V.password(r.password) : '',
    V.soloLetras(r.nombres,   'Nombres'),
    V.soloLetras(r.apellidos, 'Apellidos'),
    V.telefonoOpc(r.telefono),
  ];
  return checks.find(e => !!e) ?? '';
}

async function handleSubmit() {
  formError.value = null;
  const err = validate();
  if (err) { formError.value = err; return; }
  try {
    if (modal.id) {
      const { password: _, ...body } = modal.row;
      await update.mutateAsync({ id: modal.id, ...body });
    } else {
      await create.mutateAsync({ ...modal.row });
    }
    close();
  } catch (err: unknown) {
    formError.value = (err as { message?: string }).message ?? 'Error al guardar usuario';
  }
}
</script>
