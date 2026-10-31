import { useState } from 'react';
import { CHANNELS, DEFAULT_ROUNDS, MAX_ROUNDS, MIN_ROUNDS } from '../game/constants';
import { AI_SEATS } from '../game/types';
import { SEAT_NAME } from './format';

type StartScreenProps = {
  onStart: (rounds: number, seed: number) => void;
};

export function StartScreen({ onStart }: StartScreenProps) {
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [seedText, setSeedText] = useState('');
  const [error, setError] = useState('');

  function begin() {
    let seed = Math.floor(Math.random() * 1_000_000_000);
    if (seedText.trim()) {
      const parsed = Number(seedText);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffffffff) {
        setError('Use a whole number from 0 to 4294967295, or leave the seed blank.');
        return;
      }
      seed = parsed;
    }
    setError('');
    onStart(rounds, seed);
  }

  return (
    <main className="shell">
      <p className="kicker">RV Argo · radio watch</p>
      <h1>Drift Protocol</h1>
      <p className="lede">
        Four seats share a noisy signal. One of them is the saboteur. Relay, edit, or drop each packet, then accuse
        the seat whose traffic stops agreeing. Crew wins by ejecting the saboteur or by holding rescue at 60%. The
        saboteur wins by staying hidden while rescue finishes below 50%.
      </p>

      <section className="panel" aria-labelledby="watch-setup">
        <h2 id="watch-setup">Open a watch</h2>
        <label className="field">
          <span>Rounds · {rounds}</span>
          <input
            type="range"
            min={MIN_ROUNDS}
            max={MAX_ROUNDS}
            step={1}
            value={rounds}
            onChange={(event) => setRounds(Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>Seed</span>
          <input
            inputMode="numeric"
            placeholder="Blank draws a new sea"
            value={seedText}
            onChange={(event) => setSeedText(event.target.value)}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="button" className="primary" onClick={begin}>
          Begin watch
        </button>
      </section>

      <section className="panel" aria-labelledby="how">
        <h2 id="how">How a watch goes</h2>
        <ol className="steps">
          <li>You see your own role. Everyone else stays hidden until the watch ends.</li>
          <li>Read your packet. Relay it, edit one field, or drop it. Living seats do the same.</li>
          <li>After round 1, any living seat can call one accusation per round.</li>
          <li>Votes need a majority of the seats still on the watch. Ejected seats stay visible and cannot vote.</li>
          <li>Eject the saboteur and crew wins immediately. Eject crew and the watch continues.</li>
        </ol>
        <p className="fine">
          Between 50% and 60% at the end, with the saboteur still aboard, the watch is a stalemate. Exact lines are in
          the rules.
        </p>
      </section>

      <section className="panel" aria-labelledby="seats">
        <h2 id="seats">The other seats</h2>
        <ul className="roster">
          {AI_SEATS.map((seat) => (
            <li key={seat}>
              <strong>
                {SEAT_NAME[seat]} · {CHANNELS[seat].grade}
              </strong>
              <span>{CHANNELS[seat].blurb}</span>
            </li>
          ))}
        </ul>
        <p className="fine">
          When you are crew, exactly one of them is the saboteur. When you are the saboteur, all three are crew. A
          saboteur mostly plays the honest policy, then sometimes edits or drops to drag rescue down.
        </p>
      </section>
    </main>
  );
}
