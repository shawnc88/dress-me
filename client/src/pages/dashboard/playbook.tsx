import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import {
  Calendar, CheckCircle2, Circle, Radio, Video, Bell,
  ChevronRight, Flame, TrendingUp, ArrowLeft, Sparkles,
} from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface PlaybookTask {
  id: string;
  day: string;
  type: 'live' | 'reel' | 'push';
  title: string;
  description: string;
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

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const DAY_SHORT: Record<string, string> = {
  MONDAY: 'MON',
  TUESDAY: 'TUE',
  WEDNESDAY: 'WED',
  THURSDAY: 'THU',
  FRIDAY: 'FRI',
  SATURDAY: 'SAT',
  SUNDAY: 'SUN',
};

const TYPE_ICONS: Record<string, { icon: typeof Radio; color: string; bg: string; label: string }> = {
  live: { icon: Radio, color: 'text-red-400', bg: 'bg-red-500/10', label: 'LIVE' },
  reel: { icon: Video, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'REEL' },
  push: { icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'PUSH' },
};

export default function PlaybookPage() {
  const router = useRouter();
  const [playbook, setPlaybook] = useState<PlaybookMeta | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/auth/login'); return; }
    fetchPlaybook();
  }, [router]);

  async function fetchPlaybook() {
    try {
      const data = await apiFetch('/api/creators/playbook');
      setPlaybook(data.playbook);
      setSchedule(data.schedule);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function toggleTask(taskId: string) {
    if (toggling) return;
    setToggling(taskId);

    // Optimistic update
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
      // Revert on error
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

  // Determine current day
  const today = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head><title>Weekly Playbook - Be With Me</title></Head>

      <div className="max-w-[630px] mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </motion.div>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Weekly Playbook</h1>
            <p className="text-xs text-gray-500">Your personalized content plan</p>
          </div>
        </div>

        {/* Progress Card */}
        {playbook && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-brand-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl border border-brand-500/20 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-brand-500" />
                <span className="text-sm font-bold text-white">This Week</span>
              </div>
              <span className="text-xs text-gray-400 capitalize">{playbook.niche} creator</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-violet-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${playbook.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {playbook.completedCount}/{playbook.totalTasks} tasks done
              </span>
              <span className="text-lg font-bold text-white">{playbook.progress}%</span>
            </div>

            {playbook.progress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2"
              >
                <Sparkles className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">All tasks complete! You crushed it this week.</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Daily Schedule */}
        <div className="space-y-4">
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
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    isToday
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}>
                    {DAY_SHORT[day.day]}
                  </span>
                  <span className="text-sm font-semibold text-white">{DAY_LABELS[day.day]}</span>
                  {isToday && <span className="text-[10px] text-brand-400 font-medium">TODAY</span>}
                  {allDone && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {day.tasks.map((task) => {
                    const typeInfo = TYPE_ICONS[task.type];
                    const Icon = typeInfo.icon;

                    return (
                      <motion.div
                        key={task.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggleTask(task.id)}
                        className={`relative flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                          task.completed
                            ? 'bg-white/[0.02] border-white/5 opacity-60'
                            : isToday
                              ? 'bg-surface-card border-brand-500/20 hover:border-brand-500/40'
                              : 'bg-surface-card border-white/5 hover:border-white/10'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="mt-0.5 flex-shrink-0">
                          <AnimatePresence mode="wait">
                            {task.completed ? (
                              <motion.div
                                key="checked"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="unchecked"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Circle className="w-5 h-5 text-gray-600" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${typeInfo.bg}`}>
                              <Icon className={`w-3 h-3 ${typeInfo.color}`} />
                              <span className={`text-[9px] font-bold ${typeInfo.color}`}>{typeInfo.label}</span>
                            </div>
                            <span className="text-base">{task.emoji}</span>
                          </div>
                          <p className={`text-sm font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                        </div>

                        {/* Action hint */}
                        {!task.completed && task.type === 'live' && isToday && (
                          <Link
                            href="/dashboard/go-live"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 mt-1"
                          >
                            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                              <Radio className="w-3 h-3" />
                              GO
                            </div>
                          </Link>
                        )}
                        {!task.completed && task.type === 'reel' && isToday && (
                          <Link
                            href="/create-reel"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 mt-1"
                          >
                            <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-lg">
                              <Video className="w-3 h-3" />
                              CREATE
                            </div>
                          </Link>
                        )}
                      </motion.div>
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
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-bold text-white">Consistency = Growth</span>
          </div>
          <p className="text-xs text-gray-500">
            Creators who follow their playbook see 3x more engagement
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}
