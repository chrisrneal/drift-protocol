import { useState } from 'react';
import { livingSeats, viewFor } from '../roles';
import type { BaySeatId, BaySession } from '../types';
import { SEAT_NAME } from './format';
import { RoleBanner } from './RoleBanner';

type VoteScreenProps = {
  session: BaySession;
  onCast: (choice: BaySeatId | 'skip' | null) => void;
};

export function VoteScreen({ session, onCast }: VoteScreenProps) {
  const meeting = session.meeting;
  const living = livingSeats(session.ejected);
  const helmLiving = living.includes('helm');
  const [choice, setChoice] = useState<BaySeatId | 'skip' | null>(null);
  const view = viewFor('helm', session.cell, session.plan?.postures.helm ?? null, session.puzzle);
  if (!meeting) return null;

  return (
    <main className="shell">
      <p className="kicker">RV Argo · accusation</p>
      <h1>Vote</h1>
      <RoleBanner view={view} ejected={!helmLiving} />
      <p className="lede">
        {SEAT_NAME[meeting.caller]} names {SEAT_NAME[meeting.nominated]}. Every seat still on the watch votes for
        someone to eject, or skips. It takes more than half of those seats.
      </p>
      <form
        className="panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (helmLiving && !choice) return;
          onCast(helmLiving ? choice : null);
        }}
      >
        <h2>{helmLiving ? 'Your vote' : 'You are ejected'}</h2>
        {helmLiving ? (
          <div className="actions vote-options" role="radiogroup" aria-label="Who to eject">
            {[...living, 'skip' as const].map((option) => (
              <label key={option} className={choice === option ? 'choice selected' : 'choice'}>
                <input
                  type="radio"
                  name="vote"
                  checked={choice === option}
                  onChange={() => setChoice(option)}
                />
                {option === 'skip' ? 'Skip' : SEAT_NAME[option]}
              </label>
            ))}
          </div>
        ) : (
          <p>You stay on the roster, but you cannot vote.</p>
        )}
        <button type="submit" className="primary" disabled={helmLiving && choice === null}>
          {helmLiving ? 'Lock vote' : 'Hear the votes'}
        </button>
      </form>
    </main>
  );
}
