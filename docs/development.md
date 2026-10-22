# Development notes

Deep reference for working on Edades del Perú: subsystem details, hard-won code
traps and the debug harness. For the short orientation see [`AGENTS.md`](../AGENTS.md);
for player-facing docs see [`README.md`](../README.md); for art direction see
[`docs/design/visual-language.md`](./design/visual-language.md); for the PRP
Definition of Done and the building audit see
[`docs/design/prp-status.md`](./design/prp-status.md).

## Architecture

- Entry: `index.html` -> `src/main.ts` -> `src/core/Game.ts` (hub wiring render, entities, AI/pathfinding/fog,
  campaign, HUD and audio).
- **Temporal model**: `Era` (0-5) is the internal **tech level** (stats/models); `HistoricalPeriod` (0-9, in
  `src/model/defs/periods.ts`) is the **historical period** of the match. Matches are **locked by period** (no
  anachronistic modernization): `settings.period` fixes `startingEra` and disables era advancement (HUD and AI).
- Data is driven by defs in `src/model/defs/{periods,eras,civs,units,buildings,techs}.ts`; models are generated
  procedurally in `src/model/ProceduralModel.ts`. A local glTF/GLB pipeline can override a unit's presentation
  (see **Rigged 3D models** below); the procedural model remains the fallback during the progressive migration.
- **PBR terrain & material textures (AI-generated)**: `src/assets/textures/{terrain,materials}/{slot}_{diffuse|normal|roughness}.webp`
  (terrain slots `sand/dirt/grass/rock/snow`; material/building/textile slots — `wall_*`, `roof_*`, `textile_*`,
  `wood`, `adobe`, `tile`, `clay`, `mud` — loaded by `src/model/ProceduralModel.ts`, see below), consumed by
  `src/rendering/Biomes.ts` via `import.meta.glob`. The terrain shader uses normal+roughness+specular when
  present and **falls back to the procedural material** if missing (offline). Generated with
  `scripts/gen_textures.py` (Cloudflare Workers AI: `@cf/black-forest-labs/flux-2-dev`, multipart inputs;
  credentials in `scripts/.cloudflare.json`, gitignored) + `scripts/post_textures.py` (tiling/normal/roughness).
  Prompts in `scripts/prompts_textures.json` (sections `terrain`/`materials`/`buildings`/`textiles`/`landscape`);
  andean textile slots may use public-domain museum images as FLUX.2 multi-reference inputs (`scripts/refs.json` →
  `scripts/_refs/`, gitignored; all of it is optional — the AI layer only overrides the procedural look when the
  webp exists). See `PROVENANCE.md`.
- **Building/unit materials are AI-overridable**: `mat()` (`ProceduralModel.ts`) maps a `TexKind` to an
  AI-generated material via `TEX_GEN` (e.g. `adobe → wall_adobe`, `brick → wall_brick`, `roof → tile`,
  `thatch → roof_thatch`, `textile_inca → textile_inca`); the architecture profile (`archProfileFor`) picks the
  wall/roof/foundation `TexKind` (`andeanTex`/`facadeTex`/`foundationTex`) and `getAttire` picks the per-civ
  uncu textile (`CIV_TEXTILE`). Any `TexKind` absent from `TEX_GEN` (e.g. `stone`) stays procedural; every new
  `TexKind` needs a `TEX_DEFAULTS` entry and a `MaterialTex` fallback (`src/rendering/Textures.ts`).
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
  **Height advantage (§7, abstraction)**: a unit attacking from higher ground deals more and uphill less — the
  pure `elevationDamageMultiplier(attackerY, targetY)` (±25% cap) is applied to the **final** damage in
  `Game.resolveDamage`, only when the attacker has a position (melee; projectiles pass `{ owner }`). Units only,
  not buildings. The ±25% is a gameplay abstraction of the high-ground/visibility advantage, not a measured value.
- **Maps by geography**: `MapType = 'coast' | 'andes' | 'altiplano' | 'jungle'` (generated in `Terrain.generate`).
- **Historical world profiles (data layer)**: `src/model/defs/profiles.ts` defines `GeographicRegion` (finer than
  `MapType`) and `HistoricalMapProfile` (terrain+soil/climate+aridity/moisture/temperature/water/vegetation/
  resources/atmosphere/landmark), with `resolveMapProfile({ period, civ, mapType, region? })` and
  `resolveWorldProfile(...)` (map + architecture) and `profileForMapType`. `src/model/defs/architecture.ts`
  defines `HistoricalArchitectureProfile` (wall/roof/foundation/ornament) via `archProfileFor(civ, period)`,
  extending the existing `CivVisual`/`ArchStyle` layer (after 1532 the era governs the look, as in
  `Builder.isAndean`). `src/model/defs/landmarks.ts` holds the visual-only `LandmarkId` registry with sources
  and status (`documented`/`plausible`/`abstraction`); `landmarkForCiv(civ, period)` only applies inside the
  landmark's own period (no anachronistic landmark). The region drives the fine terrain identity; `mapType` is
  the coarse playable family (matches `regionDefaultMap(region)`). These are pure data + resolvers; the
  generator consumes them in later phases. Guarded by `tests/profiles.test.ts`.
- **Profile-driven generation (Phase 3)**: `Game.initWorld` resolves `resolveMapProfile({ period, civ, mapType })`
  once into `Game.mapProfile` and feeds it to `Terrain` (which now takes a `HistoricalMapProfile`, not a `MapType`
  string), `Water` (`profile.water.level`/`inland`), the resource spawner and the tree variants. The heightmap
  generation is pure and lives in `src/rendering/heightField.ts` (`generateHeightField(resolution, seed, profile)`,
  no THREE), so `tests/terrain.test.ts` pins determinism (same seed+profile → same map; different seed/profile →
  different map) without a DOM. Adding a region/profile does not touch the generator: only the data in
  `profiles.ts`. The region `atmosphere` is applied (Phase 9): `Game.applyAtmosphere` feeds `skyTint`/`fogDensity`
   to the sky, terrain and water as a distance-bounded aerial perspective and `sunWarmth` to the sun; `scene.fog`
   stays null (classic sharp look, buildings undimmed).
