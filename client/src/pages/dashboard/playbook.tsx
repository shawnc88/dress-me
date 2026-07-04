import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import {
  CheckCircle2, Circle, Radio, Video, Bell, Megaphone,
  Flame, TrendingUp, ArrowLeft, Sparkles, Pencil, X, Check,
  RotateCcw, Zap, DollarSign, Clock, BarChart3, Target,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface PlaybookInsight {
  type: string;
  title: string;
  description: string;
  cta: string;
  priority: number;
  data?: Record<string, any>;
}

const INSIGHT_ICONS: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  best_time: { icon: Clock, color: 'text-accent-green', bg: 'bg-accent-green/10' },
  top_content: { icon: BarChart3, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  growth_tip: { icon: TrendingUp, color: 'text-accent-violet', bg: 'bg-accent-violet/10' },
  engagement_spike: { icon: Zap, color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
  reel_tip: { icon: Target, color: 'text-brand-400', bg: 'bg-brand-500/10' },
};

// ─── Revenue tips by niche ───────────────────────────────────
const REVENUE_TIPS: Record<string, { tip: string; strategy: string }[]> = {
  fitness: [
    { tip: 'Ask viewers to send gifts during the hardest set — peak emotion = peak gifting', strategy: 'Run a VIP-only workout challenge this Friday' },
    { tip: 'Shout out gifters by name and do their exercise request', strategy: 'Offer a 1-on-1 training session for Inner Circle members' },
  ],
  fashion: [
    { tip: '"Help me pick the outfit" polls drive 3x more gifts than silent styling', strategy: 'Do a VIP-only closet tour or styling session' },
    { tip: 'Ask for gifts when trying on the final look — it\'s the emotional peak', strategy: 'Exclusive haul preview for subscribers only' },
  ],
  beauty: [
    { tip: 'Ask for gifts during the big reveal/transformation moment', strategy: 'VIP-only tutorial with premium product recommendations' },
    { tip: 'Let gifters choose the next product you try — interactive = more revenue', strategy: 'Exclusive skincare routine breakdown for subscribers' },
  ],
  gaming: [
    { tip: 'Top gifter gets to pick your next challenge or character', strategy: 'VIP-only viewer games with limited lobby spots' },
    { tip: 'Gift goals: "At 500 threads I\'ll attempt the impossible challenge"', strategy: 'Exclusive coaching session for Inner Circle gamers' },
  ],
  coaching: [
    { tip: 'Offer to answer the top gifter\'s question first — premium Q&A', strategy: 'Run a paid VIP workshop with limited spots' },
    { tip: '"Send a gift to unlock the bonus tip" — value gating drives revenue', strategy: 'Exclusive deep-dive session for Inner Circle only' },
  ],
  lifestyle: [
    { tip: 'Gift leaderboard shoutouts during your stream = social proof spending', strategy: 'VIP-only behind-the-scenes day in your life' },
    { tip: 'Ask for gifts when sharing something personal — vulnerability drives connection', strategy: 'Subscriber-only Q&A about your real routine' },
  ],
  music: [
    { tip: 'Top gifter picks the next song you play — interactive requests = revenue', strategy: 'VIP-only acoustic session or song dedication' },
    { tip: '"Gift to hear the unreleased track" — exclusivity drives spending', strategy: 'Private listening party for Inner Circle members' },
  ],
  dating: [
    { tip: 'Read and respond to gifter messages first — VIP treatment = more gifts', strategy: 'VIP-only "ask me anything" with no filters' },
    { tip: 'Gift goals: "At 1000 threads I\'ll tell THAT story" — teasing drives revenue', strategy: 'Exclusive 1-on-1 chat time for top supporters' },
  ],
  general: [
    { tip: 'Acknowledge every gift live — personal attention drives repeat spending', strategy: 'VIP-only stream with exclusive content' },
    { tip: 'Set gift milestones with exciting reveals — gamification works', strategy: 'Run an Inner Circle exclusive event this week' },
  ],
};

interface PlaybookTask {
  id: string;
  day: string;
  type: 'live' | 'reel' | 'cta';
  title: string;
  description: string;
  cta: string;
  emoji: string;
  completed: boolean;
}

interface DaySchedule {
  day: string;
  tasks: PlaybookTask[];
}

interface PlaybookMeta {
  id: string;
  niche: string;
  weekStart: string;
  progress: number;
  completedCount: number;
  totalTasks: number;
}

interface WeeklyStats {
  lives: { completed: number; goal: number; done: boolean };
  reels: { completed: number; goal: number; done: boolean };
  earnings: { threads: number; usd: string };
  viewers: number;
  newFollowers: number;
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday', WEDNESDAY: 'Wednesday', FRIDAY: 'Friday',
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'MON', WEDNESDAY: 'WED', FRIDAY: 'FRI',
};

const TYPE_CONFIG: Record<string, { icon: typeof Radio; color: string; bg: string; label: string }> = {
  live: { icon: Radio, color: 'text-live', bg: 'bg-live/10', label: 'LIVE' },
  reel: { icon: Video, color: 'text-accent-blue', bg: 'bg-accent-blue/10', label: 'REEL' },
  cta: { icon: Megaphone, color: 'text-accent-amber', bg: 'bg-accent-amber/10', label: 'CTA' },
};

export default function PlaybookPage() {
  const router = useRouter();
  const [playbook, setPlaybook] = useState<PlaybookMeta | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCta, setEditCta] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [insights, setInsights] = useState<PlaybookInsight[]>([]);
  const [revTips, setRevTips] = useState<{ tip: string; strategy: string } | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    fetchPlaybook();
    fetchInsights();
    fetchStats();
  }, [router]);

  async function fetchPlaybook() {
    try {
      const data = await apiFetch('/api/creators/playbook');
      setPlaybook(data.playbook);
      setSchedule(data.schedule);

      // Pick a revenue tip based on niche
      const niche = data.playbook.niche || 'general';
      const tips = REVENUE_TIPS[niche] || REVENUE_TIPS.general;
      // Rotate weekly based on week number
      const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
      setRevTips(tips[weekNum % tips.length]);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchInsights() {
    try {
      const data = await apiFetch('/api/creators/playbook/insights');
      setInsights(data.insights || []);
    } catch { /* insights are optional */ }
  }

  async function fetchStats() {
    try {
      const data = await apiFetch('/api/creators/playbook/stats');
      setWeekStats(data.stats);
    } catch { /* stats are optional */ }
  }

  async function toggleTask(taskId: string) {
    if (toggling || editingTask) return;
    setToggling(taskId);

    setSchedule(prev => prev.map(day => ({
      ...day,
      tasks: day.tasks.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    })));

    try {
      const data = await apiFetch('/api/creators/playbook/complete', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      setPlaybook(prev => prev ? {
        ...prev,
        progress: data.progress,
        completedCount: data.completedCount,
      } : prev);
    } catch {
      setSchedule(prev => prev.map(day => ({
        ...day,
        tasks: day.tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
      })));
    } finally {
      setToggling(null);
    }
  }

  function startEdit(task: PlaybookTask) {
    setEditingTask(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditCta(task.cta);
  }

  async function saveEdit() {
    if (!editingTask || saving) return;
    setSaving(true);
    try {
      const data = await apiFetch('/api/creators/playbook/task', {
        method: 'PUT',
        body: JSON.stringify({
          taskId: editingTask,
          title: editTitle,
          description: editDesc,
          cta: editCta,
        }),
      });
      setSchedule(prev => prev.map(day => ({
        ...day,
        tasks: day.tasks.map(t =>
          t.id === editingTask ? { ...t, title: data.task.title, description: data.task.description, cta: data.task.cta } : t
        ),
      })));
      setEditingTask(null);
    } catch { /* keep edit open */ }
    finally { setSaving(false); }
  }

  async function resetPlaybook() {
    if (resetting) return;
    setResetting(true);
    try {
      await apiFetch('/api/creators/playbook/reset', { method: 'POST' });
      await fetchPlaybook();
    } catch { /* ignore */ }
    finally { setResetting(false); }
  }

  const today = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          {/* Breathing multicolor orb — no bare spinner */}
          <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
            <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
            <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Your Playbook - Be With Me</title></Head>

      <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 safe-area-pb space-y-6">
        {/* ─── Slim celebration header — CSS color, no ambient 3D ─── */}
        <div className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 shadow-couture px-4 pt-5 pb-4">
          <div
            className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-brand-500/50 via-accent-violet/50 to-accent-cyan/50"
            aria-hidden
          />
          <div className="relative z-[2] flex items-center justify-between gap-3 animate-rise">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/dashboard">
                <motion.div whileTap={{ scale: 0.9 }} className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors no-select">
                  <ArrowLeft className="w-5 h-5 text-white/70" />
                </motion.div>
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent-cyan/80 mb-0.5">
                  Level up
                </p>
                <h1 className="font-extrabold tracking-tight text-2xl text-white leading-[1.05]">
                  Your <span className="text-celebration">playbook</span>
                </h1>
                <p className="text-xs text-white/40 mt-0.5">Your weekly game plan</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={resetPlaybook}
              disabled={resetting}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0 no-select"
              title="Reset to default plan"
            >
              <RotateCcw className={`w-4 h-4 text-white/60 ${resetting ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>

        {/* Progress Card */}
        {playbook && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden glass-card bg-gradient-to-br from-brand-500/10 via-accent-violet/10 to-accent-blue/10 border-brand-500/20 p-5"
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-brand-500/60 via-accent-violet/50 to-accent-blue/40"
              aria-hidden
            />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-brand-400" />
                </div>
                <span className="text-sm font-bold text-white">This Week</span>
              </div>
              <span className="text-xs text-white/40 capitalize">{playbook.niche} creator</span>
            </div>

            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div
                className="absolute inset-y-0 left-0 gradient-celebration rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${playbook.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/45">
                {playbook.completedCount}/{playbook.totalTasks} tasks done
              </span>
              <span className="text-lg font-bold text-white">{playbook.progress}%</span>
            </div>

            {playbook.progress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 flex items-center gap-2 bg-accent-green/10 border border-accent-green/20 rounded-xl px-4 py-2.5 shadow-glow-green"
              >
                <Sparkles className="w-4 h-4 text-accent-green" />
                <span className="text-sm font-semibold text-accent-green">All tasks complete! You crushed it this week.</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ─── Quick Action Buttons ─── */}
        <div className="grid grid-cols-4 gap-2">
          <Link href="/dashboard/go-live">
            <motion.div whileTap={{ scale: 0.95 }} className="animate-rise min-h-[44px] bg-live/10 border border-live/20 rounded-2xl p-3 text-center hover:bg-live/15 hover:border-live/40 transition-colors no-select" style={{ animationDelay: '0ms' }}>
              <Radio className="w-5 h-5 text-live mx-auto mb-1" />
              <p className="text-[10px] font-bold text-live">Go Live</p>
            </motion.div>
          </Link>
          <Link href="/create-reel">
            <motion.div whileTap={{ scale: 0.95 }} className="animate-rise min-h-[44px] bg-accent-blue/10 border border-accent-blue/20 rounded-2xl p-3 text-center hover:bg-accent-blue/15 hover:border-accent-blue/40 transition-colors no-select" style={{ animationDelay: '60ms' }}>
              <Video className="w-5 h-5 text-accent-blue mx-auto mb-1" />
              <p className="text-[10px] font-bold text-accent-blue">Create Reel</p>
            </motion.div>
          </Link>
          <Link href="/create">
            <motion.div whileTap={{ scale: 0.95 }} className="animate-rise min-h-[44px] bg-accent-violet/10 border border-accent-violet/20 rounded-2xl p-3 text-center hover:bg-accent-violet/15 hover:border-accent-violet/40 transition-colors no-select" style={{ animationDelay: '120ms' }}>
              <Sparkles className="w-5 h-5 text-accent-violet mx-auto mb-1" />
              <p className="text-[10px] font-bold text-accent-violet">Post Story</p>
            </motion.div>
          </Link>
          <Link href="/dashboard/go-live?vip=true">
            <motion.div whileTap={{ scale: 0.95 }} className="animate-rise min-h-[44px] bg-accent-amber/10 border border-accent-amber/20 rounded-2xl p-3 text-center hover:bg-accent-amber/15 hover:border-accent-amber/40 transition-colors no-select" style={{ animationDelay: '180ms' }}>
              <DollarSign className="w-5 h-5 text-accent-amber mx-auto mb-1" />
              <p className="text-[10px] font-bold text-accent-amber">VIP Live</p>
            </motion.div>
          </Link>
        </div>

        {/* ─── Weekly Progress Stats ─── */}
        {weekStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden glass-card p-4"
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-cyan/50 via-accent-blue/40 to-transparent"
              aria-hidden
            />
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent-cyan/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-accent-cyan" />
              </span>
              Weekly Goals
            </h2>

            <div className="space-y-3">
              {/* Lives */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-live/10 flex items-center justify-center">
                    <Radio className="w-3.5 h-3.5 text-live" />
                  </div>
                  <span className="text-sm text-white/70">Lives</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(weekStats.lives.goal)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          i < weekStats.lives.completed
                            ? 'bg-live text-white shadow-glow-live'
                            : 'bg-white/[0.06] text-white/30'
                        }`}
                      >
                        {i < weekStats.lives.completed ? '✓' : (i + 1)}
                      </div>
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${weekStats.lives.done ? 'text-accent-green' : 'text-white/35'}`}>
                    {weekStats.lives.completed}/{weekStats.lives.goal}
                  </span>
                  {weekStats.lives.done && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
                </div>
              </div>

              {/* Reels */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                    <Video className="w-3.5 h-3.5 text-accent-blue" />
                  </div>
                  <span className="text-sm text-white/70">Reels</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(weekStats.reels.goal)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          i < weekStats.reels.completed
                            ? 'bg-accent-blue text-white shadow-glow-blue'
                            : 'bg-white/[0.06] text-white/30'
                        }`}
                      >
                        {i < weekStats.reels.completed ? '✓' : (i + 1)}
                      </div>
                    ))}
                  </div>
                  <span className={`text-xs font-bold ${weekStats.reels.done ? 'text-accent-green' : 'text-white/35'}`}>
                    {weekStats.reels.completed}/{weekStats.reels.goal}
                  </span>
                  {weekStats.reels.done && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
                </div>
              </div>

              {/* Earnings + Followers */}
              <div className="flex gap-2 pt-1">
                <div className="flex-1 bg-accent-amber/5 border border-accent-amber/10 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-accent-amber/60 uppercase tracking-[0.14em]">Earnings</p>
                  <p className="text-sm font-bold text-accent-amber">${weekStats.earnings.usd}</p>
                </div>
                <div className="flex-1 bg-accent-green/5 border border-accent-green/10 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-accent-green/60 uppercase tracking-[0.14em]">New Followers</p>
                  <p className="text-sm font-bold text-accent-green">+{weekStats.newFollowers}</p>
                </div>
                <div className="flex-1 bg-accent-violet/5 border border-accent-violet/10 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-accent-violet/60 uppercase tracking-[0.14em]">Viewers</p>
                  <p className="text-sm font-bold text-accent-violet">{weekStats.viewers}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Dynamic Insights ─── */}
        {insights.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent-violet" />
              </span>
              Smart Insights
            </h2>
            {insights.map((insight, i) => {
              const config = INSIGHT_ICONS[insight.type] || INSIGHT_ICONS.engagement_spike;
              const Icon = config.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{insight.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{insight.description}</p>
                      <div className="mt-2 bg-brand-500/5 border border-brand-500/15 rounded-lg px-2.5 py-1.5">
                        <p className="text-[11px] text-brand-300 italic">{insight.cta}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ─── Revenue Tips ─── */}
        {revTips && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden glass-card bg-gradient-to-br from-accent-green/10 via-accent-amber/5 to-accent-cyan/10 border-accent-green/20 p-4 space-y-3"
          >
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-accent-green/50 via-accent-amber/40 to-transparent"
              aria-hidden
            />
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-accent-green" />
              </span>
              Revenue Playbook
            </h2>
            <div className="bg-black/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded tracking-[0.08em]">REVENUE TIP</span>
              </div>
              <p className="text-xs text-white/70">{revTips.tip}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-accent-amber bg-accent-amber/10 px-1.5 py-0.5 rounded tracking-[0.08em]">HIGH EARNING STRATEGY</span>
              </div>
              <p className="text-xs text-white/70">{revTips.strategy}</p>
            </div>
          </motion.div>
        )}

        {/* Daily Schedule */}
        <div className="space-y-5">
          {schedule.map((day, dayIdx) => {
            const isToday = day.day === today;
            const allDone = day.tasks.every(t => t.completed);

            return (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIdx * 0.05 }}
              >
                {/* Day Header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg tracking-[0.1em] ${
                    isToday ? 'bg-brand-500 text-white shadow-glow-sm' : 'bg-white/[0.06] text-white/45'
                  }`}>
                    {DAY_SHORT[day.day]}
                  </span>
                  <span className="text-sm font-semibold text-white">{DAY_LABELS[day.day]}</span>
                  {isToday && <span className="text-[10px] text-brand-400 font-bold tracking-[0.14em] ml-1">TODAY</span>}
                  {allDone && <CheckCircle2 className="w-4 h-4 text-accent-green ml-auto" />}
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {day.tasks.map((task) => {
                    const typeInfo = TYPE_CONFIG[task.type];
                    const Icon = typeInfo.icon;
                    const isEditing = editingTask === task.id;

                    return (
                      <div key={task.id}>
                        <motion.div
                          whileTap={!isEditing ? { scale: 0.98 } : undefined}
                          onClick={() => !isEditing && toggleTask(task.id)}
                          className={`relative flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-xl transition-all ${
                            isEditing
                              ? 'bg-white/[0.04] border-brand-500/40'
                              : task.completed
                                ? 'bg-white/[0.02] border-white/5 opacity-60 cursor-pointer'
                                : isToday
                                  ? 'bg-white/[0.04] border-brand-500/20 shadow-glow-sm hover:border-brand-500/40 cursor-pointer'
                                  : 'bg-white/[0.04] border-white/[0.08] hover:border-white/15 cursor-pointer'
                          }`}
                        >
                          {/* Checkbox */}
                          {!isEditing && (
                            <div className="mt-0.5 flex-shrink-0">
                              <AnimatePresence mode="wait">
                                {task.completed ? (
                                  <motion.div key="checked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <CheckCircle2 className="w-5 h-5 text-accent-green" />
                                  </motion.div>
                                ) : (
                                  <motion.div key="unchecked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <Circle className="w-5 h-5 text-white/25" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${typeInfo.bg}`}>
                                <Icon className={`w-3 h-3 ${typeInfo.color}`} />
                                <span className={`text-[9px] font-bold tracking-[0.1em] ${typeInfo.color}`}>{typeInfo.label}</span>
                              </div>
                              <span className="text-base">{task.emoji}</span>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2 mt-2">
                                <input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full min-h-[44px] text-sm font-semibold text-white bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500"
                                  placeholder="Task title"
                                />
                                <textarea
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  rows={2}
                                  className="w-full text-xs text-white/70 bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-brand-500 resize-none"
                                  placeholder="Description"
                                />
                                <input
                                  value={editCta}
                                  onChange={(e) => setEditCta(e.target.value)}
                                  className="w-full min-h-[44px] text-xs text-accent-amber bg-black/30 border border-accent-amber/20 rounded-xl px-3 py-2.5 outline-none focus:border-accent-amber"
                                  placeholder="CTA suggestion"
                                />
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); saveEdit(); }}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 min-h-[44px] bg-brand-500 hover:brightness-110 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-glow-sm transition-all disabled:opacity-50 no-select"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingTask(null); }}
                                    className="flex items-center gap-1.5 min-h-[44px] bg-white/[0.06] border border-white/10 text-white/60 text-xs font-bold px-4 py-2.5 rounded-full hover:bg-white/10 transition-colors no-select"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className={`text-sm font-semibold ${task.completed ? 'line-through text-white/35' : 'text-white'}`}>
                                  {task.title}
                                </p>
                                <p className="text-xs text-white/40 mt-0.5">{task.description}</p>
                                {/* CTA suggestion */}
                                {task.cta && !task.completed && (
                                  <div className="mt-2 flex items-start gap-1.5 bg-accent-amber/5 border border-accent-amber/10 rounded-lg px-2.5 py-1.5">
                                    <Megaphone className="w-3 h-3 text-accent-amber mt-0.5 flex-shrink-0" />
                                    <p className="text-[11px] text-accent-amber/80 italic">{task.cta}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Action buttons */}
                          {!isEditing && !task.completed && (
                            <div className="flex flex-col gap-1.5 flex-shrink-0 mt-1">
                              {task.type === 'live' && isToday && (
                                <Link href="/dashboard/go-live" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] bg-live/10 border border-live/20 text-live text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-live/20 transition-colors no-select">
                                    <Radio className="w-3 h-3" />
                                    GO
                                  </div>
                                </Link>
                              )}
                              {task.type === 'reel' && isToday && (
                                <Link href="/create-reel" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-accent-blue/20 transition-colors no-select">
                                    <Video className="w-3 h-3" />
                                    CREATE
                                  </div>
                                </Link>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); startEdit(task); }}
                                className="flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] bg-white/[0.06] border border-white/10 text-white/50 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-white/10 transition-colors no-select"
                              >
                                <Pencil className="w-3 h-3" />
                                EDIT
                              </button>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Motivation footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent-green" />
            </span>
            <span className="text-sm font-bold text-white">Consistency = <span className="text-celebration">Growth</span></span>
          </div>
          <p className="text-xs text-white/40">
            Creators who follow their playbook see 3x more engagement
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
