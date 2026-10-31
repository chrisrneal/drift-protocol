import { CHECKIN_STREAM_MASK, VOTE_STREAM_MASK } from './constants';

export function checkInStreamStart(seed: number): number {
  return (seed ^ CHECKIN_STREAM_MASK) >>> 0;
}

export function voteStreamStart(seed: number): number {
  return (seed ^ VOTE_STREAM_MASK) >>> 0;
}
