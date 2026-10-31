# Bay check-ins backlog

Implementation slices for [Parallel Bay Check-ins](superpowers/specs/2026-10-31-bay-checkins-design.md). Normative behavior is [game-rules.md](game-rules.md).

This list is the work. It is not started. Land the slices in order. Keep `npm test` and `npm run build` green after each one. Put new modules in `src/bay/` and leave the legacy session in place until the last slice. `SEATS` in `src/game/types.ts` is four packet emitters; widening it early will break the running watch.

Out of these slices: networked multiplayer, voice, accounts, and language-model agents.

## 1. Seats and roles

Eight seats in roster order, with instrument ids INST-1 through INST-8. The role stream assigns exactly three saboteurs and one cell sign, using the constants in the rules. Every trio is reachable and the draw is uniform. Solo play marks Helm as the human controller and the other seven as AI.

A crew view returns that seat's role only. A saboteur view returns the other two saboteur ids and the sign. The same seed replays the same trio and the same sign. Tests cover the uniform counts, both visibilities, and replay. The legacy app still runs.

## 2. Puzzle engine

Pure puzzles from seed and round index, on the puzzle reseed in the rules. All three kinds: phase dial, in-band reading, corrupted glyph. Fingerprints report error class, distance, and instrument id. Canonical keys group equal answers.

Tests lock the boundaries: dial wrap between 0 and 11, glyph ring neighbors, the reading near decoy versus a far reading, and two rounds of the same seed staying put when answers change. No UI yet.

## 3. Integrity

Basis-point meter. Start at 4200. Deltas +400, −450, −350, and −200 in the priority order in the rules. Clamp to 200–9800. End-of-watch bands: at or above 7000 is crew, strictly below 5500 with a saboteur still aboard is saboteurs, and the rest of an open watch is stalemate.

Tests cover each row, the priority (a true majority still rises when a near-miss pair is present), the clamp, and a meter that crosses 70% without ending the watch by itself.

## 4. Discuss phase

Session phases are check-in, discuss, optional meeting, then the next check-in or done. Locking submits reveals the board, applies integrity once, and enters discuss. Round 1 discuss has the board and the notes strip, does not run the AI call, and rejects ballots. From round 2, opening discuss may attach a pending AI nomination, and ballots open only when Helm takes that nomination or names someone. Advancing without ballots spends the round's accusation.

Notes are a client scratchpad of at most 2000 characters. They are absent from the replay streams. The UI for this slice can be the new screens in `src/bay` without replacing the legacy start path yet. Tests assert the phase gate and a single integrity update per check-in.

## 5. Accusations for eight seats and three saboteurs

Wire meetings to the bay session. Majority table from 8 living seats down to 2. One meeting per round. Ejected seats stay listed and cannot check in or vote.

Ejecting the last saboteur is an immediate crew win. Ejecting the last crew seat is an immediate saboteur win. Ejecting anyone while both sides remain continues the watch and does not include a role in the result. Tests cover those three ejection outcomes and a failed majority.

## 6. Seven AI seats

Crew AIs use the shared 0.82 / 0.15 / 0.03 table. Saboteur AIs follow the cell plan, including the 0.03 all-near round while three are alive, and they apply the cell sign on dial and glyph near-misses. Draw consumption matches the rules: one plan draw per round, then two draws per living AI seat, both consumed on honest rounds.

AI check-ins do not read Helm's current submission. Accusation policy uses the suspicion mix, protects partners, frames at 0.12, and self-votes at 0.08. Helm is never the auto-caller. Tests lock a scripted seed's plan, a shared sign across the cell, and a partner who is never named by a saboteur AI.

## 7. Full-watch tests

Play complete watches through the bay session: crew integrity window, saboteur integrity hold, stalemate, all three saboteurs ejected, all crew ejected. Replay the same seed and the same Helm inputs and require the same boards and the same verdict. Skipping a vote and calling a vote are different replays.

The legacy signal-loop tests still pass in this slice.

## 8. Remove the signal loop

Point the client at the bay session. Delete the packet task, trust sliders, rescue math, lexicon noise, Skeptic, Pattern, Explorer, and the single-saboteur sabotage policy. Update the start screen, role banner, and summary to the bay rules. Update the README so it describes the client that actually runs, and drop the "implementation pending" line.

`npm test` and `npm run build` pass on the bay watch alone.
