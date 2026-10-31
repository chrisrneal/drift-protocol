import { intBetween } from '../game/rng';
import { FACT_BANK } from './bank/facts';
import type { FactItem, NumberItem, OddItem } from './bank/items';
import { NUMBER_BANK } from './bank/numbers';
import { ODD_BANK } from './bank/odd';
import { ITEM_STREAM_ADD, ITEM_STREAM_MASK, PUZZLE_STREAM_ADD, PUZZLE_STREAM_MASK } from './constants';
import type {
  CellLean,
  ChoiceLabel,
  Difficulty,
  FactOption,
  FactPuzzle,
  NumberOption,
  NumberPuzzle,
  OddIndex,
  OddOption,
  OddPuzzle,
  Puzzle,
} from './types';

const KINDS = ['fact', 'number', 'odd'] as const;
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'harder'];
const LABELS: ChoiceLabel[] = ['A', 'B', 'C', 'D', 'E'];
const ODD_INDEXES: OddIndex[] = [1, 2, 3, 4];

type Kind = (typeof KINDS)[number];

export function puzzleStreamStart(seed: number, roundIndex: number): number {
  const mixed = Math.imul((seed ^ PUZZLE_STREAM_MASK) >>> 0, roundIndex + 1) >>> 0;
  return (mixed + PUZZLE_STREAM_ADD) >>> 0;
}

function itemStreamStart(seed: number, kindIndex: number, difficultyIndex: number): number {
  const cellKey = kindIndex * 3 + difficultyIndex + 1;
  const mixed = Math.imul((seed ^ ITEM_STREAM_MASK) >>> 0, cellKey) >>> 0;
  return (mixed + ITEM_STREAM_ADD) >>> 0;
}

function shuffle<T>(items: T[], state: number): T[] {
  const next = items.slice();
  let cursor = state;
  for (let index = next.length - 1; index >= 1; index -= 1) {
    const swap = intBetween(cursor, 0, index);
    cursor = swap.state;
    const held = next[index];
    next[index] = next[swap.value];
    next[swap.value] = held;
  }
  return next;
}

function kindAt(seed: number, roundIndex: number): Kind {
  const rolled = intBetween(puzzleStreamStart(seed, roundIndex), 0, 2);
  const kind = KINDS[rolled.value];
  if (!kind) throw new Error('Puzzle kind is out of range.');
  return kind;
}

function permute(seed: number, kindIndex: number, difficultyIndex: number, ids: string[]): string[] {
  return shuffle([...ids].sort(), itemStreamStart(seed, kindIndex, difficultyIndex));
}

function requireRound(roundIndex: number) {
  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex > 11) {
    throw new Error('Round index must be an integer from 0 through 11.');
  }
}

function dealFact(item: FactItem, state: number): FactPuzzle {
  const tagged: Array<{ text: string; role: FactOption['role'] }> = [
    { text: item.truth, role: 'true' },
    { text: item.near, role: 'near' },
    ...item.fars.map((text) => ({ text, role: 'far' as const })),
  ];
  const shuffled = shuffle(tagged, state);
  const options = shuffled.map((entry, index) => ({
    label: LABELS[index],
    text: entry.text,
    role: entry.role,
  })) as FactPuzzle['options'];
  const truth = options.find((option) => option.role === 'true');
  const near = options.find((option) => option.role === 'near');
  if (!truth || !near) throw new Error('Fact card is missing a key.');
  return {
    kind: 'fact',
    id: item.id,
    difficulty: item.difficulty,
    prompt: item.prompt,
    options,
    truth: truth.label,
    near: [near.label],
    blatant: options.filter((option) => option.role === 'far').map((option) => option.label),
  };
}

