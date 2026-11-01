# Everyday quiz trio

Approved 2026-10-31. Family A replaces the calibration puzzles. Normative numbers and draw formulas live in [docs/game-rules.md](../../game-rules.md). If a number here and a number there disagree, `game-rules.md` wins and this spec should be corrected.

No gameplay code lands with this spec. The question bank and the generators are the cutover in [docs/BACKLOG.md](../../BACKLOG.md).

## Objective

Eight seats still answer one shared check-in in private, then read one public board. The check-in stops being a phase dial, an in-band reading, or a corrupted glyph. It becomes an everyday quiz in one of three kinds:

| Kind | What the seat sees | What they submit |
| --- | --- | --- |
| Quick fact | A question and five labeled choices | A label, A through E |
| Number sense | A short arithmetic prompt and five numeric choices | The number, or its label |
| Odd one out | Four items | The item's index, 1 through 4 |

The mix across the bank is trivia and general knowledge, school basics, and everyday logic and observation. A careful seat can finish a check-in quickly. The watch is still decided by fingerprints, votes, and integrity.

The same prompt goes to every living seat. One seat's answer is never the next seat's prompt.

## What stays

The Parallel Bay Check-ins social layer is unchanged. Full text: `docs/game-rules.md` and [Parallel Bay Check-ins](2026-10-31-bay-checkins-design.md).

- Eight seats in roster order, instrument ids INST-1 through INST-8. Solo play is Helm plus seven AIs.
- Exactly three saboteurs. They know each other. Crew see only their own role. There is no saboteur chat channel.
- A watch is 8, 9, 10, 11, or 12 check-ins. The default is 10.
- Fingerprints stay `exact`, `near-miss`, or `blatant`, plus that kind's distance, plus the seat's instrument id.
- Integrity starts at 42.0% (4200 basis points). Deltas are +4.0 aligned, −4.5 false consensus, −3.5 same-key near-miss cluster, and −2.0 split, in that priority. Clamp 2.0%–98.0%. Meter wins only at the round limit: crew at or above 70%, saboteurs strictly below 55% with a saboteur still aboard, otherwise stalemate while a saboteur remains.
- Discuss before any ballot. Notes are a local 2000-character scratchpad. One accusation per round, round 1 included. Majority table from 8 living seats (5 votes) down to 2 (2 votes).
- Crew AI stays 0.82 exact, 0.15 near-miss, 0.03 blatant. The cell-plan tables, the suspicion mix `0.75 * miss mean + 0.25 * pattern score`, the 0.40 call, the 0.12 frame, and the 0.08 self-vote stay. Miss weights stay 0, 0.55, and 1.
- Role, puzzle, check-in, and vote streams keep their masks. The puzzle reseed is unchanged:

```
mixed = Math.imul((seed ^ 0x0b47c1ec) >>> 0, roundIndex + 1) >>> 0
state = (mixed + 0x6d2b79f5) >>> 0
```

- AI crew read the true key stored on the card. They do not call a model. The console prompt omits that key until the board opens.

## What goes

Phase dial, in-band reading, and corrupted glyph. With them go detents, bands, seals, alphabet rings, modular totals, and checksum flavor. Instrument ids stay on the roster and on fingerprints. They are not a puzzle device.

The ±1 cell sign goes. The cell lean below takes its draw and its job: one watch-long preference the saboteurs share.

## Three kinds

Each card reduces to one true key, a near-miss set of size 1, and a blatant set. Integrity clusters on those keys. It does not add distances.

Distance is 0 for the true key, 1 for the near key, and 2 for every blatant key. A numeric gap is not the distance. Submitting `truth + 1` is distance 1 only when that value is the card's near key. When the lean has filed it as blatant, the distance is 2.

### Quick fact

The bank item has a question, one true choice, one curated near decoy, and three far choices. The decoy is the adjacent mistake: a common misconception, the next year, the neighboring item in a list. Each far choice is plainly unrelated to the true answer.

The puzzle stream shuffles those five and labels the result A through E. The seat submits a label. The canonical key is `fact:<label>`.

