# Asset provenance

## AI-generated terrain textures

- **Location**: `src/assets/texturas/terreno/{slot}_{diffuse|normal|roughness}.webp`
- **Slots**: `sand`, `dirt`, `grass`, `rock`, `snow` (historical materials: desert sand, Andean soil,
  ichu/straw, andesite rock, puna ground).
- **Generation**: albedo with **Cloudflare Workers AI** (`@cf/black-forest-labs/flux-1-schnell`),
  via `scripts/gen_textures.py` (prompts in `scripts/prompts_textures.json`).
- **Post-processing**: `scripts/post_textures.py` (tiling, Sobel normal, heuristic roughness).
- **Usage**: project-owned assets. Check Cloudflare Workers AI terms and the model
  license for commercial use before distributing.

## External references (technical only, no code)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): only the **idea** of the
  slot-based PBR terrain pipeline (diffuse/normal/roughness) with blending by slope/elevation is taken.
  No files or assets from it are copied.
