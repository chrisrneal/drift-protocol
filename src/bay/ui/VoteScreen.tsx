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
      <section className="panel">
        <h2>{helmLiving ? 'Your vote' : 'You are ejected'}</h2>
        {helmLiving ? (
          <div className="actions vote-options">
            {[...living, 'skip' as const].map((option) => (
              <button key={option} type="button" className="choice" onClick={() => onCast(option)}>
                {option === 'skip' ? 'Skip' : SEAT_NAME[option]}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p>You stay on the roster, but you cannot vote.</p>
            <button type="button" className="primary" onClick={() => onCast(null)}>
              Hear the votes
            </button>
          </>
        )}
      </section>
    </main>
  );
}
