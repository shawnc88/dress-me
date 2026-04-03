import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, X } from 'lucide-react';
import { apiFetch } from '@/utils/api';

export function StreakBanner() {
  const [visible, setVisible] = useState(false);
  const [streakData, setStreakData] = useState<{ currentStreak: number; reward: number; badge: string | null } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    apiFetch<{ streak: any; reward: number; badge: string | null; alreadyCheckedIn?: boolean }>('/api/growth/streak-checkin', {
      method: 'POST',
    })
      .then((data) => {
        if (!data.alreadyCheckedIn && data.reward > 0) {
          setStreakData({
            currentStreak: data.streak.currentStreak,
            reward: data.reward,
            badge: data.badge,
          });
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && streakData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-4 right-4 z-50 max-w-[600px] mx-auto"
        >
          <div className="bg-gradient-to-r from-orange-500/90 to-amber-500/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
            <button
              onClick={() => setVisible(false)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold">
                  {streakData.currentStreak} Day Streak!
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Gift className="w-3.5 h-3.5 text-white/80" />
                  <p className="text-white/80 text-xs">+{streakData.reward} threads earned</p>
                </div>
                {streakData.badge && (
                  <p className="text-white/70 text-[10px] mt-0.5">New badge unlocked: {streakData.badge}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
