import { RESCUE_FAIL, RESCUE_WIN } from './constants';
import type { SeatId } from './types';

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

export function majorityEject(votes: readonly VoteBallot[], living: readonly SeatId[]): SeatId | null {
  if (living.length === 0) return null;
  const eligible = new Set(living);
  const counts = new Map<SeatId, number>();
  for (const vote of votes) {
    if (!eligible.has(vote.voter)) continue;
    if (vote.choice === 'skip' || !eligible.has(vote.choice)) continue;
    counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
  }
  const needed = Math.floor(living.length / 2) + 1;
  let chosen: SeatId | null = null;
  for (const [seat, count] of counts) {
    if (count >= needed) {
      if (chosen) return null;
      chosen = seat;
    }
  }
  return chosen;
}

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
