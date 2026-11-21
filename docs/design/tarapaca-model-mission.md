# Tarapacá 1879 — model mission

**Mission:** `m_tarapaca` · **Campaign:** La República · **Period:** Republic (1879) ·
**Status:** implemented and covered by real-order specs; pending a human no-cheat playtest.

## Historical problem

After the naval campaign, the Peruvian army held Tarapacá without cavalry or artillery. Three Chilean
columns attacked the village and the quebrada in echelon; Pachica sent reinforcements and the Peruvians
captured guns. It was a tactical victory that did not save the province: the army retreated 200 km to
Arica. Sources and certainty: [`docs/historia/campanas/tarapaca.md`](../historia/campanas/tarapaca.md).

## Acts

1. **Hold the village.** Six units hold Tarapacá for 45 s while the first Chilean column (five men) marches in
   from the east at 20 s. The army starts in the village with no workers, no base and no economy.
2. **Take the heights.** The second column (eight men) holds the quebrada heights; the objective only counts
   once the crest is cleared and occupied. The Pachica column (four republican defenders) joins at the
   village when the act opens, and the optional Pachica link is a real march east that brings four more.
3. **Hold the heights and withdraw.** A 60 s hold receives two captured artillery pieces while the third
   column (ten men, including a gun) counter-attacks, then the player marches north to the Arica road. The
   epilogue states that the province is lost and the army retreats.

## Battle contract

- `start.playerBase: false`, `start.enemyBase: false` and `start.openingUnits: false`: neither side gets a
  generic centre, houses, fields, four workers or a scout. The player roster is the authored garrison.
- `enemy.economy: false` and `enemy.attacks: false`: the AI still perceives, micros and defends, but it
  never builds a town, trains or launches its own attacks. The three columns are authored waves.
- A scripted enemy (`attacks: false`) presses any reachable enemy within 20 m instead of freezing at the
  edge of its firing envelope; the authored wave keeps the offensive after its attack-move ends.
- Every wave declares a `spawn` far from its `pos` (the objective) and a `target`; nothing materialises on
  the position the player must hold. The first column enters east of the village at 20 s, the second from
  the north when Act II opens, and the third from the south-east when the heights are taken.
- `a2_alturas` is `reach` + `clearEnemies`: arriving with a Chilean still inside the 30 m clear radius does not
  take the height (the reach radius is 20 m). The old `reach` completed on arrival while ten Chileans stood on the crest.
- Zero economy is deliberate: this is a single-day battle, not a founding scenario. The HUD shows the
  garrison and its military orders only.
- Buendía is the army's overall commander in the briefing (`commanderNotes`), not a unit on the field;
  Cáceres is the protected field commander, posted behind the line (`commanderRoles` overrides his card
  from La Breña to Tarapacá).

## Combat and engagement

- Acquisition and fire use one envelope: a ranged unit fires up to `range × 1.15` and looks for enemies
  with a 4 m margin, plus the enemy's own reach (bounded by the 6 m response radius), so a unit parked at the
  edge of its reach is still answered — and a 9 m sling answers an archer that opens fire from 11 m. Before
  this fix the defenders looked only 13.2 m while the Chileans fired from 16 m and the line died without
  returning fire.
- A unit that takes damage remembers the shooter for six seconds and returns fire from a bounded response
  radius, even outside its defensive leash; after the fight it walks back to its post.
- An `attack_move` engages at `nominal range + 2` (its historic distance) so a march still reaches its
  destination; the player's defensive stance uses the wider envelope for idle fire.
- The village footprint is walkable (`tarapaca_site.blockers: []`); the old 14 × 10 m blocker stopped the
  Chilean waves at ~19 m, outside both sides' reach, and the battle froze.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22. The battle opens in the village,
  not at a rear base.
- `tarapaca_site` hides the Arica GLB and draws a procedural adobe village, a low trench/parapet on the
  heights and the Pachica hamlet (`tarapaca-village`, `tarapaca-heights`, `tarapaca-pachica`); no borrowed
  Arica building appears on the mesa and Pachica is no longer a label over empty ground.
- The village is the opening frame; its plaza is walkable because the site has no navigation blocker (the
  old 14 × 10 m footprint turned the village into an island the columns could not enter). The chapel uses an
  earth roof, not an intense terracotta tile that broke the adobe palette. The old rear base at Pachica is
  gone: Pachica is east along the quebrada (a real march, outside the 10 m link radius), and the Arica road
  is north (`-z`).
- `tarapaca_site` uses the mission-scoped `atacama` palette; the vegetation override removes the coastal
  broadleaf trees and keeps a trace of scrub/gravel, so the quebrada reads as desert rather than green
  coast. `resources.scatter: 0` stops the scatter pass, whose old `?? 'tree'` fallback planted ~65 lush
  trees on an all-zero resource profile. The minimap derives its bands from the same palette instead of a
  hard-coded green, so the desert reads ochre on both views.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- No workers and no construction: the roster is eight republican defenders, three riflemen, four soldiers
  and Cáceres. The captured artillery arrives as a scripted reinforcement after the heights.
- Two captured artillery pieces arrive after Act II; four defenders arrive from Pachica when Act II opens,
  and the optional Pachica link adds four more.
- Cáceres is a protected field commander with a battle marker, posted at the rear of the village; Buendía
  is briefing-only. The first column is five men, the second eight and the third ten: Act I leaves the
  player a field army, and the Pachica reinforcement makes the heights winnable with ordinary orders.

## Opening and closing

- Three beats: the quebrada, the echelon attack, the tactical victory and retreat.
- Briefing art `media/tarapaca/intro-quebrada.webp`; act cards `intro-alturas` and `intro-retirada`;
  epilogue `intro-epilogo`. Regenerated after the Atacama pass with
  `node scripts/capture_republica_arc.mjs --mission=m_tarapaca`; the old art still showed a green field.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Battle contract: `tests/tarapaca.test.ts` (no base/economy, wave spawn distance, `clearEnemies`, Pachica
  landmark, Atacama palette, commander role).
- Force contract: `tests/campaign-forces.test.ts` (a base-less party skips the generic opening crew).
- Combat: `tests/combat-engagement.test.ts` (defensive and aggressive fire, melee sight picks, retaliation,
  no out-of-reach chase, attack-move engagement).
- Headless battle: `tests/tarapaca-battle.test.ts` (roster, first column trades fire instead of killing for
  free, Cáceres posted at the rear, no resource nodes, no AI town).
- Contest: `tests/mission.test.ts` (a `clearEnemies` reach stays active while a defender holds the radius).
- Minimap: `tests/minimap-palette.test.ts` (the Atacama bands are ochre, not green).
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/tarapaca.spec.ts` stands the line with no orders until the column engages, then
  holds the village with move orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts` (a battle scene measures the command panel
  with a unit; no injected worker).
- Visual evidence (seed 777, HUD on): `yarn shot tarapaca-opening --url='/?mission=m_tarapaca&seed=777&fog=0&low=1&intro=0' --click --wait=55000`,
  `tarapaca-heights --target=160,120 --height=38`, `tarapaca-pachica --target=198,150 --height=34` and
  `tarapaca-briefing --wait=6000` after the same URL. The opening shot shows the exchange (13/16 and
  “Unidad bajo ataque”), not a silent stand-off.
- Intro art: `node scripts/capture_republica_arc.mjs --mission=m_tarapaca` rewrites the four
  `public/media/tarapaca/intro-*.webp` images from the current desert scene.
- Real-command full path: `tests/e2e/release-playtest.spec.ts` (nightly slow tier). The opening row is in
  `yarn bench:check`.
- Open: human no-cheat playtest.
