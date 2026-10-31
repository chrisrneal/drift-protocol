# Drift Protocol

Solo bay watch for eight seats. You and seven AI operators run the same check-in each round: match a phase dial, pick the in-band reading, or repair one glyph. Three seats are saboteurs, and they know each other. After you submit, the board shows every answer and its fingerprint. Integrity starts at 42%. Crew wins by ejecting all three saboteurs or by finishing at 70% or better. The saboteurs win by ejecting every crew seat, or by finishing below 55% with a saboteur still aboard.

**Implementation is pending.** The rules are approved. The client in this repository still runs the legacy signal loop (four seats, Relay / Edit / Drop, one saboteur, rescue at 60% / 50%). Exact bay rules: [docs/game-rules.md](docs/game-rules.md). Design and migration: [docs/superpowers/specs/2026-10-31-bay-checkins-design.md](docs/superpowers/specs/2026-10-31-bay-checkins-design.md). Slices: [docs/BACKLOG.md](docs/BACKLOG.md).

There is no backend. The build is a static client. The check-ins and the cell both come from the seed.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. The start screen you get today is the legacy watch: 8–12 rounds, default 10. Leave the seed blank, or enter one to replay the same sea and the same saboteur. The approved watch uses that same length and the same idea of a replayed seed, with eight seats and three saboteurs, once the backlog lands.

```bash
npm test
npm run build
npm run preview
```

`npm run build` typechecks, then writes a static `dist/` folder. [vercel.json](vercel.json) points Vercel at that Vite build. The app is a PWA.

## How to play

These are the approved bay rules. The current screens still ask you to Relay, Edit, or Drop.

1. Read your role. Crew learn only that they are crew. A saboteur sees the other two saboteurs, the cell's miss direction, and this round's plan.
2. Each round, every living seat gets the same check-in.
3. Submit in private.
4. The board opens: every submission, its error class, its distance from the true answer, and that seat's instrument id. Integrity moves.
5. Discuss with the board up. Notes stay on your console. From round 2, an AI may already have named someone; ballots stay closed until you take that name, name someone yourself, or move on. Round 1 has no vote.
6. One accusation per round. A majority of the living seats ejects. Ejected seats stay listed and cannot check in or vote. A vote that continues does not announce the ejected seat's role.
7. Eject all three saboteurs and crew wins on the spot. Eject every crew seat and the saboteurs win on the spot. Otherwise play the remaining check-ins.

The integrity meter has two marks. Below 55% at the end, with a saboteur still aboard, the saboteurs win. At 70% or above, crew wins even if saboteurs are still aboard. From 55% up to but not including 70%, the watch is a stalemate.

Crew AIs usually submit the true answer and sometimes miss. Saboteur AIs mostly check in clean, sometimes leave a shared near-miss, and rarely all miss on the same round. Thresholds live in [docs/game-rules.md](docs/game-rules.md).

## What the client does today

Four seats share a noisy signal. One of them is the saboteur. You Relay, Edit, or Drop, then set trust. After round 1 anyone still on the watch can call an accusation. Crew wins by ejecting that saboteur or by finishing with rescue at 60% or better. The saboteur wins by staying hidden while rescue finishes below 50%. That loop is superseded. It remains playable until the bay slices replace it.

## Architecture

```
src/game/   legacy signal loop: types, seeded RNG, signals, actions, scoring, roles, votes, session
src/ai/     legacy skeptic, pattern, explorer, plus sabotage and accusation policy
src/ui/     legacy start, round, accusation vote, result strip, summary
```

The UI is a view over `createSession`, `submitRound`, `openMeeting`, `resolveMeeting`, and `nextRound`. AI decisions, votes, and rescue math are deterministic given the seed and the human choices. Vitest covers scoring, each agent's relay, edit, and drop paths, role assignment, majority votes, and ejection.

Bay check-ins are the task layer this project is building. They are specified and not wired through these modules yet. The backlog adds them beside this tree, then removes the signal loop.

Out of scope: networked multiplayer, voice, maps, accounts, payments, and language-model agents. The seat list is shaped so multiplayer can attach later. That attachment is not part of the current build.
