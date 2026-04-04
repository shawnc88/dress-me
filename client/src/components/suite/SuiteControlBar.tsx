import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { Track, createLocalVideoTrack, facingModeFromLocalTrack, LocalTrackPublication, TrackEvent } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, RotateCcw, PhoneOff, Wifi, WifiOff } from 'lucide-react';

interface SuiteControlBarProps {
  role: 'host' | 'selected_guest';
  onLeave: () => void;
  suiteId: string;
  streamId: string;
}

export function SuiteControlBar({ role, onLeave, suiteId, streamId }: SuiteControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [flipping, setFlipping] = useState(false);

  // Derive mic/cam state from actual LiveKit track state (not local-only)
  const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
  const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
  const micEnabled = !micPub?.isMuted;
  const camEnabled = !camPub?.isMuted;

  const toggleMic = useCallback(async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } catch (err) {
      console.error('Failed to toggle mic:', err);
    }
  }, [localParticipant, micEnabled]);

  const toggleCam = useCallback(async () => {
    try {
      await localParticipant.setCameraEnabled(!camEnabled);
    } catch (err) {
      console.error('Failed to toggle camera:', err);
    }
  }, [localParticipant, camEnabled]);

  const flipCamera = useCallback(async () => {
    if (flipping) return;
    setFlipping(true);
    try {
      const cameraPub = localParticipant.getTrackPublication(Track.Source.Camera);
      if (!cameraPub?.track) return;

      const currentFacing = facingModeFromLocalTrack(cameraPub.track);
      const newFacing = currentFacing?.facingMode === 'environment' ? 'user' : 'environment';

      const newTrack = await createLocalVideoTrack({
        facingMode: newFacing,
        resolution: { width: 720, height: 1280, frameRate: 30 },
      });

      await localParticipant.publishTrack(newTrack, { name: 'camera' });
    } catch (err) {
      console.error('Failed to flip camera:', err);
    } finally {
      setFlipping(false);
    }
  }, [localParticipant, flipping]);

  const handleLeave = useCallback(async () => {
    if (role === 'host') {
      // Host ending suite
      try {
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/streams/${streamId}/suite/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await room.disconnect();
    onLeave();
  }, [room, onLeave, role, streamId]);

  return (
    <div className="flex items-center justify-center gap-4 py-4 px-6 bg-black/90 border-t border-white/5 safe-area-bottom">
      {/* Mic toggle */}
      <ControlButton
        icon={micEnabled ? Mic : MicOff}
        active={micEnabled}
        onClick={toggleMic}
        label={micEnabled ? 'Mute' : 'Unmute'}
      />

      {/* Camera toggle */}
      <ControlButton
        icon={camEnabled ? Video : VideoOff}
        active={camEnabled}
        onClick={toggleCam}
        label={camEnabled ? 'Camera Off' : 'Camera On'}
      />

      {/* Flip camera */}
      <ControlButton
        icon={RotateCcw}
        active={true}
        onClick={flipCamera}
        label="Flip"
        disabled={flipping}
      />

      {/* End call */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLeave}
        className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
      >
        <PhoneOff className="w-6 h-6 text-white" />
      </motion.button>
    </div>
  );
}

function ControlButton({
  icon: Icon,
  active,
  onClick,
  label,
  disabled,
}: {
  icon: any;
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      } disabled:opacity-50`}
      title={label}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}
