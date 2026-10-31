import { intBetween } from '../game/rng';
import { PUZZLE_STREAM_ADD, PUZZLE_STREAM_MASK } from './constants';
import { type DialPuzzle, type Puzzle, type ReadingLabel, type ReadingPuzzle } from './types';

const READING_LABELS: ReadingLabel[] = ['R1', 'R2', 'R3', 'R4', 'R5'];

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

function assembleReading(
  anchor: number,
  offset: number,
  shuffled: Array<{ role: 'true' | 'near' | 'far'; value: number }>,
): ReadingPuzzle {
  const options = shuffled.map((entry, index) => ({
    label: READING_LABELS[index],
    role: entry.role,
    value: entry.value,
  })) as ReadingPuzzle['options'];
  const truth = options.find((option) => option.role === 'true');
  if (!truth) throw new Error('Reading is missing its true value.');
  const near = options.filter((option) => option.role === 'near').map((option) => option.label);
  const blatant = options.filter((option) => option.role === 'far').map((option) => option.label);
  if (near.length !== 1) throw new Error('Reading must have one near decoy.');
  return {
    kind: 'reading',
    anchor,
    offset,
    band: [anchor, anchor + 7],
    options,
    truth: truth.label,
    near: [near[0]],
    blatant,
  };
}

export function generatePuzzle(seed: number, roundIndex: number): Puzzle {
  let state = puzzleStreamStart(seed, roundIndex);
  const kind = intBetween(state, 0, 2);
  state = kind.state;
  if (kind.value === 0) {
    const a = intBetween(state, 0, 11);
    state = a.state;
    const b = intBetween(state, 0, 11);
    return assembleDial(a.value, b.value);
  }
  if (kind.value === 1) {
    const anchor = intBetween(state, 18, 64);
    state = anchor.state;
    const offset = intBetween(state, 0, 7);
    state = offset.state;
    const values: Array<{ role: 'true' | 'near' | 'far'; value: number }> = [
      { role: 'true', value: anchor.value + offset.value },
      { role: 'near', value: anchor.value - 2 },
      { role: 'far', value: anchor.value - 16 },
      { role: 'far', value: anchor.value + 20 },
      { role: 'far', value: anchor.value + 34 },
    ];
    for (let index = 4; index >= 1; index -= 1) {
      const swap = intBetween(state, 0, index);
      state = swap.state;
      const held = values[index];
      values[index] = values[swap.value];
      values[swap.value] = held;
    }
    return assembleReading(anchor.value, offset.value, values);
  }
  throw new Error('Unknown puzzle kind.');
}
