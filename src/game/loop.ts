import { decideExplorer, explorerContext, initialExplorerMemory, updateExplorer, type ExplorerMemory } from '../ai/explorer';
import { decidePattern, initialPatternMemory, updatePattern, type PatternMemory } from '../ai/pattern';
import { sabotageDecision } from '../ai/sabotage';
import { decideSkeptic, initialSkepticMemory, updateSkeptic, type SkepticMemory } from '../ai/skeptic';
import { applyDecision, packetsEqual } from './actions';
import { MAX_ROUNDS, MIN_ROUNDS, RESCUE_START } from './constants';
import { livingSeats, rolesFor, assignSaboteur, type Role } from './roles';
import { rngStep } from './rng';
import {
  consistencyScore,
  meanReliability,
  nextRescue,
  normalizeWeights,
  packetSimilarity,
  trustAlignment,
} from './scoring';
import { openRound } from './signals';
import {
  AI_SEATS,
  SEATS,
  type Decision,
  type Emission,
  type HumanChoice,
  type Packet,
  type ReliabilityStats,
  type SeatId,
} from './types';
import {
  accusationsOpen,
  majorityEject,
  verdictAfterEject,
  verdictAtEnd,
  type VoteBallot,
  type WinReason,
} from './vote';

export type RoundResolution = {
  roundIndex: number;
  truth: Packet;
  observations: Record<SeatId, Packet>;
  decisions: Record<SeatId, Decision>;
  emissions: Record<SeatId, Packet | null>;
  outOfPlay: SeatId[];
  consistency: number;
  alignment: number;
  rescueBefore: number;
  rescueAfter: number;
};

export type MeetingCall = {
  caller: SeatId;
  nominated: SeatId;
  returnPhase: 'play' | 'resolved';
};

export type MeetingRecord = {
  roundIndex: number;
  caller: SeatId;
  nominated: SeatId;
  votes: VoteBallot[];
  ejected: SeatId | null;
};

export type SessionPhase = 'play' | 'resolved' | 'meeting' | 'done';

export type Session = {
  rounds: number;
  seed: number;
  roundIndex: number;
  rescue: number;
  phase: SessionPhase;
  rngState: number;
  truth: Packet;
  observations: Record<SeatId, Packet>;
  resolution: RoundResolution | null;
  log: RoundResolution[];
  reliability: Record<SeatId, ReliabilityStats>;
  skeptic: SkepticMemory;
  pattern: PatternMemory;
  explorer: ExplorerMemory;
  saboteur: SeatId;
  roles: Record<SeatId, Role>;
  ejected: SeatId[];
  meetings: MeetingRecord[];
  meeting: MeetingCall | null;
  winner: 'crew' | 'saboteur' | 'draw' | null;
  winReason: WinReason | null;
};

export function createSession(config: { rounds: number; seed: number }): Session {
  if (!Number.isInteger(config.rounds) || config.rounds < MIN_ROUNDS || config.rounds > MAX_ROUNDS) {
    throw new Error(`Round count must be an integer from ${MIN_ROUNDS} to ${MAX_ROUNDS}.`);
  }
  const seed = config.seed >>> 0;
  const opened = openRound(seed, null);
  const saboteur = assignSaboteur(seed);
  return {
    rounds: config.rounds,
    seed,
    roundIndex: 0,
    rescue: RESCUE_START,
    phase: 'play',
    rngState: opened.state,
    truth: opened.truth,
    observations: opened.observations,
    resolution: null,
    log: [],
    reliability: {
      you: { sum: 0, count: 0 },
      skeptic: { sum: 0, count: 0 },
      pattern: { sum: 0, count: 0 },
      explorer: { sum: 0, count: 0 },
    },
    skeptic: initialSkepticMemory(),
    pattern: initialPatternMemory(),
    explorer: initialExplorerMemory(),
    saboteur,
    roles: rolesFor(saboteur),
    ejected: [],
    meetings: [],
    meeting: null,
    winner: null,
    winReason: null,
  };
}

export function submitRound(session: Session, choice: HumanChoice): Session {
  if (session.ejected.includes('you')) throw new Error('Ejected seats cannot act.');
  return resolveTransmissions(session, choice);
}

