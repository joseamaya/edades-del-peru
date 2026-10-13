# Development notes

Deep reference for working on Edades del Perú: subsystem details, hard-won code
traps and the debug harness. For the short orientation see [`AGENTS.md`](../AGENTS.md);
for player-facing docs see [`README.md`](../README.md).

## Architecture

- Entry: `index.html` -> `src/main.ts` -> `src/core/Game.ts` (hub wiring render, entities, AI/pathfinding/fog,
  campaign, HUD and audio).
- **Temporal model**: `Era` (0-5) is the internal **tech level** (stats/models); `HistoricalPeriod` (0-9, in
  `src/model/defs/periods.ts`) is the **historical period** of the match. Matches are **locked by period** (no
  anachronistic modernization): `settings.period` fixes `startingEra` and disables era advancement (HUD and AI).
- Data is driven by defs in `src/model/defs/{periods,eras,civs,units,buildings,techs}.ts`; models are generated
  procedurally in `src/model/ProceduralModel.ts` (no external assets).
- **PBR terrain textures (AI-generated)**: `src/assets/textures/terrain/{slot}_{diffuse|normal|roughness}.webp`
  (slots `sand/dirt/grass/rock/snow`), loaded by `src/rendering/Biomes.ts` via `import.meta.glob`. The terrain
  shader uses normal+roughness+specular when present and **falls back to the procedural material** if missing
  (offline). Generated with `scripts/gen_textures.py` (Cloudflare Workers AI, credentials in
  `scripts/.cloudflare.json`, gitignored) + `scripts/post_textures.py` (tiling/normal/roughness). See
  `PROVENANCE.md`.
- **Coetaneous civilizations**: `civs.ts` gives each civ `periods` and `geography`; `civsForPeriod(period)`
  filters valid rivals.
