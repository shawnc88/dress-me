import { create } from 'zustand';
import { apiFetch, ApiError } from '../utils/api';
import { disconnectSocket } from '../utils/socket';

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
  setToken: (token: string) => void;
  setUser: (user: User) => void;
}

// Keep the localStorage 'user' snapshot in sync with the store. Many
// components still read identity via getStoredUser(); with the store as the
// only writer the snapshot can no longer go stale.
function persistUser(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  } catch {}
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;
    // Seed from the snapshot so identity paints instantly, then refresh from
    // the server in the background.
    let snapshot: User | null = null;
    try {
      snapshot = JSON.parse(localStorage.getItem('user') || 'null');
    } catch {}
    set({ token, user: snapshot ?? get().user });
    get().fetchMe();
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      persistUser(data.user);
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
      persistUser(data.user);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    persistUser(null);
    // Kill the shared socket so the next account can't inherit this one's
    // rooms/listeners on an SPA account switch.
    disconnectSocket();
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      persistUser(data.user);
      set({ user: data.user });
    } catch (e) {
      // Only clear the session on a real auth failure — a network blip or
      // cold backend should not log the user out.
      if (e instanceof ApiError && (e.statusCode === 401 || e.statusCode === 403)) {
        localStorage.removeItem('token');
        persistUser(null);
        set({ user: null, token: null });
      }
    }
  },

  setToken: (token) => {
    if (typeof window !== 'undefined') localStorage.setItem('token', token);
    set({ token });
  },

  setUser: (user) => {
    persistUser(user);
    set({ user });
  },
}));
