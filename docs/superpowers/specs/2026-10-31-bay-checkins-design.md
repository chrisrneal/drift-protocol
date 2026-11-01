# Parallel Bay Check-ins

Approved 2026-10-31. Normative rules: [docs/game-rules.md](../../game-rules.md). If a number here and a number there disagree, `game-rules.md` wins and this spec should be corrected.

This document records the bay's social layer: eight seats, three saboteurs, parallel check-ins, fingerprints, integrity, and discuss-before-vote. That layer is the client. `src/main.tsx` mounts `BayApp`.

The calibration puzzles and the ±1 cell sign are superseded by the [Everyday quiz trio](2026-10-31-everyday-quiz-trio-design.md). They are not the live check-in. Where this document names a phase dial, an in-band reading, a corrupted glyph, or a cell sign, follow the quiz spec and `game-rules.md`.

Quiz cutover slices are in [docs/BACKLOG.md](../../BACKLOG.md). The social-layer migration off the signal loop is recorded below; that migration has landed.

## Supersedes

Parallel Bay Check-ins replaced a four-seat signal loop. That loop is not the client.

- Seats: Helm's predecessor `you`, plus Skeptic, Pattern, and Explorer.
- Task: each living seat hears a private noisy packet and chooses Relay, Edit, or Drop. Trust sliders feed the rescue formula.
- Threat: exactly one saboteur. Ejecting that seat ends the watch, so a vote that continues proves the ejected seat was crew.
- Meter: rescue starts at 42%. Crew wins at or above 60%. A hidden saboteur wins strictly below 50%. The band from 50% up to but not including 60% is a stalemate.

Parallel Bay Check-ins replaced that objective. The seed, the static client, the mulberry32 generator, the living-seat roster, and "one accusation per round, strict majority ejects" stayed. Packets, trust, rescue, and the three signal policies are gone.

## Objective

Eight seats share one bay watch. Each round, every living seat works the same check-in and submits in private. The board then shows every answer beside a fingerprint. Integrity moves from that board. The seats may discuss with the board up and then eject someone.

Crew are trying to leave a record of true check-ins, and to remove the cell. The cell is trying to bend the record without looking like a single broken instrument, and to survive aboard.

The check-in is the Everyday quiz trio: quick fact, number sense, odd one out. The information shape is parallel. The same prompt goes to every living seat. One seat's answer never becomes the next seat's prompt. The three kinds are not a serial task.

## Players and roles

Solo, for this objective: one human and seven AIs. The data is a list of eight seats so a networked client can attach other humans to those seats later without a second ruleset.

Exactly three saboteurs. They know each other. Exactly five crew. Crew see only their own role. A saboteur sees the other two saboteurs.

Shared cell knowledge is:

- the identities of the three saboteurs
- one cell lean for the whole watch, either off-by-one or wrong rule, defined in the quiz spec
- that round's plan for the viewing saboteur: honest, near-miss, or blatant. A near-miss plan includes the choice label from the quiz spec

There is no saboteur chat channel. Coordination is that shared knowledge plus the public boards from earlier rounds. AI saboteurs follow the plan. A human saboteur is told the plan and may ignore it.

The human can be crew or saboteur. In solo play the human is always Helm, and the role stream assigns the trio. Helm's chance of being a saboteur is 3/8, the same as every other seat.

Roles stay hidden on a non-ending ejection. The legacy inference ("we are still playing, so that eject was crew") is false as soon as two saboteurs can survive a successful vote. The end summary publishes every role. A vote that removes the last saboteur or the last crew member ends the watch and states that reason.

## Round flow

A watch is 8 to 12 check-ins, default 10, unchanged from the legacy start screen.

