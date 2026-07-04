import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import {
  Camera, Loader2, FileText, Shield, ChevronRight,
  Sparkles, Video, Gift, Settings, LogOut, Bell, BellOff, Coins,
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { BuyCoinsModal } from '@/components/payment/BuyCoinsModal';
import { TiltCard } from '@/components/3d/couture/TiltCard';

// The ONE 3D scene on this view — lazy so three.js only loads here.
// Hero ambient below it is pure CSS (.nightfall-canvas + .grain), per the bible.
const FloatingGem = dynamic(
  () => import('@/components/3d/couture').then((m) => m.FloatingGem),
  { ssr: false }
);

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
  const [showBuyCoins, setShowBuyCoins] = useState(false);
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
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-gold-300/70 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/25 text-[10px] tracking-[0.24em] uppercase">Preparing your room</p>
        </div>
      </Layout>
    );
  }

  const isCreator = user.role === 'CREATOR' || user.role === 'ADMIN';

  return (
    <Layout>
      <Head>
        <title>{user.displayName} - Be With Me</title>
      </Head>

      <div className="max-w-[630px] mx-auto">
        {/* ─── Couture Hero — ink canvas, film grain, floating gem ─── */}
        <div className="relative h-48 nightfall-canvas grain overflow-hidden">
          {/* CSS aurora washes (ambient stays CSS; the gem is the single 3D scene) */}
          <div className="absolute -top-10 -left-12 w-56 h-56 bg-brand-500/[0.12] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-6 right-4 w-48 h-48 bg-violet-deep/[0.14] rounded-full blur-3xl pointer-events-none" />
          {/* Hero gem — rose-gold, decorative only */}
          <div className="absolute top-2 right-3 pointer-events-none" aria-hidden="true">
            <FloatingGem size={130} tone="gold" intensity="subtle" />
          </div>
          {/* Rose-gold hairline at the crest */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-surface-dark to-transparent pointer-events-none" />
        </div>

        {/* ─── Avatar + Info ─── */}
        <div className="px-4 -mt-14 relative z-10">
          <div className="flex items-end gap-4 mb-4">
            {/* Avatar in a rose-gold couture frame */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="relative flex-shrink-0"
            >
              <div className={`w-24 h-24 ${isCreator ? 'ring-creator shadow-gold-sm' : 'rounded-full p-[2px] bg-gradient-to-br from-gold-300/50 via-white/10 to-violet-deep/40'}`}>
                <div className="w-full h-full rounded-full bg-surface-dark overflow-hidden flex items-center justify-center">
                  {avatarUploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-gold-300" />
                  ) : user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="editorial text-3xl text-couture-gold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-brand-500 border-2 border-surface-dark flex items-center justify-center shadow-glow">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </motion.button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" />

            {/* Name + username — the editorial voice */}
            <div className="pb-1 min-w-0 animate-rise opacity-0">
              <h1 className="editorial text-4xl leading-[1.02] text-couture-gold truncate">{user.displayName}</h1>
              <p className="text-white/40 text-sm mt-1">@{user.username}</p>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-white/55 text-sm mb-5 leading-relaxed animate-rise opacity-0" style={{ animationDelay: '80ms' }}>{user.bio}</p>
          )}

          {/* Thread balance + Buy — the private vault */}
          <TiltCard intensity="subtle" className="mb-4">
            <div className="glass-couture gold-hairline flex items-center justify-between px-4 py-3.5 animate-rise opacity-0" style={{ animationDelay: '140ms' }}>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-gold-300/10 border border-gold-300/25 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-gold-300" />
                </span>
                <div>
                  <span className="editorial text-2xl leading-none text-white">{user.threadBalance.toLocaleString()}</span>
                  <span className="text-white/30 text-xs ml-1.5">threads</span>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowBuyCoins(true)}
                className="min-h-[44px] px-5 rounded-full gold-hairline text-gold-300 text-xs font-bold shadow-gold-sm"
              >
                Buy Threads
              </motion.button>
            </div>
          </TiltCard>

          {/* Stats — glass tilt tiles */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <StatTile label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} delay={200} />
            <StatTile label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} delay={260} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEditing(!editing)}
              className="btn-couture-ghost flex-1 min-h-[48px] !px-4 !py-3 text-sm flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Edit Profile
            </motion.button>
            {isCreator ? (
              <Link
                href="/dashboard/go-live"
                className="btn-couture flex-1 min-h-[48px] !px-4 !py-3 text-sm flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                Go Live
              </Link>
            ) : (
              <Link
                href="/become-creator"
                className="btn-couture flex-1 min-h-[48px] !px-4 !py-3 text-sm flex items-center justify-center gap-2"
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
            <form onSubmit={handleSubmit} className="glass-couture p-6 space-y-4">
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
                <label className="block text-[10px] tracking-[0.18em] uppercase text-gold-300/60 mb-2">Display Name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  required
                  className="input-couture"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.18em] uppercase text-gold-300/60 mb-2">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="input-couture resize-none"
                  placeholder="Tell viewers about yourself..."
                />
                <p className="text-xs text-white/25 mt-1 text-right">{form.bio.length}/500</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={saving}
                className="btn-couture w-full min-h-[48px] text-sm text-center disabled:opacity-50"
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
            <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/60 mb-2.5 px-1">Posts</p>
            <div className="grid grid-cols-3 gap-0.5 rounded-4xl overflow-hidden">
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
          <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/60 mb-2.5 px-1">Legal</p>
          <div className="glass-couture overflow-hidden divide-y divide-white/5">
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
              className={`w-full min-h-[56px] flex items-center justify-between px-4 py-3.5 rounded-4xl backdrop-blur-xl transition-colors ${
                pushSubscribed ? 'bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/15' : 'bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                {pushSubscribed ? (
                  <Bell className="w-5 h-5 text-brand-500" />
                ) : (
                  <BellOff className="w-5 h-5 text-white/35" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Push Notifications</p>
                  <p className="text-[10px] text-white/35">
                    {pushSubscribed ? 'Enabled — you\'ll get alerts for likes, comments & more' : 'Get notified when someone interacts with your content'}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${pushSubscribed ? 'bg-brand-500 justify-end' : 'bg-white/15 justify-start'}`}>
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
            className="w-full min-h-[48px] py-3 rounded-full bg-live/10 border border-live/15 text-live text-sm font-semibold flex items-center justify-center gap-2 hover:bg-live/20 transition-colors"
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
                const res = await fetch(`${API_URL}/api/users/me`, {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ confirm: 'DELETE' }),
                });
                if (res.ok) {
                  localStorage.clear();
                  router.push('/');
                } else {
                  const data = await res.json().catch(() => ({}));
                  alert(data?.error?.message || 'Failed to delete account. Please try again.');
                }
              } catch {
                alert('Failed to delete account. Please try again.');
              }
            }}
            className="w-full min-h-[44px] py-3 rounded-full bg-white/[0.02] border border-white/5 text-white/30 text-xs font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors"
          >
            Delete Account
          </motion.button>
        </div>
      </div>
      <BuyCoinsModal
        open={showBuyCoins}
        onClose={() => setShowBuyCoins(false)}
        currentBalance={user?.threadBalance || 0}
        onPurchased={(newBal) => {
          if (user) setUser({ ...user, threadBalance: newBal });
        }}
      />
    </Layout>
  );
}

function StatTile({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <TiltCard intensity="subtle">
      <div
        className="glass-couture !rounded-2xl px-4 py-3 text-center animate-rise opacity-0"
        style={{ animationDelay: `${delay}ms` }}
      >
        <p className="editorial text-white text-lg leading-none">{value}</p>
        <p className="text-gold-300/50 text-[9px] tracking-[0.22em] uppercase mt-1.5">{label}</p>
      </div>
    </TiltCard>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between min-h-[52px] px-4 py-3.5 rounded-4xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] hover:bg-white/[0.07] hover:border-gold-300/20 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm font-medium text-white/80">
        <span className="text-gold-300/70">{icon}</span>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-gold-300/40" />
    </Link>
  );
}

function PolicyLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between min-h-[48px] px-4 py-3 hover:bg-white/5 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm text-white/55">
        <span className="text-white/30">{icon}</span>
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-white/20" />
    </Link>
  );
}