- **Post-processing & the cinematic look**: `src/rendering/PostFX.ts` chains Render → SSAO → Bloom →
  chromatic aberration → vignette → `OutputPass` → **colour grading** → FXAA. `settings.cinematic` (default
  **on**, `src/core/Config.ts`) enables the whole set and `settings.quality` (`high|medium|low`) tunes
  SSAO/bloom; both are in the Options panel. On a **software rasterizer** (SwiftShader/llvmpipe) the game starts in
  the safe *render* profile (`cinematic` off, `quality` low, pixel ratio 1) without changing the saved player
  settings; `?cine=1` disables that fallback (and `?low=1` still wins). `src/core/QualityGovernor.ts` lowers the preset with hysteresis
  when FPS drops and restores it (never above the chosen preset), dropping the render scale only in severe
  cases; it only touches post-processing/pixel ratio, never the simulation. `settings.settingsVersion` migrates
  old stored settings (v<2) to the new cinematic-on default once, without clobbering a later explicit choice;
  `?low=1` forces the classic look.
- **Colour grading by period and biome**: `src/model/defs/grades.ts` holds `ColorGrade` and `PERIOD_GRADES`
  (one mood per `HistoricalPeriod`) plus `resolveColorGrade(period, profile)`, a **pure** blend of the period
  grade with the region's `climate.temperature`/`aridity`; `Game.initWorld` applies it to `PostFX.setColorGrade`
  and it toggles with the cinematic set. Guarded by `tests/grades.test.ts`.
- **Per-mission atmosphere**: `MissionDef.atmosphere` (optional `{ fogDensity?, skyTint?, sunWarmth? }`)
  overrides the region profile's `atmosphere` in `Game.applyAtmosphere` (e.g. the Chavín mist), independent of
  `MissionDef.timeOfDay` (the day/night hour, already per mission).
- **Death/collapse FX (visual only)**: `Unit.die()`/`Building.die()` keep the model in the scene; `Game` records
  a one-shot `deathFx` (units topple, buildings sink + tilt with dust/fire) and frees the model when it ends.
  Entities still leave `units`/`buildings` immediately, so AI/mission/save filters are unchanged. A building
  collapse also spawns **instanced debris chunks** (`src/rendering/Debris.ts`, fixed pool: gravity + spin +
  bounce) and a sustained fire/dust emission while it sinks.
- **Phased construction**: while `!constructionComplete`, `Building.update` grows the model out of the ground
  (`view.group.scale.y` eased by `buildRatio`); it is restored to 1 on completion. Visual only (the save already
  stores `constructionProgress`).
- **Ambient life (visual only)**: `src/model/defs/props.ts` (cacti, totora, rocks, shrubs) and
  `src/model/defs/wildlife.ts` (llama, vicuña, condor, pelican) are **pure** planners over the region profile +
  seed. `src/rendering/Props.ts` instances the props; `src/rendering/Wildlife.ts` renders the fauna. The **llama
  pilot** uses the rigged CC0 camelid (`quaternius_alpaca`) with idle/walk/eat clips; the other species and any
  asset-load failure keep the cached procedural templates (`src/rendering/faunaModels.ts`) built from
  rounded/capsule shapes with **vertex-colour AO** and **articulated legs/wings** (shared geometry + one shared
  material; diagonal gait and wing flap). No entities, obstacles or save; regenerated deterministically on load,
  templates freed by `clearFaunaTemplates` in `Game.destroy`.
