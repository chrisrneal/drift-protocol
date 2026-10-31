# Drift Protocol

Solo radio-watch game with one hidden saboteur. You and three AI operators share a noisy signal. Each round you **Relay** a packet, **Edit** one field, or **Drop** it. After round 1, any living seat can call an accusation. Crew wins by ejecting the saboteur or by finishing with rescue at 60% or better. The saboteur wins by staying hidden while rescue finishes below 50%.

There is no backend. Version 2 is still a static client. The sea and the saboteur both come from the seed.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. A full watch is 10 rounds by default (choose 8–12 on the start screen). Leave the seed blank, or enter one to replay the same sea and the same saboteur.

```bash
npm test
npm run build
npm run preview
```

`npm run build` typechecks, then writes a static `dist/` folder. [vercel.json](vercel.json) points Vercel at that Vite build. The app is a PWA.

## How to play

1. Read your role. You are either crew or the only saboteur. The other roles stay hidden until the end.
2. Read your packet: three keyword tags and an amplitude.
3. Choose Relay, Edit, or Drop. An edit must change exactly one keyword or the number.
4. Set trust sliders for the seats still on the watch. They are normalized to shares.
5. Commit. Only then do you see the other living seats, the recovered signal, and the rescue delta.
6. After round 1, call an accusation or answer one. Living seats vote. A majority ejects. Ejected seats stay listed and cannot vote or transmit.
7. Eject the saboteur and crew wins on the spot. Otherwise play the remaining rounds.

The rescue meter has two marks. Below 50% at the end, a hidden saboteur wins. At 60% or above, crew wins even if the saboteur is still aboard. From 50% up to but not including 60%, the watch is a stalemate.

The other seats, when they are crew:

- **Skeptic** keeps a Beta trust model and edits toward the trusted consensus.
- **Pattern** relays familiar traffic, edits a single anomaly, and drops a packet that is wrong in more than one way.
- **Explorer** is an epsilon-greedy bandit over the three actions.

A saboteur AI mostly does that, then sometimes edits or drops to pull the packets apart. Channel quality is printed on the seats. Exact thresholds live in [docs/game-rules.md](docs/game-rules.md).

## Architecture

```
src/game/   types, seeded RNG, signals, actions, scoring, roles, votes, session loop
src/ai/     skeptic, pattern, explorer, plus sabotage and accusation policy
src/ui/     start, round, accusation vote, result strip, summary
```

The UI is a view over `createSession`, `submitRound`, `openMeeting`, `resolveMeeting`, and `nextRound`. AI decisions, votes, and rescue math are deterministic given the seed and the human choices. Vitest covers scoring, each agent’s relay, edit, and drop paths, role assignment, majority votes, and ejection.

Out of scope: networked multiplayer, voice, maps, accounts, payments, language-model agents, and task minigames beyond the signal loop.
