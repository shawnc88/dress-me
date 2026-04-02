import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Shield, ChevronLeft, Search, UserCog, Trash2, Crown, Eye, Star } from 'lucide-react';
import { apiFetch } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  isVerified: boolean;
  threadBalance: number;
  createdAt: string;
  _count: { posts: number; sentGifts: number; chatMessages: number };
}

const ROLES = ['VIEWER', 'CREATOR', 'MODERATOR', 'ADMIN'] as const;

const roleStyles: Record<string, { color: string; bg: string }> = {
  VIEWER: { color: 'text-gray-400', bg: 'bg-gray-500/10' },
  CREATOR: { color: 'text-brand-500', bg: 'bg-brand-500/10' },
  MODERATOR: { color: 'text-green-400', bg: 'bg-green-500/10' },
  ADMIN: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
};

export default function AdminUsers() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await apiFetch<{ users: AdminUser[] }>(`/api/admin/users?${params}`);
      setUsers(data.users);
    } catch {
      router.replace('/');
    }
    setLoading(false);
  }, [search, roleFilter, router]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR') {
      router.replace('/');
      return;
    }
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [currentUser, fetchUsers, search, router]);

  async function changeRole(userId: string, newRole: string) {
    setActionLoading(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {}
    setActionLoading(null);
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {}
    setActionLoading(null);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <>
      <Head><title>Users - Admin - Dress Me</title></Head>
      <div className="min-h-screen bg-surface-dark">
        {/* Header */}
        <div className="sticky top-0 z-50 glass-nav">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
            <Link href="/admin" className="p-1.5 rounded-xl hover:bg-glass transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
            <Shield className="w-5 h-5 text-brand-500" />
            <h1 className="font-bold text-white">User Management</h1>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Search + Filter */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, name, or email..."
                className="w-full bg-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white/5 rounded-xl px-3 py-2.5 text-sm text-white border-none focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No users found</p>
          ) : (
            <div className="space-y-3">
              {users.map((u, i) => {
                const style = roleStyles[u.role] || roleStyles.VIEWER;
                const isCurrentUser = u.id === currentUser?.id;
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-surface-card rounded-2xl border border-white/5 p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-brand-500/10">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-brand-400">
                            {u.displayName.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">{u.displayName}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${style.bg} ${style.color}`}>
                            {u.role}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[9px] text-gray-600">(you)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">@{u.username} &middot; {u.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                          <span>Joined {formatDate(u.createdAt)}</span>
                          <span>{u.threadBalance} threads</span>
                          <span>{u._count.posts} posts</span>
                          <span>{u._count.chatMessages} msgs</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Role selector */}
                          <select
                            value={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            disabled={actionLoading === u.id}
                            className="bg-white/5 rounded-lg px-2 py-1.5 text-xs text-white border-none focus:outline-none focus:ring-1 focus:ring-brand-500/50 disabled:opacity-50"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>

                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => deleteUser(u.id, u.username)}
                              disabled={actionLoading === u.id}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
