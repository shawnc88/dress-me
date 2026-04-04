import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

interface DevicePreviewProps {
  onReady: (stream: MediaStream) => void;
  onError: (error: string) => void;
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
