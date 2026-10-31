export const SEATS = ['you', 'skeptic', 'pattern', 'explorer'] as const;
export type SeatId = (typeof SEATS)[number];

export const AI_SEATS = ['skeptic', 'pattern', 'explorer'] as const;
export type AiSeatId = (typeof AI_SEATS)[number];

export type Packet = {
  keywords: [string, string, string];
  value: number;
};

export type ActionKind = 'relay' | 'edit' | 'drop';

export type FieldEdit =
  | { field: 'keyword'; index: 0 | 1 | 2; next: string }
  | { field: 'value'; next: number };

export type TrustWeights = Partial<Record<SeatId, number>>;

export type Decision = {
  kind: ActionKind;
  edit?: FieldEdit;
  trust: TrustWeights;
};

export type HumanChoice = {
  kind: ActionKind;
  edit?: FieldEdit;
  trust: Record<AiSeatId, number>;
};

export type Emission = {
  seat: SeatId;
  packet: Packet | null;
};

export type ReliabilityStats = {
  sum: number;
  count: number;
};
