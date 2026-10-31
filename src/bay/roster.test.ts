import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUNDS,
  DELTA_ALIGNED,
  DELTA_FALSE_CONSENSUS,
  DELTA_NEAR_CLUSTER,
  DELTA_SPLIT,
  INTEGRITY_CREW,
  INTEGRITY_MAX,
  INTEGRITY_MIN,
  INTEGRITY_SABOTEUR_BELOW,
  INTEGRITY_START,
  MAX_ROUNDS,
  MIN_ROUNDS,
  NOTES_MAX,
} from './constants';
import { BAY_SEATS, INSTRUMENT, SEAT_NAME } from './types';

describe('bay roster', () => {
  it('lists eight seats in roster order with fixed instruments and names', () => {
    expect(BAY_SEATS).toEqual(['helm', 'sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo']);
    expect(SEAT_NAME.helm).toBe('Helm');
    expect(SEAT_NAME.sonar).toBe('Sonar');
    expect(SEAT_NAME.radio).toBe('Radio');
    expect(SEAT_NAME.nav).toBe('Nav');
    expect(SEAT_NAME.plant).toBe('Plant');
    expect(SEAT_NAME.deck).toBe('Deck');
    expect(SEAT_NAME.medic).toBe('Medic');
    expect(SEAT_NAME.cargo).toBe('Cargo');
    expect(BAY_SEATS.map((seat) => INSTRUMENT[seat])).toEqual([
      'INST-1',
      'INST-2',
      'INST-3',
      'INST-4',
      'INST-5',
      'INST-6',
      'INST-7',
      'INST-8',
    ]);
  });

  it('locks the watch length and the integrity scale', () => {
    expect(MIN_ROUNDS).toBe(8);
    expect(MAX_ROUNDS).toBe(12);
    expect(DEFAULT_ROUNDS).toBe(10);
    expect(NOTES_MAX).toBe(2000);
    expect(INTEGRITY_START).toBe(4200);
    expect(INTEGRITY_MIN).toBe(200);
    expect(INTEGRITY_MAX).toBe(9800);
    expect(INTEGRITY_CREW).toBe(7000);
    expect(INTEGRITY_SABOTEUR_BELOW).toBe(5500);
    expect(DELTA_ALIGNED).toBe(400);
    expect(DELTA_FALSE_CONSENSUS).toBe(-450);
    expect(DELTA_NEAR_CLUSTER).toBe(-350);
    expect(DELTA_SPLIT).toBe(-200);
  });
});
