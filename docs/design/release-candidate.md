# Release status

Status: **published on GitHub Pages** at <https://joseamaya.github.io/edades-del-peru/>; itch upload
deferred until the end of the campaign work. Date: 2026-10-30. Scope: all four chapters
(_Culturas Preincas_, _El Tahuantinsuyo_, _El Virreinato_ and _Independencia y República_),
missions m1 Caral through m9 Guerra del Pacífico.

## Verified

- `yarn verify:fast`: typecheck, lint, format, 437 unit tests and build pass.
- `yarn test:e2e:slow`: 74 passing, including campaign playtests, saves and settlement.
- `yarn test:e2e:smoke`: 42 passing.
- `yarn test:e2e:fast`: 181 passing.
- `yarn art:validate`: manifest and Blender render assets are valid.
- GitHub Pages serves the project under `/edades-del-peru/`; the live build is checked with a
  headless browser after each deploy, including the m5–m9 briefings and tutorials.
- AI issue #136 is closed: 14/20 decisive AI-vs-AI matches (70 %); remaining draws are
  documented in `docs/development/performance-audit.md`.

## Art gate

Six records remain `reviewed: false`:

- `caral-architecture-pyramid`
- `caral-map-city`
- `caral-religion-plaza`
- `caral-tour-isometric`
- `m1_caral-intro`
- `m2_chavin-intro`

The game hides unreviewed records by default; `?art=all` previews them with a draft badge.
A human must review the contact sheet before any of them is presented as final art. The m3/m4
intros were re-rendered on 2026-10-30 and approved by Miguel Amaya: m3 has warmer adobe/plaster
contrast and a closer camera; m4 has textured cut-stone walls, a white/red D-temple and visible
murals. The runtime GLBs keep flat materials (18 KB Moche, 34 KB Wari); the image textures are
render-only.

## Performance note

Measured on the current software WebGL path (1280×800, `?low=1`, main pass, not a GPU
benchmark):

| Site | Draw calls | Triangles | Meshes | Materials |
| --- | ---: | ---: | ---: | ---: |
| Moche | 315 | 1,335,364 | 992 | 268 |
| Wari | 159 | 755,946 | 556 | 125 |

These numbers are not a release verdict. A real-GPU pass at 1280×800 and 1600×900 is still
required before deciding whether Moche/Wari need mesh/material optimization.

## Known limitations

- All nine missions are released, but m5–m9 use documented procedural landmarks and authored
  terrain; they do not have dedicated GLB sites like Caral, Chavín, Moche and Wari. Their
  quality-bar visual gate is partial.
- Mission-specific save round-trips are covered for m1–m9.
- GitHub Pages is enabled and the `Deploy GitHub Pages` workflow is re-run for each chapter
  release. The itch build is packaged as `review/edades-del-peru-itch.zip` but not uploaded
  because `butler` is not available here.
- Six AI seeds still draw (778, 779, 782, 788, 791, 793). They are documented, not hidden.

## Publish checklist

1. Human-review the six art records and approve or reject each with `yarn art:review`.
2. Run the real-GPU performance pass and record the result.
3. Re-run `yarn verify:fast`, the full slow E2E suite and the Pages artifact smoke.
4. Tag the release and update the changelog/version.
5. Upload the itch build separately with `butler` at the end of the campaign work.
