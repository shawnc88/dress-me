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

function useAudioMeter(localParticipant: any, isConnected: boolean, audioPublished: boolean) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isConnected || !audioPublished) {
      setLevel(0);
      return;
    }

    // Poll for the mediaStreamTrack to become available
    let pollTimer: ReturnType<typeof setInterval>;
    let pollAttempts = 0;

    pollTimer = setInterval(() => {
      pollAttempts++;
      if (startedRef.current) { clearInterval(pollTimer); return; }

      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const mediaTrack = micPub?.track?.mediaStreamTrack;

      if (!mediaTrack || mediaTrack.readyState !== 'live') {
        if (pollAttempts > 20) { // give up after 10s
          console.warn('[DressMe] AudioMeter: gave up waiting for mediaStreamTrack');
          clearInterval(pollTimer);
        }
        return;
      }

      // Track is ready — set up analyser
      clearInterval(pollTimer);
      startedRef.current = true;
      console.log('[DressMe] AudioMeter: track ready, starting analyser', {
        enabled: mediaTrack.enabled,
        muted: mediaTrack.muted,
        readyState: mediaTrack.readyState,
        label: mediaTrack.label,
      });

      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(new MediaStream([mediaTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        ctxRef.current = ctx;
        sourceRef.current = source;
        analyserRef.current = analyser;

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
      } catch (err) {
        console.error('[DressMe] AudioMeter: failed to create analyser', err);
      }
    }, 500);

    return () => {
      clearInterval(pollTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
        ctxRef.current?.close();
      } catch {}
      ctxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
      startedRef.current = false;
    };
  }, [isConnected, audioPublished, localParticipant]);

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

// ─── Connection quality ──────────────────────────────────────────

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

// ─── PublisherControls (Creator HUD) ─────────────────────────────

