import { intBetween } from '../game/rng';
import { nearChoiceLabel } from './fingerprint';
import { ROLE_STREAM_MASK } from './constants';
import {
  BAY_SEATS,
  type BaySeatId,
  type Cell,
  type CellLean,
  type Controller,
  type Posture,
  type Puzzle,
  type Role,
  type RoleView,
} from './types';

export function assignCell(seed: number): Cell {
  let state = (seed ^ ROLE_STREAM_MASK) >>> 0;
  const order: BaySeatId[] = [...BAY_SEATS];
  for (let index = 0; index < 3; index += 1) {
    const rolled = intBetween(state, index, BAY_SEATS.length - 1);
    state = rolled.state;
    const swap = rolled.value;
    const held = order[index];
    order[index] = order[swap];
    order[swap] = held;
  }
  const drawn = new Set(order.slice(0, 3));
  const saboteurs = BAY_SEATS.filter((seat) => drawn.has(seat));
  if (saboteurs.length !== 3) throw new Error('Role stream must draw three saboteurs.');
  const leanRoll = intBetween(state, 0, 1);
  const lean: CellLean = leanRoll.value === 0 ? 'step' : 'trap';
  const roles = {} as Record<BaySeatId, Role>;
  for (const seat of BAY_SEATS) roles[seat] = drawn.has(seat) ? 'saboteur' : 'crew';
  return { saboteurs: [saboteurs[0], saboteurs[1], saboteurs[2]], lean, roles };
}

export function soloControllers(): Record<BaySeatId, Controller> {
  const controllers = {} as Record<BaySeatId, Controller>;
  for (const seat of BAY_SEATS) controllers[seat] = seat === 'helm' ? 'human' : 'ai';
  return controllers;
}

export function viewFor(seat: BaySeatId, cell: Cell, plan: Posture | null, puzzle?: Puzzle): RoleView {
  if (cell.roles[seat] === 'crew') return { role: 'crew' };
  return {
    role: 'saboteur',
    partners: cell.saboteurs.filter((other) => other !== seat),
    lean: cell.lean,
    plan,
    choice: plan === 'near-miss' && puzzle ? nearChoiceLabel(puzzle) : null,
  };
}

export function livingSeats(ejected: readonly BaySeatId[]): BaySeatId[] {
  const gone = new Set(ejected);
  return BAY_SEATS.filter((seat) => !gone.has(seat));
}
