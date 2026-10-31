# Drift Protocol rules

These rules supersede the signal-loop watch (four seats, Relay / Edit / Drop, one saboteur, rescue at 60% / 50%). That watch is legacy. The client still runs it until the bay check-in backlog lands. This document is the source of truth for Parallel Bay Check-ins.

A bay check is a solo watch. You and seven AI seats share each round, eight seats in all. Exactly three seats are saboteurs. They know each other. The other five are crew.

A watch is 8, 9, 10, 11, or 12 check-ins. The default is 10.

## Shape

Every living seat receives the same bay puzzle and submits in private. Nobody's answer is an input to another seat's puzzle. After the submits lock, the watch opens one board: the true answer, every submission, and a fingerprint for each submission. That parallel check-in replaces the signal loop.

The puzzles are a calibration chain in fiction (one bay, one reference, three kinds of instrument). The chain is not a serial task. Seats do not pass a token.

## Roles

Three saboteurs are drawn from the seed, on a stream that does not move the puzzles, so the same seed replays the same check-ins and the same cell.

- The draw is uniform. Every seat has the same chance (3/8) of being a saboteur, and every trio is equally likely.
- In solo play you always sit **Helm**. The seed decides whether Helm is crew or a saboteur. The other seven seats are AI.
- Crew see their own role and nothing else about the cell.
- Saboteurs see the other two saboteurs, the cell sign, and their own cell plan for the current check-in.

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

Draws use the existing mulberry32 step (`rngStep` and inclusive `intBetween` in `src/game/rng.ts`). Three streams stay independent.

**Roles.** Initial state `(seed ^ 0xa5a5a5a5) >>> 0`. Copy the roster. For `i` in 0, 1, 2, swap index `i` with `intBetween(state, i, 7)`. The saboteur set is those first three seats, displayed in roster order. One more draw, `intBetween(state, 0, 1)`, sets the cell sign: 0 means −1, 1 means +1. This stream does not advance during the watch.

**Puzzles.** Each check-in reseeds from the seed and the zero-based round index, so a puzzle does not depend on earlier draw counts, ejections, or answers:

```
mixed = Math.imul((seed ^ 0x0b47c1ec) >>> 0, roundIndex + 1) >>> 0
state = (mixed + 0x6d2b79f5) >>> 0
```

**Check-ins and votes.** AI answer draws start at `(seed ^ 0x0c1ec31a) >>> 0` and advance through the watch. Vote draws start at `(seed ^ 0x707e0001) >>> 0`. Human notes are not on either stream.

## Ground truth

Each round has one puzzle, chosen by the first puzzle-stream draw: `intBetween(state, 0, 2)`.

| Draw | Kind |
| --- | --- |
| 0 | Phase dial |
| 1 | In-band reading |
| 2 | Corrupted glyph |

The prompt is enough to derive the true answer. The true answer is withheld on your console until the board opens. AI seats solve the same prompt. They do not receive a hidden copy of the truth.

A careful seat can finish a check-in quickly. The watch is decided by fingerprints, votes, and integrity.

### Phase dial

Twelve detents, 0 through 11. The next puzzle draws are `A` and `B`, each `intBetween(state, 0, 11)`.

The check-in phase is `(A + B) mod 12`. You submit a detent.

Distance is the circular gap, `min(|submitted − truth|, 12 − |submitted − truth|)`, an integer from 0 to 6. Detents 0 and 11 are one step apart.

| Distance | Error class |
| --- | --- |
| 0 | exact |
| 1 | near-miss |
| 2 or more | blatant |

The two near-miss detents are `(truth + 1) mod 12` and `(truth + 11) mod 12`, in that order. Cell sign +1 is the first. Cell sign −1 is the second.

### In-band reading

The next draws are `anchor = intBetween(state, 18, 64)` and `offset = intBetween(state, 0, 7)`.

The band is the inclusive interval `[anchor, anchor + 7]`. Five values, all distinct:

| Role | Value |
| --- | --- |
| True reading | `anchor + offset` |
| Near decoy | `anchor − 2` |
| Far | `anchor − 16` |
| Far | `anchor + 20` |
| Far | `anchor + 34` |

