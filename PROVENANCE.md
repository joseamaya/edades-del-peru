# Asset provenance

## AI-generated textures

- **Location**: `src/assets/textures/{terrain,materials}/{slot}_{diffuse|normal|roughness}.webp`
- **Generation**: albedo with **Cloudflare Workers AI** (`@cf/black-forest-labs/flux-2-dev`,
  multipart inputs), via `scripts/gen_textures.py` (prompts in `scripts/prompts_textures.json`).
  Earlier terrain/material albedos were generated with `@cf/black-forest-labs/flux-1-schnell`.
- **Post-processing**: `scripts/post_textures.py` (tiling, Sobel normal, heuristic roughness).
- **Usage**: project-owned assets. Check Cloudflare Workers AI terms and the model
  license for commercial use before distributing.

### Slots

- **Terrain** (`terrain/`): `sand`, `dirt`, `grass`, `rock`, `snow`.
- **Materials** (`materials/`): `clay`, `mud`, `adobe`, `tile`, `wood`, `textile`.
- **Buildings** (`materials/`, by architectural style — see `src/model/defs/architecture.ts`):
  - walls: `wall_adobe`, `wall_cutstone`, `wall_megalith`, `wall_fieldstone`, `wall_brick`, `wall_concrete`;
  - roofs: `roof_thatch`, `roof_flatstone`, `roof_flatmetal` (tile roofs reuse `tile`).
- **Textiles** (`materials/`, Andean uncu patterns **abstracting attested motifs** of each culture; one per
  civilization): `textile_inca`, `textile_wari`, `textile_tiahuanaco`, `textile_moche`, `textile_chavin`,
  `textile_paracas`, `textile_nazca`, `textile_chimu`. These are abstractions of a culture's attested art/textile
  motifs, not reconstructions of a specific garment (some garments are undocumented — see
  `docs/historia/atuendos.md`); civilizations without a recorded textile/iconographic tradition fall back to the
  generic `textile` weave. Reference images exist for only three of them (below); the rest are prompt-only.
- **Landscape** (`materials/`): `ground_field`, `ground_road`, `ground_path`, `ground_plaza`,
  `ground_canal`, `terrace_face`, `wall_drystone`, `corral_brush` (cultural-landscape features and the
  starting site), plus `resource_rock` (ore rocks) and `bark` (tree trunks). Applied by
  `CulturalLandscape`, `SettlementOverlay`, `ResourceNode` and `TreeInstances` via `applyGeneratedPbr`
  (falls back to their colour material when absent).

Textures are optional: `src/rendering/Biomes.ts` falls back to the procedural Canvas material when a
slot is absent (offline / without assets).

## Rigged 3D models

- **Location**: `src/assets/models/*.glb` (loaded by `src/rendering/ModelAssets.ts`).
- **`ual_mannequin.glb`**: Quaternius *Universal Animation Library* (UAL1.glb), a generic rigged mannequin used
  to validate the glTF/GLB + skeleton + mixer pipeline and as the `?rig=1` demo/fallback fixture. It is **not**
  the Caral worker anymore; the finished asset is `caral_worker.glb` below.
  - Source: <https://quaternius.com/packs/universalanimationlibrary.html> (CC0 1.0).
  - Downloaded from the CC0 mirror <https://github.com/Dallolz/moorfall-assets>
    (`animations/UAL1.glb`, licence in its `LICENSE.md`), 2026-10-20.
  - SHA-256: `69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997` (7,618,436 bytes).
  - Contents: 1 skinned `Mannequin` mesh (65-bone humanoid rig), 43 clips; the base registry maps
    `Idle_Loop`, `Walk_Loop`, `Fixing_Kneeling` and `Sword_Attack`.
  - Attribution is optional under CC0 but credited here: models/animations by Quaternius.
