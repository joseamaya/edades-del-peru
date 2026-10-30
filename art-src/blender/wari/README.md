# Complejo Wari — campaign site source

Game source for `m4_wari`. The playable site is a project-owned, RTS-scale
synthesis of Wari's monumental core (D-shaped temple, walled plaza, galleries
and terraces). It is a representative reconstruction, not a survey and not a
historical photograph.

## Source chain

- `wari_site_master.blend`: editable master scene (Git LFS).
- `wari_site_lod0.blend` / `wari_site_lod1.blend`: runtime LOD sources (Git LFS).
- `renders/wari_hero.png`: EEVEE render used for the campaign briefing.
- `src/assets/sites/wari/wari_site_lod0.glb` / `wari_site_lod1.glb`: runtime
  exports (Draco, Y-up, ground pivot).
- Build/export script: `scripts/blender/build_wari_site.py`.

## Sources

- `docs/historia/civilizaciones/wari.md`
- `docs/historia/campanas/wari_tiahuanaco.md`
- `docs/historia/arquitectura.md`
- Ministerio de Cultura / Ochatoma y Cabrera / Isbell, public Wari literature.

## Hashes

- `wari_hero.png`: `542eb0ff13a71094857179903a214f409a5e0ba1860b9a4ccb2001bc0b805b06`
- `wari_site_master.blend`: `b5cb9b43fad0a199207ce4fe2981ea05106bd6c72ddb896ecc2bf69b38175d29`
- `wari_site_lod0.blend`: `b5cb9b43fad0a199207ce4fe2981ea05106bd6c72ddb896ecc2bf69b38175d29`
- `wari_site_lod1.blend`: `999c9ce4468c7064feb4f65e04f88a162ffccfd57aca12d2340bb1d932161509`
- `wari_site_lod0.glb`: `030b1287d3c31c7a751e760d1a294187361dfe1386e8de4046940b7dce23f379`
- `wari_site_lod1.glb`: `8ff4223a392066e58154e6282f3d9a0773580b5f4aaba992e9f83bd1f43fdbf6`

## Limits

The D-temple, plaza, galleries and terraces are documented forms; the exact
combination and dimensions are a legible synthesis. The source terrain/apron is
hidden at runtime and the game heightfield owns the ground. See
`docs/design/wari-sacred-site.md`.
