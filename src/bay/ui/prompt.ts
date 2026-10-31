import type { BayAnswer, Puzzle, RoleView } from '../types';
import { truthAnswer } from '../fingerprint';
import { SEAT_NAME } from './format';

export type PromptFacts = { kind: Puzzle['kind']; lines: string[] };

const KIND_TITLE: Record<Puzzle['kind'], string> = {
  fact: 'Quick fact',
  number: 'Number sense',
  odd: 'Odd one out',
};

export function kindTitle(kind: Puzzle['kind']): string {
  return KIND_TITLE[kind];
}

export function promptFacts(puzzle: Puzzle): PromptFacts {
  if (puzzle.kind === 'fact') {
    return { kind: 'fact', lines: [puzzle.prompt, ...puzzle.options.map((option) => `${option.label} ${option.text}`)] };
  }
  if (puzzle.kind === 'number') {
    return {
      kind: 'number',
      lines: [puzzle.prompt, ...puzzle.options.map((option) => `${option.label} ${option.value}`)],
    };
  }
  return { kind: 'odd', lines: [puzzle.prompt, ...puzzle.options.map((option) => `${option.index} ${option.text}`)] };
}

export function formatSubmitted(puzzle: Puzzle, answer: BayAnswer): string {
  if (puzzle.kind === 'fact' && answer.kind === 'fact') {
    const option = puzzle.options.find((entry) => entry.label === answer.label);
    return option ? `${answer.label} · ${option.text}` : answer.label;
  }
  if (puzzle.kind === 'number' && answer.kind === 'number') {
    if ('value' in answer) return String(answer.value);
    const option = puzzle.options.find((entry) => entry.label === answer.label);
    return option ? String(option.value) : answer.label;
  }
  if (puzzle.kind === 'odd' && answer.kind === 'odd') {
    const option = puzzle.options.find((entry) => entry.index === answer.index);
    return option ? `${answer.index} · ${option.text}` : String(answer.index);
  }
  return 'Illegal';
}

export function formatTruth(puzzle: Puzzle): string {
  return formatSubmitted(puzzle, truthAnswer(puzzle));
}

export function roleBannerText(view: RoleView, ejected: boolean): string {
  if (ejected) {
    const side = view.role === 'saboteur' ? 'a saboteur' : 'crew';
    return `You are ${side}, and you have been ejected. You stay on the roster. You cannot check in or vote.`;
  }
  if (view.role === 'crew') {
    return 'You are crew. Three seats are saboteurs, and they know each other. You see only your own role.';
  }
  const partners = view.partners.map((seat) => SEAT_NAME[seat]).join(' and ');
  const plan = view.plan ?? 'not posted';
  const lean = view.lean === 'step' ? 'off-by-one' : 'wrong rule';
  const choice = view.plan === 'near-miss' && view.choice ? ` Submit ${view.choice}.` : '';
  return `You are a saboteur with ${partners}. Cell lean ${lean}. This round's plan for you: ${plan}.${choice} The other saboteurs follow the plan. You may ignore it.`;
}
