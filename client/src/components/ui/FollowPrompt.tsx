import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface FollowPromptProps {
  streamId: string;
  creatorName: string;
  onFollow: () => void;
}

export function FollowPrompt({ streamId, creatorName, onFollow }: FollowPromptProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // Check after 20 seconds
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ shouldPrompt: boolean }>(`/api/growth/should-prompt-follow/${streamId}`);
        if (data.shouldPrompt) setVisible(true);
      } catch {}
    }, 20000);

    return () => clearTimeout(timer);
  }, [streamId, dismissed]);

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="absolute bottom-44 left-4 right-16 z-40"
        >
          <div className="bg-gradient-to-r from-brand-500/90 to-violet-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
            <button
              onClick={() => { setVisible(false); setDismissed(true); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Enjoying this stream?</p>
                <p className="text-white/70 text-xs">Follow {creatorName} to never miss a live</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { onFollow(); setVisible(false); setDismissed(true); }}
                className="bg-white text-brand-600 text-sm font-bold px-4 py-2 rounded-xl flex-shrink-0"
              >
                Follow
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
