import { describe, expect, it } from 'vitest';
import { fingerprint } from './fingerprint';
import { evaluateNomination, fillBallots } from './nominate';
import { assembleDial } from './puzzles';
import { assignCell, soloControllers } from './roles';
import { missSign, nameTarget, suspicionScores } from './suspicion';
import { BAY_SEATS, INSTRUMENT, type BaySeatId, type CheckInRecord, type ReadingPuzzle } from './types';

function dialLog(rounds: Array<Record<BaySeatId, number>>): CheckInRecord[] {
  return rounds.map((detents, roundIndex) => {
    const puzzle = assembleDial(3, 3);
    return {
      roundIndex,
      puzzle,
      integrityBefore: 4200,
      integrityAfter: 4200,
      row: 'split',
      delta: -200,
      rows: BAY_SEATS.map((seat) => ({
        seat,
        absent: false as const,
        answer: { kind: 'dial' as const, detent: detents[seat] },
        fingerprint: fingerprint(puzzle, { kind: 'dial', detent: detents[seat] }, INSTRUMENT[seat]),
      })),
    };
  });
}

function exactRound(overrides: Partial<Record<BaySeatId, number>> = {}): Record<BaySeatId, number> {
  const detents = {} as Record<BaySeatId, number>;
  for (const seat of BAY_SEATS) detents[seat] = overrides[seat] ?? 6;
  return detents;
}

describe('missSign', () => {
  it('reads the shorter dial or glyph step and ignores readings and exact answers', () => {
    const dial = assembleDial(3, 3);
    expect(missSign(dial, { kind: 'dial', detent: 6 })).toBeNull();
    expect(missSign(dial, { kind: 'dial', detent: 7 })).toBe(1);
    expect(missSign(dial, { kind: 'dial', detent: 5 })).toBe(-1);
    expect(missSign(dial, { kind: 'dial', detent: 0 })).toBe(0);
    const reading = {
      kind: 'reading' as const,
      anchor: 55,
      offset: 6,
      band: [55, 62] as [number, number],
      options: [
        { label: 'R1' as const, role: 'near' as const, value: 53 },
        { label: 'R2' as const, role: 'far' as const, value: 75 },
        { label: 'R3' as const, role: 'true' as const, value: 61 },
        { label: 'R4' as const, role: 'far' as const, value: 39 },
        { label: 'R5' as const, role: 'far' as const, value: 89 },
      ],
      truth: 'R1' as const,
      near: ['R1' as const],
      blatant: ['R2' as const, 'R4' as const, 'R5' as const],
    };
    expect(missSign(reading as ReadingPuzzle, { kind: 'reading', label: 'R2' })).toBeNull();
  });
});

describe('suspicion', () => {
  it('mixes miss weight 3:1 with the modal sign and breaks ties toward the earlier seat', () => {
    const log = dialLog([
      exactRound({ radio: 7, nav: 8, plant: 5 }),
    ]);
    const scores = suspicionScores(log);
    expect(scores.radio).toBeCloseTo(0.6625, 10);
    expect(scores.nav).toBeCloseTo(1, 10);
    expect(scores.plant).toBeCloseTo(0.4125, 10);
    expect(scores.sonar).toBe(0);
    const roles = assignCell(42).roles;
    expect(
      nameTarget({ viewer: 'sonar', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'others' }),
    ).toBe('nav');
    expect(
      nameTarget({ viewer: 'radio', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'crew' }),
    ).toBe('plant');
    const tied = suspicionScores(dialLog([exactRound({ sonar: 7, radio: 7 })]));
    expect(
      nameTarget({
        viewer: 'medic',
        roles,
        living: [...BAY_SEATS],
        suspicion: tied,
        threshold: 0.4,
        pool: 'others',
      }),
    ).toBe('sonar');
  });

  it('puts one signed near spread over three rounds in the frame band', () => {
    const log = dialLog([exactRound({ plant: 7 }), exactRound(), exactRound()]);
    expect(suspicionScores(log).plant).toBeCloseTo(0.3875, 10);
  });
});

describe('evaluateNomination', () => {
  it('does not draw on round 1', () => {
    const cell = assignCell(42);
    const result = evaluateNomination({
      roundIndex: 0,
      voteState: 1887305771,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log: [],
    });
    expect(result).toEqual({ pendingCall: null, voteState: 1887305771 });
  });

  it('lets the earliest crew AI call without consuming the frame draw', () => {
    const cell = assignCell(42);
    const log = dialLog([exactRound({ radio: 7, nav: 8, plant: 5 })]);
    const result = evaluateNomination({
      roundIndex: 1,
      voteState: 7,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(result.pendingCall).toEqual({ caller: 'sonar', nominated: 'nav' });
    expect(result.voteState).toBe(7);
  });

  it('frames a crew seat below 0.12 and stays silent at or above 0.12', () => {
    const cell = assignCell(42);
    const log = dialLog([exactRound({ plant: 7 }), exactRound(), exactRound()]);
    const framed = evaluateNomination({
      roundIndex: 1,
      voteState: 7,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(framed.pendingCall).toEqual({ caller: 'radio', nominated: 'plant' });
    expect(framed.voteState).toBe(1831565820);
    const silent = evaluateNomination({
      roundIndex: 1,
      voteState: 1887305771,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(silent.pendingCall).toBeNull();
    expect(silent.voteState).toBe(-576095712);
  });
});

describe('fillBallots', () => {
  it('ignores a crew draw below 0.08 and lets a saboteur self-vote', () => {
    const cell = assignCell(42);
    const suspicion = {} as Record<BaySeatId, number>;
    for (const seat of BAY_SEATS) suspicion[seat] = 0;
    const filled = fillBallots({
      voteState: 7,
      living: [...BAY_SEATS],
      controllers: soloControllers(),
      roles: cell.roles,
      suspicion,
      humanVotes: { helm: 'skip' },
    });
    expect(filled.voteState).toBe(-63941190);
    expect(filled.ballots.find((ballot) => ballot.voter === 'sonar')?.choice).toBe('skip');
    expect(filled.ballots.find((ballot) => ballot.voter === 'radio')?.choice).toBe('radio');
    expect(filled.ballots.find((ballot) => ballot.voter === 'nav')?.choice).not.toBe('radio');
    expect(filled.ballots.find((ballot) => ballot.voter === 'deck')?.choice).not.toBe('radio');
    expect(filled.ballots.map((ballot) => ballot.voter)).toEqual([...BAY_SEATS]);
  });
});
