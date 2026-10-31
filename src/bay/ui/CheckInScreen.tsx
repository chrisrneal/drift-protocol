import { useState } from 'react';
import { viewFor } from '../roles';
import { BAY_SEATS, GLYPH_ALPHABET, INSTRUMENT, type BayAnswer, type BaySession, type ReadingLabel } from '../types';
import { checkInControls } from './controls';
import { formatBasisPoints, SEAT_NAME } from './format';
import { promptFacts } from './prompt';
import { RoleBanner } from './RoleBanner';

type CheckInScreenProps = {
  session: BaySession;
  onSubmit: (answer: BayAnswer) => void;
  onWatch: () => void;
};

export function CheckInScreen({ session, onSubmit, onWatch }: CheckInScreenProps) {
  const helmLiving = !session.ejected.includes('helm');
  const controls = checkInControls(helmLiving);
  const facts = promptFacts(session.puzzle);
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null);
  const [detent, setDetent] = useState(0);
  const [label, setLabel] = useState<ReadingLabel>('R1');
  const [symbol, setSymbol] = useState<(typeof GLYPH_ALPHABET)[number]>('B');

  function submit() {
    if (!controls.submit) return;
    if (session.puzzle.kind === 'dial') onSubmit({ kind: 'dial', detent });
    else if (session.puzzle.kind === 'reading') onSubmit({ kind: 'reading', label });
    else onSubmit({ kind: 'glyph', symbol });
  }

  return (
    <main className="shell">
      <header className="watch-head">
        <div>
          <p className="kicker">RV Argo · seed {session.seed}</p>
          <h1>
            Check-in {session.roundIndex + 1}
            <span> / {session.rounds}</span>
          </h1>
        </div>
        <div className="rescue-readout">
          <span>Integrity</span>
          <strong>{formatBasisPoints(session.integrity)}</strong>
        </div>
      </header>
      <RoleBanner view={view} ejected={!helmLiving} />
      <div
        className="meter"
        role="meter"
        aria-label="Integrity"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={session.integrity / 100}
        aria-valuetext={formatBasisPoints(session.integrity)}
      >
        <span className="meter-fill" style={{ width: `${session.integrity / 100}%` }} />
        <span className="meter-mark fail" style={{ left: '55%' }} title="Saboteur line at 55%" />
        <span className="meter-mark" style={{ left: '70%' }} title="Crew line at 70%" />
      </div>
      <p className="fine meter-note">Red is 55%. Amber is 70%. The meter does not end the watch by itself.</p>
      <section className="panel" aria-labelledby="roster">
        <h2 id="roster">Bay roster</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => {
            const gone = session.ejected.includes(seat);
            return (
              <li key={seat} className={gone ? 'ejected' : undefined}>
                <strong>
                  {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
                </strong>
                <span>{gone ? 'Ejected · still on the roster' : 'On the watch'}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="panel" aria-labelledby="prompt">
        <h2 id="prompt">Check-in</h2>
        <ul className="roster">
          {facts.lines.map((line) => (
            <li key={line}>
              <strong>{line}</strong>
            </li>
          ))}
        </ul>
        {controls.submit && session.puzzle.kind === 'dial' ? (
          <div className="actions" role="radiogroup" aria-label="Detent">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((value) => (
              <label key={value} className={detent === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="detent" checked={detent === value} onChange={() => setDetent(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit && session.puzzle.kind === 'reading' ? (
          <div className="actions" role="radiogroup" aria-label="Reading">
            {(['R1', 'R2', 'R3', 'R4', 'R5'] as const).map((value) => (
              <label key={value} className={label === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="reading" checked={label === value} onChange={() => setLabel(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit && session.puzzle.kind === 'glyph' ? (
          <div className="actions" role="radiogroup" aria-label="Symbol">
            {GLYPH_ALPHABET.map((value) => (
              <label key={value} className={symbol === value ? 'choice selected' : 'choice'}>
                <input type="radio" name="glyph" checked={symbol === value} onChange={() => setSymbol(value)} />
                {value}
              </label>
            ))}
          </div>
        ) : null}
        {controls.submit ? (
          <button type="button" className="primary" onClick={submit}>
            Submit check-in
          </button>
        ) : (
          <button type="button" className="primary" onClick={onWatch}>
            Watch this check-in
          </button>
        )}
      </section>
    </main>
  );
}
