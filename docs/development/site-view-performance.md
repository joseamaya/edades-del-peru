# Site-view performance (real GPU)

**Status:** living · **Measured:** 2026-11-17 · **Scope:** the campaign site views that still rested on
SwiftShader numbers (m3–m9, m6b and La Junta).

This is the roadmap D3 pass. It records the shipped frame at 1280×800 and 1600×900 on the project's
reference iGPU and decides what to do with the result. The per-mission structural caps stay in
[`scripts/bench_scene.mjs`](../../scripts/bench_scene.mjs); this document does not relax them.

## Environment and method

- Intel i7-13700, Intel Graphics (RPL-S) via ANGLE/Vulkan in headless Chromium. The pass fails a row
  instead of recording it if the page falls back to SwiftShader.
- `yarn bench:site-views` (new) runs, for every mission and stage:
  - one **structural** row at 1600×900, which owns the triangle/call/mesh/material counts. It runs
    with `--gpu` and no `--assert`: the caps are calibrated on SwiftShader, so the software cap is
    shown for context, not enforced against the hardware-high row;
  - **shipped-frame** rows at 1280×800 and 1600×900 (`--frames --quality=high`), which own the frame
    time. Post-processing, the cinematic grade and water refraction are on.
- The quality governor is pinned to `high` and frozen for the sample, so these are worst-case numbers,
  not the low/medium presets the governor falls back to. Each frame value is a 2 s rAF sample.
- The three tightest late views are also sampled with `yarn bench:site-views --low` at the low preset
  (the same preset `?low=1` applies) to record the governor's fallback.
- Raw per-row JSON and `summary.md` are written to `review/site-views/` (gitignored); the command is
  reproducible from this commit.

## Results

Frame time is p50/p95 in milliseconds; counts and meshes/materials are the hardware-high structural row.
`FPS` is `1000 / p50` at 1600×900.

| Mission | Stage | 1280×800 | 1600×900 | FPS | Scene tris / calls | Meshes / materials |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| m3_moche_recuay | opening | 22.7 / 26.1 | 28.0 / 30.3 | 35.7 | 733,532 / 327 | 849 / 341 |
| m3_moche_recuay | late | 25.9 / 30.4 | 30.7 / 34.3 | 32.6 | 936,585 / 555 | 1,554 / 627 |
| m4_wari | opening | 20.7 / 23.7 | 26.2 / 27.9 | 38.2 | 618,807 / 192 | 405 / 146 |
| m4_wari | late | 23.4 / 26.0 | 27.9 / 30.8 | 35.8 | 725,526 / 341 | 1,010 / 380 |
| m5_yahuar_pampa | opening | 24.8 / 26.5 | 29.3 / 33.7 | 34.1 | 901,243 / 352 | 830 / 341 |
| m5_yahuar_pampa | late | 26.4 / 30.8 | 31.6 / 34.6 | 31.6 | 1,020,678 / 495 | 1,482 / 608 |
| m6_chimu_inca | opening | 21.7 / 25.5 | 27.0 / 29.5 | 37.0 | 663,215 / 265 | 780 / 313 |
| m6_chimu_inca | late | 25.7 / 29.0 | 30.7 / 33.1 | 32.6 | 968,560 / 508 | 1,453 / 590 |
| m6b_guerra_civil | opening | 25.3 / 29.2 | 30.2 / 32.4 | 33.1 | 948,311 / 428 | 1,198 / 487 |
| m6b_guerra_civil | late | 31.0 / 37.5 | 34.2 / 39.8 | 29.2 | 1,272,993 / 663 | 2,113 / 870 |
| m7_tupac_amaru | opening | 24.1 / 27.1 | 28.3 / 31.4 | 35.3 | 736,595 / 478 | 820 / 336 |
| m7_tupac_amaru | late | 28.2 / 32.7 | 32.9 / 37.2 | 30.4 | 1,044,570 / 718 | 1,492 / 589 |
| m8_independencia | opening | 26.1 / 29.2 | 30.6 / 34.1 | 32.7 | 859,263 / 574 | 1,013 / 453 |
| m8_independencia | late | 30.0 / 35.8 | 35.5 / 42.7 | 28.2 | 1,144,783 / 911 | 1,650 / 715 |
| m9_guerra_pacifico | opening | 22.5 / 25.0 | 27.6 / 29.9 | 36.2 | 696,029 / 435 | 896 / 360 |
| m9_guerra_pacifico | late | 26.7 / 29.8 | 31.5 / 38.0 | 31.7 | 1,018,707 / 745 | 1,625 / 669 |
| m_junta_cusco | opening | 26.8 / 30.3 | 31.8 / 36.5 | 31.4 | 916,333 / 665 | 1,279 / 524 |

