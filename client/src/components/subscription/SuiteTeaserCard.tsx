import { motion } from 'framer-motion';
import { Video, Crown, Sparkles, Users, ArrowRight } from 'lucide-react';

interface SuiteTeaserCardProps {
  creatorName: string;
  onSubscribe: () => void;
}

export function SuiteTeaserCard({ creatorName, onSubscribe }: SuiteTeaserCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-violet-500/10 via-brand-500/5 to-amber-500/5 border border-violet-500/15 p-4 relative overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-brand-500/30 flex items-center justify-center">
            <Video className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h3 className="text-white text-sm font-bold">Dress Me Suite</h3>
            <p className="text-white/40 text-[10px]">Premium live interaction</p>
          </div>
        </div>

        {/* Suite description */}
        <p className="text-white/50 text-xs leading-relaxed mb-3">
          VIP and Inner Circle fans can be selected to join {creatorName} live in a
          FaceTime-style Suite — give style feedback, get recognized, and interact face-to-face.
        </p>

        {/* Tier access info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs">
            <Crown className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300 font-medium">VIP</span>
            <span className="text-white/30">— Priority Suite access</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 font-medium">Inner Circle</span>
            <span className="text-white/30">— Highest priority</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-white/30" />
            <span className="text-white/40">Limited spots per session</span>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSubscribe}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-500/30 to-brand-500/30 border border-violet-500/30 text-white text-xs font-bold flex items-center justify-center gap-2 hover:from-violet-500/40 hover:to-brand-500/40 transition-all"
        >
          Subscribe for Suite Access <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}
