import { LEXICON, SABOTAGE_DROP_AT, SABOTAGE_HONEST, TRUTH_VALUE_MAX, TRUTH_VALUE_MIN } from '../game/constants';
import { clamp } from '../game/rng';
import type { Decision, FieldEdit, Packet } from '../game/types';

export function sabotageDecision(
  observation: Packet,
  honest: Decision,
  rng: () => number,
  roundIndex: number,
): Decision {
  if (roundIndex < 1) return honest;
  const roll = rng();
  if (roll < SABOTAGE_HONEST) return honest;
  if (roll >= SABOTAGE_DROP_AT) return { kind: 'drop', trust: honest.trust };
  return { kind: 'edit', edit: corruptEdit(observation, rng), trust: honest.trust };
}

function corruptEdit(observation: Packet, rng: () => number): FieldEdit {
  if (rng() < 0.5) {
    const magnitude = 10 + Math.floor(rng() * 7);
    const direction = rng() < 0.5 ? -1 : 1;
    let next = clamp(observation.value + direction * magnitude, TRUTH_VALUE_MIN, TRUTH_VALUE_MAX);
    if (next === observation.value) {
      next = clamp(observation.value - direction * magnitude, TRUTH_VALUE_MIN, TRUTH_VALUE_MAX);
    }
    return { field: 'value', next };
  }
  const index = Math.min(2, Math.floor(rng() * 3)) as 0 | 1 | 2;
  const choices = LEXICON.filter((word) => !observation.keywords.includes(word));
  const next = choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))] ?? 'sonar';
  return { field: 'keyword', index, next };
}
