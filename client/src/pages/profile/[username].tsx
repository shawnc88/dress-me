import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { UserPlus, UserCheck, Radio, Film, Grid3X3, Loader2, ArrowLeft, Gift, Heart, MessageCircle, Play, Crown, ExternalLink, Sparkles, Star, TrendingUp, Lock, Zap, Video } from 'lucide-react';
import Link from 'next/link';
import { SubscribeTierSheet } from '@/components/subscription/SubscribeTierSheet';
import { SuiteTeaserCard } from '@/components/subscription/SuiteTeaserCard';
import { SupporterLeaderboard } from '@/components/monetization/SupporterLeaderboard';
import { UpgradePromptCard } from '@/components/monetization/UpgradePromptCard';
import { VipValueCard } from '@/components/monetization/VipValueCard';
import { ScarcityBadge } from '@/components/monetization/ScarcityBadge';
import { TierComparisonSheet } from '@/components/monetization/TierComparisonSheet';
import { VipBadge } from '@/components/ui/VipBadge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function PublicProfile() {
  const router = useRouter();
  const { username } = router.query;
  const [user, setUser] = useState<any>(null);
  const [reels, setReels] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [liveStream, setLiveStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<'reels' | 'posts'>('reels');
  const [showGiftNotice, setShowGiftNotice] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showTierCompare, setShowTierCompare] = useState(false);
  const [mySubscription, setMySubscription] = useState<any>(null);

  useEffect(() => {
    if (!username) return;

    // Redirect if viewing own profile
    try {
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      if (me.username === username) { router.replace('/profile'); return; }
    } catch {}

    setLoading(true);
    setError('');

    fetch(`${API_URL}/api/users/profile/${username}`)
      .then(r => { if (!r.ok) throw new Error('User not found'); return r.json(); })
      .then(data => {
        setUser(data.user);
        setReels(data.reels || []);
        setPosts(data.posts || []);
        setLiveStream(data.liveStream || null);

        // Check follow status + subscription
        const token = localStorage.getItem('token');
        if (token && data.user.creatorProfile) {
          fetch(`${API_URL}/api/feed/following`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.following?.includes(data.user.creatorProfile.id)) setFollowing(true); })
            .catch(() => {});

          // Check fan subscription
          fetch(`${API_URL}/api/fan-subscriptions/check/${data.user.creatorProfile.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.subscription) setMySubscription(d.subscription); })
            .catch(() => {});
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [username, router]);

  function handleFollow() {
    if (!user?.creatorProfile) return;
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    setFollowing(prev => !prev);
    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId: user.creatorProfile.id }),
    }).catch(() => setFollowing(prev => !prev));
  }

  // ─── Loading ───
  if (loading) {
    return <Layout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div></Layout>;
  }

  // ─── Error ───
  if (error || !user) {
    return (
      <Layout>
        <Head><title>User Not Found - Dress Me</title></Head>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-white text-lg font-bold mb-2">User not found</h2>
          <p className="text-white/40 text-sm mb-6">This account may not exist</p>
          <button onClick={() => router.back()} className="px-5 py-2 rounded-xl bg-white/10 text-white text-sm font-medium flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>{user.displayName} (@{user.username}) - Dress Me</title></Head>
      <div className="max-w-[630px] mx-auto px-4 py-4">

        {/* ─── HEADER: always renders ─── */}
        <div className="text-center mb-5">
          <div className="relative inline-block mb-3">
            <div className={`w-24 h-24 rounded-full overflow-hidden mx-auto ${
              liveStream ? 'ring-[3px] ring-red-500 ring-offset-[3px] ring-offset-surface-dark' : 'ring-2 ring-white/10'
            }`}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-500/30 to-violet-500/30 flex items-center justify-center text-3xl font-bold text-white/60">
                  {user.displayName.charAt(0)}
                </div>
              )}
            </div>
            {liveStream && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-surface-dark">
                LIVE
              </div>
            )}
          </div>

          <h1 className="text-white text-xl font-extrabold mb-0.5">{user.displayName}</h1>
          <p className="text-white/40 text-sm mb-2">@{user.username}</p>
          {user.bio ? (
            <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed mb-3">{user.bio}</p>
          ) : (
            <p className="text-white/20 text-sm mb-3 italic">No bio yet</p>
          )}
        </div>

        {/* ─── STATS: always renders ─── */}
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-white font-bold text-lg">{formatCount(user.followerCount || 0)}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{formatCount(user.totalLikes || 0)}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Likes</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{user.reelCount || 0}</p>
            <p className="text-white/30 text-[10px] uppercase tracking-wider">Reels</p>
          </div>
        </div>

        {/* ─── ACTION BUTTONS: always renders ─── */}
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleFollow}
            className={`flex-1 max-w-[140px] py-2.5 rounded-lg text-sm font-bold transition-all ${
              following ? 'bg-white/10 text-white/60 border border-white/10' : 'bg-brand-500 text-white'
            }`}
          >
            {following ? (
              <span className="flex items-center justify-center gap-1.5"><UserCheck className="w-4 h-4" /> Following</span>
            ) : (
              <span className="flex items-center justify-center gap-1.5"><UserPlus className="w-4 h-4" /> Follow</span>
            )}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              const token = localStorage.getItem('token');
              if (!token) { router.push('/auth/login'); return; }
              // Send empty first message to create conversation, then navigate
              try {
                const res = await fetch(`${API_URL}/api/messages/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ recipientId: user.id, content: 'Hey!' }),
                });
                const data = await res.json();
                if (data.conversationId) router.push(`/messages/${data.conversationId}`);
                else router.push('/messages');
              } catch { router.push('/messages'); }
            }}
            className="flex-1 max-w-[140px] py-2.5 rounded-lg text-sm font-medium bg-white/10 text-white border border-white/10"
          >
            <MessageCircle className="w-4 h-4 inline mr-1" /> Message
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Gift className="w-5 h-5 text-amber-400" />
          </motion.button>
        </div>

        {/* ─── LIVE NOW: high-urgency banner ─── */}
        <AnimatePresence>
          {liveStream && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
              <Link href={`/stream/${liveStream.id}`}>
                <div className="bg-gradient-to-r from-red-600/30 via-red-500/20 to-pink-500/10 rounded-2xl p-4 border border-red-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
                  <div className="flex items-center gap-3 relative">
                    <div className="w-14 h-14 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-7 h-7 text-red-400 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">LIVE NOW</span>
                        <span className="text-white/50 text-xs">{liveStream.viewerCount || 0} watching</span>
                      </div>
                      <p className="text-white text-sm font-bold truncate">{liveStream.title}</p>
                    </div>
                    <motion.div whileTap={{ scale: 0.9 }} className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/30">
                      Join
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── NOT LIVE: follow to get notified ─── */}
        {!liveStream && user.isCreator && !following && (
          <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
            <Radio className="w-5 h-5 text-white/15 mx-auto mb-1" />
            <p className="text-white/30 text-xs mb-2">Not streaming right now</p>
            <p className="text-white/20 text-[10px]">Follow to get notified when they go live</p>
          </div>
        )}

        {/* ─── CREATOR BADGES ─── */}
        {user.isCreator && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {(user.followerCount || 0) >= 100 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
            {(user.totalLikes || 0) >= 500 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                <Star className="w-3 h-3" /> Top Creator
              </span>
            )}
            {(user.reelCount || 0) >= 10 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold">
                <Zap className="w-3 h-3" /> Active
              </span>
            )}
          </div>
        )}

        {/* ─── SEND GIFT CTA (high visibility) ─── */}
        {user.isCreator && (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!localStorage.getItem('token')) { router.push('/auth/login'); return; }
                if (liveStream) { router.push(`/stream/${liveStream.id}`); }
                else { setShowGiftNotice(true); setTimeout(() => setShowGiftNotice(false), 3000); }
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/20 text-amber-300 text-sm font-bold flex items-center justify-center gap-2 mb-1 hover:from-amber-500/30 hover:to-orange-500/30 transition-all"
            >
              <Gift className="w-5 h-5" /> {liveStream ? 'Send Gift in Live Stream' : `Send ${user.displayName} a Gift`}
            </motion.button>
            <AnimatePresence>
              {showGiftNotice && !liveStream && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-amber-400/60 text-[10px] text-center mb-3">
                  Gifts can be sent during live streams. Follow to get notified!
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ─── VIP VALUE + SUBSCRIPTION TIERS ─── */}
        {user.isCreator && !mySubscription && (
          <div className="mb-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-brand-500/5 to-transparent border border-violet-500/15 p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative">
              <VipValueCard
                onSubscribe={() => {
                  if (!localStorage.getItem('token')) { router.push('/auth/login'); return; }
                  setShowSubscribe(true);
                }}
                creatorName={user.displayName}
              />
              <button
                onClick={() => setShowTierCompare(true)}
                className="w-full mt-2 py-2 text-white/30 text-[10px] font-medium hover:text-white/50 transition-colors"
              >
                Compare all plans &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Active subscription badge */}
        {user.isCreator && mySubscription && (
          <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2">
              <VipBadge tier={(mySubscription.tier?.name || 'supporter').toLowerCase()} size="md" />
              <div>
                <p className="text-white/30 text-[10px]">Active subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mySubscription.tier?.name !== 'INNER_CIRCLE' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSubscribe(true)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-brand-500 text-white text-[10px] font-bold"
                >
                  Upgrade
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSubscribe(true)}
                className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-[10px] font-bold"
              >
                Manage
              </motion.button>
            </div>
          </div>
        )}

        {/* ─── SUITE TEASER ─── */}
        {user.isCreator && !mySubscription && (
          <div className="mb-4">
            <SuiteTeaserCard
              creatorName={user.displayName}
              onSubscribe={() => {
                if (!localStorage.getItem('token')) { router.push('/auth/login'); return; }
                setShowSubscribe(true);
              }}
            />
          </div>
        )}

        {/* ─── TOP SUPPORTERS LEADERBOARD ─── */}
        {user.isCreator && user.creatorProfile && (
          <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <SupporterLeaderboard creatorId={user.creatorProfile.id} />
          </div>
        )}

        {/* ─── SCARCITY BADGE ─── */}
        {user.isCreator && user.creatorProfile && !mySubscription && (
          <div className="mb-4 flex justify-center">
            <ScarcityBadge creatorId={user.creatorProfile.id} />
          </div>
        )}

        {/* ─── UPGRADE PROMPT (contextual) ─── */}
        {user.isCreator && user.creatorProfile && (
          <div className="mb-4">
            <UpgradePromptCard
              creatorId={user.creatorProfile.id}
              creatorName={user.displayName}
              onSubscribe={() => setShowSubscribe(true)}
              source="profile"
            />
          </div>
        )}

        {/* ─── CONTENT TABS: always renders ─── */}
        <div className="flex border-b border-white/[0.06]">
          <button
            onClick={() => setTab('reels')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'reels' ? 'border-white text-white' : 'border-transparent text-white/30'
            }`}
          >
            <Film className="w-4 h-4" /> Reels
          </button>
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'posts' ? 'border-white text-white' : 'border-transparent text-white/30'
            }`}
          >
            <Grid3X3 className="w-4 h-4" /> Posts
          </button>
        </div>

        {/* ─── CONTENT GRID: always renders with empty states ─── */}
        {tab === 'reels' && (
          reels.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {reels.map((r: any) => (
                <Link key={r.id} href={`/reels`} className="relative aspect-[9/16] bg-white/5 overflow-hidden">
                  {r.muxPlaybackId ? (
                    <img src={`https://image.mux.com/${r.muxPlaybackId}/thumbnail.jpg?time=2&width=240&height=426`} alt="" className="w-full h-full object-cover" />
                  ) : r.thumbnailUrl ? (
                    <img src={r.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Play className="w-5 h-5 text-white/10" /></div>
                  )}
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[9px] text-white font-semibold drop-shadow-sm">
                    <Play className="w-2.5 h-2.5 fill-white" /> {formatCount(r.viewsCount || 0)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Film className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/20 text-sm">No reels yet</p>
              <p className="text-white/10 text-xs mt-1">Check back later for new content</p>
            </div>
          )
        )}

        {tab === 'posts' && (
          posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 mt-0.5">
              {posts.map((p: any) => (
                <div key={p.id} className="relative aspect-square bg-white/5 overflow-hidden">
                  <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Grid3X3 className="w-10 h-10 text-white/10 mx-auto mb-2" />
              <p className="text-white/20 text-sm">No posts yet</p>
              <p className="text-white/10 text-xs mt-1">This creator hasn't posted any photos</p>
            </div>
          )
        )}

        {/* Joined date: always renders */}
        <p className="text-white/15 text-[10px] text-center mt-8 mb-4">
          Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Subscription Sheet */}
      {user.isCreator && user.creatorProfile && (
        <>
          <SubscribeTierSheet
            creatorId={user.creatorProfile.id}
            creatorName={user.displayName}
            isOpen={showSubscribe}
            onClose={() => setShowSubscribe(false)}
            currentTierId={mySubscription?.tierId || null}
            currentSubStatus={mySubscription?.status || null}
            currentSubProvider={mySubscription?.provider || null}
            currentSubCancelAtPeriodEnd={mySubscription?.cancelAtPeriodEnd || false}
            currentSubPeriodEnd={mySubscription?.currentPeriodEnd || null}
          />
          <TierComparisonSheet
            open={showTierCompare}
            onClose={() => setShowTierCompare(false)}
            creatorId={user.creatorProfile.id}
            onSelectTier={() => {
              setShowTierCompare(false);
              setShowSubscribe(true);
            }}
          />
        </>
      )}
    </Layout>
  );
}
