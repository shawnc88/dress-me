import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassBottomSheet } from './GlassBottomSheet';
import { AlertTriangle, Ban, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'explicit', label: 'Explicit or sexual content' },
  { id: 'illegal', label: 'Illegal activity' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'other', label: 'Other' },
] as const;

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetStreamId?: string;
  targetName?: string;
}

export function ReportSheet({ open, onClose, targetUserId, targetStreamId, targetName }: ReportSheetProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [blocking, setBlocking] = useState(false);

  async function handleSubmit() {
    if (!reason) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/moderation/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetUserId: targetUserId || undefined,
          targetStreamId: targetStreamId || undefined,
          reason,
          details: details || undefined,
        }),
      });
      setSubmitted(true);
    } catch {
      // Still show success to not reveal moderation status
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBlock() {
    if (!targetUserId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    setBlocking(true);
    try {
      await fetch(`${API_URL}/api/moderation/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId }),
      });
    } catch {}
    setBlocking(false);
    onClose();
  }

  function handleClose() {
    setReason(null);
    setDetails('');
    setSubmitted(false);
    onClose();
  }

  return (
    <GlassBottomSheet open={open} onClose={handleClose} title={submitted ? undefined : 'Report'}>
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Report Submitted</h3>
          <p className="text-gray-500 text-sm mb-6">We&apos;ll review this within 24 hours</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleClose}
            className="btn-primary"
          >
            Done
          </motion.button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Why are you reporting {targetName ? `@${targetName}` : 'this content'}?
          </p>

          <div className="space-y-2">
            {REASONS.map((r) => (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setReason(r.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                  reason === r.id
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-400'
                    : 'border-white/5 bg-white/3 text-gray-300 hover:bg-white/5'
                }`}
              >
                {r.label}
              </motion.button>
            ))}
          </div>

          {reason === 'other' && (
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us more..."
              maxLength={1000}
              rows={3}
              className="input-field resize-none"
            />
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="w-full py-3 rounded-2xl bg-live text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            <AlertTriangle className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Report'}
          </motion.button>

          {targetUserId && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleBlock}
              disabled={blocking}
              className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-white/8 transition-all"
            >
              <Ban className="w-4 h-4" />
              {blocking ? 'Blocking...' : 'Block User'}
            </motion.button>
          )}
        </div>
      )}
    </GlassBottomSheet>
  );
}
