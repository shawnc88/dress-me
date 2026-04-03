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

  // For SCHEDULED streams, auto-refresh page data every 5s to detect LIVE transition
  useEffect(() => {
    if (streamStatus !== 'SCHEDULED' || !streamId) return;

    const interval = setInterval(() => {
      setRetryKey((k) => k + 1);
    }, 5000);

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

  // CASE 3: LIVE — MuxPlayer handles its own volume controls
  return (
    <div className="relative">
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
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        primaryColor="#ec4899"
        accentColor="#8b5cf6"
      />
      {/* Low latency badge */}
      {isLive && (
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full pointer-events-none">
          LOW LATENCY
        </div>
      )}
      {/* Tap to unmute — must use direct player API + .play() for mobile */}
      {showUnmute && (
        <button
          onClick={async () => {
            try {
              const player = playerRef.current;
              if (!player) return;

              // MuxPlayer ref is the <mux-player> element itself
              player.muted = false;
              player.volume = 1;

              // .play() must be called from a user gesture for mobile browsers
              await player.play?.();

              console.log('[DressMe] Unmuted successfully');
            } catch (err) {
              console.error('[DressMe] Unmute failed:', err);
            }
            setShowUnmute(false);
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 text-white text-sm font-medium hover:bg-black/90 transition-all animate-pulse"
        >
          Tap to enable sound
        </button>
      )}
    </div>
  );
}
