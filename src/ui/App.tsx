import { useState } from 'react';
import { createSession, nextRound, submitRound, type Session } from '../game/loop';
import type { HumanChoice } from '../game/types';
import { RoundScreen } from './RoundScreen';
import { StartScreen } from './StartScreen';
import { SummaryScreen } from './SummaryScreen';

export function App() {
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return (
      <StartScreen
        onStart={(rounds, seed) => {
          setSession(createSession({ rounds, seed }));
        }}
      />
    );
  }

  if (session.phase === 'done') {
    return <SummaryScreen session={session} onAgain={() => setSession(null)} />;
  }

  return (
    <RoundScreen
      key={session.roundIndex}
      session={session}
      onSubmit={(choice: HumanChoice) => setSession((current) => (current ? submitRound(current, choice) : current))}
      onNext={() => setSession((current) => (current ? nextRound(current) : current))}
    />
  );
}