- **Civilization bonuses are real modifiers**: `CivDef.effects` (`CivEffects`) is seeded into `PlayerState.bonus`
  at match start and flows through the same paths as techs (`Game.applyPlayerBonuses`, `training`, `population`).
  `bonuses` is the player-facing text. Known simplification: effects apply globally (e.g. Moche's "infantry
  attack" is a general attack bonus), not per unit category, and a few flavor bullets with no mechanic yet
  (naval units, cheaper houses, building HP) are not modeled. Add effects for any new civ (tested in `defs.test.ts`).
- **Damage & armor (`src/game/combat.ts`)**: the attacker's `damageType` (`light`/`heavy`/`fortified`) selects the
  defender's armor — units use `lightArmor` vs `light` and `heavyArmor` vs `heavy`/`fortified`, and buildings use
  their single `armor` for every attack type — and the civilization/tech `armor` bonus then reduces the remainder
  as a fraction (`0.1` = -10%, capped at 80%). Damage never drops below 1. `computeDamage` is pure and unit-tested
  in `tests/combat.test.ts`; `Game.resolveDamage` calls it — melee passes `stats.damageType`, and projectile spawns
  carry it through `spawnProjectile` into `applyProjectileDamage`. The `Unit.armorMultiplier` field keeps its name
  and save shape but now stores `1 + reduction` (no `SAVE_VERSION` bump), so `saveTypes` is unchanged.
- **Maps by geography**: `MapType = 'coast' | 'andes' | 'altiplano' | 'jungle'` (generated in `Terrain.generate`).
- `src/campaign/defs/campaign.ts` defines the 9 historical campaigns; `src/campaign/Mission.ts` evaluates
  objectives/triggers.
- **Educational layer**: `src/campaign/defs/educational.ts` (prologue + context/«¿Sabías que…?»/sources per mission,
  derived from `docs/historia/`), `src/campaign/Tutorial.ts` (step-by-step guided tutorial, only on missions with
  `tutorial: true` and gated by `settings.showHints`) and `src/ui/Codex.ts` (codex that bundles the real
  `docs/historia/**/*.md` via `import.meta.glob(..., { query: '?raw' })`). Each mission declares `period` to
  resolve dates/coetaneous civs.
- `src/game/Economy.ts` centralizes worker assignment (used by player and AI).
- **Chronology of units**: `UnitArchetype.minPeriod` (`src/model/defs/units.ts`) is the earliest historical
  period a unit is plausible in (default Arcaico). `tests/history.test.ts` forbids any campaign — including
  scripted waves/reinforcements — from spawning a unit before its `minPeriod` (no firearms, horses, vehicles
  or engines before 1532). Normal production is gated independently by `eraModel` + `requiresTech` (e.g.
  `cavalry` has no model before Viceroyalty and needs the `shock_cavalry` tech), so `minPeriod` governs the
  scripted content that those gates do not cover.
- **Chronology/culture of techs**: `TechDef.minPeriod` / `maxPeriod` (`src/model/defs/techs.ts`) is the
  historical window a technology belongs to (like `UnitArchetype.minPeriod`, plus an optional ceiling).
  `techAvailable(tech, period)` is enforced centrally in `Building.queueTech` (like the unit guard) plus the HUD
  research panel and the AI, so a tech never appears for the wrong civilization or period (e.g. Inca *chasquis*
  no longer leak into the Republic, colonial *obrajes* not before 1532). Windows are sourced in
  [`docs/historia/tecnologias.md`](./historia/tecnologias.md).
- **AI (`src/game/AI.ts`)**: macromanagement (workers, build plan, tech, waves) plus `defendEconomy`
  (recalls idle military when an enemy nears any AI building/worker), `microCombat` retreat of badly wounded
  units and `explore` (idle scouts patrol toward the enemy base). It only uses the same systems as the player
  (`issueOrder`, `combatStance`) — **never a hidden resource/production bonus**. Difficulty is split in two:
  `DIFFICULTY_MULT` (Config) tunes the decision cadence (`reaction`) and attack frequency (`aggression`), and
  `src/game/aiProfiles.ts` decides *strategy* — economy/army size, attack threshold, tech eagerness
  (`techReserve`; only `easy` holds back), retreat threshold, raiding and advanced military. A profile only
  invests in non-essential buildings (institute/factory/fortress) once it has its core army (`armyBase`), so a
  bigger economy becomes military strength instead of building sprawl. Known limitation: the AI ignores fog of
  war (it reads all entities), because fog is currently visual only (`isVisibleTo` is `() => true`); making it
  LOS-aware is a later milestone. The army is trained to an era-based **mix** (`ARMY_MIX`) nudged to counter the
  enemy's composition (`armyWeights`). `Game.addAI(playerId, difficulty?)` attaches an AI to any player, so
  `yarn sim [--difficulty=…]` runs **AI-vs-AI** headless matches (seeds, winner, peak armies); `--difficulty`
  sets player 0's profile while player 1 stays on `normal`, so a run measures that profile against `normal`.
  Baseline on the default seed set (`--max=1500`, player-0 wins / losses / undecided): `easy` 0/1/7,
  `normal` 5/1/2, `hard` 2/2/4, `legendary` 2/3/3 — `easy` is clearly weakest; both AIs share the same micro,
  so these counts are noisy (±1-2 games). The winner typically fields 6-12 units; before the build-plan fix the
  AI often stalled at 0 wood and fielded no army at all.
  Between `normal`/`hard`/`legendary` the attack **threshold** is the same — they differ by army size, economy
  and the `aggression` attack cadence. Economy: `chooseResourceNode` counts farm workers as food and the build
  plan prioritizes dropsites (sawmill/mill) before pop/farms, so the AI no longer starves for wood. Until the
  **barracks** exists the plan is restricted to essentials (sawmill/mill/barracks): otherwise the AI spends every
  10 wood on a farm or house and never saves the 120 a barracks needs, so it fields no army for many minutes.
  Aggression: `launchAttack` sends the **whole** army to destroy enemy **buildings** (center first). `microCombat`
  **focus-fires** (non-siege units converge on the enemy nearest the army's centre) and **siege** units bombard
  buildings from range — only self-defending against units that come close — instead of chasing them. It also
  presses nearby buildings, raids workers (on `hard`+), and, when the enemy has **no soldiers left**, marches on
  the base so a won match doesn't stall on leftover buildings. Training is chronology-guarded (`unitMinPeriod` in
  `Building.queueUnit`, the AI candidate filter and the HUD).
- **UI/inputs in `src/core/Game.ts` and `src/ui/HUD.ts`**: left click selects / drag = box-select (rectangle
  `#ed-selbox`) · right click = order (**right button no longer pans**; panning is by screen edges, WASD/arrows,
  middle wheel, or dragging the **bottom-left minimap**). Minimap: drag = move viewport, right click = order
  (`Game.commandMoveToWorld`). Optional camera rotation with Q/E (`settings.rotateCamera`, off = fixed camera).
  Control groups (Ctrl/Alt+1-9 assign, 1-9 recall, Shift+1-9 add). Hover tooltip (`computeHover`) and
  **contextual cursor** (`hoverAction`). Damage icons/numbers (`src/ui/DamageNumbers.ts`), clickable alerts that
  pulse on the minimap (`pushAlert` + `alert` event), and order markers (`src/entities/OrderMarker.ts`).
- **Construction (RTS standard)**: placing a building **requires selected workers** (`Game.startPlacement` warns
  if none). Only those workers build: `commitPlacement` emits `issueOrder(BUILD, clear=true)` (the order
  **interrupts** their current task) and **keeps the selection**. Do not reintroduce auto-assignment of builders:
  with every worker gathering, none were ever free and builds stayed at 0%. The build gate is
  `Game.canBuildKind` (era per period; the **Huaca Sagrada** depends on the victory mode, not the era, so
  wonder victory is reachable in any period).
- **Victory/defeat (conquest)**: a player is defeated only when **no building of theirs remains** (`Game.hasBuildings`),
  in both skirmish (`Game.checkVictory`) and campaign (`Mission.checkBaseLost`). Do not go back to "losing the
  Plaza Mayor ends the match": a full base with army must survive the loss of its center.
- **External reference**: [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT) is used only as
  technique inspiration (damage numbers, instancing, culling); its code is neither sold nor copied.
- Import Three addons as `three/addons/...` (not `three/examples/jsm/...`).
- Persistence in `localStorage`: `peru-settings` and `peru-campaign`.

## Code traps (learned the hard way)

- **Pathfinding to a blocked goal** (`Pathfinder.pathfind`): a destination inside an obstacle (your own
  building, a resource node) is not traversable. `nearestWalkable` alone is not enough — it can return an
  isolated walkable pocket and A* then fails, silently dropping move-to-building orders. `pathfind` now accepts
  any cell within `GOAL_PROXIMITY` of the original goal cell. Keep that when touching goal handling.
  A move order must still cope with an empty route from a blocked **start** cell: `Unit.updateMove` (used by
  MOVE and, on an empty path, ATTACK_MOVE) only completes within `MOVE_ARRIVAL_DIST` of the target and otherwise
  re-paths or heads straight for it, so a unit never finishes its order and freezes far from the destination.
- **Model geometries and textures are shared/cached** (`sharedGeo`, `bakedGeoCache`, `texCloneCache` in
  `ProceduralModel.ts`). `disposeModel()` only frees materials; **do not** dispose geometries/textures by hand nor
  reuse them by mutating `repeat`. To clear everything use `clearModelCaches()`.
- **`UnitContext` is a single shared instance** created in the constructor (`Game.unitContext`). Do not rebuild it
  per entity/frame.
- **The unit spatial hash is rebuilt once per frame** (`Game.rebuildSpatial`). If you move units after that point,
  `unitsNear`/`enemiesNear` can be stale.
- **Game speed is applied only in `GameLoop`** (fixed step). Do not multiply `dt` by `speed` again in `Game.update`.
- `ResourceNode.subtract()` is idempotent and depleted nodes are removed; do not decrement `amount` by hand.
- **Ground picking**: `Game.screenToWorld` must refine against the heightfield (`Terrain.getHeight`) by fixed-point
  iteration (starting from the `y=0` plane); using only the plane makes the order marker and the placement ghost
  appear **offset** on elevated terrain (error grows with slope).
- **The water plane must align with the terrain**: the terrain occupies `0..size` (not centered on the origin), so
  `Water.mesh.position` goes at `(size/2, waterLevel, size/2)`; the shader discards water over land (`discard`
  using the heightmap). Do not change this without checking map flooding.
- **Default camera `zoom ≈ 34`** (not 62): at 62 units are tiny and impossible to select.
- **Classic look by default**: no atmospheric fog (`scene.fog = null`), no SSAO/bloom/vignette -> sharp and
  saturated (classic RTS style). `settings.cinematic` (toggle in Options) re-enables the set via
  `PostFX.setCinematic`. Tone `NeutralToneMapping` + `exposure 1.0`. Do not re-enable fog or raise exposure
  without checking that buildings are not washed out.
- **The terrain shader samples the shadow map in VSM format by hand** (`Terrain.ts`): do not change
  `renderer.shadowMap.type` or the `customProgramCacheKey`, or terrain shadows break.
- **Terrain faces must point up**: in `Terrain.buildMesh` the indices go `(a,c,b)` and `(b,c,d)` (not `(a,b,c)`).
  Inverting the winding makes faces point down: backface culling hides the terrain and the sky dome appears as if
  it were the ground. Verify with a vertical `Raycaster` that hits the terrain.
- **Fog of war is integrated into the terrain shader** (`Terrain.setFow` + `Fow.texture`), not as a separate mesh:
  that keeps it glued to the relief. `Fow` only keeps the grid and the texture.
- **Construction opacity** (`Building.setConstructionOpacity`): when fading you must store the materials that were
  opaque and restore them to `transparent=false, opacity=1` when done. A guard like
  `if (mat.transparent === false)` makes the restore a no-op and leaves **all** buildings semi-transparent
  forever. Do not touch windows/glass/glow (already transparent by design).
- **Contextual cursor** (`Game.hoverAction` + `HUD.setCursor`): the icon is an emoji drawn in a div (`#ed-cursor`)
  that **hides the native cursor**. Do not return `'➡️'` for move (it always points the same way); return `null`
  and let the destination marker (`OrderMarkers`) indicate the point. Hover resolves **once per frame**:
  `onMouseMove` schedules `Game.flushHover` (rAF) which calls `pickScene` once and feeds both the tooltip and the
  icon (do not re-pick inside `computeHover`/`hoverAction`).
- **Picking is one proxy per entity** (`EntityView.pickProxy`): an invisible box the size of the model, tagged
  `userData.owner` (the `EntityView` owner argument is required). `Game.pickEntity` raycasts the flat proxy list
  non-recursively and resolves the entity in O(1); it does **not** walk the real meshes (~80 per unit). The proxy
  is built in the model's local frame, so anything that swaps a view (`Building.modernize`, `Game.modernizeUnits`)
  must pass the entity as the owner so the new proxy is re-tagged and not offset.
- **Models are built once, cloned per instance** (`buildModel`): a template is cached by
  `type|scale|barrel|era|civ`; `bakeVertexAO` bakes each part's **colour × AO into vertex colours** and
  `mergeStaticParts` merges each container's static parts **by material** (pivots stay separate so animation
  works); the instance is a `clone()` with **per-instance materials**. `mat()` keys only on the PBR params/texture
  (colour is in the vertex colours), so parts that differ only by colour share one material and merge; box UV
  repeat is baked into the geometry. Model materials are `vertexColors: true`, so every mesh must carry a `color`
  attribute (`bakeVertexAO` writes it) — a mesh without one renders black. Because geometry is shared, anything that mutates a model material per
  instance (construction fade, placement ghost tint, carry colour) is safe **only** because materials are cloned
  per instance — do not switch to shared materials without copy-on-write, and skip invisible meshes (e.g. the
  shared `pickMaterial` on `EntityView.pickProxy`) when traversing a view to tint/fade. The placement ghost
  turns vertex colours back off (`buildModelForGhost`) so its tint stays a flat silhouette.
