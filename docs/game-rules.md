# Drift Protocol rules

These rules are the source of truth for Parallel Bay Check-ins. The signal-loop watch (four seats, Relay / Edit / Drop, one saboteur, rescue at 60% / 50%) is retired. Check-ins are the Everyday quiz trio. If a design note disagrees with a number here, this document wins.

A bay check is a solo watch. You and seven AI seats share each round, eight seats in all. Exactly three seats are saboteurs. They know each other. The other five are crew.

A watch is 8, 9, 10, 11, or 12 check-ins. The default is 10.

## Shape

Every living seat receives the same quiz and submits in private. Nobody's answer is an input to another seat's quiz. After the submits lock, the watch opens one board: the true answer, every submission, and a fingerprint for each submission. That parallel check-in replaces the signal loop.

The quiz has three kinds: a quick fact, a number-sense problem, and an odd one out. The kinds are not a serial task. Seats do not pass a token.

## Roles

Three saboteurs are drawn from the seed, on a stream that does not move the puzzles, so the same seed replays the same check-ins and the same cell.

- The draw is uniform. Every seat has the same chance (3/8) of being a saboteur, and every trio is equally likely.
- In solo play you always sit **Helm**. The seed decides whether Helm is crew or a saboteur. The other seven seats are AI.
- Crew see their own role and nothing else about the cell.
- Saboteurs see the other two saboteurs, the cell lean, and their own cell plan for the current check-in. When that plan is a near-miss, they also see the label of the near-miss choice. They do not see the true key.

You are told your role at the start. Other roles stay unpublished through the watch. The end summary names every seat's role. An ejection that ends the watch names the reason, which identifies the side that just lost its last seat. An ejection that does not end the watch publishes the seat's name only. The watch continuing is not evidence that the ejected seat was crew: a saboteur can leave while two saboteurs remain.

## Seats

Roster order is fixed. Instrument ids are fixed labels for the watch, shown on the roster and on every fingerprint. They are public.

| Order | Seat id | Name | Instrument |
| --- | --- | --- | --- |
| 1 | helm | Helm | INST-1 |
| 2 | sonar | Sonar | INST-2 |
| 3 | radio | Radio | INST-3 |
| 4 | nav | Nav | INST-4 |
| 5 | plant | Plant | INST-5 |
| 6 | deck | Deck | INST-6 |
| 7 | medic | Medic | INST-7 |
| 8 | cargo | Cargo | INST-8 |

Helm is the only human seat in solo play. A later multiplayer client may assign any seat to a human. The rules talk about seats, submissions, and living sets. They do not treat Helm as a special rules actor.

Ejected seats stay on the roster. They cannot check in, cannot call a vote, and cannot vote. Their past fingerprints stay on the log.

## Streams

Draws use the existing mulberry32 step (`rngStep` and inclusive `intBetween` in `src/game/rng.ts`). Four streams stay independent. The first three do not read each other. The item stream does not advance them.

**Roles.** Initial state `(seed ^ 0xa5a5a5a5) >>> 0`. Copy the roster. For `i` in 0, 1, 2, swap index `i` with `intBetween(state, i, 7)`. The saboteur set is those first three seats, displayed in roster order. One more draw, `intBetween(state, 0, 1)`, sets the cell lean: 0 means off-by-one (`step`), 1 means wrong rule (`trap`). This stream does not advance during the watch.

**Puzzles.** Each check-in reseeds from the seed and the zero-based round index, so a puzzle does not depend on earlier answers or ejections:

```
mixed = Math.imul((seed ^ 0x0b47c1ec) >>> 0, roundIndex + 1) >>> 0
state = (mixed + 0x6d2b79f5) >>> 0
```

The first draw on that state is the kind. The rest of that state shuffles the options. Which bank item is dealt is the occurrence walk on the item stream, defined under Ground truth. Building round `n` recomputes earlier kind draws from their own reseeds. It does not read submissions.

**Items.** Permutes one kind-by-difficulty cell. `kindIndex` is 0, 1, or 2. `difficultyIndex` is 0 for easy, 1 for medium, 2 for harder. `cellKey` is `kindIndex * 3 + difficultyIndex + 1` (1 through 9).

```
mixed = Math.imul((seed ^ 0x71e1e000) >>> 0, cellKey) >>> 0
state = (mixed + 0x85ebca6b) >>> 0
```

