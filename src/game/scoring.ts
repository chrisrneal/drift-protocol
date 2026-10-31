import {
  ALIGNMENT_WEIGHT,
  CONSISTENCY_WEIGHT,
  RESCUE_MAX,
  RESCUE_MIN,
  RESCUE_NEUTRAL,
  RESCUE_STEP,
  RESCUE_WIN,
  VALUE_SCALE,
} from './constants';
import { clamp } from './rng';
import { SEATS, type Packet, type ReliabilityStats, type SeatId, type TrustWeights } from './types';

export function packetSimilarity(a: Packet, b: Packet): number {
  const counts = new Map<string, number>();
  for (const word of b.keywords) counts.set(word, (counts.get(word) ?? 0) + 1);
  let hits = 0;
  for (const word of a.keywords) {
    const left = counts.get(word) ?? 0;
    if (left > 0) {
      hits += 1;
      counts.set(word, left - 1);
    }
  }
  const keywordScore = hits / 3;
  const valueScore = 1 - Math.min(1, Math.abs(a.value - b.value) / VALUE_SCALE);
  return 0.5 * keywordScore + 0.5 * valueScore;
}

export function consistencyScore(emissions: Array<Packet | null>): number {
  const emitted = emissions.filter((packet): packet is Packet => packet !== null);
  if (emitted.length < 2) return 0;
  let sum = 0;
  let pairs = 0;
  for (let i = 0; i < emitted.length; i += 1) {
    for (let j = i + 1; j < emitted.length; j += 1) {
      sum += packetSimilarity(emitted[i], emitted[j]);
      pairs += 1;
    }
  }
  return (sum / pairs) * (emitted.length / emissions.length);
}

export function meanReliability(stats: ReliabilityStats | undefined): number {
  if (!stats || stats.count <= 0) return 0.5;
  return stats.sum / stats.count;
}

export function normalizeWeights(weights: TrustWeights, seats: readonly SeatId[]): Record<SeatId, number> {
  const raw = seats.map((seat) => Math.max(0, weights[seat] ?? 0));
  const sum = raw.reduce((total, value) => total + value, 0);
  const out = {} as Record<SeatId, number>;
  if (sum <= 0) {
    const share = 1 / seats.length;
    for (const seat of seats) out[seat] = share;
    return out;
  }
  seats.forEach((seat, index) => {
    out[seat] = raw[index] / sum;
  });
  return out;
}

export function trustAlignment(
  assigned: Array<{ from: SeatId; weights: TrustWeights }>,
  reliability: Record<SeatId, number>,
): number {
  if (assigned.length === 0) return 0;
  let total = 0;
  for (const row of assigned) {
    const seats = SEATS.filter((seat) => seat !== row.from);
    const weights = normalizeWeights(row.weights, seats);
    const relRaw = seats.map((seat) => Math.max(0, reliability[seat] ?? 0.5));
    const relSum = relRaw.reduce((sum, value) => sum + value, 0);
    const rel = relSum <= 0 ? seats.map(() => 1 / seats.length) : relRaw.map((value) => value / relSum);
    let l1 = 0;
    seats.forEach((seat, index) => {
      l1 += Math.abs((weights[seat] ?? 0) - rel[index]);
    });
    total += 1 - 0.5 * l1;
  }
  return total / assigned.length;
}

export function nextRescue(current: number, consistency: number, alignment: number): number {
  const quality = CONSISTENCY_WEIGHT * consistency + ALIGNMENT_WEIGHT * alignment;
  const delta = (quality - RESCUE_NEUTRAL) * RESCUE_STEP;
  return clamp(current + delta, RESCUE_MIN, RESCUE_MAX);
}

export function isRescued(rescue: number): boolean {
  return rescue >= RESCUE_WIN;
}

export function consensusPacket(packets: Packet[]): Packet | null {
  if (packets.length === 0) return null;
  const votes = new Map<string, number>();
  let value = 0;
  for (const packet of packets) {
    value += packet.value;
    for (const word of packet.keywords) votes.set(word, (votes.get(word) ?? 0) + 1);
  }
  const keywords = [...votes.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([word]) => word);
  while (keywords.length < 3) keywords.push(keywords[0] ?? 'ice');
  return {
    keywords: [keywords[0], keywords[1], keywords[2]],
    value: Math.round(value / packets.length),
  };
}
