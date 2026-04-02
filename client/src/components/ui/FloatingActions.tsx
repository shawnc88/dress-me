import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Gift, Share2, UserPlus, UserCheck, MoreHorizontal } from 'lucide-react';

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
    setFloatingHearts((prev) => [...prev, id]);
    setTimeout(() => setFloatingHearts((prev) => prev.filter((h) => h !== id)), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {showFollow && (
        <ActionItem
          icon={followed
            ? <UserCheck className="w-6 h-6 text-brand-500" />
            : <UserPlus className="w-6 h-6 text-white" />
          }
          label={followed ? 'Following' : 'Follow'}
          onClick={onFollow}
        />
      )}

      <div className="relative">
        <ActionItem
          icon={<Heart className={`w-6 h-6 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />}
          label={likeCount > 0 ? likeCount.toLocaleString() : 'Like'}
          onClick={handleLike}
        />
        <AnimatePresence>
          {floatingHearts.map((id) => (
            <motion.div
              key={id}
              initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              animate={{ opacity: 0, y: -120, x: Math.random() * 40 - 20, scale: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
            >
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ActionItem
        icon={<MessageCircle className="w-6 h-6 text-white" />}
        label={commentCount > 0 ? commentCount.toLocaleString() : 'Chat'}
        onClick={onComment}
      />

      <ActionItem icon={<Gift className="w-6 h-6 text-amber-400" />} label="Gift" onClick={onGift} />
      <ActionItem icon={<Share2 className="w-6 h-6 text-white" />} label="Share" onClick={onShare} />

      {onMore && (
        <ActionItem icon={<MoreHorizontal className="w-6 h-6 text-white/60" />} label="More" onClick={onMore} />
      )}
    </div>
  );
}

function ActionItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 1.3 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
        {icon}
      </div>
      <span className="text-white text-[10px] font-medium drop-shadow-sm">{label}</span>
    </motion.button>
  );
}
