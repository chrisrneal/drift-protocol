import { describe, expect, it } from 'vitest';
import type { Packet, SeatId } from './types';
import {
  consistencyScore,
  meanReliability,
  nextRescue,
  normalizeWeights,
  packetSimilarity,
  trustAlignment,
} from './scoring';
import { RESCUE_START } from './constants';

const packet = (keywords: [string, string, string], value: number): Packet => ({
  keywords,
  value,
});

const ice = packet(['ice', 'current', 'depth'], 50);

describe('packetSimilarity', () => {
  it('scores identical packets as 1', () => {
    expect(packetSimilarity(ice, { ...ice, keywords: ['ice', 'current', 'depth'] })).toBe(1);
  });

  it('ignores keyword order and blends value distance', () => {
    const other = packet(['depth', 'ice', 'storm'], 62.5);
    const score = packetSimilarity(ice, other);
    expect(score).toBeCloseTo(0.5 * (2 / 3) + 0.5 * 0.5);
  });

  it('floors value similarity at 0 once the gap reaches the scale', () => {
    expect(packetSimilarity(ice, packet(['ice', 'current', 'depth'], 75))).toBeCloseTo(0.5);
    expect(packetSimilarity(ice, packet(['ice', 'current', 'depth'], 100))).toBeCloseTo(0.5);
  });
});

describe('consistencyScore', () => {
  it('is 1 when every seat emits the same packet', () => {
    expect(consistencyScore([ice, ice, ice, ice])).toBe(1);
  });

  it('is 0 when fewer than two packets are emitted', () => {
    expect(consistencyScore([null, null, null, null])).toBe(0);
    expect(consistencyScore([ice, null, null, null])).toBe(0);
  });

  it('scales perfect agreement by coverage', () => {
    expect(consistencyScore([ice, ice, null, null])).toBeCloseTo(0.5);
  });
});

describe('trustAlignment', () => {
  const flat: Record<SeatId, number> = {
    you: 0.5,
    skeptic: 0.5,
    pattern: 0.5,
    explorer: 0.5,
  };

  it('is 1 when weights match the reliability distribution', () => {
    const score = trustAlignment(
      [
        {
          from: 'you',
          weights: { skeptic: 1, pattern: 1, explorer: 1 },
        },
      ],
      flat,
    );
    expect(score).toBeCloseTo(1);
  });

  it('drops when one peer gets all the trust against a flat record', () => {
    const score = trustAlignment(
      [
        {
          from: 'you',
          weights: { skeptic: 1, pattern: 0, explorer: 0 },
        },
      ],
      flat,
    );
    expect(score).toBeCloseTo(1 / 3);
  });

  it('uses a 0.5 prior when a seat has no scored emissions yet', () => {
    expect(meanReliability(undefined)).toBe(0.5);
    expect(meanReliability({ sum: 0, count: 0 })).toBe(0.5);
    expect(meanReliability({ sum: 1.5, count: 2 })).toBeCloseTo(0.75);
  });
});

describe('nextRescue', () => {
  it('starts from the documented baseline and moves with round quality', () => {
    expect(RESCUE_START).toBeCloseTo(0.42);
    expect(nextRescue(0.42, 1, 1)).toBeCloseTo(0.42 + 0.45 * 0.12);
    expect(nextRescue(0.42, 0, 0)).toBeCloseTo(0.42 - 0.55 * 0.12);
  });

  it('clamps to the open interval used by the meter', () => {
    expect(nextRescue(0.01, 0, 0)).toBeCloseTo(0.02);
    expect(nextRescue(0.97, 1, 1)).toBeCloseTo(0.98);
  });
});

describe('normalizeWeights', () => {
  it('normalizes positive weights and falls back to uniform', () => {
    expect(normalizeWeights({ skeptic: 1, pattern: 1, explorer: 2 }, ['skeptic', 'pattern', 'explorer'])).toEqual({
      skeptic: 0.25,
      pattern: 0.25,
      explorer: 0.5,
    });
    const uniform = normalizeWeights({ skeptic: 0, pattern: 0, explorer: 0 }, ['skeptic', 'pattern', 'explorer']);
    expect(uniform.skeptic).toBeCloseTo(1 / 3);
    expect(uniform.pattern).toBeCloseTo(1 / 3);
    expect(uniform.explorer).toBeCloseTo(1 / 3);
  });
});