function dealNumber(item: NumberItem, lean: CellLean, state: number): NumberPuzzle {
  const step = item.truth + 1;
  const nearValue = lean === 'step' ? step : item.trap;
  const antiValue = lean === 'step' ? item.trap : step;
  const tagged: Array<{ value: number; role: NumberOption['role'] }> = [
    { value: item.truth, role: 'true' },
    { value: nearValue, role: 'near' },
    { value: antiValue, role: 'anti' },
    { value: item.fars[0], role: 'far' },
    { value: item.fars[1], role: 'far' },
  ];
  const shuffled = shuffle(tagged, state);
  const options = shuffled.map((entry, index) => ({
    label: LABELS[index],
    value: entry.value,
    role: entry.role,
  })) as NumberPuzzle['options'];
  return {
    kind: 'number',
    id: item.id,
    difficulty: item.difficulty,
    prompt: item.prompt,
    options,
    truth: item.truth,
    step,
    trap: item.trap,
    near: [nearValue],
    blatant: [antiValue, item.fars[0], item.fars[1]].sort((left, right) => left - right),
  };
}

function dealOdd(item: OddItem, lean: CellLean, state: number): OddPuzzle {
  const almost = lean === 'step' ? item.step : item.trap;
  const tagged: Array<{ text: string; role: OddOption['role'] }> = [
    { text: item.truth, role: 'true' },
    { text: almost, role: 'near' },
    { text: item.inGroup[0], role: 'far' },
    { text: item.inGroup[1], role: 'far' },
  ];
  const shuffled = shuffle(tagged, state);
  const options = shuffled.map((entry, index) => ({
    index: ODD_INDEXES[index],
    text: entry.text,
    role: entry.role,
  })) as OddPuzzle['options'];
  const truth = options.find((option) => option.role === 'true');
  const near = options.find((option) => option.role === 'near');
  if (!truth || !near) throw new Error('Odd card is missing a key.');
  return {
    kind: 'odd',
    id: item.id,
    difficulty: item.difficulty,
    prompt: item.prompt,
    options,
    truth: truth.index,
    near: [near.index],
    blatant: options
      .filter((option) => option.role === 'far')
      .map((option) => option.index)
      .sort((left, right) => left - right),
  };
}

export function generatePuzzle(seed: number, roundIndex: number, lean: CellLean): Puzzle {
  requireRound(roundIndex);
  const difficulty = DIFFICULTIES[roundIndex % 3];
  let state = puzzleStreamStart(seed, roundIndex);
  const kindRoll = intBetween(state, 0, 2);
  state = kindRoll.state;
  const kind = KINDS[kindRoll.value];
  if (!kind || !difficulty) throw new Error('Puzzle kind is out of range.');
  const kindIndex = KINDS.indexOf(kind);
  const difficultyIndex = DIFFICULTIES.indexOf(difficulty);
  let occurrence = 0;
  for (let earlier = 0; earlier < roundIndex; earlier += 1) {
    if (earlier % 3 === roundIndex % 3 && kindAt(seed, earlier) === kind) occurrence += 1;
  }
  if (kind === 'fact') {
    const ids = permute(seed, kindIndex, difficultyIndex, FACT_BANK.filter((item) => item.difficulty === difficulty).map((item) => item.id));
    const id = ids[occurrence];
    const item = FACT_BANK.find((entry) => entry.id === id);
    if (!item) throw new Error('Fact bank is missing the dealt id.');
    return dealFact(item, state);
  }
  if (kind === 'number') {
    const ids = permute(
      seed,
      kindIndex,
      difficultyIndex,
      NUMBER_BANK.filter((item) => item.difficulty === difficulty).map((item) => item.id),
    );
    const id = ids[occurrence];
    const item = NUMBER_BANK.find((entry) => entry.id === id);
    if (!item) throw new Error('Number bank is missing the dealt id.');
    return dealNumber(item, lean, state);
  }
  const ids = permute(seed, kindIndex, difficultyIndex, ODD_BANK.filter((item) => item.difficulty === difficulty).map((item) => item.id));
  const id = ids[occurrence];
  const item = ODD_BANK.find((entry) => entry.id === id);
  if (!item) throw new Error('Odd bank is missing the dealt id.');
  return dealOdd(item, lean, state);
}
