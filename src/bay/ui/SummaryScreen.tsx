import { ejectionAnnouncement } from '../meeting';
import type { BaySession, BayWinReason } from '../types';
import { BAY_SEATS, SEAT_NAME } from '../types';
import { formatBasisPoints } from './format';

type SummaryScreenProps = {
  session: BaySession;
  onAgain: () => void;
};

const VERDICT: Record<BayWinReason, { title: string; lede: (session: BaySession) => string }> = {
  'saboteurs-ejected': {
    title: 'Crew wins',
    lede: () => 'Every saboteur was ejected. The crew takes the watch.',
  },
  'integrity-window': {
    title: 'Crew wins',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, on or above 70%. A saboteur was still aboard.`,
  },
  'integrity-held': {
    title: 'Saboteurs win',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, below 55%, with a saboteur still aboard.`,
  },
  'crew-eliminated': {
    title: 'Saboteurs win',
    lede: () => 'Every crew seat was ejected.',
  },
  stalemate: {
    title: 'No verdict',
    lede: (session) =>
      `Integrity finished at ${formatBasisPoints(session.integrity)}, from 55% up to but not including 70%.`,
  },
};

export function SummaryScreen({ session, onAgain }: SummaryScreenProps) {
  const verdict = session.winReason ? VERDICT[session.winReason] : null;
  return (
    <main className="shell">
      <p className="kicker">Watch closed · seed {session.seed}</p>
      <h1>{verdict ? verdict.title : 'Watch closed'}</h1>
      <p className="lede">{verdict ? verdict.lede(session) : 'The watch ended before a verdict was recorded.'}</p>
      <section className="panel">
        <h2>Integrity</h2>
        <p className="value">
          {formatBasisPoints(session.integrity)}
          <span>saboteur line 55% · crew line 70%</span>
        </p>
      </section>
      <section className="panel">
        <h2>Roles</h2>
        <ul className="roster">
          {BAY_SEATS.map((seat) => (
            <li key={seat} className={session.ejected.includes(seat) ? 'ejected' : undefined}>
              <strong>
                {SEAT_NAME[seat]} · {session.cell.roles[seat]}
              </strong>
              <span>{session.ejected.includes(seat) ? 'Ejected' : 'Lasted the watch'}</span>
            </li>
          ))}
        </ul>
      </section>
      {session.meetings.length > 0 ? (
        <section className="panel">
          <h2>Accusations</h2>
          <ul className="roster">
            {session.meetings.map((meeting) => (
              <li key={`${meeting.roundIndex}-${meeting.caller}`}>
                <strong>
                  R{meeting.roundIndex + 1} · {SEAT_NAME[meeting.caller]} named {SEAT_NAME[meeting.nominated]}
                </strong>
                <span>{ejectionAnnouncement(meeting, meeting.ejected ? SEAT_NAME[meeting.ejected] : '')}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <button type="button" className="primary" onClick={onAgain}>
        New watch
      </button>
    </main>
  );
}