export function playWithoutHuman(session: Session): Session {
  if (!session.ejected.includes('you')) throw new Error('You are still on the watch.');
  return resolveTransmissions(session, null);
}

export function openMeeting(session: Session, caller: SeatId, nominated: SeatId): Session {
  const living = livingSeats(session.ejected);
  const meetingsThisRound = session.meetings.filter((meeting) => meeting.roundIndex === session.roundIndex).length;
  const open = accusationsOpen({
    phase: session.phase,
    logLength: session.log.length,
    meetingsThisRound,
    livingCount: living.length,
  });
  if (!open) {
    if (session.log.length < 1 && (session.phase === 'play' || session.phase === 'resolved')) {
      throw new Error('Accusations open after round 1.');
    }
    throw new Error('An accusation is not open.');
  }
  if (!living.includes(caller)) throw new Error('Ejected seats cannot call a vote.');
  if (!living.includes(nominated)) throw new Error('That seat is already off the watch.');
  if (caller === nominated) throw new Error('Name a different seat.');
  if (session.phase !== 'play' && session.phase !== 'resolved') throw new Error('An accusation is not open.');
  return {
    ...session,
    phase: 'meeting',
    meeting: { caller, nominated, returnPhase: session.phase },
  };
}

export function resolveMeeting(session: Session, votes: readonly VoteBallot[]): Session {
  if (session.phase !== 'meeting' || !session.meeting) throw new Error('No accusation is open.');
  const living = livingSeats(session.ejected);
  const cast = new Map<SeatId, VoteBallot['choice']>();
  for (const vote of votes) {
    if (!living.includes(vote.voter)) continue;
    cast.set(vote.voter, vote.choice);
  }
  for (const seat of living) {
    if (!cast.has(seat)) throw new Error('Every living seat must vote.');
  }
  const ballots: VoteBallot[] = living.map((voter) => ({ voter, choice: cast.get(voter) ?? 'skip' }));
  const ejectedSeat = majorityEject(ballots, living);
  const record: MeetingRecord = {
    roundIndex: session.roundIndex,
    caller: session.meeting.caller,
    nominated: session.meeting.nominated,
    votes: ballots,
    ejected: ejectedSeat,
  };
  let ejected = session.ejected;
  let phase: SessionPhase = session.meeting.returnPhase;
  let winner = session.winner;
  let winReason = session.winReason;
  if (ejectedSeat) {
    ejected = [...session.ejected, ejectedSeat];
    const verdict = verdictAfterEject(ejectedSeat, session.saboteur, livingSeats(ejected));
    if (verdict) {
      winner = verdict.winner;
      winReason = verdict.reason;
      phase = 'done';
    }
  }
  return {
    ...session,
    phase,
    ejected,
    meeting: null,
    meetings: [...session.meetings, record],
    winner,
    winReason,
  };
}

export function nextRound(session: Session): Session {
  if (session.phase !== 'resolved') throw new Error('Resolve the round first.');
  if (session.roundIndex + 1 >= session.rounds) {
    const verdict = verdictAtEnd(session.rescue, !session.ejected.includes(session.saboteur));
    return { ...session, phase: 'done', winner: verdict.winner, winReason: verdict.reason };
  }
  const opened = openRound(session.rngState, session.truth);
  return {
    ...session,
    phase: 'play',
    roundIndex: session.roundIndex + 1,
    rngState: opened.state,
    truth: opened.truth,
    observations: opened.observations,
    resolution: null,
  };
}

