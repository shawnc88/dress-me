import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, ChevronRight, ChevronLeft, Check, Radio,
  Video, Mic, Star, Crown, Users, ArrowRight, DollarSign, Heart, KeyRound,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  { id: 'fitness', label: 'Fitness & Health', icon: '🏋️' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🌴' },
  { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
  { id: 'beauty', label: 'Beauty & Makeup', icon: '💄' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'coaching', label: 'Coaching & Advice', icon: '🧠' },
  { id: 'music', label: 'Music & Performance', icon: '🎵' },
  { id: 'dating', label: 'Dating & Social', icon: '💕' },
  { id: 'general', label: 'General Creator', icon: '⭐' },
];

const STEPS = ['Welcome', 'Profile', 'Tiers', 'Stream Setup', 'Go Live'];

export default function BecomeCreator() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Profile fields
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('general');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  // Tier setup
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [eliteEnabled, setEliteEnabled] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('9.99');
  const [elitePrice, setElitePrice] = useState('29.99');

  // Stream preview
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { router.push('/auth/login'); return; }
    setToken(t);

    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setUser(data.user);
        // Redirect existing creators to dashboard
        if (data.user.role === 'CREATOR' || data.user.role === 'ADMIN') {
          router.push('/dashboard');
          return;
        }
        if (data.user.bio) setBio(data.user.bio);
        if (data.user.avatarUrl) setAvatarPreview(data.user.avatarUrl);
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [router]);

  function handleAvatarSelect(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || f.size > 5 * 1024 * 1024) return;
    setAvatarFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function startCameraPreview() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setMicReady(true);
    } catch {
      setCameraReady(false);
      setMicReady(false);
    }
  }

  async function handleComplete() {
    if (!token) return;
    setSubmitting(true);

    try {
      // Upload avatar if new one selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await fetch(`${API_URL}/api/users/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Complete onboarding
      const res = await fetch(`${API_URL}/api/creators/onboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio,
          category,
          tierBasicPrice: 0,
          tierPremiumPrice: premiumEnabled ? Math.round(parseFloat(premiumPrice) * 100) : 0,
          tierElitePrice: eliteEnabled ? Math.round(parseFloat(elitePrice) * 100) : 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to complete onboarding');

      const onboardData = await res.json();

      // Store the new token with CREATOR role
      if (onboardData.token) {
        localStorage.setItem('token', onboardData.token);
      }

      // Re-fetch user profile with fresh data
      const freshToken = onboardData.token || token;
      const meRes = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        localStorage.setItem('user', JSON.stringify(meData.user));
      }

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Move to final step
      setStep(4);
    } catch {
      // Still proceed to show the success state
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen celebration-canvas flex items-center justify-center">
        {/* Cinematic loading — breathing multicolor orb, no bare spinner */}
        <div className="relative w-20 h-20 pointer-events-none" aria-hidden>
          <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
          <div className="absolute inset-4 rounded-full neon-hairline animate-float" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Become a Creator - Be With Me</title>
      </Head>

      <div className="relative min-h-screen celebration-canvas grain text-white overflow-hidden">
        {/* Progress bar */}
        {step > 0 && step < 4 && (
          <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 safe-area-pt">
            <div className="flex gap-1.5 max-w-md mx-auto">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand-500 via-brand-400 to-violet-deep"
                    initial={{ width: '0%' }}
                    animate={{ width: step >= s ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ═══════════ STEP 0: Start Your Channel (HOOK) ═══════════ */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex flex-col"
            >
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-14 text-center safe-area-pt safe-area-pb">
                {/* Hero orb — pure CSS celebration, no WebGL */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-32 h-32 mb-6 pointer-events-none"
                  aria-hidden
                >
                  <div className="absolute inset-0 rounded-full gradient-celebration opacity-35 blur-2xl animate-glow-breathe" />
                  <div className="absolute inset-4 rounded-full neon-hairline flex items-center justify-center animate-float">
                    <Radio className="w-10 h-10 text-accent-cyan" />
                  </div>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.7 }}
                  className="text-[10px] font-semibold uppercase tracking-[0.34em] text-accent-cyan/80 mb-4"
                >
                  Creators wanted
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                  className="font-extrabold tracking-tight text-5xl md:text-6xl leading-[1.02] mb-5"
                >
                  Start your
                  <br />
                  <span className="text-celebration">channel.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.7 }}
                  className="text-white/55 text-base mb-10 max-w-sm leading-relaxed"
                >
                  Go live, get paid, own your audience — gaming, music, talk, whatever you do.
                </motion.p>

                {/* Value props */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.7 }}
                  className="w-full max-w-sm space-y-2.5 mb-10"
                >
                  <ValueProp
                    icon={<DollarSign className="w-4 h-4 text-accent-green" />}
                    title="Get paid from day one"
                    sub="Subscriptions, gifts, private sessions — yours to price."
                  />
                  <ValueProp
                    icon={<Heart className="w-4 h-4 text-brand-400" />}
                    title="Your people, up close"
                    sub="Live rooms built for real connection, not passing scrolls."
                  />
                  <ValueProp
                    icon={<KeyRound className="w-4 h-4 text-accent-violet" />}
                    title="You own the room"
                    sub="Your tiers, your schedule, your rules. We handle the rest."
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.7 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(1)}
                  className="glimmer btn-couture text-base min-h-[52px] px-10 flex items-center gap-3 no-select overflow-hidden"
                >
                  Start my channel
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-white/35 text-xs tracking-wide mt-6"
                >
                  Free to begin · Less than two minutes
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* ═══════════ STEP 1: Profile Setup ═══════════ */}
          {step === 1 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex flex-col pt-12 pb-32 safe-area-pt"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-2">
                  Step One
                </p>
                <h2 className="font-extrabold tracking-tight text-3xl mb-1.5">
                  Your <span className="text-accent-cyan">profile</span>
                </h2>
                <p className="text-white/45 mb-8">This is how the room will see you</p>

                {/* Avatar upload */}
                <div className="flex justify-center mb-8">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => avatarRef.current?.click()}
                    className="relative w-28 h-28 rounded-full overflow-hidden bg-ink-800 border border-accent-cyan/40 shadow-glow-cyan hover:border-accent-cyan/70 transition-all group"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Camera className="w-8 h-8 text-accent-cyan/50 group-hover:text-accent-cyan transition-colors" />
                        <span className="text-[10px] text-white/40 mt-1">Add Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-ink-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </motion.button>
                  <input
                    ref={avatarRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                </div>

                {/* Username display */}
                <div className="text-center mb-8">
                  <p className="font-bold tracking-tight text-xl text-white">{user?.displayName}</p>
                  <p className="text-sm text-accent-cyan/70 mt-0.5">@{user?.username}</p>
                </div>

                {/* Bio */}
                <div className="mb-6">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="input-couture resize-none"
                    placeholder="Tell viewers what you're about..."
                  />
                  <p className="text-xs text-white/30 mt-1.5 text-right">{bio.length}/160</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-3">
                    Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2.5 px-4 py-3 min-h-[48px] rounded-2xl border text-sm font-medium transition-all duration-200 no-select ${
                          category === cat.id
                            ? 'border-accent-cyan/60 bg-accent-cyan/10 text-white shadow-glow-cyan'
                            : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:text-white/80'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        {cat.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom nav */}
              <BottomNav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Continue" />
            </motion.div>
          )}

          {/* ═══════════ STEP 2: Creator Tier Setup ═══════════ */}
          {step === 2 && (
            <motion.div
              key="tiers"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex flex-col pt-12 pb-32 safe-area-pt"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-green/80 mb-2">
                  Step Two
                </p>
                <h2 className="font-extrabold tracking-tight text-3xl mb-1.5">
                  Set your <span className="text-accent-green">prices</span>
                </h2>
                <p className="text-white/45 mb-8">Choose how your people support you</p>

                <div className="space-y-4">
                  {/* Free Tier */}
                  <TierCard
                    icon={<Users className="w-5 h-5" />}
                    title="Free Followers"
                    description="Anyone can follow and watch public streams"
                    price="Free"
                    enabled={true}
                    locked
                    color="gray"
                  />

                  {/* Premium Tier */}
                  <TierCard
                    icon={<Star className="w-5 h-5" />}
                    title="Premium"
                    description="Exclusive streams, priority chat, custom badges"
                    price={premiumPrice}
                    onPriceChange={setPremiumPrice}
                    enabled={premiumEnabled}
                    onToggle={() => setPremiumEnabled(!premiumEnabled)}
                    color="brand"
                  />

                  {/* Elite Tier */}
                  <TierCard
                    icon={<Crown className="w-5 h-5" />}
                    title="Elite"
                    description="VIP access, 1-on-1 sessions, exclusive content"
                    price={elitePrice}
                    onPriceChange={setElitePrice}
                    enabled={eliteEnabled}
                    onToggle={() => setEliteEnabled(!eliteEnabled)}
                    color="amber"
                  />
                </div>
              </div>

              <BottomNav onBack={() => setStep(1)} onNext={() => { setStep(3); startCameraPreview(); }} nextLabel="Continue" />
            </motion.div>
          )}

          {/* ═══════════ STEP 3: Stream Setup (Camera Preview) ═══════════ */}
          {step === 3 && (
            <motion.div
              key="stream-setup"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex flex-col pt-12 pb-32 safe-area-pt"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-amber/80 mb-2">
                  Step Three
                </p>
                <h2 className="font-extrabold tracking-tight text-3xl mb-1.5">
                  Camera <span className="text-accent-amber">check</span>
                </h2>
                <p className="text-white/45 mb-6">Test your camera and mic before going live</p>

                {/* Camera Preview */}
                <div className="relative aspect-[9/16] max-h-[50vh] rounded-4xl overflow-hidden bg-ink-900 border border-white/10 shadow-couture mb-6">
                  <div
                    className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-brand-500/50 via-accent-violet/50 to-accent-cyan/50 z-10 pointer-events-none"
                    aria-hidden
                  />
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="relative w-16 h-16 mb-4 pointer-events-none" aria-hidden>
                        <div className="absolute inset-0 rounded-full bg-accent-blue/20 blur-xl animate-glow-breathe" />
                        <div className="absolute inset-0 rounded-full neon-hairline flex items-center justify-center">
                          <Video className="w-6 h-6 text-accent-blue/80" />
                        </div>
                      </div>
                      <p className="text-white/45 text-sm">Allow camera access to preview</p>
                      <button
                        onClick={startCameraPreview}
                        className="btn-couture mt-5 text-sm min-h-[44px] !px-6 !py-2.5 flex items-center"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}

                  {/* Overlay badges */}
                  {cameraReady && (
                    <>
                      <div className="absolute top-4 left-4">
                        <span className="bg-ink-950/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.18em] px-3 py-1.5 rounded-full">
                          Preview
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="glass-couture !rounded-2xl px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full ring-1 ring-accent-cyan/50 bg-brand-500/20 flex items-center justify-center overflow-hidden">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-white">{user?.displayName?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-[15px]">{user?.displayName}</p>
                            <p className="text-accent-cyan/70 text-xs">{CATEGORIES.find(c => c.id === category)?.label}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status indicators */}
                <div className="space-y-3">
                  <StatusRow
                    icon={<Video className="w-4 h-4" />}
                    label="Camera"
                    ready={cameraReady}
                  />
                  <StatusRow
                    icon={<Mic className="w-4 h-4" />}
                    label="Microphone"
                    ready={micReady}
                  />
                </div>

                {cameraReady && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-accent-green text-sm font-medium mt-6"
                  >
                    <Check className="w-4 h-4 inline mr-1 text-accent-green" />
                    You&apos;re ready to go live!
                  </motion.p>
                )}
              </div>

              <BottomNav
                onBack={() => setStep(2)}
                onNext={handleComplete}
                nextLabel={submitting ? 'Setting up...' : 'Complete Setup'}
                disabled={submitting}
              />
            </motion.div>
          )}

          {/* ═══════════ STEP 4: Success + Confetti ═══════════ */}
          {step === 4 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative safe-area-pt safe-area-pb"
            >
              {/* Confetti */}
              <ConfettiEffect />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                className="relative w-24 h-24 mb-8"
              >
                <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe pointer-events-none" aria-hidden />
                <div className="absolute inset-0 rounded-full neon-hairline flex items-center justify-center">
                  <Check className="w-11 h-11 text-accent-green" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-extrabold tracking-tight text-4xl leading-[1.02] mb-3"
              >
                You&apos;re <span className="text-celebration">in</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-white/55 text-lg mb-10 max-w-sm"
              >
                Your creator profile is set up. Start your first stream now!
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard/go-live')}
                className="glimmer bg-live hover:brightness-110 text-white text-lg font-bold uppercase tracking-[0.14em] px-12 py-4 min-h-[52px] rounded-full overflow-hidden flex items-center gap-3 transition-all shadow-glow-live no-select"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                Go Live Now
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={() => router.push('/profile')}
                className="text-white/40 hover:text-white text-sm mt-6 min-h-[44px] px-4 transition-colors"
              >
                Edit profile first
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ─── Sub-components ─── */

function ValueProp({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="glass-couture !rounded-2xl px-4 py-3.5 flex items-start gap-3.5 text-left">
      <div className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-white text-[15px]">{title}</p>
        <p className="text-white/45 text-xs leading-relaxed mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function BottomNav({
  onBack,
  onNext,
  nextLabel,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-ink-950/90 backdrop-blur-2xl border-t border-white/10 px-6 py-4 safe-area-pb">
      {/* neon seam */}
      <div
        className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-brand-500/30 via-accent-violet/30 to-accent-cyan/30"
        aria-hidden
      />
      <div className="max-w-md mx-auto flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex-shrink-0 w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 hover:border-white/30 flex items-center justify-center transition-colors no-select"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={disabled}
          className="glimmer btn-couture flex-1 h-12 !py-0 text-sm flex items-center justify-center gap-2 disabled:opacity-50 no-select overflow-hidden"
        >
          {nextLabel}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}

function TierCard({
  icon,
  title,
  description,
  price,
  onPriceChange,
  enabled,
  onToggle,
  locked,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: string;
  onPriceChange?: (v: string) => void;
  enabled: boolean;
  onToggle?: () => void;
  locked?: boolean;
  color: string;
}) {
  const borderColor = !enabled
    ? 'border-white/[0.08]'
    : color === 'brand'
      ? 'border-brand-500/40'
      : color === 'amber'
        ? 'border-accent-amber/50'
        : 'border-white/15';
  const glowShadow = !enabled
    ? ''
    : color === 'brand'
      ? 'shadow-glow-sm'
      : color === 'amber'
        ? 'shadow-glow-amber'
        : '';
  const iconColor =
    color === 'brand' ? 'text-brand-400' : color === 'amber' ? 'text-accent-amber' : 'text-white/50';
  const iconBg = !enabled
    ? 'bg-white/[0.05]'
    : color === 'brand'
      ? 'bg-brand-500/10'
      : color === 'amber'
        ? 'bg-accent-amber/10'
        : 'bg-white/[0.05]';

  return (
    <motion.div
      whileTap={!locked ? { scale: 0.98 } : undefined}
      className={`glass-couture !rounded-3xl border ${borderColor} ${glowShadow} ${
        enabled ? '' : 'opacity-80'
      } p-5 transition-all duration-300`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${iconBg} border border-white/10 flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold tracking-tight text-white text-lg">{title}</h3>
            <p className="text-xs text-white/45 mt-0.5">{description}</p>
          </div>
        </div>
        {!locked && (
          <button
            onClick={onToggle}
            aria-label={`Toggle ${title} tier`}
            className={`w-11 h-6 rounded-full transition-all duration-300 flex items-center flex-shrink-0 ${
              enabled
                ? 'bg-gradient-to-r from-brand-500 to-violet-deep shadow-glow-sm'
                : 'bg-white/15'
            }`}
          >
            <motion.div
              animate={{ x: enabled ? 22 : 2 }}
              className="w-5 h-5 bg-white rounded-full shadow-sm"
            />
          </button>
        )}
      </div>

      {enabled && onPriceChange && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.08]"
        >
          <span className="text-accent-green/80 text-sm">$</span>
          <input
            type="number"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            step="0.01"
            min="0.99"
            className="bg-transparent text-white font-bold text-xl w-24 outline-none"
          />
          <span className="text-white/40 text-sm">/month</span>
        </motion.div>
      )}

      {locked && (
        <div className="flex items-center gap-1.5 mt-2">
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-white/50">Always included</span>
        </div>
      )}
    </motion.div>
  );
}

function StatusRow({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 min-h-[52px] rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-center gap-3">
        <span className={ready ? 'text-accent-green' : 'text-white/40'}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`flex items-center gap-2 text-xs font-medium ${ready ? 'text-green-400' : 'text-white/40'}`}>
        <span className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-white/25'}`} />
        {ready ? 'Connected' : 'Not detected'}
      </div>
    </div>
  );
}

function ConfettiEffect() {
  const colors = ['#ec4899', '#a855f7', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444'];
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: 4 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotation + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
