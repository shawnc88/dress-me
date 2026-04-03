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
  onTracksReady: () => void;
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
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !isConnected) return;
    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track) {
      camPub.track.attach(videoRef.current);
    }
    return () => {
      if (camPub?.track && videoRef.current) {
        camPub.track.detach(videoRef.current);
      }
    };
  }, [localParticipant, isConnected, videoMuted]);

  async function toggleVideo() {
    await localParticipant.setCameraEnabled(!videoMuted ? false : true);
    setVideoMuted(!videoMuted);
  }

  async function toggleAudio() {
    await localParticipant.setMicrophoneEnabled(!audioMuted ? false : true);
    setAudioMuted(!audioMuted);
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        {!videoMuted ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[300px]">
            <p className="text-white/60">Camera is off</p>
          </div>
        )}
        <div className="absolute top-3 left-3">
          {isConnected && (
            <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>
        <div className="absolute top-3 right-3 text-white/80 text-xs bg-black/50 px-2 py-1 rounded">{streamTitle}</div>
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-sm">
              {connectionState === LKConnectionState.Connecting ? 'Connecting...' : connectionState === LKConnectionState.Reconnecting ? 'Reconnecting...' : 'Disconnected'}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={toggleVideo} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${videoMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}>
          {videoMuted ? 'Camera Off' : 'Camera On'}
        </button>
        <button onClick={toggleAudio} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${audioMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}>
          {audioMuted ? 'Mic Off' : 'Mic On'}
        </button>
        <button
          onClick={() => { setEnding(true); localParticipant.setCameraEnabled(false).catch(() => {}); localParticipant.setMicrophoneEnabled(false).catch(() => {}); onEnd(); }}
          disabled={ending}
          className="px-6 py-2.5 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
        >
          {ending ? 'Ending...' : 'End Live'}
        </button>
      </div>
    </div>
  );
}

function TrackWatcher({ onReady }: { onReady: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const check = setInterval(() => {
      const pubs = localParticipant.trackPublications;
      const allTracks = Array.from(pubs.values());
      const published = allTracks.filter(p => p.track && !p.isMuted);
      const hasVideo = allTracks.some(p => p.track && p.source === Track.Source.Camera);
      const hasAudio = allTracks.some(p => p.track && p.source === Track.Source.Microphone);
      console.log(`[DressMe] Track check: ${published.length} active (video=${hasVideo}, audio=${hasAudio}, ${pubs.size} total)`);

      if (hasVideo && hasAudio && !firedRef.current) {
        firedRef.current = true;
        clearInterval(check);
        console.log('[DressMe] Both audio + video published! Waiting 5s for propagation...');
        setTimeout(() => {
          console.log('[DressMe] Tracks ready — triggering egress');
          onReady();
        }, 5000);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        clearInterval(check);
        console.warn('[DressMe] Track timeout — triggering egress with available tracks');
        onReady();
      }
    }, 20000);

    return () => { clearInterval(check); clearTimeout(timeout); };
  }, [localParticipant, onReady]);

  return null;
}

export function BrowserPublisher({ token, wsUrl, streamTitle, onDisconnect, onTracksReady, onError }: BrowserPublisherProps) {
  const [connected, setConnected] = useState(false);
  const [tracksReady, setTracksReady] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const handleConnected = useCallback(() => {
    setConnected(true);
    console.log('[DressMe] LiveKit connected');
  }, []);

  const handleTracksReady = useCallback(() => {
    if (!tracksReady) {
      setTracksReady(true);
      console.log('[DressMe] Calling onTracksReady');
      onTracksReady();
    }
  }, [tracksReady, onTracksReady]);

  const handleError = useCallback((error: Error) => {
    console.error('[DressMe] LiveKit error:', error);
    setConnectionError(`Streaming error: ${error.message}`);
    onError?.(`Streaming error: ${error.message}`);
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
      {connected && !tracksReady && <TrackWatcher onReady={handleTracksReady} />}
      <PublisherControls streamTitle={streamTitle} onEnd={onDisconnect} />
      {!tracksReady && connected && (
        <div className="mt-2 p-3 bg-amber-900/20 rounded-xl text-sm text-amber-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Publishing camera &amp; microphone... please wait
        </div>
      )}
      {connectionError && (
        <div className="mt-2 p-3 bg-red-900/20 rounded-xl text-sm text-red-400">{connectionError}</div>
      )}
    </LiveKitRoom>
  );
}
