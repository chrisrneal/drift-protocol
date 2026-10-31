import { finishRound } from './session';
import { livingSeats } from './roles';
import { fillBallots } from './nominate';
import { suspicionScores } from './suspicion';
import type { BayBallot, BaySeatId, BaySession, MeetingRecord, Role } from './types';
import { majorityEject } from './vote';

export { majorityEject } from './vote';

export function verdictAfterRemoval(
  roles: Record<BaySeatId, Role>,
  livingAfter: readonly BaySeatId[],
): { winner: 'crew' | 'saboteur'; reason: 'saboteurs-ejected' | 'crew-eliminated' } | null {
  const saboteursLeft = livingAfter.filter((seat) => roles[seat] === 'saboteur').length;
  const crewLeft = livingAfter.filter((seat) => roles[seat] === 'crew').length;
  if (saboteursLeft === 0) return { winner: 'crew', reason: 'saboteurs-ejected' };
  if (crewLeft === 0) return { winner: 'saboteur', reason: 'crew-eliminated' };
  return null;
}

export function ejectionAnnouncement(record: MeetingRecord, seatName: string): string {
  if (!record.ejected) return 'No majority. Nobody left the watch.';
  if (record.ejectedRole) return `${seatName} was ejected. The watch is over.`;
  return `${seatName} was ejected.`;
}

export function openAccusation(session: BaySession, caller: BaySeatId, nominated: BaySeatId): BaySession {
  if (session.phase !== 'discuss') throw new Error('Ballots open from discuss.');
  if (session.roundIndex < 1) throw new Error('Accusations open in the discuss phase of round 2.');
  const living = livingSeats(session.ejected);
  if (living.length < 2) throw new Error('Not enough seats to vote.');
  if (!living.includes(caller)) throw new Error('Ejected seats cannot call a vote.');
  if (!living.includes(nominated)) throw new Error('That seat is already off the watch.');
  if (caller === nominated) throw new Error('Name a different seat.');
  if (session.meetings.some((meeting) => meeting.roundIndex === session.roundIndex)) {
    throw new Error('This round already spent its accusation.');
  }
  return { ...session, phase: 'meeting', meeting: { caller, nominated } };
}

export function takePending(session: BaySession): BaySession {
  if (!session.pendingCall) throw new Error('No nomination is waiting.');
  return openAccusation(session, session.pendingCall.caller, session.pendingCall.nominated);
}

export function resolveMeeting(session: BaySession, votes: readonly BayBallot[]): BaySession {
  if (session.phase !== 'meeting' || !session.meeting) throw new Error('No accusation is open.');
  const living = livingSeats(session.ejected);
  const cast = new Map<BaySeatId, BayBallot['choice']>();
  for (const vote of votes) {
    if (!living.includes(vote.voter)) continue;
    cast.set(vote.voter, vote.choice);
  }
  for (const seat of living) {
    if (!cast.has(seat)) throw new Error('Every living seat must vote.');
  }
  const ballots: BayBallot[] = living.map((voter) => ({ voter, choice: cast.get(voter) ?? 'skip' }));
  const ejectedSeat = majorityEject(ballots, living);
  const base: MeetingRecord = {
    roundIndex: session.roundIndex,
    caller: session.meeting.caller,
    nominated: session.meeting.nominated,
    votes: ballots,
    ejected: ejectedSeat,
    ejectedRole: null,
  };
  if (!ejectedSeat) return finishRound({ ...session, meetings: [...session.meetings, base] });
  const ejected = [...session.ejected, ejectedSeat];
  const verdict = verdictAfterRemoval(session.cell.roles, livingSeats(ejected));
  const record: MeetingRecord = {
    ...base,
    ejectedRole: verdict ? session.cell.roles[ejectedSeat] : null,
  };
  if (verdict) {
    return {
      ...session,
      phase: 'done',
      ejected,
      meeting: null,
      meetings: [...session.meetings, record],
      winner: verdict.winner,
      winReason: verdict.reason,
    };
  }
  return finishRound({ ...session, ejected, meetings: [...session.meetings, record] });
}

export function castBallots(
  session: BaySession,
  humanVotes: Partial<Record<BaySeatId, BaySeatId | 'skip'>>,
): BaySession {
  if (session.phase !== 'meeting' || !session.meeting) throw new Error('No accusation is open.');
  const filled = fillBallots({
    voteState: session.voteState,
    living: livingSeats(session.ejected),
    controllers: session.controllers,
    roles: session.cell.roles,
    suspicion: suspicionScores(session.log),
    humanVotes,
  });
  return resolveMeeting({ ...session, voteState: filled.voteState }, filled.ballots);
}
