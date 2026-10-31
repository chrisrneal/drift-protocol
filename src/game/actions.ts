import { LEXICON, type LexiconWord } from './constants';
import type { Decision, Packet } from './types';

export function clonePacket(packet: Packet): Packet {
  return { keywords: [...packet.keywords] as [string, string, string], value: packet.value };
}

export function packetsEqual(a: Packet, b: Packet): boolean {
  return a.value === b.value && a.keywords.every((word, index) => word === b.keywords[index]);
}

export function applyDecision(packet: Packet, decision: Pick<Decision, 'kind' | 'edit'>): Packet | null {
  if (decision.kind === 'drop') return null;
  if (decision.kind === 'relay') return clonePacket(packet);
  if (!decision.edit) throw new Error('Edit requires one field.');

  const next = clonePacket(packet);
  if (decision.edit.field === 'value') {
    if (!Number.isFinite(decision.edit.next)) throw new Error('Value must be a finite number.');
    next.value = Math.round(decision.edit.next);
    return next;
  }

  if (!(LEXICON as readonly string[]).includes(decision.edit.next)) {
    throw new Error('Keyword must come from the lexicon.');
  }
  const keywords = [...next.keywords] as [string, string, string];
  keywords[decision.edit.index] = decision.edit.next as LexiconWord;
  next.keywords = keywords;
  return next;
}
