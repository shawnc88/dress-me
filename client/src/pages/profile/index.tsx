import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import {
  Camera, Save, Loader2, FileText, Shield, ChevronRight,
  Sparkles, Video, Gift, Users, Settings, LogOut, Bell, BellOff,
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserProfile {
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

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '' });
  const [posts, setPosts] = useState<any[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        setForm({ displayName: data.user.displayName, bio: data.user.bio || '' });
        // Fetch user's posts
        return fetch(`${API_URL}/api/posts?limit=30`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
      })
      .then((res) => res && res.ok ? res.json() : { posts: [] })
      .then((data) => setPosts(data.posts || []))
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || f.size > 5 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('avatar', f);
      const res = await fetch(`${API_URL}/api/users/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.avatarUrl = data.user.avatarUrl;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }
    } catch {} finally {
      setAvatarUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setUser(data.user);
      setMessage('Profile updated!');
      setEditing(false);
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  if (loading || !user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const isCreator = user.role === 'CREATOR' || user.role === 'ADMIN';

  return (
    <Layout>
      <Head>
        <title>{user.displayName} - Dress Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto">
        {/* ─── Hero Banner ─── */}
        <div className="relative h-32 bg-gradient-to-br from-brand-900 via-violet-deep/40 to-charcoal overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,79,163,0.15),transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-dark to-transparent" />
        </div>

        {/* ─── Avatar + Info ─── */}
        <div className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4 mb-4">
            {/* Avatar with glow ring */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative flex-shrink-0"
            >
              <div className={`w-24 h-24 rounded-full p-[3px] ${isCreator ? 'gradient-premium' : 'bg-white/20'}`}>
                <div className="w-full h-full rounded-full bg-surface-dark overflow-hidden flex items-center justify-center">
                  {avatarUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  ) : user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-brand-400">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-brand-500 border-2 border-surface-dark flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </motion.button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />

            {/* Name + username */}
            <div className="pb-1 min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{user.displayName}</h1>
              <p className="text-gray-500 text-sm">@{user.username}</p>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">{user.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-6 mb-6">
            <StatItem label="Threads" value={user.threadBalance.toLocaleString()} />
            <StatItem label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} />
            <StatItem label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(!editing)}
              className="flex-1 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </motion.button>
            {isCreator ? (
              <Link
                href="/dashboard/go-live"
                className="flex-1 py-2.5 rounded-2xl gradient-premium text-white text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <Video className="w-4 h-4" />
                Go Live
              </Link>
            ) : (
              <Link
                href="/become-creator"
                className="flex-1 py-2.5 rounded-2xl gradient-premium text-white text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Become Creator
              </Link>
            )}
          </div>
        </div>

        {/* ─── Edit Form (collapsible) ─── */}
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 mb-6"
          >
            <form onSubmit={handleSubmit} className="card-glass p-6 space-y-4">
              {message && (
                <div className={`px-4 py-3 rounded-2xl text-sm ${
                  message.includes('Failed')
                    ? 'bg-live/10 text-live'
                    : 'bg-green-500/10 text-green-400'
                }`}>
                  {message}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="input-field resize-none"
                  placeholder="Tell viewers about yourself..."
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{form.bio.length}/500</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={saving}
                className="btn-primary w-full text-center disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* ─── Menu Items ─── */}
        <div className="px-4 space-y-2 mb-6">
          {isCreator && (
            <>
              <MenuItem href="/dashboard" icon={<Video className="w-5 h-5" />} label="Creator Dashboard" />
              <MenuItem href="/dashboard/analytics" icon={<Sparkles className="w-5 h-5" />} label="Analytics" />
            </>
          )}
          <MenuItem href="/giveaways" icon={<Gift className="w-5 h-5" />} label="Giveaways" />
        </div>

        {/* ─── Content Grid ─── */}
        {posts.length > 0 && (
          <div className="px-4 mb-6">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">Posts</p>
            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden">
              {posts.filter((p: any) => p.userId === user.id).map((post: any) => (
                <div key={post.id} className="aspect-square bg-charcoal overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt=""
                    className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Legal ─── */}
        <div className="px-4 mb-6">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">Legal</p>
          <div className="card-glass overflow-hidden divide-y divide-white/5">
            <PolicyLink href="/terms" icon={<FileText className="w-4 h-4" />} label="Terms of Service" />
            <PolicyLink href="/privacy" icon={<Shield className="w-4 h-4" />} label="Privacy Policy" />
            <PolicyLink href="/safety" icon={<Shield className="w-4 h-4" />} label="Content Policy" />
            <PolicyLink href="/giveaway-rules" icon={<FileText className="w-4 h-4" />} label="Giveaway Rules" />
          </div>
        </div>

        {/* ─── Push Notifications ─── */}
        {pushSupported && (
          <div className="px-4 mb-6">
            <button
              onClick={() => pushSubscribed ? pushUnsubscribe() : pushSubscribe()}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors ${
                pushSubscribed ? 'bg-brand-500/10 hover:bg-brand-500/20' : 'bg-white/5 hover:bg-white/8'
              }`}
            >
              <div className="flex items-center gap-3">
                {pushSubscribed ? (
                  <Bell className="w-5 h-5 text-brand-500" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-500" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Push Notifications</p>
                  <p className="text-[10px] text-gray-500">
                    {pushSubscribed ? 'Enabled — you\'ll get alerts for likes, comments & more' : 'Get notified when someone interacts with your content'}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${pushSubscribed ? 'bg-brand-500 justify-end' : 'bg-gray-700 justify-start'}`}>
                <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </div>
            </button>
          </div>
        )}

        {/* ─── Account Actions ─── */}
        <div className="px-4 mb-8 space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="w-full py-3 rounded-2xl bg-live/10 text-live text-sm font-semibold flex items-center justify-center gap-2 hover:bg-live/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={async () => {
              if (!confirm('Are you sure you want to delete your account? This action cannot be undone. All your data, posts, and history will be permanently removed.')) return;
              if (!confirm('This is your final confirmation. Delete account permanently?')) return;
              const token = localStorage.getItem('token');
              if (!token) return;
              try {
                const res = await fetch(`${API_URL}/api/moderation/account`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                  localStorage.clear();
                  router.push('/');
                } else {
                  alert('Failed to delete account. Please try again.');
                }
              } catch {
                alert('Failed to delete account. Please try again.');
              }
            }}
            className="w-full py-3 rounded-2xl bg-white/3 border border-white/5 text-gray-600 text-xs font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            Delete Account
          </motion.button>
        </div>
      </div>
    </Layout>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-white font-bold text-base">{value}</p>
      <p className="text-gray-600 text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-gray-300">
        <span className="text-gray-500">{icon}</span>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-600" />
    </Link>
  );
}

function PolicyLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm text-gray-400">
        <span className="text-gray-600">{icon}</span>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-700" />
    </Link>
  );
}
