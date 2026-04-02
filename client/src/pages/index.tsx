import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LiveNowRow } from '@/components/feed/LiveNowRow';
import { StreamFeedCard } from '@/components/feed/StreamFeedCard';
import { Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Shirt, Video, Plus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Demo creators for the stories row when no one is live
const DEMO_CREATORS = [
  { id: 'demo-1', name: 'StyleByMia', initial: 'M', color: 'from-pink-500 to-rose-500' },
  { id: 'demo-2', name: 'LuxeThreads', initial: 'L', color: 'from-purple-500 to-indigo-500' },
  { id: 'demo-3', name: 'StreetChic', initial: 'S', color: 'from-orange-500 to-red-500' },
  { id: 'demo-4', name: 'VintageVibes', initial: 'V', color: 'from-teal-500 to-cyan-500' },
  { id: 'demo-5', name: 'RunwayRose', initial: 'R', color: 'from-pink-500 to-purple-500' },
  { id: 'demo-6', name: 'DenimDiva', initial: 'D', color: 'from-blue-500 to-indigo-500' },
  { id: 'demo-7', name: 'BoldByBella', initial: 'B', color: 'from-amber-500 to-orange-500' },
];

// Demo feed posts for when there's no real content
const DEMO_POSTS = [
  {
    id: 'demo-p1',
    creator: { name: 'StyleByMia', initial: 'M', username: 'stylebymia' },
    image: 'from-brand-600 via-purple-700 to-indigo-900',
    caption: 'Spring collection is HERE! Going live tonight at 8pm to show you everything 🌸',
    likes: 1243,
    comments: 89,
    timeAgo: '2h',
    tag: 'OOTD',
  },
  {
    id: 'demo-p2',
    creator: { name: 'LuxeThreads', initial: 'L', username: 'luxethreads' },
    image: 'from-amber-600 via-rose-700 to-purple-900',
    caption: 'Giveaway alert! $500 shopping spree — enter free on my next live stream',
    likes: 3891,
    comments: 412,
    timeAgo: '4h',
    tag: 'GIVEAWAY',
  },
  {
    id: 'demo-p3',
    creator: { name: 'StreetChic', initial: 'S', username: 'streetchic' },
    image: 'from-gray-800 via-brand-900 to-black',
    caption: 'This jacket sold out in 3 minutes during my last stream. Restocking tomorrow LIVE',
    likes: 892,
    comments: 67,
    timeAgo: '6h',
    tag: 'TRENDING',
  },
  {
    id: 'demo-p4',
    creator: { name: 'RunwayRose', initial: 'R', username: 'runwayrose' },
    image: 'from-pink-500 via-rose-600 to-red-900',
    caption: 'Date night outfit check? Vote in my next poll stream this Friday!',
    likes: 2105,
    comments: 156,
    timeAgo: '8h',
    tag: 'POLL',
  },
  {
    id: 'demo-p5',
    creator: { name: 'VintageVibes', initial: 'V', username: 'vintagevibes' },
    image: 'from-emerald-700 via-teal-800 to-cyan-900',
    caption: 'Thrifted this entire outfit for under $30. Full haul stream coming Saturday!',
    likes: 1567,
    comments: 203,
    timeAgo: '12h',
    tag: 'THRIFT',
  },
];

export default function Home() {
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [recentStreams, setRecentStreams] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    async function safeFetch(url: string, opts?: RequestInit) {
      const res = await fetch(url, opts);
      if (!res.ok) return { streams: [], posts: [] };
      const text = await res.text();
      try { return JSON.parse(text); } catch { return { streams: [], posts: [] }; }
    }

    const token = localStorage.getItem('token');
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      safeFetch(`${API_URL}/api/streams?status=LIVE&limit=20`),
      safeFetch(`${API_URL}/api/streams?status=SCHEDULED&limit=10`),
      safeFetch(`${API_URL}/api/posts?limit=20`, { headers: authHeaders }),
    ])
      .then(([live, scheduled, postsData]) => {
        setLiveStreams(live.streams || []);
        setRecentStreams(scheduled.streams || []);
        setPosts(postsData.posts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLikeToggle = useCallback(async (postId: string, currentlyLiked: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !currentlyLiked,
              likeCount: currentlyLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      )
    );

    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Revert on failure
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  liked: currentlyLiked,
                  likeCount: currentlyLiked ? p.likeCount : p.likeCount - 1,
                }
              : p
          )
        );
      }
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: currentlyLiked,
                likeCount: currentlyLiked ? p.likeCount : p.likeCount - 1,
              }
            : p
        )
      );
    }
  }, []);

  const hasRealContent = liveStreams.length > 0 || recentStreams.length > 0;
  const showDemoPosts = posts.length < 5;

  return (
    <Layout>
      <Head>
        <title>Dress Me - Live Fashion Streaming</title>
        <meta name="description" content="Watch fashion creators style outfits live. Interactive polls, exclusive giveaways, and shoppable streams." />
      </Head>

      <div className="max-w-[630px] mx-auto">
        {/* ─── Stories Row ─── */}
        {loading ? (
          <StoriesRowSkeleton />
        ) : liveStreams.length > 0 ? (
          <LiveNowRow streams={liveStreams} />
        ) : (
          <DemoStoriesRow user={user} />
        )}

        {/* ─── Feed ─── */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <>
              <FeedPostSkeleton />
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </>
          ) : (
            <>
              {/* Real posts first */}
              {posts.map((post) => (
                <RealFeedPost key={post.id} post={post} onLikeToggle={handleLikeToggle} />
              ))}

              {/* Real stream content */}
              {hasRealContent &&
                [...liveStreams, ...recentStreams].map((stream) => (
                  <StreamFeedPost key={stream.id} stream={stream} />
                ))}

              {/* Demo posts as fallback when few real posts */}
              {showDemoPosts &&
                DEMO_POSTS.map((post) => (
                  <DemoFeedPost key={post.id} post={post} />
                ))}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ─── Real Feed Post (Instagram-style with working like) ───── */
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold overflow-hidden">
            {post.user?.avatarUrl ? (
              <img src={post.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-brand-600">
                {post.user?.displayName?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{post.user?.displayName || 'Unknown'}</span>
          </div>
        </div>
        <span className="text-xs text-gray-400">{timeAgo}</span>
      </div>

      {/* Image */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-900">
        <img
          src={post.imageUrl}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onLikeToggle(post.id, !!post.liked)}
              className={`transition-colors ${post.liked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart
                className="w-6 h-6"
                fill={post.liked ? 'currentColor' : 'none'}
              />
            </button>
            <button className="hover:text-brand-500 transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="hover:text-brand-500 transition-colors">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
          <button className="hover:text-brand-500 transition-colors">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        {(post.likeCount ?? 0) > 0 && (
          <p className="text-sm font-semibold mb-1">
            {(post.likeCount ?? 0).toLocaleString()} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-1">{post.user?.displayName || 'Unknown'}</span>
            {post.caption}
          </p>
        )}

        {(post.commentCount ?? 0) > 0 && (
          <p className="text-sm text-gray-400 mt-1">
            View all {post.commentCount} comments
          </p>
        )}
      </div>
    </article>
  );
}

/* ─── Demo Stories Row (Instagram-style) ────────────────────── */
function DemoStoriesRow({ user }: { user: any }) {
  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
        {/* Your Story */}
        <Link href={user ? '/dashboard/go-live' : '/auth/signup'} className="flex-shrink-0 flex flex-col items-center gap-1">
          <div className="relative w-16 h-16">
            <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-400 overflow-hidden">
              {user ? user.displayName?.charAt(0) || '?' : <Shirt className="w-6 h-6" />}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand-600 border-2 border-white dark:border-surface-dark flex items-center justify-center">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-500 w-16 text-center truncate">
            {user ? 'Go Live' : 'Join'}
          </span>
        </Link>

        {/* Demo creators */}
        {DEMO_CREATORS.map((creator) => (
          <Link key={creator.id} href="/auth/signup" className="flex-shrink-0 flex flex-col items-center gap-1 group">
            <div className={`w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${creator.color}`}>
              <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
                {creator.initial}
              </div>
            </div>
            <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 truncate max-w-[64px] text-center">
              {creator.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Instagram-style Feed Post (for real streams) ──────────── */
function StreamFeedPost({ stream }: { stream: any }) {
  const isLive = stream.status === 'LIVE';

  return (
    <article className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/stream/${stream.id}`} className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${isLive ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-surface-dark' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {stream.creator?.user?.avatarUrl ? (
              <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="bg-brand-100 dark:bg-brand-900 w-full h-full flex items-center justify-center text-brand-600">
                {stream.creator?.user?.displayName?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{stream.creator?.user?.displayName}</span>
            {isLive && (
              <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">LIVE</span>
            )}
          </div>
        </Link>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Image / Video Thumbnail */}
      <Link href={`/stream/${stream.id}`} className="block">
        <div className="relative aspect-square bg-gradient-to-br from-brand-800 via-purple-900 to-black">
          {stream.muxPlaybackId ? (
            <img
              src={`https://image.mux.com/${stream.muxPlaybackId}/thumbnail.jpg?time=5&width=640&height=640&fit_mode=crop`}
              alt={stream.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shirt className="w-20 h-20 text-white/10" />
            </div>
          )}
          {isLive && (
            <div className="absolute top-4 left-4">
              <span className="badge-live text-xs">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE · {stream.viewerCount} watching
              </span>
            </div>
          )}
          {stream.status === 'SCHEDULED' && (
            <div className="absolute top-4 left-4">
              <span className="bg-brand-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                UPCOMING
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Action Bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button className="hover:text-red-500 transition-colors"><Heart className="w-6 h-6" /></button>
            <button className="hover:text-brand-500 transition-colors"><MessageCircle className="w-6 h-6" /></button>
            <button className="hover:text-brand-500 transition-colors"><Share2 className="w-6 h-6" /></button>
          </div>
          <button className="hover:text-brand-500 transition-colors"><Bookmark className="w-6 h-6" /></button>
        </div>
        <p className="text-sm font-semibold mb-1">{stream.viewerCount.toLocaleString()} viewers</p>
        <p className="text-sm">
          <span className="font-semibold mr-1">{stream.creator?.user?.displayName}</span>
          {stream.title}
        </p>
        {stream.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{stream.description}</p>
        )}
      </div>
    </article>
  );
}

/* ─── Demo Feed Post (Instagram-style) ──────────────────────── */
function DemoFeedPost({ post }: { post: typeof DEMO_POSTS[0] }) {
  return (
    <article className="pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/auth/signup" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-bold text-brand-600">
            {post.creator.initial}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{post.creator.name}</span>
            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
              {post.tag}
            </span>
          </div>
        </Link>
        <span className="text-xs text-gray-400">{post.timeAgo}</span>
      </div>

      {/* Image (gradient placeholder) */}
      <Link href="/auth/signup" className="block">
        <div className={`relative aspect-square bg-gradient-to-br ${post.image}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Video className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm font-medium">Tap to watch</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Action Bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button className="hover:text-red-500 transition-colors"><Heart className="w-6 h-6" /></button>
            <button className="hover:text-brand-500 transition-colors"><MessageCircle className="w-6 h-6" /></button>
            <button className="hover:text-brand-500 transition-colors"><Share2 className="w-6 h-6" /></button>
          </div>
          <button className="hover:text-brand-500 transition-colors"><Bookmark className="w-6 h-6" /></button>
        </div>
        <p className="text-sm font-semibold mb-1">{post.likes.toLocaleString()} likes</p>
        <p className="text-sm">
          <Link href="/auth/signup" className="font-semibold mr-1 hover:underline">{post.creator.name}</Link>
          {post.caption}
        </p>
        <Link href="/auth/signup" className="text-sm text-gray-400 mt-1 block">
          View all {post.comments} comments
        </Link>
      </div>
    </article>
  );
}

/* ─── Time Ago Helper ──────────────────────────────────────── */
function getTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return `${diffWeek}w`;
}

/* ─── Skeleton Loaders ──────────────────────────────────────── */
function StoriesRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="w-12 h-2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedPostSkeleton() {
  return (
    <div className="pb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="w-24 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
      <div className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse" />
      <div className="px-4 pt-3 space-y-2">
        <div className="w-20 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="w-2/3 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    </div>
  );
}
