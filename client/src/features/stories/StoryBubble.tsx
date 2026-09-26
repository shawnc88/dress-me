import { motion } from 'framer-motion';

interface StoryBubbleProps {
  username: string;
  displayName: string;
  avatarUrl?: string;
  hasUnviewed?: boolean;
  isOwn?: boolean;
  onClick: () => void;
}

export function StoryBubble({ username, displayName, avatarUrl, hasUnviewed = true, isOwn, onClick }: StoryBubbleProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0 w-[84px]"
    >
      <div className={`w-20 h-20 rounded-full p-[3px] ${
        hasUnviewed
          ? 'bg-gradient-to-br from-pink-500 via-red-500 to-amber-500'
          : 'bg-gray-700'
      }`}>
        <div className="w-full h-full rounded-full bg-surface-dark p-[2px]">
          <div className="w-full h-full rounded-full overflow-hidden bg-white/10">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-secondary">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="text-[11px] text-primary truncate w-full text-center">
        {isOwn ? 'Your Story' : username}
      </span>
    </motion.button>
  );
}