- **Rigged 3D models (optional, glTF/GLB)**: `src/model/defs/modelAssets.ts` maps a unit kind to a registered
  asset id plus an optional presentation variant. The **Caral worker** is the first mapping (Caral + Arcaico/Formative matches);
  all other units still use the procedural path, so #109 and later issues opt in progressively.
  `modelAssetIdsForMatch` lists the models to preload during `boot()` for every participating civilization. Assets live in
  `src/assets/models/*.glb`, are resolved by `src/rendering/modelAssetRegistry.ts` (`import.meta.glob` with
  `?url`, hashed by Vite) and loaded by `src/rendering/ModelAssets.ts` with `GLTFLoader`. The shared
  scene/geometry/material/texture cache is cloned per entity through `SkeletonUtils.clone` in
  `src/rendering/RigInstance.ts`; **each instance owns its skeleton and `AnimationMixer`**, never its
  geometry/materials. `Unit` uses the rig only for presentation, maps
  `idle|walk|walk_carry|gather|build|attack` from its real order/movement state through the tested
  `rigClipStateFor` and ignores root motion, so navigation, saves,
  replay and determinism are untouched (the existing death topple still renders dead units). `acquireRig` is
  synchronous: the asset must be preloaded or the unit keeps its procedural model (with a `[models] … fallback`
  warning). Teardown runs the `Game.onDestroy` hooks (e.g. the rig demo), disposes every rig (`RigInstance.dispose`)
  and only then calls `clearModelAssets()`, which owns the glTF resources and defers disposal of any asset that
  still has a live rig. Clip names are data in `modelAssetRegistry.ts`; a new model needs a `.glb`, a
  `ModelAssetId`, a registry entry and (when it should be used) a mapping in `unitModelAsset`. The **Caral worker
  asset** (`caral_worker.glb`, #116) is built by `scripts/build_caral_worker.mjs` from pinned CC0
  body/hair/clips plus project-authored cotton tunic/skirt/sash; `src/rendering/workerAttire.ts` only adds the
  headband, digging stick and carry bundle as rigid bone attachments. The carry bundle is tinted/shown by
  `RigInstance.setCarrying` from the unit's real carry state. The eyes (`shadowSkipMeshes` in the registry) skip
  the VSM shadow pass to stay inside the worker budget; see
  [`docs/development/performance-audit.md`](development/performance-audit.md). `?rig=1` mounts a visual demo
  with two independent instances and exposes `window.__rigDemo`; `window.__modelAssets()` is always available as
  a diagnostics snapshot.
- **HUD identity & commander portraits (UI only)**: the HUD uses inline-SVG Andean motifs (chakana divider,
  stepped-fret top-bar band) with no image assets. `src/model/defs/commanders.ts` maps campaign speakers to
  stylized portrait medallions (`src/ui/Portrait.ts`: SVG, civilization palette + emblem + initials);
  `MissionDef.commanders` shows portrait cards in the briefing, and `Mission.triggerDialogue` resolves the
  `Nombre:` prefix to a portrait. `status: 'abstraction'` marks stylistic reconstructions (never likenesses).
- **Water refraction**: `Water` renders the scene with its mesh hidden into a `WebGLRenderTarget`
  (`Game.renderWaterRefraction`) and the shader samples the seabed, offset by the wave normal and faded by the
  viewing angle (fresnel). It costs an extra scene pass, so it only runs with the cinematic set on and the
  applied quality ≠ `low`; the region `atmosphere` still supplies the aerial perspective.
- **Andenes (agricultural terracing)**: `profile.terrain.terraceChance` is no longer dead data — `carveTerraces`
  (`src/rendering/heightField.ts`) pulls moderate slopes toward flat shelves (gated by a coherent noise mask so
  terraces form patchy zones) and writes a `terraceMap` strength (0..~0.55). `Terrain` exposes it via
  `getTerrace(wx, wz)` and tints terraced ground as cultivated.
- **Farm yield from the terrain (§7 geography as mechanic)**: `Game.applyTerrainFarmYield` (called from every
  farm placement path: player, AI, scripts) scales a farm's `foodAmount` by
  `farmYieldMultiplier({ terrace, moisture, canal })` (`src/model/defs/farmYield.ts`, pure/unit-tested): the
  ground under the farm — andenes, fertile moist soil, and an irrigation canal within reach (`nearbyCanal`,
  `CANAL_REACH` = 2.5 units) — raise its yield (up to ×2.44 on generated terrain). This rewards placing farms in
  a fertile valley / beside a canal, and makes the carved canals matter. Pure and deterministic (no RNG), so
  replay/save safe (`foodAmount` is already in `stateHash` and `saveTypes`). Guarded by
  `tests/farm-yield.test.ts`; the terrace/canal maps it reads are pinned by `tests/terrain.test.ts`.
- **Architecture profile in the model (Phase 4)**: `BuildContext.arch` (`Game.makeBuildContext` →
  `archProfileFor(civ, era)`) drives `ProceduralModel`'s Andean builders (`wall`/`roof`/`foundation`/
  `ornament`/`monumentalTiers`) instead of `Builder.style` booleans; new modules are `andeanTerraceBase`,
  `andeanMegaliths` and `andeanTapestries`, and the colonial/republican builders pick their facade texture via
  `facadeTex`. `archProfileFor` is keyed by `(civ, era)` — the same key the model cache and `Builder.isAndean`
  use — so a debug `?era=N` or an era advance stays coherent. The mission constructor now also copies
  `mis.period` into `settings.period` (missions declare their historical period). Verified structurally by
  `tests/e2e/civ-visuals.spec.ts` and visually with `yarn shots:civs`.
- **Landmarks (visual only)**: `Game.mapProfile.landmark` (from `landmarkForCiv(civ, period)` — period-gated and
  region-gated: see `resolveMapProfile`) drives `Game.spawnLandmark()`, which builds a cached template via
  `buildLandmarkModel` (`ProceduralModel.ts`, keyed by `landmark|civ|era`) with the landmark's own
  civilization/era. One landmark per civilization (19 total: Caral, Chavín, Cupisnique, Paracas, Moche, Nazca,
  Recuay, Wari, Tiahuanaco, Chimú, Chincha, Chanca, Collas/Lupaca, Huanca, Inca, colonial, Patriotas, República,
  Chile); sources/status in `src/model/defs/landmarks.ts`. Placement is deterministic
  (`RNG(mapSeed*131+11)` on a 0.3–0.42·size ring, skipping water/beach/steep cells and player bases/resources)
  and adds a plain `THREE.Group` named `landmark` to the scene (no entity, no pathfinding obstacle). Freed in
  `Game.destroy()`; templates are freed by `clearModelCaches()`. The masonry surfaces reuse the civilization's
  wall material (`andeanTex` → `WALL_TEX`, so AI-generated `wall_*` when present), not a fixed stone; Chavín
  deliberately resolves to the lighter procedural stone map so its carved masses stay readable at RTS zoom.
  Verified by `tests/e2e/landmarks.spec.ts`.
- **Cultural landscape (visual only)**: `HistoricalMapProfile.culturalLandscape`
  (`src/model/defs/landscape.ts`) names the features each region carries (canal, field, road, path, terrace,
  wall, corral, plaza — coast irrigation vs Andean terracing vs altiplano corrals). `carveCanals`
  (`src/rendering/heightField.ts`) cuts shallow irrigation ditches keeping the bed above the waterline (so they
  are not pathfinding walls or flooding sources) and writes a `canalMap`; `Terrain.getCanal` exposes it.
  `planCulturalLandscape` (`src/model/defs/landscapePlan.ts`) is a **pure** planner (no THREE, unit-tested in
  `tests/landscape.test.ts`) that places the features on buildable, flat land, scaled by `settlementShape`
  (roads/paths as ordered chains); `CulturalLandscape` (`src/rendering/CulturalLandscape.ts`) builds the chained
  features — and the canals, from `Terrain.getCanalPaths()` — as continuous terrain-following ribbons
  (`src/rendering/ribbon.ts`) and merges them per feature into a few meshes (a handful of draw calls);
  `Game.spawnCulturalLandscape()` adds the `landscape` group next to the landmark. Deterministic
  from `seed + profile` and visual only (no entities, no gameplay, not saved — regenerated on load); disposed in
  `Game.destroy()`. The landscape, the settlement overlays and the landmark dim with Fog of War through
  `applyFow` (`src/rendering/FowMaterial.ts`), which samples the same `Fow` texture in their materials (issue
  #70). Verified by `tests/e2e/landscape.spec.ts`.
- **Settlement layout (starting base)**: `Game.spawnStartBase` lays out the starting dwellings with
  `planSettlementSite` (`src/model/defs/settlementPlan.ts`), a **pure** planner (no THREE, unit-tested in
  `tests/settlement.test.ts`). It keeps a compact ring around the anchor, leaned toward the terrain-facing
  azimuth (`settlementShape`: riverside → water/moisture, hilltop → height), with dwellings kept apart (so the
  base cannot seal itself off), on buildable/dry/non-steep ground and on the anchor's side of any river (so the
  base is never cut off). The same plan also places the base's **fields** (most fertile reachable ground) and the
  **roads** to them; `SettlementOverlay` (`src/rendering/SettlementOverlay.ts`) draws the roads as ribbons and the
  fields as terrain-conforming grids (both follow the relief) and merges them into two
  meshes (visual only, no economy/obstacles). Deterministic from the base seed. Guarded by
  `tests/e2e/settlement.spec.ts`, `tests/e2e/ai.spec.ts` and `tests/e2e/skirmish-winnable.spec.ts` (which spawn/
  observe robustly rather than assuming the exact legacy ring).
