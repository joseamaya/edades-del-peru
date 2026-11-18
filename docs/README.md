# Documentation map

This is the entry point to the project documentation. It answers two questions: **which document
should I read for this task**, and **which document is the current source of truth**.

The map is deliberately a router, not a summary. Detailed rules live in the documents it links to.

## Start here

| I need to… | Read |
| --- | --- |
| Understand what the game is and what it is not | [`GDD.md`](./GDD.md) |
| Know why a technical decision was made | [`DECISIONS/`](./DECISIONS/README.md) |
| See what is being built now | [`plan/ROADMAP.md`](./plan/ROADMAP.md) and [`plan/backlog.md`](./plan/backlog.md) |
| Design or rebuild a campaign mission | [`design/model-mission-pattern.md`](./design/model-mission-pattern.md), then [`design/campaign-quality-bar.md`](./design/campaign-quality-bar.md) |
| Check the live mission status | [`design/campaign-quality-bar.md`](./design/campaign-quality-bar.md) |
| Check a historical fact, name or date | [`historia/README.md`](./historia/README.md) and the matching dossier |
| Model something in Blender or retouch in GIMP | [`design/asset-pipeline.md`](./design/asset-pipeline.md), then [`design/authoring-tools.md`](./design/authoring-tools.md) and [`design/blender-art.md`](./design/blender-art.md) |
| Design a named character or audit the cast | [`design/characters.md`](./design/characters.md) |
| Set or audit the visual direction | [`design/art-direction.md`](./design/art-direction.md), then [`design/tambotoco-art-pilot.md`](./design/tambotoco-art-pilot.md) |
| Understand the engine, subsystems or a code trap | [`development.md`](./development.md) |
| Contribute code, docs or tests | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) and [`../AGENTS.md`](../AGENTS.md) |
| Check an asset licence or provenance | [`../PROVENANCE.md`](../PROVENANCE.md) |
| Create or load a mod | [`modding/README.md`](./modding/README.md) |

## Precedence when documents disagree

1. **Implemented behaviour:** code and tests win over any prose.
2. **Design intent:** [`GDD.md`](./GDD.md) wins over older design notes.
3. **Closed technical decisions:** [`DECISIONS/`](./DECISIONS/README.md) win over scattered explanations.
4. **Historical facts:** the dossiers in [`historia/`](./historia/) win over summaries and comments.
5. **Point-in-time audits:** snapshots describe a past state; they never win over a living document.

[`../AGENTS.md`](../AGENTS.md) sets the working rules (branching, review, authoring tools). It does not
override the GDD on design intent or the dossiers on history; it enforces how those documents are applied.

If two living documents contradict each other, fix the contradiction in the same pull request and
mention it in the description.

## Status labels

Use these labels when a document is not obviously living. The index below records the status of every
indexed document, and every new document must state its status near the top.

| Label | Meaning |
| --- | --- |
| **Living** | Maintained. Update it in the same PR that changes the behaviour it describes. |
| **Accepted** | An immutable decision record. Supersede it with a new record; do not edit it. |
| **Approved** | An accepted design that is only partially implemented. |
| **Proposal** | A design that is not implemented yet. It may change or be rejected. |
| **Snapshot** | A point-in-time audit. Do not use it as the current status. |
| **Archived** | Kept for history only. Do not extend it. |

The main living documents are the GDD, this map, the ADR index, `design/campaign-quality-bar.md`,
`design/model-mission-pattern.md`, `design/characters.md`, `design/asset-pipeline.md`,
`design/art-direction.md`, `design/tambotoco-art-pilot.md`, `design/visual-language.md`, `development.md` and
the historical dossiers. The ADR records themselves are **Accepted** and immutable.

## Document index

### Root and governance

| Document | What it answers | Status |
| --- | --- | --- |
| [`../README.md`](../README.md) | What the game is, how to run it, controls and campaigns | Living |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Requirements, commands, conventions and workflow | Living |
| [`../AGENTS.md`](../AGENTS.md) | Non-negotiable rules for agents and reviewers | Living |
| [`../PROVENANCE.md`](../PROVENANCE.md) | Source, licence and hash of every asset | Living |
| [`GDD.md`](./GDD.md) | Vision, pillars, scope, non-goals and definition of done | Living |
| [`README.md`](./README.md) | This map | Living |

