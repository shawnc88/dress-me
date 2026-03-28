import Link from 'next/link';

interface Stream {
  id: string;
  title: string;
  description: string | null;
  status: string;
  streamType: string;
  viewerCount: number;
  peakViewers: number;
  muxPlaybackId: string | null;
  creator: {
    user: { username: string; displayName: string; avatarUrl: string | null };
  };
}

export function StreamFeedCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === 'LIVE';

  return (
    <Link
      href={`/stream/${stream.id}`}
      className="block group"
    >
      {/* Thumbnail — 9:16 vertical aspect on mobile, 16:9 on desktop grid */}
      <div className="relative aspect-[9/16] md:aspect-video bg-gradient-to-br from-brand-800 via-purple-900 to-black rounded-2xl overflow-hidden">
        {/* Mux thumbnail if available */}
        {stream.muxPlaybackId ? (
          <img
            src={`https://image.mux.com/${stream.muxPlaybackId}/thumbnail.jpg?time=5`}
            alt={stream.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/20 text-6xl">👗</span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Live badge */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="badge-live text-[10px] !px-2 !py-0.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {stream.viewerCount}
            </span>
          </div>
        )}

        {/* Tier badge */}
        {stream.streamType !== 'PUBLIC' && (
          <div className="absolute top-3 right-3">
            <span className="bg-amber-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
              {stream.streamType}
            </span>
          </div>
        )}

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-[10px] font-bold text-white overflow-hidden flex-shrink-0">
              {stream.creator.user.avatarUrl ? (
                <img src={stream.creator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                stream.creator.user.displayName.charAt(0)
              )}
            </div>
            <span className="text-white text-xs font-semibold truncate">
              {stream.creator.user.displayName}
            </span>
          </div>
          <p className="text-white text-sm font-medium line-clamp-2 leading-tight">
            {stream.title}
          </p>
        </div>

        {/* Right action rail (visible on hover/focus) */}
        <div className="absolute right-2 bottom-16 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton icon="❤️" />
          <ActionButton icon="💬" />
          <ActionButton icon="🔗" />
          <ActionButton icon="🧵" />
        </div>
      </div>
    </Link>
  );
}

function ActionButton({ icon }: { icon: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-sm cursor-pointer hover:bg-black/60 transition-colors">
      {icon}
    </div>
  );
}
