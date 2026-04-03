import { useState, useEffect, useCallback, useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Shirt, RefreshCw, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PlaybackTokens {
  video?: string;
  thumbnail?: string;
  storyboard?: string;
}

interface VideoSurfaceProps {
  playbackId: string | null;
  streamId?: string;
  streamStatus: string;
  creatorName: string;
  title: string;
  viewerUserId?: string;
  isLive?: boolean;
  tokens?: PlaybackTokens | null;
}

export function VideoSurface({
  playbackId,
  streamId,
  streamStatus,
  creatorName,
  title,
  viewerUserId,
  isLive,
  tokens,
}: VideoSurfaceProps) {
  const [playbackError, setPlaybackError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [isPlayable, setIsPlayable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll /api/streams/:id/status to check if Mux is actually receiving video
  useEffect(() => {
    if (!streamId || !playbackId) return;
    if (streamStatus !== 'LIVE' && streamStatus !== 'SCHEDULED') return;

    let cancelled = false;
    let pollCount = 0;
    const MAX_POLLS = 60; // Stop after 5 minutes (60 * 5s)

    async function checkStatus() {
      try {
        const res = await fetch(`${API_URL}/api/streams/${streamId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.isPlayable) {
          setIsPlayable(true);
          setPlaybackError(false);
          setRetryKey((k) => k + 1);
        }
      } catch {}
    }

    // Check immediately
    setChecking(true);
    checkStatus().then(() => setChecking(false));

    // Then poll every 5 seconds until playable or max reached
    pollRef.current = setInterval(() => {
      pollCount++;
      if (pollCount >= MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setTimedOut(true);
        return;
      }
      checkStatus();
    }, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [streamId, streamStatus, playbackId]);

  // Stop polling once playable
  useEffect(() => {
    if (isPlayable && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [isPlayable]);

  const handleError = useCallback(() => {
    setPlaybackError(true);
    // If we thought it was playable, recheck
    setIsPlayable(false);
  }, []);

  const handleRetry = useCallback(() => {
    setPlaybackError(false);
    setRetryKey((k) => k + 1);
  }, []);

  // Show waiting state only if:
  // - no playbackId at all
  // - stream is SCHEDULED (not yet live)
  // - playback errored and stream isn't confirmed active
  // If stream is LIVE with a playbackId, show the MuxPlayer — it handles buffering internally
  const showWaiting = !playbackId
    || streamStatus === 'SCHEDULED'
    || (playbackError && !isPlayable);

  if (showWaiting) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
        <Shirt className="w-16 h-16 text-white/30 mb-4" />
        {(streamStatus === 'LIVE' || streamStatus === 'SCHEDULED') ? (
          <>
            <p className="text-white text-lg font-semibold mb-1">{creatorName} is Live</p>
            {timedOut ? (
              <>
                <p className="text-white/60 text-sm mt-2">Stream failed to connect</p>
                <button
                  onClick={() => { setTimedOut(false); setPlaybackError(false); setIsPlayable(false); setRetryKey((k) => k + 1); }}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/20 text-brand-400 text-sm font-semibold hover:bg-brand-500/30 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                  <p className="text-white/60 text-sm">
                    {streamStatus === 'SCHEDULED' ? 'Stream is starting...' : 'Connecting to stream...'}
                  </p>
                </div>
                <p className="text-white/40 text-xs mt-2">This may take a few seconds</p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                  <p className="text-white/40 text-[10px]">Auto-connecting when ready</p>
                </div>
              </>
            )}
            {playbackError && !timedOut && (
              <button
                onClick={handleRetry}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Now
              </button>
            )}
          </>
        ) : (
          <p className="text-white/60 text-lg">Stream {streamStatus.toLowerCase()}</p>
        )}
      </div>
    );
  }

  // Build token props for signed playback (if tokens are provided)
  const tokenProps = tokens?.video
    ? {
        tokens: {
          playback: tokens.video,
          thumbnail: tokens.thumbnail,
          storyboard: tokens.storyboard,
        },
      }
    : {};

  return (
    <MuxPlayer
      key={retryKey}
      playbackId={playbackId}
      streamType={isLive ? 'live' : 'on-demand'}
      metadata={{
        video_id: playbackId,
        video_title: title,
        viewer_user_id: viewerUserId || 'anonymous',
      }}
      autoPlay="muted"
      muted
      playsInline
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
      primaryColor="#ec4899"
      accentColor="#8b5cf6"
      onError={handleError}
      {...tokenProps}
    />
  );
}
