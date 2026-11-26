# Asset provenance

## PBR textures

### Terrain (CC0 scans + Caral remaster)

- **Location**: `src/assets/textures/terrain/{slot}_{albedo|surface}.webp`.
- **Packing**: `_albedo` is RGB albedo with AO in the alpha channel; `_surface` is RG = normal.xy,
  B = roughness, A = height. This is two texture samples per material and feeds the terrain height blend.
- **Source manifest**: `scripts/terrain-textures.json` records the asset id, author, URL, licence, source
  SHA-256 and output SHA-256 for every slot.
- **Pipeline**: `yarn art:textures --terrain` downloads the 1k Poly Haven maps into
  `.cache/terrain-textures/` (gitignored), verifies each source SHA-256, packs the WebP and validates the
  budget. `--dry-run` and `--check` are available; KTX2 is deferred. Base/regional slots are 384² because
  512² exceeded the 2.2 MB terrain budget; `caral_grass` stays at 512².
- **Base + regional slots**: `grass`, `dirt`, `sand`, `rock`, `snow`, `puna_grass`, `coastal_gravel`,
  `jungle_floor`. The regional slots are selected by `HistoricalMapProfile.groundPbr` (puna/altiplano →
  `puna_grass`, south coast → `coastal_gravel`, Amazon → `jungle_floor`).
- **Licence (Poly Haven)**: CC0 1.0, <https://polyhaven.com/license>. Attribution is not required but is
  recorded here.
- **Caral**: `caral_grass` is derived from the Ciudades Sagradas Caral remaster v2 dry-grass map
  (CC BY 4.0, © José Amaya). Attribute “Ciudades Sagradas, José Amaya, CC BY 4.0”. The remaster's sand,
  earth and rock albedos are almost flat (the old 768² files were effectively a solid colour), so those
  Caral slots use the CC0 `sand`/`dirt`/`rock` scans plus the mission's `groundTint`; the source dry-grass
  images are copied to `art-src/textures/caral/` for reproducibility. The remaster has no displacement map,
  so `caral_grass` uses a luminance-derived height (`heightSource: derived-luminance` in the manifest); it is
  an approximation for the height blend, not a scanned height field. The remaster has no AO map either, so
  `caral_grass_albedo` is RGB (sampled AO = 1.0).
- **Historical note**: the dry grass/rock scan used for `puna_grass` is a visual abstraction of Andean
  ichu, not a species-specific botanical reconstruction.

| Slot             | Source              | Author             | Licence   | Size | Output SHA-256 (albedo / surface) |
| ---------------- | ------------------- | ------------------ | --------- | ---- | --------------------------------- |
| `grass`          | `grass_ground`      | Charlotte Baglioni | CC0 1.0   | 384² | `5b01845156e8…` / `501876e4b835…` |
| `dirt`           | `brown_mud_02`      | Rob Tuytel         | CC0 1.0   | 384² | `b9ad3f28ed42…` / `4d61153de256…` |
| `sand`           | `coast_sand_01`     | Rob Tuytel         | CC0 1.0   | 384² | `7615b9b2aeee…` / `2cdc74da9ec7…` |
| `rock`           | `aerial_rocks_01`   | Rob Tuytel         | CC0 1.0   | 384² | `1f49ee03f780…` / `727d8e410858…` |
| `snow`           | `snow_01`           | Rob Tuytel         | CC0 1.0   | 384² | `57e237cf34ea…` / `f163500254f4…` |
| `puna_grass`     | `aerial_grass_rock` | Rob Tuytel         | CC0 1.0   | 384² | `0f2dd5dca801…` / `bb8cb86447d6…` |
| `coastal_gravel` | `coast_sand_03`     | Rob Tuytel         | CC0 1.0   | 384² | `5ad8a4a8c1d9…` / `8077da9c61f0…` |
| `jungle_floor`   | `forrest_ground_01` | Rob Tuytel         | CC0 1.0   | 384² | `80ac504545e9…` / `79d63c4f1c0c…` |
| `caral_grass`    | Caral remaster v2   | José Amaya         | CC BY 4.0 | 512² | `f7b7168a92fa…` / `72080e535a95…` |

All sources were retrieved on **2026-11-03**; `scripts/terrain-textures.json` stores the date, full source
URLs, source hashes and output hashes per slot. The old AI-generated terrain albedos/normals/roughnesses are
no longer part of the build.

### Materials (AI-generated)

- **Location**: `src/assets/textures/materials/{mat}_{diffuse|normal|roughness}.webp`.
- **Generation**: albedo with **Cloudflare Workers AI** (`@cf/black-forest-labs/flux-2-dev`,
  multipart inputs), via `scripts/gen_textures.py` (prompts in `scripts/prompts_textures.json`).
  Earlier material albedos were generated with `@cf/black-forest-labs/flux-1-schnell`.
- **Post-processing**: `scripts/post_textures.py` (tiling, Sobel normal, heuristic roughness).
- **Usage**: project-owned assets. Check Cloudflare Workers AI terms and the model
  license for commercial use before distributing.

### Slots

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

## Blender render assets

- **Location**: `public/media/generated/{campaigns,education,tours}/`. These files are served as static
  assets and are not bundled into the JavaScript.
- **Manifest**: `src/art/manifest.json` is the canonical machine-readable provenance. The ingestion also writes
  `public/media/generated/manifest.json` (copy) and `public/media/generated/PROVENANCE.md` (human-readable table).
  Do not edit either by hand; use `yarn art:review` for the review flag.
- **Source**: the editable Blender project lives in `art-src/blender` (`.blend` in Git LFS). The repository
  stores the source manifest (`art-src/blender/caral/renders.json`), the asset table
  (`art-src/blender/caral/caral_asset_manifest.csv`) and the hashes of the source renders and `.blend`/`.glb`
  files in [`art-src/blender/caral/README.md`](./art-src/blender/caral/README.md). GIMP `.xcf` sources live in
  `art-src/gimp/projects` (Git LFS). Blender and GIMP are authoring tools, not CI dependencies.
- **Generation**: `yarn art:blender` verifies each source PNG SHA-256, converts it to budgeted WebP with `sharp`,
  writes the manifest/provenance and validates the result. It never calls an AI provider and never runs Blender.
- **Provenance fields**: each record stores the render description, `promptVersion`, civilization, period, era,
  region, scene file, source render, source hash, Blender asset id, confidence (`documentado`, `blockout`, …),
  camera, renderer, licence, author, render date, dimensions, bytes and SHA-256.
- **Nature**: each asset is marked `reconstruction`, `abstraction`, `concept-art` or `reference`. A render is an
  artistic reconstruction, **not a historical photograph**; the UI always renders the disclaimer.
- **Review**: renders are ingested with `reviewed: false`. The game shows only reviewed assets by default;
  `?art=all` previews drafts with a “Borrador sin revisar” badge. Approve with
  `yarn art:review --id=… --reviewer=… --approve`.
- **Pilot**: Caral / Arcaico Tardío (`m1_caral`), documented in
  [`docs/design/blender-art.md`](./docs/design/blender-art.md). The set covers a campaign introduction,
  architecture, the circular plaza/altar, an orthographic educational map and a tour concept. Caral has no
  documented war or ruler names; its clothing/faces are not documented, so no character-reference render is
  claimed.
- **Licence**: the renders are project-owned; audit the `.blend` scenes for external textures/HDRIs/models and
  record their licences before publishing.
- **GLB exports**: the raw source `caral_pyramide_mayor.glb` and `caral_rts_kit.glb` are recorded for
  provenance but are not used at runtime. The modular `caral_pyramid_mayor_lod0.glb` is now the Caral
  landmark; the procedural landmark remains the fallback. The full city and raw kit stay showcase/source.
- **Archived AI pipeline**: the earlier AI-illustration spike is archived on the `feat/visual-ai-pipeline`
  branch and is not part of this branch.

### GIMP 2D retouching

- **Sources**: `art-src/gimp/projects/*.xcf` (Git LFS).
- **Exports**: `art-src/gimp/exports/` or the final PNG in `art-src/blender/renders/` when a
  render is retouched.
- **Tool**: GIMP 3.2.6 via `gimp3-mcp` (localhost:9877). GIMP is an authoring tool, not a CI
  dependency and never a runtime dependency.
- **Rules**: non-destructive XCF, sRGB/8-bit, no invented historical details, no AI upscaling,
  and the final file hash must be updated in the corresponding manifest.
- **Assets**: 2D retouching does not change the “artistic reconstruction, not a photograph”
  disclaimer.

### Mission decor GLBs (m5-m9)

- **Location**: `src/assets/sites/{chanca,chimu,colonial,independence,arica}/`.
- **Source**: `art-src/blender/mission-decor/` (Git LFS), rebuilt by
  `scripts/blender/build_mission_decor.py`.
- **Content**: dedicated low-poly abstractions of the Chanca fortress, Chimú compound, Cusco
  ushnu, colonial church, independence chapel/camp and Arica battery. They are visual-only and replace the
  procedural landmark in those missions; the procedural builder remains the fallback.
- **Confidence**: project-owned abstractions, not surveys or reconstructions of a specific
  standing building. Hashes and sizes are recorded in
  [`art-src/blender/mission-decor/README.md`](./art-src/blender/mission-decor/README.md).

### Caral vegetation kit (huarango, sauce, pacae, caña brava, carrizo, totora)

- **Location**: `src/assets/vegetation/caral/caral_<species>_lod0.glb` and `_lod1.glb`.
- **Source**: generated in Blender by `scripts/blender/build_caral_vegetation_kit.py` (shapes shared
  with the vertical-slice diorama, `scripts/blender/build_caral_slice.py`); the kit scene is saved to
  `art-src/blender/scenes/caral_vegetation_kit.blend` (Git LFS). Uncompressed exports and per-species
  manifests (triangles, draw calls, bounds, budget) live in `art-src/blender/exports/caral/vegetation/`;
  the game copies were meshopt-compressed with `yarn art:models`.
- **Content**: project-owned procedural geometry and a generated leaf-cluster texture; no third-party
  scans or textures. LOD0/LOD1 stay within the art-direction budgets (huarango 1500/400, sauce 1200/350,
  pacae 1100/320, caña brava 600/150, carrizo 400/120, totora 400/120 tris).
- **Runtime**: the huarango draws the `algarrobo` tree variant (both are _Prosopis_) and the willow the
  `sauce` variant on every map; totora props everywhere; caña brava and carrizo only along the Supe in
  m1. The Caral food nodes are instanced pacae shrubs (`PropKitInstances`), upright on the terrain and
  with LOD1 beyond 30 units. Procedural geometry remains the fallback until the GLBs load.
- **Confidence**: species and zones documented in `docs/historia/campanas/caral.md`; shapes are stylized
  (art-direction.md §7), not botanical surveys. The pacae (guaba) fruit is listed among the documented
  valley crops; its shrub form, the leaf atlas and the pod placement are inferred.
- **Evidence**: `node scripts/shots_evidence.mjs --scene=caral-pacae --out=review/evidence/caral-pacae`
  captures a close-up and the RTS view; the two frames compose `docs/media/caral-pacae.webp`.

### Tambotoco highland vegetation kit (molle, pacay, ichu)

- **Location**: `src/assets/vegetation/andes/andes_{molle,pacay,ichu}_lod{0,1}.glb`.
- **Source**: generated in Blender 5.3.0 by `scripts/blender/build_andes_vegetation_kit.py` (shared
  bmesh helpers in `scripts/blender/build_caral_slice.py`); scene
  `art-src/blender/scenes/tambotoco_vegetation_kit.blend` (Git LFS). Per-species manifests live in
  `art-src/blender/exports/tambotoco/vegetation/`; game copies were meshopt-compressed with
  `yarn art:models`.
- **Content**: project-owned procedural geometry and a generated leaf-cluster atlas; no third-party scans
  or textures. Molle LOD0 1,362 / LOD1 360 triangles; pacay 1,048 / 316; ichu 144 / 42. Total game copies
  ≈216 KB.
- **Confidence**: **inferred**. The species set comes from the pilot's plausible highland list
  (`docs/design/tambotoco-art-pilot.md` §3) and the puna context in `docs/historia/mapas.md` (ichu);
  no period source names molle or pacay for this valley. Molle (_Schinus molle_), pacay (_Inga feuillei_)
  and ichu are real Andean species; their exact forms, leaf atlas and placement are a game reconstruction,
  not a botanical survey or a documented individual.
- **Runtime**: `MapOverrides.vegetationKit: 'andes'` in `m_tambotoco` selects the highland tree set
  (`molle`, `pacay`, and the shared Caral willow for `sauce`); the loader is `vegetationKitLoader.ts`.
  The ichu GLB is built and budget-verified, but the visible ground cover still uses the procedural
  `GroundCover` ichu tufts; the generic `shrub` prop remains procedural on this map.
- **SHA-256**:
  - `andes_molle_lod0.glb` `f0491a78c5398fa9a3c229bef015b17232825f77376b6226470a8fe26d6024dc` (67 KB)
  - `andes_molle_lod1.glb` `b6732848e50450e49144c62c2aca8a52d67c975b0b1a3c3fb2c9e40eafbd4a33` (46 KB)
  - `andes_pacay_lod0.glb` `506f359fc73a033ec1c7971418cc2c5b9b2b928834ebd0ea3a7f2c6f64882c39` (55 KB)
  - `andes_pacay_lod1.glb` `8390f97b433f4c68e8d325af5b123ca2b927cd80b4199d2274319201db5d9d91` (40 KB)
  - `andes_ichu_lod0.glb` `50a1e9e561f1f97914e62622d6eb51ddae18a7f077f9fb58ceb11db8104f0f2b` (5 KB)
  - `andes_ichu_lod1.glb` `851c1d4f7de916caeabae3cadc06e188daa276c2740dc7ca75f254622c81c0c4` (3 KB)

### Tambotoco E3a highland vegetation captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-e3a-wide-{before,after}.webp` and
  `docs/media/tambotoco-e3a-trees-{before,after}.webp`, 960x540 WebP q58, ~88 KB.
- **Source**: captured from the game by `scripts/capture_art_pilot.mjs` at 1600x900, seed 777, HUD hidden,
  site at `fundada`, fog of war off. `before` is the E2b scene at `ae9e489`; `after` is the andes kit.
  Regenerate the after set with
  `yarn art:pilot --tag=e3a8 --quality=neutral --sizes=1600x900 --views=wide,trees,hualla`; the before
  trees use the same view and script checked out at `ae9e489`.
- **Content**: in-engine shots of the game's own scene. The highland tree kit is project-owned and
  `confidence: inferred`; the ichu ground cover is the procedural instancer at a trimmed 0.08 budget.
- **Review**: no human art-review gate applies to in-engine captures; the kit is reviewed through this PR.

### Tambotoco E4 hero and Killke/ayllu variants (in-engine evidence)

- **Location**: `docs/media/tambotoco-e4b-hero-{before,after}.webp` and `tambotoco-e4b-hero54.webp`, 960x540 WebP q58,
  ~55 KB.
- **Source**: `yarn art:pilot --tag=e4b2 --quality=neutral --sizes=1600x900 --views=hero,hero54` on this branch;
  `before` is `d32c526` (E3b, Chanca proxy). The `hero` view stages Ayar Manco and a worker at the hualla.
