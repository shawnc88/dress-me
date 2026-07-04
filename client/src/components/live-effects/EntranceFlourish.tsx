import Lottie from 'lottie-react';
import { getEntranceLottie } from '@/lib/liveEffects/lottieAssets';

/**
 * EntranceFlourish — a single tier entrance Lottie burst, rendered behind the
 * entrance banner. Lazy-loaded by EntranceLayer so lottie-react + JSON only
 * load the first time a VIP/Inner Circle member arrives. Decorative + inert.
 */
interface Props {
  tier: string; // SubscriberTier id ('VIP' | 'INNER_CIRCLE'); others render nothing
}

export function EntranceFlourish({ tier }: Props) {
  const data = getEntranceLottie(tier);
  if (!data) return null;
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: 'min(64vw, 380px)', height: 'min(64vw, 380px)' }}
      aria-hidden
    >
      <Lottie
        animationData={data as object}
        loop={false}
        autoplay
        style={{ width: '100%', height: '100%' }}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
    </div>
  );
}

export default EntranceFlourish;