### Decisions and planning

| Document | What it answers | Status |
| --- | --- | --- |
| [`DECISIONS/README.md`](./DECISIONS/README.md) | Index of every ADR and its status | Living |
| [`plan/ROADMAP.md`](./plan/ROADMAP.md) | Current milestones, work order, risks and non-goals | Living |
| [`plan/backlog.md`](./plan/backlog.md) | Ordered work queue and its definition of done | Living |

The index lists each ADR record (0001–0007 today) and its status. The records are immutable; only the index
and new records change.

### Design standards and campaign design

| Document | What it answers | Status |
| --- | --- | --- |
| [`design/model-mission-pattern.md`](./design/model-mission-pattern.md) | How to rebuild a mission to the Caral standard (acts, map, site, cast, tests) | Living |
| [`design/campaign-quality-bar.md`](./design/campaign-quality-bar.md) | The gates a finished mission must pass, plus the live audit of all 13 missions | Living |
| [`design/campaign-experiences.md`](./design/campaign-experiences.md) | What each campaign must teach and how the player learns it | Living |
| [`design/characters.md`](./design/characters.md) | Cast, likeness certainty, hero treatment and animation minimums | Living |
| [`design/asset-pipeline.md`](./design/asset-pipeline.md) | Start-here route for Blender/GIMP assets, ingest commands, provenance and review | Living |
| [`design/campaign-redesign.md`](./design/campaign-redesign.md) | Approved structure for the Tahuantinsuyo, Virreinato, Independencia and República chapters, including the four-mission launch catalogue and the 13-mission expansion | Approved (partially implemented) |
| [`design/art-direction.md`](./design/art-direction.md) | Stylized-realism rules: camera, palette, characters, architecture, landscape, light, budgets (Tambotoco reference) | Living |
| [`design/tambotoco-art-pilot.md`](./design/tambotoco-art-pilot.md) | Pilot audit, reference scene, asset inventory, size ledger, backlog and staged plan | Living |
| [`design/visual-language.md`](./design/visual-language.md) | Silhouettes, materials, emblems, rigged models and set-pieces | Living |
| [`design/cultural-landscape.md`](./design/cultural-landscape.md) | Cultural-landscape layer: data model, rendering and integration | Living |
| [`design/menu-ux.md`](./design/menu-ux.md) | Onboarding, campaign flow and menu behaviour | Living |
| [`design/i18n.md`](./design/i18n.md) | Language split, keys and translation rules | Living |

### Missions, sites and art sources

A mission normally has three documents: a historical dossier (the facts), a model-mission design (the
gameplay) and a site document (the authored place). All thirteen released missions have a model-mission
document; a new mission is not complete without one. The quality bar is the live status.

