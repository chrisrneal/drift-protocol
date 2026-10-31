import { describe, expect, it } from 'vitest';
import type { SeatId } from './types';
import {
  accusationsOpen,
  majorityEject,
  verdictAfterEject,
  verdictAtEnd,
  type VoteChoice,
} from './vote';

function ballot(pairs: Array<[SeatId, VoteChoice]>) {
  return pairs.map(([voter, choice]) => ({ voter, choice }));
}

describe('majority vote', () => {
  const four = ['you', 'skeptic', 'pattern', 'explorer'] as const;

  it('ejects a seat only when more than half the living seats name them', () => {
    expect(
      majorityEject(
        ballot([
          ['you', 'explorer'],
          ['skeptic', 'explorer'],
          ['pattern', 'explorer'],
          ['explorer', 'skip'],
        ]),
        four,
      ),
    ).toBe('explorer');

    expect(
      majorityEject(
        ballot([
          ['you', 'explorer'],
          ['skeptic', 'explorer'],
          ['pattern', 'skeptic'],
          ['explorer', 'skip'],
        ]),
        four,
      ),
    ).toBeNull();
  });

  it('requires both living seats when only two remain', () => {
    const living = ['you', 'pattern'] as const;
    expect(
      majorityEject(
        ballot([
          ['you', 'pattern'],
          ['pattern', 'you'],
        ]),
        living,
      ),
    ).toBeNull();
    expect(
      majorityEject(
        ballot([
          ['you', 'pattern'],
          ['pattern', 'pattern'],
        ]),
        living,
      ),
    ).toBe('pattern');
  });

  it('ignores votes cast by ejected seats', () => {
    const living = ['you', 'skeptic', 'pattern'] as const;
    const counted = majorityEject(
      ballot([
        ['you', 'skeptic'],
        ['skeptic', 'skip'],
        ['pattern', 'skip'],
        ['explorer', 'skeptic'],
      ]),
      living,
    );
    expect(counted).toBeNull();
    expect(
      majorityEject(
        ballot([
          ['you', 'skeptic'],
          ['skeptic', 'skeptic'],
          ['pattern', 'skip'],
          ['explorer', 'you'],
        ]),
        living,
      ),
    ).toBe('skeptic');
  });

  it('ignores votes aimed at someone already ejected', () => {
    expect(
      majorityEject(
        ballot([
          ['you', 'explorer'],
          ['skeptic', 'explorer'],
          ['pattern', 'explorer'],
        ]),
        ['you', 'skeptic', 'pattern'],
      ),
    ).toBeNull();
  });
});

describe('eject resolution', () => {
  it('gives the crew an early win when the saboteur is ejected', () => {
    expect(verdictAfterEject('pattern', 'pattern', ['you', 'skeptic', 'explorer'])).toEqual({
      winner: 'crew',
      reason: 'saboteur-ejected',
    });
  });

  it('continues with the saboteur hidden when a crew seat is ejected', () => {
    expect(verdictAfterEject('skeptic', 'pattern', ['you', 'pattern', 'explorer'])).toBeNull();
  });

  it('gives the saboteur the win when every crew seat has been ejected', () => {
    expect(verdictAfterEject('explorer', 'you', ['you'])).toEqual({
      winner: 'saboteur',
      reason: 'crew-eliminated',
    });
  });
});

describe('end of watch', () => {
  it('gives crew the rescue window at 60% even if the saboteur is still aboard', () => {
    expect(verdictAtEnd(0.6, true)).toEqual({ winner: 'crew', reason: 'rescue-window' });
    expect(verdictAtEnd(0.6, false)).toEqual({ winner: 'crew', reason: 'saboteur-ejected' });
  });

  it('gives the saboteur the watch below 50% if they were never ejected', () => {
    expect(verdictAtEnd(0.499, true)).toEqual({ winner: 'saboteur', reason: 'saboteur-survived' });
  });

  it('is a stalemate from 50% up to but not including 60% when the saboteur survives', () => {
    expect(verdictAtEnd(0.5, true)).toEqual({ winner: 'draw', reason: 'stalemate' });
    expect(verdictAtEnd(0.599, true)).toEqual({ winner: 'draw', reason: 'stalemate' });
  });
});

describe('when accusations open', () => {
  it('stays shut during round 1 and opens once that round is in the log', () => {
    expect(
      accusationsOpen({ phase: 'play', logLength: 0, meetingsThisRound: 0, livingCount: 4 }),
    ).toBe(false);
    expect(
      accusationsOpen({ phase: 'resolved', logLength: 1, meetingsThisRound: 0, livingCount: 4 }),
    ).toBe(true);
    expect(
      accusationsOpen({ phase: 'play', logLength: 1, meetingsThisRound: 0, livingCount: 4 }),
    ).toBe(true);
  });

  it('allows one accusation per round and only while at least two seats are living', () => {
    expect(
      accusationsOpen({ phase: 'resolved', logLength: 2, meetingsThisRound: 1, livingCount: 3 }),
    ).toBe(false);
    expect(
      accusationsOpen({ phase: 'meeting', logLength: 2, meetingsThisRound: 0, livingCount: 4 }),
    ).toBe(false);
    expect(
      accusationsOpen({ phase: 'play', logLength: 4, meetingsThisRound: 0, livingCount: 1 }),
    ).toBe(false);
  });
});
