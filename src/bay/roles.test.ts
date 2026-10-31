import { describe, expect, it } from 'vitest';
import { assignCell, livingSeats, soloControllers, viewFor } from './roles';
import { BAY_SEATS } from './types';

describe('assignCell', () => {
  it('draws the locked trios and signs for known seeds', () => {
    expect(assignCell(0)).toMatchObject({ saboteurs: ['radio', 'nav', 'medic'], sign: 1 });
    expect(assignCell(6)).toMatchObject({ saboteurs: ['helm', 'sonar', 'plant'], sign: 1 });
    expect(assignCell(7)).toMatchObject({ saboteurs: ['radio', 'plant', 'cargo'], sign: -1 });
    expect(assignCell(11)).toMatchObject({ saboteurs: ['helm', 'plant', 'deck'], sign: -1 });
    expect(assignCell(42)).toMatchObject({ saboteurs: ['radio', 'nav', 'deck'], sign: 1 });
    expect(assignCell(42)).toEqual(assignCell(42));
  });

  it('marks exactly those three seats as saboteurs and the other five as crew', () => {
    const cell = assignCell(42);
    expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'saboteur')).toEqual([
      'radio',
      'nav',
      'deck',
    ]);
    expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'crew')).toEqual([
      'helm',
      'sonar',
      'plant',
      'medic',
      'cargo',
    ]);
  });

  it('reaches every trio once and stays near a uniform count across 56000 seeds', () => {
    const counts = new Map<string, number>();
    let helmSaboteurs = 0;
    let plus = 0;
    let minus = 0;
    for (let seed = 0; seed < 56000; seed += 1) {
      const cell = assignCell(seed);
      expect(cell.saboteurs).toHaveLength(3);
      counts.set(cell.saboteurs.join(','), (counts.get(cell.saboteurs.join(',')) ?? 0) + 1);
      if (cell.saboteurs.includes('helm')) helmSaboteurs += 1;
      if (cell.sign === 1) plus += 1;
      else minus += 1;
      expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'saboteur')).toEqual([...cell.saboteurs]);
    }
    expect(counts.size).toBe(56);
    expect(helmSaboteurs).toBe(21062);
    expect(plus).toBe(27700);
    expect(minus).toBe(28300);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(900);
      expect(count).toBeLessThanOrEqual(1100);
    }
  });
});

describe('visibility', () => {
  it('shows a crew seat only its own role', () => {
    const cell = assignCell(42);
    const view = viewFor('helm', cell, 'near-miss');
    expect(view).toEqual({ role: 'crew' });
    expect(Object.keys(view)).toEqual(['role']);
  });

  it('shows a saboteur the other two ids in roster order, the sign, and that seat plan', () => {
    const cell = assignCell(42);
    expect(viewFor('radio', cell, 'near-miss')).toEqual({
      role: 'saboteur',
      partners: ['nav', 'deck'],
      sign: 1,
      plan: 'near-miss',
    });
    expect(viewFor('nav', cell, null)).toEqual({
      role: 'saboteur',
      partners: ['radio', 'deck'],
      sign: 1,
      plan: null,
    });
    expect(viewFor('deck', cell, 'honest')).toEqual({
      role: 'saboteur',
      partners: ['radio', 'nav'],
      sign: 1,
      plan: 'honest',
    });
  });
});

describe('solo controllers', () => {
  it('makes Helm the only human', () => {
    const controllers = soloControllers();
    expect(controllers.helm).toBe('human');
    for (const seat of BAY_SEATS) {
      if (seat !== 'helm') expect(controllers[seat]).toBe('ai');
    }
  });
});

describe('livingSeats', () => {
  it('keeps roster order and drops ejected seats', () => {
    expect(livingSeats([])).toEqual([...BAY_SEATS]);
    expect(livingSeats(['radio', 'helm'])).toEqual([
      'sonar',
      'nav',
      'plant',
      'deck',
      'medic',
      'cargo',
    ]);
  });
});
