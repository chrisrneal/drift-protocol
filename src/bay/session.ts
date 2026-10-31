import { canonicalKey, fingerprint, nearAnswers, truthAnswer } from './fingerprint';
import { applyIntegrity, classifyBoard, meterVerdict } from './integrity';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats, soloControllers } from './roles';
import { checkInStreamStart, voteStreamStart } from './streams';
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
  return {
    rounds: config.rounds,
    seed,
    roundIndex: 0,
    integrity: INTEGRITY_START,
    phase: 'check-in',
    puzzle: generatePuzzle(seed, 0),
    cell: assignCell(seed),
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
  };
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
  const keys = living.map((seat) => canonicalKey(answers[seat] as BayAnswer));
  const classified = classifyBoard({
    truthKey: canonicalKey(truth),
    nearKeys: nearAnswers(session.puzzle).map((answer) => canonicalKey(answer)),
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
  return {
    ...session,
    phase: 'discuss',
    integrity: integrityAfter,
    log: [...session.log, record],
    pendingCall: null,
  };
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
  return {
    ...session,
    phase: 'check-in',
    roundIndex,
    puzzle: generatePuzzle(session.seed, roundIndex),
    meeting: null,
    pendingCall: null,
    prepared: {},
    plan: null,
  };
}

export function advance(session: BaySession): BaySession {
  if (session.phase !== 'discuss') throw new Error('Advance from discuss.');
  return finishRound(session);
}
