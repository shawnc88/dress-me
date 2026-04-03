import { useCallback, useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  useLocalParticipant,
  useConnectionState,
} from '@livekit/components-react';
import {
  Track,
  ConnectionState as LKConnectionState,
  createLocalTracks,
  createLocalVideoTrack,
  ConnectionQuality,
} from 'livekit-client';
import '@livekit/components-styles';

// ─── Types ───────────────────────────────────────────────────────

interface BrowserPublisherProps {
  token: string;
  wsUrl: string;
  streamTitle: string;
  onDisconnect: () => void;
  onTracksReady: () => void;
  onError?: (message: string) => void;
}

// ─── useAudioMeter hook ──────────────────────────────────────────

function useAudioMeter(localParticipant: any, isConnected: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = micPub?.track?.mediaStreamTrack;
    if (!mediaTrack) {
      setLevel(0);
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(new MediaStream([mediaTrack]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128;
        sum += normalized * normalized;
      }
      setLevel(Math.sqrt(sum / data.length));
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
      ctxRef.current = null;
    };
  }, [isConnected, localParticipant, localParticipant.trackPublications]);

  return level;
}

// ─── AudioMeter component ────────────────────────────────────────

function AudioMeter({ level, muted }: { level: number; muted: boolean }) {
  const bars = muted ? 0 : Math.min(10, Math.max(0, Math.round(level * 40)));
  return (
    <div className="flex items-end gap-0.5 h-6" title={muted ? 'Mic muted' : `Level: ${Math.round(level * 100)}%`}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${
            i < bars
              ? i < 7 ? 'bg-emerald-400' : i < 9 ? 'bg-amber-400' : 'bg-red-400'
              : 'bg-white/15'
          }`}
          style={{ height: `${i < bars ? 8 + i * 2 : 8}px` }}
        />
      ))}
    </div>
  );
}

// ─── Connection quality label ────────────────────────────────────

function useConnectionQuality(localParticipant: any) {
  const [quality, setQuality] = useState<string>('Unknown');

  useEffect(() => {
    const handler = (q: ConnectionQuality) => {
      const labels: Record<string, string> = {
        [ConnectionQuality.Excellent]: 'Excellent',
        [ConnectionQuality.Good]: 'Good',
        [ConnectionQuality.Poor]: 'Poor',
        [ConnectionQuality.Lost]: 'Lost',
      };
      setQuality(labels[q] || 'Unknown');
    };
    localParticipant.on('connectionQualityChanged', handler);
    return () => { localParticipant.off('connectionQualityChanged', handler); };
  }, [localParticipant]);

  return quality;
}

function QualityBadge({ quality }: { quality: string }) {
  const colorMap: Record<string, string> = {
    Excellent: 'bg-emerald-500/80',
    Good: 'bg-emerald-500/60',
    Poor: 'bg-amber-500/80',
    Lost: 'bg-red-500/80',
    Unknown: 'bg-white/20',
  };
  return (
    <div className={`flex items-center gap-1 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${colorMap[quality] || colorMap.Unknown}`}>
      <span className="inline-block">&#x1F4F6;</span> {quality}
    </div>
  );
}

// ─── PublisherControls (Creator HUD) ─────────────────────────────

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
  const [audioPublished, setAudioPublished] = useState(false);
  const [ending, setEnding] = useState(false);
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');
  const [switching, setSwitching] = useState(false);
  const [streamStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState('0:00');
  const audioInitRef = useRef(false);

  // Audio meter
  const audioLevel = useAudioMeter(localParticipant, isConnected);
  const connQuality = useConnectionQuality(localParticipant);

  // Elapsed time ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - streamStartTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [streamStartTime]);

  // Attach camera track to video element
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
  }, [localParticipant, isConnected, videoMuted, cameraMode]);

  // Force-publish audio track on connect
  useEffect(() => {
    if (!isConnected || audioInitRef.current) return;
    audioInitRef.current = true;

    async function ensureAudio() {
      try {
        const existingAudio = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (existingAudio?.track) {
          console.log('[DressMe] Audio track already published');
          setAudioPublished(true);
          return;
        }

        console.log('[DressMe] Creating local audio track...');
        const tracks = await createLocalTracks({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });

        const audioTrack = tracks.find(t => t.kind === 'audio');
        if (audioTrack) {
          await localParticipant.publishTrack(audioTrack);
          console.log('[DressMe] Audio track published successfully');
          setAudioPublished(true);
        } else {
          console.error('[DressMe] No audio track created');
        }
      } catch (err) {
        console.error('[DressMe] Failed to publish audio track:', err);
      }
    }

    ensureAudio();
  }, [isConnected, localParticipant]);

  // Camera flip
  async function switchCamera() {
    if (switching) return;
    setSwitching(true);
    try {
      const nextMode = cameraMode === 'user' ? 'environment' : 'user';
      console.log(`[DressMe] Switching camera to ${nextMode}`);

      const newTrack = await createLocalVideoTrack({
        facingMode: nextMode,
        resolution: { width: 720, height: 1280, frameRate: 24 },
      });

      // Unpublish current video track
      const currentVideoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (currentVideoPub?.track) {
        await localParticipant.unpublishTrack(currentVideoPub.track);
        currentVideoPub.track.stop();
      }

      await localParticipant.publishTrack(newTrack);
      setCameraMode(nextMode);
      console.log(`[DressMe] Camera switched to ${nextMode}`);
    } catch (err: any) {
      console.error('[DressMe] Camera switch failed:', err);
    } finally {
      setSwitching(false);
    }
  }

  async function toggleVideo() {
    await localParticipant.setCameraEnabled(videoMuted);
    setVideoMuted(!videoMuted);
  }

  async function toggleAudio() {
    await localParticipant.setMicrophoneEnabled(audioMuted);
    setAudioMuted(!audioMuted);
  }

  return (
    <div className="space-y-3">
      {/* Camera Preview with HUD overlay */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        {!videoMuted ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: cameraMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center min-h-[300px]">
            <p className="text-white/60">Camera is off</p>
          </div>
        )}

        {/* Top HUD bar */}
        <div className="absolute top-0 left-0 right-0 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
              {isConnected && (
                <div className="text-white/70 text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded-full">
                  {elapsed}
                </div>
              )}
              <QualityBadge quality={connQuality} />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-white/60 text-[10px] bg-black/40 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                {streamTitle}
              </div>
              {/* Camera flip button */}
              {isConnected && !videoMuted && (
                <button
                  onClick={switchCamera}
                  disabled={switching}
                  className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition disabled:opacity-50"
                  title={`Switch to ${cameraMode === 'user' ? 'rear' : 'front'} camera`}
                >
                  {switching ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10l6 6M15 10l-6 6" opacity={0.4} />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom HUD bar — audio meter + mic status */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                audioPublished && !audioMuted ? 'bg-emerald-600/80 text-white' : 'bg-red-500/80 text-white'
              }`}>
                {audioPublished && !audioMuted ? 'MIC' : 'MUTED'}
              </div>
              <AudioMeter level={audioLevel} muted={audioMuted || !audioPublished} />
            </div>
            <div className="text-white/40 text-[10px]">
              {cameraMode === 'user' ? 'Front' : 'Rear'}
            </div>
          </div>
        </div>

        {/* Connection overlay */}
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-sm">
              {connectionState === LKConnectionState.Connecting ? 'Connecting...' : connectionState === LKConnectionState.Reconnecting ? 'Reconnecting...' : 'Disconnected'}
            </p>
          </div>
        )}
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-2">
        <button onClick={toggleVideo} className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${videoMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}>
          {videoMuted ? 'Camera Off' : 'Camera On'}
        </button>
        <button onClick={toggleAudio} className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${audioMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'}`}>
          {audioMuted ? 'Mic Off' : 'Mic On'}
        </button>
        <button
          onClick={switchCamera}
          disabled={switching || videoMuted}
          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 text-white hover:bg-white/10 transition disabled:opacity-30"
        >
          {switching ? 'Flipping...' : 'Flip Cam'}
        </button>
        <button
          onClick={() => { setEnding(true); localParticipant.setCameraEnabled(false).catch(() => {}); localParticipant.setMicrophoneEnabled(false).catch(() => {}); onEnd(); }}
          disabled={ending}
          className="px-5 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
        >
          {ending ? 'Ending...' : 'End Live'}
        </button>
      </div>
    </div>
  );
}