- **Save/load** (`src/game/SaveGame.ts` + `saveTypes.ts`): a versioned JSON snapshot in
  `localStorage['peru-save']`. `Game.saveMatch()` writes it (pause menu → **Guardar partida**); `?load=1` boots a
  `Game` in load mode (the `snapshot` constructor arg skips the default spawns and applies it; the main menu shows
  **Continuar partida** when a save exists). `toSave()/applySave()` live on
  `Unit`/`Building`/`ResourceNode` (and `Mission`/`Tutorial`), so a new world-affecting field must be added there
  **and** to `saveTypes.ts`; ids are preserved with `EntityView.reserveIds`, the RNG with `RNG.getState/setState`,
  and the fog grid with `Fow.serialize/restore`. In load mode the mission briefing is skipped and its state
  (objectives/triggers/timer) is restored. Bump `SAVE_VERSION` on a breaking shape change (adding optional
  fields is fine). The AI is rebuilt fresh and projectiles are not saved.
- **Determinism & replays** (`src/game/replay.ts`): the simulation is deterministic — map/AI/spawns use the seeded
  `RNG`, the loop runs fixed 60 Hz steps, and `Math.random` is only used for cosmetics. A replay records the
  match **settings** (seed, civs, period, difficulty, victory mode) plus the player's **commands** stamped with
  the simulation step; `ReplayPlayer` feeds them back at the same steps, so re-running the seed reproduces the
  match (`Game.stateHash()` proves it). All player intent funnels through `Game.executeCommand(cmd)` — the single
  apply+record seam; route new player actions through it or they won't be captured (live input is ignored during
  playback). Skirmish matches are recorded automatically; the replay is saved to `localStorage['peru-replay']` on
  match end (or when leaving a match) and played with `?replay=1` (main menu → **Ver última repetición**). Bump
  `REPLAY_VERSION` when the command schema or the simulation changes in a breaking way.
