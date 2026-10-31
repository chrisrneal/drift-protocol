import { intBetween } from '../game/rng';
import { ROLE_STREAM_MASK } from './constants';
import {
  BAY_SEATS,
  type BaySeatId,
  type Cell,
  type CellSign,
  type Controller,
  type Posture,
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
  const signRoll = intBetween(state, 0, 1);
  const sign: CellSign = signRoll.value === 0 ? -1 : 1;
  const roles = {} as Record<BaySeatId, Role>;
  for (const seat of BAY_SEATS) roles[seat] = drawn.has(seat) ? 'saboteur' : 'crew';
  return { saboteurs: [saboteurs[0], saboteurs[1], saboteurs[2]], sign, roles };
}

export function soloControllers(): Record<BaySeatId, Controller> {
  const controllers = {} as Record<BaySeatId, Controller>;
  for (const seat of BAY_SEATS) controllers[seat] = seat === 'helm' ? 'human' : 'ai';
  return controllers;
}

export function viewFor(seat: BaySeatId, cell: Cell, plan: Posture | null): RoleView {
  if (cell.roles[seat] === 'crew') return { role: 'crew' };
  return {
    role: 'saboteur',
    partners: cell.saboteurs.filter((other) => other !== seat),
    sign: cell.sign,
    plan,
  };
}

export function livingSeats(ejected: readonly BaySeatId[]): BaySeatId[] {
  const gone = new Set(ejected);
  return BAY_SEATS.filter((seat) => !gone.has(seat));
}