The lean does not swap the decoy. A planned near-miss submits that decoy's label on every fact round.

A fact submission has no lean mark. It does not enter the pattern score.

### Number sense

The bank item is one expression in integers. The card always shows five values:

| Slot | Value | Fingerprint when it is not the truth |
| --- | --- | --- |
| Truth | The expression's value | Exact, distance 0 |
| Step | `truth + 1` | Near when the lean is off-by-one; otherwise blatant |
| Trap | The wrong-rule value defined below | Near when the lean is wrong rule; otherwise blatant |
| Far | First authored far | Blatant, no lean mark |
| Far | Second authored far | Blatant, no lean mark |

That is one near key and three blatant keys. The anti-lean neighbor is one of the three blatant keys, and it still carries the opposite lean mark for suspicion. The two authored fars carry no mark.

The seat submits the number or the label A through E. A label resolves to that option's integer before fingerprinting. The canonical key is `number:<integer>`, so a label and a typed number cluster when they are the same value. Any other integer is an illegal answer.

Lean marks, used only by suspicion:

| Submitted value | Mark |
| --- | --- |
| `truth + 1` | +1 |
| The trap value | −1 |
| Truth, either authored far, or any other kind | No mark |

The mark follows the value, not the error class. Under an off-by-one lean, submitting the trap is blatant and marked −1. Under a wrong-rule lean, submitting `truth + 1` is blatant and marked +1.

Worked card, before the shuffle. Expression `1 + 2 × 3`. Truth 7. Step 8. Trap 9 (left to right). Fars 1 and 20.

| Lean | Near key | Blatant keys |
| --- | --- | --- |
| Off-by-one | 8 | 9, 1, 20 |
| Wrong rule | 9 | 8, 1, 20 |

Two seats on 8 are a near-miss cluster only when 8 is the near key and no majority row matched. When 8 is blatant, those two seats are a split unless the board is a false consensus.

### Odd one out

The bank item has a prompt, the one item that does not belong, two almost-misfits, and two clear in-group items. The card shows four items: the outsider, the lean's almost-misfit, and both in-group items. The other almost-misfit is omitted. It is not a clear member of the group, so it is not filed as a far choice.

The puzzle stream shuffles the four and numbers them 1 through 4. The seat submits an index. The canonical key is `odd:<index>`.

| Shown item | Class |
| --- | --- |
| Outsider | Exact, distance 0 |
| Lean's almost-misfit | Near-miss, distance 1 |
| Either in-group item | Blatant, distance 2 |

A planned near-miss submits the almost-misfit's index on every odd-one-out round. The off-by-one lean installs the step almost-misfit. The wrong-rule lean installs the trap almost-misfit.

An odd-one-out submission has no lean mark.

Authoring rule for the two almost-misfits:

- **Step.** A member of the true group that shares one surface feature with the outsider, or lacks one feature the clear members have, so a glance picks it.
- **Trap.** A member of the true group that the wrong rule in the item's note would exclude.

The checker tests structure. It does not judge whether a penguin is a bird. Review does that, using the notes.

## Cell lean

Drawn once on the role stream, in the draw that used to set the cell sign. After the three saboteur swaps, `intBetween(state, 0, 1)`:

| Draw | Lean | Shown to saboteurs |
| --- | --- | --- |
| 0 | `step` | off-by-one |
| 1 | `trap` | wrong rule |

The stream does not advance during the watch. Crew do not see the lean.

The lean is the shared pattern that replaces ±1 on a dial or a glyph:

| Kind | What a planned near-miss does for the whole watch |
| --- | --- |
| Quick fact | Submit the curated near decoy |
| Number sense | Submit the off-by-one value, or submit the wrong-rule value |
| Odd one out | Submit the almost-misfit of that same flavor |

Saboteurs see the other two saboteurs, the lean, and this round's plan. When the plan is a near-miss, the banner also names the choice to submit: `choice B` on a fact or a number card, `item 2` on an odd-one-out card. It does not name the true key. A human saboteur may ignore the plan. AI saboteurs follow it.

