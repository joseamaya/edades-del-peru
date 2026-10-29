# Complejo Wari (mission 4)

Scene and mission design for `m4_wari`. The playable site is a project-owned,
RTS-scale synthesis of Wari's monumental core: a D-shaped temple, walled plaza,
galleries and terraces. It is a representative reconstruction, **not** a survey
and **not** a historical photograph.

## Sources

- `docs/historia/civilizaciones/wari.md`
- `docs/historia/campanas/wari_tiahuanaco.md`
- `docs/historia/arquitectura.md`
- `docs/historia/fuentes.md`
- Ministerio de Cultura, Ochatoma y Cabrera, Isbell and public Wari literature.

## Runtime source

- GLB: `src/assets/sites/wari/wari_site_lod0.glb` / `wari_site_lod1.glb`.
- Source: `art-src/blender/wari/wari_site_master.blend`,
  `wari_site_lod0.blend`, `wari_site_lod1.blend` (LFS).
- Build/export: `scripts/blender/build_wari_site.py`.
- LOD1 is the RTS default; `?lod=0` previews LOD0.
- Scale `0.25`, site origin `(107.5, 86.4)` on the 192 m map; the southern
  plaza edge is the objective anchor `(107.5, 102)`.
- The source terrain/apron is hidden; the game heightfield owns the ground.
- A 1 m grid, monument AABBs and an 8 m approach corridor keep the base
  connected to the plaza.

## Attested elements

| Element | Source status | In game |
| --- | --- | --- |
| D-shaped temple | Documented diagnostic form | Semicircular platform and straight facade. |
| Walled plazas and patios | Documented | Central plaza and perimeter walls. |
| Galleries and storage | Documented | Representative gallery range. |
| White/red plaster and murals | Documented/partial | Abstract material bands; no specific figure reproduced. |
| Andenes and water control | Documented | Terraces and the farm-yield abstraction. |
| Provincial network | Documented | `network` objective with two centres. |
| Complete urban layout | Discussed | A legible synthesis, not a full plan. |

## Deliberate abstractions

- The site combines documented Wari forms without claiming a specific building
  inventory or exact dimensions.
- The `Mercado` building represents a provincial administrative/exchange node,
  not an attested market form.
- The 600-food, two-farm, two-centre and 60/480-second targets are pacing
  abstractions.
- There is no active enemy: the competition with Tiahuanaco is expressed through
  influence, presence and dialogue, not an invented war.

## Mission flow

1. Gather 600 food and prepare two andenes.
2. Found two provincial centres at the network nodes.
3. Hold the first frontier node for 60 seconds.
4. Sustain the Wari sphere for eight minutes.
5. Optional: found a third centre.

## Implementation

- Mission data: `src/campaign/defs/campaign.ts`.
- Site registry/loader: `src/model/defs/sites.ts`, `src/rendering/siteModels.ts`.
- Network objective: `src/campaign/Mission.ts` and `src/campaign/types.ts`.
- Heritage cards: `src/model/defs/heritage.ts`; economy cards: `buildingCards.ts`.
- Tutorial: `src/campaign/defs/tutorials.ts`.
- Tests: `tests/e2e/wari-campaign.spec.ts`, `campaign-completable.spec.ts`,
  `campaign.spec.ts`, `tests/authored-sites.test.ts`.

## Status

The authored site, network, frontier hold, tutorial, save/load-compatible state
and completability coverage are implemented. Current captures are local review
artifacts in `review/`; there is no CI pixel gate. The model remains a
representative reconstruction and the historical limits stay visible in the
Codex and dossier.