- **Content**: the worker uses the CC0 `caral_worker` asset with the Killke variant; Manco uses the male-only
  `tambotoco_hero.glb` (same body/skeleton, Killke outfit with a longer hero tunic, 6 clips; E4b shipped
  1.38 MB, E7 replaced it with the 1.45 MB baked-proportion asset and the animation pass raised it to
  1.55 MB). E4a selects the Killke and
  valley-ayllu palettes instead of the Chanca proxy.
- **Review**: presentation abstraction; no attested Ayar likeness or garment survives, so the accent and
  silhouettes remain a game convention.

### Tambotoco E3b stream banks, ford and paths (in-engine evidence)

- **Location**: `docs/media/tambotoco-e3b-{bank,path,ford,close}-{before,after}.webp`, 960x540 WebP q58, ~181 KB.
- **Source**: captured from the game by `scripts/capture_art_pilot.mjs` at 1600x900, seed 777, HUD hidden,
  site at `fundada`, fog of war off; `before` is the E3a build (`184285b`), `after` this branch. Regenerate
  with `yarn art:pilot --tag=e3b-final3 --quality=neutral --sizes=1600x900 --views=bank,path,ford,close,wide`.
- **Content**: in-engine shots of the game's own terrain. The wet-margin and ford-bar weights are generated
  by `scripts/build_tambotoco_heightmap.py` into `src/model/defs/tambotocoHeightmap.ts` (project-owned, no
  third-party data; the heightfield and walkable cells are unchanged, but the paint feeds tree/resource
  selection, hence `REPLAY_VERSION` 40). The path paint and instanced bank/path stones are procedural.
- **Review**: no human art-review gate applies to in-engine captures; E3b is reviewed through its PR.

### Caral fauna kit (deer, riparian bird)

- **Location**: `src/assets/fauna/caral/caral_deer.glb` and `caral_bird.glb`.
- **Source**: generated in Blender by `scripts/blender/build_caral_fauna_kit.py`; kit scene
  `art-src/blender/scenes/caral_fauna_kit.blend` (Git LFS); uncompressed exports and manifests (parts,
  pivots, triangles per animal) in `art-src/blender/exports/caral/fauna/`. `yarn art:models` compresses
  them without joining nodes, because the game animates the named `body`/`leg`/`wing` parts.
- **Content**: project-owned procedural geometry with per-vertex colour; deer 976 and bird 348 triangles
  per animal (budget 5000). The procedural templates in `src/rendering/faunaModels.ts` share the pivots and
  remain the fallback.
- **Runtime**: only the m1 Caral valley plan (`planCaralValleyFauna`) places them: deer groups grazing on
  dry riverside ground and bird flocks that lift and settle over the water's edge. Visual only.
- **Confidence**: deer and birds in the Supe riparian forest are documented (Shady, in
  `docs/historia/campanas/caral.md`); the bird species is not named there, so the model is a generic
  small bird. Shapes are stylized. Manifests record it: the deer `documented`, the bird `inferred`.
- **Review**: approved by a human review on 2026-11-14 (Miguel Amaya; `reviewer` and `reviewedAt` in each
  manifest), checked in game rather than as raw exports, since the game assembles and animates the parts.

### Caral architecture kit (the Sacred City in use)

- **Location**: `src/assets/architecture/caral/caral_<piece>_lod0.glb` and `_lod1.glb`: the Pyramid Mayor in
  use and in three construction phases (`pyramid_mayor_phase1` foundation, `_phase2` fill, `_phase3`
  finished), a smaller pyramid, the sunken circular plaza, common and elite quincha houses, an Áspero
  fishing house, a fair tent, Áspero's Huaca de los Ídolos (`huaca_idolos`: three superposed terraces
  with summit rooms; growth in phases with offerings documented, form and rooms assumed), the Act III
  construction camp (`camp_shelter`, `shicra_stack`, `stone_yard`) and the future-city pieces
  (`pyramid_small_phase1`, `survey_stake`).
- **Source**: generated in Blender by `scripts/blender/build_caral_architecture_kit.py`; kit scene
  `art-src/blender/scenes/caral_architecture_kit.blend` (Git LFS). Uncompressed exports and per-piece
  manifests (triangles, materials, bounds, budget, `confidence`, sources, review state) live in
  `art-src/blender/exports/caral/architecture/`; the game copies were meshopt-compressed with
  `yarn art:models`.
- **Content**: project-owned procedural geometry, 8 Principled materials (plaster white/ochre/red,
  stone, shicra, earth, wood, cane mat) with world-scale box-projected UVs and a per-vertex tint (grime at
  the foot of terraces, worn bevels, mottling); the GLBs carry no textures. At runtime the game maps the
  shared generated sets already in `src/assets/textures/materials/` (`wall_drystone` for set stone,
  `roof_thatch` for shicra and cane, `wood`) and the project-generated `plaster_detail` set
  (`scripts/art/make_plaster_detail.py`, procedural, 256 px, ~9 KB) onto plaster, floors and earth.
  LOD0 ≤ 5000 and LOD1 ≤ 1500 triangles per piece.
- **Runtime**: m1 assembles the city from `src/model/defs/caralCity.ts` and draws it in place of the ruins
  GLB (`caral_site_lod*.glb`), which stays the fallback while the kit loads and then only keeps its
  clickable heritage nodes (hidden); pathing uses the monuments' and the kit houses' blockers. Act III of
  `docs/design/caral-model-mission.md` raises the Pyramid Mayor through its phase models
  (`Game.setSitePhase`, `CaralCity.setMayorPhase`), the other monuments appear with their phase, Áspero
  (the huaca and six fishing houses) stands on the shore from act I, and the fair tents go up once the
  city is in use.
- **Construction camp (issue 422)**: from `foundation` until `in_use`, `CARAL_CAMP_LAYOUT` places two cane
  ramadas, three shicra heaps and a dressed-stone yard on the Mayor's west apron; they bake into the city's
  existing materials and their footprints block pathing while they stand. `SiteCrew` (issue 422) adds six
  presentation-only `caral_worker` rigs that carry bags from the heap to the wall and shrink to three at
  `finished`; they are not units, carry no selection or obstacles, and stay on the ground because the
  dossier explicitly lists scaffolding as undocumented and not modelled. The shicra fill and the phased
  platforms are documented; the camp's form, the crew and its route are assumed, and the shicra heap and
  the dressed-stone yard are inferred arrangements of documented materials.
- **Future city (issue 422)**: from `foundation`, the five smaller complexes stand as low walled
  platforms with shicra fill (`pyramid_small_phase1`) and swap to the finished model at `finished`; the
  main sunken plaza is staked with cord and stakes until `fill`, and the amphitheatre plaza until
  `in_use`. The started platforms block from foundation, but their monument cards and the six-complex
  tour still wait for `finished` (`CARAL_HERITAGE_BLOCK_SINCE` vs `CARAL_HERITAGE_SINCE`). Phased
  platforms and shicra fill are documented; that the five were started alongside the Mayor, the cord
  survey and the exact construction form are inferred. The Anfiteatro temple and the Altar Redondo still
  appear whole at `in_use` (their plaza is staked); starting them is left for a later pass.
- **Approaches and valley edge (issue 433)**: from `foundation`, one compacted-gravel approach is painted
  into the terrain splat from Áspero's base across the Supe's southern ford (`CARAL_FORDS`) to the
  valley foot of the Lower Half, west of the Anfiteatro (`src/model/defs/caralValley.ts`). It reuses the settlement road mechanism
  (`Terrain.paintTrail`) and adds no ribbon, obstacle or pathfinding entry. Small groups of decorative
  algarrobos and willows grow along the west edge of the valley, clear of the city keep-out, the
  camp, fields and existing resource nodes. They share the vegetation kit and tree batch, but have no
  `ResourceNode`, yield, obstacle or picking id. The exact route and the grove positions are inferred
  game abstractions; the valley paths, riparian grove and huarango terraces are documented.
- **Evidence**: `node scripts/shots_evidence.mjs --scene=caral-camp --out=review/evidence/caral-camp`
  captures the camp close up, the medium RTS camp, the staked plaza, the Act III works (`act3`), the
  painted approach, the edge groves and a wide context frame. Stitch `close.png` + `camp.png` for
  `docs/media/caral-camp.webp`, `close.png` + `act3.png` for `docs/media/caral-act3.webp` (both
  3200 × 900, quality 82) and `approach.png` + `grove.png` + `act3.png` + `rts.png` into
  `docs/media/caral-approaches.webp` (3200 × 1800, quality 80).
- **Late-period maize** (issue 353): during the Act IV drought one ridge of the player's valley field
  sows maize instead of squash (`isLatePeriod` in `model/defs/sites.ts`, `BuildContext.caralLate` in
  `buildValleyField`). Maize is documented for the late period and in little quantity; the amount, rows
  and plant shape are inferred game abstractions.
- **Evidence**: `node scripts/shots_evidence.mjs --scene=caral-late-field-before --out=review/evidence/caral-late-field-before`
  and `--scene=caral-late-field` capture the same field without and with the drought (two game states of
  one commit, not two code states; the scene places its own field and hides units and place labels).
  Stitch `field.png` (both) over `field-rts.png` (both) into `docs/media/caral-late-maize.webp`
  (3200 × 1800, quality 80).
- **Confidence** (per piece in the manifests; evidence in `docs/historia/campanas/caral.md` and
  `docs/historia/civilizaciones/caral.md`): stepped superposed platforms, shicra fill, stone retaining
  walls, painted plaster, sunken circular plazas, quincha houses, cotton nets and gourd floats and fair
  tents are documented; the colour of each building and the layout on the game map are inferred; the
  platform count and proportions, the summit enclosure, the side walls of the stairs and the parapets,
  the set stone left visible at the foot of each terrace (a reading aid; the documented walls are
  plastered), roofs, the net rack and the tent's frame and cover are assumed. No scaffolding is modelled because none is attested. The models are artistic
  reconstructions, not surveys. The original city pieces were exported `reviewed: false` and approved by a
  human review on 2026-11-07 (Miguel Amaya; `reviewer` and `reviewedAt` in each manifest). The camp pieces
  (shelter, first-phase small pyramid, shicra stack, stone yard, survey stakes) were approved by a human
  review on 2026-11-14 (Miguel Amaya), together with the vegetation and household props; a rebuild exports
  every piece unreviewed again.

### Tambotoco hero kit (cave and Huanacaure huaca)

- **Location**: `src/assets/architecture/tambotoco/tambotoco_{cave,huaca}_lod{0,1}.glb`.
- **Source**: generated in Blender 5.3.0 by `scripts/blender/build_tambotoco_hero_kit.py`; scene
  `art-src/blender/scenes/tambotoco_hero_kit.blend` (Git LFS). Per-piece manifests with triangles,
  materials, bounds, budget, sources and review state live in `art-src/blender/exports/tambotoco/`; the
  game copies were meshopt-compressed with `yarn art:models`.
- **Content**: project-owned procedural geometry, Principled materials only, no textures.
  - Cave: an irregular rock massif around a dark five-sided recess, a rough front lintel/jambs, a scree
    apron and two torch brackets. LOD0 1,802 triangles / 4 materials; LOD1 342 / 3.
  - Huanacaure huaca: a tapered monolith with a carved niche, base, cap, offering ledge and two flanking
    stones. LOD0 288 triangles / 3 materials; LOD1 104 / 3.
- **Confidence**: **assumed**. The cave and the monolith are stylizations of the myth; the dossier records no
  dated or documented form, and `docs/historia/arquitectura.md` marks the Huanacaure niche as a stylization,
  not an imperial architectural niche.
- **Runtime**: `AylluSite.setHeroAssets` swaps the procedural cave/huaca for the GLB after both LODs load
  (`loadTambotocoHeroAssets`); a failed load keeps the procedural fallback. LOD0 draws below the 70-unit
  camera zoom, LOD1 above. The models use the authored cave (40, 55) and shrine (120, 106) positions and
  the shrine platform top; `WorldViewDecor` applies the site's fog mask after the swap.
- **Pivot and collision**: the cave origin is the mouth threshold at ground level (the massif extends
  behind it); the huaca origin is its base centre. The GLBs carry no collision: the cave and shrine blockers
  in `src/model/defs/sites.ts` own pathing.
- **SHA-256**:
  - `tambotoco_cave_lod0.glb` `551b362873b93db44341921d087627947548d4f60c6dcdff63b7b21016355974` (65 KB)
  - `tambotoco_cave_lod1.glb` `bfb63483207bfa92c0a70ed0a901845467c4ffafac7056bb25bf3ff06d9c401c` (16 KB)
  - `tambotoco_huaca_lod0.glb` `3466c8908c9a086ac1f30bebf64cb5c4a8854009b894f9d381d4ca9bef086e67` (14 KB)
  - `tambotoco_huaca_lod1.glb` `199ba0b82e57ae9b25f6b6c9f8d3295e681880066b7bdd7e3df4702dcee24dc1` (8 KB)

### Caral prop kit (quarries and household goods)

- **Location**: `src/assets/props/caral/caral_<piece>_lod{0,1}.glb`: the `granodiorite` quarry outcrop and
  the seven household pieces of an Áspero base (`hearth`, `drying_rack`, `basket`, `gourd`, `bench`,
  `windbreak`, `cotton`).
- **Source**: generated in Blender by `scripts/blender/build_caral_props_kit.py`; kit scene
  `art-src/blender/scenes/caral_props_kit.blend` (Git LFS). Per-piece manifests live in
  `art-src/blender/exports/caral/props/`; the game copies were meshopt-compressed with `yarn art:models`.
- **Content**: the household set shares four architecture materials (`MAT-Arch_Stone`, `_Wood`,
  `_CaneMat`, `_PlasterWhite`) with world-scale box-projected UVs re-scaled for sub-metre props, plus a
  per-piece and per-material `COLOR_0` tone (ash-dark hearth, pale gourds, raw cotton) over the usual
  grime. `SettlementDressing` bakes every placement of a base into one mesh per material and LOD (no
  shadow pass: the pieces are 0.2-1.2 m and the buildings already anchor the shadows) and swaps LOD1 at
  30 units from the camera focus. If a GLB fails, the base keeps its procedural dressing.