- **Trees by instancing** (`src/rendering/TreeInstances.ts`): `InstancedMesh` of trunk + canopies per variant;
  picking is by `instanceId` (`TreeInstances.raycast` -> `pickResource`), visibility by `ResourceNode.setVisibleEx`
  (fog+LOD) and falling on chop by `startFall`. If you add a tree without registering it in the manager, it will
  not render.
- `Game.destroy()` + `clearModelCaches()` + `clearResourceCaches()` + `clearTextureCache()` release a match; call
  `destroy()` if you recreate the game without reloading the page.

## Debugging / automation

- `src/main.ts` exposes `window.game` (and `window.THREE`) for the console and scripts.
- The app shows the **main menu by default**; enter the match directly with `?play=1` or any debug param.
  `resetGame()` reloads with `?play=1`.
- URL params: `?play=1`, `?menu=0/1`, `?load=1`, `?replay=1`, `?seed=`, `?fog=0`, `?low=1`, `?speed=`, `?era=N`,
  `?period=N`, `?mission=ID`, `?noloop=1` (do not auto-start the loop; tests drive fixed steps from step 0).
- Shared `scripts/lib.mjs` (`launchChromium`, `withViteServer`, `readPng`, `classify`). Scripts launch Vite on a
  free port and Chromium with SwiftShader; they use `CHROME_PATH` or `chromium.executablePath()`. Run captures
  with `?low=1`.
