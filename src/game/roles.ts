import { rngStep } from './rng';
import { SEATS, type SeatId } from './types';

export type Role = 'crew' | 'saboteur';

/** Independent of the signal stream so a seed still replays the same sea. */
export function assignSaboteur(seed: number): SeatId {
  const rolled = rngStep((seed ^ 0xa5a5a5a5) >>> 0);
  const index = Math.min(SEATS.length - 1, Math.floor(rolled.value * SEATS.length));
  return SEATS[index];
}

export function rolesFor(saboteur: SeatId): Record<SeatId, Role> {
  const roles = {} as Record<SeatId, Role>;
  for (const seat of SEATS) roles[seat] = seat === saboteur ? 'saboteur' : 'crew';
  return roles;
}

export function livingSeats(ejected: readonly SeatId[]): SeatId[] {
  const gone = new Set(ejected);
  return SEATS.filter((seat) => !gone.has(seat));
}
