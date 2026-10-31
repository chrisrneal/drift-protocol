import { intBetween } from '../game/rng';
import { PUZZLE_STREAM_ADD, PUZZLE_STREAM_MASK } from './constants';
import { type DialPuzzle, type Puzzle } from './types';

export function puzzleStreamStart(seed: number, roundIndex: number): number {
  const mixed = Math.imul((seed ^ PUZZLE_STREAM_MASK) >>> 0, roundIndex + 1) >>> 0;
  return (mixed + PUZZLE_STREAM_ADD) >>> 0;
}

export function assembleDial(a: number, b: number): DialPuzzle {
  const truth = (a + b) % 12;
  const near: [number, number] = [(truth + 1) % 12, (truth + 11) % 12];
  const skip = new Set<number>([truth, near[0], near[1]]);
  const blatant = [...Array(12).keys()].filter((detent) => !skip.has(detent));
  return { kind: 'dial', a, b, truth, near, blatant };
}

export function generatePuzzle(seed: number, roundIndex: number): Puzzle {
  let state = puzzleStreamStart(seed, roundIndex);
  const kind = intBetween(state, 0, 2);
  state = kind.state;
  if (kind.value !== 0) throw new Error('Unknown puzzle kind.');
  const a = intBetween(state, 0, 11);
  state = a.state;
  const b = intBetween(state, 0, 11);
  return assembleDial(a.value, b.value);
}