function PublisherControls({
  streamTitle,
  onEnd,
  onTracksPublished,
}: {
  streamTitle: string;
  onEnd: () => void;
  onTracksPublished: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const isConnected = connectionState === LKConnectionState.Connected;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoMuted, setVideoMuted] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioPublished, setAudioPublished] = useState(false);
  const [videoPublished, setVideoPublished] = useState(false);
  const [ending, setEnding] = useState(false);
  const [cameraMode, setCameraMode] = useState<'user' | 'environment'>('user');
  const [switching, setSwitching] = useState(false);
  const [streamStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState('0:00');

  const publishedRef = useRef(false);
  const tracksNotifiedRef = useRef(false);
  const audioLevelRef = useRef(0);

  const audioLevel = useAudioMeter(localParticipant, isConnected, audioPublished);
  audioLevelRef.current = audioLevel; // keep ref in sync for interval reads
  const connQuality = useConnectionQuality(localParticipant);

  // Elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - streamStartTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [streamStartTime]);

  // EXPLICIT track publishing — this is the ONLY place tracks get created
  // LiveKitRoom has audio={false} video={false} so nothing auto-publishes
  useEffect(() => {
    if (!isConnected || publishedRef.current) return;
    publishedRef.current = true;

    async function publishAllTracks() {
      console.log('[DressMe] Publishing audio + video tracks explicitly...');

      try {
        // Create both tracks together
        const tracks = await createLocalTracks({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            facingMode: 'user',
            resolution: { width: 720, height: 1280, frameRate: 24 },
          },
        });

        for (const track of tracks) {
          await localParticipant.publishTrack(track);
          // Log detailed track state after publish
          const mst = track.mediaStreamTrack;
          console.log(`[DressMe] Published ${track.kind} track:`, {
            source: track.source,
            enabled: mst.enabled,
            muted: mst.muted,
            readyState: mst.readyState,
            label: mst.label,
          });
        }

        const hasAudio = tracks.some(t => t.kind === 'audio');
        const hasVideo = tracks.some(t => t.kind === 'video');

        setAudioPublished(hasAudio);
        setVideoPublished(hasVideo);

        console.log(`[DressMe] All tracks published: audio=${hasAudio}, video=${hasVideo}`);

      } catch (err: any) {
        console.error('[DressMe] Track publish failed:', err);
      }
    }

    publishAllTracks();
  }, [isConnected, localParticipant]);

  // Notify parent when BOTH tracks published AND real audio input detected
  useEffect(() => {
    if (!audioPublished || !videoPublished || tracksNotifiedRef.current) return;

    // Gate: wait for audio meter to show real input (level > 0.02)
    // If no input after 6s, proceed anyway (user may be silent initially)
    const gateStart = Date.now();
    const gateCheck = setInterval(() => {
      const elapsedMs = Date.now() - gateStart;
      const currentLevel = audioLevelRef.current; // read from ref, not stale closure
      const meetsThreshold = currentLevel > 0.02;
      const timedOut = elapsedMs > 6000;

      if ((meetsThreshold || timedOut) && !tracksNotifiedRef.current) {
        tracksNotifiedRef.current = true;
        clearInterval(gateCheck);
        console.log(`[DressMe] Audio gate passed: level=${currentLevel.toFixed(3)}, timedOut=${timedOut}, elapsed=${elapsedMs}ms`);
        // 1s propagation delay
        setTimeout(() => {
          console.log('[DressMe] Triggering egress now');
          onTracksPublished();
        }, 1000);
      }
    }, 300);

    return () => clearInterval(gateCheck);
  }, [audioPublished, videoPublished, onTracksPublished]); // audioLevel NOT in deps

  // Attach camera track to video element
  useEffect(() => {
    if (!videoRef.current || !isConnected || !videoPublished) return;

    const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
    if (camPub?.track) {
      camPub.track.attach(videoRef.current);
      console.log('[DressMe] Camera track attached to video element');
    }
    return () => {
      if (camPub?.track && videoRef.current) {
        camPub.track.detach(videoRef.current);
      }
    };
  }, [localParticipant, isConnected, videoPublished, videoMuted, cameraMode]);

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
        {!videoMuted && videoPublished ? (
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
            <p className="text-white/60">{videoPublished ? 'Camera is off' : 'Starting camera...'}</p>
          </div>
        )}

        {/* Top HUD bar */}
        <div className="absolute top-0 left-0 right-0 px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isConnected && (
                <div className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
              <div className="text-white/70 text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded-full">
                {elapsed}
              </div>
              <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                connQuality === 'Excellent' || connQuality === 'Good' ? 'bg-emerald-500/60 text-white' :
                connQuality === 'Poor' ? 'bg-amber-500/80 text-white' : 'bg-white/20 text-white'
              }`}>
                {connQuality}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-white/50 text-[10px] bg-black/40 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                {streamTitle}
              </div>
              {/* Camera flip button in HUD */}
              {isConnected && videoPublished && !videoMuted && (
                <button
                  onClick={switchCamera}
                  disabled={switching}
                  className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition disabled:opacity-40"
                  title={`Switch to ${cameraMode === 'user' ? 'rear' : 'front'} camera`}
                >
                  {switching ? (
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                audioPublished && !audioMuted
                  ? audioLevel > 0.02
                    ? 'bg-emerald-600/80 text-white'
                    : 'bg-amber-500/80 text-white'
                  : 'bg-red-500/80 text-white'
              }`}>
                {!audioPublished ? 'NO MIC' : audioMuted ? 'MUTED' : audioLevel > 0.02 ? 'MIC LIVE' : 'MIC SILENT'}
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
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button onClick={toggleVideo} disabled={!videoPublished} className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${videoMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'} disabled:opacity-30`}>
          {videoMuted ? 'Camera Off' : 'Camera On'}
        </button>
        <button onClick={toggleAudio} disabled={!audioPublished} className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${audioMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white hover:bg-white/10'} disabled:opacity-30`}>
          {audioMuted ? 'Mic Off' : 'Mic On'}
        </button>
        <button
          onClick={switchCamera}
          disabled={switching || videoMuted || !videoPublished}
          className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white/5 text-white hover:bg-white/10 transition disabled:opacity-30"
        >
          {switching ? 'Flipping...' : 'Flip Cam'}
        </button>
        <button
          onClick={async () => {
            setEnding(true);
            // Properly release all tracks (stop device hardware)
            try {
              const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
              const audioPub = localParticipant.getTrackPublication(Track.Source.Microphone);
              if (videoPub?.track) { await localParticipant.unpublishTrack(videoPub.track); videoPub.track.stop(); }
              if (audioPub?.track) { await localParticipant.unpublishTrack(audioPub.track); audioPub.track.stop(); }
            } catch {}
            onEnd();
          }}
          disabled={ending}
          className="px-5 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
        >
          {ending ? 'Ending...' : 'End Live'}
        </button>
      </div>

      {/* Track status bar — honest state */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-white/40">
        <span>Mic: {audioPublished ? 'Published' : 'Pending...'}</span>
        <span>Audio Input: {audioLevel > 0.02 ? 'Detected' : 'No Input'}</span>
        <span>Cam: {videoPublished ? 'Published' : 'Pending...'}</span>
      </div>
    </div>
  );
}

// ─── Main BrowserPublisher ───────────────────────────────────────

export function BrowserPublisher({ token, wsUrl, streamTitle, onDisconnect, onTracksReady, onError }: BrowserPublisherProps) {
  const [connected, setConnected] = useState(false);
  const [tracksReady, setTracksReady] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  const handleConnected = useCallback(() => {
    setConnected(true);
    console.log('[DressMe] LiveKit room connected');
  }, []);

  const handleTracksPublished = useCallback(() => {
    if (!tracksReady) {
      setTracksReady(true);
      console.log('[DressMe] Tracks published — calling onTracksReady to start egress');
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
      video={false}
      audio={false}
      onConnected={handleConnected}
      onDisconnected={onDisconnect}
      onError={handleError}
    >
      <PublisherControls
        streamTitle={streamTitle}
        onEnd={onDisconnect}
        onTracksPublished={handleTracksPublished}
      />
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
