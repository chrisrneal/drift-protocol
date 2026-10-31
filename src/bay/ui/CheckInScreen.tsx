import { useState } from 'react';
import { viewFor } from '../roles';
import {
  BAY_SEATS,
  INSTRUMENT,
  type BayAnswer,
  type BaySession,
  type ChoiceLabel,
  type OddIndex,
} from '../types';
import { checkInControls } from './controls';
import { formatBasisPoints, SEAT_NAME } from './format';
import { kindTitle } from './prompt';
import { RoleBanner } from './RoleBanner';

type CheckInScreenProps = {
  session: BaySession;
  onSubmit: (answer: BayAnswer) => void;
  onWatch: () => void;
};

const CHOICES: ChoiceLabel[] = ['A', 'B', 'C', 'D', 'E'];

export function CheckInScreen({ session, onSubmit, onWatch }: CheckInScreenProps) {
  const helmLiving = !session.ejected.includes('helm');
  const controls = checkInControls(helmLiving);
  const puzzle = session.puzzle;
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null, puzzle);
  const [label, setLabel] = useState<ChoiceLabel>('A');
  const [odd, setOdd] = useState<OddIndex>(1);
  const [typed, setTyped] = useState('');

  function submit() {
    if (!controls.submit) return;
    if (puzzle.kind === 'fact') onSubmit({ kind: 'fact', label });
    else if (puzzle.kind === 'number') {
      const option = puzzle.options.find((entry) => entry.label === label);
      if (!option) return;
      onSubmit({ kind: 'number', value: option.value });
    } else onSubmit({ kind: 'odd', index: odd });
  }

  function applyTyped(raw: string) {
    setTyped(raw);
    if (puzzle.kind !== 'number') return;
    if (!/^-?\d+$/.test(raw.trim())) return;
    const value = Number(raw.trim());
    const match = puzzle.options.find((entry) => entry.value === value);
    if (match) setLabel(match.label);
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
        <div className="integrity-readout">
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
        <h2 id="prompt">{kindTitle(puzzle.kind)}</h2>
        <p className="prompt">{puzzle.prompt}</p>
        {controls.submit && (puzzle.kind === 'fact' || puzzle.kind === 'number') ? (
          <div className="quiz-options" role="radiogroup" aria-label="Answer">
            {CHOICES.map((value) => {
              const option = puzzle.options.find((entry) => entry.label === value);
              const text = option && 'text' in option ? option.text : option && 'value' in option ? option.value : value;
              return (
                <label key={value} className={label === value ? 'choice quiz selected' : 'choice quiz'}>
                  <input type="radio" name="answer" checked={label === value} onChange={() => setLabel(value)} />
                  <strong>{value}</strong>
                  <span>{text}</span>
                </label>
              );
            })}
          </div>
        ) : null}
        {controls.submit && puzzle.kind === 'number' ? (
          <label className="field number-entry">
            <span>Or type the number</span>
            <input inputMode="numeric" value={typed} onChange={(event) => applyTyped(event.target.value)} />
          </label>
        ) : null}
        {controls.submit && puzzle.kind === 'odd' ? (
          <div className="quiz-options" role="radiogroup" aria-label="Answer">
            {puzzle.options.map((option) => (
              <label key={option.index} className={odd === option.index ? 'choice quiz selected' : 'choice quiz'}>
                <input
                  type="radio"
                  name="answer"
                  checked={odd === option.index}
                  onChange={() => setOdd(option.index)}
                />
                <strong>{option.index}</strong>
                <span>{option.text}</span>
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
