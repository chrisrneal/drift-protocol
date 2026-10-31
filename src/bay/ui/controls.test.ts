import { describe, expect, it } from 'vitest';
import { checkInControls, discussControls } from './controls';

describe('bay controls', () => {
  it('closes ballots on round 1 and during check-in', () => {
    expect(discussControls({ roundIndex: 0, helmLiving: true, pending: true })).toEqual({
      notes: true,
      advance: true,
      accuse: false,
      takePending: false,
    });
    expect(checkInControls(true)).toEqual({ submit: true, accuse: false });
    expect(checkInControls(false)).toEqual({ submit: false, accuse: false });
  });

  it('opens an accusation from round 2 only for a living Helm, and takes a nomination only when one is waiting', () => {
    expect(discussControls({ roundIndex: 1, helmLiving: true, pending: false })).toEqual({
      notes: true,
      advance: true,
      accuse: true,
      takePending: false,
    });
    expect(discussControls({ roundIndex: 1, helmLiving: true, pending: true }).takePending).toBe(true);
    expect(discussControls({ roundIndex: 5, helmLiving: false, pending: true })).toEqual({
      notes: true,
      advance: true,
      accuse: false,
      takePending: false,
    });
  });
});
