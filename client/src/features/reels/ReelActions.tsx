import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, UserPlus } from 'lucide-react';

interface ReelActionsProps {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onFollow: () => void;
  showFollow?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function ReelActions({ liked, likesCount, commentsCount, sharesCount, onLike, onComment, onShare, onFollow, showFollow }: ReelActionsProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      {showFollow && (
        <motion.button whileTap={{ scale: 0.8 }} onClick={onFollow} className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
        </motion.button>
      )}

      <motion.button whileTap={{ scale: 0.8 }} onClick={onLike} className="flex flex-col items-center gap-1">
        <Heart className={`w-7 h-7 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        <span className="text-[10px] text-white/70 font-semibold">{formatCount(likesCount)}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.8 }} onClick={onComment} className="flex flex-col items-center gap-1">
        <MessageCircle className="w-7 h-7 text-white" />
        <span className="text-[10px] text-white/70 font-semibold">{formatCount(commentsCount)}</span>
      </motion.button>

      <motion.button whileTap={{ scale: 0.8 }} onClick={onShare} className="flex flex-col items-center gap-1">
        <Share2 className="w-6 h-6 text-white" />
        <span className="text-[10px] text-white/70 font-semibold">{formatCount(sharesCount)}</span>
      </motion.button>
    </div>
  );
}
