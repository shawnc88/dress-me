import { GiftAnimationOverlay } from '@/components/ui/GiftAnimationOverlay';
import { EntranceLayer } from './EntranceLayer';

/**
 * LiveEffectsEngine — the single mount point for all live-room spectacle.
 *
 * This is the STABLE public interface the stream page depends on. Today it
 * composes:
 *   - GiftAnimationOverlay  → gift effects (existing r3f pipeline, unchanged)
 *   - EntranceLayer         → tier-aware "VIP arrived" entrance effects (new)
 *
 * Future increments (hybrid Lottie/GLB renderers, one unified queue, absorbing
 * the heart-tap layer) happen INSIDE here — the stream page keeps rendering
 * `<LiveEffectsEngine streamId={id} />` and never has to change.
 *
 * All layers are decorative overlays (`pointer-events-none`, absolute inset-0)
 * and each subscribes to its own real socket event on the shared stream socket:
 *   gift-received (threads.ts)   ·   viewer:joined (engagement.ts)
 */

interface Props {
  streamId?: string;
}

export function LiveEffectsEngine({ streamId }: Props) {
  return (
    <>
      <GiftAnimationOverlay streamId={streamId} />
      <EntranceLayer streamId={streamId} />
    </>
  );
}

export default LiveEffectsEngine;
