# Blender art pipeline

This pipeline uses **Blender renders** as the primary source for historical campaign art,
architecture references, educational maps and tour concept art. The earlier AI-illustration
pilot was superseded by this pipeline and is no longer maintained.

The editable Blender project lives in the repository at `art-src/blender`. The `.blend`
sources are tracked with Git LFS; the renders, GLB exports, source manifest and hashes live
alongside them so provenance is reproducible. Blender is **not** a CI dependency.

## Data chain

```text
Blender project (.blend, .glb)
        ↓
renders/*.png                    (art-src/blender)
        ↓
GIMP 3.2                         (optional 2D retouch / post-process)
        ↓
art-src/blender/caral/renders.json
  + caral_asset_manifest.csv
  + source SHA-256 hashes
        ↓
yarn art:blender                 (verify, resize, WebP, manifest)
        ↓
src/art/manifest.json
public/media/generated/...       (WebP + variants)
public/media/generated/PROVENANCE.md
        ↓
HUD briefing / campaign prologue / Codex
```

## Source project

- Path: `art-src/blender/` (`.blend`/`.xcf` in Git LFS).
- Blender 5.2.2 LTS; authoring uses the local `mcp-for-blender` MCP (safe mode, port 9876).
- Scenes: `scenes/caral_city_master.blend`, `scenes/caral_rts_kit.blend`,
  `scenes/caral_vertical_slice.blend`, `scenes/caral_game_export.blend`.
- Exports: `exports/caral_pyramide_mayor.glb`, `exports/caral_rts_kit.glb` and the two city LODs.
- Asset table: `caral/caral_asset_manifest.csv` (footprints, heights, triangles, confidence).
- Renders: 1600×900 PNGs in `renders/`.
- 2D retouching: GIMP 3.2.6 through `gimp3-mcp` (port 9877), `.xcf` sources in
  `art-src/gimp/projects/`.

The exact `.blend`/`.glb` and render hashes are in
[`art-src/blender/caral/README.md`](../../art-src/blender/caral/README.md).

## Authoring tools

Blender and GIMP are local authoring tools, not runtime or CI dependencies. See
[`authoring-tools.md`](./authoring-tools.md) for installation, ports, safe mode, skills and
the source contract.

- Blender: `mcp-for-blender` over `localhost:9876`; safe mode enabled. Start the addon server
  from **N → MCP for Blender → Start MCP Server**.
- GIMP: `gimp3-mcp` 0.2.0 over `localhost:9877`. Start it from **Tools → MCP → Start MCP
  Server**. The plugin is installed in `~/.config/GIMP/3.2/plug-ins/gimp-mcp-plugin/`.
- `opencode.json` is local/gitignored; the tracked example is
  [`opencode.authoring.example.json`](./opencode.authoring.example.json).
- New `.blend`/`.xcf` files are stored in Git LFS (see `.gitattributes`).

## Game GLB showcase

The Blender project also exports the whole Caral city for the game:

| File                                    | LOD  | Tris   | Parts | Materials | Bytes   |
| --------------------------------------- | ---- | ------ | ----- | --------- | ------- |
| `src/assets/cities/caral_city_lod0.glb` | LOD0 | 18,120 | 10    | 10        | 906,728 |
| `src/assets/cities/caral_city_lod1.glb` | LOD1 | 6,194  | 10    | 10        | 454,348 |

Source: `art-src/blender/scenes/caral_game_export.blend`; export manifest:
`art-src/blender/caral/caral_city_game_manifest.csv`. Bounds are 30.4 × 2.814 × 49.628 game units,
Y-up, pivot at the centre of the footprint at ground level, main stair +Z. The city is merged by
material (10 draw calls) and excludes terrain/trees/rocks/humans.

`src/rendering/StaticModel.ts` loads static glTF/GLB files without requiring animation clips
(the unit `ModelAssets` path rejects files with no clips). `?city=caral` mounts a standalone
showcase with both LODs, shadows, orbit controls and `window.__cityDemo`.

```bash
yarn dev
# http://localhost:5173/?city=caral
```

The showcase exposes `bounds`, `lod0Triangles`, `lod1Triangles`, `drawCalls`, `materials`,
`lodLevel`, `setLod()` and `dispose()` for review/tests.

### Known caveats

- `MAT-Sand_Desert` is exported without a `baseColorFactor`; the viewer applies a sand fallback.
  Fix the material in Blender before using the city in the campaign.
- The export includes plaza stalls (`GEO-Caral_PlazaCentral_Stall_*`). The campaign says Caral has
  no attested market; review/remove them or document them as a plaza-gathering abstraction.
