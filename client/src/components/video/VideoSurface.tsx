import { useState, useEffect } from 'react';
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

  // CASE 3: LIVE — Let MuxPlayer handle everything including unmute
  // autoPlay="muted" satisfies browser autoplay policy
  // NO muted prop — so Mux's built-in volume/unmute controls work normally
  // NO pointerEvents override — let the player's native UI function
  return (
    <MuxPlayer
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
  );
}
