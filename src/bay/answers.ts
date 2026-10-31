import { intBetween, rngStep } from '../game/rng';
import { CREW_EXACT_BELOW, CREW_NEAR_BELOW } from './constants';
import { blatantAnswers, nearAnswers, truthAnswer } from './fingerprint';
import { posturesFor } from './plan';
import { livingSeats } from './roles';
import {
  BAY_SEATS,
  type BayAnswer,
  type BaySeatId,
  type Cell,
  type Controller,
  type Posture,
  type Puzzle,
} from './types';

export function crewPosture(draw: number): Posture {
  if (draw < CREW_EXACT_BELOW) return 'honest';
  if (draw < CREW_NEAR_BELOW) return 'near-miss';
  return 'blatant';
}

function consumeIgnoredDraw(state: number): number {
  return rngStep(state).state;
}

function fromList(answers: BayAnswer[], index: number): BayAnswer {
  const answer = answers[index];
  if (!answer) throw new Error('Answer list index is out of range.');
  return answer;
}

export function fillAiAnswers(input: {
  puzzle: Puzzle;
  cell: Cell;
  roundIndex: number;
  ejected: readonly BaySeatId[];
  controllers: Record<BaySeatId, Controller>;
  checkInState: number;
}): {
  prepared: Partial<Record<BaySeatId, BayAnswer>>;
  plan: { draw: number; postures: Partial<Record<BaySeatId, Posture>> };
  checkInState: number;
} {
  const living = livingSeats(input.ejected);
  const livingSaboteurs = living.filter((seat) => input.cell.roles[seat] === 'saboteur');
  let state = input.checkInState;
  const planRoll = rngStep(state);
  state = planRoll.state;
  const postures = posturesFor(planRoll.value, livingSaboteurs, input.roundIndex);
  const prepared: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai') continue;
    const first = rngStep(state);
    state = first.state;
    if (input.cell.roles[seat] === 'crew') {
      const posture = crewPosture(first.value);
      if (posture === 'honest') {
        prepared[seat] = truthAnswer(input.puzzle);
        state = consumeIgnoredDraw(state);
      } else if (posture === 'near-miss') {
        const near = nearAnswers(input.puzzle);
        const rolled = intBetween(state, 0, near.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(near, rolled.value);
      } else {
        const blatant = blatantAnswers(input.puzzle);
        const rolled = intBetween(state, 0, blatant.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(blatant, rolled.value);
      }
    } else {
      const posture = postures[seat];
      if (posture === 'blatant') {
        const blatant = blatantAnswers(input.puzzle);
        const rolled = intBetween(state, 0, blatant.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(blatant, rolled.value);
      } else if (posture === 'near-miss') {
        const near = nearAnswers(input.puzzle);
        prepared[seat] = fromList(near, 0);
        state = consumeIgnoredDraw(state);
      } else {
        prepared[seat] = truthAnswer(input.puzzle);
        state = consumeIgnoredDraw(state);
      }
    }
  }
  return {
    prepared,
    plan: { draw: planRoll.value, postures },
    checkInState: state,
  };
}
