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

- `moche_hero.png`: `e94b1823b122e7c5729f973b3bd25187f9a395071125f7e9ca8207d577183c13`
- `moche_site_master.blend`: `8ddb99529019df04502b2e09230b9a918d57f52f8ddf01b4dd39d61f569bf71e`
- `moche_site_lod0.blend`: `8ddb99529019df04502b2e09230b9a918d57f52f8ddf01b4dd39d61f569bf71e`
- `moche_site_lod1.blend`: `3fcd3c991715a724f10e912c12d7a4f5630e7ac21482c652e017b5994231e2fd`
- `moche_site_lod0.glb`: `9512e5ba382c508af5ffb463411e27a684ac3909dc8dbaee373321fbc1649e0b`
- `moche_site_lod1.glb`: `20ac502fdc798378f71c925a713fba82ad16e273b3526ea1a88472685f0541a1`

## Limits

This is a legible synthesis of the documented stepped huacas, plaza and
terraces. Original heights, roofs, frieze details and the exact layout are
inferred or simplified. The source terrain/apron is hidden at runtime and the
game heightfield owns the ground. See `docs/design/moche-sacred-site.md`.
