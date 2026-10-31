import { describe, expect, it } from 'vitest';
import { generatePuzzle } from '../puzzles';
import type { Puzzle, RoleView } from '../types';
import { promptFacts, roleBannerText } from './prompt';

function findCard(kind: Puzzle['kind']): Puzzle {
  for (let seed = 0; seed < 30; seed += 1) {
    for (let round = 0; round < 12; round += 1) {
      const card = generatePuzzle(seed, round, 'trap');
      if (card.kind === kind) return card;
    }
  }
  throw new Error(kind);
}

const NEAR: RoleView = {
  role: 'saboteur',
  partners: ['nav', 'deck'],
  lean: 'step',
  plan: 'near-miss',
  choice: 'choice B',
};

describe('promptFacts', () => {
  it('publishes one prompt and the labeled choices for each kind', () => {
    const fact = findCard('fact');
    const number = findCard('number');
    const odd = findCard('odd');
    expect(fact.kind).toBe('fact');
    expect(number.kind).toBe('number');
    expect(odd.kind).toBe('odd');
    if (fact.kind !== 'fact' || number.kind !== 'number' || odd.kind !== 'odd') return;
    const factLines = promptFacts(fact);
    const numberLines = promptFacts(number);
    const oddLines = promptFacts(odd);
    expect(factLines).toEqual({
      kind: 'fact',
      lines: [fact.prompt, ...fact.options.map((option) => `${option.label} ${option.text}`)],
    });
    expect(numberLines).toEqual({
      kind: 'number',
      lines: [number.prompt, ...number.options.map((option) => `${option.label} ${option.value}`)],
    });
    expect(oddLines).toEqual({
      kind: 'odd',
      lines: [odd.prompt, ...odd.options.map((option) => `${option.index} ${option.text}`)],
    });
    const published = [factLines, numberLines, oddLines].map((entry) => entry.lines.join('\n')).join('\n');
    expect(published).not.toContain(fact.id);
    expect(published).not.toContain(number.id);
    expect(published).not.toContain(odd.id);
    expect(published).not.toMatch(/stepNote|trapNote/);
  });
});

describe('role banner', () => {
  it('names choice B only for a near-miss plan', () => {
    expect(roleBannerText(NEAR, false)).toContain('choice B');
    expect(roleBannerText(NEAR, false)).toContain('off-by-one');
    expect(roleBannerText({ ...NEAR, plan: 'honest', choice: null }, false)).not.toContain('choice B');
    expect(roleBannerText({ ...NEAR, lean: 'trap', plan: 'blatant', choice: 'choice B' }, false)).not.toContain('choice B');
    expect(roleBannerText({ ...NEAR, lean: 'trap', plan: 'honest', choice: null }, false)).toContain('wrong rule');
  });
});
