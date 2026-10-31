export const MIN_ROUNDS = 8;
export const MAX_ROUNDS = 12;
export const DEFAULT_ROUNDS = 10;

export const INTEGRITY_START = 4200;
export const INTEGRITY_MIN = 200;
export const INTEGRITY_MAX = 9800;
export const INTEGRITY_CREW = 7000;
export const INTEGRITY_SABOTEUR_BELOW = 5500;

export const DELTA_ALIGNED = 400;
export const DELTA_FALSE_CONSENSUS = -450;
export const DELTA_NEAR_CLUSTER = -350;
export const DELTA_SPLIT = -200;

export const NOTES_MAX = 2000;

export const CREW_EXACT_BELOW = 0.82;
export const CREW_NEAR_BELOW = 0.97;

export const CALL_SUSPICION = 0.4;
export const FRAME_BELOW = 0.12;
export const FRAME_SUSPICION = 0.3;
export const SELF_VOTE_BELOW = 0.08;

export const MISS_EXACT = 0;
export const MISS_NEAR = 0.55;
export const MISS_BLATANT = 1;
export const SUSPICION_MISS_WEIGHT = 0.75;
export const SUSPICION_PATTERN_WEIGHT = 0.25;

export const ROLE_STREAM_MASK = 0xa5a5a5a5;
export const PUZZLE_STREAM_MASK = 0x0b47c1ec;
export const PUZZLE_STREAM_ADD = 0x6d2b79f5;
export const ITEM_STREAM_MASK = 0x71e1e000;
export const ITEM_STREAM_ADD = 0x85ebca6b;
export const CHECKIN_STREAM_MASK = 0x0c1ec31a;
export const VOTE_STREAM_MASK = 0x707e0001;

export const PLAN_THREE = {
  honestBelow: 0.5,
  oneNearBelow: 0.8,
  twoNearBelow: 0.92,
  blatantBelow: 0.97,
} as const;

export const PLAN_TWO = {
  honestBelow: 0.58,
  oneNearBelow: 0.88,
  blatantBelow: 0.96,
} as const;

export const PLAN_ONE = {
  honestBelow: 0.72,
  nearBelow: 0.95,
} as const;
