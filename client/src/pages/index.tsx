import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { CreatorCard } from '@/components/ui/CreatorCard';
import {
  Heart, MessageCircle, Bookmark, Share2, Shirt,
  Video, Play, Sparkles, TrendingUp, Crown, UserPlus,
  ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FeedCreator {
  creatorId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  category: string;
  isLive: boolean;
  streamId: string | null;
  streamTitle: string | null;
  streamStatus: string | null;
  muxPlaybackId: string | null;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  streamType: string | null;
  score: number;
  bucket: string;
}

interface FeedData {
  liveNow: FeedCreator[];
  forYou: FeedCreator[];
  rising: FeedCreator[];
  premium: FeedCreator[];
  newFaces: FeedCreator[];
}

// Demo data for when backend is unreachable
const DEMO_CREATORS: FeedCreator[] = [
  { creatorId: 'd1', userId: 'u1', username: 'stylebymia', displayName: 'StyleByMia', avatarUrl: null, category: 'fashion', isLive: false, streamId: null, streamTitle: 'Spring collection LIVE', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 1243, startedAt: null, streamType: 'PUBLIC', score: 80, bucket: 'for_you' },
  { creatorId: 'd2', userId: 'u2', username: 'luxethreads', displayName: 'LuxeThreads', avatarUrl: null, category: 'luxury', isLive: false, streamId: null, streamTitle: '$500 Giveaway Stream', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 3891, startedAt: null, streamType: 'PREMIUM', score: 75, bucket: 'premium' },
  { creatorId: 'd3', userId: 'u3', username: 'streetchic', displayName: 'StreetChic', avatarUrl: null, category: 'streetwear', isLive: false, streamId: null, streamTitle: 'Jacket restock LIVE', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 892, startedAt: null, streamType: 'PUBLIC', score: 65, bucket: 'rising' },
  { creatorId: 'd4', userId: 'u4', username: 'runwayrose', displayName: 'RunwayRose', avatarUrl: null, category: 'fashion', isLive: false, streamId: null, streamTitle: 'Date night outfit poll', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 2105, startedAt: null, streamType: 'PUBLIC', score: 60, bucket: 'for_you' },
  { creatorId: 'd5', userId: 'u5', username: 'vintagevibes', displayName: 'VintageVibes', avatarUrl: null, category: 'thrift', isLive: false, streamId: null, streamTitle: 'Thrift haul under $30', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 1567, startedAt: null, streamType: 'PUBLIC', score: 55, bucket: 'new_faces' },
  { creatorId: 'd6', userId: 'u6', username: 'boldybella', displayName: 'BoldByBella', avatarUrl: null, category: 'beauty', isLive: false, streamId: null, streamTitle: 'Summer looks 2026', streamStatus: null, muxPlaybackId: null, viewerCount: 0, peakViewers: 980, startedAt: null, streamType: 'PUBLIC', score: 50, bucket: 'for_you' },
];

export default function Home() {
  const [feed, setFeed] = useState<FeedData | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      // Algorithm feed
      fetch(`${API_URL}/api/feed`, { headers })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
      // Posts
      fetch(`${API_URL}/api/posts?limit=20`, { headers })
        .then((r) => r.ok ? r.json() : { posts: [] })
        .catch(() => ({ posts: [] })),
    ])
      .then(([feedData, postsData]) => {
        if (feedData?.feed) {
          setFeed(feedData.feed);
        } else {
          // Fallback to demo data
          setFeed({
            liveNow: [],
            forYou: DEMO_CREATORS.filter(c => c.bucket === 'for_you'),
            rising: DEMO_CREATORS.filter(c => c.bucket === 'rising'),
            premium: DEMO_CREATORS.filter(c => c.bucket === 'premium'),
            newFaces: DEMO_CREATORS.filter(c => c.bucket === 'new_faces'),
          });
        }
        setPosts(postsData.posts || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLikeToggle = useCallback(async (postId: string, currentlyLiked: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !currentlyLiked, likeCount: currentlyLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, liked: currentlyLiked, likeCount: currentlyLiked ? p.likeCount : p.likeCount - 1 }
              : p
          )
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: currentlyLiked, likeCount: currentlyLiked ? p.likeCount : p.likeCount - 1 }
            : p
        )
      );
    }
  }, []);

  const hasLive = (feed?.liveNow?.length || 0) > 0;

  return (
    <Layout>
      <Head>
        <title>Dress Me - Live Fashion Streaming</title>
        <meta name="description" content="Watch fashion creators style outfits live." />
      </Head>

      <div className="max-w-[630px] mx-auto">
        {loading ? (
          <>
            <StoriesRowSkeleton />
            <div className="px-4 py-4 space-y-4">
              <div className="h-6 w-32 skeleton rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="aspect-[9/16] skeleton rounded-3xl" />)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ─── Stories Row (Live Now) ─── */}
            {hasLive ? (
              <LiveStoriesRow creators={feed!.liveNow} />
            ) : (
              <DemoStoriesRow user={user} />
            )}

            {/* ─── Watch Feed CTA ─── */}
            <Link href="/feed" className="block mx-4 mt-3 mb-1">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden rounded-3xl gradient-premium p-4"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">Watch Live Streams</p>
                    <p className="text-white/70 text-xs mt-0.5">Full-screen vertical feed</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                    <Play className="w-4 h-4 text-white" fill="white" />
                    <span className="text-white text-xs font-bold">{hasLive ? `${feed!.liveNow.length} Live` : 'Watch'}</span>
                  </div>
                </div>
                <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
              </motion.div>
            </Link>

            {/* ─── Bucket: For You ─── */}
            {(feed?.forYou?.length || 0) > 0 && (
              <FeedBucket
                title="For You"
                subtitle="Based on your interests"
                icon={<Sparkles className="w-4 h-4 text-brand-500" />}
                creators={feed!.forYou}
              />
            )}

            {/* ─── Real Posts Feed ─── */}
            {posts.length > 0 && (
              <div className="divide-y divide-white/5 mt-4">
                {posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <RealFeedPost post={post} onLikeToggle={handleLikeToggle} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* ─── Bucket: Rising Creators ─── */}
            {(feed?.rising?.length || 0) > 0 && (
              <FeedBucket
                title="Rising"
                subtitle="Gaining momentum fast"
                icon={<TrendingUp className="w-4 h-4 text-green-400" />}
                creators={feed!.rising}
              />
            )}

            {/* ─── Bucket: Premium Creators ─── */}
            {(feed?.premium?.length || 0) > 0 && (
              <FeedBucket
                title="Premium"
                subtitle="Exclusive tier content"
                icon={<Crown className="w-4 h-4 text-amber-400" />}
                creators={feed!.premium}
              />
            )}

            {/* ─── Bucket: New Faces ─── */}
            {(feed?.newFaces?.length || 0) > 0 && (
              <FeedBucket
                title="New Faces"
                subtitle="Discover fresh creators"
                icon={<UserPlus className="w-4 h-4 text-violet-deep" />}
                creators={feed!.newFaces}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/* ─── Feed Bucket Section ──────────────────────────── */
function FeedBucket({
  title,
  subtitle,
  icon,
  creators,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  creators: FeedCreator[];
}) {
  return (
    <section className="mt-6 mb-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h2 className="text-white font-bold text-sm">{title}</h2>
            <p className="text-gray-500 text-[10px]">{subtitle}</p>
          </div>
        </div>
        <Link href="/streams" className="flex items-center gap-0.5 text-gray-500 text-xs hover:text-brand-500 transition-colors">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {creators.map((creator, i) => (
          <motion.div
            key={creator.creatorId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex-shrink-0 w-[160px]"
          >
            {creator.streamId ? (
              <CreatorCard
                streamId={creator.streamId}
                title={creator.streamTitle || ''}
                creatorName={creator.displayName}
                creatorUsername={creator.username}
                avatarUrl={creator.avatarUrl}
                muxPlaybackId={creator.muxPlaybackId}
                isLive={creator.isLive}
                viewerCount={creator.viewerCount}
                streamType={creator.streamType || 'PUBLIC'}
                category={creator.category}
              />
            ) : (
              <DemoCreatorCard creator={creator} />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ─── Demo Creator Card (no stream) ────────────────── */
function DemoCreatorCard({ creator }: { creator: FeedCreator }) {
  return (
    <Link href="/auth/signup" className="block">
      <div className="relative aspect-[9/16] rounded-3xl overflow-hidden bg-gradient-to-br from-brand-900 via-purple-900 to-black">
        <div className="w-full h-full flex items-center justify-center">
          <Shirt className="w-12 h-12 text-white/10" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-brand-500/30 flex items-center justify-center text-[10px] font-bold text-brand-300">
              {creator.displayName.charAt(0)}
            </div>
            <span className="text-white text-xs font-semibold truncate">{creator.displayName}</span>
          </div>
          <p className="text-white/70 text-[10px] line-clamp-2">{creator.streamTitle}</p>
          {creator.category && (
            <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-medium bg-white/10 text-white/60">
              {creator.category}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Live Stories Row ─────────────────────────────── */
function LiveStoriesRow({ creators }: { creators: FeedCreator[] }) {
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
        {creators.map((creator) => (
          <Link key={creator.creatorId} href={creator.streamId ? `/stream/${creator.streamId}` : '/streams'} className="flex-shrink-0 flex flex-col items-center gap-1 group">
            <div className="ring-creator">
              <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center overflow-hidden">
                {creator.avatarUrl ? (
                  <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-brand-400">{creator.displayName.charAt(0)}</span>
                )}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-400 group-hover:text-white truncate max-w-[64px] text-center transition-colors">
              {creator.displayName}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Demo Stories Row ─────────────────────────────── */
function DemoStoriesRow({ user }: { user: any }) {
  const demoCreators = [
    { id: '1', name: 'StyleByMia', initial: 'M', gradient: 'from-brand-500 to-violet-deep' },
    { id: '2', name: 'LuxeThreads', initial: 'L', gradient: 'from-violet-deep to-indigo-500' },
    { id: '3', name: 'StreetChic', initial: 'S', gradient: 'from-orange-500 to-live' },
    { id: '4', name: 'VintageVibes', initial: 'V', gradient: 'from-teal-500 to-cyan-500' },
    { id: '5', name: 'RunwayRose', initial: 'R', gradient: 'from-brand-500 to-purple-500' },
    { id: '6', name: 'BoldByBella', initial: 'B', gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
        {/* Your Story / Go Live */}
        <Link href={user ? '/become-creator' : '/auth/signup'} className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="relative w-16 h-16">
            <div className="w-full h-full rounded-full bg-charcoal border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden">
              {user ? (
                <span className="text-sm font-bold text-gray-500">{user.displayName?.charAt(0) || '?'}</span>
              ) : (
                <Shirt className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-500 border-2 border-surface-dark flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-500">{user ? 'Go Live' : 'Join'}</span>
        </Link>

        {demoCreators.map((c) => (
          <Link key={c.id} href="/auth/signup" className="flex-shrink-0 flex flex-col items-center gap-1 group">
            <div className={`w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${c.gradient}`}>
              <div className="w-full h-full rounded-full bg-surface-dark flex items-center justify-center text-sm font-bold text-gray-300">
                {c.initial}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300 truncate max-w-[64px] text-center transition-colors">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Real Feed Post ───────────────────────────────── */
function RealFeedPost({
  post,
  onLikeToggle,
}: {
  post: any;
  onLikeToggle: (postId: string, currentlyLiked: boolean) => void;
}) {
  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <article className="pb-4">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-xs font-bold overflow-hidden">
            {post.user?.avatarUrl ? (
              <img src={post.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-400">{post.user?.displayName?.charAt(0) || '?'}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{post.user?.displayName || 'Unknown'}</span>
          </div>
        </div>
        <span className="text-xs text-gray-600">{timeAgo}</span>
      </div>

      <div className="aspect-square bg-charcoal">
        <img
          src={post.imageUrl}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={() => onLikeToggle(post.id, !!post.liked)}
              className={`transition-colors ${post.liked ? 'text-live' : 'text-gray-400 hover:text-live'}`}
            >
              <Heart className="w-6 h-6" fill={post.liked ? 'currentColor' : 'none'} />
            </motion.button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {(post.likeCount ?? 0) > 0 && (
          <p className="text-sm font-semibold text-white mb-1">
            {(post.likeCount ?? 0).toLocaleString()} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {post.caption && (
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white mr-1">{post.user?.displayName || 'Unknown'}</span>
            {post.caption}
          </p>
        )}

        {(post.commentCount ?? 0) > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            View all {post.commentCount} comments
          </p>
        )}
      </div>
    </article>
  );
}

/* ─── Helpers ──────────────────────────────────────── */
function getTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return `${Math.floor(diffDay / 7)}w`;
}

function StoriesRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
            <div className="w-12 h-2 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