Honest and blatant plans do not name a choice. A blatant answer is any blatant key. The human picks one. The AI draws one uniformly.

Crew near-misses are not a second lean. Each card has one near key, so the crew draw over that list always lands on it. The draw is still consumed.

## Difficulty

Difficulty is a function of the zero-based round index. It is not a draw.

| `roundIndex % 3` | Difficulty |
| --- | --- |
| 0 | easy |
| 1 | medium |
| 2 | harder |

Check-in 1 (index 0) is easy. A 12-round watch has four rounds of each difficulty. A 10-round watch has four easy rounds, three medium, and three harder. Kind is still uniform. A watch is allowed to draw one kind more often than the others. The bank is sized for that.

| Difficulty | Quick fact | Number sense | Odd one out |
| --- | --- | --- | --- |
| Easy | One-step school or household knowledge. The decoy is a single adjacent mistake. | Two operands, one operator, no parentheses. The trap is the other operator on the same operands. | The group is obvious once named. The almost-misfit is the one tempting member. |
| Medium | A real memory, still ordinary schooling or daily life. | Three operands, two operators, no parentheses, with both `×` and `+` or `−`. The trap is left to right. | The group rule is real and takes a moment. |
| Harder | The same audience, a less rehearsed fact. Still no news-cycle or fandom item. | Three operands, one parenthesized pair, and both `×` and `+` or `−`. The trap drops the parentheses and uses ordinary precedence. | The almost-misfit is easy to argue for, and the two in-group items are not. |

## Question bank

Static TypeScript in the repo. No fetch, no embedded model, no generation at runtime.

| File | Export |
| --- | --- |
| `src/bay/bank/facts.ts` | `FACT_BANK` |
| `src/bay/bank/numbers.ts` | `NUMBER_BANK` |
| `src/bay/bank/odd.ts` | `ODD_BANK` |

Exactly eight items in each of the nine kind-by-difficulty cells (72 items). Ids match `kind-difficulty-nn` with `nn` from `01` through `08`, and they sort lexicographically in that order. Each item has one theme: `school`, `everyday`, or `trivia`. Each cell includes at least two of each theme.

Prompts and choices are answerable from ordinary schooling and daily life. They do not use a cipher, a checksum, a published modulus, a seal, or an alphabet ring. Clock and calendar questions are ordinary facts, and they are allowed. Choices are unique after trim and case-fold. The prompt does not contain the true answer. Quick-fact prompts end with `?`. Number prompts are the expression alone, using `+`, `−` (U+2212), `×`, parentheses where the difficulty allows, and integer operands from 0 through 12.

Number values the checker recomputes from the prompt:

- **Easy.** Truth is the printed operator. `trapVia` is `add`, `sub`, or `mul` and is not the printed operator. The trap is that operator on the same two operands, in order.
- **Medium.** Truth uses ordinary precedence, `×` before `+` and `−`, with `+` and `−` left to right. The trap evaluates left to right at equal precedence.
- **Harder.** Truth evaluates the parentheses first, then ordinary precedence. The trap deletes the parentheses, then uses ordinary precedence. The trap must differ from the truth, which means the parentheses have to change the value.

Every number item also satisfies `trap !== truth + 1`. The two authored fars differ from each other. Each is an integer at least 3 away from the truth and at least 2 away from both `truth + 1` and the trap. Truth, trap, and fars lie in −30 through 200.

The game deals from the stored keys. The checker is the guard that those keys match the grammar. A failed item is a broken bank, not a runtime fallback.

Shape samples, not bank entries:

```ts
{
  id: 'fact-easy-01',
  difficulty: 'easy',
  theme: 'school',
  prompt: 'How many days are in a week?',
  truth: '7',
  near: '5',
  fars: ['12', '30', '100'],
}

{
  id: 'number-medium-01',
  difficulty: 'medium',
  theme: 'school',
  prompt: '1 + 2 × 3',
  truth: 7,
  trap: 9,
  fars: [1, 20],
}

{
  id: 'odd-easy-01',
  difficulty: 'easy',
  theme: 'everyday',
  prompt: 'Which one does not belong?',
  truth: 'carrot',
  step: 'tomato',
  stepNote: 'A fruit often grouped with vegetables, so a glance picks it instead of the carrot.',
  trap: 'cucumber',
  trapNote: 'Wrong rule: sweet foods. Cucumber is a fruit that rule would exclude; apple and banana stay.',
  inGroup: ['apple', 'banana'],
}
```