- `src/campaign/defs/campaign.ts` defines the 9 historical campaigns; `src/campaign/Mission.ts` evaluates
  objectives/triggers. Each mission also declares an optional `region` (`MissionDef`), fed into
  `resolveMapProfile` so a scenario carries its own geography rather than the player's (e.g. m6 = the Inca on the
  Chimú `north_coast`). Objectives may be **bonus/optional** (`ObjectiveDef.optional`): they are evaluated and
  can be completed, but never gate victory nor cause defeat when failed. Campaign fichas in
  [`docs/historia/fichas_campana.md`](./historia/fichas_campana.md), validated by
  `tests/campaign-profiles.test.ts`.
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
- **Chronology/culture of techs**: `TechDef.minPeriod` / `maxPeriod` / `civs` (`src/model/defs/techs.ts`) is
  the historical window and optional civilization restriction of a technology. `techAvailable(tech, period, civ)`
  is enforced centrally in `Building.queueTech` (like the unit guard) plus the HUD research panel and the AI, so a
  tech never appears for the wrong civilization or period (e.g. Inca *chasquis* are Inca-only and do not leak
  into the Republic, colonial *obrajes* not before 1532). Windows are sourced in
  [`docs/historia/tecnologias.md`](./historia/tecnologias.md).
- **AI (`src/game/AI.ts`)**: macromanagement (workers, build plan, tech, waves) plus `defendEconomy`
  (recalls idle military when an enemy nears any AI building/worker), `microCombat` retreat of badly wounded
  units and `explore` (idle scouts patrol toward the enemy base). It only uses the same systems as the player
  (`issueOrder`, `combatStance`) — **never a hidden resource/production bonus**. Difficulty is split in two:
  `DIFFICULTY_MULT` (Config) tunes the decision cadence (`reaction`) and attack frequency (`aggression`), and
  `src/game/aiProfiles.ts` decides *strategy* — economy/army size, attack threshold, tech eagerness
  (`techReserve`; only `easy` holds back), retreat threshold, raiding and advanced military. A profile only
  invests in non-essential buildings (institute/factory/fortress) once it has its core army (`armyBase`), so a
  bigger economy becomes military strength instead of building sprawl. **Perception is LOS-limited**: the AI only
  knows enemies its units/buildings have line of sight to (`updatePerception`), remembering enemy units for
  `MEMORY_TTL` (12 s) after losing sight and discovered buildings permanently; `findEnemyCenter`, `findAttackTarget`,
  `focusTarget` and `findThreat` only consider known entities, and `explore` sweeps toward the mirror of the AI base
  through the map centre until it finds the enemy. It is no longer omniscient. (Local combat micro still reacts to
  enemies near a unit, exactly like the player's own units.) The army is trained to an era-based
  **mix** (`ARMY_MIX`) nudged to counter the enemy's composition (`armyWeights`). `Game.addAI(playerId, difficulty?)`
  attaches an AI to any player, so `yarn sim [--difficulty=…] [--p1=…] [--player=scripted]` runs **AI-vs-AI**
  headless matches (seeds, winner, peak armies); `--difficulty`/`--p1` set each seat's profile (default
  `normal`) and `--player=scripted` runs the `ScriptedPlayer` bot as player 0 (the player-side difficulty
  benchmark), so a run measures one profile against another. The runner drives fixed 1/60 steps with `?noloop=1` (no real-time warm-up), so it is
  **deterministic per seed** and usable as a regression signal. Baseline on the default seed set (`--max=1500`,
  player-0 wins / losses / undecided): `easy` 0/1/7, `normal` 4/2/2, `hard` 1/5/2, `legendary` 0/4/4. Player 0
  has a positional edge, so read each row against the `normal` mirror, not 50%. **The AI-vs-AI win-rate is not a
  usable difficulty yardstick** (seat bias + stalemate-prone + tiny decisive sample) and the profiles are not
  ordered by it — see [`ai-difficulty.md`](./ai-difficulty.md) for the full investigation, the population-cap bug
  it found (now fixed by scaling houses to the desired population), and the recommended next steps (a player-side
  benchmark, then an attack-commitment strategy). The winner typically fields 6-12 units; before the build-plan
  fix the AI often stalled at 0 wood and fielded no army.
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
  middle-mouse drag, or dragging the **bottom-left minimap**). Minimap: drag = move viewport, right click = order
  (`Game.commandMoveToWorld`). The minimap is **north-up** (`-z` is north, `+x` is east) and draws a fixed
  `N/E/S/W` compass; the camera footprint is a rotated quad from `getGroundQuad()` so it stays truthful when the
  camera yaw changes. Optional camera rotation with Q/E (`settings.rotateCamera`, off = fixed camera).
  Control groups (Ctrl/Alt+1-9 assign, 1-9 recall, Shift+1-9 add). Hover tooltip (`computeHover`) and
  **contextual cursor** (`hoverAction`). Damage icons/numbers (`src/ui/DamageNumbers.ts`), clickable alerts that
  pulse on the minimap (`pushAlert` + `alert` event), and order markers (`src/entities/OrderMarker.ts`).
  The bottom **command panel** (`#ed-bottom`) is hidden unless a **unit or building is selected** (0 A.D.-style):
  building therefore starts from a selected worker (or the H/F/G/V shortcuts), not from an idle panel.
