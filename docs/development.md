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
  attack" is a general attack bonus), not per unit category. Add effects for any new civ (tested in `defs.test.ts`).
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
  or engines before 1532). The internal `Era` only models the tech level, so scripted content must pass this guard.
- **AI (`src/game/AI.ts`)**: macromanagement (workers, build plan, tech, waves) plus `defendEconomy`
  (recalls idle military when an enemy nears any AI building/worker), `microCombat` retreat of badly wounded
  units and `explore` (idle scouts patrol toward the enemy base). It only uses the same systems as the player
  (`issueOrder`, `combatStance`); difficulty (`DIFFICULTY_MULT`) tunes decision cadence (`reaction`), macro
  size (`econ`) and attack frequency (`aggression`) — **never a hidden resource/production bonus**.
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
  and let the destination marker (`OrderMarkers`) indicate the point.
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
- URL params: `?play=1`, `?menu=0/1`, `?seed=`, `?fog=0`, `?low=1`, `?speed=`, `?era=N`, `?mission=ID`.
- Shared `scripts/lib.mjs` (`launchChromium`, `withViteServer`, `readPng`, `classify`). Scripts launch Vite on a
  free port and Chromium with SwiftShader; they use `CHROME_PATH` or `chromium.executablePath()`. Run captures
  with `?low=1`.
- `review/` holds generated PNG/JSON (gitignored); do not edit them by hand.