// ─── TrackWatcher ────────────────────────────────────────────────

function TrackWatcher({ onReady }: { onReady: () => void }) {
  const { localParticipant } = useLocalParticipant();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const check = setInterval(() => {
      const pubs = localParticipant.trackPublications;
      const allTracks = Array.from(pubs.values());
      const hasVideo = allTracks.some(p => p.track && p.source === Track.Source.Camera);
      const hasAudio = allTracks.some(p => p.track && p.source === Track.Source.Microphone);
      console.log(`[DressMe] Track check: video=${hasVideo}, audio=${hasAudio}, ${pubs.size} total`);

      if (hasVideo && hasAudio && !firedRef.current) {
        firedRef.current = true;
        clearInterval(check);
        // 2s propagation (reduced from 5s for lower latency)
        console.log('[DressMe] Both tracks published! Waiting 2s for propagation...');
        setTimeout(() => {
          console.log('[DressMe] Tracks ready — triggering egress');
          onReady();
        }, 2000);
      }
    }, 500);

    const timeout = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        clearInterval(check);
        console.warn('[DressMe] Track timeout — triggering egress with available tracks');
        onReady();
      }
    }, 15000);

    return () => { clearInterval(check); clearTimeout(timeout); };
  }, [localParticipant, onReady]);

  return null;
}

// ─── Main BrowserPublisher ───────────────────────────────────────

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
          Publishing camera &amp; microphone...
        </div>
      )}
      {connectionError && (
        <div className="mt-2 p-3 bg-red-900/20 rounded-xl text-sm text-red-400">{connectionError}</div>
      )}
    </LiveKitRoom>
  );
}