- The footprint (30×50) is much larger than the current landmark (~12×16) and needs a flat pad,
  a dedicated placement rule and a decision between visual-only and obstacle.
- The height (2.814) may read too flat at RTS zoom; this needs an in-game capture before integration.
- The full-city GLB is **showcase only**. `m1_caral` now uses the exact Ciudades Sagradas
  sacred-site GLB (`caral_site_lod0/1.glb`), not this showcase export and not the modular scenery.

## Chavín site source

`m2_chavin` uses the project's Chavín preview model, re-exported without the
CyArk-derived Lanzón scan. The cleaned sources live in
`art-src/blender/chavin/chavin_lod0_clean.blend` / `chavin_lod1_clean.blend`
(LFS); the runtime GLBs are `src/assets/sites/chavin/chavin_site_lod0.glb` /
`chavin_site_lod1.glb`. The reproducible export is
`scripts/blender/export_chavin_site.py`; the campaign render is
`art-src/blender/chavin/renders/chavin_hero.png`. The Lanzón in the game is a
project-owned low-poly interpretation, not the scan. See
`docs/design/chavin-sacred-site.md`.

## Moche site source

`m3_moche_recuay` uses a project-owned reconstruction of the Huacas del Sol y
de la Luna. The editable master and LODs live in
`art-src/blender/moche/` (Git LFS); the runtime GLBs are
`src/assets/sites/moche/moche_site_lod0.glb` / `moche_site_lod1.glb`. The
reproducible builder/exporter is `scripts/blender/build_moche_site.py`; the
campaign render is `art-src/blender/moche/renders/moche_hero.png`. It is a
representative reconstruction, not a survey. See `docs/design/moche-sacred-site.md`.

## Wari site source

`m4_wari` uses a project-owned synthesis of the Wari monumental core. The
editable master and LODs live in `art-src/blender/wari/` (Git LFS); runtime GLBs
are `src/assets/sites/wari/wari_site_lod0.glb` / `wari_site_lod1.glb`. The
builder/exporter is `scripts/blender/build_wari_site.py`; the briefing render is
`art-src/blender/wari/renders/wari_hero.png`. It is a representative
reconstruction, not a survey. See `docs/design/wari-sacred-site.md`.

## Mission decor GLBs (m5–m9)

The later campaigns use dedicated low-poly decor models instead of only the procedural landmark
builder. Sources and LODs live in `art-src/blender/mission-decor/` (Git LFS); the reproducible
builder is `scripts/blender/build_mission_decor.py`. Runtime GLBs are in
`src/assets/sites/{chanca,chimu,colonial,independence,arica}/`.

| Mission | Model | Historical reference | Status |
| --- | --- | --- | --- |
| m5 Yahuar Pampa | `chanca_fortress` | Chanca pucará / highland fortress | authored site (heightfield + collision) |
| m6 Chimú–Inca | `chimu_compound` | Chimú adobe compound and audience | authored site (heightfield + collision) |
| m7 Túpac Amaru | `colonial_church` | colonial church and plaza | authored site (heightfield + collision) |
| m8 Independencia | `independence_chapel` | campaign chapel and patriot camp | authored site (heightfield + collision) |
| m9 Arica | `arica_battery` | port terrace, battery and warehouse | project-owned abstraction |

Each model has LOD0/LOD1 and is loaded through `src/rendering/decorModels.ts`; the procedural
landmark remains the fallback if a GLB fails. They are visual-only: collision and pathfinding stay
with the mission terrain and layout. `?lod=0` previews the master.

## Modular scenery

The first modular asset is `caral_pyramid_mayor` (Pyramid Mayor + Plaza Mayor). It is
isolated from `scenes/caral_rts_kit.blend`, excludes `PlazaCentral`, the market stalls and
the terrain, and is rebuilt by `scripts/blender/build_caral_scenery.py --asset=pyramid-mayor`.

| LOD  | Size X × Y × Z (game axes) | Tris  | Draw calls | Materials | Bytes   |
| ---- | -------------------------- | ----- | ---------- | --------- | ------- |
| LOD0 | 13.904 × 2.7744 × 15.5352  | 6,044 | 7          | 7         | 293,796 |
| LOD1 | 13.904 × 2.7744 × 15.529   | 2,408 | 7          | 7         | 154,020 |

- Pivot: footprint centre at ground level; foundations extend to -0.16.
- Orientation: Y-up; main stair +Z.
- The source objects are `GEO-Caral_PyramideMayor_LOD0` and `GEO-Caral_PlazaMayor_LOD0`.
- `?scenery=caral` mounts the LOD showcase; `?city=caral` remains the full-city showcase.
- Showcase only. `m1_caral` uses the exact sacred-site GLB instead; this modular Pyramid Mayor is not
  placed in the campaign.

