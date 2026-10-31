import {
  SKEPTIC_DROP_BETA,
  SKEPTIC_HIT,
  SKEPTIC_KEYWORD_DROP,
  SKEPTIC_MEMORY,
  SKEPTIC_MISS,
  SKEPTIC_PRIOR,
  SKEPTIC_VALUE_DROP,
  SKEPTIC_VALUE_EDIT,
} from '../game/constants';
import { clonePacket } from '../game/actions';
import { normalizeWeights, packetSimilarity } from '../game/scoring';
import type { Decision, Emission, Packet, SeatId } from '../game/types';

export const SKEPTIC_PEERS = ['you', 'pattern', 'explorer'] as const;
export type SkepticPeer = (typeof SKEPTIC_PEERS)[number];

export type SkepticMemory = {
  alpha: Record<SkepticPeer, number>;
  beta: Record<SkepticPeer, number>;
  recentRounds: Emission[][];
};

export function initialSkepticMemory(): SkepticMemory {
  return {
    alpha: { you: SKEPTIC_PRIOR, pattern: SKEPTIC_PRIOR, explorer: SKEPTIC_PRIOR },
    beta: { you: SKEPTIC_PRIOR, pattern: SKEPTIC_PRIOR, explorer: SKEPTIC_PRIOR },
    recentRounds: [],
  };
}

function belief(memory: SkepticMemory, seat: SkepticPeer): number {
  const alpha = memory.alpha[seat];
  const beta = memory.beta[seat];
  return alpha / (alpha + beta);
}

function trustedConsensus(memory: SkepticMemory): { keywords: string[]; value: number } | null {
  const votes = new Map<string, number>();
  let weight = 0;
  let value = 0;
  let samples = 0;
  for (const round of memory.recentRounds) {
    for (const row of round) {
      if (!isPeer(row.seat) || !row.packet) continue;
      const trust = belief(memory, row.seat);
      samples += 1;
      weight += trust;
      value += trust * row.packet.value;
      for (const word of row.packet.keywords) votes.set(word, (votes.get(word) ?? 0) + trust);
    }
  }
  if (samples === 0 || weight <= 0) return null;
  const keywords = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word);
  return { keywords, value: value / weight };
}

function isPeer(seat: SeatId): seat is SkepticPeer {
  return (SKEPTIC_PEERS as readonly SeatId[]).includes(seat);
}

function trustOf(memory: SkepticMemory): Decision['trust'] {
  const weights = {} as Record<SkepticPeer, number>;
  for (const seat of SKEPTIC_PEERS) weights[seat] = belief(memory, seat);
  return normalizeWeights(weights, SKEPTIC_PEERS);
}

export function decideSkeptic(observation: Packet, memory: SkepticMemory): Decision {
  const trust = trustOf(memory);
  const consensus = trustedConsensus(memory);
  if (!consensus) return { kind: 'relay', trust };

  const delta = Math.abs(observation.value - consensus.value);
  const mismatchAt = observation.keywords
    .map((word, index) => ({ word, index }))
    .filter((slot) => !consensus.keywords.includes(slot.word));

  if (delta >= SKEPTIC_VALUE_DROP && mismatchAt.length >= SKEPTIC_KEYWORD_DROP) {
    return { kind: 'drop', trust };
  }
  if (delta >= SKEPTIC_VALUE_EDIT) {
    return { kind: 'edit', edit: { field: 'value', next: Math.round(consensus.value) }, trust };
  }
  if (mismatchAt.length >= 1) {
    const slot = mismatchAt[0];
    const replacement = consensus.keywords.find((word) => !observation.keywords.includes(word));
    if (replacement && (slot.index === 0 || slot.index === 1 || slot.index === 2)) {
      return { kind: 'edit', edit: { field: 'keyword', index: slot.index, next: replacement }, trust };
    }
  }
  return { kind: 'relay', trust };
}

function referencePacket(emissions: Emission[]): Packet | null {
  const own = emissions.find((row) => row.seat === 'skeptic')?.packet ?? null;
  if (own) return own;
  const others = emissions
    .filter((row): row is Emission & { packet: Packet } => row.seat !== 'skeptic' && row.packet !== null)
    .map((row) => row.packet);
  if (others.length === 0) return null;
  const votes = new Map<string, number>();
  let value = 0;
  for (const packet of others) {
    value += packet.value;
    for (const word of packet.keywords) votes.set(word, (votes.get(word) ?? 0) + 1);
  }
  const keywords = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word);
  while (keywords.length < 3) keywords.push(keywords[0] ?? 'ice');
  return { keywords: [keywords[0], keywords[1], keywords[2]], value: value / others.length };
}

export function updateSkeptic(memory: SkepticMemory, emissions: Emission[]): SkepticMemory {
  const alpha = { ...memory.alpha };
  const beta = { ...memory.beta };
  const reference = referencePacket(emissions);
  for (const seat of SKEPTIC_PEERS) {
    const row = emissions.find((item) => item.seat === seat);
    if (row?.absent) continue;
    const packet = row?.packet ?? null;
    if (!packet) {
      beta[seat] += SKEPTIC_DROP_BETA;
      continue;
    }
    if (!reference) continue;
    const similarity = packetSimilarity(packet, reference);
    if (similarity >= SKEPTIC_HIT) alpha[seat] += 1;
    else if (similarity <= SKEPTIC_MISS) beta[seat] += 1;
    else {
      alpha[seat] += 0.25;
      beta[seat] += 0.25;
    }
  }
  const recentRounds = [
    ...memory.recentRounds,
    emissions.map((row) => ({ seat: row.seat, packet: row.packet ? clonePacket(row.packet) : null })),
  ].slice(-SKEPTIC_MEMORY);
  return { alpha, beta, recentRounds };
}
