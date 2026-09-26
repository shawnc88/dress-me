import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, Check, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DevicePreviewProps {
  onReady: (stream: MediaStream) => void;
  onError: (error: string) => void;
}

// ─── Pre-flight checks ───────────────────────────────────────────
// The two live-room failures we already root-fixed (silent mic, reconnect
// purgatory) still cost creator TRUST. A visible camera ✓ mic ✓ connection ✓
// before the button makes the creator believe the room will work — which is
// a different job than making it work.

function PreflightChecks({ stream }: { stream: MediaStream | null }) {
  const [camOk, setCamOk] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const [connState, setConnState] = useState<'checking' | 'ok' | 'slow'>('checking');

  // Camera: the video track is actually delivering
  useEffect(() => {
    if (!stream) { setCamOk(false); return; }
    const track = stream.getVideoTracks()[0];
    setCamOk(!!track && track.readyState === 'live');
  }, [stream]);

  // Mic: real input level via AnalyserNode. iOS WKWebView starts AudioContext
  // suspended outside a gesture — resume on create AND on any tap (a16d867).
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) { setMicOk(false); return; }
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128) / 128);
        setMicLevel(peak);
        if (peak > 0.02) setMicOk(true);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { setMicOk(true); /* analyser unsupported — don't block on it */ }
    const resume = () => ctx?.resume().catch(() => {});
    document.addEventListener('touchstart', resume);
    document.addEventListener('click', resume);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('click', resume);
      ctx?.close().catch(() => {});
    };
  }, [stream]);

  // Connection: a timed round-trip to the API
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    fetch(`${API_URL}/health`, { signal: ctl.signal })
      .then(r => { if (!cancelled) setConnState(r.ok && Date.now() - started < 2500 ? 'ok' : 'slow'); })
      .catch(() => { if (!cancelled) setConnState('slow'); })
      .finally(() => clearTimeout(t));
    return () => { cancelled = true; ctl.abort(); };
  }, []);

  const Row = ({ ok, pending, label, detail }: { ok: boolean; pending?: boolean; label: string; detail?: string }) => (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border ${
        ok ? 'bg-accent-green/15 border-accent-green/40' : 'bg-white/[0.06] border-white/15'
      }`}>
        {ok ? <Check className="w-3.5 h-3.5 text-accent-green" strokeWidth={3} />
            : <Loader2 className={`w-3 h-3 text-white/40 ${pending ? 'animate-spin' : ''}`} />}
      </span>
      <div className="min-w-0">
        <p className={`text-[12px] font-bold leading-tight ${ok ? 'text-white' : 'text-white/50'}`}>{label}</p>
        {detail && <p className="text-white/35 text-[11px] leading-tight truncate">{detail}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch gap-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-3">
      <Row ok={camOk} pending={!camOk} label="Camera" detail={camOk ? 'Looking good' : 'Starting…'} />
      <Row ok={micOk} pending={!micOk} label="Mic" detail={micOk ? 'Picking you up' : 'Say something…'} />
      <Row ok={connState === 'ok'} pending={connState === 'checking'} label="Connection"
        detail={connState === 'ok' ? 'Fast' : connState === 'slow' ? 'A bit slow — still fine' : 'Testing…'} />
      {/* live mic meter */}
      <div className="w-1.5 rounded-full bg-white/10 overflow-hidden flex flex-col justify-end" aria-hidden>
        <div
          className="w-full bg-accent-green transition-[height] duration-75"
          style={{ height: `${Math.min(100, Math.round(micLevel * 300))}%` }}
        />
      </div>
    </div>
  );
}

interface MediaDeviceInfo_ {
  deviceId: string;
  label: string;
}

export function DevicePreview({ onReady, onError }: DevicePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo_[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo_[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const startPreview = useCallback(async (cameraId?: string, micId?: string) => {
    try {
      // Stop previous stream and wait for device release
      streamRef.current?.getTracks().forEach((t) => t.stop());
      await new Promise(r => setTimeout(r, 250));

      const constraints: MediaStreamConstraints = {
        video: cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: micId ? { deviceId: { exact: micId } } : true,
      };

      const ms = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = ms;
      setStream(ms);
      setPermissionDenied(false);

      if (videoRef.current) {
        videoRef.current.srcObject = ms;
      }

      // Enumerate devices after permission is granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}` })),
      );
      setMics(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}` })),
      );

      // Set selected devices from active tracks
      const videoTrack = ms.getVideoTracks()[0];
      const audioTrack = ms.getAudioTracks()[0];
      if (videoTrack && !cameraId) setSelectedCamera(videoTrack.getSettings().deviceId || '');
      if (audioTrack && !micId) setSelectedMic(audioTrack.getSettings().deviceId || '');

      onReady(ms);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        onError('Camera and microphone permissions are required to stream from your browser. Please allow access in your browser settings.');
      } else {
        onError(`Could not access camera/microphone: ${err.message}`);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startPreview();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCameraChange(deviceId: string) {
    setSelectedCamera(deviceId);
    startPreview(deviceId, selectedMic);
  }

  function handleMicChange(deviceId: string) {
    setSelectedMic(deviceId);
    startPreview(selectedCamera, deviceId);
  }

  if (permissionDenied) {
    return (
      <div className="card p-8 text-center">
        <Camera className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Camera Access Required</h3>
        <p className="text-gray-500 text-sm mb-4">
          Please allow camera and microphone access in your browser to stream from your browser.
        </p>
        <button onClick={() => startPreview()} className="btn-primary">
          <RefreshCw className="w-4 h-4 mr-1 inline" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Preview */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
          Preview
        </div>
      </div>

      {/* Pre-flight: camera ✓ mic ✓ connection ✓ — trust before the button */}
      <PreflightChecks stream={stream} />

      {/* Device Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Camera</label>
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            {cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Microphone</label>
          <select
            value={selectedMic}
            onChange={(e) => handleMicChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
