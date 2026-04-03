import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SmartFollowPromptProps {
  creatorId: string;
  creatorName: string;
  avatarUrl?: string;
  watchTimeMs: number; // how long viewer has been watching
  interactionCount: number; // likes + comments
}

export function SmartFollowPrompt({ creatorId, creatorName, avatarUrl, watchTimeMs, interactionCount }: SmartFollowPromptProps) {
  const [show, setShow] = useState(false);
  const [following, setFollowing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const triggeredRef = useRef(false);

  // Show prompt after 25s watch time OR 2+ interactions
  useEffect(() => {
    if (triggeredRef.current || dismissed || following) return;
    if (watchTimeMs > 25000 || interactionCount >= 2) {
      triggeredRef.current = true;
      setShow(true);
      // Auto-hide after 10s
      const timer = setTimeout(() => setShow(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [watchTimeMs, interactionCount, dismissed, following]);

  async function handleFollow() {
    const token = localStorage.getItem('token');
    if (!token) return;
    setFollowing(true);
    setShow(false);

    // Track as feed event
    fetch(`${API_URL}/api/feed/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contentId: creatorId, contentType: 'stream', creatorId, event: 'follow' }),
    }).catch(() => {});

    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId }),
    }).catch(() => {});
  }

  if (!show || dismissed || following) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-28 left-4 right-4 z-50"
      >
        <div className="bg-gradient-to-r from-brand-500/90 to-violet-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
          <button
            onClick={() => { setDismissed(true); setShow(false); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                  {creatorName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">Enjoying {creatorName}?</p>
              <p className="text-white/70 text-xs">Follow to never miss a live</p>
            </div>
            <button
              onClick={handleFollow}
              className="bg-white text-brand-600 text-sm font-bold px-4 py-2 rounded-xl flex-shrink-0 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Follow
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
