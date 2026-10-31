import { describe, expect, it } from 'vitest';
import { crewPosture, fillAiAnswers } from './answers';
import { signedNearAnswer, truthAnswer } from './fingerprint';
import { advance, createBaySession, submitHumans } from './session';
import type { BaySession } from './types';

function detent(session: BaySession, seat: 'sonar' | 'radio' | 'nav' | 'plant' | 'deck' | 'medic' | 'cargo'): number {
  const answer = session.prepared[seat];
  if (!answer || answer.kind !== 'dial') throw new Error(`Expected a dial answer for ${seat}.`);
  return answer.detent;
}

describe('crewPosture', () => {
  it('cuts the unit draw at 0.82 and 0.97', () => {
    expect(crewPosture(0)).toBe('honest');
    expect(crewPosture(0.82)).toBe('near-miss');
    expect(crewPosture(0.82 - Number.EPSILON)).toBe('honest');
    expect(crewPosture(0.97)).toBe('blatant');
    expect(crewPosture(0.97 - Number.EPSILON)).toBe('near-miss');
  });
});

describe('fillAiAnswers', () => {
  it('locks seed 42 round 0 and does not read Helm', () => {
    const left = createBaySession({ rounds: 8, seed: 42 });
    const right = createBaySession({ rounds: 8, seed: 42 });
    expect(left.plan?.postures).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'honest' });
    expect(detent(left, 'sonar')).toBe(10);
    expect(detent(left, 'radio')).toBe(11);
    expect(detent(left, 'nav')).toBe(10);
    expect(detent(left, 'plant')).toBe(10);
    expect(detent(left, 'deck')).toBe(10);
    expect(detent(left, 'medic')).toBe(10);
    expect(detent(left, 'cargo')).toBe(10);
    expect(left.prepared.helm).toBeUndefined();
    const honest = submitHumans(left, { helm: { kind: 'dial', detent: 10 } });
    const other = submitHumans(right, { helm: { kind: 'dial', detent: 0 } });
    expect(honest.prepared).toEqual(other.prepared);
    const honestRadio = honest.log[0].rows.find((row) => row.seat === 'radio');
    const otherRadio = other.log[0].rows.find((row) => row.seat === 'radio');
    expect(honestRadio).toEqual(otherRadio);
  });

  it('keeps the cell on one sign on seed 42 round 1', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
    session = advance(session);
    expect(session.roundIndex).toBe(1);
    expect(session.cell.sign).toBe(1);
    expect(session.plan?.postures).toEqual({ radio: 'honest', nav: 'near-miss', deck: 'near-miss' });
    expect(detent(session, 'nav')).toBe(2);
    expect(detent(session, 'deck')).toBe(2);
    expect(detent(session, 'radio')).toBe(1);
    expect(signedNearAnswer(session.puzzle, 1)).toEqual({ kind: 'dial', detent: 2 });
  });

  it('lets a crew near-miss land on the neighbor the cell did not pick', () => {
    const opened = createBaySession({ rounds: 10, seed: 0 });
    expect(opened.puzzle.kind).toBe('dial');
    if (opened.puzzle.kind === 'dial') expect(opened.puzzle.truth).toBe(8);
    expect(opened.prepared.cargo).toEqual({ kind: 'dial', detent: 6 });
    let session = opened;
    for (let round = 0; round < 2; round += 1) {
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      session = advance(session);
    }
    expect(session.roundIndex).toBe(2);
    expect(session.puzzle.kind).toBe('dial');
    if (session.puzzle.kind === 'dial') expect(session.puzzle.truth).toBe(4);
    expect(session.prepared.sonar).toEqual({ kind: 'dial', detent: 3 });
    expect(session.cell.sign).toBe(1);
    expect(signedNearAnswer(session.puzzle, 1)).toEqual({ kind: 'dial', detent: 5 });
  });

  it('posts a plan for a saboteur Helm and does not draw Helm an answer', () => {
    const session = createBaySession({ rounds: 8, seed: 23 });
    expect(session.cell.roles.helm).toBe('saboteur');
    expect(session.cell.sign).toBe(-1);
    expect(session.plan?.postures).toEqual({ helm: 'near-miss', deck: 'near-miss', medic: 'near-miss' });
    expect(session.prepared.helm).toBeUndefined();
    expect(session.prepared.deck).toEqual(signedNearAnswer(session.puzzle, -1));
    expect(session.prepared.medic).toEqual(session.prepared.deck);
  });
});

describe('fillAiAnswers is reachable without a session', () => {
  it('returns the same prepared map the session stored', () => {
    const session = createBaySession({ rounds: 8, seed: 42 });
    const filled = fillAiAnswers({
      puzzle: session.puzzle,
      cell: session.cell,
      roundIndex: 0,
      ejected: [],
      controllers: session.controllers,
      checkInState: 203342640,
    });
    expect(filled.prepared).toEqual(session.prepared);
    expect(filled.plan.postures).toEqual(session.plan?.postures);
  });
});
