import { useState } from 'react';
import { viewFor } from '../roles';
import { BAY_SEATS, type BaySeatId, type BaySession } from '../types';
import { clampNotes } from '../notes';
import { discussControls } from './controls';
import { formatBasisPoints, formatDelta, INSTRUMENT, SEAT_NAME } from './format';
import { formatSubmitted, formatTruth } from './prompt';
import { RoleBanner } from './RoleBanner';

type DiscussScreenProps = {
  session: BaySession;
  notes: string;
  onNotes: (value: string) => void;
  onAdvance: () => void;
  onAccuse: (target: BaySeatId) => void;
  onTakePending: () => void;
};

export function DiscussScreen({ session, notes, onNotes, onAdvance, onAccuse, onTakePending }: DiscussScreenProps) {
  const helmLiving = !session.ejected.includes('helm');
  const controls = discussControls({
    roundIndex: session.roundIndex,
    helmLiving,
    pending: session.pendingCall !== null,
  });
  const record = session.log[session.log.length - 1];
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null, record?.puzzle);
  const livingTargets = BAY_SEATS.filter((seat) => seat !== 'helm' && !session.ejected.includes(seat));
  const [target, setTarget] = useState<BaySeatId>(livingTargets[0] ?? 'sonar');
  const truth = record ? formatTruth(record.puzzle) : null;

  return (
    <main className="shell">
      <header className="watch-head">
        <div>
          <p className="kicker">RV Argo · board</p>
          <h1>
            Discuss {session.roundIndex + 1}
            <span> / {session.rounds}</span>
          </h1>
        </div>
        <div className="integrity-readout">
          <span>Integrity</span>
          <strong>{formatBasisPoints(session.integrity)}</strong>
        </div>
      </header>
      <RoleBanner view={view} ejected={!helmLiving} />
      {record && truth ? (
        <section className="panel board" aria-labelledby="board">
          <h2 id="board">Board</h2>
          <p>
            Truth {truth}. Delta {formatDelta(record.delta)}.
          </p>
          <ul className="roster">
            {record.rows.map((row) => (
              <li key={row.seat} className={row.absent ? 'ejected' : undefined}>
                <strong>{SEAT_NAME[row.seat]}</strong>
                {row.absent ? (
                  <span>Absent</span>
                ) : (
                  <span className="fingerprint">
                    {formatSubmitted(record.puzzle, row.answer)} · {row.fingerprint.errorClass} · distance{' '}
                    {row.fingerprint.distance} · {row.fingerprint.instrumentId}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="panel" aria-labelledby="notes">
        <h2 id="notes">Notes</h2>
        <textarea
          className="notes"
          maxLength={2000}
          value={notes}
          onChange={(event) => onNotes(clampNotes(event.target.value))}
        />
      </section>
      {controls.accuse ? (
        <section className="panel" aria-labelledby="accuse">
          <h2 id="accuse">Accusation</h2>
          {controls.takePending && session.pendingCall ? (
            <button type="button" className="primary" onClick={onTakePending}>
              Take {SEAT_NAME[session.pendingCall.caller]} naming {SEAT_NAME[session.pendingCall.nominated]}
            </button>
          ) : null}
          <div className="actions" role="radiogroup" aria-label="Seat to name">
            {livingTargets.map((seat) => (
              <label key={seat} className={target === seat ? 'choice selected' : 'choice'}>
                <input type="radio" name="target" checked={target === seat} onChange={() => setTarget(seat)} />
                {SEAT_NAME[seat]} · {INSTRUMENT[seat]}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => onAccuse(target)}>
            Name this seat
          </button>
        </section>
      ) : null}
      {controls.advance ? (
        <button type="button" className="primary" onClick={onAdvance}>
          {session.roundIndex === 0 ? 'Next check-in' : session.roundIndex + 1 >= session.rounds ? 'Close the watch' : 'Advance without a vote'}
        </button>
      ) : null}
    </main>
  );
}
