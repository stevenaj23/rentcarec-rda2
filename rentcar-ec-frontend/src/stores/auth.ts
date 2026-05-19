import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Usuario } from '@/types/domain';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Usuario | null>(
    JSON.parse(localStorage.getItem('rentcar_ec_user') ?? 'null')
  );
  const token = ref<string | null>(localStorage.getItem('rentcar_ec_token'));

  const isAuthenticated = computed(() => !!user.value && !!token.value);

  function setAuth(u: Usuario, t: string) {
    localStorage.setItem('rentcar_ec_token', t);
    localStorage.setItem('rentcar_ec_user', JSON.stringify(u));
    user.value = u;
    token.value = t;
  }

  function clearAuth() {
    localStorage.removeItem('rentcar_ec_token');
    localStorage.removeItem('rentcar_ec_user');
    user.value = null;
    token.value = null;
  }

  function isAdmin() {
    return user.value?.role === 'ADMIN';
  }

  function isCliente() {
    return user.value?.role === 'CLIENTE';
  }

  return { user, token, isAuthenticated, setAuth, clearAuth, isAdmin, isCliente };
});