- `review/` holds generated PNG/JSON (gitignored); do not edit them by hand.

## Performance benchmarks

`yarn bench [--units=100,300,500,1000] [--seed=777]` boots a match in Chromium
(SwiftShader) and, per scale, spawns N soldiers and measures: spawn/destroy time, simulation step time
(`Game.update`), heap delta during the sim loop, A* per call, target acquisition (`enemiesNear`) and
hover-picking (`pickAt`), then — with the loop running and `window.__directRender` on (bypasses
post-processing so `renderer.info` is meaningful) — FPS, frame time (avg/p95), long tasks and real scene
draw calls/triangles. It writes `review/bench.json` and prints a table.

Numbers are only comparable **on the same machine/browser** — treat them as relative signals, not targets.
Reference run (this repo, 2-core container, `CHROME_PATH` SwiftShader, `?low=1`, seed 777):

| units | spawn ms | sim ms/step | heap Δ/loop MB | A* ms/call | target µs/call | pick ms/call | frame ms (avg/p95) | draw calls | triangles | heap MB |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 38 | 0.6 | ~6 | 0.11 | 1.3 | 0.05 | ~611/908 | ~3.9k | 2.8M | 53 |
| 300 | 69 | 0.8 | ~12 | 0.10 | 0.8 | 0.12 | ~906/1314 | ~10.8k | 7.4M | 70 |
| 500 | 99 | 1.0 | ~8 | 0.09 | 1.0 | 0.16 | ~937/1654 | ~17.3k | 11.7M | 91 |
| 1000 | 190 | 1.7 | ~20 | 0.09 | 1.0 | 0.27 | ~1488/2557 | ~34k | 22.8M | 115 |

Reading: the **simulation, pathfinding, target acquisition and picking are cheap** (≈0.6–1.7 ms/step up to 1000
units, well under the 16.6 ms budget; A* is ~0.1 ms and independent of unit count — that column is a map sample,
not a scaling result; hover-picking is ~0.3 ms/call at 1000 after moving to one pick proxy per entity and a single
resolve per frame). Draw calls at 1000 fell from the original **~81k baseline to ~34k** (‑58%; the previous
merge step was ~56k, so this step is ‑39%), by merging each model's static parts by material and baking part
colours into vertex colours. ~34 per unit remains (the shadow pass roughly doubles them, and units still have
no instancing) — reaching ~15-20 needs **instancing** (or collapsing per-part PBR params), which is not done.
Frame time is dominated by the software renderer, so use draw calls as the actionable signal.
