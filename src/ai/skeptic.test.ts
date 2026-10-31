import { describe, expect, it } from 'vitest';
import { decideSkeptic, initialSkepticMemory, updateSkeptic } from './skeptic';
import type { Packet } from '../game/types';

const pkt = (keywords: [string, string, string], value: number): Packet => ({ keywords, value });
const consensus = pkt(['ice', 'current', 'depth'], 50);

function memoryWithConsensus() {
  const memory = initialSkepticMemory();
  memory.recentRounds.push([
    { seat: 'you', packet: consensus },
    { seat: 'pattern', packet: consensus },
    { seat: 'explorer', packet: consensus },
    { seat: 'skeptic', packet: consensus },
  ]);
  return memory;
}

describe('decideSkeptic', () => {
  it('relays and trusts peers evenly when it has no history', () => {
    const decision = decideSkeptic(consensus, initialSkepticMemory());
    expect(decision.kind).toBe('relay');
    expect(decision.edit).toBeUndefined();
    expect(decision.trust.you).toBeCloseTo(1 / 3);
    expect(decision.trust.pattern).toBeCloseTo(1 / 3);
    expect(decision.trust.explorer).toBeCloseTo(1 / 3);
  });

  it('relays when the observation already matches the trusted consensus', () => {
    const decision = decideSkeptic(consensus, memoryWithConsensus());
    expect(decision.kind).toBe('relay');
  });

  it('edits the number toward the trusted consensus when only the value disagrees', () => {
    const decision = decideSkeptic(pkt(['ice', 'current', 'depth'], 80), memoryWithConsensus());
    expect(decision.kind).toBe('edit');
    expect(decision.edit).toEqual({ field: 'value', next: 50 });
  });

  it('edits the first keyword that is outside the consensus set', () => {
    const decision = decideSkeptic(pkt(['ice', 'current', 'storm'], 50), memoryWithConsensus());
    expect(decision.kind).toBe('edit');
    expect(decision.edit).toEqual({ field: 'keyword', index: 2, next: 'depth' });
  });

  it('drops a packet that disagrees in both value and keywords', () => {
    const decision = decideSkeptic(pkt(['beacon', 'cargo', 'crew'], 90), memoryWithConsensus());
    expect(decision.kind).toBe('drop');
    expect(decision.trust.you).toBeCloseTo(1 / 3);
  });
});

describe('updateSkeptic', () => {
  it('increases alpha when a peer emission matches the skeptic emission', () => {
    const next = updateSkeptic(initialSkepticMemory(), [
      { seat: 'skeptic', packet: consensus },
      { seat: 'pattern', packet: consensus },
      { seat: 'you', packet: consensus },
      { seat: 'explorer', packet: null },
    ]);
    expect(next.alpha.pattern).toBe(3);
    expect(next.beta.pattern).toBe(2);
    expect(next.beta.explorer).toBe(2.5);
    expect(next.recentRounds).toHaveLength(1);
  });

  it('increases beta when a peer emission is far from the skeptic emission', () => {
    const next = updateSkeptic(initialSkepticMemory(), [
      { seat: 'skeptic', packet: consensus },
      { seat: 'you', packet: pkt(['beacon', 'cargo', 'crew'], 0) },
      { seat: 'pattern', packet: consensus },
      { seat: 'explorer', packet: consensus },
    ]);
    expect(next.beta.you).toBe(3);
    expect(next.alpha.you).toBe(2);
  });
});
