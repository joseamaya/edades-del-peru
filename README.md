# EDADES DEL PERÚ — PERUVIAN HISTORY RTS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/joseamaya/edades-del-peru/actions/workflows/ci.yml/badge.svg)](https://github.com/joseamaya/edades-del-peru/actions/workflows/ci.yml)

An **Age of Empires II**-style real-time strategy game that walks through the history of Peru, from Caral to
the present, built with **Three.js** and procedural generation (Canvas textures, parametric models, WebAudio
audio), CC0 terrain scans and a small set of AI-generated material textures (see [`PROVENANCE.md`](./PROVENANCE.md)).
The whole in-game interface is in Spanish and the historical content is **historically grounded** and verifiable
(see [`docs/historia/`](./docs/historia/)).

The game is **historically grounded** on one key point: every match is played in a **historical period**, and
only **coetaneous civilizations** can face each other (e.g. Moche with Recuay, Chanca with Inca, never Moche
with Chimú).

**Play all five campaigns:** <https://joseamaya.github.io/edades-del-peru/>

## Media

The match runs with the **cinematic look** on by default (SSAO, bloom, vignette, chromatic aberration, a
period/biome colour grade and water refraction). Software renderers start in a safe profile automatically, and
the quality governor adapts on weaker hardware. Regenerate these captures with `yarn shots:media` and `yarn gif`.

![The Caral mission intro](./docs/media/gameplay.gif)

|                                                             |                                                    |
| ----------------------------------------------------------- | -------------------------------------------------- |
| ![A Moche base](./docs/media/hero.jpg)                      | ![The Chavín oracle](./docs/media/chavin.jpg)      |
| A Moche coastal base (cinematic effects + warm coast grade) | _El Oráculo de Chavín_ — per-mission highland mist |

## How to run

Requires Node.js ≥ 20.19. The package manager is **Yarn 1** (`yarn.lock` exists; there is no
`package-lock.json`).

```bash
yarn install
yarn dev          # development (http://localhost:5173)
yarn build        # typecheck + production build (dist/) + size budget
VITE_BASE=/edades-del-peru/ yarn build   # GitHub Pages project-site build
yarn preview      # serve the build
yarn typecheck    # tsc --noEmit
yarn lint         # ESLint
yarn test         # unit tests (Vitest)
yarn verify:fast  # quick gate: typecheck + lint + format + unit tests + build
yarn test:e2e     # full E2E suite (Playwright, requires `npx playwright install chromium`)
yarn test:e2e:smoke  # fast @smoke subset (used on PRs)
yarn visual:update   # refresh the visual-regression baseline after an intentional look change
yarn visual:check    # re-capture the representative scenes and fail on regressions
```

For automatic screenshots of the game (used in the visual review loop):

```bash
yarn shot name --seed=777 --wait=8000
```

Debug URL parameters:

- `?play=1` — go straight into a skirmish (debug/tests only; hidden from the release menu)
- `?menu=1` / `?menu=0` — force showing or hiding the main menu
- `?seed=777` — map seed
- `?fog=0` — disable fog of war
- `?low=1` — low quality (SwiftShader/software)
- `?speed=3` — speed multiplier
- `?era=N` — force tech level N (0-5)
- `?mission=ID` — start a campaign mission (see the table below)
- `?mod=ID` — load data mod(s) from `public/mods/` (comma-separated; see [`docs/modding/`](./docs/modding/))

## Campaign series: La Senda del Sol

The first release is **campaign-only**. _La Senda del Sol_ is the series; it contains **five campaigns divided by
Peruvian historical epochs**. Each campaign's launch catalogue has **four missions** and opens with its first
released mission; all five chapters are open from the start today. Fifteen missions are playable and the
five catalogue entries that are still in development are marked as such. The other thirteen missions of the
approved redesign are reserved for a later expansion.

