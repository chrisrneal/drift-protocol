import { NOTES_MAX } from './constants';

export function clampNotes(text: string): string {
  return text.slice(0, NOTES_MAX);
}
