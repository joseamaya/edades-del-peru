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
  small bird. Shapes are stylized.

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
  human review on 2026-11-07 (Miguel Amaya; `reviewer` and `reviewedAt` in each manifest). The three camp
  pieces are new and ship `reviewed: false` until a human review records `reviewer` and `reviewedAt`; a
  rebuild exports every piece unreviewed again.

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
- **Runtime (menu)**: `intro-ciudad` is the Virreinato campaign card and the briefing art for `m_lima`;
  the intro beats, the Act II/III chapter cards and the victory epilogue use the captures.
- **Content**: project-owned game renders (authored coast terrain, the reused colonial plaza and the
  procedural settlements). They are recreations of the game's own scenes: never historical photographs.
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status in `src/art/manifest.json`.

### Los hijos de Tambotoco intro, chapter and epilogue images (in-engine recreations)

- **Location**: `public/media/tambotoco/intro-{cueva,huanacaure,valle,epilogo}.webp` (960x540, WebP q58,
  ~78 KB in total).
- **Source**: captured from the game itself by `scripts/capture_tambotoco_intro.mjs`. The cave/settlement,
  the Huanacaure huaca and the valley are staged through the debug harness, rendered without the HUD at
  1600x900 and resized with `sharp`; the epilogue uses a low cinematic camera over the valley at dusk.
  Regenerate them with `node scripts/capture_tambotoco_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime (menu)**: `intro-huanacaure` is the Inca campaign card; `intro-cueva` is the briefing art for
  `m_tambotoco`; the intro beats, the Act II–IV chapter cards and the victory epilogue use the captures.
- **Content**: project-owned game renders (authored terrain, the reused chanca pucará and the procedural
  settlement). They are recreations of the game's own scenes: never historical photographs and not a claim
  that the Ayar myth happened.
- **Review**: no human art-review gate applies to in-engine captures; the reused chanca pucará GLB keeps
  its own review status in `src/art/manifest.json`.

### La Junta del Cusco intro, chapter and epilogue images (in-engine recreations)

- **Location**: `public/media/junta/intro-{cabildo,apacheta,umachiri,epilogo}.webp` (960x540, WebP q58,
  ~56 KB in total).
- **Source**: captured from the game itself by `scripts/capture_junta_intro.mjs`. The Cusco cabildo and the
  La Apacheta/Umachiri views are staged through the debug harness, rendered without the HUD at 1600x900 and
  resized with `sharp`; the epilogue uses a low cinematic camera over Umachiri at dusk. Regenerate them with
  `node scripts/capture_junta_intro.mjs` (one with `--only=ID`) after art changes.
- **Runtime (menu)**: the briefing and the "Tu senda" card use `intro-cabildo`; the campaign card for La
  Independencia reuses it. The intro beats, the Act II/III chapter cards and the victory epilogue use the
  other three captures.
- **Content**: project-owned game renders (authored terrain, the reused `colonial_site` plaza and the
  procedural patriot camp). They are recreations of the game's own scenes: never historical photographs,
  and not Blender renders (so not in `src/art/manifest.json`).
- **Review**: no human art-review gate applies to in-engine captures; the reused colonial plaza GLB keeps
  its own review status in `src/art/manifest.json`.

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
- **Historical caveat**: representative centre, not a survey. Roofs, heights and
  some reliefs are inferred; the Lanzón is an interpretation, not the scan. See
  `docs/design/chavin-sacred-site.md`.

### Chavín architecture kit and in-engine captures (m2)

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
- **Captures**: `public/media/chavin/intro-{valle,templo,peregrinos,nuevo,declive}.webp`, generated from
  the running game by `scripts/capture_chavin_intro.mjs` (1600×900, resized to 800×450 WebP). They are
  in-engine recreations, **never historical photographs**; they are used by the narrated intro, the
  chapter cards and the epilogue.
- **Historical caveat**: representative centre, not a survey. Roofs, heights, the exact construction
  sequence and some reliefs are inferred; the Lanzón is an interpretation, not the scan. See
  `docs/design/chavin-sacred-site.md` and `docs/design/chavin-model-mission.md`.

## Rigged 3D models

- **Location**: `src/assets/models/*.glb` (loaded by `src/rendering/ModelAssets.ts`).
- **`ual_mannequin.glb`**: Quaternius _Universal Animation Library_ (UAL1.glb), a generic rigged mannequin used
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

- **`mounted_rig.glb` (Viceroyalty/Republic cavalry)**: project-authored low-poly horse and rider used by
  #241a for `HUSSAR`/`CAVALRY` in the late-colonial rebel and post-colonial civilizations.
  - Source: `art-src/blender/scenes/mounted_rig.blend` (Git LFS), generated by
    `scripts/blender/build_mounted_rig.py`; no external model, texture, animation or HDRI is used.
  - Licence: project-owned (same terms as the repository); no third-party attribution is required.
  - SHA-256: `caed4f55fa36dfcc1216d88cf1b707f1f0bf74e5c66028ab84e03afea1540ab3` (193,472 bytes).
  - Contents: one armature (30 bones), separate low-poly horse/rider meshes, 12 source materials (10 after meshopt dedupe), four clips
    (`Idle_Loop`, `Walk_Loop`, `Attack`, `Death`), ~2.55k render vertices, ~2.12 m tall at the hat.
  - Historical basis: horses and firearms are post-1532 only. The horse/tack silhouette is stylized, not a
    breed or a specific historical mount; the rider palette/headwear follows the documented abstractions in
    `docs/historia/atuendos.md` §6 and `src/model/defs/mountedCharacters.ts`. No claim is made that a
    particular unit wore this exact uniform.

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

## External references (technical only, no code)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): only the **idea** of the
  slot-based PBR terrain pipeline (albedo + packed surface) with blending by slope/elevation is taken.
  No files or assets from it are copied.
