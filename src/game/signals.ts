import { CHANNELS, DRIFT_CHANCE, DRIFT_SPAN, LEXICON, TRUTH_VALUE_MAX, TRUTH_VALUE_MIN } from './constants';
import { clamp, intBetween, rngStep } from './rng';
import type { Packet, SeatId } from './types';
import { SEATS } from './types';

function drawDistinctWord(state: number, blocked: readonly string[]): { word: string; state: number } {
  let s = state;
  let word: string = LEXICON[0];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const roll = intBetween(s, 0, LEXICON.length - 1);
    s = roll.state;
    word = LEXICON[roll.value];
    if (!blocked.includes(word)) return { word, state: s };
  }
  const fallback = LEXICON.find((entry) => !blocked.includes(entry)) ?? word;
  return { word: fallback, state: s };
}

export function drawTruth(state: number, previous: Packet | null): { packet: Packet; state: number } {
  if (!previous) {
    let s = state;
    const keywords: string[] = [];
    while (keywords.length < 3) {
      const drawn = drawDistinctWord(s, keywords);
      s = drawn.state;
      keywords.push(drawn.word);
    }
    const valueRoll = intBetween(s, 40, 60);
    return {
      packet: { keywords: [keywords[0], keywords[1], keywords[2]], value: valueRoll.value },
      state: valueRoll.state,
    };
  }

  let s = state;
  const keywords: [string, string, string] = [...previous.keywords];
  const drift = rngStep(s);
  s = drift.state;
  if (drift.value < DRIFT_CHANCE) {
    const indexRoll = intBetween(s, 0, 2);
    s = indexRoll.state;
    const replacement = drawDistinctWord(s, keywords);
    s = replacement.state;
    keywords[indexRoll.value] = replacement.word;
  }
  const delta = intBetween(s, -DRIFT_SPAN, DRIFT_SPAN);
  return {
    packet: {
      keywords,
      value: clamp(previous.value + delta.value, TRUTH_VALUE_MIN, TRUTH_VALUE_MAX),
    },
    state: delta.state,
  };
}

export function drawObservation(
  state: number,
  truth: Packet,
  seat: SeatId,
): { packet: Packet; state: number } {
  const channel = CHANNELS[seat];
  let s = state;
  const keywords: [string, string, string] = [...truth.keywords];
  for (let index = 0; index < 3; index += 1) {
    const flip = rngStep(s);
    s = flip.state;
    if (flip.value < channel.flip) {
      const replacement = drawDistinctWord(s, keywords);
      s = replacement.state;
      keywords[index] = replacement.word;
    }
  }
  const jitter = intBetween(s, -channel.jitter, channel.jitter);
  return { packet: { keywords, value: truth.value + jitter.value }, state: jitter.state };
}

export function openRound(
  state: number,
  previous: Packet | null,
): { state: number; truth: Packet; observations: Record<SeatId, Packet> } {
  const truthDraw = drawTruth(state, previous);
  let s = truthDraw.state;
  const observations = {} as Record<SeatId, Packet>;
  for (const seat of SEATS) {
    const seen = drawObservation(s, truthDraw.packet, seat);
    s = seen.state;
    observations[seat] = seen.packet;
  }
  return { state: s, truth: truthDraw.packet, observations };
}
