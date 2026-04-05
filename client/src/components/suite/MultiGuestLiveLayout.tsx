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
  useLocalParticipant,
} from '@livekit/components-react';
import { Track, ConnectionState, RoomEvent, DisconnectReason, createLocalTracks } from 'livekit-client';
import { Wifi, WifiOff, Crown, Star, Sparkles, Mic, MicOff, Video, VideoOff, RotateCcw, PhoneOff, Users, AlertTriangle, XCircle } from 'lucide-react';
import { SuiteControlBar } from './SuiteControlBar';
import { SuiteChatOverlay } from './SuiteChatOverlay';

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
      audio={false}
      video={false}
      onError={(err) => console.error('[Suite] LiveKitRoom error:', err)}
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
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [removedByHost, setRemovedByHost] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracksPublished, setTracksPublished] = useState(false);
  const publishedRef = useRef(false);

  // Explicitly publish tracks after connecting (host + guest only)
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    if (role === 'audience') { setTracksPublished(true); return; }
    if (publishedRef.current) return;
    publishedRef.current = true;

    async function publishTracks() {
      let tracks: any[] = [];
      try {
        console.log('[Suite] Creating local tracks...');
        tracks = await createLocalTracks({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { facingMode: 'user', resolution: { width: 720, height: 1280, frameRate: 24 } },
        });
      } catch (err: any) {
        console.error('[Suite] Track creation failed:', err);
        setTrackError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access denied. Please allow permissions and rejoin.'
            : err.name === 'NotFoundError'
              ? 'No camera or microphone found.'
              : `Device error: ${err.message}`
        );
        return;
      }

      if (!tracks || tracks.length === 0) {
        setTrackError('No media tracks available. Check your camera and microphone.');
        return;
      }

      try {
        for (const track of tracks) {
          await localParticipant.publishTrack(track);
          console.log(`[Suite] Published ${track.kind} track`);
        }
        setTracksPublished(true);
      } catch (err: any) {
        console.error('[Suite] Track publish failed:', err);
        setTrackError(`Failed to publish tracks: ${err.message}`);
      }
    }
    publishTracks();
  }, [connectionState, role, localParticipant]);

  // Listen for disconnect reason (removed by host vs network)
  useEffect(() => {
    const handleDisconnect = (reason?: DisconnectReason) => {
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        setRemovedByHost(true);
      } else {
        setDisconnected(true);
      }
    };
    room.on(RoomEvent.Disconnected, handleDisconnect);
    return () => { room.off(RoomEvent.Disconnected, handleDisconnect); };
  }, [room]);

  // Show track error screen
  if (trackError) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-white text-xl font-extrabold mb-2">Camera/Mic Error</h2>
        <p className="text-white/50 text-sm text-center mb-6 max-w-xs">{trackError}</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onLeave}
          className="px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-bold">
          Return to Stream
        </motion.button>
      </div>
    );
  }

  // Show "removed by host" screen
  if (removedByHost) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
        <XCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-white text-xl font-extrabold mb-2">Removed from Suite</h2>
        <p className="text-white/50 text-sm text-center mb-6">The host has removed you from the Suite session.</p>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onLeave}
          className="px-8 py-3 rounded-xl bg-white/10 text-white text-sm font-bold">
          Return to Stream
        </motion.button>
      </div>
    );
  }

  // Show "disconnected" screen
  if (disconnected || connectionState === ConnectionState.Disconnected) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-white text-xl font-extrabold mb-2">Connection Lost</h2>
        <p className="text-white/50 text-sm text-center mb-6">Your connection to the Suite was lost.</p>
        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setDisconnected(false); room.connect; }}
            className="px-6 py-3 rounded-xl bg-violet-500 text-white text-sm font-bold">
            Reconnect
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onLeave}
            className="px-6 py-3 rounded-xl bg-white/10 text-white text-sm font-bold">
            Leave
          </motion.button>
        </div>
      </div>
    );
  }

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

      {/* Suite Chat */}
      <SuiteChatOverlay suiteId={suiteId} />

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

function isTrackReady(trackRef: any): boolean {
  if (!trackRef) return false;
  // Must have a real publication with a real track (not a placeholder)
  if (!trackRef.publication) return false;
  if (!trackRef.publication.track) return false;
  // Check it's not a placeholder
  if (trackRef.publication.track.mediaStreamTrack?.readyState === 'ended') return false;
  return true;
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
  const hasVideo = isTrackReady(entry.video);
  const hasAudio = isTrackReady(entry.audio);

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
