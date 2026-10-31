import { useEffect, useState } from 'react';
import type { Session } from '../game/loop';
import { ballotsFromHuman } from '../game/propose';
import { livingSeats } from '../game/roles';
import { majorityEject, type VoteBallot, type VoteChoice } from '../game/vote';
import { SEAT_NAME } from './format';
import { RoleBanner } from './RoleBanner';

type MeetingScreenProps = {
  session: Session;
  onResolve: (votes: VoteBallot[]) => void;
};

export function MeetingScreen({ session, onResolve }: MeetingScreenProps) {
  const meeting = session.meeting;
  const living = livingSeats(session.ejected);
  const youLive = living.includes('you');
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [ballots, setBallots] = useState<VoteBallot[] | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!ballots || shown >= ballots.length) return;
    const timer = window.setTimeout(() => setShown((count) => count + 1), 420);
    return () => window.clearTimeout(timer);
  }, [ballots, shown]);

  if (!meeting) return null;

  const options: VoteChoice[] = [...living, 'skip'];
  const revealed = ballots?.slice(0, shown) ?? [];
  const ready = ballots !== null && shown >= ballots.length;
  const ejected = ballots ? majorityEject(ballots, living) : null;

  function lockVote() {
    if (youLive && !choice) return;
    setBallots(ballotsFromHuman(session, youLive ? choice : null));
    setShown(0);
  }

  return (
    <main className="shell">
      <p className="kicker">RV Argo · accusation</p>
      <h1>Vote</h1>
      <RoleBanner role={session.roles.you} />
      <p className="lede">
        {SEAT_NAME[meeting.caller]} names {SEAT_NAME[meeting.nominated]}. Every seat still on the watch votes for
        someone to eject, or to skip. It takes more than half of those seats. Ejected seats stay on the roster and
        do not vote.
      </p>

      {ballots ? (
        <section className="panel" aria-live="polite" aria-labelledby="vote-reveal">
          <h2 id="vote-reveal">Votes</h2>
          <ol className="vote-list">
            {revealed.map((vote) => (
              <li key={vote.voter}>
                <strong>{SEAT_NAME[vote.voter]}</strong>
                <span>{vote.choice === 'skip' ? 'Skip' : `Eject ${SEAT_NAME[vote.choice]}`}</span>
              </li>
            ))}
          </ol>
          {ready ? (
            <>
              <p>{ejected ? `${SEAT_NAME[ejected]} has a majority.` : 'No majority. Nobody leaves the watch.'}</p>
              <button type="button" className="primary" onClick={() => onResolve(ballots)}>
                Close the vote
              </button>
            </>
          ) : (
            <p className="fine">Votes are still coming in.</p>
          )}
        </section>
      ) : (
        <form
          className="panel"
          aria-labelledby="your-vote"
          onSubmit={(event) => {
            event.preventDefault();
            lockVote();
          }}
        >
          <h2 id="your-vote">{youLive ? 'Your vote' : 'You are ejected'}</h2>
          {youLive ? (
            <div className="actions vote-options" role="radiogroup" aria-label="Who to eject">
              {options.map((option) => (
                <label key={option} className={choice === option ? 'choice selected' : 'choice'}>
                  <input
                    type="radio"
                    name="vote"
                    value={option}
                    checked={choice === option}
                    onChange={() => setChoice(option)}
                  />
                  {option === 'skip' ? 'Skip' : SEAT_NAME[option]}
                </label>
              ))}
            </div>
          ) : (
            <p>You stay on the roster, but you cannot vote or touch the console.</p>
          )}
          <button type="submit" className="primary" disabled={youLive && choice === null}>
            {youLive ? 'Lock vote' : 'Hear the votes'}
          </button>
        </form>
      )}
    </main>
  );
}