**Check-ins and votes.** AI answer draws start at `(seed ^ 0x0c1ec31a) >>> 0` and advance through the watch. Vote draws start at `(seed ^ 0x707e0001) >>> 0`. Human notes are not on either stream.

## Ground truth

Phase dials, in-band readings, and corrupted glyphs are retired.

Each round has one quiz. Difficulty comes from the zero-based round index, not from a draw:

| `roundIndex % 3` | Difficulty |
| --- | --- |
| 0 | easy |
| 1 | medium |
| 2 | harder |

The kind is the first puzzle-stream draw, `intBetween(state, 0, 2)`:

| Draw | Kind |
| --- | --- |
| 0 | Quick fact |
| 1 | Number sense |
| 2 | Odd one out |

`roundIndex` is an integer from 0 through 11. A watch of length `R` uses indexes 0 through `R - 1`.

The bank cell is that kind and that difficulty. It holds exactly eight items, ids `kind-difficulty-01` through `kind-difficulty-08`. Sort those ids ascending. Permute them with Fisher-Yates on the item stream: for `i` from 7 down to 1, swap index `i` with `intBetween(state, 0, i)`.

Occurrence is the number of earlier indexes `i < roundIndex` whose `i % 3` equals this round's difficulty and whose kind draw equals this round's kind. The item is `permutation[occurrence]`. Inside a watch of at most 12 rounds, occurrence is 0, 1, 2, or 3, so an item does not repeat.

`generatePuzzle(seed, roundIndex, lean)` takes the lean as an input. The lean selects which authored neighbor is the near key on number and odd cards. It does not change the kind, the item id, or a fact card.

The console shows the prompt and the labeled choices. It hides the true key until the board opens. The card stores the bank's true key, near key, and blatant keys. AI seats read those fields. They do not receive a second copy, and they do not call a model.

A careful seat can finish a check-in quickly. The watch is decided by fingerprints, votes, and integrity.

### Quick fact

Five choices: one true answer, one curated near decoy, three far choices. Shuffle them on the puzzle stream. For `i` from 4 down to 1, swap index `i` with `intBetween(state, 0, i)`. Label the result A through E. You submit a label.

The order before the shuffle is the true choice, the near decoy, then the three far choices in bank order.

| Pick | Error class | Distance |
| --- | --- | --- |
| True choice | exact | 0 |
| Near decoy | near-miss | 1 |
| Any far choice | blatant | 2 |

The canonical key is `fact:<label>`. The near list is that one label. The blatant list is the three far labels in order A through E. The lean does not change the decoy. A fact submission has no lean mark.

### Number sense

The prompt is one integer expression. The card shows five values: the truth, `truth + 1`, the trap, and two authored fars. Shuffle and label them A through E the same way as a fact (five entries, `i` from 4 down to 1). You submit a label or the option's integer. A label resolves to that option's integer. Any other integer is illegal.

The trap depends on difficulty. Operands are integers from 0 through 12. The operator characters are `+`, `−` (U+2212), and `×`.

| Difficulty | Prompt | Truth | Trap |
| --- | --- | --- | --- |
| Easy | Two operands, one operator, no parentheses | That operator | The other operator named by `trapVia` (`add`, `sub`, or `mul`), same operands, same order |
| Medium | Three operands, two operators, no parentheses, including one `×` and one `+` or `−` | `×` before `+` and `−`; `+` and `−` left to right | Left to right, equal precedence |
| Harder | Three operands, one parenthesized pair, including one `×` and one `+` or `−` | Parentheses first, then the medium precedence | Delete the parentheses, then the medium precedence |

The trap must differ from the truth and from `truth + 1`. The two authored fars differ from each other, from the truth, from `truth + 1`, and from the trap. Each sits at least 3 away from the truth and at least 2 away from both neighbors, and lies in −30 through 200. Truth and trap lie in that range too.

The lean picks the near key:

| Lean | Near key | Anti-lean, filed as blatant |
| --- | --- | --- |
| Off-by-one | `truth + 1` | Trap |
| Wrong rule | Trap | `truth + 1` |

The order before the shuffle is the truth, the near value, the anti-lean value, then the two authored fars in bank order.

The other two blatant keys are the authored fars. They have no lean mark.

