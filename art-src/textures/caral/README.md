# Caral terrain sources

Editable source images for the `caral_grass` terrain slot. They come from the
**Ciudades Sagradas Caral remaster v2** project (`ciudades-sagradas/blender/textures/generated/remaster/`)
and are copied here so the game repository can rebuild the packed texture without the sibling checkout.

- **Licence**: CC BY 4.0, © José Amaya. Attribute “Ciudades Sagradas, José Amaya, CC BY 4.0”.
- **Files**: `dry_grass_diffuse.jpg`, `dry_grass_normal.png`, `dry_grass_roughness.jpg`.
- **Packing**: `yarn art:textures --terrain --only=caral_grass`; source/output SHA-256 values live in
  `scripts/terrain-textures.json` and `PROVENANCE.md`.
- **Height**: the remaster has no displacement map; the packed surface uses a luminance-derived height.
  It is an approximation for the height blend, not a scanned height field.
- The remaster sand/earth/rock albedos are almost flat, so those Caral slots use the CC0
  `sand`/`dirt`/`rock` scans plus the mission `groundTint`.
