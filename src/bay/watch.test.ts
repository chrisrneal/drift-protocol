import { describe, expect, it } from 'vitest';
import { blatantAnswers, signedNearAnswer, truthAnswer } from './fingerprint';
import { openAccusation, resolveMeeting, castBallots } from './meeting';
import { livingSeats } from './roles';
import { advance, createBaySession, replayKey, submitHumans } from './session';
import type { BayAnswer, BayBallot, BaySeatId, BaySession } from './types';

function playMeter(seed: number, helm: (session: BaySession) => BayAnswer, rounds = 10): BaySession {
  let session = createBaySession({ rounds, seed });
  while (session.phase !== 'done') {
    if (session.phase === 'check-in') session = submitHumans(session, { helm: helm(session) });
    else if (session.phase === 'discuss') session = advance(session);
    else throw new Error(`Unexpected phase ${session.phase}.`);
  }
  return session;
}

function voteOff(session: BaySession, caller: BaySeatId, target: BaySeatId): BaySession {
  const opened = openAccusation(session, caller, target);
  const votes: BayBallot[] = livingSeats(opened.ejected).map((voter) => ({ voter, choice: target }));
  return resolveMeeting(opened, votes);
}

describe('full watches', () => {
  it('reaches the crew integrity window, the stalemate band, and the saboteur hold', () => {
    const crew = playMeter(0, (session) => truthAnswer(session.puzzle));
    expect(crew.integrity).toBe(8200);
    expect(crew.winner).toBe('crew');
    expect(crew.winReason).toBe('integrity-window');
    expect(crew.ejected).toEqual([]);
    expect(crew.log.map((record) => record.delta)).toEqual([400, 400, 400, 400, 400, 400, 400, 400, 400, 400]);

    const stalemate = playMeter(14, (session) => truthAnswer(session.puzzle));
    expect(stalemate.integrity).toBe(6700);
    expect(stalemate.winner).toBe('draw');
    expect(stalemate.winReason).toBe('stalemate');
    expect(stalemate.log.map((record) => record.delta)).toEqual([-350, 400, 400, -350, 400, 400, 400, 400, 400, 400]);

    const held = playMeter(23, (session) => signedNearAnswer(session.puzzle, session.cell.sign));
    expect(held.integrity).toBe(5200);
    expect(held.winner).toBe('saboteur');
    expect(held.winReason).toBe('integrity-held');
    expect(held.log.map((record) => record.delta)).toEqual([-350, -350, 400, 400, 400, -350, 400, 400, 400, -350]);
  });

  it('ejects all three saboteurs and publishes a role only on the ending vote', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = advance(submitHumans(session, { helm: truthAnswer(session.puzzle) }));
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'radio');
    expect(session.winner).toBeNull();
    expect(session.meetings[0].ejectedRole).toBeNull();
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'nav');
    expect(session.meetings[1].ejectedRole).toBeNull();
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', 'deck');
    expect(session.phase).toBe('done');
    expect(session.roundIndex).toBe(3);
    expect(session.winner).toBe('crew');
    expect(session.winReason).toBe('saboteurs-ejected');
    expect(session.meetings[2].ejected).toBe('deck');
    expect(session.meetings[2].ejectedRole).toBe('saboteur');
  });

  it('ejects every crew seat, with Helm removed by another caller', () => {
    let session = createBaySession({ rounds: 8, seed: 42 });
    session = advance(submitHumans(session, { helm: truthAnswer(session.puzzle) }));
    for (const target of ['sonar', 'plant', 'medic', 'cargo'] as const) {
      session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'helm', target);
      expect(session.winner).toBeNull();
      expect(session.meetings[session.meetings.length - 1].ejectedRole).toBeNull();
    }
    session = voteOff(submitHumans(session, { helm: truthAnswer(session.puzzle) }), 'radio', 'helm');
    expect(session.phase).toBe('done');
    expect(session.winner).toBe('saboteur');
    expect(session.winReason).toBe('crew-eliminated');
    expect(session.meetings[session.meetings.length - 1].ejectedRole).toBe('crew');
  });

  it('replays a seed and treats a skipped vote as a different vote stream', () => {
    const again = replayKey(playMeter(42, (session) => truthAnswer(session.puzzle), 8));
    expect(replayKey(playMeter(42, (session) => truthAnswer(session.puzzle), 8))).toEqual(again);
    const changed = playMeter(
      42,
      (session) => {
        if (session.roundIndex === 0) {
          const blatant = blatantAnswers(session.puzzle)[0];
          if (!blatant) throw new Error('Missing blatant answer.');
          return blatant;
        }
        return truthAnswer(session.puzzle);
      },
      8,
    );
    expect(changed.log[0]).not.toEqual(again.log[0]);

    function toSecondDiscuss(): BaySession {
      let session = createBaySession({ rounds: 8, seed: 42 });
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      session = advance(session);
      session = submitHumans(session, { helm: truthAnswer(session.puzzle) });
      return session;
    }
    const skipped = advance(toSecondDiscuss());
    let voted = toSecondDiscuss();
    voted = openAccusation(voted, 'helm', 'sonar');
    voted = castBallots(voted, { helm: 'skip' });
    expect(skipped.log).toEqual(voted.log);
    expect(skipped.voteState).not.toBe(voted.voteState);
  });
});
