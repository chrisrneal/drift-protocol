import { describe, expect, it } from 'vitest';
import { rngStep } from '../game/rng';
import { crewPosture, fillAiAnswers } from './answers';
import { blatantAnswers, nearAnswers, truthAnswer } from './fingerprint';
import { advance, createBaySession, submitHumans } from './session';
import { BAY_SEATS } from './types';

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
    expect(left.cell.lean).toBe('trap');
    expect(left.plan?.postures).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'honest' });
    expect(left.checkInState).toBe(1907026059);
    for (const seat of ['sonar', 'nav', 'plant', 'deck', 'medic', 'cargo'] as const) {
      expect(left.prepared[seat]).toEqual(truthAnswer(left.puzzle));
    }
    expect(left.prepared.radio).toEqual(nearAnswers(left.puzzle)[0]);
    expect(left.prepared.helm).toBeUndefined();
    const blatant = blatantAnswers(right.puzzle)[0];
    if (!blatant) throw new Error('Missing blatant answer.');
    const honest = submitHumans(left, { helm: truthAnswer(left.puzzle) });
    const other = submitHumans(right, { helm: blatant });
    expect(honest.prepared).toEqual(other.prepared);
    const honestRadio = honest.log[0].rows.find((row) => row.seat === 'radio');
    const otherRadio = other.log[0].rows.find((row) => row.seat === 'radio');
    expect(honestRadio).toEqual(otherRadio);
  });

  it('keeps the cell on one lean and submits that near key', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
    session = advance(session);
    expect(session.roundIndex).toBe(1);
    expect(session.cell.lean).toBe('trap');
    expect(session.plan?.postures).toEqual({ radio: 'honest', nav: 'near-miss', deck: 'near-miss' });
    expect(session.prepared.nav).toEqual(nearAnswers(session.puzzle)[0]);
    expect(session.prepared.deck).toEqual(nearAnswers(session.puzzle)[0]);
    expect(session.prepared.radio).toEqual(truthAnswer(session.puzzle));
  });

  it('sends a crew near-miss to the card near key and still consumes the second draw', () => {
    const session = createBaySession({ rounds: 8, seed: 42 });
    let state: number | null = null;
    for (let cursor = 0; cursor < 200000; cursor += 1) {
      const plan = rngStep(cursor);
      if (plan.value >= 0.5) continue;
      const first = rngStep(plan.state);
      if (first.value >= 0.82 && first.value < 0.97) {
        state = cursor;
        break;
      }
    }
    expect(state).not.toBeNull();
    if (state === null) return;
    const filled = fillAiAnswers({
      puzzle: session.puzzle,
      cell: session.cell,
      roundIndex: 0,
      ejected: [],
      controllers: session.controllers,
      checkInState: state,
    });
    expect(filled.plan.postures.radio).toBe('honest');
    expect(filled.prepared.sonar).toEqual(nearAnswers(session.puzzle)[0]);
    let expected = state;
    expected = rngStep(expected).state;
    for (const seat of BAY_SEATS) {
      if (!['sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo'].includes(seat)) continue;
      expected = rngStep(expected).state;
      expected = rngStep(expected).state;
    }
    expect(filled.checkInState).toBe(expected);
  });

  it('posts a plan for a saboteur Helm and does not draw Helm an answer', () => {
    const session = createBaySession({ rounds: 8, seed: 23 });
    expect(session.cell.roles.helm).toBe('saboteur');
    expect(session.cell.lean).toBe('step');
    expect(session.plan?.postures).toEqual({ helm: 'near-miss', deck: 'near-miss', medic: 'near-miss' });
    expect(session.prepared.helm).toBeUndefined();
    expect(session.prepared.deck).toEqual(nearAnswers(session.puzzle)[0]);
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
