# Drift Protocol

Solo radio-watch game. You are the lead operator on a research vessel. Each round you hear a noisy signal packet, then **Relay** it, **Edit** one field, or **Drop** it. Three AI operators do the same on their own noisy copies. A shared rescue probability moves with packet consistency and with how well the trust graph matches each seat’s record.

There is no backend and no hidden traitor. Version 1 is a static client.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. A full watch is 10 rounds by default (choose 8–12 on the start screen). Leave the seed blank, or enter one to replay the same sea.

```bash
npm test
npm run build
npm run preview
```

`npm run build` typechecks, then writes a static `dist/` folder. [vercel.json](vercel.json) points Vercel at that Vite build.

## How to play

1. Read your packet: three keyword tags and an amplitude.
2. Choose Relay, Edit, or Drop. An edit must change exactly one keyword or the number.
3. Set trust sliders for Skeptic, Pattern, and Explorer. They are normalized to shares.
4. Commit. Only then do you see the other seats, the recovered signal, and the rescue delta.
5. After the last round, the watch is a rescue if the meter is at least 60%.

The other seats:

- **Skeptic** keeps a Beta trust model and edits toward the trusted consensus.
- **Pattern** relays familiar traffic, edits a single anomaly, and drops a packet that is wrong in more than one way.
- **Explorer** is an epsilon-greedy bandit over the three actions.

Channel quality is printed on the seats. Skeptic’s radio is cleaner. Explorer’s is rougher. Exact thresholds live in [docs/game-rules.md](docs/game-rules.md).

## Architecture

```
src/game/   types, seeded RNG, signal generation, actions, scoring, session loop
src/ai/     skeptic.ts, pattern.ts, explorer.ts  (pure, no LLM)
src/ui/     start, round, result strip, summary
```

The UI is a view over `createSession`, `submitRound`, and `nextRound`. AI decisions and rescue math are deterministic given the seed and the human choices. Vitest covers scoring and each agent’s relay, edit, and drop paths.

Out of scope for v1: networked multiplayer, accounts, payments, language-model agents, and audio.
