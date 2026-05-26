<template>
  <Teleport to="body">
    <div class="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in items"
          :key="t.id"
          class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold pointer-events-auto max-w-xs"
          :class="{
            'bg-emerald-900 border border-emerald-700 text-emerald-200': t.type === 'success',
            'bg-red-900    border border-red-700    text-red-200':     t.type === 'error',
            'bg-zinc-800   border border-zinc-700   text-zinc-200':    t.type === 'info',
          }"
        >
          <CheckCircle2 v-if="t.type === 'success'" class="w-4 h-4 shrink-0 text-emerald-400" />
          <XCircle      v-else-if="t.type === 'error'"   class="w-4 h-4 shrink-0 text-red-400" />
          <Info         v-else                           class="w-4 h-4 shrink-0 text-zinc-400" />
          {{ t.msg }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { CheckCircle2, XCircle, Info } from 'lucide-vue-next';
import { useToast } from '@/composables/useToast';
const { items } = useToast();
</script>

<style scoped>
.toast-enter-active { transition: all 0.25s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(20px); }
.toast-leave-to     { opacity: 0; transform: translateX(20px); }
</style>
