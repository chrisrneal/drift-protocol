import { describe, expect, it } from 'vitest';
import { NOTES_MAX } from './constants';
import { clampNotes } from './notes';

describe('clampNotes', () => {
  it('leaves a short scratchpad unchanged and cuts at 2000 characters', () => {
    expect(clampNotes('board looks split')).toBe('board looks split');
    expect(clampNotes('a'.repeat(NOTES_MAX + 1))).toBe('a'.repeat(NOTES_MAX));
    expect(clampNotes('a'.repeat(NOTES_MAX)).length).toBe(2000);
  });
});
