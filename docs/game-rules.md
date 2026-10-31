# Drift Protocol rules

Solo radio watch with one hidden saboteur. You and three AI seats share each round. Exactly one seat is the saboteur. The other three are crew.

A watch is 8, 9, 10, 11, or 12 rounds. The default is 10.

The signal loop (Relay, Edit, Drop, trust, rescue) is the task layer. It creates the behavioral evidence accusations use. There is no separate task minigame.

## Roles

The saboteur is drawn from the seed, on a stream that does not move the sea, so the same seed replays the same opening signal and the same saboteur.

- One saboteur among the four seats, chosen uniformly.
- If you are the saboteur, Skeptic, Pattern, and Explorer are all crew.
- If you are crew, exactly one AI is the saboteur.

You are told your own role at the start. Other roles stay hidden until the watch ends.

Ejecting the saboteur ends the watch immediately, so a vote that does **not** end the watch tells you the ejected seat was crew. The saboteur’s seat among whoever is left stays unnamed until the end.

## Seats and channels

| Seat | Honest policy | Keyword flip | Amplitude jitter |
| --- | --- | --- | --- |
| You | Human watch lead | 15% per tag | ±5 |
| Skeptic | Bayesian trust | 10% per tag | ±4 |
| Pattern | Moving average | 22% per tag | ±3 |
| Explorer | Epsilon-greedy bandit | 28% per tag | ±8 |

Jitter is an inclusive integer. A flipped keyword is replaced by a lexicon word that is not already in that packet.

Crew AIs play the honest policy below. A saboteur AI plays that same policy, then sometimes corrupts it (see Saboteur AI).

## Lexicon

`ice`, `current`, `depth`, `salinity`, `pressure`, `beacon`, `hull`, `battery`, `storm`, `drift`, `oxygen`, `thermal`, `sonar`, `cargo`, `crew`, `latitude`.

## Ground truth

Each packet is three keywords plus an integer amplitude.

- Round 1 draws three distinct lexicon words and an amplitude from 40 to 60.
- Later rounds keep the previous packet, then with probability 0.35 replace one keyword with a different lexicon word.
- Amplitude then moves by an integer from −4 to +4 and is clamped to 0–100.

The true packet is hidden until the round resolves.

## What you can do

Every living seat hears only its own noisy copy, then picks one action. Actions are simultaneous. AI seats do not see your choice for the current round.

- **Relay** emits the heard packet.
- **Edit** changes exactly one field. A keyword must be a lexicon word. An amplitude is rounded to an integer. The packet must actually change.
- **Drop** emits nothing.

Each living seat also assigns trust weights to the other living seats. Weights are normalized to sum to 1. If every weight is 0, trust is split evenly. Ejected seats are left out of the trust graph.

Ejected seats are still listed. They cannot transmit, cannot call a vote, and cannot vote. Their past accuracy is frozen.

## Accusations

Accusations open once round 1 is in the log. They stay available during later rounds, including in the middle of an open round. Each round allows one accusation.

Any living seat may call it and name one other living seat. That name starts the vote. It does not decide the outcome. Every living seat then votes for a living seat or skips.

A seat is ejected only when more than half of the living seats vote for them:

| Living seats | Votes required |
| --- | --- |
| 4 | 3 |
| 3 | 2 |
| 2 | 2 |

Skips and votes for someone already ejected do not count toward a target. Votes cast by ejected seats are ignored. A tie, or anything short of a majority, ejects nobody.

On a majority:

- The ejected seat is the saboteur: **crew wins** immediately.
- The ejected seat is crew, and at least one crew seat is still living: the watch continues. The saboteur is not named.
- The ejected seat was the last crew seat, so only the saboteur is living: **saboteur wins** immediately (crew eliminated).

## Win conditions

**Crew wins** if either:

- the saboteur is ejected, or
- the watch ends with rescue at or above **60%**.

The 60% ending is a rescue window. It counts for crew even when the saboteur was never ejected and is still aboard.

**Saboteur wins** if either:

- they were not ejected and rescue finishes **strictly below 50%**, or
- every crew seat has been ejected.

**Stalemate** if the saboteur was not ejected and rescue finishes from **50%** up to but not including **60%**. Neither side takes the watch.

## Saboteur AI

Round 1 is always the honest policy, so the seat has a clean baseline.

After that, each round rolls once:

- below 0.62: play the honest policy
- from 0.62 up to but not including 0.90: **Edit** in a way that leaves the heard packet. Half the time the amplitude moves by 10–16. Otherwise one keyword is replaced with a lexicon word that is not in the packet
- 0.90 and above: **Drop**

Trust weights still come from the honest policy, then are normalized over living peers. The human saboteur is not forced to corrupt. The role banner only tells them that a quiet edit or a rare drop pulls rescue down.

## Crew and saboteur votes

Suspicion for a living seat is the average, over rounds they were on the watch, of how far their emission sat from the other living emissions that round. A drop scores 1. A sent packet scores `1 - similarity` against the consensus of the other present packets. An ejected seat is omitted from that round, so silence after ejection is not a drop.

