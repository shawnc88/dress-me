import dynamic from 'next/dynamic';
import { Shirt, Radio, Calendar, Archive } from 'lucide-react';

const MuxPlayer = dynamic(() => import('@mux/mux-player-react'), { ssr: false });

interface PlaybackTokens {
  video?: string;
  thumbnail?: string;
  storyboard?: string;
}

interface LiveVideoPlayerProps {
  playbackId: string | null;
  streamStatus: string;
  creatorName: string;
  title: string;
  viewerUserId?: string;
  isLive?: boolean;
  tokens?: PlaybackTokens | null;
  /** Fill entire container (for full-screen vertical layout) */
  fillContainer?: boolean;
}

export function LiveVideoPlayer({
  playbackId,
  streamStatus,
  creatorName,
  title,
  viewerUserId,
  isLive,
  tokens,
  fillContainer = false,
}: LiveVideoPlayerProps) {
  if (!playbackId) {
    return (
      <div className={`w-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black ${fillContainer ? 'h-full' : 'min-h-[400px] lg:min-h-[500px]'}`}>
        <Shirt className="w-16 h-16 text-white/20 mb-4" />
        {streamStatus === 'LIVE' ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <p className="text-white text-lg font-semibold">{creatorName} is Live</p>
            </div>
            <p className="text-white/50 text-sm">Waiting for video feed...</p>
          </>
        ) : streamStatus === 'SCHEDULED' ? (
          <>
            <Calendar className="w-8 h-8 text-brand-400 mb-2" />
            <p className="text-white/60 text-lg font-medium">Stream Scheduled</p>
            <p className="text-white/40 text-sm mt-1">Check back when the creator goes live</p>
          </>
        ) : (
          <>
            <Archive className="w-8 h-8 text-gray-500 mb-2" />
            <p className="text-white/60 text-lg">Stream {streamStatus.toLowerCase()}</p>
          </>
        )}
      </div>
    );
  }

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
      playbackId={playbackId}
      streamType={isLive ? 'live' : 'on-demand'}
      metadata={{
        video_id: playbackId,
        video_title: title,
        viewer_user_id: viewerUserId || 'anonymous',
      }}
      autoPlay="muted"
      playsInline
      {...(isLive ? { targetLiveWindow: 6 } : {})}
      style={{
        width: '100%',
        height: fillContainer ? '100%' : undefined,
        minHeight: fillContainer ? undefined : '400px',
      } as any}
      primaryColor="#ec4899"
      accentColor="#8b5cf6"
      {...tokenProps}
    />
  );
}
