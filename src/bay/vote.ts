export function majorityEject<Seat extends string>(
  votes: readonly { voter: Seat; choice: Seat | 'skip' }[],
  living: readonly Seat[],
): Seat | null {
  if (living.length === 0) return null;
  const eligible = new Set(living);
  const counts = new Map<Seat, number>();
  for (const vote of votes) {
    if (!eligible.has(vote.voter)) continue;
    if (vote.choice === 'skip' || !eligible.has(vote.choice)) continue;
    counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
  }
  const needed = Math.floor(living.length / 2) + 1;
  let chosen: Seat | null = null;
  for (const [seat, count] of counts) {
    if (count >= needed) {
      if (chosen) return null;
      chosen = seat;
    }
  }
  return chosen;
}
