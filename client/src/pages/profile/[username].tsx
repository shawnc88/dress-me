import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { UserPlus, UserCheck, Radio, Film, Grid3X3, Loader2, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  createdAt: string;
  creatorProfile: { id: string; category: string; isLive: boolean } | null;
}

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [reels, setReels] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [tab, setTab] = useState<'reels' | 'posts'>('reels');

  useEffect(() => {
    if (!username) return;

    // Check if viewing own profile
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const me = JSON.parse(stored);
        if (me.username === username) {
          router.replace('/profile');
          return;
        }
      } catch {}
    }

    setLoading(true);
    setError('');

    // Fetch user profile
    fetch(`${API_URL}/api/users/profile/${username}`)
      .then(r => {
        if (!r.ok) throw new Error('User not found');
        return r.json();
      })
      .then(data => {
        setUser(data.user);

        // Fetch follow status + follower count
        if (data.user.creatorProfile) {
          const token = localStorage.getItem('token');
          if (token) {
            fetch(`${API_URL}/api/feed/following`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(r => r.ok ? r.json() : null)
              .then(d => {
                if (d?.following?.includes(data.user.creatorProfile.id)) {
                  setFollowing(true);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username, router]);

  async function handleFollow() {
    if (!user?.creatorProfile) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }

    setFollowing(prev => !prev);
    setFollowerCount(c => following ? c - 1 : c + 1);

    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId: user.creatorProfile.id }),
    }).catch(() => {
      setFollowing(prev => !prev);
      setFollowerCount(c => following ? c + 1 : c - 1);
    });
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !user) {
    return (
      <Layout>
        <Head><title>User Not Found - Dress Me</title></Head>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-white text-lg font-bold mb-2">User not found</h2>
          <p className="text-white/40 text-sm mb-6">This account may not exist or has been removed</p>
          <button onClick={() => router.back()} className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm font-medium flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </Layout>
    );
  }

  const isCreator = user.role === 'CREATOR' || user.role === 'ADMIN';

  return (
    <Layout>
      <Head><title>{user.displayName} (@{user.username}) - Dress Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-6">
        {/* Profile header */}
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ${
            user.creatorProfile?.isLive ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-surface-dark' : ''
          }`}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400">
                {user.displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-white text-lg font-bold truncate">@{user.username}</h1>
              {user.creatorProfile?.isLive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">LIVE</span>
              )}
            </div>
            <p className="text-white/60 text-sm mb-3">{user.displayName}</p>

            <div className="flex items-center gap-6 mb-3">
              <div className="text-center">
                <p className="text-white font-bold text-base">{followerCount}</p>
                <p className="text-white/40 text-[10px]">Followers</p>
              </div>
              {isCreator && (
                <div className="text-center">
                  <p className="text-white/40 text-xs font-medium px-2 py-0.5 rounded-full bg-white/5">{user.creatorProfile?.category || 'fashion'}</p>
                </div>
              )}
            </div>

            {/* Follow button */}
            {isCreator && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${
                  following
                    ? 'bg-white/10 text-white/60 border border-white/10'
                    : 'bg-brand-500 text-white'
                }`}
              >
                {following ? (
                  <span className="flex items-center justify-center gap-1.5"><UserCheck className="w-4 h-4" /> Following</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5"><UserPlus className="w-4 h-4" /> Follow</span>
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-white/70 text-sm mb-6 leading-relaxed">{user.bio}</p>
        )}

        {/* Content tabs */}
        {isCreator && (
          <>
            <div className="flex border-b border-white/10 mb-4">
              <button
                onClick={() => setTab('reels')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  tab === 'reels' ? 'border-white text-white' : 'border-transparent text-white/40'
                }`}
              >
                <Film className="w-4 h-4" /> Reels
              </button>
              <button
                onClick={() => setTab('posts')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                  tab === 'posts' ? 'border-white text-white' : 'border-transparent text-white/40'
                }`}
              >
                <Grid3X3 className="w-4 h-4" /> Posts
              </button>
            </div>

            {/* Content grid placeholder */}
            <div className="text-center py-12">
              <p className="text-white/20 text-sm">No {tab} yet</p>
            </div>
          </>
        )}

        {/* Joined date */}
        <p className="text-white/20 text-xs text-center mt-8">
          Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </Layout>
  );
}
