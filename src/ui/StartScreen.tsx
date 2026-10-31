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
        You are the lead operator. Each round a signal arrives already dirty. Relay it, edit one field, or drop it.
        Three other seats do the same. Rescue depends on how well the emitted packets agree, and on whether trust
        tracks who has actually been reliable.
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
        <h2 id="how">How a round goes</h2>
        <ol className="steps">
          <li>Read your packet. Keywords are tags. The number is amplitude.</li>
          <li>Relay sends it unchanged. Edit changes one keyword or the number. Drop sends nothing.</li>
          <li>Set trust for the other seats. The weights are normalized when you commit.</li>
          <li>Their actions stay sealed until you commit. Then the recovered signal is shown.</li>
        </ol>
        <p className="fine">
          There is no hidden traitor. Channels just differ in quality. A rescue holds if the meter finishes at 60% or
          better.
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
      </section>
    </main>
  );
}
