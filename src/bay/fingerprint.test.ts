import { describe, expect, it } from 'vitest';
import {
  blatantAnswers,
  canonicalKey,
  fingerprint,
  nearAnswers,
  signedNearAnswer,
  truthAnswer,
} from './fingerprint';
import { generatePuzzle } from './puzzles';
import type { DialPuzzle, GlyphPuzzle, ReadingPuzzle } from './types';

const dial = generatePuzzle(42, 0) as DialPuzzle;
const wrap = generatePuzzle(3, 8) as DialPuzzle;
const reading = generatePuzzle(0, 1) as ReadingPuzzle;
const glyph = generatePuzzle(42, 2) as GlyphPuzzle;
const glyphEnd = generatePuzzle(1, 3) as GlyphPuzzle;

describe('canonical answers', () => {
  it('returns truth, near, and blatant in list order', () => {
    expect(truthAnswer(dial)).toEqual({ kind: 'dial', detent: 10 });
    expect(nearAnswers(dial)).toEqual([
      { kind: 'dial', detent: 11 },
      { kind: 'dial', detent: 9 },
    ]);
    expect(blatantAnswers(dial).map((answer) => (answer.kind === 'dial' ? answer.detent : -1))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(signedNearAnswer(dial, 1)).toEqual({ kind: 'dial', detent: 11 });
    expect(signedNearAnswer(dial, -1)).toEqual({ kind: 'dial', detent: 9 });
    expect(signedNearAnswer(reading, 1)).toEqual({ kind: 'reading', label: 'R1' });
    expect(signedNearAnswer(reading, -1)).toEqual({ kind: 'reading', label: 'R1' });
    expect(signedNearAnswer(glyph, 1)).toEqual({ kind: 'glyph', symbol: 'R' });
    expect(signedNearAnswer(glyph, -1)).toEqual({ kind: 'glyph', symbol: 'K' });
  });

  it('groups equal answers by canonical key', () => {
    expect(canonicalKey({ kind: 'dial', detent: 10 })).toBe('dial:10');
    expect(canonicalKey({ kind: 'reading', label: 'R3' })).toBe('reading:R3');
    expect(canonicalKey({ kind: 'glyph', symbol: 'P' })).toBe('glyph:P');
    expect(canonicalKey(truthAnswer(dial))).toBe(canonicalKey({ kind: 'dial', detent: 10 }));
  });
});

describe('fingerprint', () => {
  it('classifies dial distance, including the 0/11 wrap and a distance-6 tie', () => {
    expect(fingerprint(dial, { kind: 'dial', detent: 10 }, 'INST-1')).toEqual({
      errorClass: 'exact',
      distance: 0,
      instrumentId: 'INST-1',
    });
    expect(fingerprint(dial, { kind: 'dial', detent: 11 }, 'INST-3')).toEqual({
      errorClass: 'near-miss',
      distance: 1,
      instrumentId: 'INST-3',
    });
    expect(fingerprint(dial, { kind: 'dial', detent: 4 }, 'INST-2').errorClass).toBe('blatant');
    expect(fingerprint(dial, { kind: 'dial', detent: 4 }, 'INST-2').distance).toBe(6);
    expect(fingerprint(wrap, { kind: 'dial', detent: 11 }, 'INST-1')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
  });

  it('classifies the reading decoy as distance 1 and a far reading as distance 2', () => {
    expect(fingerprint(reading, { kind: 'reading', label: 'R3' }, 'INST-1')).toEqual({
      errorClass: 'exact',
      distance: 0,
      instrumentId: 'INST-1',
    });
    expect(fingerprint(reading, { kind: 'reading', label: 'R1' }, 'INST-4')).toEqual({
      errorClass: 'near-miss',
      distance: 1,
      instrumentId: 'INST-4',
    });
    expect(fingerprint(reading, { kind: 'reading', label: 'R2' }, 'INST-5')).toEqual({
      errorClass: 'blatant',
      distance: 2,
      instrumentId: 'INST-5',
    });
  });

  it('classifies glyph ring distance at both ends of the alphabet', () => {
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'P' }, 'INST-6')).toMatchObject({
      errorClass: 'exact',
      distance: 0,
    });
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'R' }, 'INST-6')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'B' }, 'INST-6').errorClass).toBe('blatant');
    expect(fingerprint(glyphEnd, { kind: 'glyph', symbol: 'B' }, 'INST-8')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
    expect(fingerprint(glyphEnd, { kind: 'glyph', symbol: 'R' }, 'INST-8')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
  });

  it('rejects an illegal or cross-kind answer', () => {
    expect(() => fingerprint(dial, { kind: 'dial', detent: 12 }, 'INST-1')).toThrow(/Illegal answer/);
    expect(() => fingerprint(dial, { kind: 'glyph', symbol: 'B' }, 'INST-1')).toThrow(/Illegal answer/);
    expect(() => fingerprint(reading, { kind: 'reading', label: 'R9' as 'R1' }, 'INST-1')).toThrow(
      /Illegal answer/,
    );
  });
});
