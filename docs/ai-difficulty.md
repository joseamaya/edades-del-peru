# AI difficulty: findings and why it is not tuned by the AI-vs-AI mirror

The difficulty profiles (`easy`/`normal`/`hard`/`legendary`) are meant to be **predictably ordered**: a
stronger profile should win more. This note records an investigation into that ordering, the tools built, and
why a profile/mechanics tune does not achieve it. It exists so the next attempt starts from the evidence.

## The metric and its confounds

`yarn sim` plays headless AI-vs-AI matches and prints wins/losses/undecided. It is **deterministic per seed**
(see the `fix(sim)` change), but it is a poor difficulty yardstick:

- **Player-0 positional bias.** In a mirror, `normal` vs `normal` wins `4/2/2` — seat 0 has an edge, so every
  difficulty must be read against that reference, not against 50%.
- **Stalemate-prone.** Many games hit the time cap undecided (5-7 of 8), so few games decide and small changes
  flip them. The decisive sample is tiny.
- **Attacking is net-negative.** Marching into a defended base loses more than it gains (the attacker is shot
  while hitting a building; the defender reinforces at home), so the AI that commits least often does best.
  This is a **combat-model** property, not a profile property.

Because of the first two, a profile that is genuinely stronger can still measure worse. Use `--p1=` to measure a
difficulty in **both seats** (`--difficulty=D --p1=normal` and `--difficulty=normal --p1=D`, add the wins) to
cancel the seat bias; even then the decisive sample stays small.

## What was tried (and the result)

All measured on the deterministic harness, `--max=1500`, seeds 777-784.

| Change | `normal` | `easy` | `hard` | `legendary` |
|---|---|---|---|---|
| baseline | 4/0/4 | 0/2/6 | 1/4/3 | 0/3/5 |
| fixed attack cadence (drop `aggression`) | 4/0 | 0/1 | 0/4 | 0/2 |
| push at a large fraction of the army + home guard + no solo retreat | 4/0 | 2/0 | 0/3 | 0/2 |
| + houses scaled to the desired population | 4/0 | 0/1 | 1/5 | 0/4 |
| **houses scaled only** (final) | 4/2/2 | 0/1/7 | 1/5/2 | 0/4/4 |

None produced `easy < normal < hard < legendary`. Bisecciones on the `hard` profile showed that with `normal`'s
fields it measures like `normal`, so the effect is real (not pure noise) — but it tracks *which* field differs,
not "more is better". The `hard`/`legendary` profiles are **worse than `normal`**, and the win-rate does not
respond to the changes in a monotone way.

## Real bug found and fixed

`buildQueues` built houses up to a **flat** `3 + era`. The higher-difficulty profiles want more population
(`workerTarget + armyTarget` = 25-30) than that cap allows (~24), so `hard`/`legendary` were **stuck at the
population cap and could not field the army their profile asked for** — including for a human player. Fixed by
scaling the house count to `workerTarget + armyTarget + 4`. This is a correctness fix; it does **not** by itself
order the win-rate.

## Why this is not a profile tune

The perverse direction (higher difficulty measures weaker) comes from the combat model, not the profiles:
committing to an attack is a net loss, so profiles that mass and attack more lose more. Tuning
economy/army/timing/guard changes *how much* the AI commits, not *whether committing is good*. To make the
ordering monotone, the AI must be able to convert its (real) economic/army advantage into wins.

## Recommended next steps

1. **A player-side benchmark.** The difficulty a *human* feels is what matters; an AI-vs-AI mirror is a
   confounded proxy. Add a scripted "player" (a fixed sequence of orders that wins a skirmish) and measure each
   difficulty against it — this is the yardstick the AI should be tuned on.
2. **Attack-commitment AI strategy.** Make a committed assault viable and coordinated (attack as a group, keep
   a guard, fight the units that shoot you, retreat as a group), so a bigger economy/army actually wins. This
   is a design change with its own measurement, not a constant tweak.
3. Only if those are insufficient, revisit the **combat model** (defender advantage, building strength), which
   is out of scope for an AI-only pass.

## Tooling

`scripts/sim.mjs --p1=<difficulty>` sets player 1's profile so a difficulty can be measured in both seats.