- **Camera panning (`src/core/Camera.ts` + `src/core/cameraMath.ts`)**: the camera orbits a ground target; its ground basis is `forward = (−sin yaw, −cos yaw)`, `right = (cos yaw, −sin yaw)`, and **every pan input is rotated
  by that basis** (`rotateToWorld`, a rotation by `−yaw`). Edge scrolling is **progressive** (0 at the zone edge,
  ±1 at the border) and every pan vector is **normalized** (a diagonal is not faster than an axis); middle-drag uses
  a **geometric** world-per-pixel (`2·tan(fov/2)·zoom/viewportH`) with the "grab the map" metaphor (the content
  follows the cursor). Inputs only move `desiredTarget`; `update` damps toward it. The target is **clamped** so the
  visible rectangle stays near the terrain (`boundsMargin`). Panning is suppressed while **paused** (the loop skips
  `camera.update`) or while a **blocking overlay** is open (`camera.setUiCaptured`); **edge scrolling is also off
  while the pointer is over a HUD control** (`hud.isPointerOverUi` — `#ui-root` is `pointer-events:none`, only real
  controls set `auto`). Tuning lives in `CAMERA_CONFIG`; the pure math is unit-tested (`tests/camera.test.ts`), the
  wiring in `tests/e2e/camera.spec.ts`. The **camera speed** option (Baja/Normal/Alta, `settings.cameraSpeed` →
  `CAMERA_SPEED_SCALE`) scales the keyboard/edge speed only (the middle-drag is direct manipulation).
- **Campaign intro (visual only)**: `Mission.start` calls `Game.playIntro()` from the briefing's onStart
  callback, which frames an overview and runs `RTSCamera.flyTo(x, z, zoom, seconds)` down to the player base.
  Skipped with `?intro=0` (and under `?noloop=1`, since tests drive fixed steps).
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

- **Unit yaw is a movement angle, not a Three.js rotation**: `angleTo` returns the angle from +X, and models are
  built facing +Z. `EntityView.setFacing(yaw)` applies `facingRotation(yaw) = atan2(cos yaw, sin yaw)`; keep
  `setRotationY` for buildings/objects with a raw rotation. Turrets and the muzzle offset use the same helper
  (`angleDelta` for the local turret aim). Assigning `rotation.y = yaw` directly makes units walk sideways or
  backwards except on diagonals. Spawn yaw/animation phase come from the deterministic id (no `Math.random`), so
  saves, replays and AI-vs-AI runs stay stable.
- **Opening workers**: the human player does not receive automatic GATHER orders at match start (so the opening
  units stay put and are easy to select); AI seats still run `assignInitialWorkers`. Guarded by
  `tests/e2e/units-facing.spec.ts`.
- **Unit movement safety** (`Unit.integrateSafely`): every order's direct fallback (`directStep`) only moves when
  the segment ahead is walkable; `integrateSafely` validates the step, slides along one axis when a wall blocks the
  diagonal, and allows movement only when the unit starts on a blocked cell (controlled escape). GATHER / DELIVER /
  BUILD use `directStep` (never integrate `pos` inside the order handler) and interact at
  `target.radius + 1.4–1.6`: the old fixed 2.4 range forced workers into the building footprint. This changed the
  simulation, so `REPLAY_VERSION` is 7. Guarded by `tests/e2e/movement-safety.spec.ts`.
- **Pathfinding to a blocked goal** (`Pathfinder.pathfind`): a destination inside an obstacle (your own
  building, a resource node) is not traversable. `nearestWalkable` alone is not enough — it can return an
  isolated walkable pocket and A* then fails, silently dropping move-to-building orders. `pathfind` now accepts
  any cell within `GOAL_PROXIMITY` of the original goal cell. Keep that when touching goal handling.
  A move order must still cope with an empty route from a blocked **start** cell: `Unit.updateMove` (used by
  MOVE and, on an empty path, ATTACK_MOVE) only completes within `MOVE_ARRIVAL_DIST` of the target and otherwise
  re-paths or heads straight for it, so a unit never finishes its order and freezes far from the destination.
  Two related traps: `Pathfinder.rebuild()` (on obstacle removal, e.g. a razed building) restores the grid from
  a stored `terrainBlocked` mask — filling with 1 would silently turn water **or too-steep** cells back into
  walkable ground (`bakeTerrain` marks both: height below the waterline, or a slope above `MAX_WALKABLE_SLOPE = 0.5`,
  the same limit `Game.canPlace` enforces so anything buildable stays reachable; the slope formula is the shared
  `terrainSlope` in `src/util/math.ts`).
  And `Unit.updateAttack` closes in directly whenever its route is **exhausted** (`pathIdx >= path.length`), not
  only on an empty route: a building's goal cell is not walkable, so the path can stop a couple of cells short
  and a melee unit would otherwise stall out of range (worst with a tight cluster).
- **Model geometries and textures are shared/cached** (`sharedGeo`, `bakedGeoCache`, `texCloneCache` in
  `ProceduralModel.ts`). `disposeModel()` only frees materials; **do not** dispose geometries/textures by hand nor
  reuse them by mutating `repeat`. To clear everything use `clearModelCaches()`. The separate glTF asset cache
  is the exception: `clearModelAssets()` is its explicit owner and disposes its geometry/material/textures, but
  only after every rig released them.
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

## Rigged models (glTF/GLB)

Local `*.glb` files live in `src/assets/models/`. The registry (`src/rendering/modelAssetRegistry.ts`) maps an
asset id to its bundled URL, scale, yaw offset and **clip names**; the game states are
`idle | walk | walk_carry | gather | build | attack | eat` (`RIG_CLIP_STATES` in
`src/model/defs/modelAssets.ts`; `eat` is used by fauna). Only `idle` is mandatory; a missing state falls back to
`idle`, and a requested attack with no action logs a `[rig]` warning instead of failing silently. Death stays on
the existing topple FX until a rig-specific death flow exists.

