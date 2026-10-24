# Caral — Blender source assets

The editable Blender project lives **in this repository** at `art-src/blender`.
The `.blend` sources are tracked with Git LFS; the renders, GLB exports, source manifest
and hashes live alongside them so provenance is reproducible.

## Source files

| File | SHA-256 |
|---|---|
| `scenes/caral_city_master.blend` | `d3e7120fd47fc3806a697f33daac0073f097581e4ec743b5f0d9f995b1ea0e5c` |
| `scenes/caral_rts_kit.blend` | `d2dea20d8f2dcef28b2b76cb06781776f20e33de60da58d2cea9de9a6f90ebdc` |
| `scenes/caral_vertical_slice.blend` | `e20b94cb62da9e1f7ad5a77c497771f3b6cf8823fc9d40275dd8e47a1bc959b1` |
| `scenes/caral_game_export.blend` | `26d7de923806421967cdd21eefee54013990172511540d1a5eda65ea6875558f` |
| `exports/caral_pyramide_mayor.glb` | `a6d7967f631446ff8b4a4610098e90a5fce569d7b6b707b8a3a346f9c0131d17` |
| `exports/caral_rts_kit.glb` | `c153480b74b0a5cc29214f5eabdec3f983cd51a00bff1a926808632445d62a37` |
| `exports/caral_city_lod0.glb` | `f6d30d3df0eda092d0caaea9105627bd8a6369680e2824f1d4bc1deedde63d07` |
| `exports/caral_city_lod1.glb` | `e291d8cd3e05ae77debded0470ba7c309f89549e5cd8a98ab3c44bb276123de6` |
| `exports/caral_city_game_manifest.csv` | `b3e35f8b4f3b557abedce201beb9aea431be23f21439326de28c877e622fbd60` |

Paths are relative to `art-src/blender`. The `.blend` sources are stored in Git LFS;
`.glb`/`.fbx` exports and PNG renders are tracked normally. If the source layout changes,
update `sourceRoot` in `renders.json` or pass `--source-root=` to `yarn art:blender`.

## Renders

| File | View | SHA-256 |
|---|---|---|
| `renders/caral_hero.png` | hero / city establishing | `428feecd5844d3c3fcb2853cb2673f1b032ef4572eacb149012af8178ae68e25` |
| `renders/caral_mayor_close.png` | Pyramid Mayor close-up | `befdd83e081e3b6a3a8f4fd24fd1d9d9c5d6b5d2b61943e5082d5edc466c742b` |
| `renders/caral_anfiteatro_close.png` | circular plaza / altar | `2e5426b6edf2a55e97277bf1f85e7269532ac3e194f893785f56891f2f11e3d3` |
| `renders/caral_ortho_top.png` | orthographic city plan | `b00a8f1689786041e1d7fa0da859696f948c0b07b0452da36d3f93ee06dd82ce` |
| `renders/caral_rts_isometric.png` | isometric city view | `f0611f395f318a7a4f229b08dbdba94f1d5627fea39fe4b0885c505ca9e16997` |
| `renders/caral_city_game_rts.png` | game export RTS view | `7a430a6499008f86dcf86e553077e81f1295ff50fa90c82ba0957e281c0639e5` |
| `renders/caral_city_game_close.png` | game export close view | `f30db772a84c40315600b035664fada0aa68164735f7bc1543720d37b6eb5fcb` |
| `renders/caral_city_game_lod1.png` | game export LOD1 view | `0c9ea5c9a5aaf4109f255d328a628ad56b31d97548ae56c550abf3fd4bef4d0f` |

All renders are 1600×900. The source manifest pins each hash; the ingestion aborts if a
render changes unexpectedly. GIMP retouching is allowed, but the final PNG must replace the
source render and its hash must be updated in `renders.json`; use `--force` when re-ingesting
the replaced render so the existing WebP is overwritten.

## Asset manifest

`caral_asset_manifest.csv` is a copy of the Blender project's asset table. It records
footprints, heights, triangle counts and the confidence level (`documentado`, `blockout`,
etc.) for each building. `renders.json` references the relevant row through `sceneAssetId`
when the render focuses on a single documented asset.

## Game GLB export

The game-ready city is `caral_city_lod0.glb` / `caral_city_lod1.glb`, copied into
`src/assets/cities/`. The export manifest (`caral_city_game_manifest.csv`) records:

| LOD | Scale | Size X × Y × Z (game axes) | Tris | Parts | Materials | Bytes |
|---|---|---|---|---|---|---|
| LOD0 | 0.08 | 30.4 × 2.814 × 49.628 | 18,120 | 10 | 10 | 906,728 |
| LOD1 | 0.08 | 30.4 × 2.814 × 49.628 | 6,194 | 10 | 10 | 454,348 |

- Pivot: center of the footprint at ground level.
- Orientation: Y-up; the main stair faces +Z. The game manifest uses exported GLB axes
  (X width, Y height, Z depth); the source Blender scene is Z-up.
- The city is merged by material (10 draw calls), excludes terrain/trees/rocks/humans and
  includes the city props.
- The raw `caral_rts_kit.glb` (97 nodes/171 primitives) and `caral_pyramide_mayor.glb` are
  source assets, not game-scaled exports.

Preview the GLB in the browser without booting a match:

```bash
yarn dev
# http://localhost:5173/?city=caral
```

The showcase loads both LODs, fixes the missing `MAT-Sand_Desert` base colour in the viewer,
and exposes `window.__cityDemo` for inspection. The plaza stalls included in the export must
be reviewed against the campaign note that Caral has no attested market before using the
city in the campaign.

## Ingest

```bash
yarn art:blender
yarn art:validate
```

`yarn art:blender` verifies the source hashes, converts the PNGs to budgeted WebP, writes
`src/art/manifest.json` and `public/media/generated/PROVENANCE.md`, then validates the result.

## Licence and authoring notes

- The renders are **project-owned** (`license: project-owned`), authored by Miguel Amaya.
- The renderer is recorded as `unknown` until the exact EEVEE/Cycles setting is confirmed;
  update `renderer` in `renders.json` when known.
- Before publishing, audit the `.blend` scenes for any external textures/HDRIs/models and
  record their licences here. The current renders use flat low-poly materials.
- GIMP is used for 2D retouching and post-processing; editable `.xcf` sources live in
  `art-src/gimp/projects/`. Do not add details that are not supported by the historical
  sources.
- These are artistic reconstructions, not photographs. The UI always renders that disclaimer.

## Adding a render

1. Render a new PNG into `art-src/blender/renders/` with a stable name.
2. Add an entry to `renders.json` with the source hash, camera, scene, sources and Spanish
   `alt`/`caption`.
3. Run `yarn art:blender --only=<id>` for a new render, or
   `yarn art:blender --only=<id> --force` when replacing an existing render.
4. Review the WebP and run `yarn art:review --id=<id> --reviewer=<name> --approve`.
