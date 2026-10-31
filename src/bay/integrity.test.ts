import { describe, expect, it } from 'vitest';
import { applyIntegrity, classifyBoard, formatBasisPoints, formatDelta, meterVerdict } from './integrity';

const truth = 'dial:10';
const near = ['dial:11', 'dial:9'];

describe('classifyBoard', () => {
  it('follows the worked path from 42.0% and prefers a true majority over a near pair', () => {
    let integrity = 4200;
    const steps: Array<{ keys: string[]; row: string; delta: number; after: number }> = [
      {
        keys: ['dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:11', 'dial:11', 'dial:11'],
        row: 'aligned',
        delta: 400,
        after: 4600,
      },
      {
        keys: ['dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:11', 'dial:11', 'dial:11', 'dial:4'],
        row: 'near-miss-cluster',
        delta: -350,
        after: 4250,
      },
      {
        keys: ['dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:10', 'dial:10'],
        row: 'false-consensus',
        delta: -450,
        after: 3800,
      },
      {
        keys: ['dial:10', 'dial:10', 'dial:0', 'dial:1', 'dial:2', 'dial:3', 'dial:5', 'dial:6'],
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

  it('treats two different near keys as a split', () => {
    const classified = classifyBoard({
      truthKey: truth,
      nearKeys: near,
      keys: ['dial:10', 'dial:10', 'dial:11', 'dial:9', 'dial:0', 'dial:1', 'dial:2', 'dial:3'],
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
