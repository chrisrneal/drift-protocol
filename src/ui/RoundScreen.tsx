import { useEffect, useMemo, useState } from 'react';
import { CHANNELS, LEXICON, RESCUE_FAIL, RESCUE_WIN } from '../game/constants';
import type { Session } from '../game/loop';
import { livingSeats } from '../game/roles';
import { normalizeWeights } from '../game/scoring';
import { AI_SEATS, SEATS, type ActionKind, type AiSeatId, type FieldEdit, type SeatId } from '../game/types';
import { ResultStrip } from './ResultStrip';
import { RoleBanner } from './RoleBanner';
import { SEAT_NAME, percent } from './format';

type RoundScreenProps = {
  session: Session;
  canAccuse: boolean;
  aiCall: { caller: SeatId; nominated: SeatId } | null;
  onSubmit: (choice: {
    kind: ActionKind;
    edit?: FieldEdit;
    trust: Record<AiSeatId, number>;
  }) => void;
  onNext: () => void;
  onAccuse: (target: SeatId) => void;
  onAnswerCall: (caller: SeatId, nominated: SeatId) => void;
  onWatch: () => void;
};

const ACTION_COPY: Record<ActionKind, string> = {
  relay: 'Relay sends this packet unchanged.',
  edit: 'Edit rewrites one keyword or the amplitude, then sends it.',
  drop: 'Drop sends nothing. Your running accuracy is left untouched.',
};

