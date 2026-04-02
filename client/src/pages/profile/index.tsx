import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Camera, Save } from 'lucide-react';

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
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ displayName: '', bio: '' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        setForm({ displayName: data.user.displayName, bio: data.user.bio || '' });
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to update');

      const data = await res.json();
      setUser(data.user);
      setMessage('Profile updated!');
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-gray-400">Loading profile...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Profile - Dress Me</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-display text-3xl font-bold mb-8">Your Profile</h1>

        <div className="card p-8">
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-2xl font-bold text-brand-600">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                <Camera className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-lg">{user.displayName}</p>
              <p className="text-gray-500">@{user.username}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                {message}
              </div>
            )}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Tell viewers about yourself..."
              />
              <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Role</p>
                <p className="text-sm font-medium capitalize">{user.role.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Threads</p>
                <p className="text-sm font-medium">{user.threadBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Joined</p>
                <p className="text-sm font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full text-center disabled:opacity-50"
            >
              {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2 inline" />Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
