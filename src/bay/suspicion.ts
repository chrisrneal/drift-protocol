import { resolveAnswer } from './fingerprint';
import {
  MISS_BLATANT,
  MISS_EXACT,
  MISS_NEAR,
  SUSPICION_MISS_WEIGHT,
  SUSPICION_PATTERN_WEIGHT,
} from './constants';
import { BAY_SEATS, type BayAnswer, type BaySeatId, type CheckInRecord, type Puzzle, type Role } from './types';

export function leanMark(puzzle: Puzzle, answer: BayAnswer): 1 | -1 | null {
  if (puzzle.kind !== 'number' || answer.kind !== 'number') return null;
  const resolved = resolveAnswer(puzzle, answer);
  if (resolved.kind !== 'number' || !('value' in resolved)) return null;
  if (resolved.value === puzzle.step) return 1;
  if (resolved.value === puzzle.trap) return -1;
  return null;
}

export function suspicionScores(log: readonly CheckInRecord[]): Record<BaySeatId, number> {
  const weights = {} as Record<BaySeatId, number[]>;
  const signs = {} as Record<BaySeatId, Array<1 | -1>>;
  const modal = { plus: 0, minus: 0 };
  for (const seat of BAY_SEATS) {
    weights[seat] = [];
    signs[seat] = [];
  }
  for (const record of log) {
    for (const row of record.rows) {
      if (row.absent) continue;
      const weight =
        row.fingerprint.errorClass === 'exact'
          ? MISS_EXACT
          : row.fingerprint.errorClass === 'near-miss'
            ? MISS_NEAR
            : MISS_BLATANT;
      weights[row.seat].push(weight);
      const sign = leanMark(record.puzzle, row.answer);
      if (sign === 1) {
        signs[row.seat].push(1);
        modal.plus += 1;
      } else if (sign === -1) {
        signs[row.seat].push(-1);
        modal.minus += 1;
      }
    }
  }
  const bias: 1 | -1 | null = modal.plus === modal.minus ? null : modal.plus > modal.minus ? 1 : -1;
  const scores = {} as Record<BaySeatId, number>;
  for (const seat of BAY_SEATS) {
    const list = weights[seat];
    const mean = list.length === 0 ? 0 : list.reduce((sum, value) => sum + value, 0) / list.length;
    const own = signs[seat];
    const pattern =
      bias === null || own.length === 0 ? 0 : own.filter((sign) => sign === bias).length / own.length;
    scores[seat] = SUSPICION_MISS_WEIGHT * mean + SUSPICION_PATTERN_WEIGHT * pattern;
  }
  return scores;
}

export function nameTarget(input: {
  viewer: BaySeatId;
  roles: Record<BaySeatId, Role>;
  living: readonly BaySeatId[];
  suspicion: Record<BaySeatId, number>;
  threshold: number;
  pool: 'others' | 'crew';
}): BaySeatId | null {
  let best: BaySeatId | null = null;
  for (const seat of BAY_SEATS) {
    if (!input.living.includes(seat) || seat === input.viewer) continue;
    if (input.pool === 'crew' && input.roles[seat] !== 'crew') continue;
    const score = input.suspicion[seat] ?? 0;
    if (score < input.threshold) continue;
    if (best === null || score > (input.suspicion[best] ?? 0)) best = seat;
  }
  return best;
}
