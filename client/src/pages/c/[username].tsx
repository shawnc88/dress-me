import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { setInviteAttribution } from '@/lib/analytics';

// Creator bio link: bewithme.live/c/amira → attributes this visitor to amira
// (first inviter wins), then lands on her profile. This is how creator-driven
// signups become measurable without any dashboard work.
export default function CreatorInvite() {
  const router = useRouter();
  const { username } = router.query;

  useEffect(() => {
    if (typeof username !== 'string' || !username) return;
    setInviteAttribution(username);
    router.replace(`/profile/${encodeURIComponent(username)}`);
  }, [username, router]);

  return (
    <div className="fixed inset-0 celebration-canvas bg-ink-950 flex items-center justify-center">
      <div className="relative w-16 h-16 pointer-events-none" aria-hidden>
        <div className="absolute inset-0 rounded-full gradient-celebration opacity-30 blur-2xl animate-glow-breathe" />
        <div className="absolute inset-3 rounded-full neon-hairline animate-float" />
      </div>
    </div>
  );
}
