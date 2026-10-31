import { describe, expect, it } from 'vitest';
import { FACT_BANK } from './bank/facts';
import { NUMBER_BANK } from './bank/numbers';
import { ODD_BANK } from './bank/odd';
import { generatePuzzle } from './puzzles';
import type { CellLean, Puzzle } from './types';

const LEANS: CellLean[] = ['step', 'trap'];

function findRound(kind: Puzzle['kind'], seed = 42): number {
  for (let round = 0; round < 12; round += 1) {
    if (generatePuzzle(seed, round, 'step').kind === kind) return round;
  }
  for (let nextSeed = 0; nextSeed < 40; nextSeed += 1) {
    for (let round = 0; round < 12; round += 1) {
      if (generatePuzzle(nextSeed, round, 'step').kind === kind) return round;
    }
  }
  throw new Error(`No ${kind} card.`);
}

function findSeed(kind: Puzzle['kind']): { seed: number; round: number } {
  for (let seed = 0; seed < 40; seed += 1) {
    for (let round = 0; round < 12; round += 1) {
      if (generatePuzzle(seed, round, 'step').kind === kind) return { seed, round };
    }
  }
  throw new Error(`No ${kind} card.`);
}

describe('quiz generator', () => {
  it('deals twelve distinct bank ids and cycles difficulty', () => {
    for (const seed of [0, 1, 42, 99, 1000]) {
      for (const lean of LEANS) {
        const cards = Array.from({ length: 12 }, (_, round) => generatePuzzle(seed, round, lean));
        expect(new Set(cards.map((card) => card.id)).size).toBe(12);
        cards.forEach((card, round) => {
          expect(card.difficulty).toBe(['easy', 'medium', 'harder'][round % 3]);
        });
      }
    }
  });

  it('keeps a fact card when the lean flips', () => {
    const found = findSeed('fact');
    expect(generatePuzzle(found.seed, found.round, 'step')).toEqual(generatePuzzle(found.seed, found.round, 'trap'));
  });

  it('flips a number card near key with the lean and keeps the item id', () => {
    const found = findSeed('number');
    const step = generatePuzzle(found.seed, found.round, 'step');
    const trap = generatePuzzle(found.seed, found.round, 'trap');
    expect(step.kind).toBe('number');
    expect(trap.kind).toBe('number');
    if (step.kind !== 'number' || trap.kind !== 'number') return;
    expect(step.id).toBe(trap.id);
    expect(step.prompt).toBe(trap.prompt);
    expect(step.near).not.toEqual(trap.near);
    expect(step.near[0] === step.step || step.near[0] === step.trap).toBe(true);
    expect(new Set(step.options.map((option) => option.value))).toEqual(new Set(trap.options.map((option) => option.value)));
    expect(step.blatant).toEqual([...step.blatant].sort((left, right) => left - right));
    const item = NUMBER_BANK.find((entry) => entry.id === step.id);
    expect(item?.prompt).toBe(step.prompt);
  });

  it('swaps which odd-one-out almost-misfit is shown', () => {
    const found = findSeed('odd');
    const step = generatePuzzle(found.seed, found.round, 'step');
    const trap = generatePuzzle(found.seed, found.round, 'trap');
    expect(step.kind).toBe('odd');
    expect(trap.kind).toBe('odd');
    if (step.kind !== 'odd' || trap.kind !== 'odd') return;
    expect(step.id).toBe(trap.id);
    const stepNear = step.options.find((option) => option.role === 'near');
    const trapNear = trap.options.find((option) => option.role === 'near');
    expect(stepNear?.text).not.toBe(trapNear?.text);
    expect(step.options.map((option) => option.text)).not.toContain(trapNear?.text);
    expect(trap.options.map((option) => option.text)).not.toContain(stepNear?.text);
    expect(step.blatant).toEqual([...step.blatant].sort((left, right) => left - right));
    const item = ODD_BANK.find((entry) => entry.id === step.id);
    expect(stepNear?.text).toBe(item?.step);
    expect(trapNear?.text).toBe(item?.trap);
  });

  it('rebuilds round 5 from its own reseed', () => {
    const alone = generatePuzzle(99, 5, 'step');
    const walked = Array.from({ length: 6 }, (_, round) => generatePuzzle(99, round, 'step'))[5];
    expect(alone).toEqual(walked);
    expect(generatePuzzle(99, 5, 'step')).toEqual(alone);
    expect(findRound('fact')).toBeGreaterThanOrEqual(0);
  });

  it('rejects a round index outside 0 through 11', () => {
    expect(() => generatePuzzle(1, -1, 'step')).toThrow(/0 through 11/);
    expect(() => generatePuzzle(1, 12, 'step')).toThrow(/0 through 11/);
    expect(() => generatePuzzle(1, 1.5, 'trap')).toThrow(/integer/);
  });

  it('shuffles fact choices from the bank item and lists far labels from A to E', () => {
    const found = findSeed('fact');
    const card = generatePuzzle(found.seed, found.round, 'trap');
    expect(card.kind).toBe('fact');
    if (card.kind !== 'fact') return;
    const item = FACT_BANK.find((entry) => entry.id === card.id);
    expect(new Set(card.options.map((option) => option.text))).toEqual(new Set([item?.truth, item?.near, ...(item?.fars ?? [])]));
    const order = 'ABCDE';
    const indexes = card.blatant.map((label) => order.indexOf(label));
    expect(indexes).toEqual([...indexes].sort((left, right) => left - right));
    expect(card.near).toHaveLength(1);
    expect(card.blatant).toHaveLength(3);
  });
});
