# Procedencia de assets

## Texturas de terreno generadas con IA

- **Ubicación**: `src/assets/texturas/terreno/{slot}_{diffuse|normal|roughness}.webp`
- **Slots**: `sand`, `dirt`, `grass`, `rock`, `snow` (materiales históricos: arena desértica, tierra
  andina, ichu/paja, roca andesita, suelo de puna).
- **Generación**: albedo con **Cloudflare Workers AI** (`@cf/black-forest-labs/flux-1-schnell`),
  vía `scripts/gen_texturas.py` (prompts en `scripts/prompts_texturas.json`).
- **Post-proceso**: `scripts/post_texturas.py` (teselado, normal por Sobel, rugosidad heurística).
- **Uso**: assets propios del proyecto. Verifica los términos de Cloudflare Workers AI y la licencia
  del modelo para uso comercial antes de distribuir.

## Referencias externas (solo técnicas, no código)

- [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT): se toma la **idea** del pipeline
  de terreno PBR por slots (diffuse/normal/roughness) con mezcla por pendiente/elevación. No se copian
  archivos ni assets suyos.