A crew seat votes for the other living seat with the highest suspicion when that score is at least 0.55. Otherwise they skip. They do not vote for themselves.

A saboteur AI copies that crew vote, except with probability 0.08 they vote for themselves.

If any crew AI would name someone, the earliest seat in Skeptic, Pattern, Explorer order calls that accusation. If none would, the saboteur AI calls with probability 0.12 and names the other living seat with the highest suspicion, but only when that score is at least 0.35. They never name themselves. You can answer that call, call your own, or skip it and take the next signal.

## Similarity

For two packets:

- Keyword score is the multiset overlap divided by 3. Order does not matter.
- Value score is `1 - min(1, |a - b| / 25)`.
- Similarity is the average of those two scores.

## Consistency

Take the emitted packets of seats **still on the watch** (drops are missing, ejected seats are not in the list).

- Fewer than two emissions scores 0.
- Otherwise, average the pairwise similarities, then multiply by coverage (`emissions / living seats`).

Four identical packets and nobody ejected scores 1. Two identical packets and two drops, with four seats still living, scores 0.5. After an ejection the denominator is the living count, not 4.

## Reliability

A seat’s accuracy is the mean similarity between its emissions and the true packet. Drops are left out of that average. Before a seat has emitted anything, its prior is 0.5. Trust is scored against this record as it stood at the start of the round. Ejection freezes the record.

## Trust alignment

For each living seat, compare its normalized weights to the other living seats’ reliabilities, also normalized to sum to 1.

Alignment for that seat is `1 - 0.5 * L1`. A perfect match scores 1. Putting all trust on one seat while the record is flat scores 1/3 when three peers are living. The round’s alignment is the average across the living seats.

## Rescue probability

The watch starts at 42%.

```
quality = 0.7 * consistency + 0.3 * alignment
delta   = (quality - 0.55) * 0.12
rescue  = clamp(rescue + delta, 2%, 98%)
```

A neutral round (quality 0.55) does not move the meter.

## Skeptic

Maintains a Beta prior on You, Pattern, and Explorer, starting at Beta(2, 2). Trust is proportional to `α / (α + β)`.

Consensus uses the last three rounds of those peers’ emissions, weighted by current trust. Keyword votes break ties alphabetically. With no history, Skeptic relays.

- Amplitude at least 12 away from the consensus and at least two keywords outside the consensus set: **Drop**.
- Else amplitude at least 6 away: **Edit** the value to the rounded consensus.
- Else the first keyword outside the set: **Edit** it to the strongest consensus keyword that is not already in the packet.
- Else **Relay**.

After the round, each peer still on the watch is scored against Skeptic’s own emission. If Skeptic dropped, the reference is the consensus of everyone else who emitted. An ejected peer is skipped, not treated as a drop.

- Similarity ≥ 0.75: `α += 1`
- Similarity ≤ 0.45: `β += 1`
- Otherwise both move by 0.25
- A drop: `β += 0.5`

## Pattern

Remembers its own observations. It relays until it has three of them.

The moving average uses the last five amplitudes. A value is anomalous when it sits more than 8 away from that average. A keyword is anomalous when it has never appeared in those past packets.

- Two or more anomalies (the value counts as one): **Drop**.
- Only the value: **Edit** it to the rounded moving average.
- Only one keyword: **Edit** it to the lexicon word, not already in the packet, with the strongest co-occurrence against the other two tags. Ties break alphabetically.
- Otherwise **Relay**.

Co-occurrence counts unordered keyword pairs inside past packets.

Trust in another seat is the mean similarity between that seat’s past emissions and Pattern’s own emissions. Until there is data, the prior is 0.5. Weights are then normalized over living peers.

## Explorer

Context key:

- `cold` until Explorer has two past amplitudes; otherwise `near` when the current value is within 8 of the five-value average, else `far`.
- `novel` when at least two current keywords are unseen, else `known`.

Arms are Relay, Edit, and Drop. With probability 0.2, Explorer picks an arm at random. Otherwise it takes the highest average reward for this context. Ties prefer Relay, then Edit, then Drop. Unseen arms have reward 0.

An Edit pulls the amplitude to the rounded average when the value is far. Otherwise it replaces the first unseen keyword (or the first slot) with the most frequent lexicon word that is not already in the packet. Frequency ties break alphabetically, so a cold packet’s first tag becomes `battery` when nothing has been counted yet.

Reward, after the round:

- If Explorer emitted and anyone else did, reward is similarity to the consensus of the other emissions.
- If Explorer dropped and anyone else emitted, reward is 0.75 when its own observation was less than 0.5 similar to that consensus, otherwise 0.25.
- If nobody else emitted, reward is 0.5.

The arm’s value is an incremental mean of those rewards. Trust uses the same emission-fit idea as Pattern. When Explorer dropped, peers are compared with the other seats’ consensus instead.
