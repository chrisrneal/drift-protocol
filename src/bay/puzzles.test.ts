import { describe, expect, it } from 'vitest';
import { assembleDial, generatePuzzle } from './puzzles';

describe('phase dial', () => {
  it('builds truth and the ordered neighbors from two detents', () => {
    expect(assembleDial(5, 5)).toMatchObject({
      kind: 'dial',
      a: 5,
      b: 5,
      truth: 10,
      near: [11, 9],
      blatant: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    });
    expect(assembleDial(11, 1)).toMatchObject({ truth: 0, near: [1, 11] });
    expect(assembleDial(11, 0)).toMatchObject({ truth: 11, near: [0, 10] });
  });

  it('draws the locked dials for seed 42 and the wrap seeds', () => {
    expect(generatePuzzle(42, 0)).toMatchObject({ kind: 'dial', a: 5, b: 5, truth: 10, near: [11, 9] });
    expect(generatePuzzle(42, 1)).toMatchObject({ kind: 'dial', a: 6, b: 7, truth: 1, near: [2, 0] });
    expect(generatePuzzle(3, 8)).toMatchObject({ kind: 'dial', a: 11, b: 1, truth: 0, near: [1, 11] });
    expect(generatePuzzle(7, 8)).toMatchObject({ kind: 'dial', a: 11, b: 0, truth: 11, near: [0, 10] });
  });

  it('repeats a round from the seed and the round index alone', () => {
    expect(generatePuzzle(0, 0)).toEqual(generatePuzzle(0, 0));
  });
});
