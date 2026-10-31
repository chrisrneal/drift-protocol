import { describe, expect, it } from 'vitest';
import { livingSeats } from './roles';
import { RESCUE_FAIL, RESCUE_WIN } from './constants';
import { createSession, nextRound, openMeeting, playWithoutHuman, resolveMeeting, submitRound } from './loop';
import { SEATS, type SeatId } from './types';

const trust = { skeptic: 1, pattern: 1, explorer: 1 };

function relay(seed: number, rounds = 8) {
  return submitRound(createSession({ rounds, seed }), { kind: 'relay', trust });
}

function sessionWithHumanRole(role: 'crew' | 'saboteur') {
  for (let seed = 0; seed < 40; seed += 1) {
    const session = createSession({ rounds: 8, seed });
    if ((session.saboteur === 'you') === (role === 'saboteur')) return session;
  }
  throw new Error(`No seed made the human ${role}.`);
}

describe('session roles', () => {
  it('assigns the seeded saboteur at the start of the watch', () => {
    const session = createSession({ rounds: 10, seed: 42 });
    const again = createSession({ rounds: 10, seed: 42 });
    expect(session.saboteur).toBe(again.saboteur);
    expect(session.roles[session.saboteur]).toBe('saboteur');
    expect(SEATS.filter((seat) => session.roles[seat] === 'saboteur')).toEqual([session.saboteur]);
    expect(session.ejected).toEqual([]);
    expect(session.winner).toBeNull();
  });
});

describe('accusations in a watch', () => {
  it('rejects an accusation during round 1', () => {
    const session = createSession({ rounds: 8, seed: 2 });
    expect(() => openMeeting(session, 'you', 'skeptic')).toThrow(/round 1/i);
  });

  it('ends the watch for the crew when the saboteur is ejected', () => {
    let session = relay(4);
    const saboteur = session.saboteur;
    session = openMeeting(session, 'you', saboteur);
    session = resolveMeeting(
      session,
      livingSeats(session.ejected).map((voter) => ({ voter, choice: saboteur })),
    );
    expect(session.phase).toBe('done');
    expect(session.winner).toBe('crew');
    expect(session.winReason).toBe('saboteur-ejected');
    expect(session.ejected).toContain(saboteur);
  });

  it('keeps going after a crew ejection and still hides the saboteur behind the win state', () => {
    let session = relay(5);
    const crew = SEATS.find((seat) => seat !== session.saboteur) as SeatId;
    session = openMeeting(session, crew === 'you' ? 'skeptic' : 'you', crew);
    session = resolveMeeting(
      session,
      livingSeats(session.ejected).map((voter) => ({ voter, choice: crew })),
    );
    expect(session.winner).toBeNull();
    expect(session.phase).toBe('resolved');
    expect(session.ejected).toEqual([crew]);
    expect(session.roles[session.saboteur]).toBe('saboteur');
  });

  it('does not count a vote from an ejected seat', () => {
    let session = relay(6);
    const crew = SEATS.find((seat) => seat !== session.saboteur && seat !== 'you') as SeatId;
    session = openMeeting(session, 'you', crew);
    session = resolveMeeting(
      session,
      livingSeats(session.ejected).map((voter) => ({ voter, choice: crew })),
    );
    session = nextRound(session);
    const ejectedSeat = crew;
    const living = livingSeats(session.ejected);
    const target = living.find((seat) => seat !== 'you') as SeatId;
    session = openMeeting(session, 'you', target);
    session = resolveMeeting(session, [
      ...living.map((voter) => ({ voter, choice: voter === 'you' ? target : ('skip' as const) })),
      { voter: ejectedSeat, choice: target },
    ]);
    expect(session.ejected).toEqual([ejectedSeat]);
    expect(session.phase).toBe('play');
    expect(session.winner).toBeNull();
  });

  it('refuses a transmission from an ejected human and lets the watch continue without them', () => {
    let session = sessionWithHumanRole('crew');
    session = submitRound(session, { kind: 'relay', trust });
    session = openMeeting(session, 'skeptic', 'you');
    session = resolveMeeting(
      session,
      livingSeats(session.ejected).map((voter) => ({ voter, choice: 'you' as const })),
    );
    expect(session.ejected).toContain('you');
    expect(() => submitRound(session, { kind: 'relay', trust })).toThrow(/cannot act/i);
    session = nextRound(session);
    expect(() => submitRound(session, { kind: 'drop', trust })).toThrow(/cannot act/i);
    session = playWithoutHuman(session);
    expect(session.phase).toBe('resolved');
    expect(session.resolution?.emissions.you).toBeNull();
    expect(session.resolution?.outOfPlay).toContain('you');
    expect(session.resolution?.decisions.skeptic.kind).toMatch(/relay|edit|drop/);
  });

  it('gives the saboteur the win once every crew seat is ejected', () => {
    let session = sessionWithHumanRole('saboteur');
    session = submitRound(session, { kind: 'relay', trust });
    for (const crew of ['skeptic', 'pattern', 'explorer'] as const) {
      const caller = livingSeats(session.ejected).find((seat) => seat !== crew) as SeatId;
      session = openMeeting(session, caller, crew);
      session = resolveMeeting(
        session,
        livingSeats(session.ejected).map((voter) => ({ voter, choice: crew })),
      );
      if (session.phase === 'play') session = submitRound(session, { kind: 'relay', trust });
      if (session.phase === 'resolved') session = nextRound(session);
    }
    expect(session.phase).toBe('done');
    expect(session.winner).toBe('saboteur');
    expect(session.winReason).toBe('crew-eliminated');
    expect(livingSeats(session.ejected)).toEqual(['you']);
  });
});

describe('watch verdict', () => {
  it('closes on the rescue lines when the saboteur was never ejected', () => {
    let session = createSession({ rounds: 8, seed: 11 });
    for (let round = 0; round < 8; round += 1) {
      session = submitRound(session, { kind: 'relay', trust });
      session = nextRound(session);
    }
    expect(session.phase).toBe('done');
    expect(session.ejected).not.toContain(session.saboteur);
    if (session.rescue >= RESCUE_WIN) expect(session.winner).toBe('crew');
    else if (session.rescue < RESCUE_FAIL) expect(session.winner).toBe('saboteur');
    else expect(session.winner).toBe('draw');
  });
});
