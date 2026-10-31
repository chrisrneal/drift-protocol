import { clamp } from '../game/rng';
import {
  DELTA_ALIGNED,
  DELTA_FALSE_CONSENSUS,
  DELTA_NEAR_CLUSTER,
  DELTA_SPLIT,
  INTEGRITY_CREW,
  INTEGRITY_MAX,
  INTEGRITY_MIN,
  INTEGRITY_SABOTEUR_BELOW,
} from './constants';
import type { IntegrityRow } from './types';

function countsOf(keys: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function classifyBoard(input: {
  truthKey: string;
  nearKeys: readonly string[];
  keys: readonly string[];
}): { row: IntegrityRow; delta: number } {
  const counts = countsOf(input.keys);
  const needed = Math.floor(input.keys.length / 2) + 1;
  if ((counts.get(input.truthKey) ?? 0) >= needed) {
    return { row: 'aligned', delta: DELTA_ALIGNED };
  }
  for (const [key, count] of counts) {
    if (key !== input.truthKey && count >= needed) {
      return { row: 'false-consensus', delta: DELTA_FALSE_CONSENSUS };
    }
  }
  const near = new Set(input.nearKeys);
  for (const [key, count] of counts) {
    if (near.has(key) && count >= 2) {
      return { row: 'near-miss-cluster', delta: DELTA_NEAR_CLUSTER };
    }
  }
  return { row: 'split', delta: DELTA_SPLIT };
}

export function applyIntegrity(current: number, delta: number): number {
  return clamp(current + delta, INTEGRITY_MIN, INTEGRITY_MAX);
}

export function meterVerdict(integrityBp: number): {
  winner: 'crew' | 'saboteur' | 'draw';
  reason: 'integrity-window' | 'integrity-held' | 'stalemate';
} {
  if (integrityBp >= INTEGRITY_CREW) return { winner: 'crew', reason: 'integrity-window' };
  if (integrityBp < INTEGRITY_SABOTEUR_BELOW) return { winner: 'saboteur', reason: 'integrity-held' };
  return { winner: 'draw', reason: 'stalemate' };
}

export function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

export function formatDelta(delta: number): string {
  const points = delta / 100;
  const body = Math.abs(points).toFixed(1);
  if (points > 0) return `+${body}`;
  if (points < 0) return `-${body}`;
  return '0.0';
}
