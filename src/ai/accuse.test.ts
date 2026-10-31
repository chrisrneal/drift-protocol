import { describe, expect, it } from 'vitest';
import { ballotsFor, crewVote, evidenceFromRounds, saboteurVote, suggestAiMeeting, suspicionScores } from './accuse';
import { rolesFor } from '../game/roles';
import type { Packet, SeatId } from '../game/types';

const same: Packet = { keywords: ['ice', 'current', 'depth'], value: 50 };

function emitted(overrides: Partial<Record<SeatId, Packet | null>>) {
  return {
    emissions: {
      you: same,
      skeptic: same,
      pattern: same,
      explorer: same,
      ...overrides,
    },
  };
}

describe('evidence', () => {
  it('leaves ejected seats out so a silent round is not scored as a drop', () => {
    const [round] = evidenceFromRounds([
      {
        emissions: { you: same, skeptic: same, pattern: same, explorer: null },
        outOfPlay: ['explorer'],
      },
    ]);
    const scores = suspicionScores([round], ['you', 'skeptic', 'pattern', 'explorer']);
    expect(scores.explorer).toBe(0);
    expect(round.emissions.explorer).toBeUndefined();
  });
});

describe('suspicion', () => {
  it('marks a seat that drops while the others agree', () => {
    const scores = suspicionScores([emitted({ explorer: null })], ['you', 'skeptic', 'pattern', 'explorer']);
    expect(scores.explorer).toBeGreaterThan(scores.you);
    expect(scores.skeptic).toBeCloseTo(0);
    expect(scores.pattern).toBeCloseTo(0);
  });

  it('stays flat when every living seat relays the same packet', () => {
    const scores = suspicionScores([emitted({})], ['you', 'skeptic', 'pattern', 'explorer']);
    for (const seat of ['you', 'skeptic', 'pattern', 'explorer'] as const) {
      expect(scores[seat]).toBeCloseTo(0);
    }
  });
});

describe('crew votes', () => {
  it('accuses the anomalous seat and skips a flat watch', () => {
    const living = ['you', 'skeptic', 'pattern', 'explorer'] as const;
    const loud = suspicionScores([emitted({ explorer: null }), emitted({ explorer: null })], living);
    expect(crewVote('skeptic', loud, living)).toBe('explorer');
    expect(crewVote('you', loud, living)).toBe('explorer');

    const flat = suspicionScores([emitted({})], living);
    expect(crewVote('pattern', flat, living)).toBe('skip');
  });

  it('does not accuse itself', () => {
    const living = ['you', 'skeptic', 'pattern', 'explorer'] as const;
    const scores = { you: 0.1, skeptic: 0.95, pattern: 0.1, explorer: 0.1 };
    expect(crewVote('skeptic', scores, living)).toBe('skip');
  });
});

describe('saboteur votes', () => {
  const living = ['you', 'skeptic', 'pattern', 'explorer'] as const;
  const scores = suspicionScores([emitted({ explorer: null })], living);

  it('usually bluffs by accusing the same anomaly a crew seat would', () => {
    expect(saboteurVote('skeptic', scores, living, () => 0.5)).toBe('explorer');
  });

  it('rarely votes for itself', () => {
    expect(saboteurVote('skeptic', scores, living, () => 0.01)).toBe('skeptic');
  });
});

describe('who calls a meeting', () => {
  const living = ['you', 'skeptic', 'pattern', 'explorer'] as const;

  it('lets a crew AI name the anomalous seat', () => {
    const scores = suspicionScores([emitted({ explorer: null }), emitted({ explorer: null })], living);
    const call = suggestAiMeeting({
      open: true,
      roles: rolesFor('explorer'),
      living: [...living],
      scores,
      rng: () => 0.9,
    });
    expect(call).toEqual({ caller: 'skeptic', nominated: 'explorer' });
  });

  it('stays quiet when the watch looks even', () => {
    const scores = suspicionScores([emitted({})], living);
    expect(
      suggestAiMeeting({
        open: true,
        roles: rolesFor('explorer'),
        living: [...living],
        scores,
        rng: () => 0.99,
      }),
    ).toBeNull();
  });

  it('lets the saboteur occasionally frame a crew seat and never names itself', () => {
    const scores: Record<SeatId, number> = { you: 0.2, skeptic: 0.48, pattern: 0.36, explorer: 0.1 };
    expect(
      suggestAiMeeting({
        open: true,
        roles: rolesFor('explorer'),
        living: [...living],
        scores,
        rng: () => 0.05,
      }),
    ).toEqual({ caller: 'explorer', nominated: 'skeptic' });

    expect(
      suggestAiMeeting({
        open: true,
        roles: rolesFor('explorer'),
        living: [...living],
        scores: { you: 0.2, skeptic: 0.2, pattern: 0.2, explorer: 0.5 },
        rng: () => 0.05,
      }),
    ).toBeNull();
  });

  it('does not call when accusations are closed', () => {
    const scores = suspicionScores([emitted({ explorer: null })], living);
    expect(
      suggestAiMeeting({
        open: false,
        roles: rolesFor('you'),
        living: [...living],
        scores,
        rng: () => 0,
      }),
    ).toBeNull();
  });
});

describe('ballots', () => {
  it('uses the human vote and lets ejected seats sit out', () => {
    const living = ['you', 'pattern', 'explorer'] as const;
    const scores = { you: 0, skeptic: 0, pattern: 0, explorer: 0.8 };
    const ballots = ballotsFor({
      living: [...living],
      roles: rolesFor('pattern'),
      scores,
      humanVote: 'explorer',
      rng: () => 0.5,
    });
    expect(ballots.map((row) => row.voter)).toEqual(['you', 'pattern', 'explorer']);
    expect(ballots.find((row) => row.voter === 'you')?.choice).toBe('explorer');
    expect(ballots.find((row) => row.voter === 'skeptic')).toBeUndefined();
  });
});