Shuffle those five with a Fisher-Yates from the end: for `i` from 4 down to 1, swap index `i` with `intBetween(state, 0, i)`. After the shuffle, label the positions R1 through R5. You submit a label.

| Pick | Error class | Distance |
| --- | --- | --- |
| True reading | exact | 0 |
| Near decoy | near-miss | 1 |
| Any far reading | blatant | 2 |

A reading check-in has one near-miss answer. It has no direction. The cell sign is not expressed on this kind.

### Corrupted glyph

The alphabet, in order, with indexes 0 through 7: `B D F H K P R T`.

Draw four indexes with `intBetween(state, 0, 7)`. Repeats are allowed. Draw the corrupted cell with `intBetween(state, 0, 3)`. The seal is the sum of the four indexes modulo 8. The card shows the alphabet, the seal, and the four cells, with the corrupted cell blank.

You submit the missing symbol. The unique symbol that restores the seal is the truth.

Distance is the circular gap on the alphabet, an integer from 0 to 4.

| Distance | Error class |
| --- | --- |
| 0 | exact |
| 1 | near-miss |
| 2 or more | blatant |

The two near-miss symbols are the next and previous letters on the ring, listed as +1 then −1. The cell sign selects between them the same way it does on a dial.

## What you submit

Every living seat submits exactly one legal answer. There is no drop and no partial edit. Submits are simultaneous. AI seats do not see your current answer. They may use earlier boards, which are public.

A saboteur's answer falls in one of three postures once it is fingerprinted:

- **Honest** — the true answer.
- **Near-miss** — a near-miss answer. On a dial or a glyph, the cell's own near-misses use the cell sign, so the direction repeats across rounds. A crew slip uses either neighbor.
- **Blatant** — any other legal answer.

You are not forced into a posture. If you are a saboteur, the banner names the cell's plan for you this round. Following it keeps the pattern. Breaking it is allowed and shows up on the board.

Ejected seats are absent. Absence is not a submission and has no fingerprint.

## Fingerprints

When the board opens, each living submission shows the answer and a fingerprint:

| Field | Meaning |
| --- | --- |
| Error class | `exact`, `near-miss`, or `blatant` |
| Distance | The integer defined by that puzzle kind. Zero only when the class is exact. |
| Instrument id | That seat's stable id, INST-1 through INST-8 |

Integrity uses the error class and whether submissions share a canonical answer. It does not add raw distances across kinds. Dial distance and glyph distance are different scales. The class is what travels from round to round.

Canonical answers: a dial detent, a reading label, or a glyph symbol. Two seats cluster only when those keys are equal.

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

Row 1 is an aligned bay. Row 2 is a false consensus. Row 3 is a near-miss cluster: two or more seats on the same near-miss key. Row 4 is a split. Scattered near-misses on different keys are a split. The first matching row wins, so a true majority still rises when a pair of near-misses sits beside it.

Then clamp to the closed range 2.0%–98.0% (200–9800).

The meter moves on round 1, before any vote exists. Crossing 70% mid-watch does not end the watch. Falling below 55% mid-watch does not end the watch. Meter wins are scored only when the round limit is reached and no ejection has already ended the watch.

Worked path from a 42.0% start, eight seats living:

| Board | Class | Meter after |
| --- | --- | --- |
| 5 exact, 3 on one near-miss | aligned | 46.0% |
| 4 exact, 3 on one near-miss, 1 blatant | near-miss cluster | 42.5% |
| 6 on one blatant answer, 2 exact | false consensus | 38.0% |
| 2 exact, and six other answers all different | split | 36.0% |

## Discuss

Resolving a check-in opens the discuss phase. The board stays up: truth, submissions, fingerprints, and the integrity delta. A notes strip sits with the board. You can append to a scratchpad of at most 2000 characters. Notes are local to your console. They are not shown to AI seats, they are not scored, and they are not inputs to any stream.