Audit of the path this pipeline mirrors: procedural templates are cached by `type|scale|barrel|civ|era`,
`instantiateTemplate` clones them with per-instance materials, buildings modernize by swapping the whole model,
units animate named pivots, `disposeModel` frees only materials and `clearModelCaches` owns shared geometry.
The glTF path keeps the same split: a shared asset cache plus a per-instance skeleton/mixer clone. The Caral
worker reuses `Walk_Loop` for locomotion (playback rate follows the unit velocity), `Walk_Carry_Loop` while
delivering a load, `Farm_Harvest` for gathering, `Push_Loop` for building and `TreeChopping_Loop` for a tool
strike; `Idle_Loop` is the fallback. The asset has no construction clip, so `Push_Loop` is an explicit
pushing/placing abstraction rather than a literal masonry animation. The base asset's `Sword_Attack` is not
used because the worker is pre-metal; the attack uses the worker's own digging stick (a tool swing) instead. The
per-instance accessories (headband, carry bundle, digging stick) are the deliberate exception to the shared-cache rule: they
carry the variant's tint and bone attachments and are disposed with the rig. The digging stick hides while
carrying and during build work, so it never crosses the body or a placed load. The body, face, hair, tunic, skirt
and sash are shared GLB geometry/materials. The order-driven poses are captured by
`node scripts/shots_evidence.mjs --scene=caral-worker-tasks --out=review/evidence/caral-worker-tasks`.

The same GLB backs the Caral **worker and scout in both genders** (`caral_worker_f/m`, `caral_scout_f/m`;
`unitModelAsset` maps `WORKER`/`SCOUT + CARAL + FORMATIVE`). The female and male bodies share one 65-bone
skeleton and the clips; each instance hides the unused body/hair/outfit set. Workers use the tunic + skirt/sash
(female) or tunic + short wrap/sash (male). The Caral scout uses the same commoner tunic/skirt or wrap plus a
simple manta and plain headband, with no chasqui belt, gourd, long runner skirt or digging stick. The
`inca_chasqui_*` outfit is reserved for the Inca and is not assigned to Caral. Scout `RIG_VARIANT_CLIPS` use
`Walk_Loop` for locomotion, `Punch_Jab` for attack, and disable gather/build. Worker attacks use
`TreeChopping_Loop`. `Jog_Fwd_Loop` and `Sprint_Loop` are exported for a future runner garment (the current
skirt clips with the high knee) but are not mapped. Human skin/hair use the shared `HUMAN_SKIN`/`HUMAN_HAIR`
constants (`src/model/defs/people.ts`); the
build script recolours both CC0 body textures while preserving the eyes, mouth and shading. Skin tone is not
documented: it is a plausible Andean representation, not a portrait.

Gender is **presentation-only**. `genderForId(id)` assigns female/male 50/50 deterministically; `Unit.gender`
selects the rigged variant or is added to the procedural `ModelSpec`. `buildModel` includes gender in its cache
key; `addHumanoid` uses it for shoulder/hip proportions, long/short hair and a light skirt for female
procedural units. It never changes stats, movement, saves or the simulation. Caral's gender division of labour
and ratio are not documented, so this is a plausible representation, not a historical claim.

The worker GLB is generated by `scripts/build_caral_worker.mjs`: it fetches the pinned CC0 sources, verifies
their SHA-256, rebinds both bodies/hair sets onto one 65-bone skeleton, generates the cotton garments from each
body surface and exports the ten clips. Rebuild with
`yarn models:build`; record any new hash in
[`PROVENANCE.md`](../PROVENANCE.md). The registry's `shadowSkipMeshes` keeps only the tiny eye meshes (`Eyes_f`, `Eyes_m`) out of the
VSM shadow pass (both `castShadow` and `receiveShadow`), because VSM also renders receivers into the shadow map;
this is what keeps the worker under 40k tris in the benchmark. Measure with
`yarn bench --scenario=rigs --units=4,12,24,48 --runs=2 --steps=600 --assert`.

To add a model:

1. Put the `.glb` in `src/assets/models/` and record its source/licence/SHA-256 in `PROVENANCE.md`.
2. Add its id to `ModelAssetId` (`src/model/defs/modelAssets.ts`) and an entry to `MODEL_ASSET_DEFS`.
3. Return that id (and optional variant) from `unitModelAsset(kind, era, civ)` for the units it should replace.
   Until then the unit keeps the procedural model; the Caral worker is the reference mapping.
4. Add the id to `modelAssetIdsForMatch(period, civs)` if it must be preloaded before entities are created.
   Pass every participating civilization (the Caral worker is preloaded for Arcaico matches with Caral).
5. For fauna, return the id from `wildlifeModelChoice(species)` and list it in `wildlifeModelAssetIds(region)`;
   the llama/alpaca pilot is the reference.

The loader must be synchronous at entity construction: `acquireRig()` only returns an already-loaded asset;
`boot()` preloads the list and failures keep the procedural fallback. Clips must be **in-place** (root motion
is ignored). Each instance owns its skeleton and `AnimationMixer`; base geometry/materials/textures stay shared,
while the Caral accessories own their small per-instance attachments. `Game.destroy` runs `onDestroy` hooks first,
then disposes units (and their rigs), and only then calls `clearModelAssets()`. That function defers disposal while
an asset still has live rigs, so shared resources are never freed under an entity that still uses them. `?rig=1` is
the visual harness for the pipeline.

Next iteration for the worker: a dedicated construction clip (the current build state uses `Push_Loop`), a
rig-specific death flow and, if needed, a worker attack clip. The mesh/outfit pilot is closed in #116; future
historical changes must update the period dossier, the build script and `PROVENANCE.md` together.

## Rigged fauna (llama pilot)

**Inventory and selection (unchanged):** `wildlife.ts` has llama, vicuña, condor and pelican. Per-region weights
(`REGION_WEIGHTS`) and suitability gates decide the mix: llama above 2 m, vicuña above 4 m, condor above 5 m and
pelican only near water/beach; region counts are 12 (altiplano/high Andes), 10 (valley/coast) and 4 (Amazon),
with a hard `MAX_ANIMALS = 16` cap. The region comes from `resolveMapProfile` (period + civ + map type + optional
mission region); the **period does not add/remove fauna** — ambient life is a visual, period-agnostic layer. The
llama/alpaca is documented from the Andean camelid herding dossiers (`docs/historia/civilizaciones/collas_lupaca.md`,
`recuay.md`); no new species or spawn rule is added.

