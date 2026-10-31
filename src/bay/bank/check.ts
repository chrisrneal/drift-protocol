import { FACT_BANK } from './facts';
import type { NumberItem, OddItem, Theme } from './items';
import { NUMBER_BANK } from './numbers';
import { ODD_BANK } from './odd';
import type { Difficulty } from '../types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'harder'];
const THEMES: Theme[] = ['school', 'everyday', 'trivia'];
const NUM = '(0|[1-9]|1[0-2])';
const OP = '([+\u2212×])';
const EASY = new RegExp(`^${NUM} ${OP} ${NUM}$`);
const MEDIUM = new RegExp(`^${NUM} ${OP} ${NUM} ${OP} ${NUM}$`);
const HARDER_LEFT = new RegExp(`^\\(${NUM} ${OP} ${NUM}\\) ${OP} ${NUM}$`);
const HARDER_RIGHT = new RegExp(`^${NUM} ${OP} \\(${NUM} ${OP} ${NUM}\\)$`);
const VIA = { add: '+', sub: '\u2212', mul: '×' } as const;

function apply(op: string, left: number, right: number): number {
  if (op === '+') return left + right;
  if (op === '\u2212') return left - right;
  return left * right;
}

function inRange(value: number): boolean {
  return Number.isInteger(value) && value >= -30 && value <= 200;
}

function mixedOperators(left: string, right: string): boolean {
  const ops = [left, right];
  return ops.includes('×') && (ops.includes('+') || ops.includes('\u2212')) && left !== right;
}

function precedence(a: number, op1: string, b: number, op2: string, c: number): number {
  if (op1 === '×' && op2 !== '×') return apply(op2, apply(op1, a, b), c);
  if (op2 === '×' && op1 !== '×') return apply(op1, a, apply(op2, b, c));
  return apply(op2, apply(op1, a, b), c);
}

function leftToRight(a: number, op1: string, b: number, op2: string, c: number): number {
  return apply(op2, apply(op1, a, b), c);
}

function fold(value: string): string {
  return value.trim().toLowerCase();
}

function distinct(values: string[]): boolean {
  return new Set(values.map(fold)).size === values.length && values.every((value) => value.trim().length > 0);
}

function expectIds(kind: string, items: Array<{ id: string; difficulty: Difficulty }>, errors: string[]) {
  for (const difficulty of DIFFICULTIES) {
    const expected = Array.from({ length: 8 }, (_, index) => `${kind}-${difficulty}-${String(index + 1).padStart(2, '0')}`);
    const found = items.filter((item) => item.difficulty === difficulty).map((item) => item.id);
    if (found.join(',') !== expected.join(',')) {
      errors.push(`${kind} ${difficulty} ids are ${found.join(', ') || 'missing'}; expected ${expected.join(', ')}`);
    }
  }
}

function expectThemes(items: Array<{ id: string; difficulty: Difficulty; theme: Theme }>, errors: string[]) {
  for (const difficulty of DIFFICULTIES) {
    const cell = items.filter((item) => item.difficulty === difficulty);
    for (const theme of THEMES) {
      const count = cell.filter((item) => item.theme === theme).length;
      if (count < 2) errors.push(`${cell[0]?.id ?? difficulty} cell has ${count} ${theme} items`);
    }
    for (const item of cell) {
      if (!THEMES.includes(item.theme)) errors.push(`${item.id} has an unknown theme`);
    }
  }
}

function checkFacts(errors: string[]) {
  expectIds('fact', FACT_BANK, errors);
  expectThemes(FACT_BANK, errors);
  const seen = new Set<string>();
  for (const item of FACT_BANK) {
    if (seen.has(item.id)) errors.push(`${item.id} is duplicated`);
    seen.add(item.id);
    if (!item.prompt.endsWith('?')) errors.push(`${item.id} prompt must end with ?`);
    if (item.prompt.toLowerCase().includes(fold(item.truth))) errors.push(`${item.id} prompt contains the true answer`);
    const choices = [item.truth, item.near, ...item.fars];
    if (!distinct(choices)) errors.push(`${item.id} choices are not distinct`);
    if (item.fars.length !== 3) errors.push(`${item.id} needs three far choices`);
  }
}

function farOk(id: string, far: number, truth: number, trap: number, errors: string[]) {
  const step = truth + 1;
  if (!inRange(far)) errors.push(`${id} far ${far} is outside -30 through 200`);
  if (far === truth || far === step || far === trap) errors.push(`${id} far ${far} collides with a neighbor`);
  if (Math.abs(far - truth) < 3) errors.push(`${id} far ${far} is closer than 3 to the truth`);
  if (Math.abs(far - step) < 2 || Math.abs(far - trap) < 2) {
    errors.push(`${id} far ${far} is closer than 2 to a neighbor`);
  }
}

