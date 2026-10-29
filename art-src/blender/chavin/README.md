# Chavín de Huántar — campaign site source

Game source for `m2_chavin`. The playable site is the project's Chavín preview
model, re-exported without the CyArk-derived Lanzón scan.

## Source chain

- `chavin_lod0_clean.blend` / `chavin_lod1_clean.blend`: cleaned Blender sources
  (Git LFS), derived from the Ciudades Sagradas Chavín preview.
- `renders/chavin_hero.png`: EEVEE render used for the campaign briefing.
- `src/assets/sites/chavin/chavin_site_lod0.glb` / `chavin_site_lod1.glb`: runtime
  exports (Draco + WebP, Y-up, ground pivot).
- Export script: `scripts/blender/export_chavin_site.py`.

## License cleanup

The source preview used a Lanzón mesh derived from the CyArk / Google Arts &
Culture scan under **CC BY-NC-SA 4.0**. That mesh and its material
(`MAT-Chavin_Lanzon_Scan`) were removed before this source and the GLBs were
committed. The game uses a project-owned low-poly reconstruction of the Lanzón
instead; it is documented as an interpretation, not the scan.

The remaining Chavín geometry, terrain, materials and textures are project-owned
or procedural. No UNESCO/Mincul photographs are included.

## Hashes

- `chavin_hero.png`: `16bc0e3ab76e9b8468c0a268f9538ddc340f0388422b3d0c0a0d0bd8e11155d3`
- `chavin_lod0_clean.blend`: `6774b77efaa5bb1213ae6af8e356530de6b8caa915902288eca37aba6a99885c`
- `chavin_lod1_clean.blend`: `ea82b12e8aa42fc31f23e0e0d801c2cb8d6a5dc5e5c9867573eb5e15a047f7e2`
- `chavin_site_lod0.glb`: `11b6ba6e1049dece0f12c474883317392f45465fee1a7f22d89317d093763518`
- `chavin_site_lod1.glb`: `341626aff66ae8e049ab331897a773edc89221f8dce53fe782bdc7762b90c621`

## Limits

This is a representative ceremonial centre, not a survey or a 1:1 reconstruction.
Roofs, heights, colours and some reliefs are inferred; the source's terrain mesh is
hidden at runtime and the game heightfield owns the ground. See
`docs/design/chavin-sacred-site.md` and the historical dossiers.
