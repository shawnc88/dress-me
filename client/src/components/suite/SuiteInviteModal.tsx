import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Video, Clock, X, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface SuiteInviteModalProps {
  streamId: string;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  expiresAt: string;
}

export function SuiteInviteModal({ streamId, isOpen, onAccept, onDecline, expiresAt }: SuiteInviteModalProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [responding, setResponding] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!isOpen || !expiresAt) return;
    setExpired(false);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setExpired(true);
        // Auto-close after showing expired message for 3 seconds
        setTimeout(() => onDecline(), 3000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expiresAt, onDecline]);

  const handleAccept = useCallback(async () => {
    setResponding(true);
    try {
      await apiFetch(`/api/streams/${streamId}/suite/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept: true }),
      });
      onAccept();
    } catch (err: any) {
      alert(err.message || 'Failed to join suite');
    } finally {
      setResponding(false);
    }
  }, [streamId, onAccept]);

  const handleDecline = useCallback(async () => {
    setResponding(true);
    try {
      await apiFetch(`/api/streams/${streamId}/suite/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept: false }),
      });
      onDecline();
    } catch {} finally {
      setResponding(false);
    }
  }, [streamId, onDecline]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
          >
            <div className="w-full max-w-sm rounded-3xl bg-surface-dark border border-violet-500/20 p-6 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-violet-300" />
                </div>

                {/* Title */}
                <h2 className="text-white text-xl font-extrabold mb-1">You're Invited!</h2>
                <p className="text-white/50 text-sm mb-4">
                  Join the Dress Me Suite and appear live with the creator
                </p>

                {/* Timer */}
                <div className="flex items-center justify-center gap-1.5 mb-5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className={`text-sm font-bold tabular-nums ${
                    timeLeft < 30 ? 'text-red-400' : 'text-amber-300'
                  }`}>
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                  <span className="text-white/30 text-xs">remaining</span>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-5 text-left bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/50 text-xs">Your camera and microphone will be used</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Video className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/50 text-xs">You'll appear on-screen with the creator</span>
                  </div>
                </div>

                {/* Buttons */}
                {expired ? (
                  <div className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center">
                    Invite Expired
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDecline}
                      disabled={responding}
                      className="flex-1 py-3 rounded-xl bg-white/10 text-white/60 text-sm font-bold border border-white/10 disabled:opacity-50"
                    >
                      Decline
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAccept}
                      disabled={responding}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-brand-500 text-white text-sm font-bold shadow-lg shadow-violet-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {responding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Check className="w-4 h-4" /> Join Suite</>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
