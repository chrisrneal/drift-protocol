import type { SeatId } from './types';

export const RESCUE_START = 0.42;
export const RESCUE_WIN = 0.6;
/** Saboteur survives the watch only when rescue finishes strictly below this. */
export const RESCUE_FAIL = 0.5;

/** Share of post-round-1 rolls where a saboteur AI copies the honest crew policy. */
export const SABOTAGE_HONEST = 0.62;
/** Rolls at or above this, and outside the honest band, become a drop. The rest are edits. */
export const SABOTAGE_DROP_AT = 0.9;
export const SABOTEUR_SELF_VOTE = 0.08;
export const ACCUSE_SCORE = 0.55;
export const FRAME_CHANCE = 0.12;
export const FRAME_SCORE = 0.35;
export const RESCUE_NEUTRAL = 0.55;
export const RESCUE_STEP = 0.12;
export const RESCUE_MIN = 0.02;
export const RESCUE_MAX = 0.98;
export const CONSISTENCY_WEIGHT = 0.7;
export const ALIGNMENT_WEIGHT = 0.3;

export const VALUE_SCALE = 25;
export const VALUE_BAND = 8;
export const MIN_ROUNDS = 8;
export const MAX_ROUNDS = 12;
export const DEFAULT_ROUNDS = 10;

export const DRIFT_CHANCE = 0.35;
export const DRIFT_SPAN = 4;
export const TRUTH_VALUE_MIN = 0;
export const TRUTH_VALUE_MAX = 100;

export const SKEPTIC_PRIOR = 2;
export const SKEPTIC_VALUE_EDIT = 6;
export const SKEPTIC_VALUE_DROP = 12;
export const SKEPTIC_KEYWORD_DROP = 2;
export const SKEPTIC_HIT = 0.75;
export const SKEPTIC_MISS = 0.45;
export const SKEPTIC_DROP_BETA = 0.5;
export const SKEPTIC_MEMORY = 3;

export const PATTERN_MIN_HISTORY = 3;
export const PATTERN_WINDOW = 5;

export const EXPLORER_EPSILON = 0.2;
export const EXPLORER_DROP_REWARD = 0.75;
export const EXPLORER_KEEP_REWARD = 0.25;
export const EXPLORER_CONTEXT_WINDOW = 5;

export const LEXICON = [
  'ice',
  'current',
  'depth',
  'salinity',
  'pressure',
  'beacon',
  'hull',
  'battery',
  'storm',
  'drift',
  'oxygen',
  'thermal',
  'sonar',
  'cargo',
  'crew',
  'latitude',
] as const;

export type LexiconWord = (typeof LEXICON)[number];

export const CHANNELS: Record<SeatId, { flip: number; jitter: number; grade: string; blurb: string }> = {
  you: { flip: 0.15, jitter: 5, grade: 'Fair', blurb: 'Watch lead. Your hand is the only one on this console.' },
  skeptic: {
    flip: 0.1,
    jitter: 4,
    grade: 'Stable',
    blurb: 'Beta trust in the other seats. Edits toward the trusted consensus, drops a packet that fights it.',
  },
  pattern: {
    flip: 0.22,
    jitter: 3,
    grade: 'Mixed',
    blurb: 'Moving average and keyword co-occurrence. Relays a familiar signal, edits one anomaly, drops a mess.',
  },
  explorer: {
    flip: 0.28,
    jitter: 8,
    grade: 'Rough',
    blurb: 'Epsilon-greedy bandit over relay, edit, and drop. Learns which arm helped recent contexts.',
  },
};
