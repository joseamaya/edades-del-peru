# Huacas de Moche — campaign site source

Game source for `m3_moche_recuay`. The playable site is a project-owned,
RTS-scale reconstruction of the Huacas del Sol y de la Luna and the plaza
between them. It is a representative reconstruction, not a survey and not a
historical photograph.

## Source chain

- `moche_site_master.blend`: editable master scene (Git LFS).
- `moche_site_lod0.blend` / `moche_site_lod1.blend`: runtime LOD sources (Git LFS).
- `renders/moche_hero.png`: EEVEE render used for the campaign briefing.
- `src/assets/sites/moche/moche_site_lod0.glb` / `moche_site_lod1.glb`: runtime
  exports (Draco + WebP, Y-up, ground pivot).
- Build/export script: `scripts/blender/build_moche_site.py`.

## Sources

- `docs/historia/civilizaciones/moche.md`
- `docs/historia/campanas/moche_recuay.md`
- `docs/historia/arquitectura.md`
- Huacas del Sol y de la Luna (Moche), public archaeological literature.

## Hashes

- `moche_hero.png`: `fe2e12cd686d9d0bda0e54772e8e9743ff1a41b79d5a7e84d0b8fe1bc4fe5e4b`
- `moche_site_master.blend`: `c1c62d021cdcfe129d5dacd428477ae59014020d774001beecd30f0caa51920c`
- `moche_site_lod0.blend`: `fa60ea8c40325904f2c513c8a1945e61fdb572acf0a03b86976cbdc967362f7f`
- `moche_site_lod1.blend`: `a8485abe3bb4abb04e280b1484d6d000368f5acd6aec22519955cb8cedab019f`
- `moche_site_lod0.glb`: `977a7696ff401e5efc9bf9a540ed39508bcaaf289aa4b5376be6474c5eb96a78`
- `moche_site_lod1.glb`: `2c04515f4d8cfbfba592139e5383ab646ef4da029d1adc90c54f8e5853808980`

## Limits

This is a legible synthesis of the documented stepped huacas, plaza and
terraces. Original heights, roofs, frieze details and the exact layout are
inferred or simplified. The source terrain/apron is hidden at runtime and the
game heightfield owns the ground. See `docs/design/moche-sacred-site.md`.