### Upper-Half pyramids

The other five pyramids of the Upper Half are separate modular assets, exported with the same
script from the matching `caral_rts_kit.blend` objects:

| Asset                   | Plan anchor | LOD0 tris | Draw calls | Bytes  |
| ----------------------- | ----------- | --------- | ---------- | ------ |
| `caral_pyramid_central` | `central`   | 792       | 3          | 46,128 |
| `caral_pyramid_quarry`  | `quarry`    | 792       | 3          | 46,132 |
| `caral_pyramid_lesser`  | `lesser`    | 792       | 4          | 46,776 |
| `caral_pyramid_gallery` | `gallery`   | 924       | 3          | 53,252 |
| `caral_pyramid_huanca`  | `huanca`    | 792       | 4          | 46,780 |

These modules remain showcase/source assets. The campaign does not assemble them: `m1_caral` uses the
exact sacred-site GLB with its own Great Pyramid, Upper-Half complexes and Anfiteatro.

Rebuild one module with:

```bash
blender --background art-src/blender/scenes/caral_rts_kit.blend \
  --python scripts/blender/build_caral_scenery.py -- \
  --asset=central-pyramid
```

### Anfiteatro

`caral_anfiteatro` combines `GEO-Caral_TemploAnfiteatro_LOD0`, `GEO-Caral_AltarCircular_LOD0` and
`GEO-Caral_TemploBanqueta_LOD0`. The banqueta is a detached small platform in the source layout.

| LOD  | Size X × Y × Z (game axes) | Tris  | Draw calls | Materials | Bytes   |
| ---- | -------------------------- | ----- | ---------- | --------- | ------- |
| LOD0 | 19.704 × 1.016 × 7.2       | 3,520 | 7          | 7         | 170,580 |
| LOD1 | 19.704 × 1.016 × 7.2       | 1,403 | 7          | 7         | 84,880  |

- Pivot: footprint centre at ground level; foundations extend to -0.2.
- Orientation: Y-up; the source kit places the main approach toward +Z.
- `MAT-Sand_Desert` is fixed at build time by removing the procedural Base Color link that the glTF
  exporter cannot represent; the GLB exports its base color.
- `?scenery=caral-anfiteatro` mounts the showcase.
- Showcase only. `m1_caral` no longer places the modular Anfiteatro; its exact counterpart is part
  of the sacred-site GLB. The scenery demo remains visual-only and has no collision or pathfinding.

## Source manifest

`art-src/blender/caral/renders.json`:

```json
{
  "version": 1,
  "sourceRoot": "art-src/blender",
  "assets": [
    {
      "id": "m1_caral-intro",
      "type": "campaign-intro",
      "scope": "mission",
      "campaignId": "la-senda-del-sol",
      "missionId": "m1_caral",
      "civilization": "caral",
      "period": 0,
      "era": 0,
      "region": "central_coast",
      "topic": "campaign_intro",
      "sceneType": "urban_ceremonial",
      "asset": "media/generated/campaigns/la-senda-del-sol/m1_caral/intro.webp",
      "render": "renders/caral_hero.png",
      "sceneFile": "scenes/caral_city_master.blend",
      "confidence": "documentado en planta; techos y remates inferidos",
      "camera": "hero",
      "renderer": "unknown",
      "license": "project-owned",
      "author": "Miguel Amaya",
      "renderedAt": "2026-10-23T21:07:44-05:00",
      "sourceSha256": "428f…",
      "sources": ["docs/historia/civilizaciones/caral.md", "…"],
      "alt": "…",
      "caption": "Caral, Arcaico Tardío · Render 3D del proyecto",
      "nature": "concept-art"
    }
  ]
}
```

`sourceRoot` is relative to the repository. Override it with `--source-root=` if the
Blender source layout moves.

## Ingestion

```bash
yarn art:blender
yarn art:blender --dry-run
yarn art:blender --only=m1_caral-intro --force
yarn art:blender --source-root=art-src/blender
yarn art:validate
```

The ingestion:

1. validates the source manifest (ids, types, civ/period/region, paths, sources);
2. resolves the source PNG and verifies its SHA-256 (when pinned);
3. resizes/crops and converts it to budgeted WebP with `sharp`;
4. writes the main asset and optional variant;
5. upserts the manifest record and regenerates `PROVENANCE.md` + the public manifest copy;
6. validates the full manifest and assets.

It never calls an AI provider and never runs Blender.

## Manifest record

`src/art/manifest.json` is the canonical machine-readable manifest. Each record includes:

