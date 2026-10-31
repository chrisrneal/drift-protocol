# Drift Protocol

Solo bay watch for eight seats. You and seven AI operators answer the same everyday quiz each round: a quick fact, a number-sense problem, or an odd one out. Three seats are saboteurs, and they know each other. After you submit, the board shows every answer and its fingerprint. Integrity starts at 42%. Crew wins by ejecting all three saboteurs or by finishing at 70% or better. The saboteurs win by ejecting every crew seat, or by finishing below 55% with a saboteur still aboard.

Exact rules: [docs/game-rules.md](docs/game-rules.md). Quiz design: [docs/superpowers/specs/2026-10-31-everyday-quiz-trio-design.md](docs/superpowers/specs/2026-10-31-everyday-quiz-trio-design.md). Social layer: [docs/superpowers/specs/2026-10-31-bay-checkins-design.md](docs/superpowers/specs/2026-10-31-bay-checkins-design.md).

The social layer is what the client runs today. The quiz described here is the check-in those rules specify. The bank and the generators land in the cutover slices in [docs/BACKLOG.md](docs/BACKLOG.md).

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

1. Read your role. Crew learn only that they are crew. A saboteur sees the other two saboteurs, the cell lean (off-by-one or wrong rule), and this round's plan. A near-miss plan also names the choice.
2. Each round, every living seat gets the same quiz. Rounds cycle easy, medium, harder.
3. Submit in private. A fact or a number is a label A–E. A number also accepts the option's integer. Odd one out is an index 1–4.
4. The board opens: every submission, its error class, its distance from the true answer, and that seat's instrument id. Integrity moves.
5. Discuss with the board up. Notes stay on your console. From round 2, an AI may already have named someone; ballots stay closed until you take that name, name someone yourself, or move on. Round 1 has no vote.
6. One accusation per round. A majority of the living seats ejects. Ejected seats stay listed and cannot check in or vote. A vote that continues does not announce the ejected seat's role.
7. Eject all three saboteurs and crew wins on the spot. Eject every crew seat and the saboteurs win on the spot. Otherwise play the remaining check-ins.

The integrity meter has two marks. Below 55% at the end, with a saboteur still aboard, the saboteurs win. At 70% or above, crew wins even if saboteurs are still aboard. From 55% up to but not including 70%, the watch is a stalemate.

Crew AIs usually submit the true answer and sometimes miss. Saboteur AIs mostly check in clean, sometimes leave the shared lean's near-miss, and rarely all miss on the same round. Thresholds live in [docs/game-rules.md](docs/game-rules.md).

## Architecture

```
src/bay/     seats, puzzles, fingerprints, integrity, AI policy, session
src/bay/ui/  start, check-in, discuss, vote, summary
src/game/rng.ts
src/ui/console.css
```

The UI is a view over `createBaySession`, `submitHumans`, `advance`, `openAccusation`, `takePending`, `castBallots`, and `resolveUnattended`. Notes stay in React state. AI answers, votes, and integrity are deterministic given the seed and Helm's choices.

The quiz bank and generators are specified and not switched in yet. Cutover slices: [docs/BACKLOG.md](docs/BACKLOG.md).

Out of scope: networked multiplayer, voice, maps, accounts, payments, and language-model agents. The seat list carries a `human` or `ai` controller so a later client can attach other humans. That attachment is not in this build.