- **Confidence** (the dossier's own scale, `docs/historia/campanas/caral.md`): `hearth` and `cotton` are
  `documented` (stone-heated cooking pits and the cotton crop are in the dossier; the ring form and the
  mat-and-spindle arrangement are the reconstruction). `basket` and `gourd` are `inferred`: shicra bags
  are documented as construction fill, and calabaza and the mates as net floats are documented, but the
  domestic basket and the cut mate bowl are inferred uses of them. `drying_rack`, `bench` and
  `windbreak` are `assumed` (plausible reconstructions of documented materials; the net rack and the
  mates' place in the fishing house are listed as such). The outcrop's shape is `inferred`. Every piece
  ships `reviewed: false` until a human review records `reviewer` and `reviewedAt`; a rebuild exports it
  unreviewed again.

### Caral intro and act-card images (in-engine recreations)

- **Location**: `public/media/caral/intro-{aspero,valle,obra,ciudad,sequia,partida}.webp` (960x540,
  WebP q58, ~160 KB in total).
- **Source**: captured from the game itself by `scripts/capture_caral_intro.mjs`. Each m1 scene is
  staged through the debug harness (construction phase, drought, worker orders), rendered without the HUD
  at 1600x900 and resized with `sharp`; the works and the drought use a low cinematic camera. Regenerate
  them with `node scripts/capture_caral_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime (menu)**: the menu reuses `intro-ciudad` as the pre-Inca campaign card and `intro-aspero` as
  m1's art in the "Tu senda" card and the briefing, captioned as an engine recreation.
- **Review**: approved by a human review on 2026-11-07 (Miguel Amaya), after re-framing the works and
  the drought.
- **Content**: project-owned game renders (terrain, architecture and vegetation kits listed above). They
  are recreations of the game's own scenes: never historical photographs, and not Blender renders (so not
  in `src/art/manifest.json`).
- **Runtime**: m1's narrated intro (`MissionDef.intro`), the act II-IV chapter cards (`act` effect
  `image`) and the victory epilogue backdrop (`MissionDef.epilogueImage`).

### La Ciudad de los Reyes intro, chapter and epilogue images (in-engine recreations)

- **Location**: `public/media/lima/intro-{ciudad,rimac,cerco,epilogo}.webp` (960x540, WebP q58, ~82 KB in
  total).
- **Source**: captured from the game itself by `scripts/capture_lima_intro.mjs`. The plaza/church, the Rímac
  crossing, the hills of Quizu and the dusk view are staged through the debug harness, rendered without the
  HUD at 1600x900 and resized with `sharp`. Regenerate them with `node scripts/capture_lima_intro.mjs`
  (one with `--only=ID`) after art changes.
- **Runtime (menu)**: the briefing uses the approved Blender render
  `media/generated/campaigns/virreinato/m_lima/intro.webp`; `intro-ciudad` remains the Virreinato campaign card
  and the intro beats, Act II/III chapter cards and victory epilogue use the captures.
- **Content**: project-owned game renders (authored coast terrain, the reused colonial plaza and the
  procedural settlements). They are recreations of the game's own scenes: never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status in `src/art/manifest.json`.

### Lima 1821 intro and epilogue images (in-engine recreations)

- **Location**: `public/media/lima-1821/intro-{plaza,callao,epilogo}.webp` (640×360, WebP q28).
- **Source**: captured from the game itself by `scripts/capture_independencia_arc.mjs` on the 1821 Lima
  coast transect: the Lurín road and patriot camp, the Plaza Mayor, the Callao beach and a low epilogue.
  Rendered without the HUD at 1600×900 and resized with `sharp`. Regenerate with
  `node scripts/capture_independencia_arc.mjs --only=ID` after art changes.
- **Runtime**: the briefing uses `intro-plaza`; the intro beats are cinema stills (`cine-*`, below); the
  Act II/III cards use `intro-plaza` and `intro-callao`; the epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (the reused `lima_site` colonial kit at the `ciudad` phase and the
  procedural camp/wildlife). They are recreations of the game's own scenes: never historical photographs,
  and not Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status in `src/art/manifest.json`.

### Real Felipe intro and epilogue images (in-engine recreations)

- **Location**: `public/media/real-felipe/intro-{bastion,baterias,epilogo}.webp` (640×360, WebP q28).
- **Source**: captured from the game itself by `scripts/capture_independencia_arc.mjs` on the Callao
  terrace: the bastion from the sea side, the battery line, the siege camp and a low epilogue. Rendered
  without the HUD at 1600×900 and resized with `sharp`. Regenerate with
  `node scripts/capture_independencia_arc.mjs --only=ID` after art changes.
- **Runtime**: the briefing uses `intro-bastion`; Act II uses `intro-baterias`; Act III and the epilogue use
  `intro-epilogo`. The intro beats are cinema stills (`cine-*`, below).
- **Content**: project-owned game renders (the reused `arica_site` coastal-fort composition and the
  procedural camp). The Real Felipe is a labelled abstraction, not a survey of the star fort; the images
  are recreations of the game's own scenes, never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused `arica_site` GLB keeps its
  own review status (#343). A dedicated star-fort kit is future work.

### Los hijos de Tambotoco intro, chapter and epilogue images (in-engine recreations)

- **Location**: `public/media/tambotoco/intro-{huanacaure,valle,traza,epilogo}.webp` (960x540, WebP q58,
  ~112 KB in total; re-shot in E5 on 2026-11-17).
- **Source**: captured from the game itself by `scripts/capture_tambotoco_intro.mjs`. The cave with the party
  leaving it (no centre, dwellings or huts: the mission starts with nothing built), the Huanacaure monolith,
  the inhabited hualla valley, the traced Inticancha and the founded settlement at dusk are staged through the
  debug harness, rendered without the HUD, world labels, nameplates or hero markers at 1600x900 and resized
  with `sharp`. The three beats follow a hero/detail/wide grammar (the eye is lifted above the local ground so
  a low shot never ends up inside the slope). Regenerate them with
  `node scripts/capture_tambotoco_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime (menu)**: `intro-huanacaure` is the Inca campaign card; the Act II–IV chapter cards and the
  victory epilogue use the captures. The intro beats are cinema stills (`cine-*`, below).
- **Content**: project-owned game renders (authored terrain, the procedural ayllu site and the
  units). They are recreations of the game's own scenes: never historical photographs and not a claim
  that the Ayar myth happened.
- **Review**: no human art-review gate applies to in-engine captures; the procedural ayllu site has no GLB
  manifest entry, and the Chanca pucará GLB is tracked in #343, not in the manifest.

### Tambotoco E5 shot grammar and foundation beat (in-engine evidence)

- **Location**: `docs/media/tambotoco-e5-cards-{before,after}.webp` (2x3 contact sheets, 1280x1182 WebP q60,
  ~112 KB in total) and `docs/media/tambotoco-e5-fundacion.webp` (960x540 WebP q60, ~20 KB).
- **Source**: the `before` cards are `public/media/tambotoco/intro-*` at `cde2e9d`; the `after` cards are the
  same files re-shot by `scripts/capture_tambotoco_intro.mjs` on this branch, and
  `node scripts/compare_tambotoco_beats.mjs --before=cde2e9d` composes both sheets. The foundation capture is
  produced by `node scripts/capture_tambotoco_foundation.mjs`: the in-game `t_inticancha` cue (camera at the
  authored plaza, zoom 29, site phase `inticancha`, a scripted communal store and the Ayar Auca stone) staged
  through the debug harness at 1600x900 with the HUD hidden.
- **Content**: project-owned game renders of the game's own scene. The myth remains a **Leyenda**: the cave
  and the huaca are abstractions, never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the ayllu site is procedural.

### Geographic identity close-out evidence (in-engine contact sheets)

- **Locations**: `docs/media/geographic-identity-closeout.webp` (2100x788 WebP q78, 102 KB) and
  `docs/media/geographic-identity-closeout-before-after.webp` (2100x788 WebP q78, 91 KB).
- **Source**: `yarn shot blind-<id> --url="/?mission=<id>&seed=777&fog=0&intro=0" --click --site --height=78
  --no-hud --no-labels --wait=6000` for `m_vilcabamba`, `m6b_guerra_civil`, `m_lima_1821`, `m_miraflores`,
  `m_tarapaca` and `m_real_felipe`; tiled 3x2 with Pillow at 700x394 per cell. The before row reuses the
  `audit-*` captures taken with the same camera before the slice (they still carry the in-world place names,
  because `--no-labels` did not exist yet).
- **Content**: project-owned game renders with the HUD and the in-world place names hidden, SwiftShader. Top
  row Vilcabamba, Quipaipan, Lima 1821; bottom row Miraflores, Tarapacá, Callao. The first sheet is the blind
  test material (six images, six geography briefs, two independent reviewers); the second is the before/after
  for the three pairs (Vilcabamba, Quipaipan, Callao).
- **Review**: no human art-review gate applies to in-engine evidence captures; the blind reviewers are agents,
  not players, and that limitation is recorded in the matrix.

### Geographic identity Phase 3 evidence (in-engine contact sheet)

- **Location**: `docs/media/geographic-identity-phase3.webp` (1400x788 WebP q80, 86 KB).
- **Source**: `node scripts/screenshot.mjs p3-<name> --url='/?mission=<id>&intro=0&fog=0&seed=777' --click
--wait=7000 --site --no-hud` for `m6b_guerra_civil`, `m_tarapaca`, `m_vilcabamba` and `m_brena`; tiled 2x2
  with ffmpeg at 700x394 per cell.
- **Content**: project-owned game renders with the HUD hidden, SwiftShader. Top row Quipaipan and Tarapacá,
  bottom row Vilcabamba and Breña: the three confusable pairs widened by landform (pampa hills vs deep dry
  quebrada, narrow steep valley vs broad terraced one).
- **Review**: no human art-review gate applies to in-engine evidence captures.

### Geographic identity Phase 2 evidence (in-engine contact sheet)

- **Location**: `docs/media/geographic-identity-phase2.webp` (2000x562 WebP q80, 105 KB).
- **Source**: `node scripts/screenshot.mjs geo-<letter> --url='/?mission=<id>&intro=0&fog=0&seed=777' --click
--wait=7000 --site --no-hud` for `m6b_guerra_civil`, `m_cusco_1536`, `m_lima_1821`, `m_miraflores`,
  `m_real_felipe`, `m_tarapaca`, `m_vilcabamba` and `m_brena`; tiled 4x2 with ffmpeg at 500x281 per cell.
  The same eight captures, shuffled, fed the blind identification test recorded in the roadmap.
- **Content**: project-owned game renders with the HUD hidden, SwiftShader. Top row Quipaipan, Cusco 1536,
  Lima 1821, Miraflores; bottom row Real Felipe, Tarapacá, Vilcabamba, Breña. Shows the per-mission painted
  ground derived from each field, not a finished site composition.
- **Review**: no human art-review gate applies to in-engine evidence captures.

### Geographic identity Phase 1 evidence (in-engine contact sheet)

- **Location**: `docs/media/geographic-identity-phase1.webp` (2000x562 WebP q80, 100 KB).
- **Source**: `node scripts/screenshot.mjs phase1-<id> --url='/?mission=<id>&intro=0&fog=0&seed=777' --click
--wait=7000 --site` for all seven Phase 1 missions (`m6b_guerra_civil`, `m_lima_1821`, `m_miraflores`,
  `m_real_felipe`, `m_tarapaca`, `m_vilcabamba`, `m_brena`); tiled 4 + 3 (centred) with ffmpeg at 500x281 per
  cell. `--site` flies the camera over the authored site anchor so the landmark and its relief share the frame.
- **Content**: project-owned game renders; top row Quipaipan (Cusco 1536), Lima 1821, Miraflores, Real Felipe;
  bottom row Tarapacá, Vilcabamba, Breña. HUD visible, SwiftShader. Documents the mission-scoped heightfields
  and the grounded landmarks, not a finished site composition.
- **Review**: no human art-review gate applies to in-engine evidence captures.

### Geographic identity Phase 0 evidence (in-engine contact sheet)

- **Location**: `docs/media/geographic-identity-phase0.webp` (1920x540 WebP q82, 103 KB).
- **Source**: captured from the game by `scripts/screenshot.mjs` at 1600x900, seed 777, `intro=0`, fog off,
  using `node scripts/screenshot.mjs phase0-<id> --url='/?mission=<id>&intro=0&fog=0&seed=777' --click --wait=8000`.
  The eight captures were tiled 4x2 and compressed with:
  `ffmpeg -f concat -safe 0 -i <list> -vf "scale=480:270,tile=4x2" -frames:v 1 -c:v libwebp -quality 82`.
- **Content**: project-owned game renders. Top row: Chavín, Wari, Yahuar Pampa, Túpac Amaru. Bottom row:
  La Junta, Independencia, Cusco 1536, Breña. The HUD is visible; the renderer was SwiftShader.
- **Review**: no human art-review gate applies to in-engine evidence captures; it documents the PR #542
  Phase 0 config/heightfield changes, not a claim of a finished geographic identity.

### Tambotoco E7 production pass (in-engine evidence)

- **Location**: `docs/media/tambotoco-e7-{hualla,acequia,inticancha}-{after,final}.webp`, `tambotoco-e7-hero.webp`,
  `tambotoco-e7-shrine.webp` and `tambotoco-e7-yard.webp` (960x540 WebP q58; nine files), `docs/media/tambotoco-e7-3x3-{after,final}.webp` and `docs/media/tambotoco-e7-before-after.webp`
  (review grids, 1920x1182 / 1600x1452 WebP q62-64; ~550 KB in total).
- **Source**: the E7 art-pilot captures on the same three cameras and resolutions as E6:
  `yarn art:pilot --tag=e7 --quality=neutral --sizes=1280x720,1600x900,1920x1080 --views=hualla,acequia,inticancha`,
  the same with `--quality=final`, then
  `node scripts/capture_art_pilot.mjs --tag=e7-hero --quality=final --sizes=1600x900 --views=hero` and
  `node scripts/capture_art_pilot.mjs --tag=e7-detail --quality=neutral --sizes=1600x900 --views=shrineClose,inticanchaClose`.
  `node scripts/publish_tambotoco_e7.mjs` publishes the 960x540 copies (including the hero and the two detail views) and
  `node scripts/compare_tambotoco_e7.mjs` composes the 3 x 3 sheets and the E6/E7 comparison.
- **Content**: project-owned in-engine renders. The E7 pass adds the Inticancha yard detail (a backstrap loom,
  two jars) and the Huanacaure offerings, bakes Manco's proportions, and softens the `cusco_valley` terrain
  macro/AO; the hamlet household props, field cairns and plaza jars were trialed and reverted because the
  high-quality late frames sample had only 842 triangles of headroom before E7 (the E6 frames read 659,158/359);
  the retained detail leaves the E7 frames late at 659,962/360, 38 triangles and 0 calls under the cap
  (structural late 634,134/357). No new fauna species and no andes rock GLB: the existing
  llama/vicuña/condor groups and the site's procedural rocks were kept.
- **Review**: authorized by the project owner on 2026-11-17 as the E7 production pass; the captures and the
  3X recording are the review artifacts. The 3X recording is a local `review/` artifact (188 s JSON /
  181.5 s MP4) that completes Inticancha in victory; Manco falls and `a3_riego`/`a3_hualla` stay
  unmet, all optional goals. The
  worker-hold fix is committed in the recorder, so the run is reproducible with
  `yarn record --mission=m_tambotoco --mode=full --speed=3`. Contact sheet:
  `docs/media/m_tambotoco-3x-contact.webp`. No Blender review gate applies to in-engine captures.

### Tambotoco E6 reference captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-e6-{hualla,acequia,inticancha}-{before,after,final}.webp` (960x540 WebP
  q58; nine files, ~215 KB in total) and `docs/media/tambotoco-e6-3x3-{before,after,final}.webp` (the 3 x 3
  review sheets at 1920x1182 WebP q62, ~398 KB).
- **Source**: captured from the game by the art-pilot harness on the three approved cameras
  (`hualla`, `acequia`, `inticancha`) at 1280x720, 1600x900 and 1920x1080:
  `yarn art:pilot --tag=e6 --quality=neutral --sizes=1280x720,1600x900,1920x1080 --views=hualla,acequia,inticancha`
  and the same with `--quality=final`. The `before` set uses the same harness copied into a worktree at
  `a0352d5` (the harness itself postdates the baseline; only the script is copied, because that commit has no
  `art:pilot` package entry) with
  `node scripts/capture_art_pilot.mjs --tag=e6-before --quality=neutral --sizes=1280x720,1600x900,1920x1080 --views=hualla,acequia,inticancha`.
  `node scripts/publish_tambotoco_e6.mjs` resizes the 1600x900 representatives of each camera and quality to
  960x540, and `node scripts/compare_tambotoco_e6.mjs` composes the 3 x 3 sheets; the full set was reviewed as
  `review/e6-{before-neutral,after-neutral,after-final}.webp`.
  The harness aims at the ground under each authored point (`ground / tan(pitch)`), so before and after share
  the exact cameras.
- **Content**: project-owned in-engine renders of the authored Tambotoco terrain, the ayllu site and the
  units. They are recreations of the game's own scenes: never historical photographs and not a claim that the
  Ayar myth happened.
- **Review**: the project owner approved the 3 x 3 set on 2026-11-17 after reviewing the before/after contact
  sheets. No Blender review gate applies to in-engine captures; the ayllu site is procedural.

### Tambotoco ayllu kit captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-kit-{before,after}.webp` (Inticancha) and
  `docs/media/tambotoco-kit-valley-{before,after}.webp` (hualla valley), 960x540 WebP q58, ~93 KB in total.
- **Source**: captured from the game itself by `scripts/capture_ayllu_kit.mjs` (1600x900, HUD hidden, site
  at `fundada`); the `before` set comes from the previous single-mesh `AylluSite` on `main`, captured by
  copying the same script into a `main` worktree and running the same views. Regenerate the after set with
  `node scripts/capture_ayllu_kit.mjs --tag=after` after kit changes.
- **Content**: in-engine recreations of the game's own scene. No model, texture or manifest entry is added
  by the kit; it is generated geometry.
- **Review**: no human art-review gate applies to in-engine captures; the modular kit has no GLB asset and
  the authored layout stays the source of truth for a later Blender kit.

### Tambotoco E2a architecture captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-e2a-{close,hualla}-{before,after}.webp`, 960x540 WebP q58, ~70 KB.
- **Source**: captured from the game by `scripts/capture_art_pilot.mjs` at 1600x900, seed 777, HUD hidden,
  site at `fundada`, acequia open and fog of war off. The `before` pair is the E1 capture
  (`--tag=e1d --quality=neutral`); the `after` pair is E2a (`--tag=e2a3 --quality=neutral`). Regenerate with
  `yarn art:pilot --tag=e2a --quality=neutral --sizes=1600x900 --views=close,hualla` and resize to 960x540.
- **Content**: in-engine shots of the game's own scene. E2a adds contact AO/macro colour, battered walls, a
  layered thatch eave and the qollqa footing/vent; no model, texture or manifest entry is added.
- **Review**: no human art-review gate applies to in-engine captures; the procedural kit has no GLB asset.

### Tambotoco E2b hero captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-e2b-{cave,huaca}-{before,after}.webp`, 960x540 WebP q58, ~105 KB.
- **Source**: captured from the game by `scripts/capture_art_pilot.mjs` at 1600x900, seed 777, HUD hidden,
  site at `fundada`, fog of war off. The `before` pair is E2a's procedural cave/huaca; the `after` pair is
  the loaded GLB. Regenerate with
  `yarn art:pilot --tag=e2b4 --quality=neutral --sizes=1600x900 --views=cave,shrine` and resize to 960x540.
- **Content**: in-engine shots of the game's own scene. The cave and huaca GLBs are project-owned,
  stylized (`confidence: assumed`); no textures or external assets are used.
- **Review**: no human art-review gate applies to in-engine captures; the GLBs are reviewed through this PR.

### Tambotoco HUD captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-hud-{1280,1600,1920}.webp` (native size, WebP q72).
- **Source**: captured from the game by `scripts/capture_hud_dialogue.mjs` at 1280x720, 1600x900 and
  1920x1080, with a mission line in the dialogue dock and the starting party selected. Native size, because a
  downscaled 1920 shot would look smaller than the 1280 one.
- **Content**: in-engine recreations of the game's own HUD; no external art.
- **Review**: no human art-review gate applies to in-engine captures.

### Tambotoco Ayar identity captures (in-engine evidence)

- **Location**: `docs/media/tambotoco-cast.webp` (briefing medallions), `docs/media/tambotoco-heroes-close.webp`
  (four siblings) and `docs/media/tambotoco-heroes-far.webp` (strategic zoom), 960x540 WebP q58.
- **Source**: captured from the game itself by `scripts/capture_ayar_identity.mjs`. The cast capture is the briefing screen with the eight SVG medallions; the close group repositions
  four authored units under the debug harness and renders without the HUD; the far view is the RTS
  camera at its map maximum.
- **Content**: in-engine recreations of the game's own scene. The medallions and the accent colours are
  stylized presentation, not likenesses or attested garments; the bodies use the shared ayllu rig.
- **Review**: no human art-review gate applies to in-engine captures; no new model, texture or manifest
  entry is added.

### La Junta del Cusco intro, chapter and epilogue images (in-engine recreations)

- **Location**: `public/media/junta/intro-{cabildo,apacheta,umachiri,epilogo}.webp` (960x540, WebP q58,
  ~56 KB in total).
- **Reuse**: it was the borrowed epilogue backdrop of m7 (Túpac Amaru) and m9 (Arica); both missions now
  use their own outcome (m7 has no borrowed image and m9 has the Arica captures below). It shows Cusco in
  1814, not their places.
- **Source**: captured from the game itself by `scripts/capture_junta_intro.mjs`. The Cusco cabildo and the
  La Apacheta/Umachiri views are staged through the debug harness, rendered without the HUD at 1600x900 and
  resized with `sharp`; the epilogue uses a low cinematic camera over Umachiri at dusk. Regenerate them with
  `node scripts/capture_junta_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime (menu)**: the briefing and the "Tu senda" card use the approved Blender render
  `media/generated/campaigns/independencia/m_junta_cusco/intro.webp`; the campaign card for La Independencia
  reuses `intro-cabildo`. The intro beats, the Act II/III chapter cards and the victory epilogue use the
  other three captures.
- **Content**: project-owned game renders (authored terrain, the reused `colonial_site` plaza and the
  procedural patriot camp). They are recreations of the game's own scenes: never historical photographs,
  and not Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status in `src/art/manifest.json`.

### Arica intro and epilogue images (in-engine recreations)

- **Location**: `public/media/arica/intro-epilogo.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_arica_intro.mjs` on the 256 m Arica
  transect: the port terrace and cuartel, the battery with the Pacific behind it, the assault view and a
  low cinematic epilogue over the battery. Rendered without the HUD at 1600x900 and resized with `sharp`.
  Regenerate with `node scripts/capture_arica_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use the approved Blender render
  `media/generated/campaigns/republica/m9_guerra_pacifico/intro.webp`; the intro beats are cinema stills
  (`cine-*`, below); the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Arica heightfield, the low-poly `arica_site` battery,
  the procedural port terrace and the units). They are recreations of the game's own scenes: never
  historical photographs, and not Blender renders (so not in `src/art/manifest.json`). The Morro is
  outside the playable range and is not depicted as a surveyed feature.
