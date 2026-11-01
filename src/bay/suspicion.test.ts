import { describe, expect, it } from 'vitest';
import { fingerprint, truthAnswer } from './fingerprint';
import { evaluateNomination, fillBallots } from './nominate';
import { generatePuzzle } from './puzzles';
import { assignCell, soloControllers } from './roles';
import { leanMark, nameTarget, suspicionScores } from './suspicion';
import {
  BAY_SEATS,
  INSTRUMENT,
  type BaySeatId,
  type CellLean,
  type CheckInRecord,
  type ChoiceLabel,
  type NumberPuzzle,
  type Puzzle,
} from './types';

function numberCard(lean: CellLean): NumberPuzzle {
  const step = 8;
  const trap = 9;
  const near = lean === 'step' ? step : trap;
  const anti = lean === 'step' ? trap : step;
  const tagged = [
    { value: 7, role: 'true' as const },
    { value: near, role: 'near' as const },
    { value: anti, role: 'anti' as const },
    { value: 1, role: 'far' as const },
    { value: 20, role: 'far' as const },
  ];
  const labels: ChoiceLabel[] = ['A', 'B', 'C', 'D', 'E'];
  return {
    kind: 'number',
    id: 'number-medium-01',
    difficulty: 'medium',
    prompt: '1 + 2 × 3',
    options: tagged.map((entry, index) => ({
      label: labels[index],
      value: entry.value,
      role: entry.role,
    })) as NumberPuzzle['options'],
    truth: 7,
    step,
    trap,
    near: [near],
    blatant: [anti, 1, 20].sort((left, right) => left - right),
  };
}

function numberLog(rounds: Array<Record<BaySeatId, number>>, lean: CellLean): CheckInRecord[] {
  return rounds.map((values, roundIndex) => {
    const puzzle = numberCard(lean);
    return {
      roundIndex,
      puzzle,
      integrityBefore: 4200,
      integrityAfter: 4200,
      row: 'split' as const,
      delta: -200,
      rows: BAY_SEATS.map((seat) => ({
        seat,
        absent: false as const,
        answer: { kind: 'number' as const, value: values[seat] },
        fingerprint: fingerprint(puzzle, { kind: 'number', value: values[seat] }, INSTRUMENT[seat]),
      })),
    };
  });
}

function exactRound(overrides: Partial<Record<BaySeatId, number>> = {}): Record<BaySeatId, number> {
  const values = {} as Record<BaySeatId, number>;
  for (const seat of BAY_SEATS) values[seat] = overrides[seat] ?? 7;
  return values;
}

function findCard(kind: Puzzle['kind']): Puzzle {
  for (let seed = 0; seed < 20; seed += 1) {
    for (let round = 0; round < 12; round += 1) {
      const card = generatePuzzle(seed, round, 'step');
      if (card.kind === kind) return card;
    }
  }
  throw new Error(kind);
}

describe('leanMark', () => {
  it('marks truth + 1 and the trap, including a blatant anti-lean value', () => {
    const step = numberCard('step');
    const trap = numberCard('trap');
    expect(leanMark(step, { kind: 'number', value: 7 })).toBeNull();
    expect(leanMark(step, { kind: 'number', value: 8 })).toBe(1);
    expect(leanMark(step, { kind: 'number', value: 9 })).toBe(-1);
    expect(leanMark(step, { kind: 'number', value: 1 })).toBeNull();
    expect(leanMark(trap, { kind: 'number', value: 8 })).toBe(1);
    expect(fingerprint(trap, { kind: 'number', value: 8 }, 'INST-1')).toMatchObject({
      errorClass: 'blatant',
      distance: 2,
    });
    expect(leanMark(findCard('fact'), truthAnswer(findCard('fact')))).toBeNull();
    expect(leanMark(findCard('odd'), truthAnswer(findCard('odd')))).toBeNull();
  });
});

describe('suspicion', () => {
  it('mixes miss weight 3:1 and lets the modal mark match the anti-lean submissions', () => {
    const log = numberLog([exactRound({ nav: 8, deck: 8, plant: 9 })], 'trap');
    const scores = suspicionScores(log);
    expect(scores.nav).toBeCloseTo(1, 10);
    expect(scores.deck).toBeCloseTo(1, 10);
    expect(scores.plant).toBeCloseTo(0.4125, 10);
    expect(scores.sonar).toBe(0);
    const roles = assignCell(42).roles;
    expect(
      nameTarget({ viewer: 'sonar', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'others' }),
    ).toBe('nav');
    expect(
      nameTarget({ viewer: 'radio', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'crew' }),
    ).toBe('plant');
    expect(
      nameTarget({ viewer: 'radio', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'crew' }),
    ).not.toBe('nav');
    expect(
      nameTarget({ viewer: 'radio', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'crew' }),
    ).not.toBe('deck');
    const tied = suspicionScores(numberLog([exactRound({ sonar: 8, radio: 8 })], 'trap'));
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

  it('puts one marked near spread over three rounds in the frame band', () => {
    const log = numberLog([exactRound({ plant: 8 }), exactRound(), exactRound()], 'step');
    expect(suspicionScores(log).plant).toBeCloseTo(0.3875, 10);
  });
});

describe('evaluateNomination', () => {
  it('draws the frame roll on round 1 when nobody calls', () => {
    const cell = assignCell(42);
    const result = evaluateNomination({
      roundIndex: 0,
      voteState: 1887305771,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log: [],
    });
    expect(result.voteState).not.toBe(1887305771);
  });

  it('lets the earliest crew AI call without consuming the frame draw', () => {
    const cell = assignCell(42);
    const log = numberLog([exactRound({ nav: 8, deck: 8, plant: 9 })], 'trap');
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
    const log = numberLog([exactRound({ plant: 8 }), exactRound(), exactRound()], 'step');
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

  it('never lets a saboteur name a partner', () => {
    const cell = assignCell(42);
    const suspicion = {} as Record<BaySeatId, number>;
    for (const seat of BAY_SEATS) suspicion[seat] = seat === 'nav' || seat === 'deck' ? 1 : seat === 'plant' ? 0.5 : 0;
    const filled = fillBallots({
      voteState: 1,
      living: [...BAY_SEATS],
      controllers: soloControllers(),
      roles: cell.roles,
      suspicion,
      humanVotes: { helm: 'skip' },
    });
    for (const ballot of filled.ballots) {
      if (cell.roles[ballot.voter] !== 'saboteur' || ballot.choice === 'skip') continue;
      if (ballot.choice === ballot.voter) continue;
      expect(cell.roles[ballot.choice]).toBe('crew');
    }
  });
});