## Dealing a card

`generatePuzzle(seed, roundIndex, lean)` uses the existing puzzle reseed, then applies the lean as an input. The lean is not drawn inside the puzzle stream. Answers, ejections, and notes do not change a card. Calling a round index on its own replays that round: earlier kind draws are recomputed from their own reseeds, and earlier answers are not an input.

1. Reseed with the formula in **What stays**. Draw the kind with `intBetween(state, 0, 2)`: 0 quick fact, 1 number sense, 2 odd one out. Keep that stream state for the shuffle.
2. Difficulty is `roundIndex % 3`, mapped through easy, medium, harder.
3. Occurrence is the count of earlier indexes `i < roundIndex` with the same difficulty and the same kind. The kind at `i` is the first `intBetween` on that index's puzzle reseed.
4. Permute the eight ids of that cell on the item stream, below. The item is `permutation[occurrence]`. For rounds 0 through 11 the occurrence is 0, 1, 2, or 3, so a watch of at most 12 rounds does not repeat an item.
5. Install the lean. Facts keep their one decoy. Number cards mark `truth + 1` or the trap as the near key. Odd cards show the matching almost-misfit and omit the other. The order before the shuffle is fixed: a fact is the true choice, the decoy, then the three fars in bank order; a number is the truth, the near value, the anti-lean value, then the two fars in bank order; an odd card is the outsider, the selected almost-misfit, then the two in-group items in bank order.
6. Fisher-Yates the options with the puzzle stream: for `i` from `n - 1` down to 1, swap index `i` with `intBetween(state, 0, i)`. Facts and numbers use `n = 5`. Odd one out uses `n = 4`. `roundIndex` must be an integer from 0 through 11.

Item-stream start, independent of the puzzle stream. `kindIndex` is 0, 1, or 2. `difficultyIndex` is 0, 1, or 2. `cellKey` runs from 1 through 9:

```
cellKey = kindIndex * 3 + difficultyIndex + 1
mixed = Math.imul((seed ^ 0x71e1e000) >>> 0, cellKey) >>> 0
state = (mixed + 0x85ebca6b) >>> 0
```

Permute the ids sorted ascending, with the same Fisher-Yates. The permutation depends on the seed, the kind, and the difficulty. It does not depend on the round index. Occurrence is what walks it.

Blatant lists, in the order the AI draw uses:

| Kind | Order |
| --- | --- |
| Quick fact | Far labels, A through E |
| Number sense | The three blatant integers, ascending |
| Odd one out | The two in-group indexes, ascending |

The near list is the one near key, in a one-element array. Crew `intBetween(state, 0, 0)` consumes a draw and selects it.

The card stores the bank id, the prompt, the labeled options, the true key, the near key, and the blatant keys. The prompt view returns the prompt and the labeled options. It omits the id, the true key, the near key, the lean, and the author notes. AI policies read the keys on the card. They do not open the bank again.

## Suspicion

Miss mean is unchanged: exact 0, near-miss 0.55, blatant 1.

The pattern term uses lean marks instead of a geometric step. The modal mark is the +1 or −1 with the greater count on the public log. A tie, or a log with no marks, is no visible bias, and every pattern score is 0. A seat's pattern score is the fraction of that seat's own marks that match the modal mark. A seat with no marks scores 0.

Quick-fact and odd-one-out submissions contribute no mark. Number submissions contribute a mark only for `truth + 1` and the trap, including when that value is the blatant anti-lean neighbor. Exact answers contribute no mark.