- **Review**: no human art-review gate applies to in-engine captures; the `arica_site` GLB keeps its own
  review status (#343). The authored `m9_arica-intro` render is approved.

### Cusco (Túpac Amaru) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/cusco/intro-{valle,sangarara,cusco,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_colonial_intro.mjs` on the 256 m Cusco
  transect: the rebel valley camp, the Sangarará chapel, the Cusco siege view and a low cinematic
  epilogue. Rendered without the HUD or character nameplates at 1600x900 and resized with `sharp`.
  Regenerate with `node scripts/capture_colonial_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use `intro-valle`; the three intro beats use the
  valley, Sangarará and Cusco captures; the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Cusco heightfield, the reused `colonial_site` plaza and
  chapel, the procedural camp and the units). They are recreations of the game's own scenes: never
  historical photographs, and not Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status (#343), and the draft `m7_colonial-intro` record was retired on 2026-11-16 (a
  Workbench blockout of that GLB).

### Moche (m3) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/moche/intro-{valle,huacas,sierra,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_moche_intro.mjs` on the 256 m Moche
  transect: the canal and valley, the Huacas terrace, the Recuay foothills and a dusk epilogue. Rendered
  without the HUD or character nameplates at 1600x900 and resized with `sharp`. Regenerate with
  `node scripts/capture_moche_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use `intro-valle`; the three intro beats and the act
  cards use the valley, Huacas and foothills captures; the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Moche heightfield, the reused `moche_site` huacas and
  the procedural camps). Recreations of the game's own scenes: never historical photographs, and not
  Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused Huacas GLB keeps its own
  review status in `src/art/manifest.json` (#343).

### Wari (m4) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/wari/intro-{ayacucho,complejo,frontera,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_wari_intro.mjs` on the 256 m Wari
  transect: the Ayacucho basin and andenes, the Wari complex, the highland frontier and a dusk epilogue.
  Rendered without the HUD or character nameplates at 1600x900 and resized with `sharp`. Regenerate with
  `node scripts/capture_wari_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use `intro-ayacucho`; the three intro beats and the act
  cards use the basin, the complex and the frontier captures; the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Wari heightfield, the reused `wari_site` complex and the
  procedural camps). Recreations of the game's own scenes: never historical photographs, and not Blender
  renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused Wari GLB is tracked in
  #343, not in the manifest.

### Chanca (m5) intro and epilogue images

- **Location**: `public/media/chanca/intro-{cusco,pampa,andahuaylas,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_chanca_intro.mjs` on the 256 m Yahuar
  Pampa transect: Cusco and the pampa, the Chanca pucará and the pursuit toward Andahuaylas, plus a dusk
  epilogue. Rendered without the HUD or character nameplates at 1600x900 and resized with `sharp`.
  Regenerate with `node scripts/capture_chanca_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use the approved Blender intro render
  `media/generated/campaigns/la-senda-del-sol/m5_yahuar/intro.webp`; the three intro beats and the act
  cards use the city, the pampa and the pursuit captures; the victory epilogue uses `intro-epilogo`.
- **Content**: the briefing image is a project-owned Blender render (`art-src/blender/chanca/chanca_intro.blend`,
  recorded as `m5_chanca-intro` in `src/art/manifest.json`); the captures are recreations of the game's own
  scenes. The captures are never historical photographs and are not Blender renders; the briefing render is.
- **Review**: the intro render was approved by a recorded human review (`yarn art:review`); the reused
  Chanca GLB is tracked in #343 and is not a manifest record.

### Chimú (m6) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/chimu/intro-{paramonga,canal,rendicion,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_chimu_intro.mjs` on the 256 m north-coast
  transect: the Inca camp, Paramonga and the Chan Chan canal, plus a dusk epilogue. Rendered without the
  HUD or character nameplates at 1600x900 and resized with `sharp`. Regenerate with
  `node scripts/capture_chimu_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use the approved Blender render
  `media/generated/campaigns/la-senda-del-sol/m6_chimu/intro.webp`. The act cards use the Paramonga, canal
  and capitulation captures; the intro beats are cinema stills (`cine-*`, below); the victory epilogue
  uses `intro-epilogo`.
- **Content**: project-owned game captures (authored Chimú heightfield, the reused `chimu_site` compound and
  the procedural camps). The captures are recreations of the game's own scenes: never historical
  photographs and not Blender renders. The briefing render is the `m6_chimu-intro` manifest record.
- **Review**: no human art-review gate applies to the in-engine captures; the authored briefing render was
  approved by a recorded human review, and the reused Chimú GLB is tracked in #343, not in the manifest.

### Inca civil war (m6b) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/cusco-inca/intro-{guerra,quipaipan,captura,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_cusco_inca_intro.mjs` on the 256 m
  Cusco–Quipaipan transect: the Quito camp, the Quipaipan ushnu and the Cusco centre, plus a dusk epilogue.
  Rendered without the HUD or character nameplates at 1600x900 and resized with `sharp`. Regenerate with
  `node scripts/capture_cusco_inca_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use `intro-quipaipan`; the three intro beats and the act
  cards use the war, Quipaipan and capture captures; the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Cusco heightfield, the reused `cusco_inca_site` ushnu and
  the procedural camps). Recreations of the game's own scenes: never historical photographs, and not
  Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused Cusco GLB keeps its own
  review status in `src/art/manifest.json` (#343).

### Independencia (m8) intro and epilogue images (in-engine recreations)

- **Location**: `public/media/independencia/intro-{lima,junin,marcha,ayacucho,epilogo}.webp` (960x540, WebP q58).
- **Source**: captured from the game itself by `scripts/capture_independencia_intro.mjs` on the 256 m
  Junín–Ayacucho transect: the Lima campaign camp, Junín and the Ayacucho chapel, plus a dusk epilogue.
  Rendered without the HUD or character nameplates at 1600x900 and resized with `sharp`. Regenerate with
  `node scripts/capture_independencia_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime**: the briefing and the "Tu senda" card use `intro-lima`; the three intro beats and the act
  cards use the Lima, Junín and Ayacucho captures; the victory epilogue uses `intro-epilogo`.
- **Content**: project-owned game renders (authored Junín–Ayacucho heightfield, the Independence kit's
  chapel and camp, and the procedural camps). Recreations of the game's own scenes: never historical
  photographs, and not Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the kit manifests record the
  documented/assumed split, and the captures are not presented as photographs.

### Tarapacá, Miraflores and La Breña intro/epilogue images (in-engine recreations)

- **Location**: `public/media/{tarapaca,miraflores,brena}/intro-*.webp` (640×360, WebP q28).
- **Source**: captured from the game itself by `scripts/capture_republica_arc.mjs` on the Republic
  missions: the Tarapacá quebrada, the Miraflores redoubt line, the Mantaro valley and the Huamachuco
  heights. Rendered without the HUD at 1600×900 and resized with `sharp`. Regenerate with
  `node scripts/capture_republica_arc.mjs --mission=ID --only=ID` after art changes.
- **Runtime**: `m_tarapaca` uses `intro-{quebrada,alturas,retirada,epilogo}`; `m_miraflores` uses
  `intro-{reductos,retirada,epilogo}`; `m_brena` uses `intro-{mantaro,galgas,huamachuco,epilogo}`.
- **Content**: project-owned game renders (the reused Arica desert terrace, the Lima colonial kit at the
  `ciudad` phase and the Ayacucho chapel/camp, plus procedural units and camps). The sites are labelled
  abstractions where the repo has no surveyed heightfield (Tarapacá, La Breña); they are recreations of
  the game's own scenes, never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused `arica_site`,
  `colonial_site` and `independence_site` GLBs keep their own review status (#343).

### Cinema-intro stills (in-engine recreations)

- **Location**: `public/media/<dir>/cine-*.webp` (1920x1080, WebP, ~80 KB target): `arica/cine-{linea,puerto}`; `brena/cine-{mantaro,paso}`; `caral/cine-{aspero,obra}`; `chanca/cine-{cusco,defensa}`; `chavin/cine-{plaza,valle}`; `chimu/cine-{costa,vanguardia}`; `cusco-1536/cine-{ciudad,fortaleza}`; `cusco-inca/cine-{cusco,quipaipan}`; `cusco/cine-{rebelion,valle}`; `independencia/cine-{ayacucho,junin}`; `junta/cine-{apacheta,cusco}`; `lima-1821/cine-{lima,lurin}`; `lima/cine-{ciudad,llano}`; `miraflores/cine-{lima,linea}`; `moche/cine-{huacas,plaza}`; `real-felipe/cine-{bastion,baterias}`; `tambotoco/cine-{cueva,partida}`; `tarapaca/cine-{linea,quebrada}`; `vilcabamba/cine-{pucara,selva}`; `wari/cine-{camino,complejo}`.
- **Source**: captured from the game itself by `scripts/capture_cinema.mjs` (shots in
  `scripts/cinema-shots/<campaign>.mjs`), with staged troops and buildings, the site phase where noted, the apron fogged into the horizon and the world labels
  hidden. Regenerate with `node scripts/capture_cinema.mjs --mission=<id> [--only=<shot>] [--gpu]` after art
  changes. The Tarapacá pair was the pilot (#583); the other missions followed on 2026-11-22.
- **Runtime**: every released mission's letterboxed intro (`introStyle: 'cinema'`), first and third beats; the
  middle beat is the campaign map painted from the live mission terrain by `src/ui/cinemaMap.ts`.
- **Content**: project-owned game renders of each mission's site and forces. They are recreations of the
  game's own scenes, never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused site GLBs keep their own
  review status (#343). Size budget: ADR 0008.

### Cusco 1536 and Vilcabamba intro/epilogue images (in-engine recreations)

- **Location**: `public/media/{cusco-1536,vilcabamba}/intro-*.webp` (640×360, WebP q28).
- **Source**: captured from the game itself by `scripts/capture_virreinato_arc.mjs` on the 1536 Cusco
  and 1572 Vilcabamba transects: the Inca plaza and Sacsayhuamán, the cloud-forest fort and the escape
  road. Rendered without the HUD at 1600×900 and resized with `sharp`. Regenerate with
  `node scripts/capture_virreinato_arc.mjs --mission=ID --only=ID` after art changes.
- **Runtime**: `m_cusco_1536` uses `intro-{ciudad,sacsay,retirada,epilogo}`; `m_vilcabamba` uses
  `intro-{pucara,captura,epilogo}`.
- **Content**: project-owned game renders (the reused `cusco_inca_site` and `chanca_site` compositions,
  procedural units and camps). Vilcabamba is a labelled abstraction; the images are recreations of the
  game's own scenes, never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused site GLBs keep their own
  review status (#343).

### Caral Pyramid Mayor modular scenery

- **Location**: `src/assets/scenery/caral/caral_pyramid_mayor_lod0.glb` and `lod1.glb`.
- **Source**: `art-src/blender/scenes/caral_rts_kit.blend`, isolated by
  `scripts/blender/build_caral_scenery.py --asset=pyramid-mayor` into
  `art-src/blender/scenes/caral_pyramid_mayor.blend`.
- **SHA-256**: LOD0 `c18c2230394471221bf86eccaa38a51e002185d62a208bef7c01a46199399bbd`;
  LOD1 `844c1bd866aa8afddaac5bbf3adfb286b867e61c14bedb304bd82f785ba19153`;
  manifest `b5f0766f0fb3105e244d0285d75ff9c5b7ccb34ba7d6379b0744fbcf227a644f`.
- **Export**: LOD0 6,044 tris / 7 draw calls / 293,796 bytes; LOD1 2,408 tris / 154,020 bytes.
  Bounds 13.904 × 2.7744 × 15.5352 game units; Y-up; footprint centre at ground; foundations
  extend to -0.16.
- **Content**: Pyramid Mayor + Plaza Mayor; excludes `PlazaCentral`, market stalls and terrain.
- **Runtime**: `?scenery=caral` mounts the scenery showcase. It is showcase-only; `m1_caral` uses the
  exact sacred-site GLB listed below. Visual-only, no collision.
- **Confidence**: documented in plan; roofs and remates inferred.

### Caral Anfiteatro modular scenery

- **Location**: `src/assets/scenery/caral/caral_anfiteatro_lod0.glb` and `lod1.glb`.
- **Source**: `art-src/blender/scenes/caral_rts_kit.blend`, isolated by
  `scripts/blender/build_caral_scenery.py --asset=anfiteatro` into
  `art-src/blender/scenes/caral_anfiteatro.blend`.
- **SHA-256**: LOD0 `b00b196a7698c75048e636cbc7f6ed5b4f817d3044f998735f4c701536031565`;
  LOD1 `6b17d4e4237270979085a12aaaaa248fb787aecb65db1bcf7dcb4713b851897b`;
  manifest `343c8f1d703be774dd35fd631b161c9eafb612cd4e726bff0e37e14b8dfc61dd`.
- **Export**: LOD0 3,520 tris / 7 draw calls / 170,580 bytes; LOD1 1,403 tris / 84,880 bytes.
  Bounds 19.704 × 1.016 × 7.2 game units; Y-up; footprint centre at ground; foundations to -0.2.
- **Content**: Templo Anfiteatro + Altar Circular + Templo Banqueta; excludes stalls and terrain.
  `MAT-Sand_Desert` is exported with its base color after stripping the unsupported procedural link.
- **Runtime**: `?scenery=caral-anfiteatro` mounts the scenery showcase. It is showcase-only;
  `m1_caral` uses the exact sacred-site GLB listed below. Visual-only, no collision.
- **Confidence**: documented in plan; graderios and banqueta simplified.

### Caral city GLB (showcase)

- **Location**: `src/assets/cities/caral_city_lod0.glb` and `caral_city_lod1.glb`.
- **SHA-256**: LOD0 `f6d30d3df0eda092d0caaea9105627bd8a6369680e2824f1d4bc1deedde63d07`;
  LOD1 `e291d8cd3e05ae77debded0470ba7c309f89549e5cd8a98ab3c44bb276123de6`.
- **Source**: `art-src/blender/scenes/caral_game_export.blend` (Git LFS;
  SHA-256 `26d7de923806421967cdd21eefee54013990172511540d1a5eda65ea6875558f`), with the export manifest
  `art-src/blender/caral/caral_city_game_manifest.csv`.
- **Export**: LOD0 18,120 tris / 10 parts / 10 materials / 906,728 bytes; LOD1 6,194 tris / 454,348 bytes.
  Bounds 30.4 × 2.814 × 49.628 game units; Y-up; pivot at the centre of the footprint at ground level;
  main stair faces +Z. The city is merged by material (10 draw calls) and excludes terrain/trees/rocks/humans.
- **Runtime**: `src/rendering/StaticModel.ts` is a static glTF loader that does not require animation clips.
  `?city=caral` mounts a standalone showcase with both LODs, shadows, orbit controls and `window.__cityDemo`.
- **Material caveat**: the GLB exports `MAT-Sand_Desert` without a `baseColorFactor`; the showcase applies a
  sand fallback.
- **Historical caveat**: the export includes plaza stalls (`GEO-Caral_PlazaCentral_Stall_*`), so it is not
  used by `m1_caral`; the exact sacred-site GLB below is the runtime source.
- **Status**: showcase only. The full-city GLB is **not** used by a campaign mission. A render is not
  a photograph.

### Caral sacred site (m1 runtime, Ciudades Sagradas v2)

- **Location**: `src/assets/sites/caral/caral_site_lod0.glb` and `caral_site_lod1.glb`.
- **SHA-256**: LOD0 `d11247a3bf17807abe3667b01e75439be0071a70f01f8a34b6196bd1a7e4ded7`;
  LOD1 `e1567c59390c52e947a9e948f94a18baa8ccd919d030381a70bb6c21cca165bf`.
- **Source**: the exact Ciudades Sagradas Caral remaster v2 GLBs from
  `ciudades-sagradas/public/cities/caral/model_lod0.glb` and `model_lod1.glb`;
  editable scene `ciudades-sagradas/blender/caral/caral_remaster_v2.blend`.
  The game copies the source GLBs without re-exporting or remodelling their geometry.
- **Licence / attribution**: Ciudades Sagradas content is CC BY 4.0 (© José Amaya). Attribute
  “Ciudades Sagradas, José Amaya, CC BY 4.0” wherever the site assets are redistributed. The GLB
  embeds its source textures (plaster, stone, adobe, thatch, earth, fire and terrain).
- **Content**: the source's seven-tier Great Pyramid, Central Plaza, Plaza de la Huanca, Anfiteatro,
  residential compounds, paths and props. `Infra_Terrain` and `Infra_Reference` are hidden at load;
  the game owns terrain, vegetation, fauna and collision. `Infra_Terrain` is never shown.
- **Runtime**: `src/core/Game.ts` loads LOD1 by default through `src/rendering/siteModels.ts`
  (Draco + WebP); `?lod=0` loads the LOD0 detail mesh. Source scale is uniform `0.25`; no vertical
  exaggeration.
- **Game-side adaptation**: the source is translated so the Great Pyramid is centred at
  `(100, 30)` on the 192 m map. A shallow 0.55 m basin is authored under the Plaza Mayor so the
  source's sunken floor and red rings sit at the heightfield surface. These are the only spatial
  adaptations; the source geometry and materials are preserved.
- **Historical caveat**: the source is an artistic reconstruction, not a survey or a historical
  photograph. Its residential compounds are low-walled source forms; no invented roofs or extra
  houses are added. Roofs, awnings, fires and painted surfaces are inferred in the source.

### Chavín sacred site (m2 runtime)

- **Location**: `src/assets/sites/chavin/chavin_site_lod0.glb` and `chavin_site_lod1.glb`.
- **SHA-256**: LOD0 `11b6ba6e1049dece0f12c474883317392f45465fee1a7f22d89317d093763518`;
  LOD1 `341626aff66ae8e049ab331897a773edc89221f8dce53fe782bdc7762b90c621`.
- **Source**: `art-src/blender/chavin/chavin_lod0_clean.blend` /
  `chavin_lod1_clean.blend` (LFS), derived from the project's Chavín preview and
  re-exported with `scripts/blender/export_chavin_site.py`.
- **Licence cleanup**: the source preview's Lanzón was a derived CyArk / Google
  Arts & Culture scan under CC BY-NC-SA 4.0. That mesh and its material were
  removed before committing the sources and GLBs. The game uses a project-owned
  low-poly Lanzón interpretation; no NC geometry or material remains.
- **Content**: Edificio A/B, Plaza Circular, Portada de las Falcónidas, one
  representative gallery sequence, terraces, paths, vegetation and water. The
  source terrain and reference layers are hidden at load; the game owns terrain,
  vegetation, fauna and collision.
- **Runtime**: `src/model/defs/sites.ts` (scale `0.22`, origin `(96,96)`, anchor
  `(98,87.5)`), `src/rendering/siteModels.ts` (Draco/WebP), and
  `src/core/Game.ts` for heightfield, collision and heritage proxies.
- **Human review**: the kit and its in-engine site views were approved on 2026-11-17 as a stylized
  abstraction; contact sheet in [`docs/media/chavin-kit-review.webp`](docs/media/chavin-kit-review.webp).
- **Historical caveat**: representative centre, not a survey. Roofs, heights and
  some reliefs are inferred; the Lanzón is an interpretation, not the scan. See
  `docs/design/chavin-sacred-site.md`.

### Cusco architecture kit (m_cusco_1536, m6b)

- **Location**: `src/assets/architecture/cusco/cusco_<piece>_lod0.glb` and `_lod1.glb`: `kallanka` (great
  hall), `wasi` (house), `kancha_wall` (12 m enclosure wall), `ushnu`, `plaza` (sand floor and kerb),
  `sacsay_round` and `sacsay_square` (14 m sections of the three zig-zag terraces of Sacsayhuamán with Muyuq
  Marka or a rectangular tower on the summit).
- **Source**: generated in Blender 5.3 by `scripts/blender/build_cusco_architecture_kit.py`; kit scene
  `art-src/blender/scenes/cusco_architecture_kit.blend` (Git LFS). Uncompressed exports and per-piece manifests
  (triangles, materials, bounds, budget, `confidence`, sources, review state) live in
  `art-src/blender/exports/cusco/architecture/`; the game copies were meshopt-compressed with
  `yarn art:models --only=<file>` (~760 KB for the 14 files).
- **Content**: project-owned procedural geometry. Every cut stone is modelled (a cushioned face inset from
  its joint): coursed, battered ashlar on the halls, walls, ushnu and towers; fitted polygonal megaliths on the
  terrace faces. 7 Principled materials (ashlar, megalith, joint, adobe, ichu thatch, earth, sand) with
  world-scale box-projected UVs and a per-vertex tint (grime at the foot, a shade per stone); no textures in
  the GLBs. At runtime the game maps the shared `plaster_detail` grit onto stone, adobe, earth and sand and
  `roof_thatch` onto the ichu. LOD0 ≤ 5000 / LOD1 ≤ 1500 triangles per piece (Sacsayhuamán sections ≤ 8000 /
  2400, the monument allowance).
- **Historical basis**: documented: rectangular halls with coursed stone socles, adobe upper walls and gable
  ends, steep ichu gable roofs and trapezoidal doorways; walled kancha blocks; the stepped ushnu on the plaza;
  the sand-spread Haukaypata; Sacsayhuamán's three superposed zig-zag terraces of polygonal megaliths facing the
  city and its summit towers (Muyuq Marka round, two rectangular). Assumed (licences recorded in the
  manifests): sizes, door counts, the ushnu's tiers and seat stone, terrace heights compressed to 9 m for the
  RTS scale, one salient per section, tower sizes and flat tops, the layout of the plaza. Sources:
  `docs/historia/civilizaciones/inca.md`, `docs/historia/campanas/cusco_1536.md`; Hyslop, _Inka Settlement
  Planning_; Gasparini & Margolies, _Inca Architecture_; Protzen, _Inca Architecture and Construction at
  Ollantaytambo_.
- **Runtime**: `src/model/defs/cuscoCity.ts` places the pieces (`CUSCO_CITY_LAYOUT`) and derives the site's
  pathfinding blockers from the same placements (`layoutBlockers`, headless too); `WorldViewDecor` bakes the
  city with `ArchitectureCity`. It replaces the procedural `cusco-plaza` and `sacsayhuaman` landmarks; the
  bundled `cusco_inca_site` GLB stays hidden.
- **Evidence**: `docs/media/cusco-kit-before-after.webp` (1600x1000 WebP q72): top row the procedural boxes,
  bottom row the kit, same camera and light, from `m_cusco_1536`.

### Independence architecture kit (m8_independencia, m_brena)

- **Location**: `src/assets/architecture/independence/independence_<piece>_lod0.glb` and `_lod1.glb`:
  `chapel` (14 x 8 m nave, three-arch front, bell tower and tile roof), `hacienda` (camp store with a
  three-arch porch), `community_house` (flat-roofed adobe house), `tent` (canvas A-frame), `camp_wall`,
  `parade_ground`, `well` and `earthwork`.
- **Source**: generated in Blender 5.3 by `scripts/blender/build_independence_architecture_kit.py`; kit scene
  `art-src/blender/scenes/independence_architecture_kit.blend` (Git LFS). Uncompressed exports and per-piece
  manifests (triangles, materials, bounds, budget, `confidence`, sources, collision, review state) live in
  `art-src/blender/exports/independence/architecture/`; the game copies were meshopt-compressed with
  `yarn art:models --only=<file>` (176,056 B ≈ 172 KB for the 16 game copies).
- **Content**: project-owned procedural geometry. Eight Principled materials (lime plaster, adobe, tile,
  stone, wood, canvas, earth and dark openings) with world-scale box-projected UVs and a per-vertex tint
  (wall-foot grime, roof and canvas variation; horizontal earth and stone up-faces skip the grime); no
  textures in the GLBs. At runtime the game maps `plaster_detail` onto plaster, adobe, canvas, earth and
  openings, the photographed `tile` set (pulled towards luma) onto the roofs, `wall_fieldstone` (lifted)
  onto the stone and `wood` onto the timber. LOD0 ≤ 5000 / LOD1 ≤ 1500 triangles per piece; the chapel is
  the monument piece (≤ 8000 / 2400).
- **Historical basis**: documented: the rural Andean chapel with a nave, bell tower and tiled gable roof;
  the campaign's adobe/plaster buildings; canvas tents; the low camp walls, packed ground and water. Assumed
  (licences in the manifests): the 14 x 8 m nave, the 8.5 m tower, the house modules, the tent count and
  the earth bank profile. Sources: `docs/historia/arquitectura.md`,
  `docs/design/{independence-site,independencia-model-mission,brena-model-mission}.md`,
  `docs/historia/campanas/{independencia,brena}.md`.
- **Runtime**: `src/model/defs/independenceCity.ts` places the Ayacucho and Breña compositions and derives
  each site's pathfinding blockers from the same placements (`layoutBlockers`); `WorldViewDecor` bakes them
  with `ArchitectureCity`. Both site definitions set `hideModel` and `simulationCollision`, so the headless
  match blocks the same pieces. The m8 camp keeps its east-west lane open for the Junín–Ayacucho march and
  the 10.7 m walkable corridor.
- **Evidence**: `docs/media/independence-kit-before-after.webp` (two rows, Ayacucho and Breña, before and
  after the kit, same mission, seed, camera and light); produced with the `yarn shot` commands in
  `docs/design/independence-site.md` and `scripts/independence_sites_sheet.mjs`.

### Wari architecture kit (m4_wari, m5_yahuar_pampa)

- **Location**: `src/assets/architecture/wari/wari_<piece>_lod0.glb` and `_lod1.glb`: `d_temple` (D-shaped
  plastered platform with the red band, stone facade and summit altar), `plaza`, `gallery`, `room`,
  `pukara_wall`, `tower`, `mural`, `terrace` (andén) and `altar`.
- **Source**: generated in Blender 5.3 by `scripts/blender/build_wari_architecture_kit.py` on the shared
  `scripts/blender/arch_kit.py`; kit scene `art-src/blender/scenes/wari_architecture_kit.blend` (Git LFS).
  Uncompressed exports and per-piece manifests in `art-src/blender/exports/wari/architecture/`; the game
  copies were meshopt-compressed with `yarn art:models --only=<file>` (156,060 B for the 18 copies).
- **Content**: project-owned procedural geometry. Eight Principled materials (field stone, cut stone, lime
  plaster white and red, packed earth, thatch, timber and dark openings) with world-scale box-projected UVs
  and a per-vertex tint; no textures in the GLBs. At runtime the game maps `wall_fieldstone` and
  `wall_cutstone` (warmed and lifted) onto the stone, `plaster_detail` (kept colour) onto plaster, earth and
  openings, `roof_thatch` onto thatch and `wood` onto the timber. LOD0 ≤ 5000 / LOD1 ≤ 1500 triangles per
  piece; the D-shaped temple is the monument piece (≤ 8000 / 2400).
- **Historical basis**: documented: the Wari D-shaped temple plan, the walled plaza, the long galleries and
  the andenes; the red and cream facade painting; the Chanca pucará's thick walls and single gate (the round
  tower typology is an RTS abstraction). Assumed (licences in the manifests): the tier, gallery and tower counts, the temple dimensions, the
  gate width and the wall profiles. Sources: `docs/historia/arquitectura.md`,
  `docs/historia/civilizaciones/wari.md`, `docs/historia/campanas/{wari_tiahuanaco,yahuar_pampa}.md`,
  `docs/design/{wari-chanca-sites,wari-sacred-site,chanca-site}.md`.
- **Runtime**: `src/model/defs/wariChancaCity.ts` places the Wari complex and the Chanca pucará and derives
  each site's pathfinding blockers from the same placements (`layoutBlockers`); `WorldViewDecor` bakes them
  with `ArchitectureCity`. Both sites set `hideModel` and `simulationCollision`, so the headless match blocks
  the same pieces; the Wari south road and the pucará gate stay open. This retires the `wari_site` and
  `chanca_fortress` GLBs as drawn sites (they stay in the registry).
- **Terrain**: `scripts/build_wari_heightmap.py` now stops the dry quebrada at the site edge, so the temple
  and the plaza share one flat bench (`wariHeightmap.ts` regenerated; identity hash updated).
- **Evidence**: `docs/media/wari-kit-before-after.webp` (1772x978 WebP q74): two rows, the Wari complex and
  the Chanca pucará, before and after the kit, same mission, seed, camera and light; produced with the
  `yarn shot` commands in `docs/design/wari-chanca-sites.md` and `scripts/sites_sheet.mjs`. The
  `cine-complejo` still and the Wari/Chanca intro sets were regenerated with the kit. The Vilcabamba refuge
  (the last procedural `SiteLandmarks` composition) uses the kit's domestic pieces
  (`VILCABAMBA_REFUGE_LAYOUT`) and has its own sheet, `docs/media/vilcabamba-kit-before-after.webp`
  (1772x536), before and after; the procedural renderer and its mission field were removed.

### Moche architecture kit (m3_moche_recuay, m6_chimu_inca)

- **Location**: `src/assets/architecture/moche/moche_<piece>_lod0.glb` and `_lod1.glb`: `huaca` (five
  battered adobe tiers, painted friezes, summit room and stepped ramp), `platform` (two tiers with a
  plastered summit room and ramp), `plaza` (packed floor and kerb), `wall`, `niche_wall` (four recessed
  niches), `hall` (flat-roofed adobe hall), `audiencia` (raised Chimú hall with niches), `altar` and
  `frieze` (painted panel, bands on both faces).
- **Source**: generated in Blender 5.3 by `scripts/blender/build_moche_architecture_kit.py` on the shared
  `scripts/blender/arch_kit.py`; kit scene `art-src/blender/scenes/moche_architecture_kit.blend` (Git LFS).
  Uncompressed exports and per-piece manifests live in `art-src/blender/exports/moche/architecture/`; the
  game copies were meshopt-compressed with `yarn art:models --only=<file>` (143,548 B for the 18 copies).
- **Content**: project-owned procedural geometry. Eight Principled materials (adobe, its shadowed tone,
  lime plaster, the two frieze colours, packed earth, timber and dark openings) with world-scale
  box-projected UVs and a per-vertex tint; no textures in the GLBs. At runtime the game maps
  `plaster_detail` (kept colour) onto adobe, plaster, friezes, earth and openings and `wood` onto the
  timber. LOD0 ≤ 5000 / LOD1 ≤ 1500 triangles per piece; the huaca and the audiencia are monument pieces
  (≤ 8000 / 2400).
- **Historical basis**: documented: the Huaca del Sol and de la Luna as stepped platforms, Moche painted
  friezes, the plaza and elite patios, Chan Chan's adobe compounds, audiencias and niched walls. Assumed
  (licences in the manifests): the tier counts, the 24 x 16 m base, the niche and frieze counts, the gate
  width and the ramp profiles. Sources: `docs/historia/arquitectura.md`,
  `docs/historia/civilizaciones/moche.md`, `docs/historia/campanas/{moche_recuay,chimu_inca}.md`,
  `docs/design/{moche-chimu-sites,moche-sacred-site,chimu-site}.md`.
- **Runtime**: `src/model/defs/mocheChimuCity.ts` places the Huacas de Moche and Chan Chan compositions and
  derives each site's pathfinding blockers from the same placements (`layoutBlockers`); `WorldViewDecor`
  bakes them with `ArchitectureCity`. Both sites set `hideModel` and `simulationCollision`, so the headless
  match blocks the same pieces. The Moche site keeps its south-west approach and the Chimú compound its
  south gate open; the access ramps are part of the footprints. This retires the `moche_site` and
  `chimu_compound` GLBs as drawn sites (they stay in the registry, no longer drawn).
- **Evidence**: `docs/media/moche-kit-before-after.webp` (1772x978 WebP q74): two rows, the Huacas de Moche
  and Chan Chan, before and after the kit, same mission, seed, camera and light; produced with the
  `yarn shot` commands in `docs/design/moche-chimu-sites.md` and `scripts/sites_sheet.mjs`. The
  `cine-huacas`, `cine-plaza` and `cine-costa` stills were regenerated with
  `node scripts/capture_cinema.mjs --mission=<id> --only=<shot>`, and the briefing/epilogue stills with
  `node scripts/capture_{moche,chimu}_intro.mjs`, because they still showed the retired GLBs.

### Republican architecture kit (m9_guerra_pacifico, m_real_felipe, m_tarapaca)

- **Location**: `src/assets/architecture/republic/republic_<piece>_lod0.glb` and `_lod1.glb`: `apron`
  (packed port terrace/village plaza), `battery` (stone rampart, five guns and magazine), `warehouse`
  (adobe port store), `pier` (timber landing), `curtain` (12 m brick curtain wall), `bastion` (pentagonal
  Real Felipe corner), `magazine` (vaulted brick store), `fort_plaza` (paved courtyard), `well`, `chapel`
  (adobe nave and espadaña), `adobe_house` (flat-roofed quebrada house), `corral_wall`, `parapet` (crest
  wall) and `outcrop`.
- **Source**: generated in Blender 5.3 by `scripts/blender/build_republic_architecture_kit.py`; kit scene
  `art-src/blender/scenes/republic_architecture_kit.blend` (Git LFS). Uncompressed exports and per-piece
  manifests (triangles, materials, bounds, budget, `confidence`, sources, collision, review state) live in
  `art-src/blender/exports/republic/architecture/`; the game copies were meshopt-compressed with
  `yarn art:models --only=<file>` (278,320 B ≈ 272 KB for the 28 game copies).
- **Content**: project-owned procedural geometry. Eight Principled materials (brick, stone, adobe, earth,
  wood, packed-earth paving, stone plaza paving and dark openings) with world-scale box-projected UVs and a
  per-vertex tint (wall-foot grime, roof and paving variation; the horizontal paving and plaza skip the
  grime); no textures in the GLBs. At runtime the game maps `wall_brick` (warm, lifted) onto the fort,
  `wall_fieldstone` (lifted) onto the stone, `plaster_detail` onto adobe and earth, `wood` onto the timber,
  `ground_plaza` onto the fort courtyard (warmed to `tint 0xf2e2c4` and lifted 1.7, with flatter joints at
  `normal 0.35`, because the grey set read navy under the mission's cool dusk light) and `plaster_detail`
  (kept colour) onto the packed aprons. LOD0
  ≤ 5000 / LOD1 ≤ 1500 triangles per piece; the chapel and the bastion are monument pieces (≤ 8000 / 2400).
- **Historical basis**: documented: the port terrace, battery, warehouse and pier; the Real Felipe's
  bastioned brick/stone trace with four corner bastions and sally gates; the Tarapacá quebrada village with
  its chapel, flat-roofed adobe houses, stone corral and the crest line; Pachica as a hamlet on the road.
  Assumed (licences in the manifests): the 24 m fort side, the five-gun battery, house sizes, roof pitch,
  the espadaña and the number of pieces. Sources: `docs/historia/arquitectura.md`,
  `docs/design/{republic-sites,arica-site,real-felipe-model-mission,tarapaca-model-mission}.md`,
  `docs/historia/campanas/{guerra_del_pacifico,real_felipe,tarapaca}.md`.
- **Runtime**: `src/model/defs/republicCity.ts` places the three compositions and derives each site's
  pathfinding blockers from the same placements (`layoutBlockers`); `WorldViewDecor` bakes them with
  `ArchitectureCity`. The three site definitions set `hideModel` and `simulationCollision`, so the headless
  match blocks the same buildings. This retires the `arica_site` battery GLB as the drawn site (it remains a
  registry fallback) and removes the mission-scoped `real-felipe`, `tarapaca-village`, `tarapaca-heights`
  and `tarapaca-pachica` procedural landmarks.
- **Evidence**: `docs/media/republic-sites-before-after.webp` (1652x1351 WebP q74): three rows, Arica, Real
  Felipe and Tarapacá, before and after the kit, same mission, seed, camera and light; produced with the
  `yarn shot` commands in `docs/design/republic-sites.md` and `scripts/republic_sites_sheet.mjs`. The
  courtyard colour pass has its own sheet, `docs/media/republic-fort-courtyard-before-after.webp`
  (1652x513 WebP q74), same mission and light, before and after the `MAT-Arch_RepublicPlaza` values in
  `src/rendering/architectureKit.ts`; the recipe is in the same doc. The `cine-bastion` still
  (`public/media/real-felipe/cine-bastion.webp`), which looks into the courtyard, was regenerated with
  `node scripts/capture_cinema.mjs --mission=m_real_felipe --only=cine-bastion`; it still showed the
  pre-kit fort, so this also brings it in line with the Republican kit.

### Colonial architecture kit (m_lima, m_lima_1821, m_miraflores, m_junta_cusco, m7_tupac_amaru)

- **Location**: `src/assets/architecture/colonial/colonial_<piece>_lod0.glb` and `_lod1.glb`: `catedral`
  (nave, bell tower and cross), `cabildo` (five-arch arcade, gallery and balcony), `casona` (two storeys with
  the closed wooden balcony), `portal` (four-arch arcade), `plaza` (paving and kerb), `pileta` (fountain) and
  `patio_wall`.
- **Source**: generated in Blender 5.3 by `scripts/blender/build_colonial_architecture_kit.py`; kit scene
  `art-src/blender/scenes/colonial_architecture_kit.blend` (Git LFS). Uncompressed exports and per-piece
  manifests (triangles, materials, bounds, budget, `confidence`, sources, collision, review state) live in
  `art-src/blender/exports/colonial/architecture/`; the game copies were meshopt-compressed with
  `yarn art:models --only=<file>` (198,508 B ≈ 194 KB for the 14 game copies; the uncompressed exports are
  394,640 B).
- **Content**: project-owned procedural geometry. Seven Principled materials (lime plaster, adobe, tile,
  wood, stone, paving, dark openings) with world-scale box-projected UVs and a per-vertex tint (grime at the
  foot on the verticals, a shade per tile and paving slab; the horizontal paving skips the wall-foot grime);
  no textures in the GLBs. At runtime the game maps the shared `plaster_detail` grit onto plaster, adobe and
  openings, the photographed `tile` set (pulled towards luma) onto the roofs, `wood` onto the balconies,
  `wall_cutstone` (lifted) onto the kerb, fountain and bands, and `ground_plaza` onto the plaza floor. LOD0
  ≤ 5000 / LOD1 ≤ 1500 triangles per piece; the cathedral is the monument piece (≤ 8000 / 2400).
- **Historical basis**: documented: a nave with a tiled gable roof and an attached bell tower, an arcaded
  cabildo, two-storey adobe/quincha houses, Lima's closed wooden balconies, the portales around the Plaza
  Mayor, a paved square with a stone fountain and adobe patio walls with a coping. Assumed (licences in the
  manifests): sizes, bay and window counts, the 17 m tower, the balcony depth and the composition of each
  plaza. Sources: `docs/historia/arquitectura.md`, `docs/design/colonial-site.md`,
  `docs/historia/campanas/{lima,lima_1821,junta_cusco,miraflores,tupac_amaru}.md`. Harth-Terré,
  *Contribución al estudio de la arquitectura colonial*; Gutiérrez, *Arquitectura virreinal*.
- **Runtime**: `src/model/defs/colonialCity.ts` places the pieces (`colonialLayoutAt`) and derives each
  site's pathfinding blockers from the same placements (`colonialCityBlockers`, applied headless too);
  `WorldViewDecor` bakes the city with `ArchitectureCity`. It replaces the approved `colonial_church` GLB on
  the four colonial site definitions (`hideModel`); `ColonialLife` keeps the founding traza, the stalls and
  the people.
- **Evidence**: `docs/media/colonial-kit-before-after.webp` (1600x1942 WebP q74): top row the single
  `colonial_church` GLB and its procedural houses, bottom row the kit, same mission, camera and light; and
  `docs/media/colonial-kit-color-before-after.webp` (1600x1868 WebP q74): the same Lima 1821 site before and
  after the colour pass, same `--site --height=78` capture.

### Colonial kit colour pass (in-engine evidence)

- **Location**: `docs/media/colonial-kit-color-before-after.webp`, 1600x1868 WebP q74.
- **Source**: `yarn shot lima1821-kit --url="/?mission=m_lima_1821&seed=777&fog=0&intro=0" --click --site
  --height=78 --no-hud --no-labels --wait=6000` on `main` (before) and on the branch with the regenerated kit
  (after); the two 1600x900 frames were stacked with a Pillow label band. The live field and units differ
  between the two frames; the city, camera and light are the same. The site shot frames LOD0; the LOD1 split is
  asserted against the manifests and the game GLB in `tests/colonial-architecture-kit.test.ts`. The kit GLBs
  were regenerated by `scripts/blender/build_colonial_architecture_kit.py` and meshopt-compressed with
  `yarn art:models --only=<colonial basenames>`. No Blender or GIMP retouching of the captures.
- **Content**: `docs/design/colonial-site.md` "Colour and surfaces". Before, the photographed tile multiplied
  by a warm tint read as saturated red and the `wall_cutstone` plaza at z ≈ 0 took the wall-foot grime; after,
  the tile is pulled towards luma behind a near-neutral tint and the plaza floor has its own `ground_plaza`
  set. The geometry and the layout are unchanged; the plaza gains its paving material and the stone up-faces
  lose the wall-foot grime.
- **Review**: no new historical claim; the change is colour, surface mapping and one material split.

### Chavín architecture kit and in-engine captures (m2)

- **Runtime (briefing)**: the briefing uses the approved Blender render
  `media/generated/campaigns/la-senda-del-sol/m2_chavin/intro.webp`; `intro-templo` remains a chapter card.

- **Kit**: `src/assets/architecture/chavin/chavin_<piece>_lod{0,1}.glb`.
- **Source**: `art-src/blender/chavin/chavin_lod0_clean.blend` / `chavin_lod1_clean.blend` (LFS),
  derived from the project's Chavín preview and re-exported with
  `scripts/blender/build_chavin_architecture_kit.py`. The script splits the source city by the game's
  heritage proxies (Edificio A/B, Portada, Plaza, terraces), normalises the materials to
  `MAT-Arch_Chavin*`, adds low foundation pieces and decimates LOD0 to the kit budget.
- **Licence cleanup**: the CyArk-derived Lanzón geometry and material were removed before this source was
  committed; the game uses the project-owned low-poly interpretation.
- **Review state**: every piece and capture starts `reviewed: false`; a human review must record
  `reviewer` and `reviewedAt` in the manifests before the Art gate is Met.
- **Captures**: `public/media/chavin/intro-{templo,nuevo,declive}.webp`, generated from
  the running game by `scripts/capture_chavin_intro.mjs` (1600×900, resized to 800×450 WebP). They are
  in-engine recreations, **never historical photographs**; they are used by the narrated intro, the
  chapter cards and the epilogue.
- **Historical caveat**: representative centre, not a survey. Roofs, heights, the exact construction
  sequence and some reliefs are inferred; the Lanzón is an interpretation, not the scan. See
  `docs/design/chavin-sacred-site.md` and `docs/design/chavin-model-mission.md`.

## Rigged 3D models

- **Location**: `src/assets/models/*.glb` (loaded by `src/rendering/ModelAssets.ts`).
- **`ual_mannequin.glb`**: Quaternius _Universal Animation Library_ (UAL1.glb), a generic rigged mannequin used
  to validate the glTF/GLB + skeleton + mixer pipeline. It is **not** the Caral worker anymore; the finished
  asset is `caral_worker.glb` below. It is **not shipped in `dist`**: `modelAssetRegistry.ts` imports the five
  gameplay models explicitly, the model tests load this fixture from disk, and `?rig=1` previews the shipped
  `caral_worker`.
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
    - UAL1 `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Push_Loop`, `Punch_Jab`, `Pistol_Shoot`, `Death01`,
      `Hit_Chest` — SHA-256
      `69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997`.
    - UAL2 `Farm_Harvest`, `TreeChopping_Loop`, `Walk_Carry_Loop`, `Sword_Regular_A`, `OverhandThrow` — SHA-256
      `0815dd05531cae9bc313fc9c0ba81330bc72f8e19ec45f73738e74ddc5796a43`.
  - Generated by `scripts/build_caral_worker.mjs` (fetches and verifies every source hash); the GLB is
    reproducible with `yarn models:build`.
  - SHA-256: `8a8879e2dcc601cecc9777d4b3a5d73ca5192b87ee0003d31bea03091f23f069` (2,572,416 bytes). The
    build runs `resample`/`prune` before meshopt; the jog and hit clips still leave `dist/` inside its
    28 MB budget.
  - Proportions: the build bakes the same pass as the hero — head and hands +12 % around their bone pivots
    and a waist/chest taper — before the tunic is derived from the body. It is applied in the browser build,
    not a Blender round-trip, because the round-trip splits the welded vertices and grows this shared GLB by
    ~0.17 MB. The head/hand geometry is scaled 1.12 around the bone pivots; the measured head/body ratio is
    7.77 → 7.04 (female) and 7.94 → 7.21 (male), i.e. ~8 → ~7.0–7.2 heads.
  - Contents: 15 skinned meshes (female/male bodies, hair, eyes and eyebrows, worker tunic/skirt/sash,
    reserved chasqui skirt/belt, male wrap), one shared 65-bone skeleton, 13 clips (`Idle_Loop`, `Walk_Loop`,
    `Jog_Fwd_Loop`, `Farm_Harvest`, `TreeChopping_Loop`, `Walk_Carry_Loop`, `Push_Loop`, `Punch_Jab`,
    `Pistol_Shoot`, `Sword_Regular_A`, `OverhandThrow`, `Death01`, `Hit_Chest`), ~37.0k triangles across both
    gender sets (only one
    body/outfit set is visible per instance), ~1.85 m tall. The game maps `idle` (`Idle_Loop`), `walk`
    (`Walk_Loop`), `walk_carry` (`Walk_Carry_Loop`), `run` (`Jog_Fwd_Loop`, a stylized 3.0 m/s reference),
    `gather` (`Farm_Harvest`), `build` (`Push_Loop`), melee attack (`Sword_Regular_A` for line infantry and
    Andean soldiers, `TreeChopping_Loop` for the Caral worker, `Punch_Jab` for workers/scouts), firearm attack
    (`Pistol_Shoot` for post-1532 ranged roles), sling attack (`OverhandThrow`), death (`Death01`) and the
    presentation-only hit reaction (`Hit_Chest`, a 0.33 s overlay with a 0.6 s retrigger cooldown).
    `Sprint_Loop` and `Farm_PlantSeed` remain unshipped to keep `dist/` under budget; `Farm_PlantSeed` stays
    available in the source library for a future crop variant. There is no dedicated construction clip, so
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
  - Runtime accessories (`src/rendering/workerAttire.ts`, `UnitView.ts`): headband + face paint are merged into
    one vertex-coloured head mesh; carry bundle, digging stick, scout manta and reserved chasqui canteen remain
    project-authored bone meshes. Hero head/torso/weapon accessories are merged into three vertex-coloured
    meshes per hero and the generic soldier kit is hidden, so the eight Ayar cost a handful of draws rather
    than one per feather. None of these are part of the GLB. The carry bundle is shown/tinted from the unit's
    real carry state. The Caral scout hides the tool, carry bundle and chasqui canteen. The reserved Inca
    chasqui set hides the tool and worker skirt/sash and shows the chasqui outfit.
  - Budget: both `Eyes_f` and `Eyes_m` skip the VSM shadow pass (both `castShadow` and `receiveShadow` off)
    because they are too small to cast a readable shadow; the garments keep theirs. Hidden gender/outfit meshes
    do not render. This keeps the visible worker under the **40 draws / 40k tris** budget measured in
    `docs/development/performance-audit.md`.
  - Presentation variants: `inca_killke_*` and `ayllus_*` (E4a) reuse this asset and its clips; they only
    select the palette, garments and runtime hero attire. No new body/mesh is added, so other campaigns are
    unchanged. The dedicated Tambotoco hero sculpt remains E4b.

### m6b Cusco site composition (in-engine)

- **Location**: `docs/media/m6b-cusco-plaza-before-after.webp`, 1520x486 WebP q82.
- **Source**: `node scripts/bench_scene.mjs --mission=m6b_guerra_civil --stage=late --gpu --frames
  --viewport=1600x900 --shot=<file>` before (`review/b13-shots/m6b-after.png`) and after
  (`review/m6b-plaza-late.png`).
- **Content**: the Quipaipán late view. Left, the bundled grey ushnu GLB; right, the plaza, tiered ushnu and
  Sacsayhuamán wall front shared with `m_cusco_1536` (`src/campaign/defs/cuscoSite.ts`). Same mission, seed,
  camera and stage; only the site composition changed (+2.2k triangles, +4 draw calls).
- **Review**: the composition is the one accepted for the procedural sites on 2026-11-23; no historical claim
  beyond the authored abstraction.

### Site review pass: all 18 missions (in-engine)

- **Location**: `docs/media/site-review-2026-11-23-all.webp`, 1920x2316 WebP q78 (3x6 contact sheet, one cell
  per mission; the individual 1600x900 PNGs stay in `review/site-review-all/`, gitignored).
- **Source**: `yarn capture:sites --only=all --out=review/site-review-all --sheet=docs/media/site-review-2026-11-23-all.webp`.
- **Content**: every campaign mission's site at its final phase, HUD hidden, high preset. Approved by the human
  review on 2026-11-23 with no Major or Blocker (record in `docs/design/campaign-quality-bar.md`).
- **Supersedes**: `docs/media/site-review-2026-11-17.webp` (incomplete: four empty cells and no third row; the
  file is removed). The seven-mission pack below is the subset for the 2026-11-18 arc.
- **Review**: approved 2026-11-23 by Miguel Amaya with no Major or Blocker; the record is in
  `docs/design/campaign-quality-bar.md`.

### Site review pack: the seven missions of 2026-11-18 (in-engine)

- **Location**: `docs/media/site-review-2026-11-23-new-missions.webp`, 1920x1158 WebP q78 (3x3 contact sheet,
  one cell per mission; the individual 1600x900 PNGs stay in `review/site-review/`, gitignored).
- **Source**: `yarn capture:sites --only=new --sheet=docs/media/site-review-2026-11-23-new-missions.webp`
  (`scripts/capture_site_review.mjs`): loads each mission, starts it, advances the site phase, hides the HUD,
  pins the high preset and frames the site from the table (`at`/`height`, or the mission's own opening camera
  for `m_miraflores` and `m_brena`, whose sites are drawn procedurally).
- **Content**: Lima 1821 (colonial city), Miraflores (redoubt line), Real Felipe (bastioned trace), Tarapacá
  (village), Vilcabamba (fort), Cusco 1536 (plaza) and Breña (Huamachuco). These are game captures, never
  historical photographs, and they are **review evidence**: the human decision is recorded in the quality bar,
  not in this file.
- **Review**: the procedural sites of Real Felipe, Tarapacá and Vilcabamba were accepted as abstractions on
  2026-11-23 (Miguel Amaya; recorded in `docs/design/campaign-quality-bar.md`), and the rest of the seven were
  approved in the full campaign pass the same day. The worksheet with one row per mission is
  `review/site-review/decisions.md` and the procedure is `docs/design/asset-pipeline.md` §"In-engine site review".

### Late-view performance evidence (in-engine)

- **Location**: `docs/media/late-view-before-after.webp`, 1520x944 WebP q82.
- **Source**: `node scripts/bench_scene.mjs --mission=m6b_guerra_civil --stage=late --gpu --frames
  --viewport=1600x900 --shot=review/b13-shots/m6b-after.png` (the same command for `m8_independencia`), and the
  `before` row with the `src/` changes stashed. `--shot` writes a PNG of the exact framing the structural
  numbers come from.
- **Content**: the two tightest late views at the bench framing. The change is a rendering cost, not a look:
  the frames differ only in animation phase and the in-flight HUD, and the caption records the draw-call drop
  (898 → 615 and 912 → 593). Numbers and decision: `docs/development/site-view-performance.md` §"B13 follow-up".
- **Review**: no historical claim; these are performance captures of an existing scene.

### Cavalry rider (in-engine evidence)

- **Location**: `docs/media/cavalry-rider-before-after.webp`, 1520x856 WebP q72.
- **Source**: in-engine frames of `m8_independencia` (Sucre's cavalry) and `m_lima` (Pizarro) from the local
  trailer capture (`scripts/trailer_full.mjs`, untracked like the other trailer tools), before on `main` and
  after on this change, same seed, camera and frame. Left column before, right column after.
- **Content**: the low-poly GLB rider replaced by the shared infantry body seated on the mount
  (`docs/art/character-visual-pilot.md` §13). The uniforms are the infantry's current ones.
- **Review**: no new historical claim; the rider palette and headwear are the existing abstractions of
  `src/model/defs/postColonialCharacters.ts`.

### Closed uniforms (in-engine evidence)

- **Location**: `docs/media/uniform-closure-before-after.webp`, 1200x1120 WebP q72.
- **Source**: `node scripts/capture_uniform_lineup.mjs --gpu`, top half before the change (with
  `--out=review/uniforms-before`), bottom half after; same missions, seed, placement and camera.
- **Content**: four units per side (Hueste 1536, rebeldes and realistas 1780, patriotas 1814, Perú and Chile
  1879) at close range; `docs/art/character-visual-pilot.md` §14.
- **Review**: no new historical claim; colours stay within the abstractions of `docs/historia/atuendos.md` §3–4.

### Cavalry horse (in-engine evidence)

- **Location**: `docs/media/cavalry-horse-before-after.webp`, 1520x856 WebP q72.
- **Source**: the same local trailer capture as the cavalry rider evidence (`scripts/trailer_full.mjs`,
  untracked), `m_lima` and `m8_independencia`, same seed, camera and frame; left column the block horse with the
  seated shared-body rider, right column the Quaternius horse.
- **Content**: `docs/art/character-visual-pilot.md` §15. **Review**: no new historical claim.

### Character legibility (in-engine evidence)

- **Location**: `docs/media/character-legibility-before-after.webp`, 1520x856 WebP q72.
- **Source**: `node scripts/capture_rts_legibility.mjs`, left column before the change (with
  `--out=review/legibility-before`), right column after; same missions, placement, zoom and light.
- **Content**: the Inca warriors and slingers of `m_cusco_1536` and the m7 rebel infantry and cavalry at the
  default RTS zoom; `docs/art/character-visual-pilot.md` §16.
- **Review**: no new historical claim; the rebel coat stays an undocumented earth-tone abstraction.

### Character equipment fit (in-engine evidence)

- **Location**: `docs/media/character-equipment-before-after.webp`, 1180x1162 WebP q74.
- **Source**: captured with `node scripts/capture_character_pilot.mjs --out=review/pilot-after --only=inca,moche`;
  the before row is the same harness and placement run on `origin/main` (`e4da9166`) in a scratch worktree. Both
  rows were composed by `node scripts/character_pilot_sheet.mjs --before=<worktree>/review/pilot-before
  --after=review/pilot-after --out=docs/media/character-equipment-before-after.webp`. No Blender or GIMP source:
  the pieces are runtime geometry in `src/rendering/workerAttire.ts`.
- **Content**: `docs/art/character-visual-pilot.md` §18. Top row the 0.145 m bowl helmet, the porra's star at the
  ankle and the rodela hanging at the thigh; bottom row the cap measured on the head, the club upright in its grip
  group and the shield at the hand.
- **Review**: no new historical claim. The measured head, the grip and the shield's offset are presentation, and
  the cotton cap's quilted rim stays the abstraction the dossier already documents.

### Andean tunic body paint (in-engine evidence)

- **Location**: `docs/media/character-tunic-before-after.webp`, 1180x1162 WebP q74.
- **Source**: capture with `node scripts/capture_character_pilot.mjs --out=review/pilot-tunic-after
  --only=inca,moche`; the before row is the same harness and placement run from a scratch worktree at
  `b6b56812` with `--out=<worktree>/review/pilot-tunic-before`. Both rows were composed by
  `node scripts/character_pilot_sheet.mjs --before=<worktree>/review/pilot-tunic-before
  --after=review/pilot-tunic-after --out=docs/media/character-tunic-before-after.webp
  --footer="The body under the Andean tunic and skirt painted in the garment's own colour ·
  docs/art/character-visual-pilot.md §19"`. No Blender
  or GIMP source: the paint is runtime geometry and a vertex attribute in `src/rendering/bodyPaint.ts` and
  `src/rendering/workerAttire.ts`.
- **Content**: `docs/art/character-visual-pilot.md` §19. Top row the skin showing through the Inca and Moche
  tunics at the chest, shoulder and belly; bottom row the body painted under the garments in the weave ×
  garment tint.
- **Review**: no new historical claim and no new garment. The painted colour is the existing tunic/skirt
  colour; only the body vertices under those shells change.

### Horse legs (in-engine evidence)

- **Location**: `docs/media/horse-legs-before-after.webp`, 1200x450 WebP q72.
- **Source**: a local close capture of one `m_lima` cavalry unit in the gallop at two clip times, left with the
  first horse build (`b829322a…`), right with the rebuild; same camera, light and frame.
- **Content**: `docs/art/character-visual-pilot.md` §17. **Review**: no new historical claim.

### Character proportions (in-engine evidence)

- **Location**: `docs/media/character-proportions-before-after.webp`, 2240x940 WebP q84.
- **Source**: captured from the game with `node scripts/capture_character_pilot.mjs --out=review/proportions`
  (after) and the same command after restoring `git show HEAD:src/assets/models/caral_worker.glb` to the
  asset path (before). The capture spawns its own subject at a fixed spawn point, noon light, HUD hidden.
- **Content**: Inca, Moche, 16th-century Spanish and 1879 fusilier, same mission/camera/pose; top row is the
  pre-pass worker, bottom row the baked +12 % head/hands and waist taper. The measured head/body ratio is
  7.77 → 7.04 (female) and 7.94 → 7.21 (male). The 26 affected visual baselines were regenerated with
  `yarn visual:update`.
- **Review**: no historical claim; the proportions are a presentation abstraction.

- **`tambotoco_hero.glb` (Tambotoco hero)**: male-only derivation of `caral_worker.glb` for Ayar Manco,
  with the Killke tunic/wrap and the `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sword_Regular_A`, `Death01` and
  `Hit_Chest` clips. It uses
  the same CC0 Quaternius body/hair and the project-authored cotton garment; the female body, the non-hero
  clips and the unused garments are removed before export. E7 bakes the proportion pass: the head and hands
  are +12% around their bone pivots and the shoulders/waist get a gentle taper, so the runtime bone scaling
  is gone. A hand-sculpted replacement can still swap the same asset and clips.
  - Built by `yarn models:hero`: `node scripts/build_caral_worker.mjs --hero --out=review/tambotoco_hero_base.glb`,
    then `blender --background --python scripts/blender/bake_character_proportions.py -- --in=review/tambotoco_hero_base.glb --out=src/assets/models/tambotoco_hero.glb`,
    then `node scripts/simplify_caral_worker.mjs --file=src/assets/models/tambotoco_hero.glb --hero`.
    Blender is a local authoring dependency; the committed GLB is the shipped asset.
  - SHA-256: `aefca7d6ff34a0fe4f101ad3d1703c1cf56fbbadc9772d2760eedd4161740e6b` (1,550,636 bytes).
  - Contents: 7 meshes / 7 materials, 6 clips, one 65-bone skeleton, 6,913 GLB triangles; the scene probe
    measures 7,230 visible triangles / 9 draws on Manco including the runtime attire (the common unit is
    9,628 tris / 14 draws). It is preloaded for
    matches whose civs include `INCA_KILLKE` (Tambotoco and a Killke skirmish).

- **`quaternius_horse.glb` (Viceroyalty/Republic cavalry mount, asset id `mounted_rig`)**: _Horse_ by
  Quaternius, from the **Ultimate Animated Animal Pack** (CC0 1.0), the same pack as the alpaca.
  - Model page: <https://poly.pizza/m/qvTrSG9pZF> (Quaternius, Public Domain/CC0 1.0, dated 2021-09-07, tagged
    Animated). The page does not name the pack; its date and tags match the July 2021 pack.
  - Downloaded from <https://static.poly.pizza/d37dbc87-ca61-4b2c-a2da-d2f0c4240bef.glb> on 2026-11-24 and
    kept untouched as `art-src/quaternius/horse.glb`, SHA-256
    `fae7a7ec91e0d6a33554efb896fac9c4e8c632644183bcb8cc962f673d3ce609` (1,108,124 bytes; 8 materials, ~2.1k
    triangles, 50 joints, 13 clips plus FBX duplicates).
  - Built by `node scripts/build_mounted_horse.mjs`: keeps `Idle`, `Walk` (trot), `Gallop`, `Attack_Headbutt`
    (the charge) and `Death`, drops only the translation and scale tracks that do not move (the leg IK bones
    carry the hooves by translation, so theirs stay), resamples and re-encodes with meshopt. Output
    `src/assets/models/quaternius_horse.glb`, SHA-256
    `505334a4db94a04aad6af9548e2bdfce72001238b375b416149b61076452f6c3` (327,616 bytes). The first build
    (`b829322a…`, 319,340 bytes) dropped every non-root translation and left the hooves behind the legs.
  - Fit: `scale` 0.46 puts the back at ~1.6 m against the 1.86 m person. `src/rendering/mountedAttire.ts` tints
    the coat, its light/dark shades and the mane/tail per side (`mountedCharacters.ts`), adds a code-generated
    saddle cloth in the side's trim colour and a leather saddle, and seats the shared infantry body on the
    `Torso2` bone.
  - Historical basis: horses are post-1532 only. The horse is a stylized low-poly silhouette, not a breed; the
    coats and tack are presentation abstractions, not a breed or regimental claim.
  - Replaces the project-authored `mounted_rig.glb` (low-poly horse and rider built by
    `scripts/blender/build_mounted_rig.py` from `art-src/blender/scenes/mounted_rig.blend`), retired on
    2026-11-24; the files remain in git history.

- **`siege_rig.glb` (post-1532 artillery/mortar + contemporary tank)**: project-authored low-poly
  cannon/mortar crew and tank used by #241b for `ARTILLERY`, `MORTAR`, `TANK` and contemporary `CAVALRY`.
  - Source: `art-src/blender/scenes/siege_rig.blend` (Git LFS), generated by
    `scripts/blender/build_siege_rig.py`; no external model, texture, animation or HDRI is used.
  - Licence: project-owned (same terms as the repository); no third-party attribution is required.
  - SHA-256: `30a24b4c7d215fd167687d1dcfb6c1e58d14c9212a28d3ac5d5ee1e81572dfd1` (177,552 bytes).
  - Contents: one 33-bone armature, four groups (cannon, mortar, crew, tank), 16 meshes, 10 materials,
    four clips (`Idle_Loop`, `Walk_Loop`, `Attack`, `Death`). The variant dressing shows one weapon group
    plus the crew for cannon/mortar, or the tank alone.
  - Historical basis: no cannon, mortar or vehicle appears before 1532; the tank is contemporary only.
    The carriage/vehicle silhouettes and crew palette are stylised abstractions of the documented
    `docs/historia/atuendos.md` §6 rows, not reconstructions of a specific piece or uniform.

- **`vehicle_rig.glb` (contemporary Republic vehicles)**: project-authored low-poly motorcycle, anti-air piece
  and rocket truck used by #327 for contemporary `HUSSAR`, `ANTI_AIR` and `NUCLEAR`.
  - Source: `art-src/blender/scenes/vehicle_rig.blend` (Git LFS), generated by
    `scripts/blender/build_vehicle_rig.py`; no external model, texture, animation or HDRI is used.
  - Licence: project-owned (same terms as the repository); no third-party attribution is required.
  - SHA-256: `5f2ad4e27adb74436952319cd6f8ac51e25fa16456332baa8a18b79f3d5bf313` (208,720 bytes).
  - Contents: one 41-bone armature, three vehicle groups (motorcycle, AA, rocket truck) with their riders,
    18 meshes, 7 materials, four clips (`Idle_Loop`, `Walk_Loop`, `Attack`, `Death`); the variant
    dressing shows one vehicle group per instance and tints its painted metal and rider uniform with the
    contemporary Republic palette.
  - Historical basis: the contemporary row of `docs/historia/atuendos.md` §5 covers the campaign uniform and
    explicitly marks it as an approximation; it documents no specific vehicle. Motorcycles, anti-aircraft guns
    and rocket artillery are therefore generic 20th-century silhouettes gated to the Contemporary period, not
    reconstructions of a specific model or unit. No claim of a historical photograph or exact equipment is made.

## Fauna (rigged)

- **Location**: `src/assets/models/quaternius_alpaca.glb` (loaded by `src/rendering/Wildlife.ts` through the same
  `ModelAssets` cache).
- **Asset**: _Alpaca_ from Quaternius' **Ultimate Animated Animal Pack** (CC0 1.0). Used as the **llama pilot**:
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
  - Runtime uses: the ambient llama keeps the bare rig. The `CARAVAN` unit uses the presentation-only
    `caravan` variant (`src/rendering/caravanAttire.ts`), which attaches code-generated pack, sacks and ropes
    to the `Back` bone; it adds no new model or texture to this GLB.

## Fauna (procedural hunt herds)

- **Hunt herds**: `HuntHerd` (`src/rendering/HuntHerd.ts`) is presentation-only; the resource amount, carcass
  states and save data are unchanged. The herd species follows the map type via `huntSpeciesFor`
  (`src/model/defs/wildlife.ts`): vicuña in `andes`/`altiplano`, deer in `coast`/`jungle`.
- **Sourcing**: the deer is documented for the Supe riparian forest in
  [`docs/historia/campanas/caral.md`](./docs/historia/campanas/caral.md). Reusing that model on other coasts
  and in the jungle is an **inferred generic game abstraction**, not a species claim. The Caral ambient deer
  uses the Blender kit `caral_deer.glb`; the hunt deer uses the procedural `faunaModels.ts` template. No new
  asset or SHA is introduced.

## Reference images (AI generation input)

Used only as FLUX.2 multi-reference inputs (never redistributed) for the Andean textiles. Manifests in
`scripts/refs.json`; images downloaded to `scripts/_refs/` (gitignored). All sources are public domain.

| Slot            | Object                                      | Source                 | License       |
| --------------- | ------------------------------------------- | ---------------------- | ------------- |
| `textile_inca`  | Tunic (Inca, 1450–1550)                     | The Met, object 313152 | Public Domain |
| `textile_wari`  | Tunic (Wari, 425–550)                       | The Met, object 314355 | Public Domain |
| `textile_nazca` | Tunic with Confronting Catfish (Nasca-Wari) | The Met, object 307975 | Public Domain |

## Commander portraits

- **Location**: generated at runtime by `src/ui/Portrait.ts` (inline SVG, no image files).
- **Nature**: stylized medallions (bust silhouette + civilization palette + emblem + initials), **not**
  attested likenesses. Data and status live in `src/model/defs/commanders.ts`; pre-Hispanic figures are
  marked `abstraction`. Roles, dates and events follow [`docs/historia/`](./docs/historia/).

## D2 model-mission site review (in-engine evidence)

- **Location**: [`docs/media/site-review-2026-11-23-all.webp`](docs/media/site-review-2026-11-23-all.webp)
  (1920×2316 WebP q78 contact sheet).
- **Source**: `yarn capture:sites --only=all --out=review/site-review-all
--sheet=docs/media/site-review-2026-11-23-all.webp` on the current build, 1600×900 per cell, seed 777, HUD
  hidden, each site advanced to its final phase; individual PNGs stay in the gitignored
  `review/site-review-all/`.
- **Content**: one current site view per released mission. These are review evidence; the approval itself is
  recorded in `docs/design/campaign-quality-bar.md` (Art review record, 2026-11-23, Miguel Amaya).
- **Review**: approved 2026-11-23, no Major or Blocker. It supersedes the 2026-11-17 sheet, which was
  incomplete (four empty cells and no third row) and has been removed.

## External references (technical only, no code)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): only the **idea** of the
  slot-based PBR terrain pipeline (albedo + packed surface) with blending by slope/elevation is taken.
  No files or assets from it are copied.
