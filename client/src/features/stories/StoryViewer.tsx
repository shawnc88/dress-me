import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Story {
  id: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string;
  createdAt: string;
  viewCount: number;
}

interface StoryGroup {
  creatorId: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string };
  stories: Story[];
}

interface StoryViewerProps {
  groups: StoryGroup[];
  initialIndex: number;
  onClose: () => void;
}

export function StoryViewer({ groups, initialIndex, onClose }: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000; // 5 seconds per story

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const advance = useCallback(() => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(s => s + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(g => g + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, group?.stories.length, groups.length, onClose]);

  const goBack = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx(g => g - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [storyIdx, groupIdx]);

  // Auto-advance timer
  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(1, elapsed / DURATION));
      if (elapsed >= DURATION) advance();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx, advance]);

  // Track view
  useEffect(() => {
    if (!story) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/stories/${story.id}/view`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [story]);

  if (!group || !story) return null;

  // Tap left/right halves
  function handleTap(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) goBack();
    else advance();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] bg-black"
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2 safe-area-pt">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header: creator info + close */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-between px-4 safe-area-pt">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
              {group.user.avatarUrl ? (
                <img src={group.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/60">
                  {group.user.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="text-white text-xs font-semibold">{group.user.username}</p>
              <p className="text-white/40 text-[10px]">
                {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Media */}
        <div className="absolute inset-0" onClick={handleTap}>
          {story.mediaType === 'video' ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={false}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={story.id}
              src={story.mediaUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-20 left-0 right-0 z-10 px-6 text-center">
            <p className="text-white text-sm font-medium text-shadow">{story.caption}</p>
          </div>
        )}

        {/* Navigation arrows (desktop) */}
        {groupIdx > 0 && (
          <button onClick={goBack} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hidden md:flex">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {groupIdx < groups.length - 1 && (
          <button onClick={advance} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center hidden md:flex">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