export function RoundScreen({
  session,
  canAccuse,
  aiCall,
  onSubmit,
  onNext,
  onAccuse,
  onAnswerCall,
  onWatch,
}: RoundScreenProps) {
  const observation = session.observations.you;
  const ejectedYou = session.ejected.includes('you');
  const [kind, setKind] = useState<ActionKind>('relay');
  const [keywordIndex, setKeywordIndex] = useState<0 | 1 | 2>(0);
  const [keywordNext, setKeywordNext] = useState<string>(firstReplacement(observation.keywords, 0));
  const [valueNext, setValueNext] = useState(String(observation.value));
  const [field, setField] = useState<'keyword' | 'value'>('keyword');
  const [trust, setTrust] = useState<Record<AiSeatId, number>>({ skeptic: 50, pattern: 50, explorer: 50 });
  const [error, setError] = useState('');
  const locked = session.phase !== 'play' || ejectedYou;
  useEffect(() => {
    if (session.phase !== 'resolved') return;
    document.getElementById('resolved-title')?.scrollIntoView({ block: 'start' });
  }, [session.phase, session.roundIndex, session.meetings.length]);
  const peers = AI_SEATS.filter((seat) => !session.ejected.includes(seat));
  const living = livingSeats(session.ejected);
  const lastMeeting = session.meetings[session.meetings.length - 1];
  const meetingNote =
    lastMeeting && lastMeeting.roundIndex === session.roundIndex
      ? lastMeeting.ejected
        ? `${SEAT_NAME[lastMeeting.ejected]} was ejected. The saboteur is still on the watch.`
        : 'No majority. Nobody left the watch.'
      : '';

  const weights = useMemo(() => normalizeWeights(trust, peers), [trust, peers]);

  const edit = useMemo<FieldEdit | null>(() => {
    if (kind !== 'edit') return null;
    if (field === 'keyword') return { field: 'keyword', index: keywordIndex, next: keywordNext };
    const parsed = Number(valueNext);
    if (!Number.isFinite(parsed)) return null;
    return { field: 'value', next: Math.round(parsed) };
  }, [field, keywordIndex, keywordNext, kind, valueNext]);

  const editChanges =
    edit?.field === 'keyword'
      ? edit.next !== observation.keywords[edit.index]
      : edit?.field === 'value'
        ? edit.next !== observation.value
        : false;
  const canCommit = kind !== 'edit' || (edit !== null && editChanges);

  function commit() {
    if (locked) return;
    if (!canCommit) {
      setError('Change one field before you commit an edit.');
      return;
    }
    setError('');
    onSubmit({
      kind,
      edit: kind === 'edit' && edit ? edit : undefined,
      trust,
    });
  }

  return (
    <main className="shell">
      <header className="watch-head">
        <div>
          <p className="kicker">RV Argo · seed {session.seed}</p>
          <h1>
            Round {session.roundIndex + 1}
            <span> / {session.rounds}</span>
          </h1>
        </div>
        <div className="rescue-readout">
          <span>Rescue</span>
          <strong>{percent(session.rescue, 1)}</strong>
        </div>
      </header>
      <RoleBanner role={session.roles.you} ejected={ejectedYou} />

      <div
        className="meter"
        role="meter"
        aria-label="Rescue probability"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(session.rescue * 100)}
        aria-valuetext={percent(session.rescue, 1)}
      >
        <span className="meter-fill" style={{ width: `${session.rescue * 100}%` }} />
        <span className="meter-mark fail" style={{ left: `${RESCUE_FAIL * 100}%` }} title="Saboteur line at 50%" />
        <span className="meter-mark" style={{ left: `${RESCUE_WIN * 100}%` }} title="Crew line at 60%" />
      </div>
      <p className="fine meter-note">
        Red is 50%. Below that at the end, a hidden saboteur wins. Amber is 60%. At or above that, crew wins even if
        the saboteur is still aboard.
      </p>

      <section className="panel" aria-labelledby="roster">
        <h2 id="roster">Watch roster</h2>
        <ul className="roster">
          {SEATS.map((seat) => {
            const gone = session.ejected.includes(seat);
            return (
              <li key={seat} className={gone ? 'ejected' : undefined}>
                <strong>{SEAT_NAME[seat]}</strong>
                <span>{gone ? 'Ejected · still on the roster, out of the vote' : 'On the watch'}</span>
              </li>
            );
          })}
        </ul>
        {meetingNote ? <p className="fine">{meetingNote}</p> : null}
      </section>

      {ejectedYou ? (
        <section className="panel" aria-labelledby="benched">
          <h2 id="benched">You are ejected</h2>
          <p>The console is closed. You can still watch the signals and any later votes.</p>
          {session.phase === 'play' ? (
            <button type="button" className="primary" onClick={onWatch}>
              Watch this signal
            </button>
          ) : null}
        </section>
      ) : (
        <section className="panel" aria-labelledby="heard">
          <h2 id="heard">Your packet · {CHANNELS.you.grade} channel</h2>
          <div className="packet">
            <div className="keywords">
              {observation.keywords.map((word, index) => (
                <span className="chip" key={`${word}-${index}`}>
                  {index + 1} {word}
                </span>
              ))}
            </div>
            <p className="value">
              {observation.value}
              <span> amplitude</span>
            </p>
          </div>
          <p className="fine">
            {session.phase === 'play'
              ? 'Other living seats hear their own noisy copy. Their calls stay sealed until you commit.'
              : 'That is the packet you heard. The recovered signal is with the round result.'}
          </p>
        </section>
      )}

      {ejectedYou || session.phase !== 'play' ? null : (
        <form
          className="panel"
          aria-labelledby="transmit"
          onSubmit={(event) => {
            event.preventDefault();
            commit();
          }}
        >
          <h2 id="transmit">Transmission</h2>
          <div className="actions" role="radiogroup" aria-label="Action">
            {(['relay', 'edit', 'drop'] as const).map((action) => (
              <label key={action} className={kind === action ? 'choice selected' : 'choice'}>
                <input
                  type="radio"
                  name="action"
                  value={action}
                  checked={kind === action}
                  disabled={locked}
                  onChange={() => setKind(action)}
                />
                {action}
              </label>
            ))}
          </div>
          <p className="fine">{ACTION_COPY[kind]}</p>

          {kind === 'edit' ? (
            <div className="edit-box">
              <label className="field">
                <span>Field</span>
                <select
                  value={field}
                  disabled={locked}
                  onChange={(event) => setField(event.target.value === 'value' ? 'value' : 'keyword')}
                >
                  <option value="keyword">Keyword</option>
                  <option value="value">Amplitude</option>
                </select>
              </label>
              {field === 'keyword' ? (
                <>
                  <label className="field">
                    <span>Slot</span>
                    <select
                      value={keywordIndex}
                      disabled={locked}
                      onChange={(event) => {
                        const index = Number(event.target.value) as 0 | 1 | 2;
                        setKeywordIndex(index);
                        setKeywordNext(firstReplacement(observation.keywords, index));
                      }}
                    >
                      {observation.keywords.map((word, index) => (
                        <option value={index} key={index}>
                          {index + 1} · {word}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Replacement</span>
                    <select value={keywordNext} disabled={locked} onChange={(event) => setKeywordNext(event.target.value)}>
                      {LEXICON.map((word) => (
                        <option value={word} key={word}>
                          {word}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="field">
                  <span>New amplitude</span>
                  <input inputMode="numeric" value={valueNext} disabled={locked} onChange={(event) => setValueNext(event.target.value)} />
                </label>
              )}
              {!editChanges ? <p className="error">That edit leaves the packet unchanged.</p> : null}
            </div>
          ) : null}

          {peers.length > 0 ? (
            <fieldset className="trust" disabled={locked}>
              <legend>Trust this round</legend>
              {peers.map((seat) => (
                <label key={seat} className="slider">
                  <span>
                    {SEAT_NAME[seat]}
                    <small>
                      {CHANNELS[seat].grade} · {percent(weights[seat] ?? 0)}
                    </small>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trust[seat]}
                    aria-valuetext={percent(weights[seat] ?? 0)}
                    onChange={(event) => setTrust((current) => ({ ...current, [seat]: Number(event.target.value) }))}
                  />
                </label>
              ))}
              <p className="fine">Sliders are shares among seats still on the watch. All zeros count as even trust.</p>
            </fieldset>
          ) : null}

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          {locked ? null : (
            <button type="submit" className="primary" disabled={!canCommit}>
              Commit transmission
            </button>
          )}
        </form>
      )}

      {session.resolution ? <ResultStrip resolution={session.resolution} /> : null}

      {aiCall ? (
        <section className="panel" aria-labelledby="ai-call">
          <h2 id="ai-call">{SEAT_NAME[aiCall.caller]} calls an accusation</h2>
          <p>They name {SEAT_NAME[aiCall.nominated]}. You can still vote for any seat still on the watch.</p>
          <button type="button" className="primary" onClick={() => onAnswerCall(aiCall.caller, aiCall.nominated)}>
            Open the vote
          </button>
        </section>
      ) : null}

      {canAccuse ? (
        <section className="panel" aria-labelledby="accuse">
          <h2 id="accuse">Call an accusation</h2>
          <p className="fine">One accusation per round, after round 1. Name a seat still on the watch.</p>
          <div className="actions accuse-actions">
            {living
              .filter((seat) => seat !== 'you')
              .map((seat) => (
                <button type="button" key={seat} className="choice" onClick={() => onAccuse(seat)}>
                  Accuse {SEAT_NAME[seat]}
                </button>
              ))}
          </div>
        </section>
      ) : (
        <p className="fine">
          {session.log.length < 1
            ? 'Accusations open after round 1.'
            : session.ejected.includes('you')
              ? 'Ejected seats cannot call a vote.'
              : 'This round already had an accusation.'}
        </p>
      )}

      {session.phase === 'resolved' ? (
        <button type="button" className={aiCall ? 'secondary' : 'primary'} onClick={onNext}>
          {aiCall ? 'Skip the accusation' : session.roundIndex + 1 >= session.rounds ? 'Close the watch' : 'Next signal'}
        </button>
      ) : null}
    </main>
  );
}

function firstReplacement(keywords: readonly string[], index: number): string {
  return LEXICON.find((word) => word !== keywords[index]) ?? LEXICON[0];
}
