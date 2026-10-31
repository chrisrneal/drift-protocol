import { useEffect, useRef } from 'react';
import { CHANNELS } from '../game/constants';
import type { RoundResolution } from '../game/loop';
import { SEATS } from '../game/types';
import { SEAT_NAME, packetKeywords, percent, signedPercent, trustLine } from './format';

type ResultStripProps = {
  resolution: RoundResolution;
  lastRound: boolean;
  onNext: () => void;
};

export function ResultStrip({ resolution, lastRound, onNext }: ResultStripProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  const delta = resolution.rescueAfter - resolution.rescueBefore;

  useEffect(() => {
    nextRef.current?.focus();
  }, []);

  return (
    <section className="panel result" aria-live="polite" aria-labelledby="resolved-title">
      <h2 id="resolved-title">Round resolved</h2>
      <p className="fine">Recovered signal, hidden until every seat had committed.</p>
      <div className="packet compact">
        <div className="keywords">
          {resolution.truth.keywords.map((word, index) => (
            <span className="chip" key={`${word}-${index}`}>
              {word}
            </span>
          ))}
        </div>
        <p className="value">
          {resolution.truth.value}
          <span> amplitude</span>
        </p>
      </div>

      <ol className="seat-log">
        {SEATS.map((seat) => {
          const decision = resolution.decisions[seat];
          const heard = resolution.observations[seat];
          const sent = resolution.emissions[seat];
          return (
            <li key={seat}>
              <header>
                <strong>{SEAT_NAME[seat]}</strong>
                <span>
                  {CHANNELS[seat].grade} · {decision.kind}
                </span>
              </header>
              <p>Heard {packetKeywords(heard)} · {heard.value}</p>
              <p>{sent ? `Sent ${packetKeywords(sent)} · ${sent.value}` : 'Sent nothing'}</p>
              <p className="fine">Trust {trustLine(seat, decision.trust)}</p>
            </li>
          );
        })}
      </ol>

      <dl className="scores">
        <div>
          <dt>Consistency</dt>
          <dd>{percent(resolution.consistency, 1)}</dd>
        </div>
        <div>
          <dt>Trust alignment</dt>
          <dd>{percent(resolution.alignment, 1)}</dd>
        </div>
        <div>
          <dt>Rescue</dt>
          <dd>
            {percent(resolution.rescueAfter, 1)}{' '}
            <span className={delta >= 0 ? 'up' : 'down'}>({signedPercent(delta)})</span>
          </dd>
        </div>
      </dl>

      <button ref={nextRef} type="button" className="primary" onClick={onNext}>
        {lastRound ? 'Close the watch' : 'Next signal'}
      </button>
    </section>
  );
}
