import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useParticipants,
  useTracks,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState, RoomEvent } from 'livekit-client';
import { Wifi, WifiOff, Crown, Star, Sparkles, Mic, MicOff, Video, VideoOff, RotateCcw, PhoneOff, Users } from 'lucide-react';
import { SuiteControlBar } from './SuiteControlBar';

interface MultiGuestLiveLayoutProps {
  token: string;
  wsUrl: string;
  role: 'host' | 'selected_guest' | 'audience';
  onLeave: () => void;
  suiteId: string;
  streamId: string;
}

export function MultiGuestLiveLayout({ token, wsUrl, role, onLeave, suiteId, streamId }: MultiGuestLiveLayoutProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      audio={role !== 'audience'}
      video={role !== 'audience'}
      options={{
        publishDefaults: {
          videoCodec: 'h264',
          videoSimulcastLayers: [],
        },
        videoCaptureDefaults: {
          facingMode: 'user',
          resolution: { width: 720, height: 1280, frameRate: 30 },
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }}
    >
      <SuiteRoomInner role={role} onLeave={onLeave} suiteId={suiteId} streamId={streamId} />
    </LiveKitRoom>
  );
}

function SuiteRoomInner({
  role,
  onLeave,
  suiteId,
  streamId,
}: {
  role: 'host' | 'selected_guest' | 'audience';
  onLeave: () => void;
  suiteId: string;
  streamId: string;
}) {
  const participants = useParticipants();
  const connectionState = useConnectionState();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  // Group tracks by participant
  const participantTracks = new Map<string, { video?: any; audio?: any; metadata?: any }>();
  for (const track of tracks) {
    const identity = track.participant.identity;
    if (!participantTracks.has(identity)) {
      participantTracks.set(identity, { metadata: track.participant.metadata });
    }
    const entry = participantTracks.get(identity)!;
    if (track.source === Track.Source.Camera) entry.video = track;
    if (track.source === Track.Source.Microphone) entry.audio = track;
  }

  // Separate host from guests
  let hostEntry: { identity: string; video?: any; audio?: any } | null = null;
  const guestEntries: { identity: string; video?: any; audio?: any }[] = [];

  for (const [identity, data] of participantTracks) {
    let participantRole = 'selected_guest';
    try {
      const meta = JSON.parse(data.metadata || '{}');
      participantRole = meta.role || 'selected_guest';
    } catch {}

    if (participantRole === 'host') {
      hostEntry = { identity, ...data };
    } else {
      guestEntries.push({ identity, ...data });
    }
  }

  const totalOnScreen = (hostEntry ? 1 : 0) + guestEntries.length;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Connection status */}
      {connectionState !== ConnectionState.Connected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-500/90 text-black text-xs font-bold text-center py-1.5">
          {connectionState === ConnectionState.Connecting ? 'Connecting to Suite...' : 'Reconnecting...'}
        </div>
      )}

      {/* Video grid */}
      <div className="flex-1 relative">
        {totalOnScreen === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">Waiting for participants...</p>
            </div>
          </div>
        )}

        {/* Layout: 1 person = full screen, 2 = split, 3 = 1 big + 2 small, 4 = 2x2 grid */}
        {totalOnScreen === 1 && (
          <div className="absolute inset-0">
            <ParticipantTile
              entry={hostEntry || guestEntries[0]}
              isHost={!!hostEntry}
              className="w-full h-full"
            />
          </div>
        )}

        {totalOnScreen === 2 && (
          <div className="absolute inset-0 flex flex-col">
            {hostEntry && (
              <ParticipantTile
                entry={hostEntry}
                isHost={true}
                className="w-full h-1/2"
              />
            )}
            {guestEntries.slice(0, hostEntry ? 1 : 2).map((entry, i) => (
              <ParticipantTile
                key={entry.identity}
                entry={entry}
                isHost={false}
                className="w-full h-1/2"
              />
            ))}
          </div>
        )}

        {totalOnScreen === 3 && (
          <div className="absolute inset-0 flex flex-col">
            {/* Host gets 60% height */}
            {hostEntry && (
              <ParticipantTile
                entry={hostEntry}
                isHost={true}
                className="w-full"
                style={{ height: '60%' }}
              />
            )}
            {/* Guests share remaining 40% */}
            <div className="flex" style={{ height: hostEntry ? '40%' : '100%' }}>
              {guestEntries.slice(0, 2).map((entry) => (
                <ParticipantTile
                  key={entry.identity}
                  entry={entry}
                  isHost={false}
                  className="w-1/2 h-full"
                />
              ))}
            </div>
          </div>
        )}

        {totalOnScreen >= 4 && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {hostEntry && (
              <ParticipantTile
                entry={hostEntry}
                isHost={true}
                className="w-full h-full"
              />
            )}
            {guestEntries.slice(0, 3).map((entry) => (
              <ParticipantTile
                key={entry.identity}
                entry={entry}
                isHost={false}
                className="w-full h-full"
              />
            ))}
          </div>
        )}

        {/* Suite badge */}
        <div className="absolute top-4 left-4 z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/30 backdrop-blur-md border border-violet-500/30">
            <Sparkles className="w-3 h-3 text-violet-300" />
            <span className="text-violet-200 text-[10px] font-bold uppercase tracking-wider">Dress Me Suite</span>
          </div>
        </div>

        {/* Participant count */}
        <div className="absolute top-4 right-4 z-30 pointer-events-none">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md">
            <Users className="w-3 h-3 text-white/60" />
            <span className="text-white/80 text-[10px] font-bold">{totalOnScreen}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      {role !== 'audience' && (
        <SuiteControlBar role={role} onLeave={onLeave} suiteId={suiteId} streamId={streamId} />
      )}

      {/* Audience view: minimal controls */}
      {role === 'audience' && (
        <div className="flex items-center justify-center py-4 bg-black/80 border-t border-white/5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onLeave}
            className="px-6 py-2 rounded-full bg-white/10 text-white text-xs font-medium"
          >
            Leave Suite
          </motion.button>
        </div>
      )}
    </div>
  );
}

function ParticipantTile({
  entry,
  isHost,
  className = '',
  style,
}: {
  entry: { identity: string; video?: any; audio?: any };
  isHost: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hasVideo = entry.video?.publication?.track;
  const hasAudio = entry.audio?.publication?.track;

  return (
    <div className={`relative bg-charcoal overflow-hidden border border-white/[0.04] ${className}`} style={style}>
      {/* Video */}
      {hasVideo ? (
        <VideoTrack
          trackRef={entry.video}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-charcoal to-black">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white/40">
            {entry.identity.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Audio track (hidden) */}
      {hasAudio && (
        <AudioTrack trackRef={entry.audio} />
      )}

      {/* Name overlay */}
      <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          {isHost && (
            <span className="px-1.5 py-0.5 rounded bg-violet-500/80 text-[8px] font-bold text-white">HOST</span>
          )}
          <span className="text-white text-xs font-semibold drop-shadow-lg truncate">
            {entry.identity}
          </span>
          {!hasAudio && (
            <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