- `id`, `type`, `scope`, `campaignId`, `missionId`, `civilization`, `period`, `era`, `region`;
- `topic`, `sceneType`, `asset`, `variants`;
- `sources` (dossier paths and the Blender asset CSV);
- `promptVersion` (`v1-blender-<hash>`), a render description, `negativePrompt: n/a (blender render)`;
- `provider: "blender"`, `model` (renderer), `generatedAt`;
- `nature`, `reviewed`, `reviewer`, `reviewedAt`, `disclaimer`;
- `alt`, `caption`, dimensions, bytes, WebP format, SHA-256;
- `blender`: `sceneFile`, `sourceRender`, `sourceSha256`, `sceneAssetId`, `confidence`,
  `camera`, `renderer`, `license`, `author`, `renderedAt`.

Every record answers where the render came from, which scene/camera produced it, which
historical sources support it, how confident the reconstruction is, and whether a human
reviewed it.

## Asset layout

```text
public/media/generated/
  campaigns/<campaignId>/<missionId>/intro.webp
  education/<civ>/<topic>.webp
  tours/<civ>/<topic>.webp
  PROVENANCE.md
  manifest.json
```

Assets are served from `public/` and are **not bundled** into the JavaScript. The UI uses the
Vite base URL, `loading="lazy"`, `decoding="async"` and a `?v=<promptVersion>` cache buster.
Campaign intro, map, environment and tour assets get a smaller `srcset` variant.

## UI integration

- `HUD.showBriefing()` shows the mission intro for `m1_caral`.
- `HUD.showCampaignIntro()` falls back to the `m1_caral` intro for the campaign prologue.
- The Codex campaign tab shows the first image for the mission.
- Captions always include: “No es una fotografía histórica: es un render 3D del proyecto.”
- Only `reviewed: true` assets are shown by default. Use `?art=all` (legacy `?aiart=all` also
  works) to preview drafts with a “Borrador sin revisar” badge.
- If no asset exists, the UI is unchanged.

## Pilot: Caral (`m1_caral`)

| Asset                        | Source render                | Type            |
| ---------------------------- | ---------------------------- | --------------- |
| `m1_caral-intro`             | `caral_hero.png`             | campaign intro  |
| `caral-architecture-pyramid` | `caral_mayor_close.png`      | architecture    |
| `caral-religion-plaza`       | `caral_anfiteatro_close.png` | religion        |
| `caral-map-city`             | `caral_ortho_top.png`        | educational map |
| `caral-tour-isometric`       | `caral_rts_isometric.png`    | tour concept    |

Caral is the first pilot because it has a complete Blender scene, a documented asset table and
an existing visual/campaign pilot in the repo. Missing categories (daily life, agriculture,
technology) can be added as new Blender renders; Caral has no documented war or ruler names,
and its clothing/faces are not documented, so a character-reference render is intentionally
out of scope.

## Adding a render

1. Render a new PNG into `art-src/blender/renders/` with a stable name. Optional GIMP
   retouching must export the final PNG to the same path and update the hash.
2. Add an entry to `art-src/blender/caral/renders.json` with the source hash, scene, camera,
   confidence, sources and Spanish `alt`/`caption`.
3. Run `yarn art:blender --only=<id>` for a new render, or add `--force` when replacing an
   existing render after retouching.
4. Review the WebP and run `yarn art:review --id=<id> --reviewer=<name> --approve`.
5. Run `yarn art:validate` and `yarn verify:fast`.

## Provenance and licence

- Renders are project-owned (`license: project-owned`), authored by Miguel Amaya.
- The source `.blend` files are in `art-src/blender/scenes` (Git LFS); their hashes are recorded in
  `art-src/blender/caral/README.md`. `.glb`/`.fbx` exports are tracked normally.
- GIMP `.xcf` sources live in `art-src/gimp/projects` (Git LFS); exported PNG/WebP files live in
  `art-src/gimp/exports` or replace the corresponding Blender render.
- Before publishing, audit the `.blend` scenes for external textures/HDRIs/models and record
  their licences.
- A render is an **artistic reconstruction**, not a photograph. The UI always says so.
- The raw source exports `caral_pyramide_mayor.glb`/`caral_rts_kit.glb` are not used at runtime. The
  modular Pyramid Mayor, five Upper-Half pyramids and Anfiteatro GLBs are showcase/source assets;
  `m1_caral` uses the exact sacred-site GLB instead.

## Verification

- `yarn art:validate` checks the manifest schema, historical ids, file existence, WebP header,
  dimensions, byte budgets, hashes, sources and review metadata.
- `tests/art-manifest.test.ts` covers the schema and file validation.
- `tests/art-caral-pilot.test.ts` checks the source manifest, ids, sources and pilot mapping.
- `yarn verify:fast` runs typecheck, lint, format, tests and build.
