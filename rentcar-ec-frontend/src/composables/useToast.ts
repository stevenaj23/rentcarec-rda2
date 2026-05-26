import { reactive } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

interface Toast { id: number; msg: string; type: ToastType; }

const _state = reactive<{ items: Toast[] }>({ items: [] });
let _id = 0;

export function useToast() {
  function show(msg: string, type: ToastType = 'success', ms = 3200) {
    const id = _id++;
    _state.items.push({ id, msg, type });
    setTimeout(() => {
      const i = _state.items.findIndex(t => t.id === id);
      if (i !== -1) _state.items.splice(i, 1);
    }, ms);
  }

  return { items: _state.items, show };
}