1. **Check-in.** Each living seat sees the puzzle, the integrity meter as it stands, and their role banner. Saboteurs also see the cell. Submits are private. AI answers are fixed before Helm submits and do not depend on Helm's current answer.
2. **Reveal.** Submits lock. The true answer, every living submission, and every fingerprint become public. Integrity updates once. Ejected seats are listed as absent and add no fingerprint.
3. **Discuss.** The board stays on screen. The notes strip is available. Ballots stay closed. There is no timer. On every round, including round 1, opening discuss runs the AI call once and shows a pending nomination or silence. Helm takes that nomination to a ballot, replaces it, or advances. Advancing spends the round's single accusation.
4. **Vote,** if Helm opens ballots. One accusation. Living seats ballot. A strict majority ejects. The watch may end on that ejection.
5. **Next check-in,** or the summary if the round limit was reached or a side has been eliminated.

Meter thresholds do not end the watch in the middle. A bay can cross 70% and still be pulled down. A bay can sit under 55% and still be repaired.

## Puzzles

The live check-in is the Everyday quiz trio. Generators, the question bank, distances, the cell lean, and the reseed formula are normative in `game-rules.md` and specified in [Everyday quiz trio](2026-10-31-everyday-quiz-trio-design.md).

The first bay puzzles were a phase dial, an in-band reading, and a corrupted glyph, including a modular seal. That family is retired. Each live kind still reduces to a finite answer list, one true key, a near-miss set of size 1, and a blatant set. The console prompt omits the true key. The card the AI reads carries the bank's true key.

## Fingerprints

Each living submission on the board carries:

- **Error class** — `exact`, `near-miss`, or `blatant`
- **Distance from truth** — the kind's own integer, 0 only for exact
- **Stable instrument id** — INST-1 through INST-8, bound to the seat for every watch

The instrument id is public from the roster onward. It is repeated on the fingerprint so a board, a note, and a later multiplayer client can cite `INST-4` without depending on a display name.

Integrity classifies answers by canonical key (a fact label, a number value, or an odd-one-out index) and by error class. It does not sum distances across kinds.

## Integrity

Rescue is retired. Integrity uses the same opening value, **42.0%**, stored as 4200 basis points so the tenths below are exact. The console shows one decimal. The meter clamps to 2.0%–98.0%.

42% is a deliberate keep. It is the legacy `RESCUE_START`, and on the new bands it lies in the saboteur region (strictly below 55%). The bay opens uncalibrated. Crew need a run of true majorities to reach 70%. A cell that nicks often can hold the finish under 55%.

After each check-in, apply the first row that matches. `N` is living seats. Strict majority means more than `N / 2`.

| Row | Board | Delta |
| --- | --- | --- |
| Aligned | Strict majority on the true answer | +4.0 points |
| False consensus | Strict majority on one wrong answer | −4.5 points |
| Near-miss cluster | At least two seats submitted the same near-miss key, and neither majority above matched | −3.5 points |
| Split | Any other board, including scattered near-misses on different keys | −2.0 points |

A true majority rises even when a near-miss pair is also present. A cluster is two or more seats on one shared near-miss key: the coordinated miss the cell is built to produce. Two lone slips on different keys are a split.

Over ten rounds, eight aligned boards and two splits finish at 70.0% from a 42.0% start (`42 + 8×4 − 2×2`). Seven aligned boards and three splits finish at 64%, inside the stalemate band. Five aligned boards and five clusters finish at 44.5%, a saboteur meter win if a saboteur is still aboard. Those paths are the reason the deltas are this size.

**Crew meter win:** finish at or above 70%.

**Saboteur meter win:** finish strictly below 55%, with at least one saboteur still aboard.

**Stalemate:** finish from 55% up to but not including 70%, with at least one saboteur still aboard.

## Discuss

The social layer keeps accusations and adds a phase the signal loop never had.

The board is visible for the whole discuss phase. The notes strip is a local scratchpad, 2000 characters, unscored, invisible to AIs, off the RNG streams. Solo play has no generated chat. The strip is the slot a later client fills with seat-visible messages. The gate does not depend on that chat existing.

