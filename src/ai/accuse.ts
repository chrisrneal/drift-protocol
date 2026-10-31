import { ACCUSE_SCORE, FRAME_CHANCE, FRAME_SCORE, SABOTEUR_SELF_VOTE } from '../game/constants';
import type { Role } from '../game/roles';
import { consensusPacket, packetSimilarity } from '../game/scoring';
import { SEATS, type Packet, type SeatId } from '../game/types';
import type { VoteBallot, VoteChoice } from '../game/vote';

export type RoundEvidence = {
  emissions: Partial<Record<SeatId, Packet | null>>;
};

export function evidenceFromRounds(
  log: ReadonlyArray<{ emissions: Record<SeatId, Packet | null>; outOfPlay: readonly SeatId[] }>,
): RoundEvidence[] {
  return log.map((round) => {
    const emissions: RoundEvidence['emissions'] = {};
    for (const seat of SEATS) {
      if (round.outOfPlay.includes(seat)) continue;
      emissions[seat] = round.emissions[seat];
    }
    return { emissions };
  });
}

export function suspicionScores(log: readonly RoundEvidence[], living: readonly SeatId[]): Record<SeatId, number> {
  const totals = emptyScores();
  const rounds = emptyScores();
  const active = new Set(living);
  for (const round of log) {
    const present = SEATS.filter((seat) => active.has(seat) && Object.prototype.hasOwnProperty.call(round.emissions, seat));
    for (const seat of present) {
      rounds[seat] += 1;
      const packet = round.emissions[seat];
      if (!packet) {
        totals[seat] += 1;
        continue;
      }
      const others = present
        .filter((other) => other !== seat)
        .map((other) => round.emissions[other])
        .filter((other): other is Packet => other != null);
      const consensus = consensusPacket(others);
      if (!consensus) continue;
      totals[seat] += 1 - packetSimilarity(packet, consensus);
    }
  }
  const scores = emptyScores();
  for (const seat of SEATS) scores[seat] = rounds[seat] > 0 ? totals[seat] / rounds[seat] : 0;
  return scores;
}

export function crewVote(voter: SeatId, scores: Record<SeatId, number>, living: readonly SeatId[]): VoteChoice {
  const ranked = living
    .filter((seat) => seat !== voter)
    .sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const top = ranked[0];
  if (!top || scores[top] < ACCUSE_SCORE) return 'skip';
  return top;
}

export function saboteurVote(
  voter: SeatId,
  scores: Record<SeatId, number>,
  living: readonly SeatId[],
  rng: () => number,
): VoteChoice {
  if (rng() < SABOTEUR_SELF_VOTE) return voter;
  return crewVote(voter, scores, living);
}

export function suggestAiMeeting(input: {
  open: boolean;
  roles: Record<SeatId, Role>;
  living: readonly SeatId[];
  scores: Record<SeatId, number>;
  rng: () => number;
}): { caller: SeatId; nominated: SeatId } | null {
  if (!input.open) return null;
  for (const caller of input.living) {
    if (caller === 'you' || input.roles[caller] !== 'crew') continue;
    const choice = crewVote(caller, input.scores, input.living);
    if (choice !== 'skip') return { caller, nominated: choice };
  }
  const saboteur = input.living.find((seat) => seat !== 'you' && input.roles[seat] === 'saboteur');
  if (!saboteur || input.rng() >= FRAME_CHANCE) return null;
  const framed = input.living
    .filter((seat) => seat !== saboteur)
    .sort((a, b) => input.scores[b] - input.scores[a] || a.localeCompare(b))
    .find((seat) => input.scores[seat] >= FRAME_SCORE);
  if (!framed) return null;
  return { caller: saboteur, nominated: framed };
}

export function ballotsFor(input: {
  living: readonly SeatId[];
  roles: Record<SeatId, Role>;
  scores: Record<SeatId, number>;
  humanVote: VoteChoice | null;
  rng: () => number;
}): VoteBallot[] {
  const ballots: VoteBallot[] = [];
  for (const voter of input.living) {
    if (voter === 'you') {
      if (!input.humanVote) throw new Error('The watch lead still needs to vote.');
      ballots.push({ voter, choice: input.humanVote });
      continue;
    }
    const choice =
      input.roles[voter] === 'saboteur'
        ? saboteurVote(voter, input.scores, input.living, input.rng)
        : crewVote(voter, input.scores, input.living);
    ballots.push({ voter, choice });
  }
  return ballots;
}

function emptyScores(): Record<SeatId, number> {
  return { you: 0, skeptic: 0, pattern: 0, explorer: 0 };
}
