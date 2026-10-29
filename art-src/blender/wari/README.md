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

- `wari_hero.png`: `f54af622e92ccf942b08381764efcfc7d77257367a2505fb89a670cae2693845`
- `wari_site_master.blend`: `e5848229e76eef98fe2f1e0bf57e8b4f86dab92485729f425a217b26eb97dffc`
- `wari_site_lod0.blend`: `e5848229e76eef98fe2f1e0bf57e8b4f86dab92485729f425a217b26eb97dffc`
- `wari_site_lod1.blend`: `976f3a2ec81781769c264faf9aade24746abaea7a919d3fffe507cfd03a1e0f8`
- `wari_site_lod0.glb`: `453516621a7f09230932e3070e62a70ed2926fad40d20c968151cb6e1d2f14a1`
- `wari_site_lod1.glb`: `b029c87cec58e66ac0b18ff9c0114d291fc7b8b57aa11b63381c67a7f0742768`

## Limits

The D-temple, plaza, galleries and terraces are documented forms; the exact
combination and dimensions are a legible synthesis. The source terrain/apron is
hidden at runtime and the game heightfield owns the ground. See
`docs/design/wari-sacred-site.md`.
