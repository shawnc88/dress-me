import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, Shirt } from 'lucide-react';

interface CreatorCardProps {
  streamId: string;
  title: string;
  creatorName: string;
  creatorUsername: string;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  muxPlaybackId?: string | null;
  isLive?: boolean;
  viewerCount?: number;
  streamType?: string;
  category?: string;
}

export function CreatorCard({
  streamId,
  title,
  creatorName,
  creatorUsername,
  avatarUrl,
  muxPlaybackId,
  isLive = false,
  viewerCount = 0,
  streamType = 'PUBLIC',
  category,
}: CreatorCardProps) {
  const thumbnail = muxPlaybackId
    ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=5&width=640&height=1136&fit_mode=crop`
    : null;

  return (
    <Link href={`/stream/${streamId}`} className="block group no-select">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="relative aspect-[9/16] rounded-4xl overflow-hidden bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 shadow-couture"
      >
        {/* Thumbnail */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div
              className="w-16 h-16 rounded-full bg-gold-300/[0.07] border border-gold-300/20 flex items-center justify-center animate-glow-breathe"
              aria-hidden
            >
              <Shirt className="w-7 h-7 text-gold-300/40" />
            </div>
          </div>
        )}

        {/* Cinematic gradient — deep ink floor, soft crown */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/10 to-ink-950/40 pointer-events-none" />

        {/* Gold hairline frame + inner glass edge */}
        <div
          className="absolute inset-0 rounded-4xl border border-white/10 pointer-events-none z-10"
          aria-hidden
        />
        <div
          className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-gold-300/50 to-transparent pointer-events-none z-10"
          aria-hidden
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.14em] uppercase bg-live text-white shadow-glow-live">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Live
              </span>
            )}
            {isLive && viewerCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-black/40 backdrop-blur-md border border-white/10 text-white/90">
                <Eye className="w-3 h-3" />
                {viewerCount.toLocaleString()}
              </span>
            )}
          </div>
          {streamType !== 'PUBLIC' && (
            <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.14em] bg-gold-300/90 text-ink-950 backdrop-blur-sm shadow-gold-sm">
              {streamType}
            </span>
          )}
        </div>

        {/* Bottom info — editorial voice */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ${
                isLive ? 'ring-live' : 'ring-1 ring-gold-300/40'
              }`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-brand-800 to-ink-900 flex items-center justify-center text-xs font-bold text-gold-200">
                  {creatorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="editorial text-white text-[15px] truncate">{creatorName}</p>
              <p className="text-gold-300/70 text-[10px] tracking-wide">@{creatorUsername}</p>
            </div>
          </div>
          <p className="text-white/90 text-[13px] font-medium line-clamp-2 leading-snug">
            {title}
          </p>
          {category && (
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-[0.14em] bg-black/30 backdrop-blur-sm border border-gold-300/25 text-gold-200/80">
              {category}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
