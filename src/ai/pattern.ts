import { LEXICON, PATTERN_MIN_HISTORY, PATTERN_WINDOW, VALUE_BAND } from '../game/constants';
import { normalizeWeights, packetSimilarity } from '../game/scoring';
import type { Decision, Emission, Packet, SeatId } from '../game/types';

export const PATTERN_PEERS = ['you', 'skeptic', 'explorer'] as const;
export type PatternPeer = (typeof PATTERN_PEERS)[number];

export type FitRow = { sum: number; count: number };

export type PatternMemory = {
  values: number[];
  packets: Packet[];
  peerFit: Record<PatternPeer, FitRow>;
};

function emptyFit(): Record<PatternPeer, FitRow> {
  return {
    you: { sum: 0, count: 0 },
    skeptic: { sum: 0, count: 0 },
    explorer: { sum: 0, count: 0 },
  };
}

export function initialPatternMemory(): PatternMemory {
  return { values: [], packets: [], peerFit: emptyFit() };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pairCounts(packets: Packet[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const packet of packets) {
    const [a, b, c] = packet.keywords;
    for (const key of [pairKey(a, b), pairKey(a, c), pairKey(b, c)]) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function trustOf(memory: PatternMemory): Decision['trust'] {
  const weights = {} as Record<PatternPeer, number>;
  for (const seat of PATTERN_PEERS) {
    const row = memory.peerFit[seat];
    weights[seat] = row.count > 0 ? row.sum / row.count : 0.5;
  }
  return normalizeWeights(weights, PATTERN_PEERS);
}

function anomalousKeyword(word: string, partners: string[], pairs: Map<string, number>, seen: Map<string, number>): boolean {
  const support = partners.reduce((sum, partner) => sum + (pairs.get(pairKey(word, partner)) ?? 0), 0);
  return support === 0 && (seen.get(word) ?? 0) === 0;
}

function bestReplacement(keywords: readonly string[], partners: string[], pairs: Map<string, number>): string | null {
  let best: string | null = null;
  let bestScore = -1;
  for (const word of LEXICON) {
    if (keywords.includes(word)) continue;
    const score = partners.reduce((sum, partner) => sum + (pairs.get(pairKey(word, partner)) ?? 0), 0);
    if (score > bestScore || (score === bestScore && best !== null && word.localeCompare(best) < 0)) {
      best = word;
      bestScore = score;
    }
  }
  return best;
}

export function decidePattern(observation: Packet, memory: PatternMemory): Decision {
  const trust = trustOf(memory);
  if (memory.packets.length < PATTERN_MIN_HISTORY) return { kind: 'relay', trust };

  const recent = memory.values.slice(-PATTERN_WINDOW);
  const moving = average(recent);
  const valueAnomaly = Math.abs(observation.value - moving) > VALUE_BAND;
  const pairs = pairCounts(memory.packets);
  const seen = new Map<string, number>();
  for (const packet of memory.packets) {
    for (const word of packet.keywords) seen.set(word, (seen.get(word) ?? 0) + 1);
  }
  const keywordSlots = observation.keywords
    .map((word, index) => ({ word, index }))
    .filter((slot) => {
      const partners = observation.keywords.filter((_, partnerIndex) => partnerIndex !== slot.index);
      return anomalousKeyword(slot.word, partners, pairs, seen);
    });

  const anomalyCount = (valueAnomaly ? 1 : 0) + keywordSlots.length;
  if (anomalyCount >= 2) return { kind: 'drop', trust };
  if (valueAnomaly) return { kind: 'edit', edit: { field: 'value', next: Math.round(moving) }, trust };
  if (keywordSlots.length === 1) {
    const slot = keywordSlots[0];
    const partners = observation.keywords.filter((_, index) => index !== slot.index);
    const replacement = bestReplacement(observation.keywords, partners, pairs);
    if (replacement && (slot.index === 0 || slot.index === 1 || slot.index === 2)) {
      return { kind: 'edit', edit: { field: 'keyword', index: slot.index, next: replacement }, trust };
    }
  }
  return { kind: 'relay', trust };
}

function isPeer(seat: SeatId): seat is PatternPeer {
  return (PATTERN_PEERS as readonly SeatId[]).includes(seat);
}

export function updatePattern(
  memory: PatternMemory,
  ownObservation: Packet,
  ownEmission: Packet | null,
  emissions: Emission[],
): PatternMemory {
  const peerFit: Record<PatternPeer, FitRow> = {
    you: { ...memory.peerFit.you },
    skeptic: { ...memory.peerFit.skeptic },
    explorer: { ...memory.peerFit.explorer },
  };
  if (ownEmission) {
    for (const row of emissions) {
      if (!isPeer(row.seat) || !row.packet) continue;
      const fit = peerFit[row.seat];
      fit.sum += packetSimilarity(row.packet, ownEmission);
      fit.count += 1;
    }
  }
  return {
    values: [...memory.values, ownObservation.value],
    packets: [...memory.packets, { keywords: [...ownObservation.keywords], value: ownObservation.value }],
    peerFit,
  };
}
