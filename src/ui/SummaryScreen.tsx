import { RESCUE_FAIL, RESCUE_WIN } from '../game/constants';
import type { Session } from '../game/loop';
import type { WinReason } from '../game/vote';
import { SEATS } from '../game/types';
import { SEAT_NAME, percent } from './format';

type SummaryScreenProps = {
  session: Session;
  onAgain: () => void;
};

const VERDICT: Record<WinReason, { title: string; lede: (session: Session) => string }> = {
  'saboteur-ejected': {
    title: 'Crew wins',
    lede: (session) =>
      `${SEAT_NAME[session.saboteur]} was the saboteur and was ejected. The crew takes the watch.`,
  },
  'rescue-window': {
    title: 'Crew wins',
    lede: (session) =>
      `Rescue finished at ${percent(session.rescue, 1)}, on or above the 60% line. ${SEAT_NAME[session.saboteur]} was still aboard. That rescue window is a crew victory even though the saboteur was never ejected.`,
  },
  'saboteur-survived': {
    title: 'Saboteur wins',
    lede: (session) =>
      `${SEAT_NAME[session.saboteur]} was never ejected, and rescue finished at ${percent(session.rescue, 1)}, below 50%.`,
  },
  'crew-eliminated': {
    title: 'Saboteur wins',
    lede: (session) => `Every crew seat was ejected. ${SEAT_NAME[session.saboteur]} has the watch.`,
  },
  stalemate: {
    title: 'No verdict',
    lede: (session) =>
      `Rescue finished at ${percent(session.rescue, 1)}, from 50% up to but not including 60%. ${SEAT_NAME[session.saboteur]} was never ejected. Neither side takes the watch.`,
  },
};

export function SummaryScreen({ session, onAgain }: SummaryScreenProps) {
  const verdict = session.winReason ? VERDICT[session.winReason] : null;

  return (
    <main className="shell">
      <p className="kicker">Watch closed · seed {session.seed}</p>
      <h1>{verdict ? verdict.title : 'Watch closed'}</h1>
      <p className="lede">
        {verdict
          ? verdict.lede(session)
          : 'The watch ended before a verdict was recorded.'}
      </p>

      <section className="panel summary-score" aria-labelledby="final-rescue">
        <h2 id="final-rescue">Rescue probability</h2>
        <p className="value">
          {percent(session.rescue, 1)}
          <span>
            saboteur line {percent(RESCUE_FAIL, 0)} · crew line {percent(RESCUE_WIN, 0)}
          </span>
        </p>
      </section>

      <section className="panel" aria-labelledby="roles">
        <h2 id="roles">Roles</h2>
        <ul className="roster">
          {SEATS.map((seat) => (
            <li key={seat} className={session.ejected.includes(seat) ? 'ejected' : undefined}>
              <strong>
                {SEAT_NAME[seat]} · {session.roles[seat]}
              </strong>
              <span>{session.ejected.includes(seat) ? 'Ejected' : 'Lasted the watch'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="record">
        <h2 id="record">Accuracy on emissions</h2>
        <p className="fine">Compared with the recovered signal. Drops and rounds after ejection are left out.</p>
        <ul className="roster">
          {SEATS.map((seat) => {
            const stats = session.reliability[seat];
            const label = stats.count === 0 ? 'No emission scored' : percent(stats.sum / stats.count, 1);
            return (
              <li key={seat}>
                <strong>
                  {SEAT_NAME[seat]} · {stats.count} sent
                </strong>
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {session.meetings.length > 0 ? (
        <section className="panel" aria-labelledby="votes">
          <h2 id="votes">Accusations</h2>
          <ul className="roster">
            {session.meetings.map((meeting) => (
              <li key={`${meeting.roundIndex}-${meeting.caller}`}>
                <strong>
                  R{meeting.roundIndex + 1} · {SEAT_NAME[meeting.caller]} named {SEAT_NAME[meeting.nominated]}
                </strong>
                <span>{meeting.ejected ? `${SEAT_NAME[meeting.ejected]} ejected` : 'No majority'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="log">
        <h2 id="log">Round log</h2>
        <ol className="round-log">
          {session.log.map((round) => (
            <li key={round.roundIndex}>
              <span>R{round.roundIndex + 1}</span>
              <span>Cons {percent(round.consistency, 0)}</span>
              <span>Trust {percent(round.alignment, 0)}</span>
              <span>{percent(round.rescueAfter, 1)}</span>
            </li>
          ))}
        </ol>
      </section>

      <button type="button" className="primary" onClick={onAgain}>
        New watch
      </button>
    </main>
  );
}
