# Game design document — Edades del Perú

**Status:** living · **Version:** 0.1.0 · **Last updated:** 2026-11-14

This document is the design source of truth. It states the intent, the pillars and the scope; it does not
repeat the rules that belong to the detailed documents. When this document and a detailed document disagree
about intent, this document wins and the detailed document is fixed. When they disagree about implemented
behaviour, code and tests win.

See [`README.md`](./README.md) for the full documentation map and [`../AGENTS.md`](../AGENTS.md) for the
non-negotiable rules.

## 1. Vision

_Edades del Perú_ is an **Age of Empires II-style real-time strategy game** that walks through the history of
Peru, from Caral to the present, in ten historical periods. The player gathers, builds, trains and fights in
matches that are locked to one period, with only coetaneous civilizations facing each other.

The game is **campaign-first**. The campaign _La Senda del Sol_ turns documented historical problems into
playable missions: the rise of Caral, the Chavín oracle, the Moche and Wari worlds, the Inca expansion, the
Viceroyalty, independence and the War of the Pacific.

It is a work of **strategic fiction**, not a simulation and not a textbook. The mechanics abstract real
societies; the names, dates, places and battles do not get invented.

**Audience:** RTS players and people interested in Peruvian history. The interface is in Spanish.

## 2. Pillars

1. **History you can play.** Each mission is built around one historical problem and one mechanic that
   belongs to it, not around a renamed `gather + build + survive`.
2. **One period, one world.** A match is locked to a historical period. `Era` is the internal tech level;
   `HistoricalPeriod` is the match's place in history. They are never conflated.
3. **Readable strategy.** Silhouettes, palettes and the HUD must read at RTS zoom. A unit or building is
   recognisable before its tooltip is read.
4. **Evidence over invention.** Every historical claim comes from a dossier with a source. Where the record
   is silent, the game says so and labels the assumption.
5. **Small team, data-driven.** Definitions live in `src/model/defs/*`; missions live in
   `src/campaign/defs/missions/*`; procedural models are the default and authored assets are the exception
   that earns its budget.

## 3. Core loop

A campaign session is:

**campaign menu → briefing and tutorial → gather, build and train → mission mechanic → objectives →
epilogue → next mission**

- A model mission is divided into **acts** inside a single mission definition and targets **30–40 minutes**.
  The band is a target, not a gate: missions that cannot reach it without padding record their measured path
  and the exception in their design document (m3–m9 and m6b).
- Objectives are revealed as the acts advance; optional objectives add depth but never gate victory.
- The documented historical outcome is the ending, including abandonment, defeat or conquest. It is framed as
  history, not as the player's failure.
- The mission opens with a narrated intro and a briefing, and closes with a mission-specific epilogue.
- The Codex is always optional; the educational layer never blocks play.

The current release is campaign-only. Skirmish is hidden from the release menu; the `?play=1` debug harness
remains for development and tests. Multiplayer is not part of this release.

## 4. Content structure

Five campaigns and twenty released missions. The launch catalogue keeps four released entries per campaign;
no planned milestone remains in development.

| Campaign | Released missions | Historical focus |
| --- | --- | --- |
| _Culturas Preincas_ | `m1_caral`, `m2_chavin`, `m3_moche_recuay`, `m4_wari` | Caral, Chavín, Moche/Recuay, Wari |
| _El Tahuantinsuyo_ | `m_tambotoco`, `m5_yahuar_pampa`, `m6_chimu_inca`, `m6b_guerra_civil` | From the Ayar myth to the civil war |
| _El Virreinato_ | `m_lima`, `m_cusco_1536`, `m_vilcabamba`, `m7_tupac_amaru` | From the founding of Lima to Túpac Amaru II |
| _La Independencia_ | `m_junta_cusco`, `m_lima_1821`, `m8_independencia`, `m_real_felipe` | From the Cusco junta to the Real Felipe |
| _La República_ | `m_tarapaca`, `m9_guerra_pacifico`, `m_miraflores`, `m_brena` | Tarapacá, Arica, Miraflores and the Breña |

The 2026-11-18 launch catalogue has four entries per campaign: **20 playable + 0 in development**. The other
thirteen missions of the approved redesign are reserved for an expansion and are not listed in any campaign
path.

Mission ids are stable: they are save keys, URL parameters and progress keys. Do not rename them.

The approved future structure of the later chapters (new missions, factions and engine gaps) is in
[`design/campaign-redesign.md`](./design/campaign-redesign.md). A planned mission is not implemented until
its historical dossier exists, it follows the model-mission pattern and it is listed in the launch catalogue.

## 5. History and canon

- **No invented names, dates, battles, rulers or technologies.** Cite a source from
  [`historia/`](./historia/).
- Where the record is silent, the mission uses a labelled assumption (plausible, abstraction or tradition),
  never a silent invention.
