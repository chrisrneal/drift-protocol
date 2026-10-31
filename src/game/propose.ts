import { ballotsFor, evidenceFromRounds, suggestAiMeeting, suspicionScores } from '../ai/accuse';
import { meetingRng, type Session } from './loop';
import { livingSeats } from './roles';
import type { SeatId } from './types';
import { accusationsOpen, type VoteBallot, type VoteChoice } from './vote';

export function proposeAiAccusation(session: Session): { caller: SeatId; nominated: SeatId } | null {
  const living = livingSeats(session.ejected);
  return suggestAiMeeting({
    open: accusationsOpen({
      phase: session.phase,
      logLength: session.log.length,
      meetingsThisRound: session.meetings.filter((meeting) => meeting.roundIndex === session.roundIndex).length,
      livingCount: living.length,
    }),
    roles: session.roles,
    living,
    scores: suspicionScores(evidenceFromRounds(session.log), living),
    rng: meetingRng(session.seed, session.roundIndex, 1),
  });
}

export function ballotsFromHuman(session: Session, humanVote: VoteChoice | null): VoteBallot[] {
  const living = livingSeats(session.ejected);
  return ballotsFor({
    living,
    roles: session.roles,
    scores: suspicionScores(evidenceFromRounds(session.log), living),
    humanVote,
    rng: meetingRng(session.seed, session.roundIndex, 2),
  });
}
