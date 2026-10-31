import { describe, expect, it } from 'vitest';
import { applyIntegrity, classifyBoard, formatBasisPoints, formatDelta, meterVerdict } from './integrity';

const truth = 'fact:A';
const near = ['fact:B'];

describe('classifyBoard', () => {
  it('follows the worked path from 42.0% and prefers a true majority over a near pair', () => {
    let integrity = 4200;
    const steps: Array<{ keys: string[]; row: string; delta: number; after: number }> = [
      {
        keys: ['fact:A', 'fact:A', 'fact:A', 'fact:A', 'fact:A', 'fact:B', 'fact:B', 'fact:B'],
        row: 'aligned',
        delta: 400,
        after: 4600,
      },
      {
        keys: ['fact:A', 'fact:A', 'fact:A', 'fact:A', 'fact:B', 'fact:B', 'fact:B', 'fact:C'],
        row: 'near-miss-cluster',
        delta: -350,
        after: 4250,
      },
      {
        keys: ['fact:C', 'fact:C', 'fact:C', 'fact:C', 'fact:C', 'fact:C', 'fact:A', 'fact:A'],
        row: 'false-consensus',
        delta: -450,
        after: 3800,
      },
      {
        keys: ['fact:A', 'fact:A', 'fact:C', 'fact:D', 'fact:E', 'fact:F', 'fact:G', 'fact:H'],
        row: 'split',
        delta: -200,
        after: 3600,
      },
    ];
    for (const step of steps) {
      const classified = classifyBoard({ truthKey: truth, nearKeys: near, keys: step.keys });
      expect(classified).toEqual({ row: step.row, delta: step.delta });
      integrity = applyIntegrity(integrity, classified.delta);
      expect(integrity).toBe(step.after);
    }
    expect(formatBasisPoints(4600)).toBe('46.0%');
    expect(formatBasisPoints(4250)).toBe('42.5%');
    expect(formatBasisPoints(3800)).toBe('38.0%');
    expect(formatBasisPoints(3600)).toBe('36.0%');
    expect(formatDelta(400)).toBe('+4.0');
    expect(formatDelta(-450)).toBe('-4.5');
    expect(formatDelta(-350)).toBe('-3.5');
    expect(formatDelta(-200)).toBe('-2.0');
  });

  it('treats two seats on a blatant key as a split', () => {
    const classified = classifyBoard({
      truthKey: truth,
      nearKeys: near,
      keys: ['fact:A', 'fact:A', 'fact:C', 'fact:C', 'fact:D', 'fact:E', 'fact:B', 'fact:D'],
    });
    expect(classified).toEqual({ row: 'split', delta: -200 });
  });

  it('clamps to 2.0% and 98.0%', () => {
    expect(applyIntegrity(200, -200)).toBe(200);
    expect(applyIntegrity(9800, 400)).toBe(9800);
    expect(Number.isInteger(applyIntegrity(4200, -450))).toBe(true);
  });
});

describe('meterVerdict', () => {
  it('uses 70% and 55% only as end bands', () => {
    expect(meterVerdict(7000)).toEqual({ winner: 'crew', reason: 'integrity-window' });
    expect(meterVerdict(6999)).toEqual({ winner: 'draw', reason: 'stalemate' });
    expect(meterVerdict(5500)).toEqual({ winner: 'draw', reason: 'stalemate' });
    expect(meterVerdict(5499)).toEqual({ winner: 'saboteur', reason: 'integrity-held' });
  });
});
