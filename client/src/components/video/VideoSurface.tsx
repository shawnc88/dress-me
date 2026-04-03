import { useState, useEffect, useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Shirt, Loader2 } from 'lucide-react';

interface VideoSurfaceProps {
  playbackId: string | null;
  streamId?: string;
  streamStatus: string;
  creatorName: string;
  title: string;
  viewerUserId?: string;
  isLive?: boolean;
}

export function VideoSurface({
  playbackId,
  streamId,
  streamStatus,
  creatorName,
  title,
  viewerUserId,
  isLive,
}: VideoSurfaceProps) {
  const [retryKey, setRetryKey] = useState(0);
  const playerRef = useRef<any>(null);
  const [showUnmute, setShowUnmute] = useState(true);

  useEffect(() => {
    if (streamStatus !== 'SCHEDULED' || !streamId) return;
    const interval = setInterval(() => setRetryKey((k) => k + 1), 5000);
    return () => clearInterval(interval);
  }, [streamStatus, streamId]);

  // CASE 1: No playbackId
  if (!playbackId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
        <Shirt className="w-16 h-16 text-white/30 mb-4" />
        {streamStatus === 'LIVE' ? (
          <>
            <p className="text-white text-lg font-semibold mb-1">{creatorName} is Live</p>
            <p className="text-white/60 text-sm">Waiting for video feed...</p>
          </>
        ) : streamStatus === 'SCHEDULED' ? (
          <>
            <p className="text-white text-lg font-semibold mb-1">{creatorName}</p>
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
              <p className="text-white/60 text-sm">Stream is starting...</p>
            </div>
          </>
        ) : (
          <p className="text-white/60 text-lg">Stream {streamStatus.toLowerCase()}</p>
        )}
      </div>
    );
  }

  // CASE 2: SCHEDULED
  if (streamStatus === 'SCHEDULED') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
        <Shirt className="w-16 h-16 text-white/30 mb-4" />
        <p className="text-white text-lg font-semibold mb-1">{creatorName}</p>
        <div className="flex items-center gap-2 mt-2">
          <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
          <p className="text-white/60 text-sm">Stream is starting...</p>
        </div>
        <p className="text-white/40 text-xs mt-2">This may take a few seconds</p>
      </div>
    );
  }

  // Unmute handler — reaches into Shadow DOM for the real <video>
  async function handleUnmute() {
    try {
      const player = playerRef.current;
      if (!player) { console.log('[DressMe] No player ref'); return; }

      const video = player.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
      console.log('[DressMe] Unmute:', { player: !!player, shadowRoot: !!player.shadowRoot, video: !!video });

      if (video) {
        video.muted = false;
        video.volume = 1;
        await video.play();
        console.log('[DressMe] SOUND ENABLED via shadow DOM video');
      } else {
        player.muted = false;
        player.volume = 1;
        await player.play?.();
        console.log('[DressMe] SOUND ENABLED via player element fallback');
      }
    } catch (err) {
      console.error('[DressMe] UNMUTE FAILED:', err);
    }
    setShowUnmute(false);
  }

  // CASE 3: LIVE — MuxPlayer with controls disabled, we own the UI
  return (
    <div className="relative w-full h-full">
      {/* Video layer — no pointer events, no built-in controls */}
      <MuxPlayer
        ref={playerRef}
        key={retryKey}
        playbackId={playbackId!}
        streamType={isLive ? 'live' : 'on-demand'}
        metadata={{
          video_id: playbackId!,
          video_title: title,
          viewer_user_id: viewerUserId || 'anonymous',
        }}
        autoPlay="muted"
        playsInline
        style={{ width: '100%', height: '100%', minHeight: '400px', pointerEvents: 'none' }}
        primaryColor="#ec4899"
        accentColor="#8b5cf6"
      />

      {/* Our UI layer — above the player */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
        {/* Low latency badge */}
        {isLive && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
            LOW LATENCY
          </div>
        )}

        {/* Unmute button — pointer-events-auto so it's clickable */}
        {showUnmute && (
          <button
            onClick={handleUnmute}
            className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-full bg-black/80 backdrop-blur-sm border border-white/30 text-white text-sm font-semibold shadow-lg animate-pulse"
          >
            Tap to enable sound
          </button>
        )}
      </div>
    </div>
  );
}
