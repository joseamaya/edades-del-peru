# Huacas de Moche (mission 3)

Scene and mission design for `m3_moche_recuay`. The playable site is a
project-owned, RTS-scale reconstruction of the Huacas del Sol y de la Luna and
the plaza between them. It is a representative reconstruction, **not** a survey
and **not** a historical photograph.

## Sources

- `docs/historia/civilizaciones/moche.md`
- `docs/historia/campanas/moche_recuay.md`
- `docs/historia/arquitectura.md`
- `docs/historia/fuentes.md`
- Huacas del Sol y de la Luna (Moche), public archaeological literature.

## Runtime source

- GLB: `src/assets/sites/moche/moche_site_lod0.glb` / `moche_site_lod1.glb`.
- Source: `art-src/blender/moche/moche_site_master.blend`,
  `moche_site_lod0.blend`, `moche_site_lod1.blend` (LFS).
- Build/export: `scripts/blender/build_moche_site.py`.
- LOD1 is the RTS default; `?lod=0` previews LOD0.
- Scale `0.25`, site origin `(119, 73)` on the 192 m map; the southern plaza
  edge is the objective anchor `(123, 81)`.
- The source terrain and apron are hidden; the game heightfield owns the ground.
- A 1 m pathfinding grid and a cleared 8 m approach corridor connect the base to
  the plaza. Monumental volumes are AABBs and low walls are baked into the grid.

## Attested elements

| Element | Source status | In game |
| --- | --- | --- |
| Huaca del Sol | Documented platform; original height inferred | Broad stepped adobe massing and terraces. |
| Huaca de la Luna | Documented platform and ceremonial complex | Compact stepped platform, plaza and access ramp. |
| Plaza between the huacas | Documented public/ceremonial space | Open plaza, altar and low benches. |
| Painted friezes | Documented in Moche architecture | Abstract cream/red/black bands, not iconographic copies. |
| Valley irrigation | Documented practice | Operable canal and farm-yield abstraction. |
| Elite exchange with the Recuay sierra | Documented interaction; no single market form | `trade` field-card operation at the Huaca de la Luna. |
| Roofs and original heights | Not preserved | Not reconstructed as fact. |

## Deliberate abstractions

- The site is a legible synthesis, not a 1:1 inventory of every platform,
  mural, room or archaeological intervention.
- The canal gate and the 250/400 silver exchange targets are pacing abstractions.
- The `Mercado` building represents exchange and storage; it is not an attested
  market form.
- The Recuay presence is a visual decor and off-map pressure, not an invented
  named ruler or a documented single battle.

## Mission flow

1. Open the valley canal; the water improves nearby farm yield.
2. Move units to the southern plaza edge and hold it for 90 seconds while
   Recuay waves pressure the site.
3. With a worker at the huacas, exchange 250 silver at the Huaca de la Luna.
4. Optional: complete 400 silver for the elite-exchange bonus.
5. The epilogue connects Moche's regional power with its fragmentation after
   c. 800 CE.

## Implementation

- Mission data: `src/campaign/defs/campaign.ts`.
- Site registry: `src/model/defs/sites.ts`; loader: `src/rendering/siteModels.ts`.
- Heritage cards and `trade`: `src/model/defs/heritage.ts`.
- Economy cards: `src/model/defs/buildingCards.ts`.
- Tutorial: `src/campaign/defs/tutorials.ts`.
- Tests: `tests/e2e/moche-campaign.spec.ts` (site, proxies, HUD cards),
  `tests/e2e/campaign-playtest.spec.ts`, `tests/e2e/save-campaign.spec.ts`,
  `tests/authored-sites.test.ts`.

## Status

The authored site, canal, hold, exchange, tutorial, save/load, HUD field-card
coverage and a real-command playtest are implemented. Current captures are local review artifacts in
`review/`; there is no CI pixel gate. The model remains a representative
reconstruction and the historical limits stay visible in the Codex and dossier.
Draw-call/mesh merging is tracked as a separate art/performance task.
