import { describe, expect, it } from 'vitest';
import { FACT_BANK } from './facts';
import { NUMBER_BANK } from './numbers';
import { ODD_BANK } from './odd';
import { checkBanks } from './check';

describe('question bank', () => {
  it('accepts exactly eight items in each kind-by-difficulty cell', () => {
    expect(checkBanks()).toEqual([]);
    expect(FACT_BANK).toHaveLength(24);
    expect(NUMBER_BANK).toHaveLength(24);
    expect(ODD_BANK).toHaveLength(24);
  });
});
