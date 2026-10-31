import { describe, expect, it } from 'vitest';
import { decidePattern, initialPatternMemory, updatePattern, type PatternMemory } from './pattern';
import type { Packet } from '../game/types';

const pkt = (keywords: [string, string, string], value: number): Packet => ({ keywords, value });
const stable = pkt(['ice', 'current', 'depth'], 50);

function trained(): PatternMemory {
  const memory = initialPatternMemory();
  memory.packets = [stable, pkt(['ice', 'current', 'depth'], 51), pkt(['ice', 'current', 'depth'], 49)];
  memory.values = [50, 51, 49];
  return memory;
}

describe('decidePattern', () => {
  it('relays until it has a moving window to compare against', () => {
    const decision = decidePattern(pkt(['beacon', 'cargo', 'crew'], 90), initialPatternMemory());
    expect(decision.kind).toBe('relay');
    expect(decision.trust.you).toBeCloseTo(1 / 3);
    expect(decision.trust.skeptic).toBeCloseTo(1 / 3);
    expect(decision.trust.explorer).toBeCloseTo(1 / 3);
  });

  it('relays a packet that sits on the moving average and known keywords', () => {
    expect(decidePattern(stable, trained()).kind).toBe('relay');
  });

  it('edits an anomalous number back toward the moving average', () => {
    const decision = decidePattern(pkt(['ice', 'current', 'depth'], 80), trained());
    expect(decision.kind).toBe('edit');
    expect(decision.edit).toEqual({ field: 'value', next: 50 });
  });

  it('edits a single unseen keyword toward the co-occurring partner', () => {
    const decision = decidePattern(pkt(['ice', 'current', 'beacon'], 50), trained());
    expect(decision.kind).toBe('edit');
    expect(decision.edit).toEqual({ field: 'keyword', index: 2, next: 'depth' });
  });

  it('drops when the value and the keyword set are both anomalous', () => {
    const decision = decidePattern(pkt(['beacon', 'cargo', 'crew'], 90), trained());
    expect(decision.kind).toBe('drop');
  });
});

describe('updatePattern', () => {
  it('records the observation and scores peers against its own emission', () => {
    const next = updatePattern(initialPatternMemory(), stable, stable, [
      { seat: 'pattern', packet: stable },
      { seat: 'you', packet: stable },
      { seat: 'skeptic', packet: pkt(['beacon', 'cargo', 'crew'], 0) },
      { seat: 'explorer', packet: null },
    ]);
    expect(next.values).toEqual([50]);
    expect(next.packets).toHaveLength(1);
    expect(next.peerFit.you.count).toBe(1);
    expect(next.peerFit.you.sum).toBeCloseTo(1);
    expect(next.peerFit.skeptic.sum).toBeLessThan(0.5);
    expect(next.peerFit.explorer.count).toBe(0);
  });
});
