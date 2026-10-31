export const BAY_SEATS = ['helm', 'sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo'] as const;
export type BaySeatId = (typeof BAY_SEATS)[number];

export const SEAT_NAME: Record<BaySeatId, string> = {
  helm: 'Helm',
  sonar: 'Sonar',
  radio: 'Radio',
  nav: 'Nav',
  plant: 'Plant',
  deck: 'Deck',
  medic: 'Medic',
  cargo: 'Cargo',
};

export const INSTRUMENT: Record<BaySeatId, string> = {
  helm: 'INST-1',
  sonar: 'INST-2',
  radio: 'INST-3',
  nav: 'INST-4',
  plant: 'INST-5',
  deck: 'INST-6',
  medic: 'INST-7',
  cargo: 'INST-8',
};

export type Controller = 'human' | 'ai';
export type Role = 'crew' | 'saboteur';
export type CellLean = 'step' | 'trap';
export type Difficulty = 'easy' | 'medium' | 'harder';
export type Posture = 'honest' | 'near-miss' | 'blatant';
export type ErrorClass = 'exact' | 'near-miss' | 'blatant';
export type ChoiceLabel = 'A' | 'B' | 'C' | 'D' | 'E';
export type OddIndex = 1 | 2 | 3 | 4;

export type BayAnswer =
  | { kind: 'fact'; label: ChoiceLabel }
  | { kind: 'number'; value: number }
  | { kind: 'number'; label: ChoiceLabel }
  | { kind: 'odd'; index: OddIndex };

export type FactOption = {
  label: ChoiceLabel;
  text: string;
  role: 'true' | 'near' | 'far';
};

export type NumberOption = {
  label: ChoiceLabel;
  value: number;
  role: 'true' | 'near' | 'anti' | 'far';
};

export type OddOption = {
  index: OddIndex;
  text: string;
  role: 'true' | 'near' | 'far';
};

export type FactPuzzle = {
  kind: 'fact';
  id: string;
  difficulty: Difficulty;
  prompt: string;
  options: [FactOption, FactOption, FactOption, FactOption, FactOption];
  truth: ChoiceLabel;
  near: [ChoiceLabel];
  blatant: ChoiceLabel[];
};

export type NumberPuzzle = {
  kind: 'number';
  id: string;
  difficulty: Difficulty;
  prompt: string;
  options: [NumberOption, NumberOption, NumberOption, NumberOption, NumberOption];
  truth: number;
  step: number;
  trap: number;
  near: [number];
  blatant: number[];
};

export type OddPuzzle = {
  kind: 'odd';
  id: string;
  difficulty: Difficulty;
  prompt: string;
  options: [OddOption, OddOption, OddOption, OddOption];
  truth: OddIndex;
  near: [OddIndex];
  blatant: OddIndex[];
};

export type Puzzle = FactPuzzle | NumberPuzzle | OddPuzzle;

export type Fingerprint = {
  errorClass: ErrorClass;
  distance: number;
  instrumentId: string;
};

export type Cell = {
  saboteurs: [BaySeatId, BaySeatId, BaySeatId];
  lean: CellLean;
  roles: Record<BaySeatId, Role>;
};

export type RoleView =
  | { role: 'crew' }
  | {
      role: 'saboteur';
      partners: BaySeatId[];
      lean: CellLean;
      plan: Posture | null;
      choice: string | null;
    };

export type BayPhase = 'check-in' | 'discuss' | 'meeting' | 'done';
export type IntegrityRow = 'aligned' | 'false-consensus' | 'near-miss-cluster' | 'split';

export type BoardRow =
  | { seat: BaySeatId; absent: true }
  | { seat: BaySeatId; absent: false; answer: BayAnswer; fingerprint: Fingerprint };

export type CheckInRecord = {
  roundIndex: number;
  puzzle: Puzzle;
  rows: BoardRow[];
  integrityBefore: number;
  integrityAfter: number;
  row: IntegrityRow;
  delta: number;
};

export type PendingCall = {
  caller: BaySeatId;
  nominated: BaySeatId;
};

export type BayBallot = {
  voter: BaySeatId;
  choice: BaySeatId | 'skip';
};

export type MeetingRecord = {
  roundIndex: number;
  caller: BaySeatId;
  nominated: BaySeatId;
  votes: BayBallot[];
  ejected: BaySeatId | null;
  ejectedRole: Role | null;
};

export type BayWinReason =
  | 'saboteurs-ejected'
  | 'integrity-window'
  | 'integrity-held'
  | 'crew-eliminated'
  | 'stalemate';

export type BaySession = {
  rounds: number;
  seed: number;
  roundIndex: number;
  integrity: number;
  phase: BayPhase;
  puzzle: Puzzle;
  cell: Cell;
  controllers: Record<BaySeatId, Controller>;
  ejected: BaySeatId[];
  log: CheckInRecord[];
  meetings: MeetingRecord[];
  meeting: { caller: BaySeatId; nominated: BaySeatId } | null;
  pendingCall: PendingCall | null;
  prepared: Partial<Record<BaySeatId, BayAnswer>>;
  plan: { draw: number; postures: Partial<Record<BaySeatId, Posture>> } | null;
  checkInState: number;
  voteState: number;
  winner: 'crew' | 'saboteur' | 'draw' | null;
  winReason: BayWinReason | null;
};
