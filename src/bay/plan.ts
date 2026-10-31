import { PLAN_ONE, PLAN_THREE, PLAN_TWO } from './constants';
import type { BaySeatId, Posture } from './types';

export function posturesFor(
  draw: number,
  livingSaboteurs: readonly BaySeatId[],
  roundIndex: number,
): Record<BaySeatId, Posture> {
  const count = livingSaboteurs.length;
  if (count < 1 || count > 3) throw new Error('Cell plan covers 1, 2, or 3 living saboteurs.');
  const primary = livingSaboteurs[roundIndex % count];
  const secondary = livingSaboteurs[(roundIndex + 1) % count];
  const postures = {} as Record<BaySeatId, Posture>;
  for (const seat of livingSaboteurs) postures[seat] = 'honest';
  if (count === 3) {
    if (draw < PLAN_THREE.honestBelow) return postures;
    if (draw < PLAN_THREE.oneNearBelow) {
      postures[primary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_THREE.twoNearBelow) {
      postures[primary] = 'near-miss';
      postures[secondary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_THREE.blatantBelow) {
      postures[primary] = 'blatant';
      return postures;
    }
    for (const seat of livingSaboteurs) postures[seat] = 'near-miss';
    return postures;
  }
  if (count === 2) {
    if (draw < PLAN_TWO.honestBelow) return postures;
    if (draw < PLAN_TWO.oneNearBelow) {
      postures[primary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_TWO.blatantBelow) {
      postures[primary] = 'blatant';
      return postures;
    }
    postures[primary] = 'near-miss';
    postures[secondary] = 'near-miss';
    return postures;
  }
  if (draw < PLAN_ONE.honestBelow) return postures;
  if (draw < PLAN_ONE.nearBelow) {
    postures[primary] = 'near-miss';
    return postures;
  }
  postures[primary] = 'blatant';
  return postures;
}
