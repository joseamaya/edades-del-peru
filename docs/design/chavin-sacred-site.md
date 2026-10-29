# Chavín de Huántar (mission 2)

Scene and mission design for `m2_chavin`. The playable site is the project's
Chavín preview model, re-exported without the CyArk-derived Lanzón scan. It is a
representative ceremonial centre, **not** a survey and **not** a historical
photograph.

## Sources

- UNESCO WHC 330, _Chavín (Archaeological Site)_: <https://whc.unesco.org/en/list/330/>.
- Ministerio de Cultura, Plan de Manejo 2020 and Patrimonio Mundial: Chavín.
- Rick, J. W. et al. (1998), «La arquitectura del complejo ceremonial de Chavín
  de Huántar», _Boletín de Arqueología PUCP_.
- `docs/historia/civilizaciones/chavin.md`, `docs/historia/campanas/chavin.md`,
  `docs/historia/arquitectura.md`, `docs/historia/mapas.md`.

## Runtime source

- GLB: `src/assets/sites/chavin/chavin_site_lod0.glb` / `chavin_site_lod1.glb`.
- Source: `art-src/blender/chavin/chavin_lod0_clean.blend` /
  `chavin_lod1_clean.blend` (LFS). Export script:
  `scripts/blender/export_chavin_site.py`.
- LOD1 is the RTS default; `?lod=0` previews LOD0.
- Scale `0.22`, source origin `(96, 96)`, site anchor `(98, 87.5)` on the
  192 m map. The site terrain and reference layers are hidden; the game
  heightfield owns the ground.
- The site uses a 1 m pathfinding grid. Near-vertical faces of the Chavín city
  mesh become walls; a cleared approach corridor keeps the base connected to the
  Plaza Circular, while the open plazas and processional ground remain walkable.
- Construction is forbidden over the city footprint (`buildKeepout`), while the
  base and the feria site stay outside it.

## Attested elements

| Element                                  | Source status                    | In game                                                           |
| ---------------------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| Edificio A / Pirámide Mayor / “Castillo” | Documented                       | Terraced massing and eastern facade.                              |
| Edificio B / Templo del Lanzón           | Documented                       | Volume, access and gallery relation.                              |
| Plaza Circular Hundida / atrio           | Documented                       | Circular sunken plaza and stair relation.                         |
| Portada de las Falcónidas                | Documented, interpretive reliefs | Columns, jambs and split frieze; no surviving lintel is invented. |
| Galleries, ventilation and drainage      | Documented                       | One representative sequence, not all 22 galleries.                |
| Mosna valley and highland setting        | Documented/inferred              | River, terraces, highland vegetation and mist.                    |
| Lanzón                                   | Documented; scan excluded        | Project-owned simplified reconstruction; not the CyArk mesh.      |
| Roofs and original heights               | Not preserved                    | Not reconstructed as fact.                                        |

## Deliberate abstractions

- The site is a representative centre, not a 1:1 inventory of every gallery,
  stone or museum piece.
- The Lanzón is a low-poly interpretation with the published scale and position;
  it is not the scanned geometry and carries no CC BY-NC-SA material.
- The `Mercado` building represents the pilgrimage fair and long-distance
  exchange. It is a gameplay abstraction, not an attested market form.
- Offerings are delivered through the Edificio B field card. A worker must be
  near the temple; 50 silver is consumed per offering.
- The 250/400 silver targets and the seven-minute survival clock are pacing
  abstractions, not historical figures.

## Mission flow

1. Start with the offering goal and the survival clock.
2. Move a worker to the ceremonial centre; the tutorial and field cards explain
   the Plaza Circular, Edificio A/B, Portada and gallery.
3. Deliver five offerings of 50 silver at Edificio B. The `t_ofrendas` trigger
   reveals the pilgrimage, the feria and the optional major offering.
4. Receive pilgrims for 60 seconds in the Plaza Circular and build the feria
   outside the site keep-out.
5. Keep the centre standing for seven minutes. The epilogue connects the
   documented decline with the end of Chavín's regional prestige.

## Implementation

- Mission data: `src/campaign/defs/campaign.ts`.
- Site registry: `src/model/defs/sites.ts`.
- Site loader: `src/rendering/siteModels.ts`.
- Heritage cards and the `offer` operation: `src/model/defs/heritage.ts`.
- Economy cards: `src/model/defs/buildingCards.ts`.
- Tutorial: `src/campaign/defs/tutorials.ts`.
- Tests: `tests/e2e/chavin-campaign.spec.ts`, `tests/e2e/campaign.spec.ts`,
  `tests/e2e/campaign-playtest.spec.ts`, `tests/e2e/save-campaign.spec.ts`.

## Status

The site, offering flow, staged objectives, tutorial, feria, save/load and a
real-command playtest are implemented. Current captures are local review
artifacts in `review/`; there is no CI pixel gate. The model remains a
representative reconstruction and the historical limits above stay visible in
the Codex and dossier.
