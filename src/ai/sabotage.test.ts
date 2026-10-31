import { describe, expect, it } from 'vitest';
import { applyDecision } from '../game/actions';
import { packetSimilarity } from '../game/scoring';
import type { Decision, Packet } from '../game/types';
import { sabotageDecision } from './sabotage';

const observation: Packet = { keywords: ['ice', 'current', 'depth'], value: 50 };
const honest: Decision = { kind: 'relay', trust: { you: 1, pattern: 0, explorer: 0 } };

describe('saboteur signal corruption', () => {
  it('leaves round 1 honest so the seat can blend in', () => {
    expect(sabotageDecision(observation, honest, () => 0.99, 0)).toEqual(honest);
  });

  it('keeps the honest action inside the blend-in band', () => {
    expect(sabotageDecision(observation, honest, () => 0.61, 2).kind).toBe('relay');
  });

  it('prefers an edit that lowers agreement with the heard packet', () => {
    let index = 0;
    const rolls = [0.7, 0.1, 0.4, 0];
    const decision = sabotageDecision(observation, honest, () => rolls[index++] ?? 0, 2);
    expect(decision.kind).toBe('edit');
    expect(decision.trust).toEqual(honest.trust);
    const sent = applyDecision(observation, decision);
    expect(sent).not.toBeNull();
    if (!sent) return;
    expect(packetSimilarity(sent, observation)).toBeLessThan(1);
  });

  it('drops only on the rare high roll', () => {
    const decision = sabotageDecision(observation, honest, () => 0.95, 3);
    expect(decision.kind).toBe('drop');
    expect(decision.trust).toEqual(honest.trust);
  });
});
