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
- **Textiles** (`materials/`, attested Andean uncu patterns; one per civilization): `textile_inca`,
  `textile_wari`, `textile_tiahuanaco`, `textile_moche`, `textile_chavin`, `textile_paracas`,
  `textile_nazca`, `textile_chimu`. Civilizations with no attested pattern fall back to the generic
  `textile` weave (see `docs/historia/atuendos.md`).

Textures are optional: `src/rendering/Biomes.ts` falls back to the procedural Canvas material when a
slot is absent (offline / without assets).

## Reference images (AI generation input)

Used only as FLUX.2 multi-reference inputs (never redistributed) for the Andean textiles. Manifests in
`scripts/refs.json`; images downloaded to `scripts/_refs/` (gitignored). All sources are public domain.

| Slot | Object | Source | License |
|---|---|---|---|
| `textile_inca` | Tunic (Inca, 1450–1550) | The Met, object 313152 | Public Domain |
| `textile_wari` | Tunic (Wari, 425–550) | The Met, object 314355 | Public Domain |
| `textile_nazca` | Tunic with Confronting Catfish (Nasca-Wari) | The Met, object 307975 | Public Domain |

## External references (technical only, no code)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): only the **idea** of the
  slot-based PBR terrain pipeline (diffuse/normal/roughness) with blending by slope/elevation is taken.
  No files or assets from it are copied.