From round 2 onward, ballots can be opened only from this phase, after that round's board is visible. Round 1 has a discuss phase and no call. Check-in has no vote control. There is no clock. The phase is the gate.

Entering discuss on round 2 or later runs the AI call once, and the result sits on the board as a pending nomination or as silence. Ballots stay closed while you read and write. You then take that nomination to a ballot, replace it with a nomination of your own, or advance. Advancing discards the pending nomination and spends the round's accusation. AI seats do not advance the phase and do not open ballots on their own.

A later multiplayer client can put seat-visible chat in the notes strip. Solo play keeps notes only. The phase gate stays either way.

## Accusations

Accusations open in the discuss phase of round 2, and in the discuss phase of each later round. Each round allows one accusation.

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
| from 0.82 up to but not including 0.97 | a near-miss, uniform on the second draw |
| 0.97 and above | a blatant answer, uniform on the second draw |

Near-miss and blatant lists are in the order given under each puzzle. The second draw is `intBetween` over that list. Crew near-misses are not biased toward the cell sign. Half of them will match it by chance on a dial or a glyph, because those kinds have two neighbors.

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

An AI saboteur follows the plan. A planned near-miss uses the cell sign on a dial or a glyph, and uses the single near decoy on a reading. A planned blatant answer is uniform on that seat's second draw, over the blatant list. The first of the two per-seat draws is consumed and ignored for saboteur seats.

Helm, when Helm is a saboteur, sees the same plan and may submit something else. The other saboteurs still follow the plan.

Saboteurs do not have a private chat channel. Shared cell knowledge is the three identities, the sign, and this round's plan. Earlier boards are public to everyone.

## Crew and saboteur votes

Miss weight for a submission:

| Class | Weight |
| --- | --- |
| exact | 0 |
| near-miss | 0.55 |
| blatant | 1 |

A seat's miss mean is the average weight over rounds they submitted. Rounds after ejection are omitted.

Direction exists on dial and glyph submissions only. The sign is the shorter step from the truth to the submitted answer, +1 or −1. When both directions are the same length, the sign is 0. Exact answers and every reading submission contribute no sign.

The modal sign is the +1 or −1 with the greater count across all seats' signed misses on the public log. A tie, or a log with no signed misses, means no visible bias.

A seat's pattern score is the fraction of that seat's own non-zero signs that match the modal sign. No non-zero signs scores 0. No visible bias scores 0 for every seat.

Suspicion is `0.75 * miss mean + 0.25 * pattern score`.

A crew AI will name the other living seat with the highest suspicion when that score is at least 0.40. Otherwise they would skip. They do not name themselves. Ties break toward the earlier seat in roster order.

A saboteur AI uses that rule on the living crew only. Partners and their own seat are excluded. The threshold stays 0.40.

The auto-call runs when discuss opens on round 2 or later. It does not run on round 1. The earliest crew AI in roster order who would name someone becomes the pending caller. Helm is never that caller. If no crew AI would call, one draw on the vote stream decides a frame. Below 0.12, the earliest living saboteur AI is the pending caller, naming their highest eligible suspicion, and only when that score is at least 0.30. They never name a partner or themselves. At 0.12 and above, the pending call is empty. That frame draw is taken whenever no crew AI would call, including when you later advance without ballots.

If you replace the pending nomination with your own, yours is the accusation. The frame draw is not repeated.

When ballots are cast, each living AI consumes one vote-stream draw, in roster order. Crew ignore the draw and vote by the naming rule above, or skip when nobody reaches 0.40. A saboteur AI does the same, then replaces that choice with their own seat when the draw is below 0.08. Helm's ballot is your input. You may vote for any living seat or skip.

AI votes are not locked to the nominee. A called vote can eject a different seat, or nobody.

## Replay

The same seed, the same round count, the same Helm submissions, and the same Helm votes produce the same roles, cell sign, puzzles, AI submissions, fingerprints, integrity path, AI calls, and verdict. Notes are ignored. The frame draw, when it happens, is taken as discuss opens. Ballot draws are taken only if ballots are cast. Skipping a vote and holding a vote are different replays.
