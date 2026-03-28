import { useCallback, useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  useLocalParticipant,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState as LKConnectionState } from 'livekit-client';
import '@livekit/components-styles';

interface BrowserPublisherProps {
  token: string;
  wsUrl: string;
  streamTitle: string;
  onDisconnect: () => void;
  onConnected: () => void;
  onError?: (message: string) => void;
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMuted, setVideoMuted] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);

  // Attach local video track to video element
  useEffect(() => {
    if (!videoRef.current || !isConnected) return;

    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track) {
      camPub.track.attach(videoRef.current);
    }

    return () => {
      if (camPub?.track) {
        camPub.track.detach(videoRef.current!);
      }
    };
  }, [localParticipant, isConnected, videoMuted]);

  async function toggleVideo() {
    if (videoMuted) {
      await localParticipant.setCameraEnabled(true);
    } else {
      await localParticipant.setCameraEnabled(false);
    }
    setVideoMuted(!videoMuted);
  }

  async function toggleAudio() {
    if (audioMuted) {
      await localParticipant.setMicrophoneEnabled(true);
    } else {
      await localParticipant.setMicrophoneEnabled(false);
    }
    setAudioMuted(!audioMuted);
  }

  return (
    <div className="space-y-4">
      {/* Local video preview */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        {!videoMuted ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
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
        </div>

        <div className="absolute top-3 right-3 text-white/80 text-xs bg-black/50 px-2 py-1 rounded">
          {streamTitle}
        </div>

        {/* Connection state */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-sm">
              {connectionState === LKConnectionState.Connecting
                ? 'Connecting...'
                : connectionState === LKConnectionState.Reconnecting
                  ? 'Reconnecting...'
                  : 'Disconnected'}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleVideo}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            videoMuted
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {videoMuted ? 'Camera Off' : 'Camera On'}
        </button>
        <button
          onClick={toggleAudio}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            audioMuted
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {audioMuted ? 'Mic Off' : 'Mic On'}
        </button>
        <button
          onClick={onEnd}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition"
        >
          End Stream
        </button>
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
  onError,
}: BrowserPublisherProps) {
  const [hasNotifiedConnected, setHasNotifiedConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const handleConnected = useCallback(() => {
    if (!hasNotifiedConnected) {
      setHasNotifiedConnected(true);
      setConnectionError('');
      // Delay to ensure tracks are published before starting egress
      setTimeout(() => onConnected(), 2000);
    }
  }, [hasNotifiedConnected, onConnected]);

  const handleError = useCallback((error: Error) => {
    console.error('LiveKit error:', error);
    const msg = `Streaming error: ${error.message}`;
    setConnectionError(msg);
    onError?.(msg);
  }, [onError]);

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect={true}
      video={true}
      audio={true}
      onConnected={handleConnected}
      onDisconnected={onDisconnect}
      onError={handleError}
    >
      <PublisherControls streamTitle={streamTitle} onEnd={onDisconnect} />
      {connectionError && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400">
          {connectionError}
        </div>
      )}
    </LiveKitRoom>
  );
}