`wildlifeModelChoice('llama')` returns the `quaternius_alpaca` asset; `wildlifeModelAssetIds(region)` derives the
preload list from that same mapping and the region weights during `boot()` (main resolves the region with the
same `resolveMapProfile` arguments as `Game`). `Wildlife.spawn` asks for a rig through `acquireRig`; if it is
unavailable it builds the procedural animal exactly as before. The alpaca is an Andean camelid **stand-in** for
the existing llama, not a new species; vicuña/condor/pelican stay procedural in this iteration.

The rig plays `walk` while it advances its deterministic orbit and stops to play `eat` on a deterministic
sinusoidal cycle per animal; walk playback follows the orbit speed. The root sits at `Terrain.getHeight`, the model
is grounded at its bind-pose feet with a 2 cm clearance, and both rig and procedural animals now face their actual
travel direction (the orbit tangent is `(-sin, cos)`, so the yaw is `-angle`).
The alpaca is an Andean camelid stand-in for the existing llama species, not a new species; vicuña/condor/pelican
remain procedural. Rigged fauna uses the same shared cache/clone/refcount rules as the worker.

Measured cost on the altiplano map at the **configured 12 animals** (8 llamas replaced in the mixed set,
direct render, shadows included): procedural set **+60 draw calls / +17,200 triangles**; mixed set **+132 calls /
+38,320 triangles**. Replacing 8 llamas therefore adds **+72 calls / +21,120 triangles**, about **+9 calls and
+2,640 triangles per llama**. `Wildlife.update` cost measured in-browser: **0.058 ms/step** for the mixed set vs
0.008 ms/step procedural (software renderer), well below the 16.6 ms budget. The cap remains 16; `tests/e2e/fauna.spec.ts`
covers spawn, clip states, terrain grounding, facing, procedural fallback and teardown, while
`tests/e2e/ambient.spec.ts` still verifies the procedural limbs. Evidence:
`docs/media/fauna-llama-before-after.webp` and `docs/media/fauna-llama-rts-before-after.webp`
(`map=altiplano`, seed 777, 1600x900).

Next iteration for fauna: replace vicuña/condor/pelican, add flight-specific states and terrain-avoidance if a
rigged bird is added, and evaluate per-species LOD/update throttling at the 16-animal cap.

## Debugging / automation

- `src/main.ts` exposes `window.game` (and `window.THREE`) for the console and scripts.
- The app shows the **main menu by default**; enter the match directly with `?play=1` or any debug param.
  `resetGame()` reloads with `?play=1`.
- URL params: `?play=1`, `?menu=0/1`, `?load=1`, `?replay=1`, `?seed=`, `?fog=0`, `?low=1`, `?speed=`, `?era=N`,
  `?period=N`, `?mission=ID`, `?rig=1` (mount two independent rigged-model instances for the GLB pipeline),
  `?noloop=1` (do not auto-start the loop; tests drive fixed steps from step 0),
  `?fps=1` (show the debug FPS overlay, hidden by default), `?civ=ID` (force the player civilization; with
  `?period=N` it drives the geography), `?map=TYPE` (force the map type), `?intro=0` (skip the campaign
  camera flyover; `?noloop=1` skips it too) and `?cine=1` (disables the software-renderer fallback; `?low=1` wins).
- Shared `scripts/lib.mjs` (`launchChromium`, `withViteServer`, `readPng`, `classify`). Scripts launch Vite on a
  free port and Chromium with SwiftShader; they use `CHROME_PATH` or `chromium.executablePath()`. Run captures
  with `?low=1`.
- `review/` holds generated PNG/JSON (gitignored); do not edit them by hand.
- **Release media**: `yarn shots:media` writes the curated stills to `docs/media/`; `yarn gif` captures the
  mission intro and writes `docs/media/gameplay.gif` (needs `ffmpeg`). `yarn package:itch` zips the **contents**
  of `dist/` into `review/edades-del-peru-itch.zip` (root `index.html`, relative asset paths) for `butler push`.
- **Visual regression** (`scripts/visual.mjs` + `scripts/scenes.mjs`): `yarn shots:periods` captures the 21
  representative scenes (the nine periods named in the PRP and the remaining civilization families: close-up of
  the player base; and four geographic regions: wide view) into `review/periods/` for human review.
  `yarn visual:update` writes a compact colour
  signature per scene to `tests/visual/baseline.json`; `yarn visual:check` re-captures and fails when a scene's
  mean per-channel difference exceeds `--threshold` (default 12) or any grid cell exceeds `--cell-threshold`
  (default 35). A scene that fails to boot is never written to (or accepted as) the baseline. The signature
  (`scripts/visual_lib.mjs`, unit-tested in `tests/visual.test.ts`) is a 4×4 mean-colour grid — robust to
  cosmetic randomness (tree positions, wind) but sensitive to a scene whose identity changes. Run
  `visual:update` after an intentional change; the harness is local (same machine/browser) and not wired to CI.
  Pass `--only=caral,contemporary` to capture just those scenes for a quick check (~30 s instead of minutes);
  a partial `visual:update --only=…` **merges** into the baseline (it does not drop the other scenes).

## Verification tiers

Match the cost of verification to the change (the full gate is in `AGENTS.md`):

- **Every change** — `yarn verify:fast` (~10 s): `typecheck && lint && format:check && test && build`.
- **Runtime / gameplay / recipe change** — targeted e2e specs (`yarn test:e2e tests/e2e/<area>.spec.ts`) and
  `yarn sim` (AI regression); `yarn test:e2e:smoke` for the fast `@smoke` subset, or `yarn test:e2e:fast`
  (excludes the heavy AI/campaign-completable/settlement/save specs).
- **Before merge** — **do not run the full suite locally**: CI owns it. `yarn visual:update` **only if the
  change is visual** (otherwise `yarn visual:check`); `yarn bench` if it is performance-sensitive.
