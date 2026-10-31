/** Mulberry32 step. `state` is the generator state before the draw. */
export function rngStep(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

export function intBetween(state: number, min: number, max: number): { value: number; state: number } {
  const rolled = rngStep(state);
  const span = max - min + 1;
  return { value: min + Math.floor(rolled.value * span), state: rolled.state };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