| Campaign                      | Focus                                         | Launch catalogue            |
| ----------------------------- | --------------------------------------------- | --------------------------- |
| **Culturas Preincas**         | Caral, Chavín, Moche/Recuay, Wari             | **4 playable**              |
| **El Tahuantinsuyo**          | From the Ayar myth to the civil war           | **4 playable**              |
| **El Virreinato**             | From the founding of Lima to Túpac Amaru II   | **2 playable · 2 planned**  |
| **La Independencia**          | From the Cusco junta to the Real Felipe       | **4 playable**              |
| **La República**              | From Tarapacá to the Breña                    | **1 playable · 3 planned**  |

The launch catalogue is recorded in [`docs/design/campaign-redesign.md`](./docs/design/campaign-redesign.md);
the thirteen expansion missions keep their ids and copy but are not shown in the menu. Skirmish is hidden
from the menu for this release (the `?play=1` debug harness remains for tests).

Mission ids remain stable (`m1_caral` … `m9_guerra_pacifico`, plus `m6b_guerra_civil`, `m_junta_cusco`, `m_tambotoco`, `m_lima`, `m_lima_1821` and `m_real_felipe`). All released missions appear in
menus, the Codex and progress; `?mission=ID` remains available for QA.
The campaign [quality bar](./docs/design/campaign-quality-bar.md) records the gates a mission must meet.
Caral, Chavín, Moche and Wari have authored, source-backed sites; m5–m9 and m6b add dedicated low-poly GLB
landmarks over authored terrain; `m_junta_cusco` and `m_lima` reuse the colonial plaza with a procedural street life, and `m_tambotoco` has its own ayllu site, each on its own 256 m transect.

The live mission status is in [`docs/design/campaign-quality-bar.md`](./docs/design/campaign-quality-bar.md);
the 2026-10-30 release snapshot and publish checklist are in
[`docs/design/release-candidate.md`](./docs/design/release-candidate.md) (archived).

## Educational mode

The game teaches history while you play:

- **Campaign selection**: _Campañas_ opens the five-campaign map, with each campaign grouped by epoch.
- **Historical briefing**: each mission shows period and dates, geography, sides, expanded context, a
  «¿Sabías que…?» and its **sources** (collapsible).
- **Guided tutorial**: Caral teaches selecting, building and exploring; later missions teach the
  offering/feria loop, the canal and provincial network, Inca defence and expansion, the colonial
  muster and Sangarará, and the Junín/Ayacucho and Arica defences (respecting _Mostrar consejos_).
- **Codex** (📖 in the menu): a browser of periods, civilizations and campaigns, with the **historical dossiers**
  from [`docs/historia/`](./docs/historia/) and their sources.

## Controls

| Action                       | Key / Mouse                           |
| ---------------------------- | ------------------------------------- |
| Select                       | Left click / drag box                 |
| Select all of the same type  | Double click                          |
| Entire army                  | E                                     |
| Move / order                 | Right button                          |
| Attack-move                  | Ctrl + Right button                   |
| Convert (Amauta / Misionero) | Right-click an enemy unit             |
| Queue orders / rally point   | Shift + Right button                  |
| Pan                          | WASD / arrows / edges / middle button |
| Zoom                         | Wheel                                 |
| Last battle / center base    | Space / **H** (centro de la ciudad)           |
| Build platform / dwelling    | G / V                                 |
| Rotate camera (optional)     | Z / X                                 |
| Follow unit (toggle)         | **F**                                 |
| Pause                        | P · **☰** menu                       |

## Historical periods (10)

Matches are **locked by period** (no anachronistic modernization). Chronology in
[`docs/historia/periodizacion.md`](./docs/historia/periodizacion.md).

| Period             | Dates          | Civilizations                                 |
| ------------------ | -------------- | --------------------------------------------- |
| Late Archaic       | 3000–1800 BCE  | Caral-Supe                                    |
| Early Horizon      | 1200–200 BCE   | Chavín, Paracas, Cupisnique                   |
| Early Intermediate | 200 BCE–600 CE | Moche, Nazca, Recuay, Tiahuanaco, Paracas     |
| Middle Horizon     | 600–1000 CE    | Wari, Tiahuanaco                              |
| Late Intermediate  | 1000–1476 CE   | Chimú, Chincha, Chanca, Collas/Lupaca, Huanca |
| Late Horizon       | 1438–1533 CE   | Inca                                          |
| Viceroyalty        | 1542–1821      | Royalists                                     |
| Independence       | 1821–1824      | Patriots, Royalists                           |
| Republic           | 1821–1900      | Republic of Peru, Chile                       |
| Contemporary       | 1900–present   | Republic of Peru                              |

