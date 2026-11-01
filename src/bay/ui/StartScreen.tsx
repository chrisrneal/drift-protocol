import { useState } from 'react';
import { DEFAULT_ROUNDS, MAX_ROUNDS, MIN_ROUNDS } from '../constants';
import { BAY_SEATS, INSTRUMENT, SEAT_NAME } from '../types';

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
      <p className="kicker">RV Argo · bay watch</p>
      <h1>Drift Protocol</h1>
      <p className="lede">
        Eight seats answer the same quiz: a quick fact, a number-sense problem, or an odd one out. Three of them are
        saboteurs, and they know each other. Submit in private, then read the board. Integrity starts at 42%. Crew
        wins by ejecting all three saboteurs or by finishing at 70% or better. The saboteurs win by ejecting every
        crew seat, or by finishing below 55% with one of them still aboard.
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
            placeholder="Blank draws a new bay"
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
          <li>
            You are Helm. Crew see only their own role. A saboteur sees the other two, the cell lean (off-by-one or
            wrong rule), and this round&apos;s plan. A near-miss plan also names the choice.
          </li>
          <li>Every living seat gets the same quiz. Rounds cycle easy, medium, harder. Submit in private.</li>
          <li>The board opens. Each answer shows its error class, its distance, and its instrument id. Integrity moves.</li>
          <li>Discuss with the board up. Notes stay on this console. Any round, including round 1, can end in a vote.</li>
          <li>When an AI calls a vote, go to it. Or call one yourself by picking a seat, or move on. Moving on spends that round&apos;s accusation.</li>
        </ol>
        <p className="fine">From 55% up to but not including 70% at the end, with a saboteur still aboard, the watch is a stalemate.</p>
      </section>
      <section className="panel" aria-labelledby="seats">
        <h2 id="seats">The seats</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => (
            <li key={seat}>
              <strong>
                {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
              </strong>
              <span>{seat === 'helm' ? 'Your console.' : 'AI seat.'}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
