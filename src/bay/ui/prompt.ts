import { GLYPH_ALPHABET, type Puzzle } from '../types';

export type PromptFacts = { kind: Puzzle['kind']; lines: string[] };

export function promptFacts(puzzle: Puzzle): PromptFacts {
  if (puzzle.kind === 'dial') return { kind: 'dial', lines: [String(puzzle.a), String(puzzle.b)] };
  if (puzzle.kind === 'reading') {
    return {
      kind: 'reading',
      lines: [
        `band ${puzzle.band[0]}\u2013${puzzle.band[1]}`,
        ...puzzle.options.map((option) => `${option.label} ${option.value}`),
      ],
    };
  }
  return {
    kind: 'glyph',
    lines: [GLYPH_ALPHABET.join(' '), `seal ${puzzle.seal}`, ...puzzle.shown.map((cell) => cell ?? 'blank')],
  };
}
