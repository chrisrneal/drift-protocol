import { RESCUE_WIN } from '../game/constants';
import type { Session } from '../game/loop';
import { isRescued } from '../game/scoring';
import { SEATS } from '../game/types';
import { SEAT_NAME, percent } from './format';

type SummaryScreenProps = {
  session: Session;
  onAgain: () => void;
};

export function SummaryScreen({ session, onAgain }: SummaryScreenProps) {
  const rescued = isRescued(session.rescue);

  return (
    <main className="shell">
      <p className="kicker">Watch closed · seed {session.seed}</p>
      <h1>{rescued ? 'Rescue window open' : 'Window closed'}</h1>
      <p className="lede">
        {rescued
          ? 'The emitted signals stayed coherent enough, and trust sat close to the record. A fix is possible.'
          : 'The packets never settled, or trust pointed at the noisier seats. The fleet does not have a fix.'}
      </p>

      <section className="panel summary-score" aria-labelledby="final-rescue">
        <h2 id="final-rescue">Rescue probability</h2>
        <p className="value">
          {percent(session.rescue, 1)}
          <span> line was {percent(RESCUE_WIN, 0)}</span>
        </p>
      </section>

      <section className="panel" aria-labelledby="record">
        <h2 id="record">Accuracy on emissions</h2>
        <p className="fine">Compared with the recovered signal. Dropped rounds are left out of a seat’s average.</p>
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
