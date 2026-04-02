import MuxPlayer from '@mux/mux-player-react';
import { Shirt } from 'lucide-react';

interface PlaybackTokens {
  video?: string;
  thumbnail?: string;
  storyboard?: string;
}

interface VideoSurfaceProps {
  playbackId: string | null;
  streamStatus: string;
  creatorName: string;
  title: string;
  viewerUserId?: string;
  isLive?: boolean;
  tokens?: PlaybackTokens | null;
}

export function VideoSurface({
  playbackId,
  streamStatus,
  creatorName,
  title,
  viewerUserId,
  isLive,
  tokens,
}: VideoSurfaceProps) {
  if (!playbackId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
        <Shirt className="w-16 h-16 text-white/30 mb-4" />
        {streamStatus === 'LIVE' ? (
          <>
            <p className="text-white text-lg font-semibold mb-1">{creatorName} is Live</p>
            <p className="text-white/60 text-sm">Waiting for video feed...</p>
            <p className="text-white/40 text-xs mt-2">Chat is available below!</p>
          </>
        ) : streamStatus === 'SCHEDULED' ? (
          <>
            <p className="text-white/60 text-lg">Stream scheduled</p>
            <p className="text-white/40 text-sm mt-1">Check back when the creator goes live</p>
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
      {...tokenProps}
    />
  );
}
