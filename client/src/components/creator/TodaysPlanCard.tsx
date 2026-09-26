import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronRight, Check } from 'lucide-react';
import { apiFetch } from '@/utils/api';

// ─── Today's plan — the playbook, surfaced ──────────────────────
// The weekly playbook engine has existed since launch but lived on a buried
// page. A creator's dashboard should open on "here's what to do today,"
// not on stats about yesterday.

interface Task {
  id: string;
  day: string;
  title: string;
  emoji: string;
  cta: string;
  completed: boolean;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function TodaysPlanCard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch<{ playbook: { progress: number }; schedule: { day: string; tasks: Task[] }[] }>('/api/creators/playbook')
      .then(d => {
        const today = DAY_KEYS[new Date().getDay()];
        const day =
          d.schedule.find(s => s.day.toLowerCase().startsWith(today.slice(0, 3))) || null;
        // Today's unfinished first; if today is clear, pull the week's next up.
        const todays = (day?.tasks || []).filter(t => !t.completed);
        const upNext = todays.length
          ? todays
          : d.schedule.flatMap(s => s.tasks).filter(t => !t.completed);
        setTasks(upNext.slice(0, 3));
        setProgress(d.playbook?.progress || 0);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || tasks.length === 0) return null;

  return (
    <Link href="/dashboard/playbook" className="block no-select">
      <div className="relative overflow-hidden bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-accent-amber/25 p-4 hover:border-accent-amber/45 transition-colors">
        <div
          className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-accent-amber/40 to-transparent"
          aria-hidden
        />
        <div className="flex items-center justify-between mb-3">
          <p className="text-accent-amber/80 text-[11px] font-semibold uppercase tracking-[0.28em]">
            Today&apos;s plan
          </p>
          <span className="flex items-center gap-1 text-tertiary text-[11px] font-semibold">
            {progress}% this week <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="space-y-2">
          {tasks.map(t => (
            <div key={t.id} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full border border-white/20 bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                {t.completed && <Check className="w-3 h-3 text-accent-green" strokeWidth={3} />}
              </span>
              <span className="text-base leading-none" aria-hidden>{t.emoji}</span>
              <p className="text-primary text-[13px] font-semibold truncate">{t.title}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}