"Longer" is structural. The legacy client lets a seat call a vote from the middle of the next packet, and an AI call can appear on that same screen. Here the board is the screen, ballots stay closed until Helm leaves discuss toward a vote, and every round, round 1 included, may run a call. Two boards exist before the first ballot. No minimum number of seconds is required. The AI policy still names a seat on its own when discuss opens. That nomination waits on the board. It does not start ballots.

## Accusations, ejection, wins

From the discuss phase of every round: one accusation per round. The caller names one other living seat. Every living seat votes for a living seat or skips. More than half the living seats must agree.

| Living | Votes to eject |
| --- | --- |
| 8 | 5 |
| 7 | 4 |
| 6 | 4 |
| 5 | 3 |
| 4 | 3 |
| 3 | 2 |
| 2 | 2 |

Ejected seats stay on the roster and cannot check in or vote.

Immediate wins, checked before the meter:

- Crew, when the ejected seat was the last saboteur aboard (all three are off the watch).
- Saboteurs, when the ejected seat was the last crew seat aboard.

A non-ending ejection publishes no role.

At the round limit, if the watch is still open:

- Integrity at or above 70%: crew.
- Integrity strictly below 55% with a saboteur still aboard: saboteurs.
- Otherwise: stalemate.

Ejecting one or two saboteurs does not win and does not identify them.

## AI

Seven AIs. One check-in policy for crew, one cell plan for saboteurs. Per-seat channel personalities are not carried over. Skeptic, Pattern, and Explorer were policies for noisy packets.

Crew, each check-in: probability 0.82 exact, 0.15 on the card's single near key, 0.03 blatant uniform on the blatant keys. A crew near-slip lands on the same key as a saboteur near-miss, because the card has one near key. The tell is cross-round: the same instruments nick, and number-sense nicks share the watch lean's mark. The lean and the mark are normative in `game-rules.md`.

Saboteur AIs take one shared plan per round so they are rarely all wrong together. With three alive, probability 0.50 all honest, 0.30 exactly one near-miss, 0.12 exactly two near-misses, 0.05 exactly one blatant, and 0.03 all three near-miss. The all-near row is the rare all-wrong round. Plans for two living saboteurs and for one are in `game-rules.md`. The primary nick walks the living cell by round index.

Suspicion for votes is public: a miss mean (exact 0, near-miss 0.55, blatant 1) mixed 3:1 with how often that seat's lean marks match the modal mark on the log. Quick-fact and odd-one-out submissions do not carry a mark. A number-sense submission of `truth + 1` or of the trap value does. Crew AIs call at suspicion 0.40. They never auto-call from Helm's seat. The call is evaluated when discuss opens, on every round, and waits as a pending nomination. If no crew AI would call, a saboteur AI frames at probability 0.12 above suspicion 0.30, and never names a partner. On the ballot, a saboteur AI votes for themselves at probability 0.08. Partners are excluded from saboteur nominations.

Draw order, constants, and the "consume the draw even when it is ignored" rule are in `game-rules.md`. They exist so a replay does not depend on which branch an AI took.

Language-model agents are out of scope. These policies are seeded tables.

## Multiplayer-ready

Not built now. The rules engine should still look like this when it is built:

- A seat is an id, a display name, an instrument id, and a controller (`human` or `ai`). Solo sets Helm to `human` and the other seven to `ai`.
- The engine accepts an external submission or ballot for every seat whose controller is `human`. It fills `ai` seats itself.
- Role visibility is per viewer. A crew viewer does not receive the cell. A saboteur viewer receives the other saboteur ids, the cell lean, and their plan. A near-miss plan includes the choice label.
- Authoritative state is puzzles, submissions, fingerprints, integrity, ejections, votes, and roles. Notes stay on the client.
- The payloads a later socket would carry are already the in-process events: check-in submit, reveal board, meeting call, ballot.

No accounts, voice, matchmaking, or netcode in the backlog for this objective.

## Choices made to close the rules