### Quality fallback (1600×900)

| View | High p50 / FPS | Low p50 / FPS | Low tris / calls |
| --- | ---: | ---: | ---: |
| m6b_guerra_civil late | 34.2 / 29.2 | 21.5 / 46.5 | 1,015,707 / 659 |
| m8_independencia late | 35.5 / 28.2 | 21.6 / 46.3 | 911,787 / 907 |
| m7_tupac_amaru late | 32.9 / 30.4 | 20.2 / 49.5 | 811,766 / 714 |

The low preset removes the water refraction pass and drops the LODs; it turns the three sub-31 FPS
views into ~46–50 FPS views, so the governor's fallback is doing its job.

### Reading the numbers

- **Frame time:** every view is at or above **28 FPS p50 at 1600×900** and **32 FPS at 1280×800** in the
  worst-case high preset. The tightest are m8 late (28.2), m6b late (29.2) and m7 late (30.4). The
  governor steps down below its 45 FPS window, so low/medium stay above 30 by construction.
- **Counts:** the hardware-high scene is 0.62–1.27M triangles, 192–911 calls and 146–870 materials. The
  local SwiftShader ratchet (`yarn bench:check`, not a CI job) is intentionally lower; for example m4
  measures 362,911 / 187 in software and 618,807 / 192 here. The delta is the high-quality LOD/kit and
  the shadow pass, not a regression. The global Tambotoco caps (500k/280 opening, 660k/360 late) and
  the per-mission ratchets are unchanged.
- **Late views** add 13–46% triangles and 41–92% calls over the opening: the unit crowds, their gear and
  the site's late dressing. m6b late is the heaviest (1.27M / 663), m8 late has the most calls (911).

## Decision

1. **Accept** the measured high-quality frame times on the reference iGPU. No site view is below 28 FPS
   p50 at 1600×900, and the governor's low/medium presets are the playable path; 1280×800 is 32–48 FPS.
2. **Do not raise the scene caps.** They remain the local SwiftShader ratchet (`yarn bench:check`); the
   hardware-high counts are recorded here so a future pass can compare like with like.
3. **Schedule one optimization follow-up** (backlog B13): reduce the late-view cost of m6b (1.27M tris,
   29.2 FPS) and m8 (1.14M tris, 911 calls, 28.2 FPS), starting with unit-crowd LOD/shadow silhouette
   and material consolidation. Re-measure with `yarn bench:site-views` before and after.
4. Re-run the pass before release packaging (D4) and after any late-view art change.

## Tight rows and scope

The 2026-11-19 closeout re-ran the two tightest SwiftShader rows on `main`:

- `m8_independencia` opening: **618,602 / 597** against **625,000 / 660**. The row is green, but the
  margin is ~1 %; an earlier run measured 626,265 and the vegetation mix varies a few thousand triangles
  between runs. Do not add scene weight to m8 without re-measuring.
- `m6b_guerra_civil` late: **1,015,103 / 672** against **1,025,000 / 715** (~1 % margin).

This document's 17 rows cover m3–m9, m6b and La Junta. The seven missions added on 2026-11-18
(`m_cusco_1536`, `m_vilcabamba`, `m_lima_1821`, `m_real_felipe`, `m_tarapaca`, `m_miraflores`, `m_brena`)
have SwiftShader rows in `bench_scene.mjs` / `yarn bench:check` but **no real-GPU frame time** yet; the
0.2.0 release records that as a known limitation, not as a measured 28–38 FPS claim.
