<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-black text-white tracking-tight">{{ title }}</h1>
      <button v-if="onAdd" @click="onAdd" class="btn-primary flex items-center gap-2 text-sm">
        <Plus class="w-4 h-4" /> Agregar
      </button>
    </div>

    <!-- Search -->
    <div v-if="searchKeys && searchKeys.length > 0" class="relative mb-4">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
      <input v-model="search" placeholder="Buscar..." class="input-base pl-10" />
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <Loader2 class="w-7 h-7 animate-spin text-orange-500" />
      </div>
      <div v-else-if="filtered.length === 0" class="text-center py-20 text-zinc-500 text-sm">
        Sin registros
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-zinc-800">
            <tr>
              <th
                v-for="col in columns" :key="col.key"
                class="text-left px-5 py-3.5 font-semibold text-zinc-400 text-xs uppercase tracking-widest"
              >{{ col.label }}</th>
              <th v-if="onEdit || onDelete || onView" class="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800/60">
            <tr
              v-for="row in paged" :key="row.id"
              class="hover:bg-zinc-800/40 transition-colors group"
              :class="onRowClick ? 'cursor-pointer' : ''"
              @click="onRowClick?.(row)"
            >
              <td v-for="col in columns" :key="col.key" class="px-5 py-3.5 text-zinc-300">
                <slot :name="`cell-${col.key}`" :row="row">
                  {{ (row as Record<string, unknown>)[col.key] ?? '—' }}
                </slot>
              </td>
              <td v-if="onEdit || onDelete || onView" class="px-5 py-3.5">
                <div class="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    v-if="onView"
                    @click.stop="onView(row)"
                    class="text-zinc-500 hover:text-blue-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg"
                    title="Ver detalle"
                  ><Eye class="w-4 h-4" /></button>
                  <button
                    v-if="onEdit"
                    @click.stop="onEdit(row)"
                    class="text-zinc-500 hover:text-orange-400 transition-colors p-1.5 hover:bg-zinc-800 rounded-lg"
                    title="Editar"
                  ><Pencil class="w-4 h-4" /></button>
                  <template v-if="onDelete">
                    <template v-if="pendingDeleteId === row.id">
                      <button
                        @click.stop="props.onDelete!(row.id); pendingDeleteId = null"
                        :disabled="isDeleting"
                        class="text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 px-2 py-1 rounded-lg disabled:opacity-30 transition-colors whitespace-nowrap"
                      >¿Confirmar?</button>
                      <button
                        @click.stop="pendingDeleteId = null"
                        class="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                      ><X class="w-4 h-4" /></button>
                    </template>
                    <button
                      v-else
                      @click.stop="pendingDeleteId = row.id"
                      :disabled="isDeleting"
                      class="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-30 p-1.5 hover:bg-zinc-800 rounded-lg"
                      title="Eliminar"
                    ><Trash2 class="w-4 h-4" /></button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!isLoading && totalPages > 1"
        class="flex items-center justify-between px-5 py-3 border-t border-zinc-800"
      >
        <span class="text-xs text-zinc-500">
          {{ (currentPage - 1) * pageSize + 1 }}–{{ Math.min(currentPage * pageSize, filtered.length) }}
          de {{ filtered.length }}
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          ><ChevronLeft class="w-4 h-4" /></button>
          <span class="text-xs text-zinc-400 px-2 font-medium">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          ><ChevronRight class="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends { id: string }">
import { ref, computed, watch } from 'vue';
import { Plus, Pencil, Trash2, Loader2, Search, X, Eye, ChevronLeft, ChevronRight } from 'lucide-vue-next';

interface Column { key: string; label: string; }

const props = defineProps<{
  title: string;
  data: T[] | undefined;
  columns: Column[];
  isLoading: boolean;
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  onView?: (row: T) => void;
  onRowClick?: (row: T) => void;
  isDeleting?: boolean;
  searchKeys?: string[];
  pageSize?: number;
}>();

const PAGE_SIZE = computed(() => props.pageSize ?? 15);

const search          = ref('');
const currentPage     = ref(1);
const pendingDeleteId = ref<string | null>(null);

const filtered = computed(() => {
  const items = props.data ?? [];
  if (!search.value || !props.searchKeys?.length) return items;
  return items.filter((row) =>
    props.searchKeys!.some((k) =>
      String((row as Record<string, unknown>)[k] ?? '').toLowerCase().includes(search.value.toLowerCase())
    )
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE.value)));

const paged = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE.value;
  return filtered.value.slice(start, start + PAGE_SIZE.value);
});

watch(search, () => { currentPage.value = 1; });
watch(() => props.data, () => { currentPage.value = 1; });
</script>
