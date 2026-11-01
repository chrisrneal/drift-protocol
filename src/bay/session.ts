import { canonicalKey, fingerprint, nearAnswers, truthAnswer } from './fingerprint';
import { applyIntegrity, classifyBoard, meterVerdict } from './integrity';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats, soloControllers } from './roles';
import { checkInStreamStart, voteStreamStart } from './streams';
import { fillAiAnswers } from './answers';
import { evaluateNomination } from './nominate';
import { INTEGRITY_START, MAX_ROUNDS, MIN_ROUNDS } from './constants';
import {
  BAY_SEATS,
  INSTRUMENT,
  type BayAnswer,
  type BaySeatId,
  type BaySession,
  type BoardRow,
  type CheckInRecord,
} from './types';

export function createBaySession(config: { rounds: number; seed: number }): BaySession {
  if (!Number.isInteger(config.rounds) || config.rounds < MIN_ROUNDS || config.rounds > MAX_ROUNDS) {
    throw new Error(`Round count must be an integer from ${MIN_ROUNDS} to ${MAX_ROUNDS}.`);
  }
  const seed = config.seed >>> 0;
  const cell = assignCell(seed);
  return withAi({
    rounds: config.rounds,
    seed,
    roundIndex: 0,
    integrity: INTEGRITY_START,
    phase: 'check-in',
    puzzle: generatePuzzle(seed, 0, cell.lean),
    cell,
    controllers: soloControllers(),
    ejected: [],
    log: [],
    meetings: [],
    meeting: null,
    pendingCall: null,
    prepared: {},
    plan: null,
    checkInState: checkInStreamStart(seed),
    voteState: voteStreamStart(seed),
    winner: null,
    winReason: null,
  });
}

function withAi(session: BaySession): BaySession {
  const filled = fillAiAnswers({
    puzzle: session.puzzle,
    cell: session.cell,
    roundIndex: session.roundIndex,
    ejected: session.ejected,
    controllers: session.controllers,
    checkInState: session.checkInState,
  });
  return {
    ...session,
    prepared: filled.prepared,
    plan: filled.plan,
    checkInState: filled.checkInState,
  };
}

export function submitHumans(
  session: BaySession,
  answers: Partial<Record<BaySeatId, BayAnswer>>,
): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  const living = livingSeats(session.ejected);
  const merged: Partial<Record<BaySeatId, BayAnswer>> = { ...session.prepared };
  for (const seat of living) {
    if (session.controllers[seat] === 'human') {
      const answer = answers[seat];
      if (!answer) throw new Error('Every living human seat must submit.');
      merged[seat] = answer;
    } else if (answers[seat]) {
      throw new Error('AI seats submit through the check-in policy.');
    }
  }
  return revealCheckIn(session, merged);
}

export function resolveUnattended(session: BaySession): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  if (livingSeats(session.ejected).some((seat) => session.controllers[seat] === 'human')) {
    throw new Error('A living human still has the console.');
  }
  return revealCheckIn(session, { ...session.prepared });
}

export function revealCheckIn(
  session: BaySession,
  answers: Partial<Record<BaySeatId, BayAnswer>>,
): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  const living = livingSeats(session.ejected);
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) && answers[seat]) throw new Error('Ejected seats cannot check in.');
    if (living.includes(seat) && !answers[seat]) throw new Error('Every living seat must submit.');
  }
  const truth = truthAnswer(session.puzzle);
    const keys = living.map((seat) => canonicalKey(session.puzzle, answers[seat] as BayAnswer));
    const classified = classifyBoard({
      truthKey: canonicalKey(session.puzzle, truth),
      nearKeys: nearAnswers(session.puzzle).map((answer) => canonicalKey(session.puzzle, answer)),
    keys,
  });
  const integrityAfter = applyIntegrity(session.integrity, classified.delta);
  const rows: BoardRow[] = BAY_SEATS.map((seat) => {
    if (!living.includes(seat)) return { seat, absent: true };
    const answer = answers[seat] as BayAnswer;
    return {
      seat,
      absent: false,
      answer,
      fingerprint: fingerprint(session.puzzle, answer, INSTRUMENT[seat]),
    };
  });
  const record: CheckInRecord = {
    roundIndex: session.roundIndex,
    puzzle: session.puzzle,
    rows,
    integrityBefore: session.integrity,
    integrityAfter,
    row: classified.row,
    delta: classified.delta,
  };
  const revealed: BaySession = {
    ...session,
    phase: 'discuss',
    integrity: integrityAfter,
    log: [...session.log, record],
    pendingCall: null,
  };
  const nomination = evaluateNomination({
    roundIndex: session.roundIndex,
    voteState: session.voteState,
    controllers: session.controllers,
    roles: session.cell.roles,
    ejected: session.ejected,
    log: revealed.log,
  });
  return { ...revealed, pendingCall: nomination.pendingCall, voteState: nomination.voteState };
}

function saboteurAboard(session: BaySession): boolean {
  return livingSeats(session.ejected).some((seat) => session.cell.roles[seat] === 'saboteur');
}

export function finishRound(session: BaySession): BaySession {
  if (session.roundIndex + 1 >= session.rounds || !saboteurAboard(session)) {
    if (!saboteurAboard(session)) {
      return { ...session, phase: 'done', meeting: null, pendingCall: null, winner: 'crew', winReason: 'saboteurs-ejected' };
    }
    const verdict = meterVerdict(session.integrity);
    return {
      ...session,
      phase: 'done',
      meeting: null,
      pendingCall: null,
      winner: verdict.winner,
      winReason: verdict.reason,
    };
  }
  const roundIndex = session.roundIndex + 1;
  return withAi({
    ...session,
    phase: 'check-in',
    roundIndex,
    puzzle: generatePuzzle(session.seed, roundIndex, session.cell.lean),
    meeting: null,
    pendingCall: null,
    prepared: {},
    plan: null,
  });
}

export function advance(session: BaySession): BaySession {
  if (session.phase !== 'discuss') throw new Error('Advance from discuss.');
  return finishRound(session);
}

export function replayKey(session: BaySession) {
  return {
    seed: session.seed,
    rounds: session.rounds,
    cell: session.cell,
    controllers: session.controllers,
    integrity: session.integrity,
    ejected: session.ejected,
    winner: session.winner,
    winReason: session.winReason,
    log: session.log,
    meetings: session.meetings,
    checkInState: session.checkInState,
    voteState: session.voteState,
    roundIndex: session.roundIndex,
    phase: session.phase,
  };
}
