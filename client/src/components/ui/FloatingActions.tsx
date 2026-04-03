import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Gift, Share2, UserPlus, UserCheck, MoreHorizontal, Bookmark } from 'lucide-react';

interface FloatingActionsProps {
  liked?: boolean;
  followed?: boolean;
  likeCount?: number;
  commentCount?: number;
  onLike?: () => void;
  onComment?: () => void;
  onGift?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
  onMore?: () => void;
  showFollow?: boolean;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n > 0 ? String(n) : '';
}

export function FloatingActions({
  liked = false,
  followed = false,
  likeCount = 0,
  commentCount = 0,
  onLike,
  onComment,
  onGift,
  onShare,
  onFollow,
  onMore,
  showFollow = false,
}: FloatingActionsProps) {
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);

  function handleLike() {
    onLike?.();
    const id = Date.now();
    setFloatingHearts(prev => [...prev, id]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h !== id)), 1500);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Follow */}
      {showFollow && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onFollow}
          className="relative"
        >
          <div className={`w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center ${
            followed ? 'border-brand-500 bg-brand-500/20' : 'border-white bg-black/40 backdrop-blur-sm'
          }`}>
            {followed
              ? <UserCheck className="w-5 h-5 text-brand-400" />
              : <UserPlus className="w-5 h-5 text-white" />
            }
          </div>
          {!followed && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold leading-none">+</span>
            </div>
          )}
        </motion.button>
      )}

      {/* Like */}
      <div className="relative flex flex-col items-center">
        <motion.button
          whileTap={{ scale: 1.3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          onClick={handleLike}
          className="w-12 h-12 flex items-center justify-center"
        >
          <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.3 }}>
            <Heart className={`w-8 h-8 drop-shadow-lg ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          </motion.div>
        </motion.button>
        <span className="text-white text-[11px] font-semibold -mt-1 drop-shadow-sm">{formatCount(likeCount) || 'Like'}</span>
        <AnimatePresence>
          {floatingHearts.map(id => (
            <motion.div
              key={id}
              initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              animate={{ opacity: 0, y: -100, x: Math.random() * 40 - 20, scale: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none"
            >
              <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Comment */}
      <motion.button whileTap={{ scale: 1.2 }} onClick={onComment} className="flex flex-col items-center">
        <div className="w-12 h-12 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" />
        </div>
        <span className="text-white text-[11px] font-semibold -mt-1 drop-shadow-sm">{formatCount(commentCount) || 'Chat'}</span>
      </motion.button>

      {/* Gift */}
      <motion.button whileTap={{ scale: 1.2 }} onClick={onGift} className="flex flex-col items-center">
        <div className="w-12 h-12 flex items-center justify-center">
          <Gift className="w-7 h-7 text-amber-400 drop-shadow-lg" />
        </div>
        <span className="text-white text-[11px] font-semibold -mt-1 drop-shadow-sm">Gift</span>
      </motion.button>

      {/* Share */}
      <motion.button whileTap={{ scale: 1.2 }} onClick={onShare} className="flex flex-col items-center">
        <div className="w-12 h-12 flex items-center justify-center">
          <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
        </div>
        <span className="text-white text-[11px] font-semibold -mt-1 drop-shadow-sm">Share</span>
      </motion.button>

      {/* More */}
      {onMore && (
        <motion.button whileTap={{ scale: 1.2 }} onClick={onMore}>
          <MoreHorizontal className="w-6 h-6 text-white/50" />
        </motion.button>
      )}
    </div>
  );
}
