import { useMemo, useState } from 'react';
import { CHANNELS, LEXICON, RESCUE_WIN } from '../game/constants';
import type { Session } from '../game/loop';
import { normalizeWeights } from '../game/scoring';
import { AI_SEATS, type ActionKind, type AiSeatId, type FieldEdit } from '../game/types';
import { ResultStrip } from './ResultStrip';
import { SEAT_NAME, percent } from './format';

type RoundScreenProps = {
  session: Session;
  onSubmit: (choice: {
    kind: ActionKind;
    edit?: FieldEdit;
    trust: Record<AiSeatId, number>;
  }) => void;
  onNext: () => void;
};

const ACTION_COPY: Record<ActionKind, string> = {
  relay: 'Relay sends this packet unchanged.',
  edit: 'Edit rewrites one keyword or the amplitude, then sends it.',
  drop: 'Drop sends nothing. Your running accuracy is left untouched.',
};

export function RoundScreen({ session, onSubmit, onNext }: RoundScreenProps) {
  const observation = session.observations.you;
  const [kind, setKind] = useState<ActionKind>('relay');
  const [keywordIndex, setKeywordIndex] = useState<0 | 1 | 2>(0);
  const [keywordNext, setKeywordNext] = useState<string>(firstReplacement(observation.keywords, 0));
  const [valueNext, setValueNext] = useState(String(observation.value));
  const [field, setField] = useState<'keyword' | 'value'>('keyword');
  const [trust, setTrust] = useState<Record<AiSeatId, number>>({ skeptic: 50, pattern: 50, explorer: 50 });
  const [error, setError] = useState('');
  const locked = session.phase !== 'play';

  const weights = useMemo(
    () => normalizeWeights(trust, AI_SEATS),
    [trust],
  );

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
    if (!canCommit || locked) {
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
        <span className="meter-mark" style={{ left: `${RESCUE_WIN * 100}%` }} title="Rescue line at 60%" />
      </div>
      <p className="fine meter-note">The mark is the 60% rescue line. It moves after the round resolves.</p>

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
        <p className="fine">Other seats hear their own noisy copy. Their calls stay sealed until you commit.</p>
      </section>

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
                  <select
                    value={keywordNext}
                    disabled={locked}
                    onChange={(event) => setKeywordNext(event.target.value)}
                  >
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
                <input
                  inputMode="numeric"
                  value={valueNext}
                  disabled={locked}
                  onChange={(event) => setValueNext(event.target.value)}
                />
              </label>
            )}
            {!editChanges ? <p className="error">That edit leaves the packet unchanged.</p> : null}
          </div>
        ) : null}

        <fieldset className="trust" disabled={locked}>
          <legend>Trust this round</legend>
          {AI_SEATS.map((seat) => (
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
                onChange={(event) =>
                  setTrust((current) => ({ ...current, [seat]: Number(event.target.value) }))
                }
              />
            </label>
          ))}
          <p className="fine">Sliders are shares, not absolute scores. All zeros count as even trust.</p>
        </fieldset>

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

      {session.resolution ? (
        <ResultStrip
          resolution={session.resolution}
          lastRound={session.roundIndex + 1 >= session.rounds}
          onNext={onNext}
        />
      ) : null}
    </main>
  );
}

function firstReplacement(keywords: readonly string[], index: number): string {
  return LEXICON.find((word) => word !== keywords[index]) ?? LEXICON[0];
}
