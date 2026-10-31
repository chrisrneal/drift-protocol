import {
  EXPLORER_CONTEXT_WINDOW,
  EXPLORER_DROP_REWARD,
  EXPLORER_EPSILON,
  EXPLORER_KEEP_REWARD,
  LEXICON,
  VALUE_BAND,
} from '../game/constants';
import { consensusPacket, normalizeWeights, packetSimilarity } from '../game/scoring';
import type { ActionKind, Decision, Emission, FieldEdit, Packet, SeatId } from '../game/types';

export const EXPLORER_PEERS = ['you', 'skeptic', 'pattern'] as const;
export type ExplorerPeer = (typeof EXPLORER_PEERS)[number];
export type Arm = ActionKind;

type ArmTable = Partial<Record<Arm, number>>;

export type ExplorerMemory = {
  q: Record<string, ArmTable>;
  pulls: Record<string, ArmTable>;
  values: number[];
  keywordCounts: Record<string, number>;
  peerFit: Record<ExplorerPeer, { sum: number; count: number }>;
};

const ARMS: Arm[] = ['relay', 'edit', 'drop'];

function emptyFit(): ExplorerMemory['peerFit'] {
  return {
    you: { sum: 0, count: 0 },
    skeptic: { sum: 0, count: 0 },
    pattern: { sum: 0, count: 0 },
  };
}

export function initialExplorerMemory(): ExplorerMemory {
  return { q: {}, pulls: {}, values: [], keywordCounts: {}, peerFit: emptyFit() };
}

export function explorerContext(observation: Packet, memory: ExplorerMemory): string {
  const recent = memory.values.slice(-EXPLORER_CONTEXT_WINDOW);
  let valueBand: 'cold' | 'near' | 'far' = 'cold';
  if (recent.length >= 2) {
    const moving = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    valueBand = Math.abs(observation.value - moving) <= VALUE_BAND ? 'near' : 'far';
  }
  const novel = observation.keywords.filter((word) => (memory.keywordCounts[word] ?? 0) === 0).length;
  return `${valueBand}:${novel >= 2 ? 'novel' : 'known'}`;
}

function fallbackKeyword(keywords: readonly string[], counts: Record<string, number>): string {
  let best: string = LEXICON[0];
  let bestCount = -1;
  for (const word of LEXICON) {
    if (keywords.includes(word)) continue;
    const count = counts[word] ?? 0;
    if (count > bestCount || (count === bestCount && word.localeCompare(best) < 0)) {
      best = word;
      bestCount = count;
    }
  }
  return best;
}

function chooseEdit(observation: Packet, memory: ExplorerMemory): FieldEdit {
  const recent = memory.values.slice(-EXPLORER_CONTEXT_WINDOW);
  if (recent.length >= 2) {
    const moving = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    const next = Math.round(moving);
    if (Math.abs(observation.value - moving) > VALUE_BAND && next !== observation.value) {
      return { field: 'value', next };
    }
  }
  const novelIndex = observation.keywords.findIndex((word) => (memory.keywordCounts[word] ?? 0) === 0);
  const index = (novelIndex === -1 ? 0 : novelIndex) as 0 | 1 | 2;
  const replacement = fallbackKeyword(observation.keywords, memory.keywordCounts);
  if (replacement !== observation.keywords[index]) {
    return { field: 'keyword', index, next: replacement };
  }
  return { field: 'value', next: Math.round(observation.value) + 1 };
}

function trustOf(memory: ExplorerMemory): Decision['trust'] {
  const weights = {} as Record<ExplorerPeer, number>;
  for (const seat of EXPLORER_PEERS) {
    const row = memory.peerFit[seat];
    weights[seat] = row.count > 0 ? row.sum / row.count : 0.5;
  }
  return normalizeWeights(weights, EXPLORER_PEERS);
}

export function decideExplorer(
  observation: Packet,
  memory: ExplorerMemory,
  rng: () => number,
  options?: { epsilon?: number },
): Decision {
  const epsilon = options?.epsilon ?? EXPLORER_EPSILON;
  const context = explorerContext(observation, memory);
  const table = memory.q[context] ?? {};
  let arm: Arm = 'relay';
  if (rng() < epsilon) {
    arm = ARMS[Math.min(ARMS.length - 1, Math.floor(rng() * ARMS.length))] ?? 'relay';
  } else {
    let best = table.relay ?? 0;
    for (const candidate of ARMS) {
      const score = table[candidate] ?? 0;
      if (score > best) {
        best = score;
        arm = candidate;
      }
    }
  }
  const trust = trustOf(memory);
  if (arm === 'edit') return { kind: 'edit', edit: chooseEdit(observation, memory), trust };
  return { kind: arm, trust };
}

function isPeer(seat: SeatId): seat is ExplorerPeer {
  return (EXPLORER_PEERS as readonly SeatId[]).includes(seat);
}

export function updateExplorer(
  memory: ExplorerMemory,
  input: {
    context: string;
    arm: Arm;
    ownObservation: Packet;
    ownEmission: Packet | null;
    emissions: Emission[];
  },
): ExplorerMemory {
  const others = input.emissions
    .filter((row): row is Emission & { packet: Packet } => row.seat !== 'explorer' && row.packet !== null)
    .map((row) => row.packet);
  const otherConsensus = consensusPacket(others);
  let reward = 0.5;
  if (input.ownEmission && otherConsensus) reward = packetSimilarity(input.ownEmission, otherConsensus);
  else if (!input.ownEmission && otherConsensus) {
    reward =
      packetSimilarity(input.ownObservation, otherConsensus) < 0.5 ? EXPLORER_DROP_REWARD : EXPLORER_KEEP_REWARD;
  }

  const pulls = { ...memory.pulls, [input.context]: { ...memory.pulls[input.context] } };
  const q = { ...memory.q, [input.context]: { ...memory.q[input.context] } };
  const seen = pulls[input.context][input.arm] ?? 0;
  const previous = q[input.context][input.arm] ?? 0;
  pulls[input.context][input.arm] = seen + 1;
  q[input.context][input.arm] = previous + (reward - previous) / (seen + 1);

  const keywordCounts = { ...memory.keywordCounts };
  for (const word of input.ownObservation.keywords) keywordCounts[word] = (keywordCounts[word] ?? 0) + 1;

  const reference = input.ownEmission ?? otherConsensus;
  const peerFit: ExplorerMemory['peerFit'] = {
    you: { ...memory.peerFit.you },
    skeptic: { ...memory.peerFit.skeptic },
    pattern: { ...memory.peerFit.pattern },
  };
  if (reference) {
    for (const row of input.emissions) {
      if (!isPeer(row.seat) || !row.packet) continue;
      peerFit[row.seat].sum += packetSimilarity(row.packet, reference);
      peerFit[row.seat].count += 1;
    }
  }

  return {
    q,
    pulls,
    values: [...memory.values, input.ownObservation.value],
    keywordCounts,
    peerFit,
  };
}