function checkNumberItem(item: NumberItem, errors: string[]) {
  if (!inRange(item.truth) || !inRange(item.trap)) errors.push(`${item.id} truth or trap is outside -30 through 200`);
  if (item.trap === item.truth || item.trap === item.truth + 1) errors.push(`${item.id} trap collides with the truth or the step`);
  if (item.fars[0] === item.fars[1]) errors.push(`${item.id} fars match`);
  farOk(item.id, item.fars[0], item.truth, item.trap, errors);
  farOk(item.id, item.fars[1], item.truth, item.trap, errors);

  if (item.difficulty === 'easy') {
    const match = EASY.exec(item.prompt);
    if (!match || item.trapVia === undefined) {
      errors.push(`${item.id} is not an easy expression with trapVia`);
      return;
    }
    const via = VIA[item.trapVia];
    if (via === match[2]) errors.push(`${item.id} trapVia repeats the printed operator`);
    const truth = apply(match[2], Number(match[1]), Number(match[3]));
    const trap = apply(via, Number(match[1]), Number(match[3]));
    if (truth !== item.truth || trap !== item.trap) errors.push(`${item.id} stored ${item.truth}/${item.trap}, recomputed ${truth}/${trap}`);
    return;
  }

  if (item.trapVia !== undefined) errors.push(`${item.id} should not set trapVia`);
  if (item.difficulty === 'medium') {
    const match = MEDIUM.exec(item.prompt);
    if (!match || !mixedOperators(match[2], match[4])) {
      errors.push(`${item.id} is not a medium expression`);
      return;
    }
    const truth = precedence(Number(match[1]), match[2], Number(match[3]), match[4], Number(match[5]));
    const trap = leftToRight(Number(match[1]), match[2], Number(match[3]), match[4], Number(match[5]));
    if (truth !== item.truth || trap !== item.trap) errors.push(`${item.id} stored ${item.truth}/${item.trap}, recomputed ${truth}/${trap}`);
    return;
  }

  const wrapped = HARDER_LEFT.exec(item.prompt);
  const open = HARDER_RIGHT.exec(item.prompt);
  const match = wrapped ?? open;
  if (!match || !mixedOperators(match[2], match[4])) {
    errors.push(`${item.id} is not a harder expression`);
    return;
  }
  const a = Number(match[1]);
  const op1 = match[2];
  const b = Number(match[3]);
  const op2 = match[4];
  const c = Number(match[5]);
  const truth = wrapped ? apply(op2, apply(op1, a, b), c) : apply(op1, a, apply(op2, b, c));
  const trap = precedence(a, op1, b, op2, c);
  if (truth !== item.truth || trap !== item.trap) errors.push(`${item.id} stored ${item.truth}/${item.trap}, recomputed ${truth}/${trap}`);
}

function checkNumbers(errors: string[]) {
  expectIds('number', NUMBER_BANK, errors);
  expectThemes(NUMBER_BANK, errors);
  const seen = new Set<string>();
  for (const item of NUMBER_BANK) {
    if (seen.has(item.id)) errors.push(`${item.id} is duplicated`);
    seen.add(item.id);
    checkNumberItem(item, errors);
  }
}

function checkOddItem(item: OddItem, errors: string[]) {
  if (!item.stepNote.trim() || !item.trapNote.trim()) errors.push(`${item.id} is missing a note`);
  const values = [item.truth, item.step, item.trap, item.inGroup[0], item.inGroup[1]];
  if (!distinct(values)) errors.push(`${item.id} strings are not distinct`);
  if (item.prompt.toLowerCase().includes(fold(item.truth))) errors.push(`${item.id} prompt contains the true answer`);
}

function checkOdds(errors: string[]) {
  expectIds('odd', ODD_BANK, errors);
  expectThemes(ODD_BANK, errors);
  const seen = new Set<string>();
  for (const item of ODD_BANK) {
    if (seen.has(item.id)) errors.push(`${item.id} is duplicated`);
    seen.add(item.id);
    checkOddItem(item, errors);
  }
}

export function checkBanks(): string[] {
  const errors: string[] = [];
  if (FACT_BANK.length !== 24) errors.push(`FACT_BANK has ${FACT_BANK.length} items`);
  if (NUMBER_BANK.length !== 24) errors.push(`NUMBER_BANK has ${NUMBER_BANK.length} items`);
  if (ODD_BANK.length !== 24) errors.push(`ODD_BANK has ${ODD_BANK.length} items`);
  checkFacts(errors);
  checkNumbers(errors);
  checkOdds(errors);
  return errors;
}
