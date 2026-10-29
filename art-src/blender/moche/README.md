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

- `moche_hero.png`: `de5891c34e82d3746c5f79cfab5d7c1850002e9547720845905c180d8023b2c6`
- `moche_site_master.blend`: `0b07f890e4e661de413d3f32e6e6c6126a733ff959140a2852b1cc9cc1a055ca`
- `moche_site_lod0.blend`: `f7efae4d04d2044c492781c1ec1c5cac4f3ad05c57fc8c0d2290e8077838d1aa`
- `moche_site_lod1.blend`: `a289bb128e20e2e77d00a62f20e15b54cf23971630b337fcc24b2872eae3e9f9`
- `moche_site_lod0.glb`: `ebaaff1d79c71b1a068650c3910a3fbe177e24afcb7e8b9c6e7d2f28d3b9aa98`
- `moche_site_lod1.glb`: `cb2fe3b0e69d0f7fb70e3272d2ac9c868e51fac22f3905bdd13bd81527b08082`

## Limits

This is a legible synthesis of the documented stepped huacas, plaza and
terraces. Original heights, roofs, frieze details and the exact layout are
inferred or simplified. The source terrain/apron is hidden at runtime and the
game heightfield owns the ground. See `docs/design/moche-sacred-site.md`.