- **`caral_worker.glb` (Caral + Arcaico/Formative matches)**: the finished worker/scout pilot, with a reserved Inca chasqui outfit. It composes
  CC0 Quaternius **Universal Base Characters** (`Superhero_Female.glb` and `Superhero_Male.glb`, body/face),
  `Hair_Long.glb` / `Hair_SimpleParted.glb`, and **project-authored** cotton garments generated from each body
  surface, plus UAL1/UAL2 clips. Both bodies share one 65-bone skeleton (same joint order).
  - Sources (CC0 1.0), pinned at mirror commit `1e83864f55ff8646e929ac9b73faa75df29161de`:
    - <https://raw.githubusercontent.com/Dallolz/moorfall-assets/1e83864f55ff8646e929ac9b73faa75df29161de/characters/Superhero_Female.glb>
      — SHA-256 `bfdb850a4b0725f19ec6f41b02203c2ae6ac76974ddf2ff270f92b63fea104b7`.
    - <https://raw.githubusercontent.com/Dallolz/moorfall-assets/1e83864f55ff8646e929ac9b73faa75df29161de/hair/Hair_Long.glb>
      — SHA-256 `f8122525f83525c65fa6a6fb9869e6a4eb21045248c55e6e513646dbf9cb60de`.
    - <https://raw.githubusercontent.com/Dallolz/moorfall-assets/1e83864f55ff8646e929ac9b73faa75df29161de/characters/Superhero_Male.glb>
      — SHA-256 `5011951317431872ba7d9310b3bd953a9387e68f83e35c6f091395b8a49dc3ee`.
    - <https://raw.githubusercontent.com/Dallolz/moorfall-assets/1e83864f55ff8646e929ac9b73faa75df29161de/hair/Hair_SimpleParted.glb>
      — SHA-256 `1f21aeef18109c81080cb01bbbe4ad80e95550ca3e89e51f762e6d6df1981c13`.
    - UAL1 `Idle_Loop`, `Walk_Loop`, `Push_Loop`, `Punch_Jab` — SHA-256
      `69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997`.
    - UAL2 `Farm_Harvest`, `Farm_PlantSeed`, `TreeChopping_Loop`, `Walk_Carry_Loop` — SHA-256
      `0815dd05531cae9bc313fc9c0ba81330bc72f8e19ec45f73738e74ddc5796a43`.
  - Generated by `scripts/build_caral_worker.mjs` (fetches and verifies every source hash); the GLB is
    reproducible with `yarn models:build`.
  - SHA-256: `6d731024f924059fd768aa9d874809e1d4e0a39f3e6dc080f1e9a77b3da45671` (7,142,668 bytes).
  - Contents: 15 skinned meshes (female/male bodies, hair, eyes and eyebrows, worker tunic/skirt/sash,
    reserved chasqui skirt/belt, male wrap), one shared 65-bone skeleton, 10 clips (`Idle_Loop`, `Walk_Loop`,
    `Jog_Fwd_Loop`, `Sprint_Loop`, `Farm_Harvest`, `Farm_PlantSeed`, `TreeChopping_Loop`, `Walk_Carry_Loop`,
    `Push_Loop`, `Punch_Jab`), ~37.0k triangles across both gender sets (only one body/outfit set is visible per
    instance), ~1.85 m tall. The game maps `idle` (`Idle_Loop`), `walk` (`Walk_Loop`), `walk_carry`
    (`Walk_Carry_Loop`), `gather` (`Farm_Harvest`), `build` (`Push_Loop`) and `attack` (`TreeChopping_Loop` for
    the worker, `Punch_Jab` for the Scout). `Jog_Fwd_Loop` and `Sprint_Loop` are exported for a future runner
    garment; `Farm_PlantSeed` remains a future crop variant. There is no dedicated construction clip, so
    `Push_Loop` is an explicit pushing/placing abstraction. The source hair-card eyebrows were rebuilt as
    low-poly strips on each body's `Head` bone.
  - Historical basis: `docs/historia/atuendos.md` records **cotton textiles for Caral-Supe** but marks the
    specific garments, skin tone and facial features as **not documented**. The short-sleeved tunic, skirt/sash,
    reserved chasqui runner set (short-sleeve tunic, long skirt, belt, canteen, ochre headband), skin palette
    and hair are an **abstraction/plausible** treatment, not a reconstruction or a portrait. The Caral scout
    uses the commoner tunic/skirt or wrap, a manta and a plain headband, with no chasqui gear; the Chasqui
    identity and outfit are reserved for the Inca. Gender is a presentation-only
    50/50 deterministic variant (`genderForId`), not a historical ratio or a gameplay stat; Caral's gender
    division of labour is not documented. The shared `HUMAN_SKIN` (`#6b3f22`) / `HUMAN_HAIR` constants live in
    `src/model/defs/people.ts`; both CC0 body textures are recolored in the build script while preserving
    shading and facial features. No metal, footwear, horses or firearms.
  - Runtime accessories (`src/rendering/workerAttire.ts`): headband, carry bundle, digging stick, scout manta
    and reserved chasqui canteen are project-authored meshes on bones; they are not part of the GLB. The carry
    bundle is shown/tinted from the unit's real carry state. The Caral scout hides the tool, carry bundle and
    chasqui canteen. The reserved Inca chasqui set hides the tool and worker skirt/sash and shows the chasqui
    outfit.
  - Budget: both `Eyes_f` and `Eyes_m` skip the VSM shadow pass (both `castShadow` and `receiveShadow` off)
    because they are too small to cast a readable shadow; the garments keep theirs. Hidden gender/outfit meshes
    do not render. This keeps the visible worker under the **40 draws / 40k tris** budget measured in
    `docs/development/performance-audit.md`.

