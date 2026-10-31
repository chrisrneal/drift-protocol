import { describe, expect, it } from 'vitest';
import { decideExplorer, explorerContext, initialExplorerMemory, updateExplorer } from './explorer';
import type { Packet } from '../game/types';

const pkt = (keywords: [string, string, string], value: number): Packet => ({ keywords, value });
const observation = pkt(['ice', 'current', 'depth'], 40);

function zeros() {
  return () => 0;
}

describe('decideExplorer', () => {
  it('relays on a cold context when every arm is tied', () => {
    const memory = initialExplorerMemory();
    const decision = decideExplorer(observation, memory, zeros(), { epsilon: 0 });
    expect(explorerContext(observation, memory)).toBe('cold:novel');
    expect(decision.kind).toBe('relay');
    expect(decision.trust.you).toBeCloseTo(1 / 3);
  });

  it('exploits relay, edit, and drop from the Q table', () => {
    const context = 'cold:novel';
    for (const arm of ['relay', 'edit', 'drop'] as const) {
      const memory = initialExplorerMemory();
      memory.q[context] = { [arm]: 1 };
      const decision = decideExplorer(observation, memory, zeros(), { epsilon: 0 });
      expect(decision.kind).toBe(arm);
    }
  });

  it('attaches a real single-field edit when the edit arm wins', () => {
    const memory = initialExplorerMemory();
    memory.q['cold:novel'] = { edit: 1 };
    const decision = decideExplorer(observation, memory, zeros(), { epsilon: 0 });
    expect(decision.kind).toBe('edit');
    expect(decision.edit).toEqual({ field: 'keyword', index: 0, next: 'battery' });
  });

  it('explores a seeded arm when epsilon is 1', () => {
    const draws = [0, 0.9];
    let i = 0;
    const decision = decideExplorer(observation, initialExplorerMemory(), () => draws[i++] ?? 0, {
      epsilon: 1,
    });
    expect(decision.kind).toBe('drop');
  });
});

describe('updateExplorer', () => {
  it('moves the pulled arm toward the consensus reward', () => {
    const memory = initialExplorerMemory();
    const context = explorerContext(observation, memory);
    const next = updateExplorer(memory, {
      context,
      arm: 'relay',
      ownObservation: observation,
      ownEmission: observation,
      emissions: [
        { seat: 'explorer', packet: observation },
        { seat: 'you', packet: observation },
        { seat: 'skeptic', packet: observation },
        { seat: 'pattern', packet: observation },
      ],
    });
    expect(next.q[context]?.relay).toBeCloseTo(1);
    expect(next.pulls[context]?.relay).toBe(1);
    expect(next.values).toEqual([40]);
  });

  it('rewards a drop when the observation was far from the other seats', () => {
    const memory = initialExplorerMemory();
    const context = 'cold:novel';
    const others = pkt(['beacon', 'cargo', 'crew'], 90);
    const next = updateExplorer(memory, {
      context,
      arm: 'drop',
      ownObservation: observation,
      ownEmission: null,
      emissions: [
        { seat: 'explorer', packet: null },
        { seat: 'you', packet: others },
        { seat: 'skeptic', packet: others },
        { seat: 'pattern', packet: others },
      ],
    });
    expect(next.q[context]?.drop).toBeGreaterThan(0.7);
  });
});
