import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { UserPlus, UserCheck, Radio, Film, Grid3X3, Loader2, ArrowLeft, Gift, MessageCircle, Play, Star, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { SubscribeTierSheet } from '@/components/subscription/SubscribeTierSheet';
import { SuiteTeaserCard } from '@/components/subscription/SuiteTeaserCard';
import { SupporterLeaderboard } from '@/components/monetization/SupporterLeaderboard';
import { UpgradePromptCard } from '@/components/monetization/UpgradePromptCard';
import { VipValueCard } from '@/components/monetization/VipValueCard';
import { ScarcityBadge } from '@/components/monetization/ScarcityBadge';
import { TierComparisonSheet } from '@/components/monetization/TierComparisonSheet';
import { VipBadge } from '@/components/ui/VipBadge';
import { TiltCard } from '@/components/3d/couture/TiltCard';

// The ONE 3D scene on this view — lazy-loaded so three.js only ships here.
// All other ambience is pure CSS (.nightfall-canvas washes + .grain).
const FloatingGem = dynamic(
  () => import('@/components/3d/couture').then((m) => m.FloatingGem),
  { ssr: false }
);

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
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 text-gold-300 animate-spin" />
          <p className="text-white/25 text-[10px] tracking-[0.24em] uppercase">Opening the room</p>
        </div>
      </Layout>
    );
  }

  // ─── Error ───
  if (error || !user) {
    return (
      <Layout>
        <Head><title>User Not Found - Be With Me</title></Head>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
          <div className="w-16 h-16 rounded-full glass-couture !rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="editorial text-white text-2xl mb-2">No one&rsquo;s here</h2>
          <p className="text-white/40 text-sm mb-6">This account may not exist</p>
          <button onClick={() => router.back()} className="btn-couture-ghost min-h-[44px] !py-2.5 text-sm flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>{user.displayName} (@{user.username}) - Be With Me</title></Head>

      {/* ─── COUTURE HERO — ink canvas, grain, one floating gem ─── */}
      <div className="max-w-[630px] mx-auto">
        <div className="relative nightfall-canvas grain overflow-hidden pb-6">
          {/* CSS aurora washes — ambient stays CSS, the gem is the single WebGL scene */}
          <div className="absolute -top-14 -left-14 w-64 h-64 bg-brand-500/[0.10] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-8 right-0 w-52 h-52 bg-violet-deep/[0.12] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent pointer-events-none" />
          {/* Hero gem crowning the avatar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" aria-hidden="true">
            <FloatingGem size={120} tone="gold" intensity="subtle" />
          </div>

          <div className="relative px-4 pt-16 text-center">
            <div className="relative inline-block mb-4">
              <div className={`w-28 h-28 mx-auto ${
                liveStream
                  ? 'rounded-full p-[3px] bg-live shadow-glow'
                  : user.isCreator
                    ? 'ring-creator shadow-gold-sm'
                    : 'rounded-full p-[2px] bg-gradient-to-br from-gold-300/40 via-white/10 to-violet-deep/40'
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-surface-dark">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand-500/25 to-violet-deep/25 flex items-center justify-center">
                      <span className="editorial text-4xl text-couture-gold">{user.displayName.charAt(0)}</span>
                    </div>
                  )}
                </div>
              </div>
              {liveStream && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-live text-[10px] font-bold text-white border-2 border-surface-dark animate-glow-breathe">
                  LIVE
                </div>
              )}
            </div>

            <h1 className="editorial text-4xl leading-[1.02] text-couture-gold mb-1 animate-rise opacity-0">{user.displayName}</h1>
            <p className="text-white/40 text-sm mb-3 animate-rise opacity-0" style={{ animationDelay: '60ms' }}>@{user.username}</p>
            {user.bio ? (
              <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed mb-4 animate-rise opacity-0" style={{ animationDelay: '110ms' }}>{user.bio}</p>
            ) : (
              <p className="text-white/20 text-sm mb-4 italic">No bio yet</p>
            )}

            {/* ─── STATS — glass tilt tiles ─── */}
            <div className="grid grid-cols-3 gap-2.5 mb-5 max-w-sm mx-auto">
              {[
                { value: formatCount(user.followerCount || 0), label: 'Followers' },
                { value: formatCount(user.totalLikes || 0), label: 'Likes' },
                { value: String(user.reelCount || 0), label: 'Reels' },
              ].map((s, i) => (
                <TiltCard key={s.label} intensity="subtle">
                  <div
                    className="glass-couture !rounded-2xl py-3 px-2 animate-rise opacity-0"
                    style={{ animationDelay: `${160 + i * 60}ms` }}
                  >
                    <p className="editorial text-white text-xl leading-none">{s.value}</p>
                    <p className="text-gold-300/50 text-[9px] tracking-[0.2em] uppercase mt-1.5">{s.label}</p>
                  </div>
                </TiltCard>
              ))}
            </div>

            {/* ─── ACTION BUTTONS ─── */}
            <div className="flex items-center justify-center gap-2.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleFollow}
                className={`flex-1 max-w-[150px] min-h-[44px] py-3 text-sm font-bold transition-all ${
                  following
                    ? 'btn-couture-ghost !px-3 !py-3 text-white/70'
                    : 'btn-couture !px-3 !py-3'
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
                className="btn-couture-ghost flex-1 max-w-[150px] min-h-[44px] !px-3 !py-3 text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4 inline mr-1" /> Message
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!localStorage.getItem('token')) { router.push('/auth/login'); return; }
                  if (liveStream) {
                    router.push(`/stream/${liveStream.id}`);
                  } else {
                    setShowGiftNotice(true);
                    setTimeout(() => setShowGiftNotice(false), 3000);
                  }
                }}
                aria-label="Send a gift"
                className="w-11 h-11 rounded-full gold-hairline shadow-gold-sm flex items-center justify-center flex-shrink-0"
              >
                <Gift className="w-5 h-5 text-gold-300" />
              </motion.button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface-dark to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="max-w-[630px] mx-auto px-4 py-4">

        {/* ─── LIVE NOW: high-urgency banner ─── */}
        <AnimatePresence>
          {liveStream && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
              <Link href={`/stream/${liveStream.id}`}>
                <TiltCard intensity="subtle">
                  <div className="glass-couture !rounded-3xl border !border-live/30 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-live/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-live/60 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-3 relative">
                      <div className="w-14 h-14 rounded-2xl bg-live/15 border border-live/25 flex items-center justify-center flex-shrink-0">
                        <Radio className="w-7 h-7 text-live animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-live text-white animate-pulse">LIVE NOW</span>
                          <span className="text-white/50 text-xs">{liveStream.viewerCount || 0} watching</span>
                        </div>
                        <p className="editorial text-white text-base leading-tight truncate">{liveStream.title}</p>
                      </div>
                      <motion.div whileTap={{ scale: 0.9 }} className="min-h-[44px] px-6 rounded-full bg-live text-white text-xs font-bold shadow-glow flex items-center">
                        Join
                      </motion.div>
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── NOT LIVE: follow to get notified ─── */}
        {!liveStream && user.isCreator && !following && (
          <div className="mb-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
            <Radio className="w-5 h-5 text-white/15 mx-auto mb-1.5" />
            <p className="editorial text-white/45 text-sm mb-1">The stage is dark, for now</p>
            <p className="text-white/25 text-[10px]">Follow to get notified when they go live</p>
          </div>
        )}

        {/* ─── CREATOR BADGES ─── */}
        {user.isCreator && (
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {(user.followerCount || 0) >= 100 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold">
                <TrendingUp className="w-3 h-3" /> Trending
              </span>
            )}
            {(user.totalLikes || 0) >= 500 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-gold-300/10 gold-hairline text-gold-300 text-[10px] font-bold">
                <Star className="w-3 h-3" /> Top Creator
              </span>
            )}
            {(user.reelCount || 0) >= 10 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[10px] font-bold">
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
              className="w-full min-h-[48px] py-3 rounded-full gold-hairline shadow-gold-sm text-gold-300 text-sm font-bold flex items-center justify-center gap-2 mb-1 hover:shadow-gold transition-all"
            >
              <Gift className="w-5 h-5" /> {liveStream ? 'Send Gift in Live Stream' : `Send ${user.displayName} a Gift`}
            </motion.button>
            <AnimatePresence>
              {showGiftNotice && !liveStream && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gold-300/60 text-[10px] text-center mb-3">
                  Gifts can be sent during live streams. Follow to get notified!
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ─── VIP VALUE + SUBSCRIPTION TIERS ─── */}
        {user.isCreator && !mySubscription && (
          <div className="mb-4 glass-couture gold-hairline p-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-28 h-28 bg-violet-deep/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-8 w-28 h-28 bg-brand-500/[0.07] rounded-full blur-3xl pointer-events-none" />
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
                className="w-full mt-1 min-h-[44px] py-2 text-gold-300/50 text-[10px] font-medium tracking-wide hover:text-gold-300/80 transition-colors"
              >
                Compare all plans &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Active subscription badge */}
        {user.isCreator && mySubscription && (
          <div className="mb-4 flex items-center justify-between p-3.5 glass-couture gold-hairline !rounded-3xl">
            <div className="flex items-center gap-2.5">
              <VipBadge tier={(mySubscription.tier?.name || 'supporter').toLowerCase()} size="md" />
              <div>
                <p className="text-gold-300/60 text-[9px] tracking-[0.18em] uppercase">Active subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mySubscription.tier?.name !== 'INNER_CIRCLE' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSubscribe(true)}
                  className="btn-couture min-h-[44px] !px-4 !py-2.5 text-[10px]"
                >
                  Upgrade
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSubscribe(true)}
                className="btn-couture-ghost min-h-[44px] !px-4 !py-2.5 text-[10px] font-bold"
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
          <div className="mb-4 p-4 glass-couture !rounded-3xl">
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
            className={`flex-1 min-h-[48px] py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'reels' ? 'border-gold-300/70 text-gold-300' : 'border-transparent text-white/30'
            }`}
          >
            <Film className="w-4 h-4" /> Reels
          </button>
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 min-h-[48px] py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              tab === 'posts' ? 'border-gold-300/70 text-gold-300' : 'border-transparent text-white/30'
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
              <Film className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="editorial text-white/35 text-lg">Nothing on the reel yet</p>
              <p className="text-white/15 text-xs mt-1">Check back later for new content</p>
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
              <Grid3X3 className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="editorial text-white/35 text-lg">No posts yet</p>
              <p className="text-white/15 text-xs mt-1">This creator hasn&apos;t posted any photos</p>
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
