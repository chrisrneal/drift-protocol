import { describe, expect, it } from 'vitest';
import { truthAnswer } from './fingerprint';
import {
  ejectionAnnouncement,
  majorityEject,
  openAccusation,
  resolveMeeting,
  takePending,
  verdictAfterRemoval,
} from './meeting';
import { livingSeats } from './roles';
import { advance, createBaySession, revealCheckIn } from './session';
import type { BayAnswer, BayBallot, BaySeatId, BaySession } from './types';

function truthMap(session: BaySession): Partial<Record<BaySeatId, BayAnswer>> {
  const answers: Partial<Record<BaySeatId, BayAnswer>> = {};
  for (const seat of livingSeats(session.ejected)) answers[seat] = truthAnswer(session.puzzle);
  return answers;
}

function discussRound2(): BaySession {
  const opened = createBaySession({ rounds: 8, seed: 42 });
  return advance(revealCheckIn(opened, truthMap(opened)));
}

function ballots(living: readonly BaySeatId[], choiceFor: (seat: BaySeatId) => BaySeatId | 'skip'): BayBallot[] {
  return living.map((voter) => ({ voter, choice: choiceFor(voter) }));
}

describe('majorityEject', () => {
  it('uses the 8-down-to-2 table', () => {
    const eight = ['helm', 'sonar', 'radio', 'nav', 'plant', 'deck', 'medic', 'cargo'] as const;
    expect(Math.floor(8 / 2) + 1).toBe(5);
    expect(Math.floor(7 / 2) + 1).toBe(4);
    expect(Math.floor(6 / 2) + 1).toBe(4);
    expect(Math.floor(5 / 2) + 1).toBe(3);
    expect(Math.floor(4 / 2) + 1).toBe(3);
    expect(Math.floor(3 / 2) + 1).toBe(2);
    expect(Math.floor(2 / 2) + 1).toBe(2);
    const four = ballots(eight, (seat) => (seat === 'helm' || seat === 'sonar' || seat === 'plant' || seat === 'medic' ? 'radio' : 'skip'));
    expect(majorityEject(four, eight)).toBeNull();
    const five = ballots(eight, (seat) => (seat === 'deck' || seat === 'nav' || seat === 'cargo' ? 'skip' : 'radio'));
    expect(majorityEject(five, eight)).toBe('radio');
    const withoutRadio = eight.filter((seat) => seat !== 'radio');
    const ignored = [
      ...ballots(withoutRadio, (seat) => (seat === 'helm' || seat === 'sonar' || seat === 'plant' ? 'sonar' : 'skip')),
      { voter: 'radio' as const, choice: 'sonar' as const },
    ];
    expect(majorityEject(ignored, withoutRadio)).toBeNull();
  });
});

describe('accusations', () => {
  it('opens and resolves a meeting from round 1 discuss', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    let session = revealCheckIn(opened, truthMap(opened));
    expect(session.roundIndex).toBe(0);
    session = openAccusation(session, 'helm', 'sonar');
    expect(session.phase).toBe('meeting');
    const votes = ballots(livingSeats(session.ejected), () => 'skip');
    session = resolveMeeting(session, votes);
    expect(session.meetings).toHaveLength(1);
    expect(session.meetings[0].roundIndex).toBe(0);
    expect(session.roundIndex).toBe(1);
  });

  it('rejects ballots during check-in and when no nomination is waiting', () => {
    const opened = createBaySession({ rounds: 8, seed: 42 });
    expect(() => openAccusation(opened, 'helm', 'sonar')).toThrow(/Ballots open from discuss/);
    const round1 = revealCheckIn(opened, truthMap(opened));
    expect(() => takePending(round1)).toThrow(/No nomination is waiting/);
  });

  it('spends a failed accusation without publishing a role', () => {
    let session = revealCheckIn(discussRound2(), truthMap(discussRound2()));
    session = openAccusation(session, 'helm', 'sonar');
    const living = livingSeats(session.ejected);
    const votes = ballots(living, (seat) => (seat === 'helm' || seat === 'plant' || seat === 'medic' || seat === 'cargo' ? 'sonar' : 'skip'));
    session = resolveMeeting(session, votes);
    expect(session.meetings).toHaveLength(1);
    expect(session.meetings[0].ejected).toBeNull();
    expect(session.meetings[0].ejectedRole).toBeNull();
    expect(ejectionAnnouncement(session.meetings[0], 'Sonar')).toBe('No majority. Nobody left the watch.');
    expect(session.phase).toBe('check-in');
    expect(session.roundIndex).toBe(2);
    expect(session.winner).toBeNull();
  });

  it('continues after one saboteur leaves and hides that role', () => {
    let session = revealCheckIn(discussRound2(), truthMap(discussRound2()));
    session = openAccusation(session, 'helm', 'radio');
    const living = livingSeats(session.ejected);
    session = resolveMeeting(session, ballots(living, () => 'radio'));
    expect(session.winner).toBeNull();
    expect(session.meetings[0].ejected).toBe('radio');
    expect(session.meetings[0].ejectedRole).toBeNull();
    expect(ejectionAnnouncement(session.meetings[0], 'Radio')).toBe('Radio was ejected.');
    expect(ejectionAnnouncement(session.meetings[0], 'Radio')).not.toMatch(/crew|saboteur/i);
    expect(session.ejected).toEqual(['radio']);
    expect(session.phase).toBe('check-in');
    const smuggled = { ...truthMap(session), radio: truthAnswer(session.puzzle) };
    expect(() => revealCheckIn(session, smuggled)).toThrow(/Ejected seats cannot check in/);
    const revealed = revealCheckIn(session, truthMap(session));
    expect(revealed.log[revealed.log.length - 1].rows.find((row) => row.seat === 'radio')).toEqual({
      seat: 'radio',
      absent: true,
    });
  });

  it('ends for the crew when the last saboteur is ejected', () => {
    const roles = createBaySession({ rounds: 8, seed: 42 }).cell.roles;
    expect(verdictAfterRemoval(roles, ['helm', 'sonar', 'plant', 'medic', 'cargo'])).toEqual({
      winner: 'crew',
      reason: 'saboteurs-ejected',
    });
    expect(verdictAfterRemoval(roles, ['helm', 'radio'])).toBeNull();
    expect(verdictAfterRemoval(roles, ['radio', 'nav', 'deck'])).toEqual({
      winner: 'saboteur',
      reason: 'crew-eliminated',
    });
  });
});
