# Drift Protocol rules

Solo radio watch. One human seat and three AI seats share each round. There is no hidden traitor. Seats differ only in channel noise and in how they decide.

A watch is 8, 9, 10, 11, or 12 rounds. The default is 10.

## Seats and channels

| Seat | Role | Keyword flip | Amplitude jitter |
| --- | --- | --- | --- |
| You | Human watch lead | 15% per tag | ±5 |
| Skeptic | Bayesian trust | 10% per tag | ±4 |
| Pattern | Moving average | 22% per tag | ±3 |
| Explorer | Epsilon-greedy bandit | 28% per tag | ±8 |

Jitter is an inclusive integer. A flipped keyword is replaced by a lexicon word that is not already in that packet.

## Lexicon

`ice`, `current`, `depth`, `salinity`, `pressure`, `beacon`, `hull`, `battery`, `storm`, `drift`, `oxygen`, `thermal`, `sonar`, `cargo`, `crew`, `latitude`.

## Ground truth

Each packet is three keywords plus an integer amplitude.

- Round 1 draws three distinct lexicon words and an amplitude from 40 to 60.
- Later rounds keep the previous packet, then with probability 0.35 replace one keyword with a different lexicon word.
- Amplitude then moves by an integer from −4 to +4 and is clamped to 0–100.

The true packet is hidden until the round resolves.

## What you can do

Every seat hears only its own noisy copy, then picks one action. Actions are simultaneous. AI seats do not see your choice for the current round.

- **Relay** emits the heard packet.
- **Edit** changes exactly one field. A keyword must be a lexicon word. An amplitude is rounded to an integer. The packet must actually change.
- **Drop** emits nothing.

Each seat also assigns trust weights to the other three seats. Weights are normalized to sum to 1. If every weight is 0, trust is split evenly.

## Similarity

For two packets:

- Keyword score is the multiset overlap divided by 3. Order does not matter.
- Value score is `1 - min(1, |a - b| / 25)`.
- Similarity is the average of those two scores.

## Consistency

Take the emitted packets (drops are missing).

- Fewer than two emissions scores 0.
- Otherwise, average the pairwise similarities, then multiply by coverage (`emissions / 4`).

Four identical packets score 1. Two identical packets and two drops score 0.5.

## Reliability

A seat’s accuracy is the mean similarity between its emissions and the true packet. Drops are left out of that average. Before a seat has emitted anything, its prior is 0.5. Trust is scored against this record as it stood at the start of the round.

## Trust alignment

For each seat, compare its normalized weights to the other seats’ reliabilities, also normalized to sum to 1.

Alignment for that seat is `1 - 0.5 * L1`. A perfect match scores 1. Putting all trust on one seat while the record is flat scores 1/3. The round’s alignment is the average across the four seats.

## Rescue probability

The watch starts at 42%.

```
quality = 0.7 * consistency + 0.3 * alignment
delta   = (quality - 0.55) * 0.12
rescue  = clamp(rescue + delta, 2%, 98%)
```

A neutral round (quality 0.55) does not move the meter. The watch is a rescue if the final probability is at least 60%.

## Skeptic

Maintains a Beta prior on You, Pattern, and Explorer, starting at Beta(2, 2). Trust is proportional to `α / (α + β)`.

Consensus uses the last three rounds of those peers’ emissions, weighted by current trust. Keyword votes break ties alphabetically. With no history, Skeptic relays.

- Amplitude at least 12 away from the consensus and at least two keywords outside the consensus set: **Drop**.
- Else amplitude at least 6 away: **Edit** the value to the rounded consensus.
- Else the first keyword outside the set: **Edit** it to the strongest consensus keyword that is not already in the packet.
- Else **Relay**.

After the round, each peer is scored against Skeptic’s own emission. If Skeptic dropped, the reference is the consensus of everyone else who emitted.

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

Trust in another seat is the mean similarity between that seat’s past emissions and Pattern’s own emissions. Until there is data, the prior is 0.5. Weights are then normalized.

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