Because the near set has size 1, a crew near-slip and a saboteur near-miss on that card share a key and, on a number card, share a mark. The pattern term separates seats when someone submits the anti-lean neighbor. Miss mean, and which instruments repeat the nick, carry the rest. Suspicion stays `0.75 * miss mean + 0.25 * pattern score`.

## AI

Crew read the card's true key. Probability 0.82 exact, 0.15 the single near key, 0.03 uniform on the blatant list. Both per-seat draws are consumed on an honest answer. The near draw and the blatant draw use the second draw, as they do now.

A saboteur AI follows the cell plan. A planned near-miss submits the card's near key, which is the lean's choice. The first per-seat draw is consumed and ignored. The second draw is consumed and ignored on that near-miss, matching today's signed near-miss. A planned blatant answer uses the second draw over the blatant list.

The plan tables for three, two, and one living saboteur are unchanged.

Language-model agents stay out of scope. The policies are seeded tables. The bank is the source of truth for the answer key.

## Console

Check-in shows the kind, the prompt, and the choices. Fact and number choices are radios A through E. Number sense also accepts the option's integer; the client maps it to that option before submit. Odd one out is radios 1 through 4. The control offers only legal answers.

The saboteur banner names partners, the lean in words (off-by-one or wrong rule), and the plan. A near-miss plan adds the choice label. Crew see their role only.

The board shows the true choice, every living submission, the fingerprint, and the integrity delta. Canonical keys group the submissions. Notes, discuss, and ballots are the existing phases.

## Migration

The client already runs Parallel Bay Check-ins. `src/main.tsx` mounts `BayApp`. This spec does not switch the generators. Until the backlog lands, `src/bay/puzzles.ts` still builds the retired calibration cards. The quiz slices replace that module and the types, fingerprints, lean, suspicion marks, and check-in UI that mention a dial, a reading, a glyph, or a cell sign.

| Module | Quiz cutover |
| --- | --- |
| `src/bay/bank/` | New. The 72 items and the checker |
| `src/bay/puzzles.ts` | Kind draw, difficulty, item permutation, lean, shuffle |
| `src/bay/types.ts` | `fact`, `number`, and `odd` cards. `CellLean` replaces `CellSign` |
| `src/bay/fingerprint.ts` | Class, distance, canonical key. Number labels resolve to values |
| `src/bay/roles.ts` | The last role-stream draw stores the lean |
| `src/bay/answers.ts` | Planned near-miss is the card's near key |
| `src/bay/suspicion.ts` | Lean marks on number submissions |
| `src/bay/ui/` | Prompt, radios, saboteur banner |

Replay under the quiz rules: the same seed, round count, Helm submissions, and Helm votes produce the same lean, cards, AI submissions, fingerprints, integrity path, calls, and verdict. Notes are ignored. Seeds are not required to reproduce a retired dial board.

## Choices made to close the rules

These are specified so the cutover has nothing left to invent. The locked social numbers are not reopened.

| Topic | Choice |
| --- | --- |
| Near set | Size 1 on every card. The anti-lean number is blatant and still marked |
| Fact lean | Always the curated decoy. The lean bit does not swap it |
| Number step | Always `truth + 1`, never a per-item −1 |
| Odd one out | Four shown items. The other almost-misfit is omitted |
| Lean draw | Same role-stream slot as the old sign. 0 is off-by-one, 1 is wrong rule |
| Human saboteur | A near-miss plan names the choice label and does not name the truth |
| Difficulty | `roundIndex % 3`, in order easy, medium, harder |
| Repeats | Eight items per cell and occurrence 0–3 inside a 12-round watch, so an item does not repeat |
| Item stream | Separate mask. Puzzle reseed stays the kind draw plus the option shuffle |
| Puzzle signature | `generatePuzzle(seed, roundIndex, lean)`. Lean is an input |
| Number key | The integer, whether the seat used a label or the number |
| Distance | 0, 1, or 2 from the class. Numeric gap is not distance |
| Pattern marks | Number step and trap only. Facts and odd one out are unmarked |
| Solver | Card holds the bank's true key. No model and no second lookup |
| Content | In-repo bank. Checker enforces grammar and counts. Review enforces the riddles |