- **CI** — the **fast** E2E project on `main` is **sharded 4×** (~5–7 min), and the PR `@smoke` subset
  **sharded 2×**. The heavy specs (`ai`, `campaign-completable`, `settlement`, `save`) run **nightly**
  (`test:e2e:slow`).
- **E2E parallelism**: 2 workers locally (`PW_WORKERS=n` overrides) and **1 per CI shard** — the software-WebGL
  runners are CPU-bound and two workers starve them; sharding (4× full, 2× smoke) provides the parallelism.
  If a change only touches one area, run that spec instead of the suite.

## Performance benchmarks

`yarn bench [--units=50,100,200,400,800] [--scenario=soldiers|mixed|mixed-ai|rigs|fauna|mixed-rigs]
[--animals=4,8,12,16] [--seed=777] [--steps=600] [--runs=3] [--profile=1] [--gc=1] [--fog=1]
[--assert] [--out=review/bench.json]` boots a match in Chromium (SwiftShader) and, per scale, measures
spawn/destroy time, simulation step time (`Game.update`), heap, A* per call, target acquisition
(`enemiesNear`) and hover-picking (`pickAt`). With `--profile=1` it installs `scripts/perf-probes.mjs`, which
adds per-step section timings (units, AI, pathfinding, rigs, FOW, HUD, particles, spatial, ...) and exact
counters without changing game behaviour. `soldiers` is the original scenario; `mixed` builds a deterministic
economy+combat scenario (workers, gather orders, soldiers, opposing attack orders, barracks); `mixed-ai` also
keeps both AIs active. `rigs` spawns N Caral workers from a clean population, `fauna` spawns N rigged llamas
(capped at 16) and `mixed-rigs` combines workers, soldiers and 8 llamas. The rig scenarios isolate the animated
groups' draw calls/triangles by rendering them visible vs hidden (shadow pass included). With the loop running and
`window.__directRender` on (bypasses post-processing so `renderer.info` is meaningful) it records FPS, frame
time (avg/p50/p95/p99), long tasks and real scene draw calls/triangles, and it isolates the cultural
landscape's draw calls (the layer rendered visible vs hidden). It **fails** (`exit ≠ 0`) when they exceed
`2 × CulturalLandscape.featureBudget` (one merged mesh per drawable feature, times the
VSM main+shadow passes; see [`docs/design/cultural-landscape.md`](design/cultural-landscape.md)). It writes
the JSON to `--out` (`review/bench.json` by default) and prints a table.

`yarn sim [--seeds=777,...] [--max=1200] [--metrics=1] [--sample=5] [--out=review/ai-bench.json]` is the
deterministic AI-vs-AI runner. With `--metrics=1` it records first soldier/first attack/first barracks,
workers/military/buildings created, gathered resources, losses, pathfinding requests/failures, AI percentiles
and a sampled timeline (idle/blocked workers, stuck units, army, resources) without changing behaviour.

`yarn bench:check` runs the rig/fauna/mixed budgets with `--assert`: it fails when a worker or animal exceeds
its structural draw-call/triangle budget, when a rigged entity silently falls back to the procedural model, or
when the mixed scenario's simulation p95 exceeds one frame (16.6 ms). The budgets are machine-independent;
FPS is not asserted because SwiftShader is not representative of a GPU.

The full audit with 50/100/200/400/800 results, 20 AI seeds and the prioritized issue list is in
[`docs/development/performance-audit.md`](development/performance-audit.md). It records the baseline and the
follow-up after #121 (component reachability cache, stuck-order give-up and the corrected `blockedWorkers`
metric), plus the #118 rig/fauna budget (7→1 alpaca primitives, 14→2 draw calls per animal). Reference run from
the audit environment (i7-13700, `CHROME_PATH` SwiftShader, `?low=1`, seed 777):

| units | spawn ms | sim ms/step | heap Δ/loop MB | A* ms/call | target µs/call | pick ms/call | frame ms (avg/p95) | draw calls | triangles | heap MB |
|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 38 | 0.6 | ~6 | 0.11 | 1.3 | 0.05 | ~611/908 | ~3.9k | 2.8M | 53 |
| 300 | 69 | 0.8 | ~12 | 0.10 | 0.8 | 0.12 | ~906/1314 | ~10.8k | 7.4M | 70 |
| 500 | 99 | 1.0 | ~8 | 0.09 | 1.0 | 0.16 | ~937/1654 | ~17.3k | 11.7M | 91 |
| 1000 | 190 | 1.7 | ~20 | 0.09 | 1.0 | 0.27 | ~1488/2557 | ~34k | 22.8M | 115 |

Reading (historical `soldiers` scenario): the **mean simulation, pathfinding, target acquisition and picking are
cheap** (≈0.6–1.7 ms/step up to 1000 units). The 2026 audit's `mixed` scenario shows the caveat: the **mean** is
still low (3.9 ms/step at 800 with probes), but the **p99** reaches 15–18 ms because of rare A* searches. The
AI economy could deadlock on unreachable resources before #121; #121 reduced the search storm and stuck orders
but did not close PATH-1 (no per-frame budget/queue yet). See
[`docs/development/performance-audit.md`](development/performance-audit.md) for the current percentiles and the
20-seed AI results. A* in the table is a random-map sample, not a scaling result; hover-picking is ~0.3 ms/call at
1000 after moving to one pick proxy per entity and a single resolve per frame. Draw calls at 1000 fell from the
original **~81k baseline to ~34k** (‑58%; the previous merge step was ~56k, so this step is ‑39%), by merging each
model's static parts by material and baking part colours into vertex colours. ~34 per unit remains (the shadow
pass roughly doubles them, and units still have no instancing) — reaching ~15-20 needs **instancing** (or
collapsing per-part PBR params), which is not done. Frame time is dominated by the software renderer, so use draw
calls as the actionable signal.

Post-processing is **off** in these runs (`?low=1`). The cinematic set (default on) adds SSAO/bloom/grading and,
when quality ≠ `low`, one extra full-scene pass for water refraction — the `QualityGovernor` drops to `low`
(disabling refraction) when the frame rate stays below its threshold, so measure on a real GPU before drawing
conclusions from the SwiftShader numbers above.
