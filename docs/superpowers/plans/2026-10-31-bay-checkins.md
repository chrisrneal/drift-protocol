# Parallel Bay Check-ins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-seat signal loop with a solo bay watch: Helm plus seven AIs, three saboteurs, parallel check-ins, fingerprints, and an integrity meter.

**Architecture:** Build the new watch under `src/bay/` and leave `src/game/loop.ts` running until the last task. Pure modules own roles, puzzles, fingerprints, integrity, AI draws, and the session. React screens in `src/bay/ui/` read that session and keep notes in component state. The last task points `src/main.tsx` at the bay client and deletes the signal loop. `majorityEject` keeps the existing strict-majority count (`Math.floor(n / 2) + 1`) and becomes generic so both seat id unions can use it until cutover. Draws keep using `rngStep` and `intBetween` from `src/game/rng.ts`.

**Tech Stack:** Vite + React + TypeScript PWA, client-side only, existing vitest setup (`npm test` is `vitest run`, include `src/**/*.test.ts`, environment `node`). No new dependencies. UI is typechecked by `npm run build` (`tsc --noEmit && vite build`). Do not add a DOM test runner.

This is one plan. The backlog is a single ordered cutover: later slices call earlier functions, and the client switches only at the end. Do not land the slices as separate projects.

## Global Constraints

- Solo play is one human and seven AIs. The human is always Helm. Helm's saboteur chance is 3/8, the same as every other seat.
- Seat ids, in roster order: `helm`, `sonar`, `radio`, `nav`, `plant`, `deck`, `medic`, `cargo`. Display names: Helm, Sonar, Radio, Nav, Plant, Deck, Medic, Cargo. Instruments: `INST-1` through `INST-8` in that same order.
- A seat is an id, a display name, an instrument id, and a controller (`human` or `ai`). Solo sets Helm to `human` and the other seven to `ai`.
- Exactly three saboteurs and five crew. Saboteurs know each other. There is no saboteur chat channel.
- The cell has one sign for the whole watch, `+1` or `-1`.
- A watch is 8, 9, 10, 11, or 12 check-ins. The default is 10.
- Integrity starts at 42.0%, stored as 4200 basis points. Deltas are +400 aligned, −450 false consensus, −350 same-key near-miss cluster, and −200 split, in that priority. Clamp to 200–9800. The console shows one decimal.
- Crew meter win: finish at or above 7000. Saboteur meter win: finish strictly below 5500 with a saboteur still aboard. Stalemate: finish from 5500 up to but not including 7000 with a saboteur still aboard.
- The meter moves on every check-in, including round 1. Crossing 70% or falling below 55% does not end the watch. Meter wins are scored only at the round limit when no ejection has already ended the watch.
- Round flow is check-in, reveal, discuss, optional vote, then the next check-in or the summary. Round 1 discuss allows notes and does not run the AI call. Ballots stay closed until Helm leaves discuss toward a vote. From round 2, advancing without ballots spends that round's one accusation.
- Notes are a local scratchpad of at most 2000 characters. They are unscored, invisible to AIs, and off every RNG stream.
- One accusation per round from the discuss phase of round 2. Strict majority ejects: 8→5, 7→4, 6→4, 5→3, 4→3, 3→2, 2→2. Ejected seats stay on the roster and cannot check in or vote.
- Ejecting the last saboteur is an immediate crew win (`saboteurs-ejected`). Ejecting the last crew seat is an immediate saboteur win (`crew-eliminated`). Any other ejection continues the watch and publishes no role.
- Crew AI check-ins use 0.82 exact, 0.15 near-miss, 0.03 blatant. Saboteur AI plans and the suspicion mix (exact 0, near-miss 0.55, blatant 1; suspicion `0.75 * miss mean + 0.25 * pattern`; call at 0.40; frame below 0.12 and at or above 0.30; self-vote below 0.08) are the tables in `docs/game-rules.md`.
- Language-model agents, accounts, voice, matchmaking, and netcode are out of scope. Do not add them.
- Do not widen `SEATS` in `src/game/types.ts`. Do not import bay seats into `src/game/loop.ts`. Keep `npm test` and `npm run build` green after every task.
- If a number in the design spec disagrees with `docs/game-rules.md`, `docs/game-rules.md` wins. The numbers in this plan match both documents.
- New production modules live in `src/bay/` until Task 18. Tests stay `*.test.ts` next to the module they cover.

---

## File structure

Create these files. Each one has one job.

| File | Responsibility |
| --- | --- |
| `src/bay/types.ts` | Seat roster, answers, puzzles, fingerprints, cell, session, and win-reason types |
| `src/bay/constants.ts` | Locked numeric thresholds and stream masks |
| `src/bay/roles.ts` | Role-stream shuffle, solo controllers, per-viewer cell visibility, living seats |
| `src/bay/puzzles.ts` | Puzzle reseed and the three generators, plus truth / near / blatant lists |
| `src/bay/fingerprint.ts` | Distance, error class, canonical key, fingerprint |
| `src/bay/integrity.ts` | Board row, basis-point update, end-of-watch meter bands, decimal formatting |
| `src/bay/notes.ts` | 2000-character clamp. Not stored on the session |
| `src/bay/streams.ts` | Check-in and vote stream starting states |
| `src/bay/session.ts` | Create a watch, lock a check-in, advance, finish at the round limit |
| `src/bay/meeting.ts` | Open one accusation, apply ballots, ejection wins |
| `src/bay/vote.ts` | Generic `majorityEject` |
| `src/bay/plan.ts` | Cell-plan table for 3, 2, and 1 living saboteurs |
| `src/bay/answers.ts` | Per-round AI answers from the check-in stream |
| `src/bay/suspicion.ts` | Miss weights, signed direction, suspicion, who a seat would name |
| `src/bay/nominate.ts` | Pending nomination and AI ballots |
| `src/bay/ui/controls.ts` | Which discuss and check-in buttons are available |
| `src/bay/ui/prompt.ts` | Public puzzle facts. Does not return the true answer |
| `src/bay/ui/format.ts` | Seat labels and integrity text used by the screens |
| `src/bay/ui/RoleBanner.tsx` | Crew view or saboteur cell view |
| `src/bay/ui/CheckInScreen.tsx` | Private check-in |
| `src/bay/ui/DiscussScreen.tsx` | Board, notes, advance, accuse |
| `src/bay/ui/VoteScreen.tsx` | Helm's ballot |
| `src/bay/ui/SummaryScreen.tsx` | Verdict and every role |
| `src/bay/ui/StartScreen.tsx` | Rounds, seed, eight-seat roster |
| `src/bay/ui/BayApp.tsx` | Client state machine. Notes live here, not on the session |

Modify only these existing files before cutover:

| File | When | Change |
| --- | --- | --- |
| `src/game/vote.ts` | Task 11 | Delete the local `majorityEject` body and re-export the generic function from `src/bay/vote.ts`. Leave the rescue verdicts in place |
| `src/ui/console.css` | Task 10 | Add textarea to the control font rule, plus `.notes`, `.board`, and `.fingerprint`. Do not restyle the legacy screens |

Task 18 deletes the signal loop and switches the client. Until that task, `src/main.tsx` keeps rendering `src/ui/App.tsx`.

Delete in Task 18, and not before:

- `src/ai/accuse.ts`, `src/ai/accuse.test.ts`
- `src/ai/explorer.ts`, `src/ai/explorer.test.ts`
- `src/ai/pattern.ts`, `src/ai/pattern.test.ts`
- `src/ai/sabotage.ts`, `src/ai/sabotage.test.ts`
- `src/ai/skeptic.ts`, `src/ai/skeptic.test.ts`
- `src/game/actions.ts`
- `src/game/constants.ts`
- `src/game/loop.ts`, `src/game/loop.test.ts`
- `src/game/propose.ts`
- `src/game/roles.ts`, `src/game/roles.test.ts`
- `src/game/scoring.ts`, `src/game/scoring.test.ts`
- `src/game/signals.ts`
- `src/game/social.test.ts`
- `src/game/types.ts`
- `src/game/vote.ts`, `src/game/vote.test.ts`
- `src/ui/App.tsx`, `src/ui/format.ts`, `src/ui/MeetingScreen.tsx`, `src/ui/ResultStrip.tsx`, `src/ui/RoleBanner.tsx`, `src/ui/RoundScreen.tsx`, `src/ui/StartScreen.tsx`, `src/ui/SummaryScreen.tsx`

Keep `src/game/rng.ts` and `src/ui/console.css`. After Task 18 the running client is `src/bay/ui/BayApp.tsx`.

Commands used throughout:

```bash
npm test -- src/bay/<file>.test.ts
npm test
npm run build
```

`npm test` must still pass the legacy suite until Task 18 removes it. A task is done only when its new test passes and the legacy suite still passes. Run the full pair at the end of Tasks 2, 6, 7, 10, 12, 16, 17, and 18.

---

## Task 1: Roster, constants, and domain types

**Files:**
- Create: `src/bay/types.ts`
- Create: `src/bay/constants.ts`
- Test: `src/bay/roster.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `BAY_SEATS`, `BaySeatId`, `SEAT_NAME`, `INSTRUMENT`, `Controller`, `Role`, `CellSign`, `Posture`, `ErrorClass`, `GlyphSymbol`, `GLYPH_ALPHABET`, `ReadingLabel`, `BayAnswer`, `Puzzle` and its three branches, `Fingerprint`, `Cell`, `RoleView`, `BayPhase`, `BoardRow`, `IntegrityRow`, `CheckInRecord`, `PendingCall`, `BayBallot`, `MeetingRecord`, `BayWinReason`, `BaySession`. Constants: `MIN_ROUNDS` 8, `MAX_ROUNDS` 12, `DEFAULT_ROUNDS` 10, `INTEGRITY_START` 4200, `INTEGRITY_MIN` 200, `INTEGRITY_MAX` 9800, `INTEGRITY_CREW` 7000, `INTEGRITY_SABOTEUR_BELOW` 5500, `DELTA_ALIGNED` 400, `DELTA_FALSE_CONSENSUS` -450, `DELTA_NEAR_CLUSTER` -350, `DELTA_SPLIT` -200, `NOTES_MAX` 2000, `CREW_EXACT_BELOW` 0.82, `CREW_NEAR_BELOW` 0.97, `CALL_SUSPICION` 0.40, `FRAME_BELOW` 0.12, `FRAME_SUSPICION` 0.30, `SELF_VOTE_BELOW` 0.08, `MISS_EXACT` 0, `MISS_NEAR` 0.55, `MISS_BLATANT` 1, `SUSPICION_MISS_WEIGHT` 0.75, `SUSPICION_PATTERN_WEIGHT` 0.25, `ROLE_STREAM_MASK` `0xa5a5a5a5`, `PUZZLE_STREAM_MASK` `0x0b47c1ec`, `PUZZLE_STREAM_ADD` `0x6d2b79f5`, `CHECKIN_STREAM_MASK` `0x0c1ec31a`, `VOTE_STREAM_MASK` `0x707e0001`, `PLAN_THREE`, `PLAN_TWO`, `PLAN_ONE` as written below.

- [ ] **Step 1: Write the failing test**

Create `src/bay/roster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUNDS,
  DELTA_ALIGNED,
  DELTA_FALSE_CONSENSUS,
  DELTA_NEAR_CLUSTER,
  DELTA_SPLIT,
  INTEGRITY_CREW,
  INTEGRITY_MAX,
  INTEGRITY_MIN,
  INTEGRITY_SABOTEUR_BELOW,
  INTEGRITY_START,
  MAX_ROUNDS,
  MIN_ROUNDS,
  NOTES_MAX,
} from './constants';
import { BAY_SEATS, INSTRUMENT, SEAT_NAME } from './types';

