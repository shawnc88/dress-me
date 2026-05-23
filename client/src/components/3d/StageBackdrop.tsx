// Full-screen backdrop that fades + blurs the stream view when a gold
// (premium) gift is on screen. Renders OUTSIDE the r3f Canvas so the bloom
// pass doesn't have to composite against a moving background. Pure CSS
// transition — no React re-renders during the fade.

interface StageBackdropProps {
  active: boolean;
}

export function StageBackdrop({ active }: StageBackdropProps) {
  return (
    <div
      // z-40 = under the Canvas (z-50) and the HUD (z-60), over the stream view.
      className={`absolute inset-0 z-40 pointer-events-none transition-all duration-700 ease-out ${
        active
          ? 'bg-black/45 backdrop-blur-md'
          : 'bg-transparent backdrop-blur-0'
      }`}
      aria-hidden="true"
    />
  );
}
