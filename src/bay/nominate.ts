import { rngStep } from '../game/rng';
import { CALL_SUSPICION, FRAME_BELOW, FRAME_SUSPICION, SELF_VOTE_BELOW } from './constants';
import { livingSeats } from './roles';
import { nameTarget, suspicionScores } from './suspicion';
import {
  BAY_SEATS,
  type BayBallot,
  type BaySeatId,
  type CheckInRecord,
  type Controller,
  type PendingCall,
  type Role,
} from './types';

export function evaluateNomination(input: {
  roundIndex: number;
  voteState: number;
  controllers: Record<BaySeatId, Controller>;
  roles: Record<BaySeatId, Role>;
  ejected: readonly BaySeatId[];
  log: readonly CheckInRecord[];
}): { pendingCall: PendingCall | null; voteState: number } {
  if (input.roundIndex < 1) return { pendingCall: null, voteState: input.voteState };
  const living = livingSeats(input.ejected);
  const suspicion = suspicionScores(input.log);
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai' || input.roles[seat] !== 'crew') continue;
    const nominated = nameTarget({
      viewer: seat,
      roles: input.roles,
      living,
      suspicion,
      threshold: CALL_SUSPICION,
      pool: 'others',
    });
    if (nominated) return { pendingCall: { caller: seat, nominated }, voteState: input.voteState };
  }
  const rolled = rngStep(input.voteState);
  let caller: BaySeatId | null = null;
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai' || input.roles[seat] !== 'saboteur') continue;
    caller = seat;
    break;
  }
  if (rolled.value >= FRAME_BELOW || !caller) return { pendingCall: null, voteState: rolled.state };
  const nominated = nameTarget({
    viewer: caller,
    roles: input.roles,
    living,
    suspicion,
    threshold: FRAME_SUSPICION,
    pool: 'crew',
  });
  if (!nominated) return { pendingCall: null, voteState: rolled.state };
  return { pendingCall: { caller, nominated }, voteState: rolled.state };
}

export function fillBallots(input: {
  voteState: number;
  living: readonly BaySeatId[];
  controllers: Record<BaySeatId, Controller>;
  roles: Record<BaySeatId, Role>;
  suspicion: Record<BaySeatId, number>;
  humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>>;
}): { ballots: BayBallot[]; voteState: number } {
  let state = input.voteState;
  const ballots: BayBallot[] = [];
  for (const seat of BAY_SEATS) {
    if (!input.living.includes(seat)) continue;
    if (input.controllers[seat] === 'human') {
      const choice = input.humanVotes[seat];
      if (!choice) throw new Error('Every living human seat must vote.');
      ballots.push({ voter: seat, choice });
      continue;
    }
    const rolled = rngStep(state);
    state = rolled.state;
    const named = nameTarget({
      viewer: seat,
      roles: input.roles,
      living: input.living,
      suspicion: input.suspicion,
      threshold: CALL_SUSPICION,
      pool: input.roles[seat] === 'saboteur' ? 'crew' : 'others',
    });
    let choice: BaySeatId | 'skip' = named ?? 'skip';
    if (input.roles[seat] === 'saboteur' && rolled.value < SELF_VOTE_BELOW) choice = seat;
    ballots.push({ voter: seat, choice });
  }
  return { ballots, voteState: state };
}
