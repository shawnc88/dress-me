import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Radio, Video, ChevronRight, Flame } from 'lucide-react';
import { apiFetch } from '@/utils/api';

interface TodayTask {
  id: string;
  type: 'live' | 'reel' | 'cta';
  title: string;
  cta: string;
  completed: boolean;
}

interface PlaybookSummary {
  progress: number;
  completedCount: number;
  totalTasks: number;
  niche: string;
  todayTasks: TodayTask[];
}

export function CreatorPlaybookCard() {
  const [data, setData] = useState<PlaybookSummary | null>(null);

  useEffect(() => {
    apiFetch('/api/creators/playbook')
      .then((res) => {
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const today = dayNames[new Date().getDay()];
        const todaySchedule = res.schedule.find((d: any) => d.day === today);
        setData({
          progress: res.playbook.progress,
          completedCount: res.playbook.completedCount,
          totalTasks: res.playbook.totalTasks,
          niche: res.playbook.niche,
          todayTasks: todaySchedule?.tasks || [],
        });
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const incompleteTasks = data.todayTasks.filter(t => !t.completed && t.type !== 'cta');
  const hasLive = incompleteTasks.some(t => t.type === 'live');
  const hasReel = incompleteTasks.some(t => t.type === 'reel');

  return (
    <Link href="/dashboard/playbook">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="bg-gradient-to-br from-brand-500/10 via-violet-500/10 to-purple-500/10 rounded-2xl border border-brand-500/20 p-4 hover:border-brand-500/30 transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Weekly Playbook</p>
              <p className="text-[10px] text-gray-500 capitalize">{data.niche} creator</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-500 to-violet-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${data.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-gray-500">{data.completedCount}/{data.totalTasks} tasks</span>
          <span className="text-xs font-bold text-brand-400">{data.progress}%</span>
        </div>

        {/* Today's actions */}
        {incompleteTasks.length > 0 && (
          <div className="flex gap-2">
            {hasLive && (
              <Link
                href="/dashboard/go-live"
                onClick={(e) => e.stopPropagation()}
                className="flex-1"
              >
                <div className="flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl py-2 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
                  <Radio className="w-3.5 h-3.5" />
                  Go Live Now
                </div>
              </Link>
            )}
            {hasReel && (
              <Link
                href="/create-reel"
                onClick={(e) => e.stopPropagation()}
                className="flex-1"
              >
                <div className="flex items-center justify-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl py-2 text-blue-400 text-xs font-bold hover:bg-blue-500/20 transition-colors">
                  <Video className="w-3.5 h-3.5" />
                  Create Reel
                </div>
              </Link>
            )}
          </div>
        )}

        {incompleteTasks.length === 0 && data.todayTasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" />
            Today&apos;s tasks complete!
          </div>
        )}

        {data.todayTasks.length === 0 && (
          <p className="text-[10px] text-gray-600">No tasks scheduled today</p>
        )}
      </motion.div>
    </Link>
  );
}
