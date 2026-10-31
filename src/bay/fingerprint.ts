import { GLYPH_ALPHABET, type BayAnswer, type CellSign, type Fingerprint, type GlyphSymbol, type Puzzle } from './types';

export function truthAnswer(puzzle: Puzzle): BayAnswer {
  if (puzzle.kind === 'dial') return { kind: 'dial', detent: puzzle.truth };
  if (puzzle.kind === 'reading') return { kind: 'reading', label: puzzle.truth };
  return { kind: 'glyph', symbol: puzzle.truth };
}

export function nearAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'dial') {
    return puzzle.near.map((detent) => ({ kind: 'dial' as const, detent }));
  }
  if (puzzle.kind === 'reading') {
    return puzzle.near.map((label) => ({ kind: 'reading' as const, label }));
  }
  return puzzle.near.map((symbol) => ({ kind: 'glyph' as const, symbol }));
}

export function blatantAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'dial') {
    return puzzle.blatant.map((detent) => ({ kind: 'dial' as const, detent }));
  }
  if (puzzle.kind === 'reading') {
    return puzzle.blatant.map((label) => ({ kind: 'reading' as const, label }));
  }
  return puzzle.blatant.map((symbol) => ({ kind: 'glyph' as const, symbol }));
}

export function signedNearAnswer(puzzle: Puzzle, sign: CellSign): BayAnswer {
  const near = nearAnswers(puzzle);
  if (puzzle.kind === 'reading') return near[0];
  return sign === 1 ? near[0] : near[1];
}

export function canonicalKey(answer: BayAnswer): string {
  if (answer.kind === 'dial') return `dial:${answer.detent}`;
  if (answer.kind === 'reading') return `reading:${answer.label}`;
  return `glyph:${answer.symbol}`;
}

function circular(from: number, to: number, size: number): number {
  const gap = Math.abs(from - to);
  return Math.min(gap, size - gap);
}

function glyphIndex(symbol: GlyphSymbol): number {
  return GLYPH_ALPHABET.indexOf(symbol);
}

export function fingerprint(puzzle: Puzzle, answer: BayAnswer, instrumentId: string): Fingerprint {
  if (answer.kind !== puzzle.kind) throw new Error('Illegal answer.');
  if (puzzle.kind === 'dial') {
    if (answer.kind !== 'dial' || !Number.isInteger(answer.detent) || answer.detent < 0 || answer.detent > 11) {
      throw new Error('Illegal answer.');
    }
    const distance = circular(puzzle.truth, answer.detent, 12);
    const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
    return { errorClass, distance, instrumentId };
  }
  if (puzzle.kind === 'reading') {
    if (answer.kind !== 'reading') throw new Error('Illegal answer.');
    const option = puzzle.options.find((entry) => entry.label === answer.label);
    if (!option) throw new Error('Illegal answer.');
    const distance = option.role === 'true' ? 0 : option.role === 'near' ? 1 : 2;
    const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
    return { errorClass, distance, instrumentId };
  }
  if (answer.kind !== 'glyph' || glyphIndex(answer.symbol) < 0) throw new Error('Illegal answer.');
  const distance = circular(glyphIndex(puzzle.truth), glyphIndex(answer.symbol), 8);
  const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
  return { errorClass, distance, instrumentId };
}
