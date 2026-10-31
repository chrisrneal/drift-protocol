import { useState } from 'react';
import {
  createSession,
  nextRound,
  openMeeting,
  playWithoutHuman,
  resolveMeeting,
  submitRound,
  type Session,
} from '../game/loop';
import { proposeAiAccusation } from '../game/propose';
import { livingSeats } from '../game/roles';
import type { HumanChoice, SeatId } from '../game/types';
import { accusationsOpen, type VoteBallot } from '../game/vote';
import { MeetingScreen } from './MeetingScreen';
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

  if (session.phase === 'meeting') {
    return (
      <MeetingScreen
        session={session}
        onResolve={(votes: VoteBallot[]) => setSession((current) => (current ? resolveMeeting(current, votes) : current))}
      />
    );
  }

  if (session.phase === 'done') {
    return <SummaryScreen session={session} onAgain={() => setSession(null)} />;
  }

  const living = livingSeats(session.ejected);
  const canAccuse =
    accusationsOpen({
      phase: session.phase,
      logLength: session.log.length,
      meetingsThisRound: session.meetings.filter((meeting) => meeting.roundIndex === session.roundIndex).length,
      livingCount: living.length,
    }) && !session.ejected.includes('you');

  return (
    <RoundScreen
      key={`${session.roundIndex}:${session.ejected.join(',')}:${session.phase}`}
      session={session}
      canAccuse={canAccuse}
      aiCall={proposeAiAccusation(session)}
      onSubmit={(choice: HumanChoice) => setSession((current) => (current ? submitRound(current, choice) : current))}
      onNext={() => setSession((current) => (current ? nextRound(current) : current))}
      onAccuse={(target: SeatId) => setSession((current) => (current ? openMeeting(current, 'you', target) : current))}
      onAnswerCall={(caller, nominated) =>
        setSession((current) => (current ? openMeeting(current, caller, nominated) : current))
      }
      onWatch={() => setSession((current) => (current ? playWithoutHuman(current) : current))}
    />
  );
}