- Myths and chronicle accounts are playable only when the mission is labelled as **Leyenda**; elsewhere they
  are narrated as «cuentan que…».
- **Chronology guard:** no firearms, horses, vehicles or engines before 1532, and no science fiction in any
  era.
- **Period lock:** a match has one `HistoricalPeriod` and can only use civilizations that are coetaneous with
  it (`civsForPeriod`).

The detailed rules, certainty tables and sources live in the dossiers and
[`historia/fuentes.md`](./historia/fuentes.md); [`historia/README.md`](./historia/README.md) is their index.

## 6. Art and audio

The visual target is **stylized realism**: optimized but believable geometry, clear silhouettes, authored
landmarks and a palette that belongs to the place and the period. Tambotoco is the reference scene; the
camera, scale, terrain, materials, vegetation and light rules are in
[`design/art-direction.md`](./design/art-direction.md), and the pilot audit and plan in
[`design/tambotoco-art-pilot.md`](./design/tambotoco-art-pilot.md). The implementation map is
[`design/visual-language.md`](./design/visual-language.md).

- **Procedural first.** Units and buildings have a procedural model and the simulation never depends on a
  GLB. Rigged models are presentation-only; root motion is ignored.
- **Cast.** Named characters need a documented name and are classified by likeness in
  [`design/characters.md`](./design/characters.md). Pre-Hispanic figures without an attested face use a stylized
  medallion; no portrait is a historical photograph.
- **Asset path.** [`design/asset-pipeline.md`](./design/asset-pipeline.md) is the start-here route from Blender
  or GIMP to ingest, provenance and review; the deep rules stay in `authoring-tools.md` and `blender-art.md`.
- **Authored sites.** The model missions use authored terrain and landmarks; their intro, chapter and epilogue
  art is captured in engine, with approved Blender renders used where they exist (m3 and m4). Renders are
  provenance-gated: a new render starts `reviewed: false` and the game hides it until a human approves it.
- **Blender and GIMP are local authoring tools**, never CI dependencies. Their versions, MCP setup and
  source layout are in [`design/authoring-tools.md`](./design/authoring-tools.md); the render/export pipeline
  is in [`design/blender-art.md`](./design/blender-art.md), and the start-here route is
  [`design/asset-pipeline.md`](./design/asset-pipeline.md).
- **Every third-party asset** is recorded with its source and licence in [`../PROVENANCE.md`](../PROVENANCE.md).
- Audio is procedural through the WebAudio engine; no external music or sound pack is required to run.

## 7. Technical frame

| Area | Decision |
| --- | --- |
| Runtime | Three.js + Vite + TypeScript, strict mode, browser |
| Package manager | Yarn 1 (`yarn.lock`; never a `package-lock.json`) |
| Node | ≥ 20.19 (CI uses 22) |
| Build budget | `dist/` < 25 MB and the entry chunk < 600 KB gzip |
| Data | Definitions in `src/model/defs/*`; missions in `src/campaign/defs/missions/*` |
| Determinism | Seeded RNG; no `Math.random()` in simulation code |
| Events | Typed `GameEvents` on the `EventBus` |
| Tests | Vitest for units/data; Playwright for E2E; visual baselines for intentional look changes |

The architecture, code traps and verification tiers are in [`development.md`](./development.md). Closed
technical decisions are in [`DECISIONS/`](./DECISIONS/README.md).

## 8. Scope and non-goals

**In scope for the current release**

- The five campaigns and twenty missions.
- Spanish interface and educational mode (briefing, tutorial, Codex) with sources.
- Period-locked matches, AI opponent, fog of war, economy, combat and campaign saves.
- Desktop browser play, keyboard and mouse.

**Out of scope**

- Inventing history or presenting an abstraction as a documented fact.
- Firearms, horses, vehicles or engines before 1532; science fiction in any era.
- Multiplayer, a public skirmish/map editor, or a new engine.
- Adding dependencies, MCP servers or CI services without approval.
- Presenting a draft render or an AI-generated image as a historical photograph.

## 9. Definition of done

A mission is done when it passes every gate in
[`design/campaign-quality-bar.md`](./design/campaign-quality-bar.md): history, identity, play, contract,
onboarding, closure, UX, visuals, persistence, tests, docs, structure, opening, art, performance and scale.

A change is done when:

- code, tests and the affected living documents agree;
- `yarn verify:fast` and the required E2E tier are green;
- the player-visible result has a current capture (`yarn evidence`);
- new art carries `confidence`, provenance and a recorded human review;
- the PR describes what changed, how it was tested and what could not be verified.

## 10. Change policy

- This GDD is **living**: update it when the vision, pillars, scope or definition of done changes.
- A technical decision that closes an option gets an ADR in [`DECISIONS/`](./DECISIONS/README.md); do not
  rewrite the old one.
- A historical fact belongs in a dossier, not here.
- A point-in-time audit is marked **Snapshot** and is never edited into a living document.
