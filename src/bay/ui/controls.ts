export function discussControls(input: { roundIndex: number; helmLiving: boolean; pending: boolean }): {
  notes: true;
  advance: true;
  accuse: boolean;
  takePending: boolean;
} {
  const accuse = input.roundIndex >= 1 && input.helmLiving;
  return { notes: true, advance: true, accuse, takePending: accuse && input.pending };
}

export function checkInControls(helmLiving: boolean): { submit: boolean; accuse: false } {
  return { submit: helmLiving, accuse: false };
}
