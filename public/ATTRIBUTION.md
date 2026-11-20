# Attribution and licences — Edades del Perú

This file ships with the game because some of its assets require attribution when the build is
distributed. The authoritative source, including hashes and per-asset records, is the repository's
`PROVENANCE.md` and `src/art/manifest.json`.

## Code

MIT License, Copyright (c) 2026 Miguel Amaya. The full text is in [`LICENSE`](./LICENSE).

## Engine and decoders

- **three.js** — MIT, © three.js authors. <https://github.com/mrdoob/three.js/blob/dev/LICENSE>
- **Google Draco** — Apache-2.0, © Google. <https://github.com/google/draco/blob/master/LICENSE>
- Vite is a build tool and is not shipped in `dist/`.

## Terrain textures

- **Poly Haven CC0 1.0** — `grass_ground` (Charlotte Baglioni), `brown_mud_02`, `coast_sand_01`,
  `aerial_rocks_01`, `snow_01`, `aerial_grass_rock`, `coast_sand_03` and `forrest_ground_01`
  (Rob Tuytel). <https://polyhaven.com/license>
- **`caral_grass` — CC BY 4.0**, derived from the *Ciudades Sagradas* Caral remaster v2,
  © José Amaya. Required attribution:
  **“Ciudades Sagradas, José Amaya, CC BY 4.0”**.
  Licence: <https://creativecommons.org/licenses/by/4.0/>. The source material is reproduced in
  `art-src/textures/caral/` in the repository: <https://github.com/joseamaya/edades-del-peru>.

## Models and animations

- **Quaternius — CC0 1.0**: Universal Base Characters, Universal Animation Library, Ultimate Animated
  Animal Pack (the llama pilot) and related rigs. Attribution is optional under CC0 and is given here.
  <https://quaternius.com/>

## Material textures

The material and textile maps under `src/assets/textures/materials/` were generated for this project
with **Cloudflare Workers AI** (FLUX models) and post-processed by the project's scripts. They are
project assets. This release is distributed free of charge; commercial redistribution must re-check the
current Cloudflare Workers AI and model terms first (see `PROVENANCE.md`).

## Renders and captures

The Blender renders, in-engine captures and menu backdrops are project work. They are **not historical
photographs** and are not reconstructions presented as documentary evidence. The historical sources and
the certainty labels live in `docs/historia/` and in the in-game Codex.

## Historical content

Dates, places, societies and named people come from the dossiers in `docs/historia/`, with their sources
and certainty tables. Where the record is silent, the game says so and labels the abstraction.
