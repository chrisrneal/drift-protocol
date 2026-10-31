import { describe, expect, it } from 'vitest';
import { generatePuzzle } from '../puzzles';
import { promptFacts } from './prompt';

describe('promptFacts', () => {
  it('publishes the dial inputs and withholds the truth line', () => {
    const facts = promptFacts(generatePuzzle(42, 0));
    expect(facts).toEqual({ kind: 'dial', lines: ['5', '5'] });
    expect(facts.lines).not.toContain('10');
  });

  it('publishes the reading band and unlabeled values', () => {
    const facts = promptFacts(generatePuzzle(0, 1));
    expect(facts.kind).toBe('reading');
    expect(facts.lines[0]).toBe('band 55–62');
    expect(facts.lines).toContain('R1 53');
    expect(facts.lines).toContain('R3 61');
    expect(facts.lines.join(' ')).not.toMatch(/true|near|far/);
  });

  it('publishes the glyph alphabet, the seal, and the blank cell', () => {
    const facts = promptFacts(generatePuzzle(42, 2));
    expect(facts).toEqual({
      kind: 'glyph',
      lines: ['B D F H K P R T', 'seal 0', 'D', 'R', 'K', 'blank'],
    });
  });
});
