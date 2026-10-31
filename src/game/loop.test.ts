import { describe, expect, it } from 'vitest';
import { createSession, nextRound, submitRound } from './loop';
import { nextRescue } from './scoring';
import { applyDecision } from './actions';

const trust = { skeptic: 1, pattern: 1, explorer: 1 };

describe('session loop', () => {
  it('reproduces the opening signal from the seed', () => {
    const a = createSession({ rounds: 10, seed: 42 });
    const b = createSession({ rounds: 10, seed: 42 });
    expect(a.truth).toEqual(b.truth);
    expect(a.observations).toEqual(b.observations);
    expect(a.rescue).toBeCloseTo(0.42);
    expect(a.phase).toBe('play');
  });

  it('rejects round counts outside 8–12', () => {
    expect(() => createSession({ rounds: 7, seed: 1 })).toThrow(/8/);
    expect(() => createSession({ rounds: 13, seed: 1 })).toThrow(/12/);
  });

  it('applies the human action, hides nothing after resolve, and wires rescue to scoring', () => {
    let session = createSession({ rounds: 8, seed: 3 });
    session = submitRound(session, {
      kind: 'edit',
      edit: { field: 'value', next: session.observations.you.value + 4 },
      trust,
    });
    const resolution = session.resolution;
    expect(resolution).not.toBeNull();
    if (!resolution) return;
    expect(resolution.emissions.you?.value).toBe(session.observations.you.value + 4);
    expect(resolution.decisions.skeptic.kind).toBe('relay');
    expect(resolution.decisions.pattern.kind).toBe('relay');
    expect(['relay', 'edit', 'drop']).toContain(resolution.decisions.explorer.kind);
    expect(resolution.rescueAfter).toBeCloseTo(
      nextRescue(resolution.rescueBefore, resolution.consistency, resolution.alignment),
    );
    for (const seat of ['you', 'skeptic', 'pattern', 'explorer'] as const) {
      expect(resolution.truth.keywords).toHaveLength(3);
      expect(resolution.observations[seat].keywords).toHaveLength(3);
    }
  });

  it('plays a full watch of relays and then closes', () => {
    let session = createSession({ rounds: 8, seed: 11 });
    for (let round = 0; round < 8; round += 1) {
      expect(session.phase).toBe('play');
      expect(session.roundIndex).toBe(round);
      session = submitRound(session, { kind: 'relay', trust });
      expect(session.phase).toBe('resolved');
      session = nextRound(session);
    }
    expect(session.phase).toBe('done');
    expect(session.log).toHaveLength(8);
    expect(session.rescue).toBeGreaterThanOrEqual(0.02);
    expect(session.rescue).toBeLessThanOrEqual(0.98);
  });

  it('emits null when the human drops', () => {
    const session = submitRound(createSession({ rounds: 10, seed: 1 }), { kind: 'drop', trust });
    expect(session.resolution?.emissions.you).toBeNull();
  });
});

describe('applyDecision', () => {
  const packet = { keywords: ['ice', 'current', 'depth'] as [string, string, string], value: 20 };

  it('relays, edits one field, or drops', () => {
    expect(applyDecision(packet, { kind: 'relay' })).toEqual(packet);
    expect(applyDecision(packet, { kind: 'drop' })).toBeNull();
    expect(
      applyDecision(packet, { kind: 'edit', edit: { field: 'keyword', index: 1, next: 'sonar' } }),
    ).toEqual({ keywords: ['ice', 'sonar', 'depth'], value: 20 });
    expect(applyDecision(packet, { kind: 'edit', edit: { field: 'value', next: 22 } })).toEqual({
      keywords: ['ice', 'current', 'depth'],
      value: 22,
    });
  });
});
