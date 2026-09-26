import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CATEGORIES } from '@/lib/categories';
import { Check, Sparkles } from 'lucide-react';
import { fetchWithTimeout } from '@/utils/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * First-session activation: pick interests → follow a few creators → land in
 * a warm feed. The Following tab must never start empty (cold-start rule).
 */
export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'interests' | 'creators'>('interests');
  const [picked, setPicked] = useState<string[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/auth/signup');
  }, [router]);

  async function loadCreators() {
    setLoading(true);
    try { localStorage.setItem('bwm_interests', JSON.stringify(picked)); } catch {}
    try {
      const res = await fetchWithTimeout(`${API_URL}/api/creators/suggested?categories=${encodeURIComponent(picked.join(','))}`);
      const data = res.ok ? await res.json() : null;
      setCreators(data?.creators || []);
    } catch {}
    setLoading(false);
    setStep('creators');
  }

  function toggleFollow(creatorId: string) {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    const next = !followedIds[creatorId];
    setFollowedIds(prev => ({ ...prev, [creatorId]: next }));
    fetch(`${API_URL}/api/feed/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ creatorId }),
    }).catch(() => setFollowedIds(prev => ({ ...prev, [creatorId]: !next })));
  }

  const followCount = Object.values(followedIds).filter(Boolean).length;

  return (
    <>
      <Head><title>Welcome - Be With Me</title></Head>
      <div className="fixed inset-0 celebration-canvas grain bg-ink-950 flex flex-col safe-area-pt safe-area-pb overflow-y-auto">
        <div className="max-w-[630px] w-full mx-auto px-6 py-10 flex-1 flex flex-col">

          {step === 'interests' && (
            <>
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent-cyan/90 mb-3">Welcome</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                What do you want to <span className="text-celebration">see live</span>?
              </h1>
              <p className="text-white/60 text-sm mb-8">Pick a few — we&apos;ll build your feed around them.</p>
              <div className="flex flex-wrap gap-2.5 mb-10">
                {CATEGORIES.map(c => {
                  const on = picked.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => setPicked(p => on ? p.filter(x => x !== c.id) : [...p, c.id])}
                      className={`min-h-[46px] px-4 py-2.5 rounded-full text-sm font-semibold border transition-all no-select ${
                        on ? 'bg-brand-500/25 border-brand-400/60 text-white shadow-glow' : 'bg-white/[0.05] border-white/10 text-white/60'
                      }`}
                    >
                      {c.icon} {c.label} {on && '✓'}
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto space-y-3">
                <button
                  onClick={loadCreators}
                  disabled={picked.length === 0 || loading}
                  className="w-full min-h-[52px] py-3.5 rounded-full gradient-celebration text-white text-base font-bold shadow-glow hover:brightness-110 disabled:opacity-40 transition-all no-select"
                >
                  {loading ? 'Loading…' : picked.length ? `Continue (${picked.length} picked)` : 'Pick at least one'}
                </button>
                <button onClick={() => router.replace('/')} className="w-full min-h-[44px] text-white/50 text-sm font-medium hover:text-white/80 transition-colors">
                  Skip for now
                </button>
              </div>
            </>
          )}

          {step === 'creators' && (
            <>
              <p className="text-[11px] uppercase tracking-[0.4em] text-accent-cyan/90 mb-3">Almost there</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Follow a few <span className="text-celebration">creators</span>
              </h1>
              <p className="text-white/60 text-sm mb-7">You&apos;ll get notified when they go live.</p>
              <div className="space-y-2.5 mb-8">
                {creators.length === 0 && (
                  <p className="text-white/50 text-sm text-center py-8">No creators to suggest yet — explore the feed and follow who you vibe with.</p>
                )}
                {creators.map(c => (
                  <div key={c.id} className="flex items-center gap-3 glass-card !rounded-2xl px-3.5 py-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-dark border border-white/10 flex-shrink-0">
                      {c.user?.avatarUrl ? (
                        <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-500/25 to-accent-violet/25 flex items-center justify-center text-white font-bold">
                          {(c.user?.displayName || '?').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{c.user?.displayName}</p>
                      <p className="text-white/50 text-xs truncate">@{c.user?.username}{c.category ? ` · ${c.category}` : ''}</p>
                    </div>
                    <button
                      onClick={() => toggleFollow(c.id)}
                      className={`min-h-[40px] px-4 rounded-full text-[13px] font-bold border transition-all no-select ${
                        followedIds[c.id]
                          ? 'bg-accent-green/15 border-accent-green/40 text-accent-green'
                          : 'bg-brand-500 border-brand-500 text-white shadow-glow'
                      }`}
                    >
                      {followedIds[c.id] ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Following</span> : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => router.replace('/')}
                  className="w-full min-h-[52px] py-3.5 rounded-full gradient-celebration text-white text-base font-bold shadow-glow hover:brightness-110 transition-all no-select flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {followCount > 0 ? `Let's go (following ${followCount})` : 'Take me to the feed'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
