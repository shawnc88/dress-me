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
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (streamStatus !== 'SCHEDULED' || !streamId) return;
    const interval = setInterval(() => setRetryKey((k) => k + 1), 5000);
    return () => clearInterval(interval);
  }, [streamStatus, streamId]);

  const handleEnableSound = async () => {
    try {
      const player = playerRef.current;
      if (!player) { console.log('[DressMe] No player ref'); return; }

      const video = player.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
      console.log('[DressMe] Enable sound:', { player: !!player, shadowRoot: !!player.shadowRoot, video: !!video });

      if (!video) {
        console.log('[DressMe] No video element in shadow DOM');
        return;
      }

      video.muted = false;
      video.volume = 1;
      await video.play();
      setSoundEnabled(true);
      console.log('[DressMe] Sound enabled');
    } catch (err) {
      console.error('[DressMe] Unmute failed:', err);
    }
  };

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

  // CASE 3: LIVE
  return (
    <div className="relative w-full h-full">
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

      {/* Sound button — above player, always clickable */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {!soundEnabled && (
          <button
            onClick={handleEnableSound}
            className="pointer-events-auto absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2.5 text-white text-sm font-medium rounded-full border border-white/20 shadow-lg"
          >
            Tap for sound
          </button>
        )}
        {soundEnabled && (
          <button
            onClick={() => {
              const video = playerRef.current?.shadowRoot?.querySelector('video') as HTMLVideoElement | null;
              if (video) { video.muted = true; setSoundEnabled(false); }
            }}
            className="pointer-events-auto absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm px-4 py-2.5 text-white text-sm font-medium rounded-full border border-white/10"
          >
            Sound on
          </button>
        )}
      </div>
    </div>
  );
}
