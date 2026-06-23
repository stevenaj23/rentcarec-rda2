import { api } from './client';

export interface LoginPayload   { email: string; password: string }
export interface RegisterPayload {
  email: string; password: string;
  nombres: string; apellidos: string; telefono?: string;
}
export interface User {
  id: string; email: string; nombres: string;
  apellidos: string; role: string; telefono?: string;
}

export const authApi = {
  login:        (dto: LoginPayload)    => api.post<{ success: true; data: { user: User; token: string } }>('/auth/login', dto),
  register:     (dto: RegisterPayload) => api.post<{ success: true; data: { user: User; token: string } }>('/auth/register', dto),
  me:           ()                     => api.get<{ success: true; data: User }>('/auth/me'),
  updateMe:     (dto: Partial<User>)   => api.patch<{ success: true; data: User }>('/auth/me', dto),
  refreshToken: ()                     => api.post<{ success: true; data: { token: string } }>('/auth/refresh-token'),
};
