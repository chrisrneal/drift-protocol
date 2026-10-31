# Bay check-ins backlog

Quiz cutover for the [Everyday quiz trio](superpowers/specs/2026-10-31-everyday-quiz-trio-design.md). Normative behavior is [game-rules.md](game-rules.md).

The Parallel Bay Check-ins social layer is the client. `src/main.tsx` mounts `BayApp`. Seats, integrity, discuss, accusations, and the AI plan tables stay. The phase dial, the in-band reading, and the corrupted glyph are superseded. Do not build that family again.

This list is the cutover record. The slices have landed. Put the bank in `src/bay/bank/`. Keep the session modules in `src/bay/`.

Out of these slices: networked multiplayer, voice, accounts, and language-model agents. Questions are static data in the repo.

## 1. Question bank

Add `FACT_BANK`, `NUMBER_BANK`, and `ODD_BANK`. Exactly eight items in each kind-by-difficulty cell, ids `kind-difficulty-01` through `08`. Each cell has at least two `school`, two `everyday`, and two `trivia` items.

A checker covers the rules in game-rules: unique ids, distinct choices, fact prompts ending in `?`, the number grammar and the trap inequalities, five distinct odd strings, and notes present on odd items. The checker recomputes number truth and trap from the prompt. The game will deal the stored keys.

No generator and no UI in this slice. Tests fail the build if a ninth id appears or an eighth id is missing.

## 2. Quiz generator and fingerprints

Replace the calibration generator. `generatePuzzle(seed, roundIndex, lean)` follows the reseed, the kind draw, `roundIndex % 3`, the item permutation, the lean, and the Fisher-Yates shuffle in the rules.

Fingerprints report error class, distance 0, 1, or 2, and instrument id. Canonical keys are `fact:<label>`, `number:<integer>`, and `odd:<index>`. A number label resolves to its integer before the key is formed. An integer off the card is illegal.

Tests lock a 12-round watch with no repeated bank id, a fact card that ignores the lean, a number card whose near key flips with the lean while the item id stays put, an odd card that swaps which almost-misfit is shown, and round 5 staying put when it is generated alone. The expression `1 + 2 × 3` classifies 8 and 9 as in the rules for both leans. Distance is the class integer, including when `truth + 1` is blatant.

## 3. Cell lean, plans, and suspicion

The last role-stream draw stores `step` or `trap` instead of a ±1 sign. Saboteur visibility returns the lean. A near-miss plan also returns the choice label (`choice B` or `item 2`) and does not return the true key.

Crew AI and saboteur AI use the one-element near list and the blatant order in the rules. Draw consumption is unchanged: one plan draw per round, then two draws per living AI seat, both consumed on an honest answer and on a saboteur near-miss.

Suspicion records +1 for a submitted `truth + 1` and −1 for a submitted trap, including a blatant anti-lean value. Facts, odd-one-out submissions, exact numbers, and authored fars add no mark. The 0.75 / 0.25 mix, the 0.40 call, the 0.12 frame, and the 0.08 self-vote stay.

Tests cover both leans on one seed, a partner a saboteur AI never names, and a scripted number log whose modal mark matches the anti-lean submissions.

## 4. Check-in UI

The check-in screen shows the prompt and legal radios: A–E for a fact or a number, 1–4 for odd one out. A number field selects the option whose integer was typed. The prompt omits the bank id, the keys, the lean, and the author notes.

The saboteur banner says off-by-one or wrong rule, plus the plan, plus the near-miss choice when that is the plan. The start screen describes the quiz and the lean. The `index.html` description matches that quiz. Calibration wording and the cell-sign control leave the UI.

Tests cover the prompt lines for one card of each kind, and a banner that names `choice B` only for a near-miss plan.

## 5. Full-watch replay

Play complete watches through the bay session: crew integrity window, saboteur integrity hold, stalemate, all three saboteurs ejected, all crew ejected. Replay the same seed and the same Helm inputs and require the same boards and the same verdict. Skipping a vote and calling a vote are different replays.

`npm test` and `npm run build` pass on the quiz watch.
