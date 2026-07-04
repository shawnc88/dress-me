import Lottie from 'lottie-react';
import { getGiftLottie } from '@/lib/liveEffects/lottieAssets';

/**
 * LottieEffectsLayer — plays Lottie gift bursts for `renderer: 'lottie'` gifts.
 *
 * Decorative overlay: pointer-events-none, absolutely centered. Each active
 * play renders one non-looping Lottie; when it finishes, `onDone(id)` removes
 * it. Reduced-motion is honored upstream (GiftAnimationOverlay never enqueues
 * a play when the user prefers reduced motion), so this layer always animates.
 */

export interface LottiePlay {
  id: number;
  giftId: string;
}

interface Props {
  plays: LottiePlay[];
  onDone: (id: number) => void;
}

export function LottieEffectsLayer({ plays, onDone }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[42] flex items-center justify-center overflow-hidden">
      {plays.map((play) => {
        const data = getGiftLottie(play.giftId);
        if (!data) return null;
        return (
          <div
            key={play.id}
            className="absolute"
            style={{ width: 'min(82vw, 520px)', height: 'min(82vw, 520px)' }}
          >
            <Lottie
              animationData={data as object}
              loop={false}
              autoplay
              onComplete={() => onDone(play.id)}
              style={{ width: '100%', height: '100%' }}
              rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default LottieEffectsLayer;
