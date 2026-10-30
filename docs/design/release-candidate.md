# Preinca release candidate

Status: **release candidate approved for GitHub Pages; itch upload pending butler**. Date: 2026-10-30. Scope: chapter I
(_Culturas Preincas_), missions m1 Caral, m2 Chavín, m3 Moche/Recuay and m4 Wari.

## Verified

- `yarn verify:fast`: typecheck, lint, format, unit tests and build pass.
- `yarn test:e2e:slow`: 69 passing, including campaign playtests, saves and settlement.
- `yarn test:e2e:smoke`: 42 passing.
- `yarn art:validate`: manifest and Blender render assets are valid.
- Manual GitHub Pages build (`41117934602`) succeeded. Its `dist` artifact was served under
  `/edades-del-peru/`; m1 Caral opened from the subpath with no failed requests, and
  `draco_decoder.wasm`, `mods/` and `media/` returned 200.
- AI issue #136 is closed: 14/20 decisive AI-vs-AI matches (70 %); remaining draws are
  documented in `docs/development/performance-audit.md`.

## Art gate

Eight records remain `reviewed: false`:

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
render-only. The remaining six Caral/m1/m2 records are still unreviewed and stay hidden.

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

- Chapters II–IV are drafts: m5 Yahuar Pampa, m6 Chimú–Inca, m7 Túpac Amaru, m8 Independencia
  and m9 Guerra del Pacífico are reachable for QA but are not in the released campaign menus.
- The `Deploy GitHub Pages` workflow is manual and deploys the verified artifact after Pages is
enabled. The itch build is packaged but not uploaded because `butler` is not available in this
environment.
- Six AI seeds still draw (778, 779, 782, 788, 791, 793). They are documented, not hidden.

## Publish checklist

1. Human-review the eight art records and approve or reject each with `yarn art:review`.
2. Run the real-GPU performance pass and record the result.
3. Re-run `yarn verify:fast`, the full slow E2E suite and the Pages artifact smoke.
4. Tag the release and update the changelog/version.
5. Run `Deploy GitHub Pages`; upload the itch build separately with `butler`.
