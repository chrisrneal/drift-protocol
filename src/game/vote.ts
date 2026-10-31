import { RESCUE_FAIL, RESCUE_WIN } from './constants';
import type { SeatId } from './types';

export { majorityEject } from '../bay/vote';

export type VoteChoice = SeatId | 'skip';

export type VoteBallot = {
  voter: SeatId;
  choice: VoteChoice;
};

export type WinReason =
  | 'saboteur-ejected'
  | 'rescue-window'
  | 'saboteur-survived'
  | 'crew-eliminated'
  | 'stalemate';

export type WatchVerdict = {
  winner: 'crew' | 'saboteur' | 'draw';
  reason: WinReason;
};

export function verdictAfterEject(
  ejectedSeat: SeatId,
  saboteur: SeatId,
  livingAfter: readonly SeatId[],
): WatchVerdict | null {
  if (ejectedSeat === saboteur) return { winner: 'crew', reason: 'saboteur-ejected' };
  const crewLeft = livingAfter.some((seat) => seat !== saboteur);
  if (!crewLeft) return { winner: 'saboteur', reason: 'crew-eliminated' };
  return null;
}

export function verdictAtEnd(rescue: number, saboteurStillIn: boolean): WatchVerdict {
  if (!saboteurStillIn) return { winner: 'crew', reason: 'saboteur-ejected' };
  if (rescue >= RESCUE_WIN) return { winner: 'crew', reason: 'rescue-window' };
  if (rescue < RESCUE_FAIL) return { winner: 'saboteur', reason: 'saboteur-survived' };
  return { winner: 'draw', reason: 'stalemate' };
}

export function accusationsOpen(input: {
  phase: 'play' | 'resolved' | 'meeting' | 'done';
  logLength: number;
  meetingsThisRound: number;
  livingCount: number;
}): boolean {
  if (input.phase !== 'play' && input.phase !== 'resolved') return false;
  if (input.logLength < 1) return false;
  if (input.meetingsThisRound > 0) return false;
  return input.livingCount >= 2;
}
