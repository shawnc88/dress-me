import MuxPlayer from '@mux/mux-player-react';

interface VideoSurfaceProps {
  playbackId: string | null;
  streamStatus: string;
  creatorName: string;
  title: string;
  viewerUserId?: string;
  isLive?: boolean;
}

export function VideoSurface({
  playbackId,
  streamStatus,
  creatorName,
  title,
  viewerUserId,
  isLive,
}: VideoSurfaceProps) {
  if (!playbackId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-purple-900 to-black min-h-[400px] lg:min-h-[500px]">
        <span className="text-6xl mb-4">👗</span>
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
    />
  );
}
