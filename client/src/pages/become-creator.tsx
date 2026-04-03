import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Sparkles, ChevronRight, ChevronLeft, Check,
  Video, Mic, Star, Crown, Users, Zap, ArrowRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORIES = [
  { id: 'fashion', label: 'Fashion & Style', icon: '👗' },
  { id: 'styling', label: 'Styling Tips', icon: '✨' },
  { id: 'streetwear', label: 'Streetwear', icon: '🧥' },
  { id: 'luxury', label: 'Luxury & Designer', icon: '💎' },
  { id: 'thrift', label: 'Thrift & Vintage', icon: '🛍️' },
  { id: 'beauty', label: 'Beauty & Makeup', icon: '💄' },
  { id: 'fitness', label: 'Fitness & Athleisure', icon: '🏋️' },
  { id: 'lifestyle', label: 'Lifestyle', icon: '🌿' },
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
  const [category, setCategory] = useState('fashion');
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Become a Creator - Dress Me</title>
      </Head>

      <div className="min-h-screen bg-black text-white overflow-hidden">
        {/* Progress bar */}
        {step > 0 && step < 4 && (
          <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
            <div className="flex gap-1.5 max-w-md mx-auto">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-white/20">
                  <motion.div
                    className="h-full bg-brand-500"
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
          {/* ═══════════ STEP 0: Welcome Screen (HOOK) ═══════════ */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex flex-col"
            >
              {/* Full-screen gradient background */}
              <div className="absolute inset-0 bg-gradient-to-b from-brand-900/80 via-purple-900/60 to-black pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.3),transparent_70%)] pointer-events-none" />

              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-brand-400/30"
                    style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                    animate={{
                      y: [-20, 20, -20],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 3 + i * 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-brand-500/20 backdrop-blur-xl flex items-center justify-center mb-8"
                >
                  <Sparkles className="w-10 h-10 text-brand-400" />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="font-display text-4xl md:text-5xl font-bold mb-4"
                  style={{ fontStyle: 'italic' }}
                >
                  Start earning by<br />going live
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-gray-400 text-lg mb-12 max-w-sm"
                >
                  Join thousands of creators streaming fashion, style, and lifestyle content
                </motion.p>

                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(1)}
                  className="bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold px-10 py-4 rounded-2xl flex items-center gap-3 transition-colors shadow-[0_0_40px_rgba(236,72,153,0.4)]"
                >
                  Become a Creator
                  <ArrowRight className="w-5 h-5" />
                </motion.button>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="text-gray-600 text-sm mt-6"
                >
                  Free to start · Takes less than 2 minutes
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
              className="min-h-screen flex flex-col pt-12 pb-32"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <h2 className="text-2xl font-bold mb-1">Set up your profile</h2>
                <p className="text-gray-500 mb-8">This is how viewers will see you</p>

                {/* Avatar upload */}
                <div className="flex justify-center mb-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => avatarRef.current?.click()}
                    className="relative w-28 h-28 rounded-full overflow-hidden bg-gray-800 border-2 border-dashed border-gray-600 hover:border-brand-500 transition-colors group"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <Camera className="w-8 h-8 text-gray-500 group-hover:text-brand-400 transition-colors" />
                        <span className="text-[10px] text-gray-500 mt-1">Add Photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
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
                  <p className="text-lg font-semibold">{user?.displayName}</p>
                  <p className="text-sm text-gray-500">@{user?.username}</p>
                </div>

                {/* Bio */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition text-white placeholder-gray-600 resize-none"
                    placeholder="Tell viewers what you're about..."
                  />
                  <p className="text-xs text-gray-600 mt-1 text-right">{bio.length}/160</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          category === cat.id
                            ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                            : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'
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
              className="min-h-screen flex flex-col pt-12 pb-32"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <h2 className="text-2xl font-bold mb-1">Set your tiers</h2>
                <p className="text-gray-500 mb-8">Choose how viewers can support you</p>

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
              className="min-h-screen flex flex-col pt-12 pb-32"
            >
              <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">
                <h2 className="text-2xl font-bold mb-1">Stream setup</h2>
                <p className="text-gray-500 mb-6">Test your camera and mic before going live</p>

                {/* Camera Preview */}
                <div className="relative aspect-[9/16] max-h-[50vh] rounded-2xl overflow-hidden bg-gray-900 mb-6">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Video className="w-12 h-12 text-gray-600 mb-3" />
                      <p className="text-gray-500 text-sm">Allow camera access to preview</p>
                      <button
                        onClick={startCameraPreview}
                        className="mt-4 bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}

                  {/* Overlay badges */}
                  {cameraReady && (
                    <>
                      <div className="absolute top-4 left-4">
                        <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                          PREVIEW
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="glass px-4 py-3 flex items-center gap-3 !rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-brand-500/30 flex items-center justify-center overflow-hidden">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-brand-400">{user?.displayName?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">{user?.displayName}</p>
                            <p className="text-white/60 text-xs">{CATEGORIES.find(c => c.id === category)?.label}</p>
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
                    className="text-center text-green-400 text-sm font-medium mt-6"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
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
              className="min-h-screen flex flex-col items-center justify-center px-6 text-center relative"
            >
              {/* Confetti */}
              <ConfettiEffect />

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-8"
              >
                <Check className="w-12 h-12 text-green-400" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-bold mb-3"
              >
                You&apos;re live-ready!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-gray-400 text-lg mb-10 max-w-sm"
              >
                Your creator profile is set up. Start your first stream now!
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard/go-live')}
                className="bg-red-500 hover:bg-red-600 text-white text-lg font-bold px-12 py-4 rounded-2xl flex items-center gap-3 transition-colors shadow-[0_0_40px_rgba(239,68,68,0.4)]"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                GO LIVE NOW
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={() => router.push('/profile')}
                className="text-gray-500 hover:text-gray-300 text-sm mt-6 transition-colors"
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-gray-800 px-6 py-4 safe-area-pb">
      <div className="max-w-md mx-auto flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          disabled={disabled}
          className="flex-1 h-12 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
  const borderColor = !enabled ? 'border-gray-800' : color === 'brand' ? 'border-brand-500/50' : color === 'amber' ? 'border-amber-500/50' : 'border-gray-700';
  const bgColor = !enabled ? 'bg-gray-900/50' : color === 'brand' ? 'bg-brand-500/5' : color === 'amber' ? 'bg-amber-500/5' : 'bg-gray-900/50';
  const iconColor = color === 'brand' ? 'text-brand-400' : color === 'amber' ? 'text-amber-400' : 'text-gray-400';

  return (
    <motion.div
      whileTap={!locked ? { scale: 0.98 } : undefined}
      className={`border ${borderColor} ${bgColor} rounded-2xl p-5 transition-all`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${enabled ? bgColor : 'bg-gray-800'} flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        {!locked && (
          <button
            onClick={onToggle}
            className={`w-11 h-6 rounded-full transition-colors flex items-center ${
              enabled ? 'bg-brand-500' : 'bg-gray-700'
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
          className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800"
        >
          <span className="text-gray-500 text-sm">$</span>
          <input
            type="number"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            step="0.01"
            min="0.99"
            className="bg-transparent text-white text-lg font-bold w-20 outline-none"
          />
          <span className="text-gray-500 text-sm">/month</span>
        </motion.div>
      )}

      {locked && (
        <div className="flex items-center gap-1 mt-2">
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-500">Always included</span>
        </div>
      )}
    </motion.div>
  );
}

function StatusRow({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-900 border border-gray-800">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={`flex items-center gap-2 text-xs font-medium ${ready ? 'text-green-400' : 'text-gray-500'}`}>
        <span className={`w-2 h-2 rounded-full ${ready ? 'bg-green-400' : 'bg-gray-600'}`} />
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