These were not spelled out as separate product locks. They are specified so the doc has no open decisions. The player counts, the three-saboteur cell, the parallel check-in, the fingerprint fields, the 70% / 55% bands, the discuss-before-vote gate, and the two ejection sweeps are the locks.

| Topic | Choice |
| --- | --- |
| Meter start | 42.0%, matching legacy rescue |
| Deltas | +4.0 aligned, −4.5 false consensus, −3.5 same-key near-miss cluster, −2.0 split |
| False consensus | A majority on one wrong answer is its own fall, steeper than a split |
| Cluster | Two or more seats on the same near-miss key |
| Storage | Integer basis points, clamp 2.0%–98.0% |
| Meter timing | Every check-in moves it, including round 1. Only the round limit can award a meter win |
| Watch length | 8–12, default 10, retained |
| Human seat | Always Helm in solo. Role is seeded |
| Ejection privacy | Role unpublished unless that ejection ends the watch |
| First vote | Discuss phase after check-in 2. Two boards before the first ballot. AI nominations wait until Helm opens ballots |
| Discuss length | A mandatory phase, not a timer |
| Ballot | Keep the legacy ballot: name any living seat or skip. A strict majority ejects |
| Crew AI | One shared error table. Packet personalities retire |
| Cell channel | No private chat. The lean, the identities, and the round plan are the cell |
| Cell lean | One watch-long preference, off-by-one or wrong rule. Number cards mark the other neighbor as blatant. Facts and odd one out have no suspicion mark |
| Notes | Local 2000-character scratchpad, unscored |

## Migration from the signal loop

This migration has landed. The bay modules live in `src/bay/`, and the client mounts `BayApp`. The notes below are the record of that cutover, not remaining work.

| Legacy | Bay check-ins |
| --- | --- |
| `you`, `skeptic`, `pattern`, `explorer` | `helm`, `sonar`, `radio`, `nav`, `plant`, `deck`, `medic`, `cargo` |
| `assignSaboteur` returns one id | Role stream returns a set of three, plus a cell lean |
| Private noisy packet | Shared puzzle, private submission, public truth on reveal |
| Relay, Edit, Drop | One answer, fingerprinted as honest, near-miss, or blatant |
| Trust weights, consistency, alignment | Removed. The board is the evidence |
| Rescue formula and `RESCUE_WIN` / `RESCUE_FAIL` | Integrity basis points, 70% and 55% |
| `verdictAfterEject` compares one saboteur id | Crew win only when zero saboteurs remain. Saboteur win when zero crew remain |
| Continuing after an ejection means "that was crew" | Continuing publishes no role |
| Accusation available once round 1 is logged, including mid-packet | Accusation only in discuss, every round |
| Skeptic, Pattern, Explorer, `sabotageDecision` | Crew error table and the cell plan |

Legacy files the cutover deletes or stops calling: `src/game/signals.ts`, the packet and trust types, the rescue path in `src/game/scoring.ts`, `src/ai/skeptic.ts`, `src/ai/pattern.ts`, `src/ai/explorer.ts`, `src/ai/sabotage.ts`, and the trust sliders plus rescue copy in `src/ui`. Keep `src/game/rng.ts`. Keep the strict-majority count in `majorityEject` (it already uses `floor(n / 2) + 1`). Replace the single-saboteur verdicts and the rescue bands in `src/game/vote.ts`.

Win-reason ids to retire: `saboteur-ejected`, `rescue-window`, `saboteur-survived`. Replacements: `saboteurs-ejected`, `integrity-window`, `integrity-held`, with `crew-eliminated` and `stalemate` still meaningful.

## Backlog

The social-layer slices have landed: seats and roles, integrity, discuss, accusations, the seven AI seats, full-watch tests, and removal of the signal loop.

Remaining work is the quiz cutover in [docs/BACKLOG.md](../../BACKLOG.md): the question bank, the quiz generator, the cell lean, the check-in UI, and a full-watch replay on those cards.

Networked multiplayer and language-model agents are not slices of this objective.
