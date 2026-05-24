// Procedural gift sounds via the Web Audio API. No asset files required —
// the spike runs immediately. Real samples can be dropped in later by
// flipping the loader to load /sounds/gift-{tier}.mp3 instead of synthesizing.
//
// Why procedural for now: the existing gifting UX has zero audio. Even a
// short sine-wave chime tied to each gift is a 10× perceptual upgrade over
// silence, and it works without sourcing/licensing audio assets ahead of
// the visual upgrade landing.
//
// Three tiers map to three sonic signatures:
//   bronze : single soft chime (E5, sine, quick decay)
//   silver : root + fifth chord (A4 + E5, triangle, longer body)
//   gold   : ascending arpeggio (A4 → C#5 → E5 → A5) + low thump

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let suspended = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext) as typeof AudioContext | undefined;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35; // headroom — gifts never blow out
    masterGain.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/** Browser autoplay policies suspend AudioContext until a user gesture.
 *  Gift triggers ARE user-gesture-driven (tap, click, socket-from-tap), so
 *  it's safe to resume on every play attempt. */
async function ensureRunning() {
  const c = getCtx();
  if (!c) return false;
  if (c.state === 'suspended' && !suspended) {
    try {
      await c.resume();
    } catch {
      suspended = true;
      return false;
    }
  }
  return c.state === 'running';
}

/** Play one short tone with an attack/release envelope. */
function playTone(
  freq: number,
  duration: number,
  opts: {
    delay?: number;
    type?: OscillatorType;
    gain?: number;
  } = {},
) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const start = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, start);
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(opts.gain ?? 0.55, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Low-end thump for the gold gift — adds physical weight under the arpeggio. */
function playThump(opts: { gain?: number } = {}) {
  const c = getCtx();
  if (!c || !masterGain) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(opts.gain ?? 0.8, t + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(env);
  env.connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.35);
}

/** Single soft chime — bronze tier (small tips, low-value gifts). */
export async function playBronze() {
  if (!(await ensureRunning())) return;
  playTone(659.25, 0.5, { type: 'sine', gain: 0.45 }); // E5
}

/** Root + fifth chord — silver tier (mid-value gifts). */
export async function playSilver() {
  if (!(await ensureRunning())) return;
  playTone(440, 0.7, { type: 'triangle', gain: 0.4 }); // A4
  playTone(659.25, 0.7, { type: 'triangle', gain: 0.35, delay: 0.02 }); // E5
}

/** Ascending arpeggio + low thump — gold tier (premium gifts, screen takeover). */
export async function playGold() {
  if (!(await ensureRunning())) return;
  playThump({ gain: 0.65 });
  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  notes.forEach((f, i) => {
    playTone(f, 0.6, { type: 'triangle', gain: 0.5, delay: i * 0.07 });
  });
}

/** Dispatch by tier — used by useGiftAnimation. */
export function playGiftSound(tier: 'gold' | 'silver' | 'bronze') {
  if (tier === 'gold') return playGold();
  if (tier === 'silver') return playSilver();
  return playBronze();
}
