import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY      = 'rentcar_token';
const SERVER_URL_KEY = 'rentcar_server_url';
const DEFAULT_BASE   = 'https://rentcar-gateway.ambitiousglacier-2be69817.canadacentral.azurecontainerapps.io/api/v1';

export const api = axios.create({
  baseURL: DEFAULT_BASE,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function loadSavedServerUrl(): Promise<void> {
  const saved = await SecureStore.getItemAsync(SERVER_URL_KEY);
  if (saved) api.defaults.baseURL = saved;
}

export async function saveServerUrl(url: string): Promise<void> {
  const clean = url.replace(/\/+$/, '');
  await SecureStore.setItemAsync(SERVER_URL_KEY, clean);
  api.defaults.baseURL = clean;
}

export function getCurrentServerUrl(): string {
  return api.defaults.baseURL as string;
}

// ── Interceptor de request: adjunta el JWT ─────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor de response: reintenta una vez con refresh si 401 ──────────
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) throw error;

        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const newToken: string = data.data.token;
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export const saveToken  = (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const getToken   = ()          => SecureStore.getItemAsync(TOKEN_KEY);
export const clearToken = ()          => SecureStore.deleteItemAsync(TOKEN_KEY);
