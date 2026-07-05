import { useState, useEffect } from 'react';
import { Bell, Moon, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Prefs {
  creatorLive: boolean;
  creatorReel: boolean;
  creatorStory: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  gifts: boolean;
  mentions: boolean;
  streakReminder: boolean;
  comebackAlert: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
}

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/push/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.preferences) setPrefs(data.preferences); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function updatePref(key: keyof Prefs, value: boolean) {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/push/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => {});
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-500 animate-spin" /></div>;
  if (!prefs) return null;

  const toggles: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: 'creatorLive', label: 'Creator Goes Live', desc: 'When creators you follow start streaming' },
    { key: 'creatorReel', label: 'New Reels', desc: 'When creators you follow post reels' },
    { key: 'creatorStory', label: 'New Stories', desc: 'When creators post new stories' },
    { key: 'likes', label: 'Likes', desc: 'When someone likes your content' },
    { key: 'comments', label: 'Comments', desc: 'When someone comments on your content' },
    { key: 'follows', label: 'New Followers', desc: 'When someone follows you' },
    { key: 'gifts', label: 'Gifts', desc: 'When you receive gifts during streams' },
    { key: 'streakReminder', label: 'Streak Reminder', desc: 'Daily reminder to keep your streak' },
    { key: 'comebackAlert', label: 'Comeback Alerts', desc: 'When we miss you and there\'s new content' },
  ];

  return (
    <div className="space-y-1">
      {/* Slim header — glisten for ambient shimmer, accent-tinted icon */}
      <div className="flex items-center gap-2 mb-4 px-1 glisten rounded-2xl overflow-hidden">
        <Bell className="w-4 h-4 text-brand-400 flex-shrink-0" />
        <h3 className="text-white font-bold text-sm tracking-tight">Notifications</h3>
        {saving && <Loader2 className="w-3 h-3 text-brand-500 animate-spin ml-auto" />}
      </div>

      {toggles.map(t => (
        /* Glass toggle row — glimmer on touch, ≥44px tall */
        <button
          key={t.key}
          onClick={() => updatePref(t.key, !prefs[t.key])}
          className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 active:bg-white/8 transition-colors min-h-[44px] glimmer overflow-hidden"
        >
          <div className="text-left">
            <p className={`text-sm font-medium ${prefs[t.key] ? 'text-white' : 'text-white/60'}`}>{t.label}</p>
            <p className="text-white/30 text-[11px]">{t.desc}</p>
          </div>
          {/* Toggle track — accent-500 when on */}
          <div className={`relative w-10 h-6 rounded-full flex items-center px-0.5 transition-all duration-200 flex-shrink-0 ${
            prefs[t.key] ? 'bg-brand-500 shadow-glow-sm' : 'bg-white/10'
          }`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              prefs[t.key] ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </button>
      ))}

      {/* Quiet hours */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="w-4 h-4 text-accent-violet" />
          <p className="text-white/70 text-xs font-semibold">Quiet Hours</p>
        </div>
        <p className="text-white/30 text-[11px] mb-3">Pause all alerts during these hours (UTC)</p>
        <div className="flex items-center gap-2">
          <select
            value={prefs.quietHoursStart ?? ''}
            onChange={(e) => updatePref('quietHoursStart' as any, e.target.value ? Number(e.target.value) : null as any)}
            className="bg-white/5 text-white text-xs rounded-xl px-3 py-2 border border-white/10 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          >
            <option value="">Off</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
          <span className="text-white/30 text-xs">to</span>
          <select
            value={prefs.quietHoursEnd ?? ''}
            onChange={(e) => updatePref('quietHoursEnd' as any, e.target.value ? Number(e.target.value) : null as any)}
            className="bg-white/5 text-white text-xs rounded-xl px-3 py-2 border border-white/10 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          >
            <option value="">Off</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