export function meetingRng(seed: number, roundIndex: number, salt: number): () => number {
  let state = (seed ^ Math.imul(roundIndex + 1, 0x9e3779b9) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  return () => {
    const rolled = rngStep(state);
    state = rolled.state;
    return rolled.value;
  };
}

function peersOf(seat: SeatId, living: readonly SeatId[]): SeatId[] {
  return living.filter((other) => other !== seat);
}

function resolveTransmissions(session: Session, choice: HumanChoice | null): Session {
  if (session.phase !== 'play') throw new Error('No open round.');
  const living = livingSeats(session.ejected);
  const humanLiving = living.includes('you');
  if (humanLiving && !choice) throw new Error('The watch lead still has the console.');

  let rngState = session.rngState;
  const draw = () => {
    const rolled = rngStep(rngState);
    rngState = rolled.state;
    return rolled.value;
  };

  const decisions = {} as Record<SeatId, Decision>;
  if (humanLiving && choice) {
    const human: Decision = {
      kind: choice.kind,
      edit: choice.edit,
      trust: normalizeWeights(choice.trust, peersOf('you', living)),
    };
    const yours = applyDecision(session.observations.you, human);
    if (choice.kind === 'edit' && (!yours || packetsEqual(yours, session.observations.you))) {
      throw new Error('Edit must change one field.');
    }
    decisions.you = human;
  }

  if (living.includes('skeptic')) {
    decisions.skeptic = withRole(session, 'skeptic', decideSkeptic(session.observations.skeptic, session.skeptic), draw, living);
  }
  if (living.includes('pattern')) {
    decisions.pattern = withRole(session, 'pattern', decidePattern(session.observations.pattern, session.pattern), draw, living);
  }
  if (living.includes('explorer')) {
    decisions.explorer = withRole(
      session,
      'explorer',
      decideExplorer(session.observations.explorer, session.explorer, draw),
      draw,
      living,
    );
  }

  for (const seat of SEATS) {
    if (decisions[seat]) continue;
    decisions[seat] = { kind: 'drop', trust: {} };
  }

  const emissions = {} as Record<SeatId, Packet | null>;
  for (const seat of SEATS) {
    emissions[seat] = living.includes(seat) ? applyDecision(session.observations[seat], decisions[seat]) : null;
  }

  const reliabilityNow = {} as Record<SeatId, number>;
  for (const seat of SEATS) reliabilityNow[seat] = meanReliability(session.reliability[seat]);
  const consistency = consistencyScore(living.map((seat) => emissions[seat]));
  const alignment = trustAlignment(
    living.map((seat) => ({ from: seat, weights: decisions[seat].trust })),
    reliabilityNow,
    living,
  );
  const rescueAfter = nextRescue(session.rescue, consistency, alignment);

  const reliability = { ...session.reliability };
  for (const seat of living) {
    const emitted = emissions[seat];
    if (!emitted) continue;
    const prior = reliability[seat];
    reliability[seat] = {
      sum: prior.sum + packetSimilarity(emitted, session.truth),
      count: prior.count + 1,
    };
  }

  const listed: Emission[] = SEATS.map((seat) => ({
    seat,
    packet: living.includes(seat) ? emissions[seat] : null,
    absent: !living.includes(seat),
  }));
  const resolution: RoundResolution = {
    roundIndex: session.roundIndex,
    truth: session.truth,
    observations: session.observations,
    decisions,
    emissions,
    outOfPlay: [...session.ejected],
    consistency,
    alignment,
    rescueBefore: session.rescue,
    rescueAfter,
  };

  return {
    ...session,
    phase: 'resolved',
    rngState,
    rescue: rescueAfter,
    resolution,
    log: [...session.log, resolution],
    reliability,
    skeptic: living.includes('skeptic') ? updateSkeptic(session.skeptic, listed) : session.skeptic,
    pattern: living.includes('pattern')
      ? updatePattern(session.pattern, session.observations.pattern, emissions.pattern, listed)
      : session.pattern,
    explorer: living.includes('explorer')
      ? updateExplorer(session.explorer, {
          context: explorerContext(session.observations.explorer, session.explorer),
          arm: decisions.explorer.kind,
          ownObservation: session.observations.explorer,
          ownEmission: emissions.explorer,
          emissions: listed,
        })
      : session.explorer,
  };
}

function withRole(
  session: Session,
  seat: (typeof AI_SEATS)[number],
  honest: Decision,
  rng: () => number,
  living: readonly SeatId[],
): Decision {
  const acted = session.roles[seat] === 'saboteur' ? sabotageDecision(session.observations[seat], honest, rng, session.roundIndex) : honest;
  return { ...acted, trust: normalizeWeights(acted.trust, peersOf(seat, living)) };
}