Only **coetaneous** civilizations are offered as rivals (matrix in
[`docs/historia/contemporaneidad.md`](./docs/historia/contemporaneidad.md)).

## Resources

Food · Wood · **Silver** (mines) · **Stone** (quarries). Classic cycle: gather -> deliver to the drop-off
(Troje/Aserradero/Platería/Cantera) -> return.

## Maps by geography

Terrain depends on the civilization's geography:

- **`coast`** — desert coastline, valleys and oases (Caral-Supe, Paracas, Moche, Nazca, Chimú, Chincha,
  Republic, Chile).
- **`andes`** — mountain range, ravines and terraces (Chavín, Recuay, Wari, Chanca, Inca, Royalists, Patriots).
- **`altiplano`** — Lake Titicaca plateau (Tiahuanaco).
- **`jungle`** — high jungle (optional).

Details in [`docs/historia/mapas.md`](./docs/historia/mapas.md); the visual language
(terrain, architecture, materials, vegetation, colour) in
[`docs/design/visual-language.md`](./docs/design/visual-language.md).

## Documentation

[`docs/README.md`](./docs/README.md) is the documentation map: it routes each task (design, history, art,
engine, release) to the document that owns it. The short list:

- [`docs/GDD.md`](./docs/GDD.md) — vision, pillars, scope, non-goals and definition of done.
- [`docs/DECISIONS/`](./docs/DECISIONS/README.md) — closed technical decisions, one per record.
- [`docs/plan/ROADMAP.md`](./docs/plan/ROADMAP.md) and [`docs/plan/backlog.md`](./docs/plan/backlog.md) —
  current milestones and the ordered work queue.
- [`docs/design/campaign-quality-bar.md`](./docs/design/campaign-quality-bar.md) — the live status of every
  mission.
- [`docs/design/model-mission-pattern.md`](./docs/design/model-mission-pattern.md) — how a mission is built.

## Historical documentation

The civilization and campaign dossiers, with dates, geography, characters and sources, are in
[`docs/historia/`](./docs/historia/). Inventing names is avoided: where there is no historical record, it is
stated.

## Architecture

```
docs/historia/  Historical dossiers (periodization, civilizations, campaigns, sources)
src/
  core/        Engine: Game, RTS Camera, EventBus, GameLoop, Config, types (Era = tech level, HistoricalPeriod = historical)
  rendering/   Renderer, PostFX, Sky, Water, Terrain (coast/andes/altiplano), Particles, Textures
  model/       Defs for periods, civs, units, buildings, techs + parametric model generator
  entities/    Unit, Building, Resource node, Projectile, Views
  campaign/    Mission engine (objectives, triggers, waves) + 15 historical missions in five campaigns
  game/        A* pathfinding, Fog of war, Opponent AI, Economy (worker assignment)
  ui/          Full Spanish HUD (menu by period)
  audio/       Procedural AudioEngine (WebAudio)
  util/        Seeded RNG, noise, math, DOM helpers
```

## Historical note

Dates and cultures follow the Andean archaeological periodization (Rowe, Lanning, Lumbreras). The game is a
work of strategic fiction: it simplifies and abstracts the real life of these societies, but it **does not
invent** names, dates or battles. Sources in [`docs/historia/fuentes.md`](./docs/historia/fuentes.md).

## Contributing

Want to help? Read [`CONTRIBUTING.md`](./CONTRIBUTING.md): requirements, commands, code conventions and the
golden rule — **do not invent history**. Bug reports and ideas go to
<https://github.com/joseamaya/edades-del-peru/issues>.

## License

Distributed under the **MIT** license — see [`LICENSE`](./LICENSE). The texture assets and their provenance are
documented in [`PROVENANCE.md`](./PROVENANCE.md).
