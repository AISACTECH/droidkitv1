// =====================================================================
// FRP Adaptive Engine — humanization (T6)
// ---------------------------------------------------------------------
// Heuristic timers + input jitter for the rule-based UI interaction
// engine (brief: "randomize timing and input patterns to mimic human
// behavior"). Standard UI-automation practice — bounded, seeded,
// reproducible. Every generator accepts an injectable RNG so tests
// are deterministic (same seed → same sequence) while production
// defaults to a time-seeded RNG.
// =====================================================================

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
}

/** mulberry32 — tiny, fast, deterministic PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Production RNG: time-seeded, replaces the deterministic one. */
export function createTimeRng(): Rng {
  return createRng((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
}

/** Uniform integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(rng.next() * (max - min + 1));
}

/** Jittered delay: base ± rangePct (e.g. 0.25 = ±25%), clamped to >= floorMs. */
export function jitterDelay(rng: Rng, baseMs: number, rangePct: number, floorMs = 0): number {
  const spread = baseMs * rangePct;
  const delta = (rng.next() * 2 - 1) * spread;
  return Math.max(floorMs, Math.round(baseMs + delta));
}

/** Micro-offset for tap coordinates (±4 px on the target point). */
export function tapPoint(
  rng: Rng,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: x + randInt(rng, -4, 4),
    y: y + randInt(rng, -4, 4),
  };
}

/** Human key-pacing: 60–140 ms per keystroke with an occasional pause. */
export function typePaceMs(rng: Rng): number {
  const base = randInt(rng, 60, 140);
  // ~8% chance of a "thinking" pause after a word boundary.
  return rng.next() < 0.08 ? base + randInt(rng, 250, 700) : base;
}

/** Delay profile per interaction kind (heuristic, tunable). */
const DELAY_PROFILE: Record<string, { base: number; rangePct: number }> = {
  tap: { base: 350, rangePct: 0.4 },
  type_text: { base: 60, rangePct: 0.5 },
  swipe: { base: 450, rangePct: 0.3 },
  keyevent: { base: 200, rangePct: 0.4 },
  wait: { base: 1000, rangePct: 0.2 },
  guide: { base: 500, rangePct: 0.5 },
};

/** Delay for a given action kind. */
export function delayForAction(kind: string, rng: Rng): number {
  const p = DELAY_PROFILE[kind] ?? { base: 500, rangePct: 0.3 };
  return jitterDelay(rng, p.base, p.rangePct, 40);
}

/** Bounds used by the test suite — exported so tests assert them. */
export const DELAY_BOUNDS: Record<string, { min: number; max: number }> = {
  tap: { min: 40, max: 490 },
  type_text: { min: 40, max: 90 },
  swipe: { min: 40, max: 585 },
  keyevent: { min: 40, max: 280 },
  wait: { min: 40, max: 1200 },
  guide: { min: 40, max: 750 },
};
