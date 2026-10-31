import { decideExplorer, explorerContext, initialExplorerMemory, updateExplorer, type ExplorerMemory } from '../ai/explorer';
import { decidePattern, initialPatternMemory, updatePattern, type PatternMemory } from '../ai/pattern';
import { decideSkeptic, initialSkepticMemory, updateSkeptic, type SkepticMemory } from '../ai/skeptic';
import { applyDecision, packetsEqual } from './actions';
import { MAX_ROUNDS, MIN_ROUNDS, RESCUE_START } from './constants';
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
  SEATS,
  type Decision,
  type HumanChoice,
  type Packet,
  type ReliabilityStats,
  type SeatId,
} from './types';

export type RoundResolution = {
  roundIndex: number;
  truth: Packet;
  observations: Record<SeatId, Packet>;
  decisions: Record<SeatId, Decision>;
  emissions: Record<SeatId, Packet | null>;
  consistency: number;
  alignment: number;
  rescueBefore: number;
  rescueAfter: number;
};

export type SessionPhase = 'play' | 'resolved' | 'done';

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
};

export function createSession(config: { rounds: number; seed: number }): Session {
  if (!Number.isInteger(config.rounds) || config.rounds < MIN_ROUNDS || config.rounds > MAX_ROUNDS) {
    throw new Error(`Round count must be an integer from ${MIN_ROUNDS} to ${MAX_ROUNDS}.`);
  }
  const opened = openRound(config.seed >>> 0, null);
  return {
    rounds: config.rounds,
    seed: config.seed >>> 0,
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
  };
}

export function submitRound(session: Session, choice: HumanChoice): Session {
  if (session.phase !== 'play') throw new Error('No open round.');

  const human: Decision = {
    kind: choice.kind,
    edit: choice.edit,
    trust: normalizeWeights(choice.trust, ['skeptic', 'pattern', 'explorer']),
  };
  const yours = applyDecision(session.observations.you, human);
  if (choice.kind === 'edit') {
    if (!yours || packetsEqual(yours, session.observations.you)) {
      throw new Error('Edit must change one field.');
    }
  }

  const skeptic = decideSkeptic(session.observations.skeptic, session.skeptic);
  const pattern = decidePattern(session.observations.pattern, session.pattern);
  let rngState = session.rngState;
  const draw = () => {
    const rolled = rngStep(rngState);
    rngState = rolled.state;
    return rolled.value;
  };
  const explorer = decideExplorer(session.observations.explorer, session.explorer, draw);
  const decisions: Record<SeatId, Decision> = { you: human, skeptic, pattern, explorer };
  const emissions = {} as Record<SeatId, Packet | null>;
  for (const seat of SEATS) emissions[seat] = applyDecision(session.observations[seat], decisions[seat]);

  const reliabilityNow = {} as Record<SeatId, number>;
  for (const seat of SEATS) reliabilityNow[seat] = meanReliability(session.reliability[seat]);
  const consistency = consistencyScore(SEATS.map((seat) => emissions[seat]));
  const alignment = trustAlignment(
    SEATS.map((seat) => ({ from: seat, weights: decisions[seat].trust })),
    reliabilityNow,
  );
  const rescueAfter = nextRescue(session.rescue, consistency, alignment);

  const reliability = { ...session.reliability };
  for (const seat of SEATS) {
    const emitted = emissions[seat];
    if (!emitted) continue;
    const prior = reliability[seat];
    reliability[seat] = {
      sum: prior.sum + packetSimilarity(emitted, session.truth),
      count: prior.count + 1,
    };
  }

  const listed = SEATS.map((seat) => ({ seat, packet: emissions[seat] }));
  const resolution: RoundResolution = {
    roundIndex: session.roundIndex,
    truth: session.truth,
    observations: session.observations,
    decisions,
    emissions,
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
    skeptic: updateSkeptic(session.skeptic, listed),
    pattern: updatePattern(session.pattern, session.observations.pattern, emissions.pattern, listed),
    explorer: updateExplorer(session.explorer, {
      context: explorerContext(session.observations.explorer, session.explorer),
      arm: explorer.kind,
      ownObservation: session.observations.explorer,
      ownEmission: emissions.explorer,
      emissions: listed,
    }),
  };
}

export function nextRound(session: Session): Session {
  if (session.phase !== 'resolved') throw new Error('Resolve the round first.');
  if (session.roundIndex + 1 >= session.rounds) return { ...session, phase: 'done' };
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
