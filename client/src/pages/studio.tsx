import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radio, GraduationCap, Film, PenSquare } from 'lucide-react';

/**
 * Studio — the create-everything surface (TikTok-structure: one hub, a bottom
 * mode carousel, one primary action). Reached by swiping the home feed
 * right-to-left (IG-style gesture) or any "create" entry point.
 * Phase 2 drops a live camera preview behind this chrome.
 */

interface Mode {
  id: string;
  label: string;
  icon: typeof Radio;
  emblem: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  tone: string; // tailwind color classes for the emblem ring
}

const MODES: Mode[] = [
  {
    id: 'live', label: 'LIVE', icon: Radio, emblem: '🔴',
    title: 'Go live',
    desc: 'Open a room and be with your people — gifts, chat, and the party.',
    cta: 'Set up camera', href: '/dashboard/go-live',
    tone: 'bg-live/15 border-live/40 shadow-glow',
  },
  {
    id: 'class', label: 'CLASS', icon: GraduationCap, emblem: '🎓',
    title: 'Teach a class',
    desc: 'Schedule a live session — cooking, fitness, music, anything you know.',
    cta: 'Schedule class', href: '/dashboard/go-live?mode=class',
    tone: 'bg-accent-cyan/15 border-accent-cyan/40 shadow-glow-cyan',
  },
  {
    id: 'reel', label: 'REEL', icon: Film, emblem: '🎬',
    title: 'New reel',
    desc: 'Post a short video — it lands in the feed and Explore.',
    cta: 'Pick a video', href: '/create-reel',
    tone: 'bg-accent-magenta/15 border-accent-magenta/40 shadow-glow-magenta',
  },
  {
    id: 'post', label: 'POST', icon: PenSquare, emblem: '✍️',
    title: 'New post',
    desc: 'Share an update with your followers.',
    cta: 'Write post', href: '/create',
    tone: 'bg-brand-500/15 border-brand-400/40 shadow-glow',
  },
];

export default function Studio() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const mode = MODES[active];

  return (
    <>
      <Head><title>Create - Be With Me</title></Head>
      <div className="fixed inset-0 celebration-canvas grain bg-ink-950 flex flex-col safe-area-pt safe-area-pb">

        {/* Close */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={() => router.back()}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all no-select"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center emblem — swaps with the selected mode */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode.id}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center"
            >
              <div className={`w-24 h-24 rounded-full border flex items-center justify-center text-4xl mb-6 ${mode.tone}`}>
                {mode.emblem}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{mode.title}</h1>
              <p className="text-white/45 text-sm leading-relaxed max-w-xs">{mode.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Primary CTA */}
        <div className="px-6 mb-5">
          <button
            onClick={() => router.push(mode.href)}
            className="w-full min-h-[52px] py-3.5 rounded-full gradient-celebration text-white text-base font-bold shadow-glow hover:brightness-110 active:scale-[0.98] transition-all no-select"
          >
            {mode.cta}
          </button>
        </div>

        {/* Mode carousel — the TikTok bottom selector */}
        <div className="pb-4">
          <div className="flex justify-center gap-2 px-6">
            {MODES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActive(i)}
                className={`min-h-[44px] px-4 py-2 rounded-full text-[13px] font-bold tracking-wide border transition-all no-select flex items-center gap-1.5 ${
                  i === active
                    ? 'bg-white text-ink-950 border-white'
                    : 'bg-white/[0.05] border-white/10 text-white/50'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" /> {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
