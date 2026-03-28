import { create } from 'zustand';
import { apiFetch } from '../utils/api';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  threadBalance: number;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (token) {
      set({ token });
      get().fetchMe();
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      set({ user: data.user });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },
}));
