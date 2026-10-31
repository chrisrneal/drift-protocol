import { describe, expect, it } from 'vitest';
import { posturesFor } from './plan';

const three = ['radio', 'nav', 'deck'] as const;

describe('posturesFor', () => {
  it('walks the primary nick and the three-saboteur table', () => {
    expect(posturesFor(0.49, three, 0)).toEqual({ radio: 'honest', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.5, three, 0)).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.8, three, 0)).toEqual({ radio: 'near-miss', nav: 'near-miss', deck: 'honest' });
    expect(posturesFor(0.92, three, 0)).toEqual({ radio: 'blatant', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.97, three, 0)).toEqual({ radio: 'near-miss', nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.8, three, 1)).toEqual({ radio: 'honest', nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.8, three, 2)).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'near-miss' });
  });

  it('uses the two-seat and one-seat tables', () => {
    expect(posturesFor(0.57, ['nav', 'deck'], 0)).toEqual({ nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.58, ['nav', 'deck'], 0)).toEqual({ nav: 'near-miss', deck: 'honest' });
    expect(posturesFor(0.88, ['nav', 'deck'], 0)).toEqual({ nav: 'blatant', deck: 'honest' });
    expect(posturesFor(0.96, ['nav', 'deck'], 0)).toEqual({ nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.71, ['deck'], 4)).toEqual({ deck: 'honest' });
    expect(posturesFor(0.72, ['deck'], 4)).toEqual({ deck: 'near-miss' });
    expect(posturesFor(0.95, ['deck'], 4)).toEqual({ deck: 'blatant' });
  });

  it('rejects an empty cell', () => {
    expect(() => posturesFor(0, [], 0)).toThrow(/1, 2, or 3/);
  });
});
