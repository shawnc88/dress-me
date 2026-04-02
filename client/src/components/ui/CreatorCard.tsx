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
    <Link href={`/stream/${streamId}`} className="block group">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-brand-800 via-purple-900 to-black shadow-lg"
      >
        {/* Thumbnail */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt className="w-16 h-16 text-white/10" />
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500 text-white">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {isLive && viewerCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-black/50 backdrop-blur-sm text-white">
                <Eye className="w-3 h-3" />
                {viewerCount.toLocaleString()}
              </span>
            )}
          </div>
          {streamType !== 'PUBLIC' && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/90 text-white backdrop-blur-sm">
              {streamType}
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 ${isLive ? 'border-red-500' : 'border-white/30'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand-500/30 backdrop-blur flex items-center justify-center text-xs font-bold text-white">
                  {creatorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{creatorName}</p>
              <p className="text-white/50 text-[10px]">@{creatorUsername}</p>
            </div>
          </div>
          <p className="text-white text-sm font-medium line-clamp-2 leading-snug">{title}</p>
          {category && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-medium bg-white/10 backdrop-blur-sm text-white/70">
              {category}
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
