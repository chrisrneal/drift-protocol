import { describe, expect, it } from 'vitest';
import {
  blatantAnswers,
  canonicalKey,
  fingerprint,
  nearAnswers,
  resolveAnswer,
  truthAnswer,
} from './fingerprint';
import { generatePuzzle } from './puzzles';
import type { CellLean, ChoiceLabel, NumberPuzzle, Puzzle } from './types';

function expressionCard(lean: CellLean): NumberPuzzle {
  const step = 8;
  const trap = 9;
  const near = lean === 'step' ? step : trap;
  const anti = lean === 'step' ? trap : step;
  const tagged = [
    { value: 7, role: 'true' as const },
    { value: near, role: 'near' as const },
    { value: anti, role: 'anti' as const },
    { value: 1, role: 'far' as const },
    { value: 20, role: 'far' as const },
  ];
  const labels: ChoiceLabel[] = ['A', 'B', 'C', 'D', 'E'];
  return {
    kind: 'number',
    id: 'number-medium-01',
    difficulty: 'medium',
    prompt: '1 + 2 × 3',
    options: tagged.map((entry, index) => ({
      label: labels[index],
      value: entry.value,
      role: entry.role,
    })) as NumberPuzzle['options'],
    truth: 7,
    step,
    trap,
    near: [near],
    blatant: [anti, 1, 20].sort((left, right) => left - right),
  };
}

function findCard(kind: Puzzle['kind']): Puzzle {
  for (let seed = 0; seed < 20; seed += 1) {
    for (let round = 0; round < 12; round += 1) {
      const card = generatePuzzle(seed, round, 'step');
      if (card.kind === kind) return card;
    }
  }
  throw new Error(kind);
}

describe('quiz fingerprints', () => {
  it('classifies 1 + 2 × 3 for both leans, with distance from the class', () => {
    const step = expressionCard('step');
    const trap = expressionCard('trap');
    expect(fingerprint(step, { kind: 'number', value: 7 }, 'INST-1')).toEqual({
      errorClass: 'exact',
      distance: 0,
      instrumentId: 'INST-1',
    });
    expect(fingerprint(step, { kind: 'number', value: 8 }, 'INST-2')).toEqual({
      errorClass: 'near-miss',
      distance: 1,
      instrumentId: 'INST-2',
    });
    expect(fingerprint(step, { kind: 'number', value: 9 }, 'INST-3')).toEqual({
      errorClass: 'blatant',
      distance: 2,
      instrumentId: 'INST-3',
    });
    expect(fingerprint(trap, { kind: 'number', value: 9 }, 'INST-4')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
    expect(fingerprint(trap, { kind: 'number', value: 8 }, 'INST-5')).toEqual({
      errorClass: 'blatant',
      distance: 2,
      instrumentId: 'INST-5',
    });
    expect(fingerprint(step, { kind: 'number', value: 1 }, 'INST-6').distance).toBe(2);
    const eight = step.options.find((option) => option.value === 8);
    expect(eight).toBeTruthy();
    if (!eight) return;
    expect(canonicalKey(step, { kind: 'number', label: eight.label })).toBe('number:8');
    expect(canonicalKey(step, { kind: 'number', value: 8 })).toBe(
      canonicalKey(step, resolveAnswer(step, { kind: 'number', label: eight.label })),
    );
    expect(nearAnswers(step)).toEqual([{ kind: 'number', value: 8 }]);
    expect(blatantAnswers(step).map((answer) => (answer.kind === 'number' && 'value' in answer ? answer.value : -1))).toEqual(
      step.blatant,
    );
  });

  it('uses fact labels and odd indexes as canonical keys', () => {
    const fact = findCard('fact');
    const odd = findCard('odd');
    expect(fact.kind).toBe('fact');
    expect(odd.kind).toBe('odd');
    if (fact.kind !== 'fact' || odd.kind !== 'odd') return;
    expect(canonicalKey(fact, truthAnswer(fact))).toBe(`fact:${fact.truth}`);
    expect(canonicalKey(odd, truthAnswer(odd))).toBe(`odd:${odd.truth}`);
    expect(fingerprint(fact, truthAnswer(fact), 'INST-1')).toMatchObject({ errorClass: 'exact', distance: 0 });
    expect(fingerprint(fact, nearAnswers(fact)[0], 'INST-1')).toMatchObject({ errorClass: 'near-miss', distance: 1 });
    expect(fingerprint(fact, blatantAnswers(fact)[0], 'INST-1')).toMatchObject({ errorClass: 'blatant', distance: 2 });
    expect(fingerprint(odd, nearAnswers(odd)[0], 'INST-7')).toMatchObject({ errorClass: 'near-miss', distance: 1 });
    expect(fingerprint(odd, blatantAnswers(odd)[0], 'INST-8')).toMatchObject({ errorClass: 'blatant', distance: 2 });
  });

  it('rejects an integer off the card and a mismatched kind', () => {
    const card = expressionCard('step');
    const fact = findCard('fact');
    expect(() => fingerprint(card, { kind: 'number', value: 4 }, 'INST-1')).toThrow(/Illegal answer/);
    expect(() => fingerprint(fact, { kind: 'odd', index: 1 }, 'INST-1')).toThrow(/Illegal answer/);
  });
});
