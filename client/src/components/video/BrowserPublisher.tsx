import { useCallback, useState } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  TrackToggle,
  ConnectionState,
  useLocalParticipant,
  useConnectionState,
  ConnectionQualityIndicator,
} from '@livekit/components-react';
import { Track, ConnectionState as LKConnectionState } from 'livekit-client';
import '@livekit/components-styles';

interface BrowserPublisherProps {
  token: string;
  wsUrl: string;
  streamTitle: string;
  onDisconnect: () => void;
  onConnected: () => void;
}

function PublisherControls({
  streamTitle,
  onEnd,
}: {
  streamTitle: string;
  onEnd: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const isConnected = connectionState === LKConnectionState.Connected;

  return (
    <div className="space-y-4">
      {/* Local video preview */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        {localParticipant.getTrackPublication(Track.Source.Camera) ? (
          <VideoTrack
            trackRef={{
              participant: localParticipant,
              source: Track.Source.Camera,
              publication: localParticipant.getTrackPublication(Track.Source.Camera)!,
            }}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[300px]">
            <p className="text-white/60">Camera is off</p>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isConnected && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
          <ConnectionQualityIndicator className="text-white" />
        </div>

        <div className="absolute top-3 right-3 text-white/80 text-xs bg-black/50 px-2 py-1 rounded">
          {streamTitle}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <TrackToggle
          source={Track.Source.Camera}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        />
        <TrackToggle
          source={Track.Source.Microphone}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        />
        <button
          onClick={onEnd}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition"
        >
          End Stream
        </button>
      </div>

      {/* Connection status */}
      <div className="text-center">
        <ConnectionState className="text-xs text-gray-400" />
      </div>
    </div>
  );
}

export function BrowserPublisher({
  token,
  wsUrl,
  streamTitle,
  onDisconnect,
  onConnected,
}: BrowserPublisherProps) {
  const [hasNotifiedConnected, setHasNotifiedConnected] = useState(false);

  const handleConnected = useCallback(() => {
    if (!hasNotifiedConnected) {
      setHasNotifiedConnected(true);
      // Small delay to ensure tracks are published before starting egress
      setTimeout(() => onConnected(), 2000);
    }
  }, [hasNotifiedConnected, onConnected]);

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onConnected={handleConnected}
      onDisconnected={onDisconnect}
    >
      <PublisherControls streamTitle={streamTitle} onEnd={onDisconnect} />
    </LiveKitRoom>
  );
}
