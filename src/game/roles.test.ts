import { describe, expect, it } from 'vitest';
import { AI_SEATS, SEATS } from './types';
import { assignSaboteur, livingSeats, rolesFor } from './roles';

describe('role assignment', () => {
  it('seats exactly one saboteur and makes everyone else crew', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const saboteur = assignSaboteur(seed);
      const roles = rolesFor(saboteur);
      expect(SEATS).toContain(saboteur);
      expect(SEATS.filter((seat) => roles[seat] === 'saboteur')).toEqual([saboteur]);
      expect(SEATS.filter((seat) => roles[seat] === 'crew')).toHaveLength(3);
    }
  });

  it('gives every AI crew when the human is the saboteur', () => {
    const humanSaboteurSeeds = [];
    for (let seed = 0; seed < 80; seed += 1) {
      if (assignSaboteur(seed) === 'you') humanSaboteurSeeds.push(seed);
    }
    expect(humanSaboteurSeeds.length).toBeGreaterThan(0);
    for (const seed of humanSaboteurSeeds) {
      const roles = rolesFor(assignSaboteur(seed));
      expect(roles.you).toBe('saboteur');
      for (const seat of AI_SEATS) expect(roles[seat]).toBe('crew');
    }
  });

  it('picks exactly one random AI saboteur when the human is crew', () => {
    const humanCrewSeeds = [];
    for (let seed = 0; seed < 80; seed += 1) {
      if (assignSaboteur(seed) !== 'you') humanCrewSeeds.push(seed);
    }
    expect(humanCrewSeeds.length).toBeGreaterThan(0);
    const saboteurs = new Set<string>();
    for (const seed of humanCrewSeeds) {
      const saboteur = assignSaboteur(seed);
      saboteurs.add(saboteur);
      const roles = rolesFor(saboteur);
      expect(roles.you).toBe('crew');
      expect(AI_SEATS.filter((seat) => roles[seat] === 'saboteur')).toEqual([saboteur]);
    }
    expect(saboteurs.size).toBeGreaterThan(1);
  });

  it('is deterministic for a seed', () => {
    expect(assignSaboteur(42)).toBe(assignSaboteur(42));
  });

  it('lists living seats without the ejected ones, in seat order', () => {
    expect(livingSeats([])).toEqual(['you', 'skeptic', 'pattern', 'explorer']);
    expect(livingSeats(['pattern'])).toEqual(['you', 'skeptic', 'explorer']);
    expect(livingSeats(['you', 'explorer'])).toEqual(['skeptic', 'pattern']);
  });
});