| Pick | Error class | Distance |
| --- | --- | --- |
| Truth | exact | 0 |
| Near key | near-miss | 1 |
| Any of the three other values | blatant | 2 |

Distance is the class integer above. The numeric gap is not the distance, so a blatant `truth + 1` is distance 2.

The canonical key is `number:<integer>`. The near list is the one near value. The blatant list is the three other values, ascending.

Lean marks, for suspicion only:

| Submitted value | Mark |
| --- | --- |
| `truth + 1` | +1 |
| Trap | −1 |
| Any other value | No mark |

Expression `1 + 2 × 3` deals truth 7, step 8, trap 9, fars 1 and 20. Off-by-one files 8 as the near key and 9, 1, 20 as blatant. Wrong rule files 9 as the near key and 8, 1, 20 as blatant. Submitting 8 marks +1 in both cases.

### Odd one out

Four shown items. One does not belong. One is the almost-misfit the lean selected. Two are clear members of the group. The other authored almost-misfit is omitted.

The order before the shuffle is the outsider, the selected almost-misfit, then the two in-group items in bank order. Shuffle on the puzzle stream with `i` from 3 down to 1. Number the result 1 through 4. You submit an index.

| Pick | Error class | Distance |
| --- | --- | --- |
| Outsider | exact | 0 |
| Almost-misfit | near-miss | 1 |
| Either in-group item | blatant | 2 |

The canonical key is `odd:<index>`. The near list is that one index. The blatant list is the two in-group indexes, ascending. An odd-one-out submission has no lean mark.

Off-by-one selects the step almost-misfit: a group member a glance can mistake for the outsider. Wrong rule selects the trap almost-misfit: a group member the item's wrong rule would exclude.

## What you submit

Every living seat submits exactly one legal answer. There is no drop and no partial edit. Submits are simultaneous. AI seats do not see your current answer. They may use earlier boards, which are public.

A saboteur's answer falls in one of three postures once it is fingerprinted:

- **Honest** — the true answer.
- **Near-miss** — the card's one near-miss answer. The cell lean is that answer for the whole watch: the curated decoy on every quick fact, the off-by-one value or the wrong-rule value on every number card, and the matching almost-misfit on every odd-one-out card. A crew slip uses that same key.
- **Blatant** — any other legal answer.

You are not forced into a posture. If you are a saboteur, the banner names the cell's plan for you this round. A near-miss plan also names the choice (`choice B`, or `item 2`). Following it keeps the pattern. Breaking it is allowed and shows up on the board.

Ejected seats are absent. Absence is not a submission and has no fingerprint.

## Fingerprints

When the board opens, each living submission shows the answer and a fingerprint:

| Field | Meaning |
| --- | --- |
| Error class | `exact`, `near-miss`, or `blatant` |
| Distance | 0, 1, or 2, as that kind defines above. Zero only when the class is exact. |
| Instrument id | That seat's stable id, INST-1 through INST-8 |

Integrity uses the error class and whether submissions share a canonical answer. It does not add raw distances. The class is what travels from round to round.

Canonical answers: a fact label, a number value, or an odd-one-out index. Two seats cluster only when those keys are equal.

## Integrity

Integrity replaces rescue. It is stored as integer basis points so a tenth of a percent is exact. 42.0% is 4200. The console shows one decimal place.

The watch starts at **42.0%** (4200). That is the same opening value the legacy rescue meter used. It sits below the saboteur line, so the bay starts uncalibrated and the crew have to climb.

After each check-in, classify the living submissions in this order. `N` is the number of living seats. A strict majority is more than `N / 2` (the same count as an ejection vote).

| Order | Condition | Delta |
| --- | --- | --- |
| 1 | Strict majority submitted the true answer | **+4.0** points (+400) |
| 2 | Strict majority submitted the same wrong answer | **−4.5** points (−450) |
| 3 | Some near-miss answer was submitted by at least two seats | **−3.5** points (−350) |
| 4 | Anything else | **−2.0** points (−200) |

Row 1 is an aligned bay. Row 2 is a false consensus. Row 3 is a near-miss cluster: two or more seats on the same near-miss key. Row 4 is a split. Scattered near-misses on different keys are a split. The first matching row wins, so a true majority still rises when a pair of near-misses sits beside it. Two seats on a blatant anti-lean value are a split, or a false consensus when that value has a strict majority. They are not a near-miss cluster.

