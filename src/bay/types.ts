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
export type CellSign = 1 | -1;
export type Posture = 'honest' | 'near-miss' | 'blatant';
export type ErrorClass = 'exact' | 'near-miss' | 'blatant';

export const GLYPH_ALPHABET = ['B', 'D', 'F', 'H', 'K', 'P', 'R', 'T'] as const;
export type GlyphSymbol = (typeof GLYPH_ALPHABET)[number];
export type ReadingLabel = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export type BayAnswer =
  | { kind: 'dial'; detent: number }
  | { kind: 'reading'; label: ReadingLabel }
  | { kind: 'glyph'; symbol: GlyphSymbol };

export type DialPuzzle = {
  kind: 'dial';
  a: number;
  b: number;
  truth: number;
  near: [number, number];
  blatant: number[];
};

export type ReadingOption = {
  label: ReadingLabel;
  value: number;
  role: 'true' | 'near' | 'far';
};

export type ReadingPuzzle = {
  kind: 'reading';
  anchor: number;
  offset: number;
  band: [number, number];
  options: [ReadingOption, ReadingOption, ReadingOption, ReadingOption, ReadingOption];
  truth: ReadingLabel;
  near: [ReadingLabel];
  blatant: ReadingLabel[];
};

export type GlyphPuzzle = {
  kind: 'glyph';
  indexes: [number, number, number, number];
  blank: 0 | 1 | 2 | 3;
  seal: number;
  shown: [GlyphSymbol | null, GlyphSymbol | null, GlyphSymbol | null, GlyphSymbol | null];
  truth: GlyphSymbol;
  near: [GlyphSymbol, GlyphSymbol];
  blatant: GlyphSymbol[];
};

export type Puzzle = DialPuzzle | ReadingPuzzle | GlyphPuzzle;

export type Fingerprint = {
  errorClass: ErrorClass;
  distance: number;
  instrumentId: string;
};

export type Cell = {
  saboteurs: [BaySeatId, BaySeatId, BaySeatId];
  sign: CellSign;
  roles: Record<BaySeatId, Role>;
};

export type RoleView =
  | { role: 'crew' }
  | { role: 'saboteur'; partners: BaySeatId[]; sign: CellSign; plan: Posture | null };

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
