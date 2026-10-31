import { AI_SEATS, SEATS, type Packet, type SeatId, type TrustWeights } from '../game/types';

export const SEAT_NAME: Record<SeatId, string> = {
  you: 'You',
  skeptic: 'Skeptic',
  pattern: 'Pattern',
  explorer: 'Explorer',
};

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPercent(value: number): string {
  const points = value * 100;
  const body = Math.abs(points).toFixed(1);
  if (points > 0.05) return `+${body}%`;
  if (points < -0.05) return `-${body}%`;
  return '0.0%';
}

export function packetKeywords(packet: Packet): string {
  return packet.keywords.join(' · ');
}

export function trustLine(from: SeatId, trust: TrustWeights): string {
  const seats = from === 'you' ? AI_SEATS : SEATS.filter((seat) => seat !== from);
  return seats.map((seat) => `${SEAT_NAME[seat]} ${percent(trust[seat] ?? 0)}`).join(' · ');
}
