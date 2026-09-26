// Single reader for the localStorage user snapshot (written at login/signup/
// onboard/profile-edit). authStore hydrates in _app now; this stays as the
// synchronous fallback for first paint. Returns null on the server or if absent.
export interface StoredUser {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
  threadBalance?: number;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}
