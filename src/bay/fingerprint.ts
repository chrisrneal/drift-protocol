import type { BayAnswer, ChoiceLabel, Fingerprint, NumberPuzzle, Puzzle } from './types';

function isChoiceLabel(value: string): value is ChoiceLabel {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'E';
}

export function resolveAnswer(puzzle: Puzzle, answer: BayAnswer): BayAnswer {
  if (answer.kind !== 'number' || !('label' in answer)) return answer;
  if (puzzle.kind !== 'number' || !isChoiceLabel(answer.label)) throw new Error('Illegal answer.');
  const option = puzzle.options.find((entry) => entry.label === answer.label);
  if (!option) throw new Error('Illegal answer.');
  return { kind: 'number', value: option.value };
}

export function truthAnswer(puzzle: Puzzle): BayAnswer {
  if (puzzle.kind === 'fact') return { kind: 'fact', label: puzzle.truth };
  if (puzzle.kind === 'number') return { kind: 'number', value: puzzle.truth };
  return { kind: 'odd', index: puzzle.truth };
}

export function nearAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'fact') return [{ kind: 'fact', label: puzzle.near[0] }];
  if (puzzle.kind === 'number') return [{ kind: 'number', value: puzzle.near[0] }];
  return [{ kind: 'odd', index: puzzle.near[0] }];
}

export function blatantAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'fact') return puzzle.blatant.map((label) => ({ kind: 'fact' as const, label }));
  if (puzzle.kind === 'number') return puzzle.blatant.map((value) => ({ kind: 'number' as const, value }));
  return puzzle.blatant.map((index) => ({ kind: 'odd' as const, index }));
}

export function canonicalKey(puzzle: Puzzle, answer: BayAnswer): string {
  const resolved = resolveAnswer(puzzle, answer);
  if (resolved.kind === 'fact') return `fact:${resolved.label}`;
  if (resolved.kind === 'number') {
    if (!('value' in resolved)) throw new Error('Illegal answer.');
    return `number:${resolved.value}`;
  }
  return `odd:${resolved.index}`;
}

export function nearChoiceLabel(puzzle: Puzzle): string {
  if (puzzle.kind === 'odd') return `item ${puzzle.near[0]}`;
  if (puzzle.kind === 'fact') return `choice ${puzzle.near[0]}`;
  const option = puzzle.options.find((entry) => entry.value === puzzle.near[0]);
  if (!option) throw new Error('Number card is missing its near choice.');
  return `choice ${option.label}`;
}

function classFor(distance: number): Fingerprint['errorClass'] {
  if (distance === 0) return 'exact';
  if (distance === 1) return 'near-miss';
  return 'blatant';
}

function numberValue(puzzle: NumberPuzzle, answer: BayAnswer): number {
  if (answer.kind !== 'number') throw new Error('Illegal answer.');
  if ('label' in answer) {
    const resolved = resolveAnswer(puzzle, answer);
    if (resolved.kind !== 'number' || !('value' in resolved)) throw new Error('Illegal answer.');
    return resolved.value;
  }
  return answer.value;
}

export function fingerprint(puzzle: Puzzle, answer: BayAnswer, instrumentId: string): Fingerprint {
  if (answer.kind !== puzzle.kind) throw new Error('Illegal answer.');
  if (puzzle.kind === 'fact') {
    if (answer.kind !== 'fact') throw new Error('Illegal answer.');
    const option = puzzle.options.find((entry) => entry.label === answer.label);
    if (!option) throw new Error('Illegal answer.');
    const distance = option.role === 'true' ? 0 : option.role === 'near' ? 1 : 2;
    return { errorClass: classFor(distance), distance, instrumentId };
  }
  if (puzzle.kind === 'number') {
    const value = numberValue(puzzle, answer);
    const option = puzzle.options.find((entry) => entry.value === value);
    if (!option || !Number.isInteger(value)) throw new Error('Illegal answer.');
    const distance = value === puzzle.truth ? 0 : value === puzzle.near[0] ? 1 : 2;
    return { errorClass: classFor(distance), distance, instrumentId };
  }
  if (answer.kind !== 'odd') throw new Error('Illegal answer.');
  const option = puzzle.options.find((entry) => entry.index === answer.index);
  if (!option) throw new Error('Illegal answer.');
  const distance = option.role === 'true' ? 0 : option.role === 'near' ? 1 : 2;
  return { errorClass: classFor(distance), distance, instrumentId };
}