| Campaign | Mission | Historical dossier | Model-mission design | Site / art design |
| --- | --- | --- | --- | --- |
| Culturas Preincas | `m1_caral` | [`caral.md`](./historia/campanas/caral.md) | [`caral-model-mission.md`](./design/caral-model-mission.md) | [`caral-sacred-city.md`](./design/caral-sacred-city.md) |
| Culturas Preincas | `m2_chavin` | [`chavin.md`](./historia/campanas/chavin.md) | [`chavin-model-mission.md`](./design/chavin-model-mission.md) | [`chavin-sacred-site.md`](./design/chavin-sacred-site.md) |
| Culturas Preincas | `m3_moche_recuay` | [`moche_recuay.md`](./historia/campanas/moche_recuay.md) | [`moche-model-mission.md`](./design/moche-model-mission.md) | [`moche-sacred-site.md`](./design/moche-sacred-site.md) |
| Culturas Preincas | `m4_wari` | [`wari_tiahuanaco.md`](./historia/campanas/wari_tiahuanaco.md) | [`wari-model-mission.md`](./design/wari-model-mission.md) | [`wari-sacred-site.md`](./design/wari-sacred-site.md) |
| El Tahuantinsuyo | `m_tambotoco` | [`tambotoco.md`](./historia/campanas/tambotoco.md) | [`tambotoco-model-mission.md`](./design/tambotoco-model-mission.md) | — |
| El Tahuantinsuyo | `m5_yahuar_pampa` | [`yahuar_pampa.md`](./historia/campanas/yahuar_pampa.md) | [`chanca-model-mission.md`](./design/chanca-model-mission.md) | [`chanca-site.md`](./design/chanca-site.md) |
| El Tahuantinsuyo | `m6_chimu_inca` | [`chimu_inca.md`](./historia/campanas/chimu_inca.md) | [`chimu-model-mission.md`](./design/chimu-model-mission.md) | [`chimu-site.md`](./design/chimu-site.md) |
| El Tahuantinsuyo | `m6b_guerra_civil` | [`guerra_civil_inca.md`](./historia/campanas/guerra_civil_inca.md) | [`guerra-civil-model-mission.md`](./design/guerra-civil-model-mission.md) | [`cusco-site.md`](./design/cusco-site.md) |
| El Virreinato | `m_lima` | [`lima.md`](./historia/campanas/lima.md) | [`lima-model-mission.md`](./design/lima-model-mission.md) | — |
| El Virreinato | `m7_tupac_amaru` | [`tupac_amaru.md`](./historia/campanas/tupac_amaru.md) | [`colonial-model-mission.md`](./design/colonial-model-mission.md) | [`colonial-site.md`](./design/colonial-site.md) |
| La Independencia | `m_junta_cusco` | [`junta_cusco.md`](./historia/campanas/junta_cusco.md) | [`junta-cusco-model-mission.md`](./design/junta-cusco-model-mission.md) | — |
| La Independencia | `m8_independencia` | [`independencia.md`](./historia/campanas/independencia.md) | [`independencia-model-mission.md`](./design/independencia-model-mission.md) | [`independence-site.md`](./design/independence-site.md) |
| La República | `m9_guerra_pacifico` | [`guerra_del_pacifico.md`](./historia/campanas/guerra_del_pacifico.md) | [`arica-model-mission.md`](./design/arica-model-mission.md) | [`arica-site.md`](./design/arica-site.md) |

All thirteen released missions have a model-mission document. For the live status of any mission, use
[`campaign-quality-bar.md`](./design/campaign-quality-bar.md).

### Systems, tools and status

| Document | What it answers | Status |
| --- | --- | --- |
| [`development.md`](./development.md) | Architecture, code traps, rigged models, debugging, verification tiers, performance | Living |
| [`development/performance-audit.md`](./development/performance-audit.md) | RTS performance, AI, economy and scalability audit | Snapshot |
| [`development/site-view-performance.md`](./development/site-view-performance.md) | Real-GPU site-view frame times, the D3 pass and its decision | Living |
| [`ai-difficulty.md`](./ai-difficulty.md) | Why AI difficulty is not tuned with the AI-vs-AI mirror | Snapshot |
| [`design/authoring-tools.md`](./design/authoring-tools.md) | Blender/GIMP versions, MCP setup, source layout, security and CI | Living |
| [`design/blender-art.md`](./design/blender-art.md) | Blender sources, export, ingestion, manifest and review | Living |
| [`design/settlement-generator.md`](./design/settlement-generator.md) | Settlement layout design (core implemented; dropsites and defense deferred) | Approved (core implemented; extras deferred) |
| [`design/prp-status.md`](./design/prp-status.md) | Map/architecture/landscape audit and building classification | Snapshot |
| [`design/release-candidate.md`](./design/release-candidate.md) | Release status, art gate and publish checklist from 2026-10-30 | Archived |
| [`itch-description.md`](./itch-description.md) | Draft itch.io page | Proposal |
| [`modding/README.md`](./modding/README.md) | Mod format and loading | Living |

### History and research

[`historia/README.md`](./historia/README.md) is the index of the historical documentation. It contains the
periodisation, contemporaneity matrix, maps, outfits, architecture, technology, combat, trade, sources, map
sheets (`fichas_campana.md`), unique units, one dossier per civilization and one per mission, plus the
research proposals for the later campaigns.

`development/performance-audit.md` is the one document that stays in **Spanish** although it is not
player-facing: it is a historical measurement log, kept in its original language so the numbers and quotes
stay traceable.

## Keeping the map current

- Add a row here when you add a document, and link the document from the place a reader would look for it.
- Mark snapshots and archived documents explicitly; never let a stale audit read as current status.
- Update living documents in the same pull request as the behaviour they describe.
- Do not copy a rule into several documents. State it once in its owner document and link to it.
- Design docs are written in **English**. Player-facing text and `docs/historia/**` stay in **Spanish**.
