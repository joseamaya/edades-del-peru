# Asset pipeline

**Status:** living

This is the **start here** page for adding art to the game. It routes each asset type to its authoring tool,
its ingest command and its review gate. The deep rules stay in their owner documents:

- [`authoring-tools.md`](./authoring-tools.md): Blender/GIMP versions, MCP setup, source layout and security.
- [`blender-art.md`](./blender-art.md): Blender scenes, renders, manifest, ingestion and provenance.
- [`development.md`](../development.md): rigged models, clip conventions and code traps.
- [`../../PROVENANCE.md`](../../PROVENANCE.md): source, licence and hash of every asset.

Do not copy those rules here. This page tells you which path to follow and what must be true before the asset
is committed.

## The chain

```text
reference / concept
        ↓
Blender (3D) or GIMP (2D)
        ↓
export (GLB or PNG)            .blend / .xcf stay in Git LFS
        ↓
place the game copy            src/assets/... for 3D, art-src for render sources
        ↓
ingest command                 yarn art:models / art:textures / art:blender
        ↓
manifest and/or PROVENANCE
        ↓
human review                   yarn art:review (renders only)
        ↓
game integration               StaticModel / modelAssets / UI
```

## Choose the path

| Asset | Authoring | Ingest / integration | Provenance | Review |
| --- | --- | --- | --- | --- |
| Static landmark, prop, architecture kit | Blender, one root empty per LOD | `src/assets/...` → `yarn art:models` → `StaticModel` | `PROVENANCE.md` + source CSV where the kit has one | Art review of the RTS view |
| Character, unit, mount, siege, vehicle | Blender, shared skeleton and clips | `src/assets/models/` → `yarn art:models` → `modelAssets.ts` + `modelAssetRegistry.ts` | `PROVENANCE.md` | `?rig=1` and in-mission capture |
| Campaign intro, Codex, educational map, tour | Blender render → optional GIMP retouch | `yarn art:blender --manifest=<kit>` → `src/art/manifest.json` + `public/media/generated/` | Manifest record + generated `public/media/generated/PROVENANCE.md` | `yarn art:review` (human) |
| Material, textile, UI icon, decal | GIMP or the texture scripts | `yarn art:textures` or the owning script → `src/assets/textures/...` | `PROVENANCE.md` | Look check in game/RTS view |
| Terrain albedo/surface pack | `yarn art:textures --terrain` | `src/assets/textures/terrain/` | `scripts/terrain-textures.json` + `PROVENANCE.md` | Look check in game/RTS view |

## Path A · Static 3D asset (GLB)

1. Author in Blender with one root empty per LOD, origin at the footprint centre, ground level, Y-up and +Z
   front. Use metres and document the game scale.
2. Keep LOD0 ≤ 5k triangles and LOD1 ≤ 1.5k for a building; a kit stays ≤ 25k triangles, ≤ 8 materials and
   ≤ 12 draw calls. Principled BSDF only; no procedural shaders in the GLB.
3. Export the GLBs to `art-src/blender/exports/` and keep the `.blend` in Git LFS.
4. Copy the LODs to their `src/assets/...` folder.
5. Run `yarn art:models --only=<asset>` to meshopt-compress the committed game copy in place; `--dry-run`
   first.
6. Integrate the compressed GLB through `StaticModel` or the owning site/registry.
7. Record id, LOD, scale, triangles, materials, bytes, pivot, orientation, collision, confidence and sources in
   `PROVENANCE.md` and, where the kit uses one, the source CSV.
8. Preview the RTS view; capture it for the PR. `yarn bench:check` for the structural budget.

## Path B · Character or unit (rigged GLB)

1. Decide the character and its certainty in [`characters.md`](./characters.md). A named character needs a
   dossier; a pre-Hispanic face is an abstraction.
2. Model the body/garments in Blender. Use the shared humanoid skeleton; do not bake a unique scale or
   orientation into the asset.
3. Produce the mandatory `idle` clip and, where the role needs them, `walk`, `walk_carry`, `run`, `gather`,
   `build` and `attack`. `Death` is optional. Root motion is ignored. Clip names are declared in the registry,
   not inferred.
4. Export the GLB to `src/assets/models/` and run `yarn art:models --only=<id>` (the basename without
   `.glb`, e.g. `mounted_rig`) to meshopt-compress the game copy. Add the id to `ModelAssetId`, the variant
   to `RigVariant` and the clip overrides to `modelAssets.ts`; register the URL in `modelAssetRegistry.ts`.
5. Keep the procedural model as the fallback. The simulation never depends on the GLB.
6. Preview with `?rig=1` (`window.__rigDemo`) and in a real mission; check scale, shadow flags, accessories
   and the `RigClipState` fallbacks.
7. Run `yarn bench --scenario=... --assert` and `yarn bench:check` for the structural budget.
8. Record the model, source, licence and SHA-256 in `PROVENANCE.md`; keep the `.blend` in Git LFS.
9. If the character also has a briefing portrait, follow Path C for the render; do not treat the GLB as a
   portrait.

Existing examples: `scripts/build_caral_worker.mjs` (CC0 body/hair/clips + project-authored cotton),
`scripts/blender/build_mounted_rig.py`, `build_siege_rig.py` and `build_vehicle_rig.py`.

## Path C · Render, intro, Codex or educational art

1. Render a 1600×900 PNG into the kit's `renders/` folder: `art-src/blender/renders/` for Caral,
   `art-src/blender/<kit>/renders/` for Moche, Wari and mission-decor. Use a stable name.
