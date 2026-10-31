import { useState } from 'react';
import { castBallots, openAccusation, takePending } from '../meeting';
import { advance, createBaySession, resolveUnattended, submitHumans } from '../session';
import type { BayAnswer, BaySeatId, BaySession } from '../types';
import { CheckInScreen } from './CheckInScreen';
import { DiscussScreen } from './DiscussScreen';
import { StartScreen } from './StartScreen';
import { SummaryScreen } from './SummaryScreen';
import { VoteScreen } from './VoteScreen';

export function BayApp() {
  const [session, setSession] = useState<BaySession | null>(null);
  const [notes, setNotes] = useState('');

  if (!session) {
    return (
      <StartScreen
        onStart={(rounds, seed) => {
          setNotes('');
          setSession(createBaySession({ rounds, seed }));
        }}
      />
    );
  }
  if (session.phase === 'done') return <SummaryScreen session={session} onAgain={() => setSession(null)} />;
  if (session.phase === 'meeting') {
    return (
      <VoteScreen
        session={session}
        onCast={(choice) =>
          setSession((current) => (current ? castBallots(current, choice === null ? {} : { helm: choice }) : current))
        }
      />
    );
  }
  if (session.phase === 'discuss') {
    return (
      <DiscussScreen
        key={`${session.roundIndex}:${session.ejected.join(',')}`}
        session={session}
        notes={notes}
        onNotes={setNotes}
        onAdvance={() => setSession((current) => (current ? advance(current) : current))}
        onAccuse={(target: BaySeatId) =>
          setSession((current) => (current ? openAccusation(current, 'helm', target) : current))
        }
        onTakePending={() => setSession((current) => (current ? takePending(current) : current))}
      />
    );
  }
  return (
    <CheckInScreen
      session={session}
      onSubmit={(answer: BayAnswer) =>
        setSession((current) => (current ? submitHumans(current, { helm: answer }) : current))
      }
      onWatch={() => setSession((current) => (current ? resolveUnattended(current) : current))}
    />
  );
}
