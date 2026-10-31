import { describe, expect, it } from 'vitest';
import { truthAnswer } from './fingerprint';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats } from './roles';
import { advance, createBaySession, revealCheckIn } from './session';
import { checkInStreamStart, voteStreamStart } from './streams';
import { BAY_SEATS, type BayAnswer, type BaySeatId, type BaySession } from './types';

function truthMap(session: BaySession): Partial<Record<BaySeatId, BayAnswer>> {
  const answers: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of livingSeats(session.ejected)) answers[seat] = truthAnswer(session.puzzle);
  return answers;
}

describe('createBaySession', () => {
  it('opens an eight-seat check-in from the seed', () => {
    const session = createBaySession({ rounds: 10, seed: 42 });
    expect(session.phase).toBe('check-in');
    expect(session.integrity).toBe(4200);
    expect(session.roundIndex).toBe(0);
    expect(session.puzzle).toEqual(generatePuzzle(42, 0));
    expect(session.cell).toEqual(assignCell(42));
    expect(session.controllers.helm).toBe('human');
    expect(session.controllers.sonar).toBe('ai');
    expect(session.ejected).toEqual([]);
    expect(session.log).toEqual([]);
    expect(session.winner).toBeNull();
    expect(session.voteState).toBe(voteStreamStart(42));
    expect(voteStreamStart(42)).toBe(1887305771);
    expect(checkInStreamStart(42)).toBe(203342640);
    expect(session.checkInState).toBe(203342640);
    expect(session).not.toHaveProperty('notes');
  });

  it('rejects round counts outside 8–12', () => {
    expect(() => createBaySession({ rounds: 7, seed: 1 })).toThrow(/8/);
    expect(() => createBaySession({ rounds: 13, seed: 1 })).toThrow(/12/);
    expect(() => createBaySession({ rounds: 10.5, seed: 1 })).toThrow(/integer/);
  });
});

describe('reveal and discuss', () => {
  it('applies integrity once, reveals eight fingerprints, and rejects a second reveal', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    const revealed = revealCheckIn(opened, truthMap(opened));
    expect(revealed.phase).toBe('discuss');
    expect(revealed.integrity).toBe(4600);
    expect(revealed.log).toHaveLength(1);
    expect(revealed.log[0].row).toBe('aligned');
    expect(revealed.log[0].delta).toBe(400);
    expect(revealed.log[0].integrityBefore).toBe(4200);
    expect(revealed.log[0].integrityAfter).toBe(4600);
    expect(revealed.log[0].rows).toHaveLength(8);
    expect(revealed.log[0].rows.every((row) => row.absent === false && row.fingerprint.errorClass === 'exact')).toBe(
      true,
    );
    expect(revealed.voteState).toBe(opened.voteState);
    expect(revealed.pendingCall).toBeNull();
    expect(revealed.winner).toBeNull();
    expect(() => revealCheckIn(revealed, truthMap(opened))).toThrow(/No open check-in/);
  });

  it('rejects a missing living answer', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    const answers = truthMap(opened);
    delete answers.cargo;
    expect(() => revealCheckIn(opened, answers)).toThrow(/Every living seat must submit/);
  });

  it('advances from round 1 discuss without a vote and keeps the next puzzle on the puzzle stream', () => {
    let session = revealCheckIn(createBaySession({ rounds: 8, seed: 42 }), truthMap(createBaySession({ rounds: 8, seed: 42 })));
    session = advance(session);
    expect(session.phase).toBe('check-in');
    expect(session.roundIndex).toBe(1);
    expect(session.integrity).toBe(4600);
    expect(session.puzzle).toEqual(generatePuzzle(42, 1));
    expect(session.meetings).toEqual([]);
    expect(session.voteState).toBe(voteStreamStart(42));
  });

  it('can sit at or above 70% without ending the watch', () => {
    let session = createBaySession({ rounds: 8, seed: 1 });
    for (let round = 0; round < 7; round += 1) {
      session = revealCheckIn(session, truthMap(session));
      expect(session.phase).toBe('discuss');
      expect(session.winner).toBeNull();
      if (round < 6) session = advance(session);
    }
    expect(session.integrity).toBe(7000);
    expect(session.phase).toBe('discuss');
    session = advance(session);
    expect(session.phase).toBe('check-in');
    expect(session.winner).toBeNull();
  });

  it('awards the meter only when the last discuss advances', () => {
    let session = createBaySession({ rounds: 8, seed: 1 });
    for (let round = 0; round < 8; round += 1) {
      session = revealCheckIn(session, truthMap(session));
      session = advance(session);
    }
    expect(session.phase).toBe('done');
    expect(session.integrity).toBe(7400);
    expect(session.winner).toBe('crew');
    expect(session.winReason).toBe('integrity-window');
    expect(BAY_SEATS).toHaveLength(8);
  });
});