describe('bay roster', () => {
  it('lists eight seats in roster order with fixed instruments and names', () => {
    expect(BAY_SEATS).toEqual(['helm', 'sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo']);
    expect(SEAT_NAME.helm).toBe('Helm');
    expect(SEAT_NAME.sonar).toBe('Sonar');
    expect(SEAT_NAME.radio).toBe('Radio');
    expect(SEAT_NAME.nav).toBe('Nav');
    expect(SEAT_NAME.plant).toBe('Plant');
    expect(SEAT_NAME.deck).toBe('Deck');
    expect(SEAT_NAME.medic).toBe('Medic');
    expect(SEAT_NAME.cargo).toBe('Cargo');
    expect(BAY_SEATS.map((seat) => INSTRUMENT[seat])).toEqual([
      'INST-1',
      'INST-2',
      'INST-3',
      'INST-4',
      'INST-5',
      'INST-6',
      'INST-7',
      'INST-8',
    ]);
  });

  it('locks the watch length and the integrity scale', () => {
    expect(MIN_ROUNDS).toBe(8);
    expect(MAX_ROUNDS).toBe(12);
    expect(DEFAULT_ROUNDS).toBe(10);
    expect(NOTES_MAX).toBe(2000);
    expect(INTEGRITY_START).toBe(4200);
    expect(INTEGRITY_MIN).toBe(200);
    expect(INTEGRITY_MAX).toBe(9800);
    expect(INTEGRITY_CREW).toBe(7000);
    expect(INTEGRITY_SABOTEUR_BELOW).toBe(5500);
    expect(DELTA_ALIGNED).toBe(400);
    expect(DELTA_FALSE_CONSENSUS).toBe(-450);
    expect(DELTA_NEAR_CLUSTER).toBe(-350);
    expect(DELTA_SPLIT).toBe(-200);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/roster.test.ts`

Expected: FAIL. Vitest cannot load `./constants` or `./types`.

- [ ] **Step 3: Write the types and constants**

Create `src/bay/constants.ts`:

```ts
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
```

Create `src/bay/types.ts`:

```ts
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
```

`BaySession` has no notes field. Notes stay in `BayApp`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/roster.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/bay/types.ts src/bay/constants.ts src/bay/roster.test.ts
git commit -m "feat: lock the bay roster and integrity scale"
```

---

## Task 2: Role stream, visibility, and solo controllers

**Files:**
- Create: `src/bay/roles.ts`
- Test: `src/bay/roles.test.ts`

**Interfaces:**
- Consumes: `BAY_SEATS`, `BaySeatId`, `Cell`, `CellSign`, `Controller`, `Posture`, `RoleView`, `ROLE_STREAM_MASK`, `intBetween` from `src/game/rng.ts`
- Produces:
  - `assignCell(seed: number): Cell`
  - `soloControllers(): Record<BaySeatId, Controller>`
  - `viewFor(seat: BaySeatId, cell: Cell, plan: Posture | null): RoleView`
  - `livingSeats(ejected: readonly BaySeatId[]): BaySeatId[]`

Saboteurs are displayed in roster order, not shuffle order. Sign draw `0` is `-1` and `1` is `+1`. The role stream is not advanced again during the watch. A crew view is exactly `{ role: 'crew' }`. A saboteur view lists the other two saboteur ids in roster order, the sign, and the plan argument (which may be `null` before a round plan exists).

- [ ] **Step 1: Write the failing test**

Create `src/bay/roles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assignCell, livingSeats, soloControllers, viewFor } from './roles';
import { BAY_SEATS } from './types';

describe('assignCell', () => {
  it('draws the locked trios and signs for known seeds', () => {
    expect(assignCell(0)).toMatchObject({ saboteurs: ['radio', 'nav', 'medic'], sign: 1 });
    expect(assignCell(6)).toMatchObject({ saboteurs: ['helm', 'sonar', 'plant'], sign: 1 });
    expect(assignCell(7)).toMatchObject({ saboteurs: ['radio', 'plant', 'cargo'], sign: -1 });
    expect(assignCell(11)).toMatchObject({ saboteurs: ['helm', 'plant', 'deck'], sign: -1 });
    expect(assignCell(42)).toMatchObject({ saboteurs: ['radio', 'nav', 'deck'], sign: 1 });
    expect(assignCell(42)).toEqual(assignCell(42));
  });

  it('marks exactly those three seats as saboteurs and the other five as crew', () => {
    const cell = assignCell(42);
    expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'saboteur')).toEqual([
      'radio',
      'nav',
      'deck',
    ]);
    expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'crew')).toEqual([
      'helm',
      'sonar',
      'plant',
      'medic',
      'cargo',
    ]);
  });

  it('reaches every trio once and stays near a uniform count across 56000 seeds', () => {
    const counts = new Map<string, number>();
    let helmSaboteurs = 0;
    let plus = 0;
    let minus = 0;
    for (let seed = 0; seed < 56000; seed += 1) {
      const cell = assignCell(seed);
      expect(cell.saboteurs).toHaveLength(3);
      counts.set(cell.saboteurs.join(','), (counts.get(cell.saboteurs.join(',')) ?? 0) + 1);
      if (cell.saboteurs.includes('helm')) helmSaboteurs += 1;
      if (cell.sign === 1) plus += 1;
      else minus += 1;
      expect(BAY_SEATS.filter((seat) => cell.roles[seat] === 'saboteur')).toEqual([...cell.saboteurs]);
    }
    expect(counts.size).toBe(56);
    expect(helmSaboteurs).toBe(21062);
    expect(plus).toBe(27700);
    expect(minus).toBe(28300);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(900);
      expect(count).toBeLessThanOrEqual(1100);
    }
  });
});

describe('visibility', () => {
  it('shows a crew seat only its own role', () => {
    const cell = assignCell(42);
    const view = viewFor('helm', cell, 'near-miss');
    expect(view).toEqual({ role: 'crew' });
    expect(Object.keys(view)).toEqual(['role']);
  });

  it('shows a saboteur the other two ids in roster order, the sign, and that seat plan', () => {
    const cell = assignCell(42);
    expect(viewFor('radio', cell, 'near-miss')).toEqual({
      role: 'saboteur',
      partners: ['nav', 'deck'],
      sign: 1,
      plan: 'near-miss',
    });
    expect(viewFor('nav', cell, null)).toEqual({
      role: 'saboteur',
      partners: ['radio', 'deck'],
      sign: 1,
      plan: null,
    });
    expect(viewFor('deck', cell, 'honest')).toEqual({
      role: 'saboteur',
      partners: ['radio', 'nav'],
      sign: 1,
      plan: 'honest',
    });
  });
});

describe('solo controllers', () => {
  it('makes Helm the only human', () => {
    const controllers = soloControllers();
    expect(controllers.helm).toBe('human');
    for (const seat of BAY_SEATS) {
      if (seat !== 'helm') expect(controllers[seat]).toBe('ai');
    }
  });
});

describe('livingSeats', () => {
  it('keeps roster order and drops ejected seats', () => {
    expect(livingSeats([])).toEqual([...BAY_SEATS]);
    expect(livingSeats(['radio', 'helm'])).toEqual([
      'sonar',
      'nav',
      'plant',
      'deck',
      'medic',
      'cargo',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/roles.test.ts`

Expected: FAIL. `assignCell` is not defined.

- [ ] **Step 3: Write the role stream**

Create `src/bay/roles.ts`:

```ts
import { intBetween } from '../game/rng';
import { ROLE_STREAM_MASK } from './constants';
import {
  BAY_SEATS,
  type BaySeatId,
  type Cell,
  type CellSign,
  type Controller,
  type Posture,
  type Role,
  type RoleView,
} from './types';

export function assignCell(seed: number): Cell {
  let state = (seed ^ ROLE_STREAM_MASK) >>> 0;
  const order: BaySeatId[] = [...BAY_SEATS];
  for (let index = 0; index < 3; index += 1) {
    const rolled = intBetween(state, index, BAY_SEATS.length - 1);
    state = rolled.state;
    const swap = rolled.value;
    const held = order[index];
    order[index] = order[swap];
    order[swap] = held;
  }
  const drawn = new Set(order.slice(0, 3));
  const saboteurs = BAY_SEATS.filter((seat) => drawn.has(seat));
  if (saboteurs.length !== 3) throw new Error('Role stream must draw three saboteurs.');
  const signRoll = intBetween(state, 0, 1);
  const sign: CellSign = signRoll.value === 0 ? -1 : 1;
  const roles = {} as Record<BaySeatId, Role>;
  for (const seat of BAY_SEATS) roles[seat] = drawn.has(seat) ? 'saboteur' : 'crew';
  return { saboteurs: [saboteurs[0], saboteurs[1], saboteurs[2]], sign, roles };
}

export function soloControllers(): Record<BaySeatId, Controller> {
  const controllers = {} as Record<BaySeatId, Controller>;
  for (const seat of BAY_SEATS) controllers[seat] = seat === 'helm' ? 'human' : 'ai';
  return controllers;
}

export function viewFor(seat: BaySeatId, cell: Cell, plan: Posture | null): RoleView {
  if (cell.roles[seat] === 'crew') return { role: 'crew' };
  return {
    role: 'saboteur',
    partners: cell.saboteurs.filter((other) => other !== seat),
    sign: cell.sign,
    plan,
  };
}

export function livingSeats(ejected: readonly BaySeatId[]): BaySeatId[] {
  const gone = new Set(ejected);
  return BAY_SEATS.filter((seat) => !gone.has(seat));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/roles.test.ts && npm test && npm run build`

Expected: the new file passes (the 56000-seed loop is the slow one and should finish in a few seconds). The full suite and build stay green. Do not edit `src/game/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/bay/roles.ts src/bay/roles.test.ts
git commit -m "feat: draw a three-saboteur cell from the role stream"
```

---

## Task 3: Phase dial

**Files:**
- Create: `src/bay/puzzles.ts`
- Test: `src/bay/puzzles.test.ts`

**Interfaces:**
- Consumes: `BayAnswer`, `DialPuzzle`, `PUZZLE_STREAM_ADD`, `PUZZLE_STREAM_MASK`, `intBetween` from `src/game/rng.ts`
- Produces:
  - `puzzleStreamStart(seed: number, roundIndex: number): number`
  - `assembleDial(a: number, b: number): DialPuzzle`
  - `generatePuzzle(seed: number, roundIndex: number): Puzzle` — this task only has to return a dial when the kind draw is 0. Tasks 4 and 5 fill the other kind draws. Until those tasks, a kind draw of 1 or 2 throws `Unknown puzzle kind.`

Kind draw `0` is a phase dial. The next two draws are `A` and `B`, each `intBetween(state, 0, 11)`. Truth is `(A + B) mod 12`. Near list is `[(truth + 1) mod 12, (truth + 11) mod 12]`. Blatant list is every other detent from 0 through 11, ascending. `assembleDial` is the shared constructor so suspicion tests can build a dial without drawing.

- [ ] **Step 1: Write the failing test**

Create `src/bay/puzzles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assembleDial, generatePuzzle } from './puzzles';

describe('phase dial', () => {
  it('builds truth and the ordered neighbors from two detents', () => {
    expect(assembleDial(5, 5)).toMatchObject({
      kind: 'dial',
      a: 5,
      b: 5,
      truth: 10,
      near: [11, 9],
      blatant: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    });
    expect(assembleDial(11, 1)).toMatchObject({ truth: 0, near: [1, 11] });
    expect(assembleDial(11, 0)).toMatchObject({ truth: 11, near: [0, 10] });
  });

  it('draws the locked dials for seed 42 and the wrap seeds', () => {
    expect(generatePuzzle(42, 0)).toMatchObject({ kind: 'dial', a: 5, b: 5, truth: 10, near: [11, 9] });
    expect(generatePuzzle(42, 1)).toMatchObject({ kind: 'dial', a: 6, b: 7, truth: 1, near: [2, 0] });
    expect(generatePuzzle(3, 8)).toMatchObject({ kind: 'dial', a: 11, b: 1, truth: 0, near: [1, 11] });
    expect(generatePuzzle(7, 8)).toMatchObject({ kind: 'dial', a: 11, b: 0, truth: 11, near: [0, 10] });
  });

  it('repeats a round from the seed and the round index alone', () => {
    expect(generatePuzzle(9, 4)).toEqual(generatePuzzle(9, 4));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: FAIL. `generatePuzzle` is not defined.

- [ ] **Step 3: Write the dial generator**

Create `src/bay/puzzles.ts`:

```ts
import { intBetween } from '../game/rng';
import { PUZZLE_STREAM_ADD, PUZZLE_STREAM_MASK } from './constants';
import { type DialPuzzle, type Puzzle } from './types';

export function puzzleStreamStart(seed: number, roundIndex: number): number {
  const mixed = Math.imul((seed ^ PUZZLE_STREAM_MASK) >>> 0, roundIndex + 1) >>> 0;
  return (mixed + PUZZLE_STREAM_ADD) >>> 0;
}

export function assembleDial(a: number, b: number): DialPuzzle {
  const truth = (a + b) % 12;
  const near: [number, number] = [(truth + 1) % 12, (truth + 11) % 12];
  const skip = new Set<number>([truth, near[0], near[1]]);
  const blatant = [...Array(12).keys()].filter((detent) => !skip.has(detent));
  return { kind: 'dial', a, b, truth, near, blatant };
}

export function generatePuzzle(seed: number, roundIndex: number): Puzzle {
  let state = puzzleStreamStart(seed, roundIndex);
  const kind = intBetween(state, 0, 2);
  state = kind.state;
  if (kind.value !== 0) throw new Error('Unknown puzzle kind.');
  const a = intBetween(state, 0, 11);
  state = a.state;
  const b = intBetween(state, 0, 11);
  return assembleDial(a.value, b.value);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/bay/puzzles.ts src/bay/puzzles.test.ts
git commit -m "feat: draw phase-dial check-ins from the puzzle stream"
```

---

## Task 4: In-band reading

**Files:**
- Modify: `src/bay/puzzles.ts`
- Modify: `src/bay/puzzles.test.ts`

**Interfaces:**
- Consumes: `generatePuzzle`, `puzzleStreamStart`, `ReadingLabel`, `ReadingOption`, `ReadingPuzzle`
- Produces: `generatePuzzle` now returns a reading when the kind draw is 1. Kind 2 still throws `Unknown puzzle kind.`

Pre-shuffle value order, which the golden reading depends on, is:

1. true: `anchor + offset`
2. near: `anchor - 2`
3. far: `anchor - 16`
4. far: `anchor + 20`
5. far: `anchor + 34`

Then Fisher-Yates from the end: for `i` from 4 down to 1, swap index `i` with `intBetween(state, 0, i)`. Labels after the shuffle are `R1` through `R5`. `near` is the one near label. `blatant` is the far labels in label order.

- [ ] **Step 1: Write the failing test**

Append this describe block to `src/bay/puzzles.test.ts`:

```ts
describe('in-band reading', () => {
  it('draws the locked reading for seed 0 round 1', () => {
    expect(generatePuzzle(0, 1)).toEqual({
      kind: 'reading',
      anchor: 55,
      offset: 6,
      band: [55, 62],
      options: [
        { label: 'R1', role: 'near', value: 53 },
        { label: 'R2', role: 'far', value: 75 },
        { label: 'R3', role: 'true', value: 61 },
        { label: 'R4', role: 'far', value: 39 },
        { label: 'R5', role: 'far', value: 89 },
      ],
      truth: 'R3',
      near: ['R1'],
      blatant: ['R2', 'R4', 'R5'],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: FAIL. Seed 0 round 1 currently throws `Unknown puzzle kind.`

- [ ] **Step 3: Handle kind draw 1**

Replace `generatePuzzle` in `src/bay/puzzles.ts` with the following, and add the reading types to the import from `./types`:

```ts
import { type DialPuzzle, type Puzzle, type ReadingLabel, type ReadingPuzzle } from './types';

const READING_LABELS: ReadingLabel[] = ['R1', 'R2', 'R3', 'R4', 'R5'];

function assembleReading(
  anchor: number,
  offset: number,
  shuffled: Array<{ role: 'true' | 'near' | 'far'; value: number }>,
): ReadingPuzzle {
  const options = shuffled.map((entry, index) => ({
    label: READING_LABELS[index],
    role: entry.role,
    value: entry.value,
  })) as ReadingPuzzle['options'];
  const truth = options.find((option) => option.role === 'true');
  if (!truth) throw new Error('Reading is missing its true value.');
  const near = options.filter((option) => option.role === 'near').map((option) => option.label);
  const blatant = options.filter((option) => option.role === 'far').map((option) => option.label);
  if (near.length !== 1) throw new Error('Reading must have one near decoy.');
  return {
    kind: 'reading',
    anchor,
    offset,
    band: [anchor, anchor + 7],
    options,
    truth: truth.label,
    near: [near[0]],
    blatant,
  };
}

export function generatePuzzle(seed: number, roundIndex: number): Puzzle {
  let state = puzzleStreamStart(seed, roundIndex);
  const kind = intBetween(state, 0, 2);
  state = kind.state;
  if (kind.value === 0) {
    const a = intBetween(state, 0, 11);
    state = a.state;
    const b = intBetween(state, 0, 11);
    return assembleDial(a.value, b.value);
  }
  if (kind.value === 1) {
    const anchor = intBetween(state, 18, 64);
    state = anchor.state;
    const offset = intBetween(state, 0, 7);
    state = offset.state;
    const values: Array<{ role: 'true' | 'near' | 'far'; value: number }> = [
      { role: 'true', value: anchor.value + offset.value },
      { role: 'near', value: anchor.value - 2 },
      { role: 'far', value: anchor.value - 16 },
      { role: 'far', value: anchor.value + 20 },
      { role: 'far', value: anchor.value + 34 },
    ];
    for (let index = 4; index >= 1; index -= 1) {
      const swap = intBetween(state, 0, index);
      state = swap.state;
      const held = values[index];
      values[index] = values[swap.value];
      values[swap.value] = held;
    }
    return assembleReading(anchor.value, offset.value, values);
  }
  throw new Error('Unknown puzzle kind.');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: PASS. The dial tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/bay/puzzles.ts src/bay/puzzles.test.ts
git commit -m "feat: draw in-band reading check-ins"
```

---

## Task 5: Corrupted glyph

**Files:**
- Modify: `src/bay/puzzles.ts`
- Modify: `src/bay/puzzles.test.ts`

**Interfaces:**
- Consumes: `generatePuzzle`, `GLYPH_ALPHABET`, `GlyphPuzzle`, `GlyphSymbol`
- Produces: `generatePuzzle` returns a glyph when the kind draw is 2. It no longer throws `Unknown puzzle kind.`

Draw four indexes with `intBetween(state, 0, 7)`. Repeats are allowed. Draw the blank with `intBetween(state, 0, 3)`. Seal is the sum of the four indexes modulo 8. Truth is `GLYPH_ALPHABET[indexes[blank]]`. Shown cells are those symbols, with `null` at the blank. Near list is the next symbol and then the previous symbol on the 8-letter ring: index `(truth + 1) mod 8`, then `(truth + 7) mod 8`. Blatant list is the remaining alphabet symbols in alphabet order.

- [ ] **Step 1: Write the failing test**

Append to `src/bay/puzzles.test.ts`:

```ts
describe('corrupted glyph', () => {
  it('draws the locked glyphs, including both ring ends', () => {
    expect(generatePuzzle(42, 2)).toMatchObject({
      kind: 'glyph',
      indexes: [1, 6, 4, 5],
      blank: 3,
      seal: 0,
      truth: 'P',
      shown: ['D', 'R', 'K', null],
      near: ['R', 'K'],
      blatant: ['B', 'D', 'F', 'H', 'T'],
    });
    expect(generatePuzzle(1, 3)).toMatchObject({
      kind: 'glyph',
      indexes: [6, 3, 7, 0],
      blank: 2,
      seal: 0,
      truth: 'T',
      shown: ['R', 'H', null, 'B'],
      near: ['B', 'R'],
    });
    expect(generatePuzzle(2, 4)).toMatchObject({
      kind: 'glyph',
      indexes: [3, 3, 3, 0],
      blank: 3,
      seal: 1,
      truth: 'B',
      shown: ['H', 'H', 'H', null],
      near: ['D', 'T'],
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: FAIL. Seed 42 round 2 throws `Unknown puzzle kind.`

- [ ] **Step 3: Handle kind draw 2**

Add this helper to `src/bay/puzzles.ts` and replace the final `throw` in `generatePuzzle`:

```ts
import { GLYPH_ALPHABET, type GlyphPuzzle, type GlyphSymbol } from './types';

function assembleGlyph(indexes: [number, number, number, number], blank: 0 | 1 | 2 | 3): GlyphPuzzle {
  const truthIndex = indexes[blank];
  const truth = GLYPH_ALPHABET[truthIndex];
  const near: [GlyphSymbol, GlyphSymbol] = [
    GLYPH_ALPHABET[(truthIndex + 1) % 8],
    GLYPH_ALPHABET[(truthIndex + 7) % 8],
  ];
  const skip = new Set<GlyphSymbol>([truth, near[0], near[1]]);
  const blatant = GLYPH_ALPHABET.filter((symbol) => !skip.has(symbol));
  const shown = indexes.map((index, cell) => (cell === blank ? null : GLYPH_ALPHABET[index])) as GlyphPuzzle['shown'];
  const seal = indexes.reduce((sum, index) => sum + index, 0) % 8;
  return { kind: 'glyph', indexes, blank, seal, shown, truth, near, blatant };
}
```

In `generatePuzzle`, after the reading branch:

```ts
  const indexes: number[] = [];
  for (let cell = 0; cell < 4; cell += 1) {
    const drawn = intBetween(state, 0, 7);
    state = drawn.state;
    indexes.push(drawn.value);
  }
  const blank = intBetween(state, 0, 3);
  return assembleGlyph(
    [indexes[0], indexes[1], indexes[2], indexes[3]],
    blank.value as 0 | 1 | 2 | 3,
  );
```

Guard `blank.value` with a range check that throws `Glyph blank is out of range.` when it is outside 0..3, then pass the narrowed value. Do not leave the `as` cast as the only check if you can narrow with a conditional. A simple form that satisfies strict TypeScript:

```ts
  const blank = intBetween(state, 0, 3);
  if (blank.value !== 0 && blank.value !== 1 && blank.value !== 2 && blank.value !== 3) {
    throw new Error('Glyph blank is out of range.');
  }
  return assembleGlyph([indexes[0], indexes[1], indexes[2], indexes[3]], blank.value);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/puzzles.test.ts`

Expected: PASS, including the dial and reading tests.

- [ ] **Step 5: Commit**

```bash
git add src/bay/puzzles.ts src/bay/puzzles.test.ts
git commit -m "feat: draw corrupted-glyph check-ins"
```

---

## Task 6: Fingerprints and canonical keys

**Files:**
- Create: `src/bay/fingerprint.ts`
- Test: `src/bay/fingerprint.test.ts`
- Modify: `src/bay/puzzles.ts` to export answer-list helpers that call into this file's key rules. Put the helpers in `fingerprint.ts` so puzzles stay the generator.

**Interfaces:**
- Consumes: `BayAnswer`, `CellSign`, `Fingerprint`, `Puzzle`, `assembleDial` is not required. Helpers accept a `Puzzle`.
- Produces:
  - `truthAnswer(puzzle: Puzzle): BayAnswer`
  - `nearAnswers(puzzle: Puzzle): BayAnswer[]` in the puzzle's near order
  - `blatantAnswers(puzzle: Puzzle): BayAnswer[]` in the puzzle's blatant order
  - `signedNearAnswer(puzzle: Puzzle, sign: CellSign): BayAnswer` — sign `+1` is `near[0]`, sign `-1` is `near[1]`; a reading ignores the sign and returns its only near label
  - `canonicalKey(answer: BayAnswer): string` — `dial:<detent>`, `reading:<label>`, `glyph:<symbol>`
  - `fingerprint(puzzle: Puzzle, answer: BayAnswer, instrumentId: string): Fingerprint`
  - Illegal or cross-kind answers throw `Illegal answer.`

Dial distance is `min(|submitted - truth|, 12 - |submitted - truth|)`. Class is exact at 0, near-miss at 1, blatant at 2 or more. Glyph distance is the same circular gap on the alphabet indexes 0..7, so the maximum distinct distance is 4. Reading distance is 0 for the true label, 1 for the near label, and 2 for a far label.

- [ ] **Step 1: Write the failing test**

Create `src/bay/fingerprint.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  blatantAnswers,
  canonicalKey,
  fingerprint,
  nearAnswers,
  signedNearAnswer,
  truthAnswer,
} from './fingerprint';
import { generatePuzzle } from './puzzles';
import type { DialPuzzle, GlyphPuzzle, ReadingPuzzle } from './types';

const dial = generatePuzzle(42, 0) as DialPuzzle;
const wrap = generatePuzzle(3, 8) as DialPuzzle;
const reading = generatePuzzle(0, 1) as ReadingPuzzle;
const glyph = generatePuzzle(42, 2) as GlyphPuzzle;
const glyphEnd = generatePuzzle(1, 3) as GlyphPuzzle;

describe('canonical answers', () => {
  it('returns truth, near, and blatant in list order', () => {
    expect(truthAnswer(dial)).toEqual({ kind: 'dial', detent: 10 });
    expect(nearAnswers(dial)).toEqual([
      { kind: 'dial', detent: 11 },
      { kind: 'dial', detent: 9 },
    ]);
    expect(blatantAnswers(dial).map((answer) => (answer.kind === 'dial' ? answer.detent : -1))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(signedNearAnswer(dial, 1)).toEqual({ kind: 'dial', detent: 11 });
    expect(signedNearAnswer(dial, -1)).toEqual({ kind: 'dial', detent: 9 });
    expect(signedNearAnswer(reading, 1)).toEqual({ kind: 'reading', label: 'R1' });
    expect(signedNearAnswer(reading, -1)).toEqual({ kind: 'reading', label: 'R1' });
    expect(signedNearAnswer(glyph, 1)).toEqual({ kind: 'glyph', symbol: 'R' });
    expect(signedNearAnswer(glyph, -1)).toEqual({ kind: 'glyph', symbol: 'K' });
  });

  it('groups equal answers by canonical key', () => {
    expect(canonicalKey({ kind: 'dial', detent: 10 })).toBe('dial:10');
    expect(canonicalKey({ kind: 'reading', label: 'R3' })).toBe('reading:R3');
    expect(canonicalKey({ kind: 'glyph', symbol: 'P' })).toBe('glyph:P');
    expect(canonicalKey(truthAnswer(dial))).toBe(canonicalKey({ kind: 'dial', detent: 10 }));
  });
});

describe('fingerprint', () => {
  it('classifies dial distance, including the 0/11 wrap and a distance-6 tie', () => {
    expect(fingerprint(dial, { kind: 'dial', detent: 10 }, 'INST-1')).toEqual({
      errorClass: 'exact',
      distance: 0,
      instrumentId: 'INST-1',
    });
    expect(fingerprint(dial, { kind: 'dial', detent: 11 }, 'INST-3')).toEqual({
      errorClass: 'near-miss',
      distance: 1,
      instrumentId: 'INST-3',
    });
    expect(fingerprint(dial, { kind: 'dial', detent: 4 }, 'INST-2').errorClass).toBe('blatant');
    expect(fingerprint(dial, { kind: 'dial', detent: 4 }, 'INST-2').distance).toBe(6);
    expect(fingerprint(wrap, { kind: 'dial', detent: 11 }, 'INST-1')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
  });

  it('classifies the reading decoy as distance 1 and a far reading as distance 2', () => {
    expect(fingerprint(reading, { kind: 'reading', label: 'R3' }, 'INST-1')).toEqual({
      errorClass: 'exact',
      distance: 0,
      instrumentId: 'INST-1',
    });
    expect(fingerprint(reading, { kind: 'reading', label: 'R1' }, 'INST-4')).toEqual({
      errorClass: 'near-miss',
      distance: 1,
      instrumentId: 'INST-4',
    });
    expect(fingerprint(reading, { kind: 'reading', label: 'R2' }, 'INST-5')).toEqual({
      errorClass: 'blatant',
      distance: 2,
      instrumentId: 'INST-5',
    });
  });

  it('classifies glyph ring distance at both ends of the alphabet', () => {
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'P' }, 'INST-6')).toMatchObject({
      errorClass: 'exact',
      distance: 0,
    });
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'R' }, 'INST-6')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
    expect(fingerprint(glyph, { kind: 'glyph', symbol: 'B' }, 'INST-6').errorClass).toBe('blatant');
    expect(fingerprint(glyphEnd, { kind: 'glyph', symbol: 'B' }, 'INST-8')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
    expect(fingerprint(glyphEnd, { kind: 'glyph', symbol: 'R' }, 'INST-8')).toMatchObject({
      errorClass: 'near-miss',
      distance: 1,
    });
  });

  it('rejects an illegal or cross-kind answer', () => {
    expect(() => fingerprint(dial, { kind: 'dial', detent: 12 }, 'INST-1')).toThrow(/Illegal answer/);
    expect(() => fingerprint(dial, { kind: 'glyph', symbol: 'B' }, 'INST-1')).toThrow(/Illegal answer/);
    expect(() => fingerprint(reading, { kind: 'reading', label: 'R9' as 'R1' }, 'INST-1')).toThrow(
      /Illegal answer/,
    );
  });
});
```

The `R9` cast is only there so the call typechecks while the runtime rejects a label that is not on the card. Prefer rejecting it because `R9` is not one of `puzzle.options`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/fingerprint.test.ts`

Expected: FAIL. The fingerprint module cannot be loaded.

- [ ] **Step 3: Write the fingerprint module**

Create `src/bay/fingerprint.ts`:

```ts
import { GLYPH_ALPHABET, type BayAnswer, type CellSign, type Fingerprint, type GlyphSymbol, type Puzzle } from './types';

export function truthAnswer(puzzle: Puzzle): BayAnswer {
  if (puzzle.kind === 'dial') return { kind: 'dial', detent: puzzle.truth };
  if (puzzle.kind === 'reading') return { kind: 'reading', label: puzzle.truth };
  return { kind: 'glyph', symbol: puzzle.truth };
}

export function nearAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'dial') {
    return puzzle.near.map((detent) => ({ kind: 'dial' as const, detent }));
  }
  if (puzzle.kind === 'reading') {
    return puzzle.near.map((label) => ({ kind: 'reading' as const, label }));
  }
  return puzzle.near.map((symbol) => ({ kind: 'glyph' as const, symbol }));
}

export function blatantAnswers(puzzle: Puzzle): BayAnswer[] {
  if (puzzle.kind === 'dial') {
    return puzzle.blatant.map((detent) => ({ kind: 'dial' as const, detent }));
  }
  if (puzzle.kind === 'reading') {
    return puzzle.blatant.map((label) => ({ kind: 'reading' as const, label }));
  }
  return puzzle.blatant.map((symbol) => ({ kind: 'glyph' as const, symbol }));
}

export function signedNearAnswer(puzzle: Puzzle, sign: CellSign): BayAnswer {
  const near = nearAnswers(puzzle);
  if (puzzle.kind === 'reading') return near[0];
  return sign === 1 ? near[0] : near[1];
}

export function canonicalKey(answer: BayAnswer): string {
  if (answer.kind === 'dial') return `dial:${answer.detent}`;
  if (answer.kind === 'reading') return `reading:${answer.label}`;
  return `glyph:${answer.symbol}`;
}

function circular(from: number, to: number, size: number): number {
  const gap = Math.abs(from - to);
  return Math.min(gap, size - gap);
}

function glyphIndex(symbol: GlyphSymbol): number {
  return GLYPH_ALPHABET.indexOf(symbol);
}

export function fingerprint(puzzle: Puzzle, answer: BayAnswer, instrumentId: string): Fingerprint {
  if (answer.kind !== puzzle.kind) throw new Error('Illegal answer.');
  if (puzzle.kind === 'dial') {
    if (answer.kind !== 'dial' || !Number.isInteger(answer.detent) || answer.detent < 0 || answer.detent > 11) {
      throw new Error('Illegal answer.');
    }
    const distance = circular(puzzle.truth, answer.detent, 12);
    const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
    return { errorClass, distance, instrumentId };
  }
  if (puzzle.kind === 'reading') {
    if (answer.kind !== 'reading') throw new Error('Illegal answer.');
    const option = puzzle.options.find((entry) => entry.label === answer.label);
    if (!option) throw new Error('Illegal answer.');
    const distance = option.role === 'true' ? 0 : option.role === 'near' ? 1 : 2;
    const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
    return { errorClass, distance, instrumentId };
  }
  if (answer.kind !== 'glyph' || glyphIndex(answer.symbol) < 0) throw new Error('Illegal answer.');
  const distance = circular(glyphIndex(puzzle.truth), glyphIndex(answer.symbol), 8);
  const errorClass = distance === 0 ? 'exact' : distance === 1 ? 'near-miss' : 'blatant';
  return { errorClass, distance, instrumentId };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/fingerprint.test.ts && npm test && npm run build`

Expected: PASS. Full suite and build stay green.

- [ ] **Step 5: Commit**

```bash
git add src/bay/fingerprint.ts src/bay/fingerprint.test.ts
git commit -m "feat: fingerprint check-in answers by class, distance, and instrument"
```

---

## Task 7: Integrity meter

**Files:**
- Create: `src/bay/integrity.ts`
- Test: `src/bay/integrity.test.ts`

**Interfaces:**
- Consumes: `DELTA_ALIGNED`, `DELTA_FALSE_CONSENSUS`, `DELTA_NEAR_CLUSTER`, `DELTA_SPLIT`, `INTEGRITY_CREW`, `INTEGRITY_MAX`, `INTEGRITY_MIN`, `INTEGRITY_SABOTEUR_BELOW`, `IntegrityRow`, `clamp` from `src/game/rng.ts`
- Produces:
  - `classifyBoard(input: { truthKey: string; nearKeys: readonly string[]; keys: readonly string[] }): { row: IntegrityRow; delta: number }`
  - `applyIntegrity(current: number, delta: number): number`
  - `meterVerdict(integrityBp: number): { winner: 'crew' | 'saboteur' | 'draw'; reason: 'integrity-window' | 'integrity-held' | 'stalemate' }`
  - `formatBasisPoints(bp: number): string` such as `42.0%`
  - `formatDelta(delta: number): string` such as `+4.0` or `-4.5`

`keys.length` is `N`, the living seats. Strict majority is `Math.floor(N / 2) + 1`. Row 1: the truth key has a strict majority. Row 2: some other key has a strict majority. Row 3: some near key has a count of at least 2. Row 4: everything else. A true majority wins even when a near pair is also present. Two different near keys with one seat each are a split. `meterVerdict` does not know whether a saboteur is aboard. The session calls it only when one is. `7000` is crew, `6999` and `5500` are stalemate, `5499` is saboteurs.

- [ ] **Step 1: Write the failing test**

Create `src/bay/integrity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyIntegrity, classifyBoard, formatBasisPoints, formatDelta, meterVerdict } from './integrity';

const truth = 'dial:10';
const near = ['dial:11', 'dial:9'];

describe('classifyBoard', () => {
  it('follows the worked path from 42.0% and prefers a true majority over a near pair', () => {
    let integrity = 4200;
    const steps: Array<{ keys: string[]; row: string; delta: number; after: number }> = [
      {
        keys: ['dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:11', 'dial:11', 'dial:11'],
        row: 'aligned',
        delta: 400,
        after: 4600,
      },
      {
        keys: ['dial:10', 'dial:10', 'dial:10', 'dial:10', 'dial:11', 'dial:11', 'dial:11', 'dial:4'],
        row: 'near-miss-cluster',
        delta: -350,
        after: 4250,
      },
      {
        keys: ['dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:4', 'dial:10', 'dial:10'],
        row: 'false-consensus',
        delta: -450,
        after: 3800,
      },
      {
        keys: ['dial:10', 'dial:10', 'dial:0', 'dial:1', 'dial:2', 'dial:3', 'dial:5', 'dial:6'],
        row: 'split',
        delta: -200,
        after: 3600,
      },
    ];
    for (const step of steps) {
      const classified = classifyBoard({ truthKey: truth, nearKeys: near, keys: step.keys });
      expect(classified).toEqual({ row: step.row, delta: step.delta });
      integrity = applyIntegrity(integrity, classified.delta);
      expect(integrity).toBe(step.after);
    }
    expect(formatBasisPoints(4600)).toBe('46.0%');
    expect(formatBasisPoints(4250)).toBe('42.5%');
    expect(formatBasisPoints(3800)).toBe('38.0%');
    expect(formatBasisPoints(3600)).toBe('36.0%');
    expect(formatDelta(400)).toBe('+4.0');
    expect(formatDelta(-450)).toBe('-4.5');
    expect(formatDelta(-350)).toBe('-3.5');
    expect(formatDelta(-200)).toBe('-2.0');
  });

  it('treats two different near keys as a split', () => {
    const classified = classifyBoard({
      truthKey: truth,
      nearKeys: near,
      keys: ['dial:10', 'dial:10', 'dial:11', 'dial:9', 'dial:0', 'dial:1', 'dial:2', 'dial:3'],
    });
    expect(classified).toEqual({ row: 'split', delta: -200 });
  });

  it('clamps to 2.0% and 98.0%', () => {
    expect(applyIntegrity(200, -200)).toBe(200);
    expect(applyIntegrity(9800, 400)).toBe(9800);
    expect(Number.isInteger(applyIntegrity(4200, -450))).toBe(true);
  });
});

describe('meterVerdict', () => {
  it('uses 70% and 55% only as end bands', () => {
    expect(meterVerdict(7000)).toEqual({ winner: 'crew', reason: 'integrity-window' });
    expect(meterVerdict(6999)).toEqual({ winner: 'draw', reason: 'stalemate' });
    expect(meterVerdict(5500)).toEqual({ winner: 'draw', reason: 'stalemate' });
    expect(meterVerdict(5499)).toEqual({ winner: 'saboteur', reason: 'integrity-held' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/integrity.test.ts`

Expected: FAIL. `classifyBoard` is not defined.

- [ ] **Step 3: Write the meter**

Create `src/bay/integrity.ts`:

```ts
import { clamp } from '../game/rng';
import {
  DELTA_ALIGNED,
  DELTA_FALSE_CONSENSUS,
  DELTA_NEAR_CLUSTER,
  DELTA_SPLIT,
  INTEGRITY_CREW,
  INTEGRITY_MAX,
  INTEGRITY_MIN,
  INTEGRITY_SABOTEUR_BELOW,
} from './constants';
import type { IntegrityRow } from './types';

function countsOf(keys: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}

export function classifyBoard(input: {
  truthKey: string;
  nearKeys: readonly string[];
  keys: readonly string[];
}): { row: IntegrityRow; delta: number } {
  const counts = countsOf(input.keys);
  const needed = Math.floor(input.keys.length / 2) + 1;
  if ((counts.get(input.truthKey) ?? 0) >= needed) {
    return { row: 'aligned', delta: DELTA_ALIGNED };
  }
  for (const [key, count] of counts) {
    if (key !== input.truthKey && count >= needed) {
      return { row: 'false-consensus', delta: DELTA_FALSE_CONSENSUS };
    }
  }
  const near = new Set(input.nearKeys);
  for (const [key, count] of counts) {
    if (near.has(key) && count >= 2) {
      return { row: 'near-miss-cluster', delta: DELTA_NEAR_CLUSTER };
    }
  }
  return { row: 'split', delta: DELTA_SPLIT };
}

export function applyIntegrity(current: number, delta: number): number {
  return clamp(current + delta, INTEGRITY_MIN, INTEGRITY_MAX);
}

export function meterVerdict(integrityBp: number): {
  winner: 'crew' | 'saboteur' | 'draw';
  reason: 'integrity-window' | 'integrity-held' | 'stalemate';
} {
  if (integrityBp >= INTEGRITY_CREW) return { winner: 'crew', reason: 'integrity-window' };
  if (integrityBp < INTEGRITY_SABOTEUR_BELOW) return { winner: 'saboteur', reason: 'integrity-held' };
  return { winner: 'draw', reason: 'stalemate' };
}

export function formatBasisPoints(bp: number): string {
  return `${(bp / 100).toFixed(1)}%`;
}

export function formatDelta(delta: number): string {
  const points = delta / 100;
  const body = Math.abs(points).toFixed(1);
  if (points > 0) return `+${body}`;
  if (points < 0) return `-${body}`;
  return '0.0';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/integrity.test.ts && npm test && npm run build`

Expected: PASS. Full suite and build stay green.

- [ ] **Step 5: Commit**

```bash
git add src/bay/integrity.ts src/bay/integrity.test.ts
git commit -m "feat: score bay integrity in basis points"
```

---

## Task 8: Notes clamp

**Files:**
- Create: `src/bay/notes.ts`
- Test: `src/bay/notes.test.ts`

**Interfaces:**
- Consumes: `NOTES_MAX`
- Produces: `clampNotes(text: string): string`

The clamp keeps the first 2000 UTF-16 code units (`String.prototype.slice`). It does not trim, score, or touch a session. The discuss screen calls it. The session never accepts a notes argument.

- [ ] **Step 1: Write the failing test**

Create `src/bay/notes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { NOTES_MAX } from './constants';
import { clampNotes } from './notes';

describe('clampNotes', () => {
  it('leaves a short scratchpad unchanged and cuts at 2000 characters', () => {
    expect(clampNotes('board looks split')).toBe('board looks split');
    expect(clampNotes('a'.repeat(NOTES_MAX + 1))).toBe('a'.repeat(NOTES_MAX));
    expect(clampNotes('a'.repeat(NOTES_MAX)).length).toBe(2000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/notes.test.ts`

Expected: FAIL. `clampNotes` is not defined.

- [ ] **Step 3: Write the clamp**

Create `src/bay/notes.ts`:

```ts
import { NOTES_MAX } from './constants';

export function clampNotes(text: string): string {
  return text.slice(0, NOTES_MAX);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/notes.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bay/notes.ts src/bay/notes.test.ts
git commit -m "feat: clamp the local bay scratchpad at 2000 characters"
```

---

## Task 9: Check-in session, reveal, and discuss gate

**Files:**
- Create: `src/bay/streams.ts`
- Create: `src/bay/session.ts`
- Test: `src/bay/session.test.ts`

**Interfaces:**
- Consumes: `assignCell`, `soloControllers`, `livingSeats`, `generatePuzzle`, `truthAnswer`, `nearAnswers`, `canonicalKey`, `fingerprint`, `classifyBoard`, `applyIntegrity`, `meterVerdict`, `BAY_SEATS`, `INSTRUMENT`, `BayAnswer`, `BaySeatId`, `BaySession`, `CheckInRecord`, `INTEGRITY_START`, `MAX_ROUNDS`, `MIN_ROUNDS`
- Produces:
  - `checkInStreamStart(seed: number): number` equals `(seed ^ CHECKIN_STREAM_MASK) >>> 0`
  - `voteStreamStart(seed: number): number` equals `(seed ^ VOTE_STREAM_MASK) >>> 0`
  - `createBaySession(config: { rounds: number; seed: number }): BaySession`
  - `revealCheckIn(session: BaySession, answers: Partial<Record<BaySeatId, BayAnswer>>): BaySession`
  - `advance(session: BaySession): BaySession`
  - `allTruth(session: BaySession): Partial<Record<BaySeatId, BayAnswer>>` — test helper is not required in production. Tests build the map themselves.

`createBaySession` stores `seed >>> 0`, rejects a non-integer round count outside 8..12 with `Round count must be an integer from 8 to 12.`, starts at integrity 4200, phase `check-in`, round index 0, puzzle `generatePuzzle(seed, 0)`, cell `assignCell(seed)`, controllers `soloControllers()`, empty ejected / log / meetings, `meeting: null`, `pendingCall: null`, `prepared: {}`, `plan: null`, `winner: null`, `winReason: null`. `checkInState` is `checkInStreamStart`. `voteState` is `voteStreamStart`. Do not fill AI answers in this task. Do not read `prepared`.

`revealCheckIn` requires phase `check-in`. Every living seat needs an answer. An ejected seat with an answer throws `Ejected seats cannot check in.` A missing living answer throws `Every living seat must submit.` `fingerprint` throws `Illegal answer.` for a bad answer. The board lists all eight seats in roster order. Absent rows have no fingerprint. Integrity is applied once. Phase becomes `discuss`. `roundIndex` does not change. `voteState` does not change. `pendingCall` stays `null`. A second reveal throws `No open check-in.`

`advance` requires phase `discuss`. It clears `pendingCall` and `meeting`. If `roundIndex + 1 >= rounds`, it ends the watch. If any saboteur is still in `livingSeats`, it uses `meterVerdict`. If none remain, winner is crew and reason is `saboteurs-ejected` without calling `meterVerdict`. Otherwise it opens the next check-in: phase `check-in`, `roundIndex + 1`, puzzle `generatePuzzle(seed, nextIndex)`, `prepared: {}`, `plan: null`. Round 1 discuss (`roundIndex === 0`) uses the same `advance`. This task does not open meetings. Accusations are Task 11. From this task, `advance` is the only way out of discuss, including on later rounds. Task 11 adds the accuse path beside it. `advance` from a later round still spends the accusation by leaving the round with no meeting.

Crossing 7000 during the watch must leave `phase` as `discuss` and `winner` as `null`.

- [ ] **Step 1: Write the failing test**

Create `src/bay/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { truthAnswer } from './fingerprint';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats } from './roles';
import { advance, createBaySession, revealCheckIn } from './session';
import { checkInStreamStart, voteStreamStart } from './streams';
import { BAY_SEATS, type BayAnswer, type BaySeatId, type BaySession } from './types';

function truthMap(session: BaySession): Partial<Record<BaySeatId, BayAnswer>> {
  const answers: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of livingSeats(session.ejected)) answers[seat] = truthAnswer(session.puzzle);
  return answers;
}

describe('createBaySession', () => {
  it('opens an eight-seat check-in from the seed', () => {
    const session = createBaySession({ rounds: 10, seed: 42 });
    expect(session.phase).toBe('check-in');
    expect(session.integrity).toBe(4200);
    expect(session.roundIndex).toBe(0);
    expect(session.puzzle).toEqual(generatePuzzle(42, 0));
    expect(session.cell).toEqual(assignCell(42));
    expect(session.controllers.helm).toBe('human');
    expect(session.controllers.sonar).toBe('ai');
    expect(session.ejected).toEqual([]);
    expect(session.log).toEqual([]);
    expect(session.winner).toBeNull();
    expect(session.voteState).toBe(voteStreamStart(42));
    expect(voteStreamStart(42)).toBe(1887305771);
    expect(checkInStreamStart(42)).toBe(203342640);
    expect(session.checkInState).toBe(203342640);
    expect(session).not.toHaveProperty('notes');
  });

  it('rejects round counts outside 8–12', () => {
    expect(() => createBaySession({ rounds: 7, seed: 1 })).toThrow(/8/);
    expect(() => createBaySession({ rounds: 13, seed: 1 })).toThrow(/12/);
    expect(() => createBaySession({ rounds: 10.5, seed: 1 })).toThrow(/integer/);
  });
});

describe('reveal and discuss', () => {
  it('applies integrity once, reveals eight fingerprints, and rejects a second reveal', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    const revealed = revealCheckIn(opened, truthMap(opened));
    expect(revealed.phase).toBe('discuss');
    expect(revealed.integrity).toBe(4600);
    expect(revealed.log).toHaveLength(1);
    expect(revealed.log[0].row).toBe('aligned');
    expect(revealed.log[0].delta).toBe(400);
    expect(revealed.log[0].integrityBefore).toBe(4200);
    expect(revealed.log[0].integrityAfter).toBe(4600);
    expect(revealed.log[0].rows).toHaveLength(8);
    expect(revealed.log[0].rows.every((row) => row.absent === false && row.fingerprint.errorClass === 'exact')).toBe(
      true,
    );
    expect(revealed.voteState).toBe(opened.voteState);
    expect(revealed.pendingCall).toBeNull();
    expect(revealed.winner).toBeNull();
    expect(() => revealCheckIn(revealed, truthMap(opened))).toThrow(/No open check-in/);
  });

  it('rejects a missing living answer', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    const answers = truthMap(opened);
    delete answers.cargo;
    expect(() => revealCheckIn(opened, answers)).toThrow(/Every living seat must submit/);
  });

  it('advances from round 1 discuss without a vote and keeps the next puzzle on the puzzle stream', () => {
    let session = revealCheckIn(createBaySession({ rounds: 8, seed: 42 }), truthMap(createBaySession({ rounds: 8, seed: 42 })));
    session = advance(session);
    expect(session.phase).toBe('check-in');
    expect(session.roundIndex).toBe(1);
    expect(session.integrity).toBe(4600);
    expect(session.puzzle).toEqual(generatePuzzle(42, 1));
    expect(session.meetings).toEqual([]);
    expect(session.voteState).toBe(voteStreamStart(42));
  });

  it('can sit at or above 70% without ending the watch', () => {
    let session = createBaySession({ rounds: 8, seed: 1 });
    for (let round = 0; round < 7; round += 1) {
      session = revealCheckIn(session, truthMap(session));
      expect(session.phase).toBe('discuss');
      expect(session.winner).toBeNull();
      if (round < 6) session = advance(session);
    }
    expect(session.integrity).toBe(7000);
    expect(session.phase).toBe('discuss');
    session = advance(session);
    expect(session.phase).toBe('check-in');
    expect(session.winner).toBeNull();
  });

  it('awards the meter only when the last discuss advances', () => {
    let session = createBaySession({ rounds: 8, seed: 1 });
    for (let round = 0; round < 8; round += 1) {
      session = revealCheckIn(session, truthMap(session));
      session = advance(session);
    }
    expect(session.phase).toBe('done');
    expect(session.integrity).toBe(7400);
    expect(session.winner).toBe('crew');
    expect(session.winReason).toBe('integrity-window');
    expect(BAY_SEATS).toHaveLength(8);
  });
});
```

Task 11 adds the ejected-seat rejection test once ejection exists.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/session.test.ts`

Expected: FAIL. `createBaySession` is not defined.

- [ ] **Step 3: Write the session**

Create `src/bay/streams.ts`:

```ts
import { CHECKIN_STREAM_MASK, VOTE_STREAM_MASK } from './constants';

export function checkInStreamStart(seed: number): number {
  return (seed ^ CHECKIN_STREAM_MASK) >>> 0;
}

export function voteStreamStart(seed: number): number {
  return (seed ^ VOTE_STREAM_MASK) >>> 0;
}
```

Create `src/bay/session.ts`:

```ts
import { canonicalKey, fingerprint, nearAnswers, truthAnswer } from './fingerprint';
import { applyIntegrity, classifyBoard, meterVerdict } from './integrity';
import { generatePuzzle } from './puzzles';
import { assignCell, livingSeats, soloControllers } from './roles';
import { checkInStreamStart, voteStreamStart } from './streams';
import { INTEGRITY_START, MAX_ROUNDS, MIN_ROUNDS } from './constants';
import {
  BAY_SEATS,
  INSTRUMENT,
  type BayAnswer,
  type BaySeatId,
  type BaySession,
  type BoardRow,
  type CheckInRecord,
} from './types';

export function createBaySession(config: { rounds: number; seed: number }): BaySession {
  if (!Number.isInteger(config.rounds) || config.rounds < MIN_ROUNDS || config.rounds > MAX_ROUNDS) {
    throw new Error(`Round count must be an integer from ${MIN_ROUNDS} to ${MAX_ROUNDS}.`);
  }
  const seed = config.seed >>> 0;
  return {
    rounds: config.rounds,
    seed,
    roundIndex: 0,
    integrity: INTEGRITY_START,
    phase: 'check-in',
    puzzle: generatePuzzle(seed, 0),
    cell: assignCell(seed),
    controllers: soloControllers(),
    ejected: [],
    log: [],
    meetings: [],
    meeting: null,
    pendingCall: null,
    prepared: {},
    plan: null,
    checkInState: checkInStreamStart(seed),
    voteState: voteStreamStart(seed),
    winner: null,
    winReason: null,
  };
}

export function revealCheckIn(
  session: BaySession,
  answers: Partial<Record<BaySeatId, BayAnswer>>,
): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  const living = livingSeats(session.ejected);
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) && answers[seat]) throw new Error('Ejected seats cannot check in.');
    if (living.includes(seat) && !answers[seat]) throw new Error('Every living seat must submit.');
  }
  const truth = truthAnswer(session.puzzle);
  const keys = living.map((seat) => canonicalKey(answers[seat] as BayAnswer));
  const classified = classifyBoard({
    truthKey: canonicalKey(truth),
    nearKeys: nearAnswers(session.puzzle).map((answer) => canonicalKey(answer)),
    keys,
  });
  const integrityAfter = applyIntegrity(session.integrity, classified.delta);
  const rows: BoardRow[] = BAY_SEATS.map((seat) => {
    if (!living.includes(seat)) return { seat, absent: true };
    const answer = answers[seat] as BayAnswer;
    return {
      seat,
      absent: false,
      answer,
      fingerprint: fingerprint(session.puzzle, answer, INSTRUMENT[seat]),
    };
  });
  const record: CheckInRecord = {
    roundIndex: session.roundIndex,
    puzzle: session.puzzle,
    rows,
    integrityBefore: session.integrity,
    integrityAfter,
    row: classified.row,
    delta: classified.delta,
  };
  return {
    ...session,
    phase: 'discuss',
    integrity: integrityAfter,
    log: [...session.log, record],
    pendingCall: null,
  };
}

function saboteurAboard(session: BaySession): boolean {
  return livingSeats(session.ejected).some((seat) => session.cell.roles[seat] === 'saboteur');
}

export function finishRound(session: BaySession): BaySession {
  if (session.roundIndex + 1 >= session.rounds || !saboteurAboard(session)) {
    if (!saboteurAboard(session)) {
      return { ...session, phase: 'done', meeting: null, pendingCall: null, winner: 'crew', winReason: 'saboteurs-ejected' };
    }
    const verdict = meterVerdict(session.integrity);
    return {
      ...session,
      phase: 'done',
      meeting: null,
      pendingCall: null,
      winner: verdict.winner,
      winReason: verdict.reason,
    };
  }
  const roundIndex = session.roundIndex + 1;
  return {
    ...session,
    phase: 'check-in',
    roundIndex,
    puzzle: generatePuzzle(session.seed, roundIndex),
    meeting: null,
    pendingCall: null,
    prepared: {},
    plan: null,
  };
}

export function advance(session: BaySession): BaySession {
  if (session.phase !== 'discuss') throw new Error('Advance from discuss.');
  return finishRound(session);
}
```

`finishRound` ending the watch when no saboteur remains is a guard for Task 11. In this task no ejection happens, so the meter path is the one the tests hit. Export `finishRound` so Task 11 can call it after a non-ending vote.

The 70% test uses seed 1 and eight true boards. Seven true boards reach 7000 (`4200 + 7 * 400`) and must still be in discuss. The eighth advance finishes at 7400. Count the loop carefully: the test above reveals seven times and advances six times, so it stops in discuss of round index 6 at 7000, then one advance opens round index 7. The following test reveals and advances eight times and finishes. Walk through both with a counter if the expected integrity does not match, and fix the test loop rather than the delta. The deltas stay +400.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/session.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bay/streams.ts src/bay/session.ts src/bay/session.test.ts
git commit -m "feat: reveal a bay check-in into discuss"
```

---

## Task 10: Check-in and discuss screens

**Files:**
- Create: `src/bay/ui/controls.ts`
- Create: `src/bay/ui/controls.test.ts`
- Create: `src/bay/ui/prompt.ts`
- Create: `src/bay/ui/prompt.test.ts`
- Create: `src/bay/ui/format.ts`
- Create: `src/bay/ui/RoleBanner.tsx`
- Create: `src/bay/ui/CheckInScreen.tsx`
- Create: `src/bay/ui/DiscussScreen.tsx`
- Modify: `src/ui/console.css`

**Interfaces:**
- Consumes: `BayAnswer`, `BaySeatId`, `BaySession`, `Puzzle`, `RoleView`, `SEAT_NAME`, `clampNotes`, `formatBasisPoints`, `formatDelta`, `INSTRUMENT`
- Produces:
  - `discussControls(input: { roundIndex: number; helmLiving: boolean; pending: boolean }): { notes: true; advance: true; accuse: boolean; takePending: boolean }`
  - `checkInControls(helmLiving: boolean): { submit: boolean; accuse: false }`
  - `promptFacts(puzzle: Puzzle): { kind: Puzzle['kind']; lines: string[] }` — dial lines are the two detent numerals and do not include the truth numeral as their own line; reading lines are `band <lo>–<hi>` plus `R1 <value>` through `R5 <value>` with no role words; glyph lines are the alphabet joined by spaces, `seal <n>`, and the four cells using `blank` for the null cell
  - Screens are not mounted from `src/main.tsx` in this task

Round index 0 never accuses and never takes a pending nomination. Round index 1 or later accuses only while Helm is living. Take-pending is on only when accuse is on and `pending` is true. Notes and advance stay on, including when Helm is ejected. Check-in never accuses. Submit is on only while Helm is living.

The check-in screen renders `promptFacts(session.puzzle).lines` and the answer controls. It does not render `puzzle.truth`, `puzzle.near`, or `puzzle.blatant`. Dial choices are buttons 0 through 11. Reading choices are the five labels. Glyph choices are the eight alphabet symbols. The integrity meter uses `session.integrity / 100` as the width percent, with marks at 55% and 70%. The discuss screen renders the latest log record: truth via `truthAnswer`, every row, fingerprint class, distance, and instrument id, plus the delta. The notes textarea is `maxLength={2000}` and writes `clampNotes`. Round 1 hides accuse and take-pending because `discussControls` says so. Do not add a timer.

- [ ] **Step 1: Write the failing tests**

Create `src/bay/ui/controls.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkInControls, discussControls } from './controls';

describe('bay controls', () => {
  it('closes ballots on round 1 and during check-in', () => {
    expect(discussControls({ roundIndex: 0, helmLiving: true, pending: true })).toEqual({
      notes: true,
      advance: true,
      accuse: false,
      takePending: false,
    });
    expect(checkInControls(true)).toEqual({ submit: true, accuse: false });
    expect(checkInControls(false)).toEqual({ submit: false, accuse: false });
  });

  it('opens an accusation from round 2 only for a living Helm, and takes a nomination only when one is waiting', () => {
    expect(discussControls({ roundIndex: 1, helmLiving: true, pending: false })).toEqual({
      notes: true,
      advance: true,
      accuse: true,
      takePending: false,
    });
    expect(discussControls({ roundIndex: 1, helmLiving: true, pending: true }).takePending).toBe(true);
    expect(discussControls({ roundIndex: 5, helmLiving: false, pending: true })).toEqual({
      notes: true,
      advance: true,
      accuse: false,
      takePending: false,
    });
  });
});
```

Create `src/bay/ui/prompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generatePuzzle } from '../puzzles';
import { promptFacts } from './prompt';

describe('promptFacts', () => {
  it('publishes the dial inputs and withholds the truth line', () => {
    const facts = promptFacts(generatePuzzle(42, 0));
    expect(facts).toEqual({ kind: 'dial', lines: ['5', '5'] });
    expect(facts.lines).not.toContain('10');
  });

  it('publishes the reading band and unlabeled values', () => {
    const facts = promptFacts(generatePuzzle(0, 1));
    expect(facts.kind).toBe('reading');
    expect(facts.lines[0]).toBe('band 55–62');
    expect(facts.lines).toContain('R1 53');
    expect(facts.lines).toContain('R3 61');
    expect(facts.lines.join(' ')).not.toMatch(/true|near|far/);
  });

  it('publishes the glyph alphabet, the seal, and the blank cell', () => {
    const facts = promptFacts(generatePuzzle(42, 2));
    expect(facts).toEqual({
      kind: 'glyph',
      lines: ['B D F H K P R T', 'seal 0', 'D', 'R', 'K', 'blank'],
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/bay/ui/controls.test.ts src/bay/ui/prompt.test.ts`

Expected: FAIL. Both modules are missing.

- [ ] **Step 3: Write the controls, prompt, and screens**

Create `src/bay/ui/controls.ts`:

```ts
export function discussControls(input: { roundIndex: number; helmLiving: boolean; pending: boolean }): {
  notes: true;
  advance: true;
  accuse: boolean;
  takePending: boolean;
} {
  const accuse = input.roundIndex >= 1 && input.helmLiving;
  return { notes: true, advance: true, accuse, takePending: accuse && input.pending };
}

export function checkInControls(helmLiving: boolean): { submit: boolean; accuse: false } {
  return { submit: helmLiving, accuse: false };
}
```

Create `src/bay/ui/prompt.ts`:

```ts
import { GLYPH_ALPHABET, type Puzzle } from '../types';

export type PromptFacts = { kind: Puzzle['kind']; lines: string[] };

export function promptFacts(puzzle: Puzzle): PromptFacts {
  if (puzzle.kind === 'dial') return { kind: 'dial', lines: [String(puzzle.a), String(puzzle.b)] };
  if (puzzle.kind === 'reading') {
    return {
      kind: 'reading',
      lines: [
        `band ${puzzle.band[0]}–${puzzle.band[1]}`,
        ...puzzle.options.map((option) => `${option.label} ${option.value}`),
      ],
    };
  }
  return {
    kind: 'glyph',
    lines: [GLYPH_ALPHABET.join(' '), `seal ${puzzle.seal}`, ...puzzle.shown.map((cell) => cell ?? 'blank')],
  };
}
```

Create `src/bay/ui/format.ts`:

```ts
export { SEAT_NAME, INSTRUMENT, GLYPH_ALPHABET } from '../types';
export { formatBasisPoints, formatDelta } from '../integrity';
```

Create `src/bay/ui/RoleBanner.tsx`:

```tsx
import type { RoleView } from '../types';
import { SEAT_NAME } from './format';

type RoleBannerProps = {
  view: RoleView;
  ejected: boolean;
};

export function RoleBanner({ view, ejected }: RoleBannerProps) {
  if (ejected) {
    const side = view.role === 'saboteur' ? 'a saboteur' : 'crew';
    return (
      <p className="role-banner">
        You are {side}, and you have been ejected. You stay on the roster. You cannot check in or vote.
      </p>
    );
  }
  if (view.role === 'crew') {
    return (
      <p className="role-banner">
        You are crew. Three seats are saboteurs, and they know each other. You see only your own role.
      </p>
    );
  }
  const partners = view.partners.map((seat) => SEAT_NAME[seat]).join(' and ');
  const plan = view.plan ?? 'not posted';
  return (
    <p className="role-banner saboteur">
      You are a saboteur with {partners}. Cell sign {view.sign === 1 ? '+1' : '−1'}. This round&apos;s plan for you:{' '}
      {plan}. The other saboteurs follow the plan. You may ignore it.
    </p>
  );
}
```

Create `src/bay/ui/CheckInScreen.tsx`:

```tsx
import { useState } from 'react';
import { viewFor } from '../roles';
import { BAY_SEATS, GLYPH_ALPHABET, INSTRUMENT, type BayAnswer, type BaySession, type ReadingLabel } from '../types';
import { checkInControls } from './controls';
import { formatBasisPoints, SEAT_NAME } from './format';
import { promptFacts } from './prompt';
import { RoleBanner } from './RoleBanner';

type CheckInScreenProps = {
  session: BaySession;
  onSubmit: (answer: BayAnswer) => void;
  onWatch: () => void;
};

export function CheckInScreen({ session, onSubmit, onWatch }: CheckInScreenProps) {
  const helmLiving = !session.ejected.includes('helm');
  const controls = checkInControls(helmLiving);
  const facts = promptFacts(session.puzzle);
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null);
  const [detent, setDetent] = useState(0);
  const [label, setLabel] = useState<ReadingLabel>('R1');
  const [symbol, setSymbol] = useState<(typeof GLYPH_ALPHABET)[number]>('B');

  function submit() {
    if (!controls.submit) return;
    if (session.puzzle.kind === 'dial') onSubmit({ kind: 'dial', detent });
    else if (session.puzzle.kind === 'reading') onSubmit({ kind: 'reading', label });
    else onSubmit({ kind: 'glyph', symbol });
  }

  return (
    <main className="shell">
      <header className="watch-head">
        <div>
          <p className="kicker">RV Argo · seed {session.seed}</p>
          <h1>
            Check-in {session.roundIndex + 1}
            <span> / {session.rounds}</span>
          </h1>
        </div>
        <div className="rescue-readout">
          <span>Integrity</span>
          <strong>{formatBasisPoints(session.integrity)}</strong>
        </div>
      </header>
      <RoleBanner view={view} ejected={!helmLiving} />
      <div
        className="meter"
        role="meter"
        aria-label="Integrity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={session.integrity / 100}
        aria-valuetext={formatBasisPoints(session.integrity)}
      >
        <span className="meter-fill" style={{ width: `${session.integrity / 100}%` }} />
        <span className="meter-mark fail" style={{ left: '55%' }} title="Saboteur line at 55%" />
        <span className="meter-mark" style={{ left: '70%' }} title="Crew line at 70%" />
      </div>
      <p className="fine meter-note">Red is 55%. Amber is 70%. The meter does not end the watch by itself.</p>
      <section className="panel" aria-labelledby="roster">
        <h2 id="roster">Bay roster</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => {
            const gone = session.ejected.includes(seat);
            return (
              <li key={seat} className={gone ? 'ejected' : undefined}>
                <strong>
                  {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
                </strong>
                <span>{gone ? 'Ejected · still on the roster' : 'On the watch'}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel" aria-labelledby="prompt">
        <h2 id="prompt">Check-in</h2>
        <ul className="roster">
          {facts.lines.map((line) => (
            <li key={line}>
              <strong>{line}</strong>
            </li>
          ))}
        </ul>
        {controls.submit && session.puzzle.kind === 'dial' ? (
          <div className="actions" role="radiogroup" aria-label="Detent">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((value) => (
              <label key={value} className={detent === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="detent" checked={detent === value} onChange={() => setDetent(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit && session.puzzle.kind === 'reading' ? (
          <div className="actions" role="radiogroup" aria-label="Reading">
            {(['R1', 'R2', 'R3', 'R4', 'R5'] as const).map((value) => (
              <label key={value} className={label === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="reading" checked={label === value} onChange={() => setLabel(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit && session.puzzle.kind === 'glyph' ? (
          <div className="actions" role="radiogroup" aria-label="Symbol">
            {GLYPH_ALPHABET.map((value) => (
              <label key={value} className={symbol === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="glyph" checked={symbol === value} onChange={() => setSymbol(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit ? (
          <button type="button" className="primary" onClick={submit}>
            Submit check-in
          </button>
        ) : (
          <button type="button" className="primary" onClick={onWatch}>
            Watch this check-in
          </button>
        )}
      </section>
    </main>
  );
}
```

Create `src/bay/ui/DiscussScreen.tsx`:

```tsx
import { useState } from 'react';
import { truthAnswer } from '../fingerprint';
import { viewFor } from '../roles';
import { BAY_SEATS, type BaySeatId, type BaySession } from '../types';
import { clampNotes } from '../notes';
import { discussControls } from './controls';
import { formatBasisPoints, formatDelta, INSTRUMENT, SEAT_NAME } from './format';
import { RoleBanner } from './RoleBanner';

type DiscussScreenProps = {
  session: BaySession;
  notes: string;
  onNotes: (value: string) => void;
  onAdvance: () => void;
  onAccuse: (target: BaySeatId) => void;
  onTakePending: () => void;
};

export function DiscussScreen({ session, notes, onNotes, onAdvance, onAccuse, onTakePending }: DiscussScreenProps) {
  const helmLiving = !session.ejected.includes('helm');
  const controls = discussControls({
    roundIndex: session.roundIndex,
    helmLiving,
    pending: session.pendingCall !== null,
  });
  const record = session.log[session.log.length - 1];
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null);
  const livingTargets = BAY_SEATS.filter((seat) => seat !== 'helm' && !session.ejected.includes(seat));
  const [target, setTarget] = useState<BaySeatId>(livingTargets[0] ?? 'sonar');
  const truth = record ? truthAnswer(record.puzzle) : null;

  return (
    <main className="shell">
      <header className="watch-head">
        <div>
          <p className="kicker">RV Argo · board</p>
          <h1>
            Discuss {session.roundIndex + 1}
            <span> / {session.rounds}</span>
          </h1>
        </div>
        <div className="rescue-readout">
          <span>Integrity</span>
          <strong>{formatBasisPoints(session.integrity)}</strong>
        </div>
      </header>
      <RoleBanner view={view} ejected={!helmLiving} />
      {record && truth ? (
        <section className="panel board" aria-labelledby="board">
          <h2 id="board">Board</h2>
          <p>
            Truth {truth.kind === 'dial' ? truth.detent : truth.kind === 'reading' ? truth.label : truth.symbol}. Delta{' '}
            {formatDelta(record.delta)}.
          </p>
          <ul className="roster">
            {record.rows.map((row) => (
              <li key={row.seat} className={row.absent ? 'ejected' : undefined}>
                <strong>{SEAT_NAME[row.seat]}</strong>
                {row.absent ? (
                  <span>Absent</span>
                ) : (
                  <span className="fingerprint">
                    {row.answer.kind === 'dial'
                      ? row.answer.detent
                      : row.answer.kind === 'reading'
                        ? row.answer.label
                        : row.answer.symbol}{' '}
                    · {row.fingerprint.errorClass} · distance {row.fingerprint.distance} · {row.fingerprint.instrumentId}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel" aria-labelledby="notes">
        <h2 id="notes">Notes</h2>
        <textarea
          className="notes"
          maxLength={2000}
          value={notes}
          onChange={(event) => onNotes(clampNotes(event.target.value))}
        />
      </section>
      {controls.accuse ? (
        <section className="panel" aria-labelledby="accuse">
          <h2 id="accuse">Accusation</h2>
          {controls.takePending && session.pendingCall ? (
            <button type="button" className="primary" onClick={onTakePending}>
              Take {SEAT_NAME[session.pendingCall.caller]} naming {SEAT_NAME[session.pendingCall.nominated]}
            </button>
          ) : null}
          <div className="actions" role="radiogroup" aria-label="Seat to name">
            {livingTargets.map((seat) => (
              <label key={seat} className={target === seat ? 'choice selected' : 'choice'}>
                <input type="radio" name="target" checked={target === seat} onChange={() => setTarget(seat)} />
                {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => onAccuse(target)}>
            Name this seat
          </button>
        </section>
      ) : null}
      {controls.advance ? (
        <button type="button" className="primary" onClick={onAdvance}>
          {session.roundIndex === 0 ? 'Next check-in' : session.roundIndex + 1 >= session.rounds ? 'Close the watch' : 'Advance without a vote'}
        </button>
      ) : null}
    </main>
  );
}
```

In `src/ui/console.css`, change the control font rule to:

```css
button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}
```

Append:

```css
textarea {
  background: var(--inset);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px;
}

.notes {
  width: 100%;
  min-height: 7rem;
}

.fingerprint {
  font-family: ui-monospace, "Cascadia Code", Menlo, Consolas, monospace;
  color: var(--dim);
}

.board {
  display: grid;
  gap: 8px;
}
```

- [ ] **Step 4: Run the tests and the build**

Run: `npm test -- src/bay/ui/controls.test.ts src/bay/ui/prompt.test.ts && npm test && npm run build`

Expected: PASS. `tsc` accepts the new screens even though `src/main.tsx` does not import them. The legacy client still builds.

- [ ] **Step 5: Commit**

```bash
git add src/bay/ui src/ui/console.css
git commit -m "feat: add bay check-in and discuss screens"
```

---

## Task 11: Accusations for eight seats and three saboteurs

**Files:**
- Create: `src/bay/vote.ts`
- Create: `src/bay/meeting.ts`
- Test: `src/bay/meeting.test.ts`
- Modify: `src/game/vote.ts` so `majorityEject` is the generic function. Keep `verdictAfterEject`, `verdictAtEnd`, `accusationsOpen`, and the rescue win reasons in this file until Task 18.

**Interfaces:**
- Consumes: `BayBallot`, `BaySeatId`, `BaySession`, `MeetingRecord`, `Role`, `advance`'s sibling `finishRound` from `src/bay/session.ts`, `livingSeats`
- Produces:
  - `majorityEject<Seat extends string>(votes: readonly { voter: Seat; choice: Seat | 'skip' }[], living: readonly Seat[]): Seat | null`
  - `openAccusation(session: BaySession, caller: BaySeatId, nominated: BaySeatId): BaySession`
  - `takePending(session: BaySession): BaySession`
  - `resolveMeeting(session: BaySession, votes: readonly BayBallot[]): BaySession`
  - `verdictAfterRemoval(roles: Record<BaySeatId, Role>, livingAfter: readonly BaySeatId[]): { winner: 'crew' | 'saboteur'; reason: 'saboteurs-ejected' | 'crew-eliminated' } | null`
  - `ejectionAnnouncement(record: MeetingRecord, seatName: string): string`

`majorityEject` is the current body in `src/game/vote.ts`: ignore voters and targets outside `living`, skip does not count, the needed count is `Math.floor(living.length / 2) + 1`, and two seats both reaching that count returns `null`. `src/game/vote.ts` deletes its local function and re-exports this one. Existing `src/game/vote.test.ts` must stay green without edits.

Ballots open only from discuss, and only when `roundIndex >= 1`. Round 1 throws `Accusations open in the discuss phase of round 2.` Check-in throws `Ballots open from discuss.` Caller and nominee must be living and distinct. `takePending` throws `No nomination is waiting.` when `pendingCall` is null. `resolveMeeting` requires every living seat to have a ballot and throws `Every living seat must vote.` otherwise. It does not draw from the vote stream. A non-ending ejection sets `ejectedRole` to `null` and then calls `finishRound`. An ending ejection sets `ejectedRole` to that seat's role, phase `done`, and does not consult the meter. `ejectionAnnouncement` for a continuing ejection is `${seatName} was ejected.` and must not contain the words crew or saboteur.

- [ ] **Step 1: Write the failing test**

Create `src/bay/meeting.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { truthAnswer } from './fingerprint';
import {
  ejectionAnnouncement,
  majorityEject,
  openAccusation,
  resolveMeeting,
  takePending,
  verdictAfterRemoval,
} from './meeting';
import { livingSeats } from './roles';
import { advance, createBaySession, revealCheckIn } from './session';
import type { BayAnswer, BayBallot, BaySeatId, BaySession } from './types';

function truthMap(session: BaySession): Partial<Record<BaySeatId, BayAnswer>> {
  const answers: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of livingSeats(session.ejected)) answers[seat] = truthAnswer(session.puzzle);
  return answers;
}

function discussRound2(): BaySession {
  const opened = createBaySession({ rounds: 8, seed: 42 });
  return advance(revealCheckIn(opened, truthMap(opened)));
}

function ballots(living: readonly BaySeatId[], choiceFor: (seat: BaySeatId) => BaySeatId | 'skip'): BayBallot[] {
  return living.map((voter) => ({ voter, choice: choiceFor(voter) }));
}

describe('majorityEject', () => {
  it('uses the 8-down-to-2 table', () => {
    const eight = ['helm', 'sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo'] as const;
    expect(Math.floor(8 / 2) + 1).toBe(5);
    expect(Math.floor(7 / 2) + 1).toBe(4);
    expect(Math.floor(6 / 2) + 1).toBe(4);
    expect(Math.floor(5 / 2) + 1).toBe(3);
    expect(Math.floor(4 / 2) + 1).toBe(3);
    expect(Math.floor(3 / 2) + 1).toBe(2);
    expect(Math.floor(2 / 2) + 1).toBe(2);
    const four = ballots(eight, (seat) => (seat === 'helm' || seat === 'sonar' || seat === 'plant' || seat === 'medic' ? 'radio' : 'skip'));
    expect(majorityEject(four, eight)).toBeNull();
    const five = ballots(eight, (seat) => (seat === 'deck' || seat === 'nav' || seat === 'cargo' ? 'skip' : 'radio'));
    expect(majorityEject(five, eight)).toBe('radio');
    const withoutRadio = eight.filter((seat) => seat !== 'radio');
    const ignored = [
      ...ballots(withoutRadio, (seat) => (seat === 'helm' || seat === 'sonar' || seat === 'plant' ? 'sonar' : 'skip')),
      { voter: 'radio' as const, choice: 'sonar' as const },
    ];
    expect(majorityEject(ignored, withoutRadio)).toBeNull();
  });
});

describe('accusations', () => {
  it('rejects ballots during round 1, during check-in, and when no nomination is waiting', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    expect(() => openAccusation(opened, 'helm', 'sonar')).toThrow(/Ballots open from discuss/);
    const round1 = revealCheckIn(opened, truthMap(opened));
    expect(() => openAccusation(round1, 'helm', 'sonar')).toThrow(/round 2/);
    expect(() => takePending(round1)).toThrow(/No nomination is waiting/);
  });

  it('spends a failed accusation without publishing a role', () => {
    let session = revealCheckIn(discussRound2(), truthMap(discussRound2()));
    session = openAccusation(session, 'helm', 'sonar');
    const living = livingSeats(session.ejected);
    const votes = ballots(living, (seat) => (seat === 'helm' || seat === 'plant' || seat === 'medic' || seat === 'cargo' ? 'sonar' : 'skip'));
    session = resolveMeeting(session, votes);
    expect(session.meetings).toHaveLength(1);
    expect(session.meetings[0].ejected).toBeNull();
    expect(session.meetings[0].ejectedRole).toBeNull();
    expect(ejectionAnnouncement(session.meetings[0], 'Sonar')).toBe('No majority. Nobody left the watch.');
    expect(session.phase).toBe('check-in');
    expect(session.roundIndex).toBe(2);
    expect(session.winner).toBeNull();
  });

  it('continues after one saboteur leaves and hides that role', () => {
    let session = revealCheckIn(discussRound2(), truthMap(discussRound2()));
    session = openAccusation(session, 'helm', 'radio');
    const living = livingSeats(session.ejected);
    session = resolveMeeting(session, ballots(living, () => 'radio'));
    expect(session.winner).toBeNull();
    expect(session.meetings[0].ejected).toBe('radio');
    expect(session.meetings[0].ejectedRole).toBeNull();
    expect(ejectionAnnouncement(session.meetings[0], 'Radio')).toBe('Radio was ejected.');
    expect(ejectionAnnouncement(session.meetings[0], 'Radio')).not.toMatch(/crew|saboteur/i);
    expect(session.ejected).toEqual(['radio']);
    expect(session.phase).toBe('check-in');
    const smuggled = { ...truthMap(session), radio: truthAnswer(session.puzzle) };
    expect(() => revealCheckIn(session, smuggled)).toThrow(/Ejected seats cannot check in/);
    const revealed = revealCheckIn(session, truthMap(session));
    expect(revealed.log[revealed.log.length - 1].rows.find((row) => row.seat === 'radio')).toEqual({
      seat: 'radio',
      absent: true,
    });
  });

  it('ends for the crew when the last saboteur is ejected', () => {
    const roles = createBaySession({ rounds: 8, seed: 42 }).cell.roles;
    expect(verdictAfterRemoval(roles, ['helm', 'sonar', 'plant', 'medic', 'cargo'])).toEqual({
      winner: 'crew',
      reason: 'saboteurs-ejected',
    });
    expect(verdictAfterRemoval(roles, ['helm', 'radio'])).toBeNull();
    expect(verdictAfterRemoval(roles, ['radio', 'nav', 'deck'])).toEqual({
      winner: 'saboteur',
      reason: 'crew-eliminated',
    });
  });
});
```

`discussRound2` advances past round index 0, so the next `revealCheckIn` is round index 1. Calling `truthMap(discussRound2())` twice creates two sessions; that is fine because the puzzle at round index 1 depends only on the seed. The failed-vote and one-ejection tests each call `revealCheckIn(discussRound2(), truthMap(discussRound2()))`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/meeting.test.ts`

Expected: FAIL. `majorityEject` is not exported from `./meeting`.

- [ ] **Step 3: Write the vote and meeting modules**

Create `src/bay/vote.ts`:

```ts
export function majorityEject<Seat extends string>(
  votes: readonly { voter: Seat; choice: Seat | 'skip' }[],
  living: readonly Seat[],
): Seat | null {
  if (living.length === 0) return null;
  const eligible = new Set(living);
  const counts = new Map<Seat, number>();
  for (const vote of votes) {
    if (!eligible.has(vote.voter)) continue;
    if (vote.choice === 'skip' || !eligible.has(vote.choice)) continue;
    counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
  }
  const needed = Math.floor(living.length / 2) + 1;
  let chosen: Seat | null = null;
  for (const [seat, count] of counts) {
    if (count >= needed) {
      if (chosen) return null;
      chosen = seat;
    }
  }
  return chosen;
}
```

Create `src/bay/meeting.ts`:

```ts
import { finishRound } from './session';
import { livingSeats } from './roles';
import type { BayBallot, BaySeatId, BaySession, MeetingRecord, Role } from './types';
import { majorityEject } from './vote';

export { majorityEject } from './vote';

export function verdictAfterRemoval(
  roles: Record<BaySeatId, Role>,
  livingAfter: readonly BaySeatId[],
): { winner: 'crew' | 'saboteur'; reason: 'saboteurs-ejected' | 'crew-eliminated' } | null {
  const saboteursLeft = livingAfter.filter((seat) => roles[seat] === 'saboteur').length;
  const crewLeft = livingAfter.filter((seat) => roles[seat] === 'crew').length;
  if (saboteursLeft === 0) return { winner: 'crew', reason: 'saboteurs-ejected' };
  if (crewLeft === 0) return { winner: 'saboteur', reason: 'crew-eliminated' };
  return null;
}

export function ejectionAnnouncement(record: MeetingRecord, seatName: string): string {
  if (!record.ejected) return 'No majority. Nobody left the watch.';
  if (record.ejectedRole) return `${seatName} was ejected. The watch is over.`;
  return `${seatName} was ejected.`;
}

export function openAccusation(session: BaySession, caller: BaySeatId, nominated: BaySeatId): BaySession {
  if (session.phase !== 'discuss') throw new Error('Ballots open from discuss.');
  if (session.roundIndex < 1) throw new Error('Accusations open in the discuss phase of round 2.');
  const living = livingSeats(session.ejected);
  if (living.length < 2) throw new Error('Not enough seats to vote.');
  if (!living.includes(caller)) throw new Error('Ejected seats cannot call a vote.');
  if (!living.includes(nominated)) throw new Error('That seat is already off the watch.');
  if (caller === nominated) throw new Error('Name a different seat.');
  if (session.meetings.some((meeting) => meeting.roundIndex === session.roundIndex)) {
    throw new Error('This round already spent its accusation.');
  }
  return { ...session, phase: 'meeting', meeting: { caller, nominated } };
}

export function takePending(session: BaySession): BaySession {
  if (!session.pendingCall) throw new Error('No nomination is waiting.');
  return openAccusation(session, session.pendingCall.caller, session.pendingCall.nominated);
}

export function resolveMeeting(session: BaySession, votes: readonly BayBallot[]): BaySession {
  if (session.phase !== 'meeting' || !session.meeting) throw new Error('No accusation is open.');
  const living = livingSeats(session.ejected);
  const cast = new Map<BaySeatId, BayBallot['choice']>();
  for (const vote of votes) {
    if (!living.includes(vote.voter)) continue;
    cast.set(vote.voter, vote.choice);
  }
  for (const seat of living) {
    if (!cast.has(seat)) throw new Error('Every living seat must vote.');
  }
  const ballots: BayBallot[] = living.map((voter) => ({ voter, choice: cast.get(voter) ?? 'skip' }));
  const ejectedSeat = majorityEject(ballots, living);
  const base: MeetingRecord = {
    roundIndex: session.roundIndex,
    caller: session.meeting.caller,
    nominated: session.meeting.nominated,
    votes: ballots,
    ejected: ejectedSeat,
    ejectedRole: null,
  };
  if (!ejectedSeat) return finishRound({ ...session, meetings: [...session.meetings, base] });
  const ejected = [...session.ejected, ejectedSeat];
  const verdict = verdictAfterRemoval(session.cell.roles, livingSeats(ejected));
  const record: MeetingRecord = {
    ...base,
    ejectedRole: verdict ? session.cell.roles[ejectedSeat] : null,
  };
  if (verdict) {
    return {
      ...session,
      phase: 'done',
      ejected,
      meeting: null,
      meetings: [...session.meetings, record],
      winner: verdict.winner,
      winReason: verdict.reason,
    };
  }
  return finishRound({ ...session, ejected, meetings: [...session.meetings, record] });
}
```

In `src/game/vote.ts`, delete the local `majorityEject` function and add this line next to the other exports:

```ts
export { majorityEject } from '../bay/vote';
```

Leave `VoteChoice`, `VoteBallot`, `WinReason`, `WatchVerdict`, `verdictAfterEject`, `verdictAtEnd`, and `accusationsOpen` unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/meeting.test.ts src/game/vote.test.ts`

Expected: PASS. The legacy majority tests still pass through the re-export.

- [ ] **Step 5: Commit**

```bash
git add src/bay/vote.ts src/bay/meeting.ts src/bay/meeting.test.ts src/game/vote.ts
git commit -m "feat: eject on a strict majority of eight seats"
```

---

## Task 12: Vote screen

**Files:**
- Create: `src/bay/ui/VoteScreen.tsx`

**Interfaces:**
- Consumes: `BaySeatId`, `BaySession`, `livingSeats`, `SEAT_NAME`, `RoleBanner`, `viewFor`
- Produces: `VoteScreen({ session, onCast }: { session: BaySession; onCast: (choice: BaySeatId | 'skip' | null) => void })`

The screen lists every living seat plus Skip. Helm must pick one before the button enables. An ejected Helm sees the roster note and submits `null`. This task does not mount the screen. `npm run build` typechecks it.

- [ ] **Step 1: Write the screen**

There is no DOM test runner. The failing check is the build, which fails until the file typechecks. Create `src/bay/ui/VoteScreen.tsx`:

```tsx
import { useState } from 'react';
import { livingSeats, viewFor } from '../roles';
import type { BaySeatId, BaySession } from '../types';
import { SEAT_NAME } from './format';
import { RoleBanner } from './RoleBanner';

type VoteScreenProps = {
  session: BaySession;
  onCast: (choice: BaySeatId | 'skip' | null) => void;
};

export function VoteScreen({ session, onCast }: VoteScreenProps) {
  const meeting = session.meeting;
  const living = livingSeats(session.ejected);
  const helmLiving = living.includes('helm');
  const [choice, setChoice] = useState<BaySeatId | 'skip' | null>(null);
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null);
  if (!meeting) return null;

  return (
    <main className="shell">
      <p className="kicker">RV Argo · accusation</p>
      <h1>Vote</h1>
      <RoleBanner view={view} ejected={!helmLiving} />
      <p className="lede">
        {SEAT_NAME[meeting.caller]} names {SEAT_NAME[meeting.nominated]}. Every seat still on the watch votes for
        someone to eject, or skips. It takes more than half of those seats.
      </p>
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (helmLiving && !choice) return;
          onCast(helmLiving ? choice : null);
        }}
      >
        <h2>{helmLiving ? 'Your vote' : 'You are ejected'}</h2>
        {helmLiving ? (
          <div className="actions vote-options" role="radiogroup" aria-label="Who to eject">
            {[...living, 'skip' as const].map((option) => (
              <label key={option} className={choice === option ? 'choice selected' : 'choice'}>
                <input
                  type="radio"
                  name="vote"
                  checked={choice === option}
                  onChange={() => setChoice(option)}
                />
                {option === 'skip' ? 'Skip' : SEAT_NAME[option]}
              </label>
            ))}
          </div>
        ) : (
          <p>You stay on the roster, but you cannot vote.</p>
        )}
        <button type="submit" className="primary" disabled={helmLiving && choice === null}>
          {helmLiving ? 'Lock vote' : 'Hear the votes'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Run the build**

Run: `npm test && npm run build`

Expected: PASS. The legacy app still starts from `src/ui/App.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/bay/ui/VoteScreen.tsx
git commit -m "feat: add the bay vote screen"
```

---

## Task 13: Cell plan table

**Files:**
- Create: `src/bay/plan.ts`
- Test: `src/bay/plan.test.ts`

**Interfaces:**
- Consumes: `BaySeatId`, `Posture`, `PLAN_ONE`, `PLAN_THREE`, `PLAN_TWO`
- Produces: `posturesFor(draw: number, livingSaboteurs: readonly BaySeatId[], roundIndex: number): Record<BaySeatId, Posture>`

`livingSaboteurs` is already in roster order. `k` is its length and must be 1, 2, or 3. The primary seat is `livingSaboteurs[roundIndex % k]`. The secondary seat is `livingSaboteurs[(roundIndex + 1) % k]`. Throw `Cell plan covers 1, 2, or 3 living saboteurs.` for any other `k`.

Three living saboteurs, compared with `<`:

| Draw | Result |
| --- | --- |
| below 0.5 | all honest |
| from 0.5 up to but not including 0.8 | primary near-miss, others honest |
| from 0.8 up to but not including 0.92 | primary and secondary near-miss, the other honest |
| from 0.92 up to but not including 0.97 | primary blatant, others honest |
| 0.97 and above | all three near-miss |

Two living saboteurs: below 0.58 both honest; from 0.58 up to but not including 0.88 primary near-miss; from 0.88 up to but not including 0.96 primary blatant; 0.96 and above both near-miss.

One living saboteur: below 0.72 honest; from 0.72 up to but not including 0.95 near-miss; 0.95 and above blatant. `roundIndex` still selects that only seat.

- [ ] **Step 1: Write the failing test**

Create `src/bay/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { posturesFor } from './plan';

const three = ['radio', 'nav', 'deck'] as const;

describe('posturesFor', () => {
  it('walks the primary nick and the three-saboteur table', () => {
    expect(posturesFor(0.49, three, 0)).toEqual({ radio: 'honest', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.5, three, 0)).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.8, three, 0)).toEqual({ radio: 'near-miss', nav: 'near-miss', deck: 'honest' });
    expect(posturesFor(0.92, three, 0)).toEqual({ radio: 'blatant', nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.97, three, 0)).toEqual({ radio: 'near-miss', nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.8, three, 1)).toEqual({ radio: 'honest', nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.8, three, 2)).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'near-miss' });
  });

  it('uses the two-seat and one-seat tables', () => {
    expect(posturesFor(0.57, ['nav', 'deck'], 0)).toEqual({ nav: 'honest', deck: 'honest' });
    expect(posturesFor(0.58, ['nav', 'deck'], 0)).toEqual({ nav: 'near-miss', deck: 'honest' });
    expect(posturesFor(0.88, ['nav', 'deck'], 0)).toEqual({ nav: 'blatant', deck: 'honest' });
    expect(posturesFor(0.96, ['nav', 'deck'], 0)).toEqual({ nav: 'near-miss', deck: 'near-miss' });
    expect(posturesFor(0.71, ['deck'], 4)).toEqual({ deck: 'honest' });
    expect(posturesFor(0.72, ['deck'], 4)).toEqual({ deck: 'near-miss' });
    expect(posturesFor(0.95, ['deck'], 4)).toEqual({ deck: 'blatant' });
  });

  it('rejects an empty cell', () => {
    expect(() => posturesFor(0, [], 0)).toThrow(/1, 2, or 3/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/plan.test.ts`

Expected: FAIL. `posturesFor` is not defined.

- [ ] **Step 3: Write the table**

Create `src/bay/plan.ts`:

```ts
import { PLAN_ONE, PLAN_THREE, PLAN_TWO } from './constants';
import type { BaySeatId, Posture } from './types';

export function posturesFor(
  draw: number,
  livingSaboteurs: readonly BaySeatId[],
  roundIndex: number,
): Record<BaySeatId, Posture> {
  const count = livingSaboteurs.length;
  if (count < 1 || count > 3) throw new Error('Cell plan covers 1, 2, or 3 living saboteurs.');
  const primary = livingSaboteurs[roundIndex % count];
  const secondary = livingSaboteurs[(roundIndex + 1) % count];
  const postures = {} as Record<BaySeatId, Posture>;
  for (const seat of livingSaboteurs) postures[seat] = 'honest';
  if (count === 3) {
    if (draw < PLAN_THREE.honestBelow) return postures;
    if (draw < PLAN_THREE.oneNearBelow) {
      postures[primary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_THREE.twoNearBelow) {
      postures[primary] = 'near-miss';
      postures[secondary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_THREE.blatantBelow) {
      postures[primary] = 'blatant';
      return postures;
    }
    for (const seat of livingSaboteurs) postures[seat] = 'near-miss';
    return postures;
  }
  if (count === 2) {
    if (draw < PLAN_TWO.honestBelow) return postures;
    if (draw < PLAN_TWO.oneNearBelow) {
      postures[primary] = 'near-miss';
      return postures;
    }
    if (draw < PLAN_TWO.blatantBelow) {
      postures[primary] = 'blatant';
      return postures;
    }
    postures[primary] = 'near-miss';
    postures[secondary] = 'near-miss';
    return postures;
  }
  if (draw < PLAN_ONE.honestBelow) return postures;
  if (draw < PLAN_ONE.nearBelow) {
    postures[primary] = 'near-miss';
    return postures;
  }
  postures[primary] = 'blatant';
  return postures;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/bay/plan.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/bay/plan.ts src/bay/plan.test.ts
git commit -m "feat: choose the shared saboteur plan for the round"
```

---

## Task 14: AI check-in answers

**Files:**
- Create: `src/bay/answers.ts`
- Test: `src/bay/answers.test.ts`
- Modify: `src/bay/session.ts`
- Modify: `src/bay/session.test.ts` to delete the single assertion `expect(session.checkInState).toBe(203342640);`. Keep `expect(checkInStreamStart(42)).toBe(203342640);`. After this task, `createBaySession` consumes the round's check-in draws, so the stored `checkInState` is no longer the start value.

**Interfaces:**
- Consumes: `BayAnswer`, `BaySeatId`, `BaySession`, `Cell`, `Controller`, `Puzzle`, `Posture`, `crew` thresholds, `rngStep`, `intBetween`, `posturesFor`, `truthAnswer`, `nearAnswers`, `blatantAnswers`, `signedNearAnswer`, `livingSeats`, `BAY_SEATS`
- Produces:
  - `crewPosture(draw: number): Posture` — below 0.82 honest, from 0.82 up to but not including 0.97 near-miss, 0.97 and above blatant
  - `fillAiAnswers(input: { puzzle: Puzzle; cell: Cell; roundIndex: number; ejected: readonly BaySeatId[]; controllers: Record<BaySeatId, Controller>; checkInState: number }): { prepared: Partial<Record<BaySeatId, BayAnswer>>; plan: { draw: number; postures: Partial<Record<BaySeatId, Posture>> }; checkInState: number }`
  - `submitHumans(session: BaySession, answers: Partial<Record<BaySeatId, BayAnswer>>): BaySession`
  - `resolveUnattended(session: BaySession): BaySession`

Draw order on the check-in stream, which already starts at `checkInStreamStart(seed)`:

1. One `rngStep` unit draw selects the plan. `posturesFor` receives the living saboteurs in roster order, including Helm when Helm is a saboteur. The plan is stored even though Helm does not consume the two per-seat draws.
2. For each living seat in roster order whose controller is `ai`: one `rngStep` unit draw, then a second draw. Ejected seats and human seats consume neither draw.
3. A crew seat reads the first draw with `crewPosture`. Honest submits `truthAnswer` and still consumes the second draw via `rngStep`. Near-miss uses `intBetween(state, 0, near.length - 1)` on `nearAnswers`. Blatant uses `intBetween` on `blatantAnswers`. Crew near-misses are not passed through `signedNearAnswer`.
4. A saboteur seat ignores the first draw. Honest submits the truth and consumes the second draw via `rngStep`. Near-miss submits `signedNearAnswer(puzzle, cell.sign)` and consumes the second draw via `rngStep`. Blatant uses `intBetween` on the blatant list and does not take an extra `rngStep` beyond the one inside `intBetween`.

`createBaySession` and the next-check-in branch of `finishRound` call `fillAiAnswers` before returning. `revealCheckIn` still uses only the answer map it is given. `submitHumans` copies `prepared`, requires an answer for every living human, rejects an answer aimed at an AI seat with `AI seats submit through the check-in policy.`, and then calls `revealCheckIn`. `resolveUnattended` throws `A living human still has the console.` when a living human remains, and otherwise reveals `prepared`.

Locked seed 42, Helm crew, sign `+1`:

- Round 0 plan postures: radio near-miss, nav honest, deck honest. AI answers: sonar 10, radio 11, nav 10, plant 10, deck 10, medic 10, cargo 10. Truth is 10. The `+1` neighbor is 11.
- Round 1, after those draws were consumed: nav and deck both submit detent 2, everyone else listed above submits 1. Truth is 1. Both nicks are the `+1` neighbor, not 0.

Locked seed 0: round 0 cargo submits detent 6 while the truth is 8. At round index 2, sonar submits detent 3 while the truth is 4 and the cell sign is `+1`. The `+1` neighbor is 5, so this crew slip is the other neighbor.

Locked seed 23: Helm is a saboteur. Round 0 postures for helm, deck, and medic are all `near-miss`. `prepared.helm` is absent. `prepared.deck` and `prepared.medic` both equal `signedNearAnswer(puzzle, -1)`.

- [ ] **Step 1: Write the failing test**

Create `src/bay/answers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { crewPosture, fillAiAnswers } from './answers';
import { signedNearAnswer, truthAnswer } from './fingerprint';
import { advance, createBaySession, submitHumans } from './session';
import type { BaySession } from './types';

function detent(session: BaySession, seat: 'sonar' | 'radio' | 'nav' | 'plant' | 'deck' | 'medic' | 'cargo'): number {
  const answer = session.prepared[seat];
  if (!answer || answer.kind !== 'dial') throw new Error(`Expected a dial answer for ${seat}.`);
  return answer.detent;
}

describe('crewPosture', () => {
  it('cuts the unit draw at 0.82 and 0.97', () => {
    expect(crewPosture(0)).toBe('honest');
    expect(crewPosture(0.82)).toBe('near-miss');
    expect(crewPosture(0.82 - Number.EPSILON)).toBe('honest');
    expect(crewPosture(0.97)).toBe('blatant');
    expect(crewPosture(0.97 - Number.EPSILON)).toBe('near-miss');
  });
});

describe('fillAiAnswers', () => {
  it('locks seed 42 round 0 and does not read Helm', () => {
    const left = createBaySession({ rounds: 8, seed: 42 });
    const right = createBaySession({ rounds: 8, seed: 42 });
    expect(left.plan?.postures).toEqual({ radio: 'near-miss', nav: 'honest', deck: 'honest' });
    expect(detent(left, 'sonar')).toBe(10);
    expect(detent(left, 'radio')).toBe(11);
    expect(detent(left, 'nav')).toBe(10);
    expect(detent(left, 'plant')).toBe(10);
    expect(detent(left, 'deck')).toBe(10);
    expect(detent(left, 'medic')).toBe(10);
    expect(detent(left, 'cargo')).toBe(10);
    expect(left.prepared.helm).toBeUndefined();
    const honest = submitHumans(left, { helm: { kind: 'dial', detent: 10 } });
    const other = submitHumans(right, { helm: { kind: 'dial', detent: 0 } });
    expect(honest.prepared).toEqual(other.prepared);
    const honestRadio = honest.log[0].rows.find((row) => row.seat === 'radio');
    const otherRadio = other.log[0].rows.find((row) => row.seat === 'radio');
    expect(honestRadio).toEqual(otherRadio);
  });

  it('keeps the cell on one sign on seed 42 round 1', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
    session = advance(session);
    expect(session.roundIndex).toBe(1);
    expect(session.cell.sign).toBe(1);
    expect(session.plan?.postures).toEqual({ radio: 'honest', nav: 'near-miss', deck: 'near-miss' });
    expect(detent(session, 'nav')).toBe(2);
    expect(detent(session, 'deck')).toBe(2);
    expect(detent(session, 'radio')).toBe(1);
    expect(signedNearAnswer(session.puzzle, 1)).toEqual({ kind: 'dial', detent: 2 });
  });

  it('lets a crew near-miss land on the neighbor the cell did not pick', () => {
    const opened = createBaySession({ rounds: 10, seed: 0 });
    expect(opened.puzzle.kind).toBe('dial');
    if (opened.puzzle.kind === 'dial') expect(opened.puzzle.truth).toBe(8);
    expect(opened.prepared.cargo).toEqual({ kind: 'dial', detent: 6 });
    let session = opened;
    for (let round = 0; round < 2; round += 1) {
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      session = advance(session);
    }
    expect(session.roundIndex).toBe(2);
    expect(session.puzzle.kind).toBe('dial');
    if (session.puzzle.kind === 'dial') expect(session.puzzle.truth).toBe(4);
    expect(session.prepared.sonar).toEqual({ kind: 'dial', detent: 3 });
    expect(session.cell.sign).toBe(1);
    expect(signedNearAnswer(session.puzzle, 1)).toEqual({ kind: 'dial', detent: 5 });
  });

  it('posts a plan for a saboteur Helm and does not draw Helm an answer', () => {
    const session = createBaySession({ rounds: 8, seed: 23 });
    expect(session.cell.roles.helm).toBe('saboteur');
    expect(session.cell.sign).toBe(-1);
    expect(session.plan?.postures).toEqual({ helm: 'near-miss', deck: 'near-miss', medic: 'near-miss' });
    expect(session.prepared.helm).toBeUndefined();
    expect(session.prepared.deck).toEqual(signedNearAnswer(session.puzzle, -1));
    expect(session.prepared.medic).toEqual(session.prepared.deck);
  });
});

describe('fillAiAnswers is reachable without a session', () => {
  it('returns the same prepared map the session stored', () => {
    const session = createBaySession({ rounds: 8, seed: 42 });
    const filled = fillAiAnswers({
      puzzle: session.puzzle,
      cell: session.cell,
      roundIndex: 0,
      ejected: [],
      controllers: session.controllers,
      checkInState: 203342640,
    });
    expect(filled.prepared).toEqual(session.prepared);
    expect(filled.plan.postures).toEqual(session.plan?.postures);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/answers.test.ts`

Expected: FAIL. `crewPosture` is not defined, and `submitHumans` is not exported.

- [ ] **Step 3: Write the answer filler and call it from the session**

Create `src/bay/answers.ts`:

```ts
import { intBetween, rngStep } from '../game/rng';
import { CREW_EXACT_BELOW, CREW_NEAR_BELOW } from './constants';
import { blatantAnswers, nearAnswers, signedNearAnswer, truthAnswer } from './fingerprint';
import { posturesFor } from './plan';
import { livingSeats } from './roles';
import {
  BAY_SEATS,
  type BayAnswer,
  type BaySeatId,
  type Cell,
  type Controller,
  type Posture,
  type Puzzle,
} from './types';

export function crewPosture(draw: number): Posture {
  if (draw < CREW_EXACT_BELOW) return 'honest';
  if (draw < CREW_NEAR_BELOW) return 'near-miss';
  return 'blatant';
}

function consumeIgnoredDraw(state: number): number {
  return rngStep(state).state;
}

function fromList(answers: BayAnswer[], index: number): BayAnswer {
  const answer = answers[index];
  if (!answer) throw new Error('Answer list index is out of range.');
  return answer;
}

export function fillAiAnswers(input: {
  puzzle: Puzzle;
  cell: Cell;
  roundIndex: number;
  ejected: readonly BaySeatId[];
  controllers: Record<BaySeatId, Controller>;
  checkInState: number;
}): {
  prepared: Partial<Record<BaySeatId, BayAnswer>>;
  plan: { draw: number; postures: Partial<Record<BaySeatId, Posture>> };
  checkInState: number;
} {
  const living = livingSeats(input.ejected);
  const livingSaboteurs = living.filter((seat) => input.cell.roles[seat] === 'saboteur');
  let state = input.checkInState;
  const planRoll = rngStep(state);
  state = planRoll.state;
  const postures = posturesFor(planRoll.value, livingSaboteurs, input.roundIndex);
  const prepared: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai') continue;
    const first = rngStep(state);
    state = first.state;
    if (input.cell.roles[seat] === 'crew') {
      const posture = crewPosture(first.value);
      if (posture === 'honest') {
        prepared[seat] = truthAnswer(input.puzzle);
        state = consumeIgnoredDraw(state);
      } else if (posture === 'near-miss') {
        const near = nearAnswers(input.puzzle);
        const rolled = intBetween(state, 0, near.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(near, rolled.value);
      } else {
        const blatant = blatantAnswers(input.puzzle);
        const rolled = intBetween(state, 0, blatant.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(blatant, rolled.value);
      }
    } else {
      const posture = postures[seat];
      if (posture === 'blatant') {
        const blatant = blatantAnswers(input.puzzle);
        const rolled = intBetween(state, 0, blatant.length - 1);
        state = rolled.state;
        prepared[seat] = fromList(blatant, rolled.value);
      } else if (posture === 'near-miss') {
        prepared[seat] = signedNearAnswer(input.puzzle, input.cell.sign);
        state = consumeIgnoredDraw(state);
      } else {
        prepared[seat] = truthAnswer(input.puzzle);
        state = consumeIgnoredDraw(state);
      }
    }
  }
  return {
    prepared,
    plan: { draw: planRoll.value, postures },
    checkInState: state,
  };
}
```

In `src/bay/session.ts`, import `fillAiAnswers` and add:

```ts
import { fillAiAnswers } from './answers';
import type { BayAnswer, BaySeatId, BaySession } from './types';

function withAi(session: BaySession): BaySession {
  const filled = fillAiAnswers({
    puzzle: session.puzzle,
    cell: session.cell,
    roundIndex: session.roundIndex,
    ejected: session.ejected,
    controllers: session.controllers,
    checkInState: session.checkInState,
  });
  return {
    ...session,
    prepared: filled.prepared,
    plan: filled.plan,
    checkInState: filled.checkInState,
  };
}

export function submitHumans(
  session: BaySession,
  answers: Partial<Record<BaySeatId, BayAnswer>>,
): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  const living = livingSeats(session.ejected);
  const merged: Partial<Record<BaySeatId, BayAnswer>> = { ...session.prepared };
  for (const seat of living) {
    if (session.controllers[seat] === 'human') {
      const answer = answers[seat];
      if (!answer) throw new Error('Every living human seat must submit.');
      merged[seat] = answer;
    } else if (answers[seat]) {
      throw new Error('AI seats submit through the check-in policy.');
    }
  }
  return revealCheckIn(session, merged);
}

export function resolveUnattended(session: BaySession): BaySession {
  if (session.phase !== 'check-in') throw new Error('No open check-in.');
  if (livingSeats(session.ejected).some((seat) => session.controllers[seat] === 'human')) {
    throw new Error('A living human still has the console.');
  }
  return revealCheckIn(session, { ...session.prepared });
}
```

Change `createBaySession` to `return withAi({ ...the object currently returned... })`.

Change the next-check-in return inside `finishRound` to `return withAi({ ...the object currently returned... })`. Do not call `withAi` on the done branches.

Delete this assertion from `src/bay/session.test.ts`:

```ts
expect(session.checkInState).toBe(203342640);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/answers.test.ts src/bay/session.test.ts`

Expected: PASS. Seed 42 round 1 matches only if honest seats consumed the unused second draw.

- [ ] **Step 5: Commit**

```bash
git add src/bay/answers.ts src/bay/answers.test.ts src/bay/session.ts src/bay/session.test.ts
git commit -m "feat: fill AI check-ins from the cell plan and crew table"
```

---

## Task 15: Suspicion, nomination, and ballots

**Files:**
- Create: `src/bay/suspicion.ts`
- Create: `src/bay/nominate.ts`
- Test: `src/bay/suspicion.test.ts`
- Modify: `src/bay/session.ts` so `revealCheckIn` calls `evaluateNomination` when `roundIndex >= 1`
- Modify: `src/bay/meeting.ts` to export `castBallots`

**Interfaces:**
- Consumes: `BayBallot`, `BaySeatId`, `BaySession`, `CheckInRecord`, `Controller`, `PendingCall`, `Puzzle`, `Role`, `CALL_SUSPICION` 0.4, `FRAME_BELOW` 0.12, `FRAME_SUSPICION` 0.3, `SELF_VOTE_BELOW` 0.08, `MISS_EXACT` 0, `MISS_NEAR` 0.55, `MISS_BLATANT` 1, `SUSPICION_MISS_WEIGHT` 0.75, `SUSPICION_PATTERN_WEIGHT` 0.25, `rngStep`, `fingerprint`, `livingSeats`, `resolveMeeting`
- Produces:
  - `missSign(puzzle: Puzzle, answer: BayAnswer): 1 | -1 | 0 | null`
  - `suspicionScores(log: readonly CheckInRecord[]): Record<BaySeatId, number>`
  - `nameTarget(input: { viewer: BaySeatId; roles: Record<BaySeatId, Role>; living: readonly BaySeatId[]; suspicion: Record<BaySeatId, number>; threshold: number; pool: 'others' | 'crew' }): BaySeatId | null`
  - `evaluateNomination(input: { roundIndex: number; voteState: number; controllers: Record<BaySeatId, Controller>; roles: Record<BaySeatId, Role>; ejected: readonly BaySeatId[]; log: readonly CheckInRecord[] }): { pendingCall: PendingCall | null; voteState: number }`
  - `fillBallots(input: { voteState: number; living: readonly BaySeatId[]; controllers: Record<BaySeatId, Controller>; roles: Record<BaySeatId, Role>; suspicion: Record<BaySeatId, number>; humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>> }): { ballots: BayBallot[]; voteState: number }`
  - `castBallots(session: BaySession, humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>>): BaySession`

`missSign` returns `null` for an exact answer and for every reading. On a dial or glyph it returns the shorter step from the truth index to the submitted index, `+1` forward and `-1` backward. Equal steps (dial distance 6, glyph distance 4) return `0`. `0` is not a non-zero sign.

Miss mean is the average weight of rounds that seat submitted. Pattern score is the fraction of that seat's non-zero signs that match the modal sign. Modal sign is the `+1` or `-1` with the greater count across every seat. A tie, or no signed misses, means no bias, and every pattern score is 0. Suspicion is `0.75 * miss mean + 0.25 * pattern score`.

`nameTarget` considers living seats in roster order, skips the viewer, and in the `crew` pool also skips non-crew. A score must be greater than or equal to `threshold`. Ties keep the earlier seat.

`evaluateNomination` on `roundIndex < 1` returns a null call and the same `voteState`. Otherwise the earliest living crew AI who would name someone at 0.40 becomes the pending caller, and the vote stream is not drawn. Helm is not a candidate because Helm's controller is `human`. If no crew AI would call, one `rngStep` is consumed. Below 0.12, the earliest living saboteur AI names a crew seat at 0.30 or above. Otherwise the pending call is null. The draw is consumed in every no-crew-call case, including when the saboteur's best score is below 0.30 and when no saboteur AI is alive.

`fillBallots` walks living seats in roster order. A human seat uses `humanVotes` and consumes no draw; a missing human vote throws `Every living human seat must vote.` An AI seat consumes one `rngStep`. Crew use pool `others` at 0.40 and ignore the draw. Saboteurs use pool `crew` at 0.40, then replace the choice with their own seat when the draw is below 0.08. A draw of exactly 0.08 does not self-vote. `castBallots` requires phase `meeting`, scores `session.log`, writes the returned `voteState`, and calls `resolveMeeting` with those ballots.

- [ ] **Step 1: Write the failing test**

Create `src/bay/suspicion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fingerprint } from './fingerprint';
import { evaluateNomination, fillBallots } from './nominate';
import { assembleDial } from './puzzles';
import { assignCell, soloControllers } from './roles';
import { missSign, nameTarget, suspicionScores } from './suspicion';
import { BAY_SEATS, INSTRUMENT, type BaySeatId, type CheckInRecord } from './types';

function dialLog(rounds: Array<Record<BaySeatId, number>>): CheckInRecord[] {
  return rounds.map((detents, roundIndex) => {
    const puzzle = assembleDial(3, 3);
    return {
      roundIndex,
      puzzle,
      integrityBefore: 4200,
      integrityAfter: 4200,
      row: 'split',
      delta: -200,
      rows: BAY_SEATS.map((seat) => ({
        seat,
        absent: false as const,
        answer: { kind: 'dial' as const, detent: detents[seat] },
        fingerprint: fingerprint(puzzle, { kind: 'dial', detent: detents[seat] }, INSTRUMENT[seat]),
      })),
    };
  });
}

function exactRound(overrides: Partial<Record<BaySeatId, number>> = {}): Record<BaySeatId, number> {
  const detents = {} as Record<BaySeatId, number>;
  for (const seat of BAY_SEATS) detents[seat] = overrides[seat] ?? 6;
  return detents;
}

describe('missSign', () => {
  it('reads the shorter dial or glyph step and ignores readings and exact answers', () => {
    const dial = assembleDial(3, 3);
    expect(missSign(dial, { kind: 'dial', detent: 6 })).toBeNull();
    expect(missSign(dial, { kind: 'dial', detent: 7 })).toBe(1);
    expect(missSign(dial, { kind: 'dial', detent: 5 })).toBe(-1);
    expect(missSign(dial, { kind: 'dial', detent: 0 })).toBe(0);
    const reading = {
      kind: 'reading' as const,
      anchor: 55,
      offset: 6,
      band: [55, 62] as [number, number],
      options: [
        { label: 'R1' as const, role: 'near' as const, value: 53 },
        { label: 'R2' as const, role: 'far' as const, value: 75 },
        { label: 'R3' as const, role: 'true' as const, value: 61 },
        { label: 'R4' as const, role: 'far' as const, value: 39 },
        { label: 'R5' as const, role: 'far' as const, value: 89 },
      ],
      truth: 'R1' as const,
      near: ['R1' as const],
      blatant: ['R2' as const, 'R4' as const, 'R5' as const],
    };
    expect(missSign(reading, { kind: 'reading', label: 'R2' })).toBeNull();
  });
});

describe('suspicion', () => {
  it('mixes miss weight 3:1 with the modal sign and breaks ties toward the earlier seat', () => {
    const log = dialLog([
      exactRound({ radio: 7, nav: 8, plant: 5 }),
    ]);
    const scores = suspicionScores(log);
    expect(scores.radio).toBeCloseTo(0.6625, 10);
    expect(scores.nav).toBeCloseTo(1, 10);
    expect(scores.plant).toBeCloseTo(0.4125, 10);
    expect(scores.sonar).toBe(0);
    const roles = assignCell(42).roles;
    expect(
      nameTarget({ viewer: 'sonar', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'others' }),
    ).toBe('nav');
    expect(
      nameTarget({ viewer: 'radio', roles, living: [...BAY_SEATS], suspicion: scores, threshold: 0.4, pool: 'crew' }),
    ).toBe('plant');
    const tied = suspicionScores(dialLog([exactRound({ sonar: 7, radio: 7 })]));
    expect(
      nameTarget({
        viewer: 'medic',
        roles,
        living: [...BAY_SEATS],
        suspicion: tied,
        threshold: 0.4,
        pool: 'others',
      }),
    ).toBe('sonar');
  });

  it('puts one signed near spread over three rounds in the frame band', () => {
    const log = dialLog([exactRound({ plant: 7 }), exactRound(), exactRound()]);
    expect(suspicionScores(log).plant).toBeCloseTo(0.3875, 10);
  });
});

describe('evaluateNomination', () => {
  it('does not draw on round 1', () => {
    const cell = assignCell(42);
    const result = evaluateNomination({
      roundIndex: 0,
      voteState: 1887305771,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log: [],
    });
    expect(result).toEqual({ pendingCall: null, voteState: 1887305771 });
  });

  it('lets the earliest crew AI call without consuming the frame draw', () => {
    const cell = assignCell(42);
    const log = dialLog([exactRound({ radio: 7, nav: 8, plant: 5 })]);
    const result = evaluateNomination({
      roundIndex: 1,
      voteState: 7,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(result.pendingCall).toEqual({ caller: 'sonar', nominated: 'nav' });
    expect(result.voteState).toBe(7);
  });

  it('frames a crew seat below 0.12 and stays silent at or above 0.12', () => {
    const cell = assignCell(42);
    const log = dialLog([exactRound({ plant: 7 }), exactRound(), exactRound()]);
    const framed = evaluateNomination({
      roundIndex: 1,
      voteState: 7,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(framed.pendingCall).toEqual({ caller: 'radio', nominated: 'plant' });
    expect(framed.voteState).toBe(1831565820);
    const silent = evaluateNomination({
      roundIndex: 1,
      voteState: 1887305771,
      controllers: soloControllers(),
      roles: cell.roles,
      ejected: [],
      log,
    });
    expect(silent.pendingCall).toBeNull();
    expect(silent.voteState).toBe(-576095712);
  });
});

describe('fillBallots', () => {
  it('ignores a crew draw below 0.08 and lets a saboteur self-vote', () => {
    const cell = assignCell(42);
    const suspicion = {} as Record<BaySeatId, number>;
    for (const seat of BAY_SEATS) suspicion[seat] = 0;
    const filled = fillBallots({
      voteState: 7,
      living: [...BAY_SEATS],
      controllers: soloControllers(),
      roles: cell.roles,
      suspicion,
      humanVotes: { helm: 'skip' },
    });
    expect(filled.voteState).toBe(-63941190);
    expect(filled.ballots.find((ballot) => ballot.voter === 'sonar')?.choice).toBe('skip');
    expect(filled.ballots.find((ballot) => ballot.voter === 'radio')?.choice).toBe('radio');
    expect(filled.ballots.find((ballot) => ballot.voter === 'nav')?.choice).not.toBe('radio');
    expect(filled.ballots.find((ballot) => ballot.voter === 'deck')?.choice).not.toBe('radio');
    expect(filled.ballots.map((ballot) => ballot.voter)).toEqual([...BAY_SEATS]);
  });
});
```

The reading fixture in `missSign` marks `R1` as both the truth label and the near role so the distance table is irrelevant: every reading sign is `null`. That fixture is only for `missSign`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/suspicion.test.ts`

Expected: FAIL. `missSign` is not defined.

- [ ] **Step 3: Write suspicion, nomination, and the session hook**

Create `src/bay/suspicion.ts`:

```ts
import { fingerprint } from './fingerprint';
import {
  MISS_BLATANT,
  MISS_EXACT,
  MISS_NEAR,
  SUSPICION_MISS_WEIGHT,
  SUSPICION_PATTERN_WEIGHT,
} from './constants';
import { GLYPH_ALPHABET, BAY_SEATS, type BayAnswer, type BaySeatId, type CheckInRecord, type Puzzle, type Role } from './types';

function indexOf(puzzle: Puzzle, answer: BayAnswer): { truth: number; submitted: number; size: number } | null {
  if (puzzle.kind === 'dial' && answer.kind === 'dial') {
    return { truth: puzzle.truth, submitted: answer.detent, size: 12 };
  }
  if (puzzle.kind === 'glyph' && answer.kind === 'glyph') {
    return {
      truth: GLYPH_ALPHABET.indexOf(puzzle.truth),
      submitted: GLYPH_ALPHABET.indexOf(answer.symbol),
      size: 8,
    };
  }
  return null;
}

export function missSign(puzzle: Puzzle, answer: BayAnswer): 1 | -1 | 0 | null {
  if (answer.kind !== puzzle.kind) return null;
  if (fingerprint(puzzle, answer, 'INST-1').errorClass === 'exact') return null;
  const indexes = indexOf(puzzle, answer);
  if (!indexes) return null;
  const forward = (indexes.submitted - indexes.truth + indexes.size) % indexes.size;
  const back = (indexes.truth - indexes.submitted + indexes.size) % indexes.size;
  if (forward === back) return 0;
  return forward < back ? 1 : -1;
}

export function suspicionScores(log: readonly CheckInRecord[]): Record<BaySeatId, number> {
  const weights = {} as Record<BaySeatId, number[]>;
  const signs = {} as Record<BaySeatId, Array<1 | -1>>;
  const modal = { plus: 0, minus: 0 };
  for (const seat of BAY_SEATS) {
    weights[seat] = [];
    signs[seat] = [];
  }
  for (const record of log) {
    for (const row of record.rows) {
      if (row.absent) continue;
      const weight =
        row.fingerprint.errorClass === 'exact'
          ? MISS_EXACT
          : row.fingerprint.errorClass === 'near-miss'
            ? MISS_NEAR
            : MISS_BLATANT;
      weights[row.seat].push(weight);
      const sign = missSign(record.puzzle, row.answer);
      if (sign === 1) {
        signs[row.seat].push(1);
        modal.plus += 1;
      } else if (sign === -1) {
        signs[row.seat].push(-1);
        modal.minus += 1;
      }
    }
  }
  const bias: 1 | -1 | null = modal.plus === modal.minus ? null : modal.plus > modal.minus ? 1 : -1;
  const scores = {} as Record<BaySeatId, number>;
  for (const seat of BAY_SEATS) {
    const list = weights[seat];
    const mean = list.length === 0 ? 0 : list.reduce((sum, value) => sum + value, 0) / list.length;
    const own = signs[seat];
    const pattern =
      bias === null || own.length === 0 ? 0 : own.filter((sign) => sign === bias).length / own.length;
    scores[seat] = SUSPICION_MISS_WEIGHT * mean + SUSPICION_PATTERN_WEIGHT * pattern;
  }
  return scores;
}

export function nameTarget(input: {
  viewer: BaySeatId;
  roles: Record<BaySeatId, Role>;
  living: readonly BaySeatId[];
  suspicion: Record<BaySeatId, number>;
  threshold: number;
  pool: 'others' | 'crew';
}): BaySeatId | null {
  let best: BaySeatId | null = null;
  for (const seat of BAY_SEATS) {
    if (!input.living.includes(seat) || seat === input.viewer) continue;
    if (input.pool === 'crew' && input.roles[seat] !== 'crew') continue;
    const score = input.suspicion[seat] ?? 0;
    if (score < input.threshold) continue;
    if (best === null || score > (input.suspicion[best] ?? 0)) best = seat;
  }
  return best;
}
```

Create `src/bay/nominate.ts`:

```ts
import { rngStep } from '../game/rng';
import { CALL_SUSPICION, FRAME_BELOW, FRAME_SUSPICION, SELF_VOTE_BELOW } from './constants';
import { livingSeats } from './roles';
import { nameTarget, suspicionScores } from './suspicion';
import {
  BAY_SEATS,
  type BayBallot,
  type BaySeatId,
  type CheckInRecord,
  type Controller,
  type PendingCall,
  type Role,
} from './types';

export function evaluateNomination(input: {
  roundIndex: number;
  voteState: number;
  controllers: Record<BaySeatId, Controller>;
  roles: Record<BaySeatId, Role>;
  ejected: readonly BaySeatId[];
  log: readonly CheckInRecord[];
}): { pendingCall: PendingCall | null; voteState: number } {
  if (input.roundIndex < 1) return { pendingCall: null, voteState: input.voteState };
  const living = livingSeats(input.ejected);
  const suspicion = suspicionScores(input.log);
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai' || input.roles[seat] !== 'crew') continue;
    const nominated = nameTarget({
      viewer: seat,
      roles: input.roles,
      living,
      suspicion,
      threshold: CALL_SUSPICION,
      pool: 'others',
    });
    if (nominated) return { pendingCall: { caller: seat, nominated }, voteState: input.voteState };
  }
  const rolled = rngStep(input.voteState);
  let caller: BaySeatId | null = null;
  for (const seat of BAY_SEATS) {
    if (!living.includes(seat) || input.controllers[seat] !== 'ai' || input.roles[seat] !== 'saboteur') continue;
    caller = seat;
    break;
  }
  if (rolled.value >= FRAME_BELOW || !caller) return { pendingCall: null, voteState: rolled.state };
  const nominated = nameTarget({
    viewer: caller,
    roles: input.roles,
    living,
    suspicion,
    threshold: FRAME_SUSPICION,
    pool: 'crew',
  });
  if (!nominated) return { pendingCall: null, voteState: rolled.state };
  return { pendingCall: { caller, nominated }, voteState: rolled.state };
}

export function fillBallots(input: {
  voteState: number;
  living: readonly BaySeatId[];
  controllers: Record<BaySeatId, Controller>;
  roles: Record<BaySeatId, Role>;
  suspicion: Record<BaySeatId, number>;
  humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>>;
}): { ballots: BayBallot[]; voteState: number } {
  let state = input.voteState;
  const ballots: BayBallot[] = [];
  for (const seat of BAY_SEATS) {
    if (!input.living.includes(seat)) continue;
    if (input.controllers[seat] === 'human') {
      const choice = input.humanVotes[seat];
      if (!choice) throw new Error('Every living human seat must vote.');
      ballots.push({ voter: seat, choice });
      continue;
    }
    const rolled = rngStep(state);
    state = rolled.state;
    const named = nameTarget({
      viewer: seat,
      roles: input.roles,
      living: input.living,
      suspicion: input.suspicion,
      threshold: CALL_SUSPICION,
      pool: input.roles[seat] === 'saboteur' ? 'crew' : 'others',
    });
    let choice: BaySeatId | 'skip' = named ?? 'skip';
    if (input.roles[seat] === 'saboteur' && rolled.value < SELF_VOTE_BELOW) choice = seat;
    ballots.push({ voter: seat, choice });
  }
  return { ballots, voteState: state };
}
```

In `revealCheckIn`, replace the returned object with one that keeps every field the function already sets and, when `session.roundIndex >= 1`, sets `pendingCall` and `voteState` from `evaluateNomination`. Pass the log that already includes the new record. On round index 0, keep `pendingCall: null` and the previous `voteState`.

```ts
import { evaluateNomination } from './nominate';

const revealed: BaySession = {
  ...session,
  phase: 'discuss',
  integrity: integrityAfter,
  log: [...session.log, record],
  pendingCall: null,
};
if (session.roundIndex < 1) return revealed;
const nomination = evaluateNomination({
  roundIndex: session.roundIndex,
  voteState: session.voteState,
  controllers: session.controllers,
  roles: session.cell.roles,
  ejected: session.ejected,
  log: revealed.log,
});
return { ...revealed, pendingCall: nomination.pendingCall, voteState: nomination.voteState };
```

Add `castBallots` to `src/bay/meeting.ts`:

```ts
import { fillBallots } from './nominate';
import { suspicionScores } from './suspicion';

export function castBallots(
  session: BaySession,
  humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>>,
): BaySession {
  if (session.phase !== 'meeting' || !session.meeting) throw new Error('No accusation is open.');
  const filled = fillBallots({
    voteState: session.voteState,
    living: livingSeats(session.ejected),
    controllers: session.controllers,
    roles: session.cell.roles,
    suspicion: suspicionScores(session.log),
    humanVotes,
  });
  return resolveMeeting({ ...session, voteState: filled.voteState }, filled.ballots);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/bay/suspicion.test.ts src/bay/session.test.ts src/bay/meeting.test.ts`

Expected: PASS. Round-0 session tests still see an unchanged `voteState`. Later rounds may now carry a pending call; those tests do not assert `pendingCall` after round index 0.

- [ ] **Step 5: Commit**

```bash
git add src/bay/suspicion.ts src/bay/nominate.ts src/bay/suspicion.test.ts src/bay/session.ts src/bay/meeting.ts
git commit -m "feat: nominate from suspicion and cast AI ballots"
```

---

## Task 16: Bay client shell

**Files:**
- Create: `src/bay/ui/StartScreen.tsx`
- Create: `src/bay/ui/SummaryScreen.tsx`
- Create: `src/bay/ui/BayApp.tsx`

**Interfaces:**
- Consumes: `createBaySession`, `submitHumans`, `resolveUnattended`, `advance`, `openAccusation`, `takePending`, `castBallots`, `CheckInScreen`, `DiscussScreen`, `VoteScreen`, `formatBasisPoints`, `ejectionAnnouncement`, `BAY_SEATS`, `SEAT_NAME`, `INSTRUMENT`, `DEFAULT_ROUNDS`, `MIN_ROUNDS`, `MAX_ROUNDS`
- Produces: `BayApp` as a default-off client. `src/main.tsx` still imports `src/ui/App`.

`BayApp` holds `session` and `notes`. Notes are cleared when a watch starts and are passed only to `DiscussScreen`. No session call receives `notes`. Start screen: rounds slider 8–12 default 10, optional seed 0..4294967295, blank seed uses `Math.floor(Math.random() * 1_000_000_000)`. Copy describes eight seats, three saboteurs, integrity at 42% / 70% / 55%, and the discuss-before-vote gate. The roster lists all eight names and instruments. It does not mention Relay, Edit, Drop, rescue, or channel grades.

Summary lists every seat's role, the final integrity to one decimal, the win reason, and each meeting through `ejectionAnnouncement`. Phase routing: `done` → summary, `meeting` → vote, `discuss` → discuss, otherwise check-in. Accuse calls `openAccusation(session, 'helm', target)`. Take-pending calls `takePending`. Advance calls `advance`. Submit calls `submitHumans(session, { helm: answer })`. Watch calls `resolveUnattended`. Cast calls `castBallots(session, choice === null ? {} : { helm: choice })`.

- [ ] **Step 1: Write the shell**

Create `src/bay/ui/StartScreen.tsx`:

```tsx
import { useState } from 'react';
import { DEFAULT_ROUNDS, MAX_ROUNDS, MIN_ROUNDS } from '../constants';
import { BAY_SEATS, INSTRUMENT, SEAT_NAME } from '../types';

type StartScreenProps = {
  onStart: (rounds: number, seed: number) => void;
};

export function StartScreen({ onStart }: StartScreenProps) {
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [seedText, setSeedText] = useState('');
  const [error, setError] = useState('');

  function begin() {
    let seed = Math.floor(Math.random() * 1_000_000_000);
    if (seedText.trim()) {
      const parsed = Number(seedText);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffffffff) {
        setError('Use a whole number from 0 to 4294967295, or leave the seed blank.');
        return;
      }
      seed = parsed;
    }
    setError('');
    onStart(rounds, seed);
  }

  return (
    <main className="shell">
      <p className="kicker">RV Argo · bay watch</p>
      <h1>Drift Protocol</h1>
      <p className="lede">
        Eight seats run the same check-in. Three of them are saboteurs, and they know each other. Submit in private,
        then read the board. Integrity starts at 42%. Crew wins by ejecting all three saboteurs or by finishing at 70%
        or better. The saboteurs win by ejecting every crew seat, or by finishing below 55% with one of them still
        aboard.
      </p>
      <section className="panel" aria-labelledby="watch-setup">
        <h2 id="watch-setup">Open a watch</h2>
        <label className="field">
          <span>Rounds · {rounds}</span>
          <input
            type="range"
            min={MIN_ROUNDS}
            max={MAX_ROUNDS}
            step={1}
            value={rounds}
            onChange={(event) => setRounds(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Seed</span>
          <input
            inputMode="numeric"
            placeholder="Blank draws a new bay"
            value={seedText}
            onChange={(event) => setSeedText(event.target.value)}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="primary" onClick={begin}>
          Begin watch
        </button>
      </section>
      <section className="panel" aria-labelledby="how">
        <h2 id="how">How a watch goes</h2>
        <ol className="steps">
          <li>You are Helm. Crew see only their own role. A saboteur sees the other two, the cell sign, and this round&apos;s plan.</li>
          <li>Every living seat gets the same check-in and submits in private.</li>
          <li>The board opens. Each answer shows its error class, its distance, and its instrument id. Integrity moves.</li>
          <li>Discuss with the board up. Notes stay on this console. Round 1 has no vote.</li>
          <li>From round 2, take a waiting nomination, name someone yourself, or advance. Advancing spends that round&apos;s accusation.</li>
        </ol>
        <p className="fine">From 55% up to but not including 70% at the end, with a saboteur still aboard, the watch is a stalemate.</p>
      </section>
      <section className="panel" aria-labelledby="seats">
        <h2 id="seats">The seats</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => (
            <li key={seat}>
              <strong>
                {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
              </strong>
              <span>{seat === 'helm' ? 'Your console.' : 'AI seat.'}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Create `src/bay/ui/SummaryScreen.tsx`:

```tsx
import { ejectionAnnouncement } from '../meeting';
import type { BaySession, BayWinReason } from '../types';
import { BAY_SEATS, SEAT_NAME } from '../types';
import { formatBasisPoints } from './format';

type SummaryScreenProps = {
  session: BaySession;
  onAgain: () => void;
};

const VERDICT: Record<BayWinReason, { title: string; lede: (session: BaySession) => string }> = {
  'saboteurs-ejected': {
    title: 'Crew wins',
    lede: () => 'Every saboteur was ejected. The crew takes the watch.',
  },
  'integrity-window': {
    title: 'Crew wins',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, on or above 70%. A saboteur was still aboard.`,
  },
  'integrity-held': {
    title: 'Saboteurs win',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, below 55%, with a saboteur still aboard.`,
  },
  'crew-eliminated': {
    title: 'Saboteurs win',
    lede: () => 'Every crew seat was ejected.',
  },
  stalemate: {
    title: 'No verdict',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, from 55% up to but not including 70%.`,
  },
};

export function SummaryScreen({ session, onAgain }: SummaryScreenProps) {
  const verdict = session.winReason ? VERDICT[session.winReason] : null;
  return (
    <main className="shell">
      <p className="kicker">Watch closed · seed {session.seed}</p>
      <h1>{verdict ? verdict.title : 'Watch closed'}</h1>
      <p className="lede">{verdict ? verdict.lede(session) : 'The watch ended before a verdict was recorded.'}</p>
      <section className="panel">
        <h2>Integrity</h2>
        <p className="value">
          {formatBasisPoints(session.integrity)}
          <span>saboteur line 55% · crew line 70%</span>
        </p>
      </section>
      <section className="panel">
        <h2>Roles</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => (
            <li key={seat} className={session.ejected.includes(seat) ? 'ejected' : undefined}>
              <strong>
                {SEAT_NAME[seat]} · {session.cell.roles[seat]}
              </strong>
              <span>{session.ejected.includes(seat) ? 'Ejected' : 'Lasted the watch'}</span>
            </li>
          ))}
        </ul>
      </section>
      {session.meetings.length > 0 ? (
        <section className="panel">
          <h2>Accusations</h2>
          <ul className="roster">
            {session.meetings.map((meeting) => (
              <li key={`${meeting.roundIndex}-${meeting.caller}`}>
                <strong>
                  R{meeting.roundIndex + 1} · {SEAT_NAME[meeting.caller]} named {SEAT_NAME[meeting.nominated]}
                </strong>
                <span>{ejectionAnnouncement(meeting, meeting.ejected ? SEAT_NAME[meeting.ejected] : '')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button type="button" className="primary" onClick={onAgain}>
        New watch
      </button>
    </main>
  );
}
```

Create `src/bay/ui/BayApp.tsx`:

```tsx
import { useState } from 'react';
import { castBallots, openAccusation, takePending } from '../meeting';
import { advance, createBaySession, resolveUnattended, submitHumans } from '../session';
import type { BayAnswer, BaySeatId, BaySession } from '../types';
import { CheckInScreen } from './CheckInScreen';
import { DiscussScreen } from './DiscussScreen';
import { StartScreen } from './StartScreen';
import { SummaryScreen } from './SummaryScreen';
import { VoteScreen } from './VoteScreen';

export function BayApp() {
  const [session, setSession] = useState<BaySession | null>(null);
  const [notes, setNotes] = useState('');

  if (!session) {
    return (
      <StartScreen
        onStart={(rounds, seed) => {
          setNotes('');
          setSession(createBaySession({ rounds, seed }));
        }}
      />
    );
  }
  if (session.phase === 'done') return <SummaryScreen session={session} onAgain={() => setSession(null)} />;
  if (session.phase === 'meeting') {
    return (
      <VoteScreen
        session={session}
        onCast={(choice) =>
          setSession((current) => (current ? castBallots(current, choice === null ? {} : { helm: choice }) : current))
        }
      />
    );
  }
  if (session.phase === 'discuss') {
    return (
      <DiscussScreen
        key={`${session.roundIndex}:${session.ejected.join(',')}`}
        session={session}
        notes={notes}
        onNotes={setNotes}
        onAdvance={() => setSession((current) => (current ? advance(current) : current))}
        onAccuse={(target: BaySeatId) =>
          setSession((current) => (current ? openAccusation(current, 'helm', target) : current))
        }
        onTakePending={() => setSession((current) => (current ? takePending(current) : current))}
      />
    );
  }
  return (
    <CheckInScreen
      session={session}
      onSubmit={(answer: BayAnswer) =>
        setSession((current) => (current ? submitHumans(current, { helm: answer }) : current))
      }
      onWatch={() => setSession((current) => (current ? resolveUnattended(current) : current))}
    />
  );
}
```

- [ ] **Step 2: Run the build**

Run: `npm test && npm run build`

Expected: PASS. `src/main.tsx` still mounts the legacy app.

- [ ] **Step 3: Commit**

```bash
git add src/bay/ui/StartScreen.tsx src/bay/ui/SummaryScreen.tsx src/bay/ui/BayApp.tsx
git commit -m "feat: assemble the bay client without replacing the legacy app"
```

---

## Task 17: Full-watch tests

**Files:**
- Create: `src/bay/watch.test.ts`
- Modify: `src/bay/session.ts` to export `replayKey`

**Interfaces:**
- Consumes: `createBaySession`, `submitHumans`, `advance`, `openAccusation`, `resolveMeeting`, `castBallots`, `signedNearAnswer`, `truthAnswer`, `livingSeats`, `BaySession`
- Produces: `replayKey(session: BaySession)` returning seed, rounds, cell, controllers, integrity, ejected, winner, winReason, log, meetings, checkInState, voteState, roundIndex, and phase. It does not return notes, because notes are not on the session.

These tests drive the real session. Meter paths use Helm's inputs and always `advance`. Ejection paths use `resolveMeeting` with explicit ballots so the outcome does not depend on the AI's vote. `castBallots` is used only for the skip-versus-vote replay.

| Watch | Helm input | End |
| --- | --- | --- |
| Seed 0, 10 rounds, always advance | truth | integrity 8200, crew, `integrity-window`, nobody ejected. Deltas are ten `400`s |
| Seed 14, 10 rounds, always advance | truth | integrity 6700, draw, `stalemate`. Deltas: `-350, 400, 400, -350, 400, 400, 400, 400, 400, 400` |
| Seed 23, 10 rounds, always advance | `signedNearAnswer(puzzle, cell.sign)` every round | integrity 5200, saboteur, `integrity-held`. Deltas: `-350, -350, 400, 400, 400, -350, 400, 400, 400, -350` |
| Seed 42, rounds 8 | truth, then unanimous ballots | eject radio, then nav, then deck. The first two meetings have `ejectedRole === null`. The third ends the watch with `ejectedRole === 'saboteur'`, winner crew, reason `saboteurs-ejected`, and `roundIndex === 3` |
| Seed 42, rounds 8 | truth, then unanimous ballots | eject sonar, plant, medic, cargo, then helm. Caller for the last vote is `radio`. The last meeting has `ejectedRole === 'crew'`, winner saboteur, reason `crew-eliminated`. Earlier meetings have `ejectedRole === null` |

Replay: two `replayKey` results of seed 42, Helm always submitting the truth and always advancing, are equal. A second play that submits detent 0 on round 0 when the puzzle is a dial, or the first blatant answer otherwise, has a different `log[0]`. Skipping round index 1 and calling a vote there, with Helm skipping, produce equal `log` arrays and unequal `voteState` values.

The legacy files under `src/game/` and `src/ai/` still pass.

- [ ] **Step 1: Write the failing test**

Create `src/bay/watch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { blatantAnswers, signedNearAnswer, truthAnswer } from './fingerprint';
import { openAccusation, resolveMeeting, castBallots } from './meeting';
import { livingSeats } from './roles';
import { advance, createBaySession, replayKey, submitHumans } from './session';
import type { BayAnswer, BayBallot, BaySeatId, BaySession } from './types';

function playMeter(seed: number, helm: (session: BaySession) => BayAnswer, rounds = 10): BaySession {
  let session = createBaySession({ rounds, seed });
  while (session.phase !== 'done') {
    if (session.phase === 'check-in') session = submitHumans(session, { helm: helm(session) });
    else if (session.phase === 'discuss') session = advance(session);
    else throw new Error(`Unexpected phase ${session.phase}.`);
  }
  return session;
}

function voteOff(session: BaySession, caller: BaySeatId, target: BaySeatId): BaySession {
  const opened = openAccusation(session, caller, target);
  const votes: BayBallot[] = livingSeats(opened.ejected).map((voter) => ({ voter, choice: target }));
  return resolveMeeting(opened, votes);
}

describe('full watches', () => {
  it('reaches the crew integrity window, the stalemate band, and the saboteur hold', () => {
    const crew = playMeter(0, (session) => truthAnswer(session.puzzle));
    expect(crew.integrity).toBe(8200);
    expect(crew.winner).toBe('crew');
    expect(crew.winReason).toBe('integrity-window');
    expect(crew.ejected).toEqual([]);
    expect(crew.log.map((record) => record.delta)).toEqual([400, 400, 400, 400, 400, 400, 400, 400, 400, 400]);

    const stalemate = playMeter(14, (session) => truthAnswer(session.puzzle));
    expect(stalemate.integrity).toBe(6700);
    expect(stalemate.winner).toBe('draw');
    expect(stalemate.winReason).toBe('stalemate');
    expect(stalemate.log.map((record) => record.delta)).toEqual([-350, 400, 400, -350, 400, 400, 400, 400, 400, 400]);

    const held = playMeter(23, (session) => signedNearAnswer(session.puzzle, session.cell.sign));
    expect(held.integrity).toBe(5200);
    expect(held.winner).toBe('saboteur');
    expect(held.winReason).toBe('integrity-held');
    expect(held.log.map((record) => record.delta)).toEqual([-350, -350, 400, 400, 400, -350, 400, 400, 400, -350]);
  });

  it('ejects all three saboteurs and publishes a role only on the ending vote', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = advance(submitHumans(session, { helm: truthAnswer(session.puzzle) }));
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'radio');
    expect(session.winner).toBeNull();
    expect(session.meetings[0].ejectedRole).toBeNull();
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'nav');
    expect(session.meetings[1].ejectedRole).toBeNull();
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'deck');
    expect(session.phase).toBe('done');
    expect(session.roundIndex).toBe(3);
    expect(session.winner).toBe('crew');
    expect(session.winReason).toBe('saboteurs-ejected');
    expect(session.meetings[2].ejected).toBe('deck');
    expect(session.meetings[2].ejectedRole).toBe('saboteur');
  });

  it('ejects every crew seat, with Helm removed by another caller', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = advance(submitHumans(session, { helm: truthAnswer(session.puzzle) }));
    for (const target of ['sonar', 'plant', 'medic', 'cargo'] as const) {
      session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', target);
      expect(session.winner).toBeNull();
      expect(session.meetings[session.meetings.length - 1].ejectedRole).toBeNull();
    }
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'radio', 'helm');
    expect(session.phase).toBe('done');
    expect(session.winner).toBe('saboteur');
    expect(session.winReason).toBe('crew-eliminated');
    expect(session.meetings[session.meetings.length - 1].ejectedRole).toBe('crew');
  });

  it('replays a seed and treats a skipped vote as a different vote stream', () => {
    const again = replayKey(playMeter(42, (session) => truthAnswer(session.puzzle), 8));
    expect(replayKey(playMeter(42, (session) => truthAnswer(session.puzzle), 8))).toEqual(again);
    const changed = playMeter(
      42,
      (session) => {
        if (session.roundIndex === 0) {
          const blatant = blatantAnswers(session.puzzle)[0];
          if (!blatant) throw new Error('Missing blatant answer.');
          return blatant;
        }
        return truthAnswer(session.puzzle);
      },
      8,
    );
    expect(changed.log[0]).not.toEqual(again.log[0]);

    function toSecondDiscuss(): BaySession {
      let session = createBaySession({ rounds: 8, seed: 42 });
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      session = advance(session);
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      return session;
    }
    const skipped = advance(toSecondDiscuss());
    let voted = toSecondDiscuss();
    voted = openAccusation(voted, 'helm', 'sonar');
    voted = castBallots(voted, { helm: 'skip' });
    expect(skipped.log).toEqual(voted.log);
    expect(skipped.voteState).not.toBe(voted.voteState);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/bay/watch.test.ts`

Expected: FAIL. `replayKey` is not exported. If the function exists and a locked integrity number fails, the answer filler or the integrity order is wrong. Do not change the expected numbers.

- [ ] **Step 3: Export the replay key**

Add this to `src/bay/session.ts`:

```ts
export function replayKey(session: BaySession) {
  return {
    seed: session.seed,
    rounds: session.rounds,
    cell: session.cell,
    controllers: session.controllers,
    integrity: session.integrity,
    ejected: session.ejected,
    winner: session.winner,
    winReason: session.winReason,
    log: session.log,
    meetings: session.meetings,
    checkInState: session.checkInState,
    voteState: session.voteState,
    roundIndex: session.roundIndex,
    phase: session.phase,
  };
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test -- src/bay/watch.test.ts && npm test && npm run build`

Expected: PASS, including every legacy signal-loop test.

- [ ] **Step 5: Commit**

```bash
git add src/bay/watch.test.ts src/bay/session.ts
git commit -m "test: play full bay watches and replay a seed"
```

---

## Task 18: Remove the signal loop

**Files:**
- Modify: `src/main.tsx` to import `BayApp` from `./bay/ui/BayApp` and render it
- Modify: `index.html` description
- Modify: `vite.config.ts` manifest description
- Modify: `README.md`
- Delete the files listed in the file-structure section

**Interfaces:**
- Consumes: `BayApp`
- Produces: a client whose only watch is bay check-ins. `src/game/rng.ts` and `src/ui/console.css` remain. `src/bay/vote.ts` keeps `majorityEject`.

Do not import `src/ui/App`. Delete `src/game/vote.ts` rather than leaving a re-export, because nothing legacy remains to import it. Win reasons `saboteur-ejected`, `rescue-window`, and `saboteur-survived` disappear with that file. The bay reasons `saboteurs-ejected`, `integrity-window`, `integrity-held`, `crew-eliminated`, and `stalemate` stay.

Replace `index.html`'s description meta with `Drift Protocol — eight seats calibrate a bay. Three saboteurs, integrity at 70% and 55%.`

Replace the Vite PWA manifest description with `Solo bay watch. Find the three saboteurs, or finish the calibration at 70%.`

Replace `README.md` with the following file. The fence is four tildes so the sample commands inside it stay intact:

~~~~markdown
# Drift Protocol

Solo bay watch for eight seats. You and seven AI operators run the same check-in each round: match a phase dial, pick the in-band reading, or repair one glyph. Three seats are saboteurs, and they know each other. After you submit, the board shows every answer and its fingerprint. Integrity starts at 42%. Crew wins by ejecting all three saboteurs or by finishing at 70% or better. The saboteurs win by ejecting every crew seat, or by finishing below 55% with a saboteur still aboard.

Exact rules: [docs/game-rules.md](docs/game-rules.md). Design: [docs/superpowers/specs/2026-10-31-bay-checkins-design.md](docs/superpowers/specs/2026-10-31-bay-checkins-design.md).

There is no backend. The build is a static client. The check-ins and the cell both come from the seed.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. A watch is 8–12 rounds, default 10. Leave the seed blank, or enter one to replay the same bay and the same cell.

```bash
npm test
npm run build
npm run preview
```

`npm run build` typechecks, then writes a static `dist/` folder. [vercel.json](vercel.json) points Vercel at that Vite build. The app is a PWA.

## How to play

1. Read your role. Crew learn only that they are crew. A saboteur sees the other two saboteurs, the cell's miss direction, and this round's plan.
2. Each round, every living seat gets the same check-in.
3. Submit in private.
4. The board opens: every submission, its error class, its distance from the true answer, and that seat's instrument id. Integrity moves.
5. Discuss with the board up. Notes stay on your console. From round 2, an AI may already have named someone; ballots stay closed until you take that name, name someone yourself, or move on. Round 1 has no vote.
6. One accusation per round. A majority of the living seats ejects. Ejected seats stay listed and cannot check in or vote. A vote that continues does not announce the ejected seat's role.
7. Eject all three saboteurs and crew wins on the spot. Eject every crew seat and the saboteurs win on the spot. Otherwise play the remaining check-ins.

The integrity meter has two marks. Below 55% at the end, with a saboteur still aboard, the saboteurs win. At 70% or above, crew wins even if saboteurs are still aboard. From 55% up to but not including 70%, the watch is a stalemate.

Crew AIs usually submit the true answer and sometimes miss. Saboteur AIs mostly check in clean, sometimes leave a shared near-miss, and rarely all miss on the same round. Thresholds live in [docs/game-rules.md](docs/game-rules.md).

## Architecture

```
src/bay/     seats, puzzles, fingerprints, integrity, AI policy, session
src/bay/ui/  start, check-in, discuss, vote, summary
src/game/rng.ts
src/ui/console.css
```

The UI is a view over `createBaySession`, `submitHumans`, `advance`, `openAccusation`, `takePending`, `castBallots`, and `resolveUnattended`. Notes stay in React state. AI answers, votes, and integrity are deterministic given the seed and Helm's choices.

Out of scope: networked multiplayer, voice, maps, accounts, payments, and language-model agents. The seat list carries a `human` or `ai` controller so a later client can attach other humans. That attachment is not in this build.
~~~~

The file contents start at `# Drift Protocol` and end at `this build.`

- [ ] **Step 1: Point the client at BayApp and delete the signal loop**

Change `src/main.tsx` to:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { BayApp } from './bay/ui/BayApp';
import './ui/console.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <BayApp />
  </StrictMode>,
);
```

Delete every file in the delete list at the top of this plan. Update the description strings in `index.html` and `vite.config.ts`. Replace `README.md` with the text in this task.

- [ ] **Step 2: Confirm the old watch is gone**

Run: `rg -n "relay|rescue|skeptic|assignSaboteur|RESCUE_WIN" src README.md index.html vite.config.ts`

Expected: no matches. A match in a deleted path means the file is still present.

- [ ] **Step 3: Run the bay suite and the build**

Run: `npm test && npm run build`

Expected: PASS. The test run no longer loads `src/game/loop.test.ts`, `src/game/roles.test.ts`, `src/ai/skeptic.test.ts`, or the other deleted tests. Bay tests, including `src/bay/watch.test.ts`, pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: run the bay watch and remove the signal loop"
```

---

## Requirement map

| Locked rule | Task |
| --- | --- |
| Eight seats, instruments INST-1 through INST-8, Helm human, seven AIs | 1, 2, 16 |
| Uniform trio, sign, crew view, saboteur view | 2 |
| Phase dial, wrap at 0 and 11 | 3, 6 |
| In-band reading, one near decoy, far distance 2 | 4, 6 |
| Glyph ring, including B and T | 5, 6 |
| Fingerprint class, distance, instrument, canonical key | 6 |
| Integrity 4200, deltas +400 / -450 / -350 / -200, priority, clamp 200–9800 | 7, 9 |
| Meter bands 7000 and 5500, no mid-watch meter ending | 7, 9, 17 |
| Notes 2000, off the session and the streams | 8, 9, 16 |
| Check-in, reveal once, discuss, round 1 has no call | 9, 10, 15 |
| Accusation from round 2, strict majority, hidden role, last-saboteur and last-crew wins | 11, 17 |
| Cell plan for 3, 2, and 1, including the 0.97 all-near row | 13, 14 |
| Crew 0.82 / 0.15 / 0.03, unused draw still consumed, sign shared by the cell, crew slip unbiased | 14 |
| Suspicion 0.75 / 0.25, call 0.40, frame 0.12 and 0.30, self-vote 0.08, Helm is not the auto-caller, partners unnamed | 15 |
| Full watches and replay, skip versus vote | 17 |
| Delete packets, trust, rescue, Skeptic, Pattern, Explorer, single-saboteur policy; README matches the client | 18 |
