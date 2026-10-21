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
  to validate the glTF/GLB + skeleton + mixer pipeline and as the base for the Caral worker pilot (#108).
  **The base mesh is a placeholder, not a historical reconstruction**: #108 dresses it with project-authored
  cotton attire (tunic, loincloth, headband, hair, digging stick and carry bundle); #109 uses separate animal
  assets.
  - Source: <https://quaternius.com/packs/universalanimationlibrary.html> (CC0 1.0).
  - Downloaded from the CC0 mirror <https://github.com/Dallolz/moorfall-assets>
    (`animations/UAL1.glb`, licence in its `LICENSE.md`), 2026-10-20.
  - SHA-256: `69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997` (7,618,436 bytes).
  - Contents: 1 skinned `Mannequin` mesh (65-bone humanoid rig), 43 clips; the game maps
    `Idle_Loop`, `Walk_Loop`, `Fixing_Kneeling`, `Sword_Attack` and `Death01`.
  - Attribution is optional under CC0 but credited here: models/animations by Quaternius.
- **Caral worker attire (`?mission=m1_caral` pilot)**: the tunic, loincloth, headband, hair, digging stick and
  carry bundle are **project-authored procedural attachments** on the CC0 mannequin bones, not a new external
  asset. Historical basis: `docs/historia/atuendos.md` records cotton textiles for Caral-Supe and marks specific
  garments as **not documented**; this pilot is therefore an **abstraction/plausible** reconstruction (no metal,
  footwear, firearms, horses or engines). It is not a claim about a specific Caral garment.

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
