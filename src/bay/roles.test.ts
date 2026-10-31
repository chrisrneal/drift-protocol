import { describe, expect, it } from 'vitest';
import { nearChoiceLabel } from './fingerprint';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats, soloControllers, viewFor } from './roles';
import { BAY_SEATS } from './types';

describe('assignCell', () => {
  it('draws the locked trios and leans for known seeds', () => {
    expect(assignCell(0)).toMatchObject({ saboteurs: ['radio', 'nav', 'medic'], lean: 'trap' });
    expect(assignCell(6)).toMatchObject({ saboteurs: ['helm', 'sonar', 'plant'], lean: 'trap' });
    expect(assignCell(7)).toMatchObject({ saboteurs: ['radio', 'plant', 'cargo'], lean: 'step' });
    expect(assignCell(11)).toMatchObject({ saboteurs: ['helm', 'plant', 'deck'], lean: 'step' });
    expect(assignCell(42)).toMatchObject({ saboteurs: ['radio', 'nav', 'deck'], lean: 'trap' });
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
    let step = 0;
    let trap = 0;
    for (let seed = 0; seed < 56000; seed += 1) {
      const cell = assignCell(seed);
      expect(cell.saboteurs).toHaveLength(3);
      counts.set(cell.saboteurs.join(','), (counts.get(cell.saboteurs.join(',')) ?? 0) + 1);
      if (cell.saboteurs.includes('helm')) helmSaboteurs += 1;
      if (cell.lean === 'step') step += 1;
      else trap += 1;
      expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'saboteur')).toEqual([...cell.saboteurs]);
    }
    expect(counts.size).toBe(56);
    expect(helmSaboteurs).toBe(21062);
    expect(step).toBe(28300);
    expect(trap).toBe(27700);
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

  it('shows a saboteur the other two ids, the lean, and a near-miss choice that is not the truth', () => {
    const cell = assignCell(42);
    const puzzle = generatePuzzle(42, 0, cell.lean);
    const near = viewFor('radio', cell, 'near-miss', puzzle);
    expect(near).toEqual({
      role: 'saboteur',
      partners: ['nav', 'deck'],
      lean: 'trap',
      plan: 'near-miss',
      choice: nearChoiceLabel(puzzle),
    });
    expect(near).not.toHaveProperty('truth');
    if (near.role === 'saboteur') {
      const truthLabel = puzzle.kind === 'odd' ? `item ${puzzle.truth}` : `choice ${puzzle.kind === 'fact' ? puzzle.truth : ''}`;
      if (puzzle.kind === 'fact' || puzzle.kind === 'odd') expect(near.choice).not.toBe(truthLabel);
    }
    expect(viewFor('nav', cell, null)).toEqual({
      role: 'saboteur',
      partners: ['radio', 'deck'],
      lean: 'trap',
      plan: null,
      choice: null,
    });
    expect(viewFor('deck', cell, 'honest', puzzle)).toEqual({
      role: 'saboteur',
      partners: ['radio', 'nav'],
      lean: 'trap',
      plan: 'honest',
      choice: null,
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