2. Retouch in GIMP only if needed; export the final PNG to the same path and update the hash. Keep the `.xcf`
   in Git LFS.
3. Add an entry to the kit's source manifest: `art-src/blender/caral/renders.json` for Caral, or
   `art-src/blender/<kit>/renders.json` for another kit. Include source hash, scene, camera, confidence,
   sources and Spanish `alt`/`caption`.
4. Run `yarn art:blender --manifest=art-src/blender/<kit>/renders.json --only=<id>` for a new render, or add
   `--force` when replacing one. The default manifest is the Caral kit; without `--manifest` a record from
   another kit is skipped. It verifies hashes, converts to budgeted WebP, writes the asset and updates
   `src/art/manifest.json` + `public/media/generated/PROVENANCE.md`.
5. New renders are `reviewed: false` and hidden in the game. A human runs
   `yarn art:review --id=<id> --reviewer=<name> --approve` (or rejects) after checking the contact sheet.
6. Preview with `?art=all` for drafts and the normal build for approved art.
7. `yarn art:validate` and the UI/briefing tests must pass.

A render is never presented as a historical photograph. Its `confidence` and caption say what it is. The
ingestion writes the generated provenance copy under `public/media/generated/PROVENANCE.md`; the root
`PROVENANCE.md` is maintained by hand.

## Path D · 2D texture, material, icon or decal

1. Work non-destructively in GIMP (`.xcf` in `art-src/gimp/projects/`, sRGB/8-bit).
2. Export the final PNG/WebP to `art-src/gimp/exports/` or the owning texture folder.
3. If it is a material PBR map, re-encode with `yarn art:textures --only=<asset>`; otherwise use the owning
   script. `--terrain` is only for the terrain pack.
4. Record source, licence and output hash in `PROVENANCE.md` (terrain also updates
   `scripts/terrain-textures.json`).
5. Check the material in the RTS view and, when it is a texture atlas/decal, verify the UV mapping.

## Path E · Terrain texture pack

1. Add the source to `scripts/terrain-textures.json` with author, URL, licence and source SHA-256.
2. Run `yarn art:textures --terrain --only=<slot>`; it downloads to `.cache/`, verifies the source hash and
   packs `_albedo` + `_surface`.
3. `yarn art:textures --terrain --check` must pass; record the output hash in `PROVENANCE.md`.
4. Check the slot in the terrain blend and the mission's `groundPbr` profile.

## Commands

| Command | What it does |
| --- | --- |
| `yarn art:blender` | Ingest Blender renders: verify, resize, WebP, manifest and generated provenance |
| `yarn art:blender --dry-run` / `--only=<id>` / `--force` | Preview, one record, replace |
| `yarn art:models` | Meshopt-compress the committed GLBs in place (`--only`, `--dry-run`, `--force`) |
| `yarn art:textures` | Re-encode material PBR WebPs (`--only`, `--dry-run`, `--force`) |
| `yarn art:textures --terrain` | Verify/download the CC0 terrain sources and pack `_albedo`/`_surface` |
| `yarn art:validate` | Validate the render manifest and assets |
| `yarn art:review` | Record the human approval/rejection of a render |
| `yarn art:pilot` | Capture the Tambotoco art-direction pilot before/after (`--tag`, `--quality`, `--sizes`, `--views`) |
| `yarn bench:check` | Check rig/fauna/mounted/siege/tank/vehicle/mixed structural budgets |
| `yarn dist:check` | Verify `dist/` and the entry chunk budget |

## Provenance checklist

- [ ] Source recorded in `PROVENANCE.md` (root; renders also update the generated
      `public/media/generated/PROVENANCE.md`).
- [ ] `.blend`/`.xcf` in Git LFS; exports committed; backups ignored.
- [ ] Render has a manifest record, `confidence`, `reviewed` and a human reviewer when approved.
- [ ] GLB is recorded in `PROVENANCE.md` and, where the source kit uses a CSV, the CSV row is updated.
- [ ] The asset does not invent a historical detail; uncertainty is labelled.
- [ ] No `review/` artifact is committed.
- [ ] The RTS view and, for characters, `?rig=1` were checked.
- [ ] `yarn verify:fast` and the relevant tests pass.

## Common failures

- **Wrong scale or origin**: the asset floats, sinks or faces the wrong way. Fix the root empty and the
  registry scale, not the mission.
- **Missing `idle`**: the rig falls back to a frozen pose. Every rig needs `idle`.
- **Clip name not in the registry**: the state silently falls back to `idle`. Add the clip override.
- **Unique garment baked into the shared rig**: it breaks every other variant. Use a variant or a tinted
  clone at runtime.
- **Render shown before review**: the manifest still says `reviewed: false`. Approve it or keep it hidden.
- **GIMP retouch without a hash update**: `yarn art:blender` fails its source-hash check; `yarn art:validate`
  validates the committed output, not the retouched source.
- **Third-party asset without a licence**: do not commit it. Record it in `PROVENANCE.md` first.

## Do not

- Do not commit generated `review/` captures or backups.
- Do not use AI-generated art as final historical art without review and licence.
- Do not present a draft render or a stylized portrait as a historical photograph.
- Do not add a runtime dependency, MCP server or CI service for an asset.
- Do not duplicate the deep rules here; link them.

## See also

[`authoring-tools.md`](./authoring-tools.md) · [`blender-art.md`](./blender-art.md) ·
[`characters.md`](./characters.md) · [`visual-language.md`](./visual-language.md) ·
[`../development.md`](../development.md) · [`../../PROVENANCE.md`](../../PROVENANCE.md)