Then clamp to the closed range 2.0%–98.0% (200–9800).

The meter moves on round 1. Crossing 70% mid-watch does not end the watch. Falling below 55% mid-watch does not end the watch. Meter wins are scored only when the round limit is reached and no ejection has already ended the watch.

Worked path from a 42.0% start, eight seats living:

| Board | Class | Meter after |
| --- | --- | --- |
| 5 exact, 3 on one near-miss | aligned | 46.0% |
| 4 exact, 3 on one near-miss, 1 blatant | near-miss cluster | 42.5% |
| 6 on one blatant answer, 2 exact | false consensus | 38.0% |
| 2 exact, and six other answers all different | split | 36.0% |

## Discuss

Resolving a check-in opens the discuss phase. The board stays up: truth, submissions, fingerprints, and the integrity delta. A notes strip sits with the board. You can append to a scratchpad of at most 2000 characters. Notes are local to your console. They are not shown to AI seats, they are not scored, and they are not inputs to any stream.

Ballots can be opened only from this phase, on every round including round 1, after that round's board is visible. Check-in has no vote control. There is no clock. The phase is the gate.

Entering discuss on any round, including round 1, runs the AI call once, and the result sits on the board as a pending nomination or as silence. Ballots stay closed while you read and write. You then take that nomination to a ballot, replace it with a nomination of your own, or advance. Advancing discards the pending nomination and spends the round's accusation. AI seats do not advance the phase and do not open ballots on their own.

A later multiplayer client can put seat-visible chat in the notes strip. Solo play keeps notes only. The phase gate stays either way.

## Accusations

Accusations open in the discuss phase of every round, including round 1. Each round allows one accusation.

Any living seat may call it and name one other living seat. That name starts the vote. It does not decide the outcome. Every living seat then votes for a living seat or skips.

A seat is ejected only when more than half of the living seats vote for them:

| Living seats | Votes required |
| --- | --- |
| 8 | 5 |
| 7 | 4 |
| 6 | 4 |
| 5 | 3 |
| 4 | 3 |
| 3 | 2 |
| 2 | 2 |

The watch does not start a check-in with fewer than two living seats. The ejection that would leave a side with nobody aboard ends the watch first.

Skips and votes for someone already ejected do not count toward a target. Votes cast by ejected seats are ignored. A tie, or anything short of a majority, ejects nobody. If two seats both reach a majority, nobody is ejected.

On a majority:

- No saboteur remains aboard: **crew wins** immediately.
- No crew remains aboard: **saboteurs win** immediately.
- Both sides still have someone aboard: the watch continues. The ejected seat's role stays unpublished.

## Win conditions

Elimination is checked when a vote ejects someone, before the meter. The meter is checked only at the round limit, and only if the watch is still open.

**Crew wins** if either:

- all three saboteurs have been ejected, or
- the watch reaches the round limit with integrity at or above **70%**.

The 70% ending is an integrity window. It counts for crew while saboteurs are still aboard.

**Saboteurs win** if either:

- every crew seat has been ejected, or
- the watch reaches the round limit with integrity strictly below **55%** and at least one saboteur still aboard.

**Stalemate** if the watch reaches the round limit with at least one saboteur still aboard and integrity from **55%** up to but not including **70%**. Neither side takes the watch.

If the round limit is reached with no saboteur aboard, crew has already won by ejection. The meter is not consulted.

## Crew AI

The seven AI seats share one check-in policy. Skeptic, Pattern, and Explorer belonged to the signal loop and are not part of this watch.

Each round, every living AI seat consumes two draws from the check-in stream, in roster order, after the cell-plan draw below. Ejected seats and Helm consume none. Both draws are consumed even when the second draw is unused, so an honest answer does not shift the stream.

A crew seat reads the first draw:

| First draw | Submit |
| --- | --- |
| below 0.82 | true answer |
| from 0.82 up to but not including 0.97 | the near-miss key, on the second draw |
| 0.97 and above | a blatant answer, uniform on the second draw |

The near list has one key, so the second draw is `intBetween(state, 0, 0)` and selects it. The blatant list is the order under that kind. Crew near-misses are not a separate lean. The lean has already chosen the card's near key.

## Saboteur AI

