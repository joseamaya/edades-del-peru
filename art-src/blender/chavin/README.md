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
- `chavin_lod0_clean.blend`: `ea86697e51dfcf6797b4a175058f5ed56cba8f79bb008b337b172f2c7511e744`
- `chavin_lod1_clean.blend`: `04d28b1a6ce30adfe0ccb7b3fd7a278326e1be2be0b56d1d56d6bdfb01c794c3`
- `chavin_site_lod0.glb`: `d54ef3625d3032bae969f016eb5b8bf6439b364cbd34faa76fcac0f5e234fe08`
- `chavin_site_lod1.glb`: `2a269c5628575554dc4e4cdd00e52b6c89aec64936cde145ca25e4328348b7bb`

## Limits

This is a representative ceremonial centre, not a survey or a 1:1 reconstruction.
Roofs, heights, colours and some reliefs are inferred; the source's terrain mesh is
hidden at runtime and the game heightfield owns the ground. See
`docs/design/chavin-sacred-site.md` and the historical dossiers.
