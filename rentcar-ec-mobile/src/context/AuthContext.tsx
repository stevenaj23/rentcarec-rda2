import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, User } from '../api/auth.api';
import { clearToken, getToken, saveToken } from '../api/client';

interface AuthState {
  user:    User | null;
  token:   string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    // Restaurar sesión al arrancar
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const { data } = await authApi.me();
          setState({ user: data.data, token, loading: false });
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      } catch {
        await clearToken();
        setState({ user: null, token: null, loading: false });
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    await saveToken(data.data.token);
    setState({ user: data.data.user, token: data.data.token, loading: false });
  };

  const logout = async () => {
    await clearToken();
    setState({ user: null, token: null, loading: false });
  };

  const setUser = (user: User) => setState((s) => ({ ...s, user }));

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