At the start of each round, before the per-seat draws, one check-in draw selects the cell plan. The plan covers living saboteurs only. The primary seat is the living saboteur at index `roundIndex mod k` in roster order, where `k` is how many saboteurs are still aboard. The secondary seat is the next living saboteur in roster order, wrapping.

While three saboteurs are alive:

| Cell draw | Plan |
| --- | --- |
| below 0.50 | all honest |
| from 0.50 up to but not including 0.80 | primary near-miss, others honest |
| from 0.80 up to but not including 0.92 | primary and secondary near-miss, the other honest |
| from 0.92 up to but not including 0.97 | primary blatant, others honest |
| 0.97 and above | all three near-miss |

The last row is the rare round where every living saboteur is wrong. It is the only all-wrong plan while three are alive.

While two saboteurs are alive:

| Cell draw | Plan |
| --- | --- |
| below 0.58 | both honest |
| from 0.58 up to but not including 0.88 | primary near-miss, the other honest |
| from 0.88 up to but not including 0.96 | primary blatant, the other honest |
| 0.96 and above | both near-miss |

While one saboteur is alive:

| Cell draw | Plan |
| --- | --- |
| below 0.72 | honest |
| from 0.72 up to but not including 0.95 | near-miss |
| 0.95 and above | blatant |

An AI saboteur follows the plan. A planned near-miss submits the card's near key. A planned blatant answer is uniform on that seat's second draw, over the blatant list. The first of the two per-seat draws is consumed and ignored for saboteur seats, and the second draw is consumed and ignored on a near-miss.

Helm, when Helm is a saboteur, sees the same plan and may submit something else. The other saboteurs still follow the plan.

Saboteurs do not have a private chat channel. Shared cell knowledge is the three identities, the lean, and this round's plan. Earlier boards are public to everyone.

## Crew and saboteur votes

Miss weight for a submission:

| Class | Weight |
| --- | --- |
| exact | 0 |
| near-miss | 0.55 |
| blatant | 1 |

A seat's miss mean is the average weight over rounds they submitted. Rounds after ejection are omitted.

A lean mark is recorded for a number-sense submission of `truth + 1` (+1) or of the trap value (−1). Exact numbers, authored fars, quick facts, and odd-one-out submissions contribute no mark. The mark is recorded when the submitted value is that neighbor, including when the fingerprint calls it blatant.

The modal mark is the +1 or −1 with the greater count across all seats' marked submissions on the public log. A tie, or a log with no marks, means no visible bias.

A seat's pattern score is the fraction of that seat's own marks that match the modal mark. No marks scores 0. No visible bias scores 0 for every seat.

Suspicion is `0.75 * miss mean + 0.25 * pattern score`.

A crew AI will name the other living seat with the highest suspicion when that score is at least 0.40. Otherwise they would skip. They do not name themselves. Ties break toward the earlier seat in roster order.

A saboteur AI uses that rule on the living crew only. Partners and their own seat are excluded. The threshold stays 0.40.

The auto-call runs when discuss opens on every round, including round 1. The earliest crew AI in roster order who would name someone becomes the pending caller. Helm is never that caller. If no crew AI would call, one draw on the vote stream decides a frame. Below 0.12, the earliest living saboteur AI is the pending caller, naming their highest eligible suspicion, and only when that score is at least 0.30. They never name a partner or themselves. At 0.12 and above, the pending call is empty. That frame draw is taken whenever no crew AI would call, including when you later advance without ballots.

If you replace the pending nomination with your own, yours is the accusation. The frame draw is not repeated.

When ballots are cast, each living AI consumes one vote-stream draw, in roster order. Crew ignore the draw and vote by the naming rule above, or skip when nobody reaches 0.40. A saboteur AI does the same, then replaces that choice with their own seat when the draw is below 0.08. Helm's ballot is your input. You may vote for any living seat or skip.

AI votes are not locked to the nominee. A called vote can eject a different seat, or nobody.

## Replay

The same seed, the same round count, the same Helm submissions, and the same Helm votes produce the same roles, cell lean, quizzes, AI submissions, fingerprints, integrity path, AI calls, and verdict. Notes are ignored. The frame draw, when it happens, is taken as discuss opens. Ballot draws are taken only if ballots are cast. Skipping a vote and holding a vote are different replays.
