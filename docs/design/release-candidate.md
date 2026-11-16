# Release status

> **Archived snapshot (2026-10-30).** Counts and scope below describe that release, not the current
> repository; see the README and `docs/design/campaign-quality-bar.md` for the live status.

Status: **published on GitHub Pages** at <https://joseamaya.github.io/edades-del-peru/>; itch upload
deferred until the end of the campaign work. Date: 2026-10-30. Scope: all five campaigns
(_Culturas Preincas_, _El Tahuantinsuyo_, _El Virreinato_, _La Independencia_ and _La República_),
missions m1 Caral through m9 Guerra del Pacífico, plus m6b La Guerra Civil.

## Verified

- `yarn verify:fast`: typecheck, lint, format, 446 unit tests and build pass.
- `yarn test:e2e:slow`: 76 passing, including campaign playtests, saves and settlement.
- `yarn test:e2e:smoke`: 42 passing.
- `yarn test:e2e:fast`: 184 passing.
- `yarn art:validate`: manifest and Blender render assets are valid.
- GitHub Pages serves the project under `/edades-del-peru/`; the live build is checked with a
  headless browser after each deploy, including the m5–m9 briefings and tutorials.
- AI issue #136 is closed: 14/20 decisive AI-vs-AI matches (70 %); remaining draws are
  documented in `docs/development/performance-audit.md`.

## Art gate

No record in `src/art/manifest.json` remains `reviewed: false` (2026-11-16). The five Caral
education/tour records and their campaign intro were approved after a visual review. The three draft
mission intros (`m6b_guerra_civil-intro`, `m7_colonial-intro`, `m8_independencia-intro`) were Workbench
blockouts with no ground, sky or troops in them — m8's caption promised patriot tents that were not in the
render — so their records and generated files were removed. Every mission's opening already used the
in-engine `MISSION_ART` capture, so no player-facing image changed.

The runtime site GLBs keep their own review status in `art-src` (#343); `?art=all` no longer has hidden
render records to preview. A human must still review the site GLBs before presenting them as final art.

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

- All ten missions are released. All m5–m9 and m6b now use authored sites with their own heightfields and collision. They are smaller
  than the authored sites of Caral, Chavín, Moche and Wari and do not have a CI pixel gate. Their intro renders are drafts.
- Mission-specific save round-trips are covered for m1–m9.
- GitHub Pages is enabled and the `Deploy GitHub Pages` workflow is re-run for each campaign
  release. The itch build is packaged as `review/edades-del-peru-itch.zip` but not uploaded
  because `butler` is not available here.
- Six AI seeds still draw (778, 779, 782, 788, 791, 793). They are documented, not hidden.

## Publish checklist

1. Human-review the six art records and approve or reject each with `yarn art:review`.
2. Run the real-GPU performance pass and record the result.
3. Re-run `yarn verify:fast`, the full slow E2E suite and the Pages artifact smoke.
4. Tag the release and update the changelog/version.
5. Upload the itch build separately with `butler` at the end of the campaign work.
