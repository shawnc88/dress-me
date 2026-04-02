import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassBottomSheet } from './GlassBottomSheet';
import { Copy, Check, Link2, MessageCircle, Share2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  streamId?: string;
  creatorName?: string;
  title?: string;
}

export function ShareSheet({ open, onClose, streamId, creatorName, title }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generateLink() {
    const token = localStorage.getItem('token');
    if (!token) {
      // For non-logged-in users, share the direct stream link
      const link = streamId
        ? `${window.location.origin}/stream/${streamId}`
        : window.location.origin;
      setReferralLink(link);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/viral/referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ streamId: streamId || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setReferralLink(data.link);
      }
    } catch {
      const link = streamId
        ? `${window.location.origin}/stream/${streamId}`
        : window.location.origin;
      setReferralLink(link);
    } finally {
      setGenerating(false);
    }
  }

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    const link = referralLink || (streamId ? `${window.location.origin}/stream/${streamId}` : window.location.origin);
    const text = creatorName
      ? `Watch ${creatorName} live on Dress Me! ${title || ''}`
      : 'Check out Dress Me - Live Fashion Streaming!';

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dress Me', text, url: link });
      } catch {}
    } else {
      navigator.clipboard.writeText(`${text}\n${link}`).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Generate link on open
  if (open && !referralLink && !generating) {
    generateLink();
  }

  return (
    <GlassBottomSheet open={open} onClose={() => { onClose(); setReferralLink(null); setCopied(false); }} title="Share">
      <div className="space-y-4">
        {/* Share preview */}
        <div className="bg-white/5 rounded-2xl p-4">
          <p className="text-white font-semibold text-sm mb-1">
            {creatorName ? `Watch @${creatorName} live` : 'Dress Me'}
          </p>
          <p className="text-gray-500 text-xs">{title || 'Live Fashion Streaming'}</p>
        </div>

        {/* Link copy */}
        {referralLink && (
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-2xl px-4 py-3 text-xs text-gray-400 truncate flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
              {referralLink}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={copyLink}
              className={`px-4 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                copied ? 'bg-green-500/20 text-green-400' : 'bg-brand-500 text-white'
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </motion.button>
          </div>
        )}

        {/* Share actions */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={nativeShare}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-sm font-medium hover:bg-white/8 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={copyLink}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-white text-sm font-medium hover:bg-white/8 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </motion.button>
        </div>

        {/* Referral reward hint */}
        <p className="text-center text-gray-600 text-[10px]">
          Share and earn 50 free coins when friends join!
        </p>
      </div>
    </GlassBottomSheet>
  );
}