## Fauna (rigged)

- **Location**: `src/assets/models/quaternius_alpaca.glb` (loaded by `src/rendering/Wildlife.ts` through the same
  `ModelAssets` cache).
- **Asset**: *Alpaca* from Quaternius' **Ultimate Animated Animal Pack** (CC0 1.0). Used as the **llama pilot**:
  an Andean camelid stand-in for the existing `llama` species, not a new species. The vicuña, condor and pelican
  remain procedural in this iteration.
  - Author/pack: <https://quaternius.com/packs/ultimateanimatedanimals.html> (CC0).
  - Model page: <https://poly.pizza/m/bCVFD48i2l> (Quaternius, Public Domain/CC0 1.0).
  - Downloaded from the direct Poly Pizza file
    <https://static.poly.pizza/444228bb-745d-49b2-89ef-cc12805deaa8.glb>, 2026-10-21.
  - SHA-256: `de56fcb168469a65275a5bc10f449015b23ec849c4cda0827c6fc7278ed235b9` (1,053,804 bytes).
  - Contents: skinned alpaca (1,998 triangles, 46 bones), materials Brown/White/Grey, 26 clips. The game maps
    `Idle`, `Walk` and `Eating` to the `idle`, `walk` and `eat` rig states.
  - Fit: the llama planner still decides biome/altitude/seed; no new spawn rule is introduced. The model is
    normalised to the game's stylised camelid scale and grounded at its bind-pose feet.

## Reference images (AI generation input)

Used only as FLUX.2 multi-reference inputs (never redistributed) for the Andean textiles. Manifests in
`scripts/refs.json`; images downloaded to `scripts/_refs/` (gitignored). All sources are public domain.

| Slot | Object | Source | License |
|---|---|---|---|
| `textile_inca` | Tunic (Inca, 1450–1550) | The Met, object 313152 | Public Domain |
| `textile_wari` | Tunic (Wari, 425–550) | The Met, object 314355 | Public Domain |
| `textile_nazca` | Tunic with Confronting Catfish (Nasca-Wari) | The Met, object 307975 | Public Domain |

## Commander portraits

- **Location**: generated at runtime by `src/ui/Portrait.ts` (inline SVG, no image files).
- **Nature**: stylized medallions (bust silhouette + civilization palette + emblem + initials), **not**
  attested likenesses. Data and status live in `src/model/defs/commanders.ts`; pre-Hispanic figures are
  marked `abstraction`. Roles, dates and events follow [`docs/historia/`](./docs/historia/).

## External references (technical only, no code)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): only the **idea** of the
  slot-based PBR terrain pipeline (diffuse/normal/roughness) with blending by slope/elevation is taken.
  No files or assets from it are copied.
