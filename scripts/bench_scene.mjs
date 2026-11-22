import fs from 'fs';
import os from 'os';
import path from 'path';
import { readSceneStats } from './perf-probes.mjs';
import {
  launchChromium,
  withViteServer,
  cliArg,
  useGpu,
  isSoftwareRenderer,
  readGlRenderer,
  waitForHighlandKits,
} from './lib.mjs';

/**
 * Scene budget for a mission's opening view (docs/design/art-direction.md §7): one plain scene render
 * (shadow pass included, post-processing excluded) at 1600x900 and zoom 54, plus the Blender
 * vegetation/fauna kit isolated by hiding it. `--frames` additionally samples the shipped frame, so the
 * structural pass and the player-visible frame are reported side by side. Triangle and draw-call counts are machine-independent,
 * unlike FPS: headless Chromium renders in software unless `--gpu` (or `GPU=1`) asks for the host GPU.
 *
 * Usage: node scripts/bench_scene.mjs [--mission=m1_caral] [--stage=late] [--assert] [--out=review/bench-scene.json]
 *        [--gpu] [--gl=egl|angle-vulkan|...] [--frames] [--quality=high|low] [--viewport=1600x900] [--direct] [--no-refraction]
 *
 * `--frames` also measures the shipped frame (loop running, post-processing on, 2 s of rAF samples) at the pinned
 * framing: that is the frame the player actually sees in a mission, unlike the structural draws-only pass.
 *
 * `--stage=late` measures m1's end game instead of its opening: the whole city in use (fair tents, sacred
 * fire, cooking smoke), the act IV drought and 30 extra workers, viewed over the Sacred City.
 * `--stage=camp` measures Act III at `foundation`: the Pyramid Mayor under construction, the camp and
 * its six-worker crew, viewed from the south-west.
 */
const mission = cliArg('mission') ?? 'm1_caral';
const stage = cliArg('stage') ?? 'opening';
const assert = process.argv.includes('--assert');
const frames = process.argv.includes('--frames');
const quality = String(cliArg('quality', 'high'));
if (!['high', 'medium', 'low'].includes(quality)) {
  console.error(`invalid --quality "${quality}" (use high|medium|low)`);
  process.exit(1);
}
// Skips post-processing and the water refraction pass, so the frame shows the scene + shadows alone.
const direct = process.argv.includes('--direct');
if ((direct || process.argv.includes('--no-refraction')) && !frames) {
  console.warn('--direct and --no-refraction only affect the --frames sample; ignoring them');
}
// Keeps post-processing but skips the extra full-scene refraction pass.
const noRefraction = process.argv.includes('--no-refraction');
const outFile = cliArg('out') ?? 'review/bench-scene.json';
// The roadmap's site-view pass records 1280x800 and 1600x900; the default stays the historical 1600x900.
const viewport = String(cliArg('viewport', '1600x900'));
const [viewWidth, viewHeight] = viewport.split('x').map((n) => Number.parseInt(n, 10));
if (!Number.isFinite(viewWidth) || !Number.isFinite(viewHeight) || viewWidth < 320 || viewHeight < 240) {
  throw new Error(`invalid --viewport=${viewport}; expected WIDTHxHEIGHT`);
}

// Ratchet: §7 targets 600k triangles and 200 draw calls per frame. m1 measured 877k / 441 before the
// tree-instance, water and flier-shadow cuts, ~685k / 413 after them, ~497k / 414 with the terrain
// LOD, ~477k / 271 after batching resource nodes, the site and the fauna, ~477k / 228 with the
// consolidated workers and ~467k / 203 after the heritage proxies and house materials, ~332k / 204
// with the simplified worker bodies (12k -> 2.5k triangles) and body-only unit shadows; tighten as it
// gets cheaper.
const BUDGETS = {
  // Kit counts include the shadow pass; the fauna is instanced per species and part.
  // The Áspero opening draws its village (huaca and fishing houses, ~5 materials in the main and shadow
  // passes) next to the base: +15 calls over the former Caral-terrace opening.
  // The household props kit adds 8 calls (four shared materials per base, two bases, no shadow pass:
  // the pieces are sub-metre); pinning every LOD manager to the measured framing adds the quarry's
  // shadow pass (+2), and the pacae shrubs add 3 materials x 2 LODs with their shadows (up to +12).
  // Measured opening: 371 147-390 999 tris / 170-174 calls, kit 92 512-112 364 / 51-55; the five
  // started complexes at foundation add ~25k tris and the Act III valley groves add ~9-17k more,
  // depending on which clusters fall inside the 30 m LOD0 ring. Cap keeps ~7 % headroom.
  m1_caral: { sceneTriangles: 400_000, sceneDrawCalls: 230, kitTriangles: 120_000, kitDrawCalls: 56 },
  // End game over the city with 35 workers in view: art-direction §7 (600k triangles). It measured
  // 1.57M / 396 before the worker cuts and ~582k / 261 after. Skinned workers cannot be instanced, so
  // each one in view is ~6 draws (body, hair, garments, tool, team ring, body shadow) on top of the
  // opening's scene: the call budget allows that crowd over the opening's 230.
  m1_caral_late: { sceneTriangles: 600_000, sceneDrawCalls: 275, kitTriangles: 80_000, kitDrawCalls: 36 },
  // Act III at foundation: the phase-1 Mayor, the five started complexes, the camp, its six visible rigs,
  // the valley groves and the staked plazas. After waiting for both city LODs it measured 413 286-421 870
  // tris / 105-106 calls, kit 84 132-92 716 / 31; the camera sees fewer trees than the opening because
  // it looks at the terrace. The cap leaves ~4 % headroom for an async load outlier.
  m1_caral_camp: { sceneTriangles: 440_000, sceneDrawCalls: 120, kitTriangles: 110_000, kitDrawCalls: 40 },
  // Chavín opening: the phased kit, highland vegetation and the base. Measure first, then ratchet down.
  m2_chavin: { sceneTriangles: 450_000, sceneDrawCalls: 220, kitTriangles: 100_000, kitDrawCalls: 40 },
  m2_chavin_late: { sceneTriangles: 600_000, sceneDrawCalls: 310, kitTriangles: 100_000, kitDrawCalls: 40 },
  // Tambotoco opening: the ayllu site, eight nameplates and the hero rings/banners/tunic accents.
  // 2026-11-16 art pass: 479,416/264 on the Intel RPL-S (hardware high) and 436,666/265 in software.
  // The site now merges per surface family (not one mesh for the whole 256 m phase), the blob shadows
  // are one instanced draw, and the ground cover/water grid were trimmed; the opening drops from
  // 625,811/313 (hardware, before this pass) with 4% headroom on both counters.
  // E3a adds the andes vegetation kit: 9,352/9 opening and 34,306/12 late; the scene caps stay unchanged.
  m_tambotoco: { sceneTriangles: 500_000, sceneDrawCalls: 280, kitTriangles: 15_000, kitDrawCalls: 10 },
  // The founded Inticancha at victory. 2026-11-16: 651,452/352 hardware high and 608,204/346 in
  // software, under the unchanged 660k/360 cap (the old hardware run was 808,827/301: the art pass
  // trades triangles for calls but stays inside both counters).
  m_tambotoco_late: { sceneTriangles: 660_000, sceneDrawCalls: 360, kitTriangles: 42_000, kitDrawCalls: 14 },
  // Lima opening: the hueste with horses and artillery. Software ~645k/624 (627–664k observed, the vegetation
  // kit varies between runs) after the PCF shadow pass and the rig silhouette rule (under the
  // 800k/860 cap, over art-direction §7's 600k/200 target). Hardware high ~874k/627 (974,062/832 with VSM
  // on the same scene): ~100k triangles and 205 calls off.
  m_lima: { sceneTriangles: 800_000, sceneDrawCalls: 860, kitTriangles: 140_000, kitDrawCalls: 25 },
  // Lima in use: the colonial city and the siege crowd. Software 1,121,008/841 after the painted Rímac
  // ground (the 2026-11-16 pass measured 927,198/928); hardware high 1,134,038/931 (1,267,920/1,226 with
  // VSM), over §7's target. The 1.2M cap gives the groves ~6% headroom over both.
  m_lima_late: { sceneTriangles: 1_200_000, sceneDrawCalls: 1_250, kitTriangles: 140_000, kitDrawCalls: 25 },
  // La Junta's opening army is large; a regression cap, still over §7's target. Measured 673,132 / 669
  // with 14,334 / 12 kit after the highland pack.
  m_junta_cusco: { sceneTriangles: 780_000, sceneDrawCalls: 1000, kitTriangles: 20_000, kitDrawCalls: 14 },
  // Moche valley opening on the 256 m transect: the canal, the huacas and the starting column. Measured
  // ~550k / 332; first-pass cap with ~6 % headroom.
  m3_moche_recuay: { sceneTriangles: 590_000, sceneDrawCalls: 372, kitTriangles: 12_000, kitDrawCalls: 4 },
  // Wari highland opening: the basin, the andenes, the complex and the highland kit. Measured
  // 402,889 / 194 with 93,738 / 12 kit; the scene stays under §7's 200-call target.
  m4_wari: { sceneTriangles: 445_000, sceneDrawCalls: 211, kitTriangles: 100_000, kitDrawCalls: 14 },
  // Yahuar Pampa opening: Cusco, the pampa and the Chanca heights. Measured ~682k / 362; over the 600k target.
  m5_yahuar_pampa: { sceneTriangles: 725_000, sceneDrawCalls: 378, kitTriangles: 0, kitDrawCalls: 0 },
  // Chimú north-coast opening: the camp, Paramonga and the canal. Measured ~499k / 273; first-pass cap.
  m6_chimu_inca: { sceneTriangles: 530_000, sceneDrawCalls: 290, kitTriangles: 15_000, kitDrawCalls: 3 },
  // Inca civil war opening: the Quito camp and Quipaipan. Measured 689,709 / 418; over the 600k target.
  m6b_guerra_civil: { sceneTriangles: 745_000, sceneDrawCalls: 465, kitTriangles: 0, kitDrawCalls: 0 },
  // Independence opening: the Lima camp and Junín. Measured 567,865 / 603 after the PCF shadow pass and the
  // rig silhouette rule (674,476 / 823 with VSM); under both caps, over the 200-call target.
  m8_independencia: { sceneTriangles: 625_000, sceneDrawCalls: 660, kitTriangles: 0, kitDrawCalls: 0 },
  // Cusco 1536 opening: its own basin/Sacsayhuamán field, the city, the camp and the highland kit.
  // Measured 760,532 / 604 with 87,542 / 12 kit.
  m_cusco_1536: { sceneTriangles: 800_000, sceneDrawCalls: 1_000, kitTriangles: 100_000, kitDrawCalls: 14 },
  // Breña opening: the Mantaro valley, the communities and the highland kit. The mission heightfield
  // reshapes the scatter into 14 species objects (one carries two materials): measured 676k-682k / 598
  // with 44k-50k / 15 kit.
  m_brena: { sceneTriangles: 740_000, sceneDrawCalls: 900, kitTriangles: 100_000, kitDrawCalls: 16 },
  // Phase 1 mission-scoped heightfields: each reused site now has its own relief, so its opening is measured
  // on its own field instead of inheriting the base site's cap. The kit caps keep the same generous headroom
  // as the other missions, because the visible instance count varies a few percent between runs.
  // Lima 1821 opening on the Rímac oasis field: the irrigated plain carries the same grove density as
  // m_lima. Measured 784k-882k / 710 with 63k-160k / 18 kit (the kit count follows the grove LOD mix).
  m_lima_1821: { sceneTriangles: 950_000, sceneDrawCalls: 780, kitTriangles: 190_000, kitDrawCalls: 20 },
  // Miraflores 1881: the city and the defence line over the same oasis plain. Measured 727k-819k / 546
  // with 88k-178k / 18 kit.
  m_miraflores: { sceneTriangles: 890_000, sceneDrawCalls: 610, kitTriangles: 210_000, kitDrawCalls: 20 },
  // Callao 1824 on the bay field: the Real Felipe and the royalist garrison. Measured 725,170-728,950 / 679-683
  // with 37,680-39,972 / 18.
  m_real_felipe: { sceneTriangles: 790_000, sceneDrawCalls: 750, kitTriangles: 60_000, kitDrawCalls: 20 },
  // Tarapacá 1879 in the inland quebrada: measured 569,480-569,816 / 502-505 with 2,160 / 2 kit.
  m_tarapaca: { sceneTriangles: 620_000, sceneDrawCalls: 550, kitTriangles: 10_000, kitDrawCalls: 4 },
  // Vilcabamba 1572 in the cloud-forest valley (amazon region, no GLB tree kit). The wet Urubamba and
  // the visual-only canopy bands cost structure but no new asset: measured 680,044 / 499 with 644 trees
  // (244 gatherable + 400 decorative). The cap is raised for the selva pilot only (roadmap §10).
  m_vilcabamba: { sceneTriangles: 700_000, sceneDrawCalls: 540, kitTriangles: 5_000, kitDrawCalls: 2 },
  // Túpac Amaru opening on the 256 m valley: the camp, the chapel, the starting column and the highland
  // kit. Measured 521,318/491 before the late-era site/kit rebuild (621e3fae) and 573,562-575,966/455-458
  // after it (18,644/12 kit); 595k gives 3.3% headroom and stays under §7's 600k target. The call count is
  // over §7's 200 target.
  m7_tupac_amaru: { sceneTriangles: 595_000, sceneDrawCalls: 710, kitTriangles: 30_000, kitDrawCalls: 14 },
  // The huacas plaza under Recuay pressure: measured ~721k / 568; still over art-direction §7's 600k target.
  m3_moche_recuay_late: { sceneTriangles: 770_000, sceneDrawCalls: 600, kitTriangles: 12_000, kitDrawCalls: 4 },
  // The Wari frontier with its line and Tiahuanaco influence: measured 510,340 / 337 with 93,798 / 6 kit.
  m4_wari_late: { sceneTriangles: 525_000, sceneDrawCalls: 365, kitTriangles: 100_000, kitDrawCalls: 10 },
  // The Inca counterattack on the Chanca heights: measured ~761k / 521; over the 600k target.
  m5_yahuar_pampa_late: { sceneTriangles: 810_000, sceneDrawCalls: 548, kitTriangles: 0, kitDrawCalls: 0 },
  // The surrender of Chan Chan: measured ~765k / 516; over the 600k target.
  m6_chimu_inca_late: { sceneTriangles: 815_000, sceneDrawCalls: 550, kitTriangles: 15_000, kitDrawCalls: 3 },
  // The battle of Quipaipan: measured ~967k / 673 before the mission-scoped arroyo and field. The late scene
  // includes the 0.5 s opening garrison (`t_guarnicion`); the probe disables the intro guard so the settle
  // updates advance the mission and it is always present. Idle runs measure 1,011,049 / 722 (five runs);
  // under load the row stays at 724-726, so the 740 draw cap keeps ~2% headroom. The 1,025k triangle cap
  // covers 1,011k. Over 600k.
  m6b_guerra_civil_late: { sceneTriangles: 1_025_000, sceneDrawCalls: 740, kitTriangles: 0, kitDrawCalls: 0 },
  // Ayacucho: measured ~867k / 1246; over the 600k/200 targets.
  m8_independencia_late: { sceneTriangles: 920_000, sceneDrawCalls: 1_325, kitTriangles: 0, kitDrawCalls: 0 },
  // The siege/retreat crowd at Cusco: measured 838,094 / 746 with 24,050 / 12 kit; over §7's 600k target.
  m7_tupac_amaru_late: { sceneTriangles: 860_000, sceneDrawCalls: 1_140, kitTriangles: 30_000, kitDrawCalls: 14 },
  // Arica opening on the 256 m terrace: the fort, the cuartel and the garrison. Measured ~535k / 600;
  // first-pass cap with ~6 % headroom (the call count is over art-direction §7's 200 target, as Lima and the Junta).
  m9_guerra_pacifico: { sceneTriangles: 570_000, sceneDrawCalls: 640, kitTriangles: 20_000, kitDrawCalls: 5 },
  // The assault crowd at the battery: measured ~813k / 782; the fall is the heaviest view.
  m9_guerra_pacifico_late: {
    sceneTriangles: 860_000,
    sceneDrawCalls: 1_160,
    kitTriangles: 20_000,
    kitDrawCalls: 5,
  },
};
const KIT_NAMES = /^(trees_kit_|props_kit_|fauna_(deer|riparian_bird)_(body|leg|wingL|wingR)$)/;
const HIGHLAND_KIT_MISSIONS = new Set([
  'm2_chavin',
  'm4_wari',
  'm7_tupac_amaru',
  'm_junta_cusco',
  'm_cusco_1536',
  'm_brena',
]);

const { base, close } = await withViteServer();
const browser = await launchChromium();
let failed = false;
try {
  const page = await (await browser.newContext({ viewport: { width: viewWidth, height: viewHeight } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/?mission=${mission}&intro=0&fog=0&seed=777`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    (id) => {
      const g = window.game;
      if (!g?.mission) return false;
      if (id === 'm2_chavin') return (g.scene.getObjectByName?.('chavin_city_lod0')?.children.length ?? 0) > 0;
      if (id === 'm_junta_cusco' || id === 'm_lima' || id === 'm7_tupac_amaru') {
        return !!g.landmark?.getObjectByName('colonial_site');
      }
      if (id === 'm3_moche_recuay') {
        return (
          !!g.landmark?.getObjectByName('moche_site') && !!g.trees?.hasKit?.('algarrobo') && !!g.trees.hasKit('sauce')
        );
      }
      if (id === 'm4_wari') {
        if (
          !g.landmark?.getObjectByName('wari_site') ||
          !(g.settlementDressing ?? []).every((d) => d.attached !== false)
        ) {
          return false;
        }
      }
      if (id === 'm5_yahuar_pampa') {
        // The pampa keeps primitive broad/needle trees, not a GLB kit: wait for the site and dressing.
        if (
          !g.landmark?.getObjectByName('chanca_site') ||
          !(g.settlementDressing ?? []).every((d) => d.attached !== false)
        ) {
          return false;
        }
      }
      if (id === 'm6_chimu_inca' && !g.landmark?.getObjectByName('chimu_site')) return false;
      if (id === 'm6b_guerra_civil') {
        // The pampa keeps primitive broad/needle trees, not a GLB kit: wait for the site and dressing.
        if (
          !g.landmark?.getObjectByName('cusco_inca_site') ||
          !(g.settlementDressing ?? []).every((d) => d.attached !== false)
        ) {
          return false;
        }
      }
      if (id === 'm8_independencia') {
        if (
          !g.landmark?.getObjectByName('independence_site') ||
          !(g.settlementDressing ?? []).every((d) => d.attached !== false)
        ) {
          return false;
        }
      }
      if (id === 'm_cusco_1536' || id === 'm_brena') {
        if (
          !g.landmark?.getObjectByName(id === 'm_cusco_1536' ? 'cusco_inca_site' : 'independence_site') ||
          !(g.settlementDressing ?? []).every((d) => d.attached !== false)
        ) {
          return false;
        }
      }
      if (id === 'm_tambotoco') return !!g.landmark?.getObjectByName('ayllu_site')?.userData.heroesReady;
      if (id === 'm9_guerra_pacifico' && !g.landmark?.getObjectByName('arica_site')) return false;
      // Wait for every kit family the mission's vegetation pack draws: a half-loaded batch measured a
      // different scene. Packs without kits (amazon, inland skirmish) only wait for the settlement dressing.
      const pack = g.vegetationPack;
      const required = pack === 'caral' ? ['algarrobo', 'sauce'] : pack === 'andes' ? ['molle', 'pacay', 'sauce'] : [];
      for (const variant of required) if (!g.trees?.hasKit?.(variant)) return false;
      for (const species of ['deer', 'riparian_bird']) {
        if (g.wildlife?.species?.().has(species) && !g.wildlife.hasKit(species)) return false;
      }
      if (g.mapProfile?.quarryStyle && !g.quarries?.model) return false;
      if (g.mapProfile?.berryShrub === 'pacae' && !g.pacae?.model) return false;
      return (g.settlementDressing ?? []).every((d) => d.attached !== false);
    },
    mission,
    { timeout: 90_000 },
  );
  if (mission === 'm_tambotoco' || HIGHLAND_KIT_MISSIONS.has(mission)) await waitForHighlandKits(page);
  await page
    .locator('.ed-primary', { hasText: 'COMENZAR' })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  // The Act III camp and its crew load after the site exists; a half-armed crew measured a different
  // scene (the camp stage is the one that has to count it).
  if (mission === 'm1_caral') {
    await page.waitForFunction(
      () =>
        (window.game?.siteCrew?.count ?? 0) > 0 &&
        !!window.game?.landmark?.getObjectByName('caral_city_lod0') &&
        !!window.game?.landmark?.getObjectByName('caral_city_lod1'),
      null,
      { timeout: 30_000 },
    );
  }
  await page.waitForTimeout(2000);
  const result = await page.evaluate(
    ({ kitPattern, stage, mission, quality }) => {
      const g = window.game;
      const kit = new RegExp(kitPattern);
      // Pin the requested preset (same call as bench.mjs: it does not persist the choice) and freeze the
      // governor, which would otherwise downgrade before the sample starts. The preset applies the
      // pack's own LOD0 radius through Game.kitLod0RadiusFor.
      g.qualityGovernor.setUserQuality(quality);
      g.qualityGovernor.update = () => {};
      let p = g.playerCenter(0);
      // The Quipaipan late scene includes the opening garrison (`t_guarnicion`, 0.5 s). The clock is held
      // by the opening flight or the mission card (`camera.isOpeningFlight() || hud.isMissionCardOpen()`),
      // so without this the 100 settle updates below never fire it and the scene measures 177 meshes
      // short (issue 601).
      if (stage === 'late' && mission === 'm6b_guerra_civil') g.isCinematicActive = () => false;
      if (stage === 'camp') {
        g.setSitePhase('foundation');
        const site = g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 });
        p = { x: site.x - 10, z: site.z + 30 };
      }
      if (stage === 'late') {
        if (g.sitePhasePlan) {
          g.setSitePhase(
            mission === 'm2_chavin'
              ? 'apogee'
              : mission === 'm_tambotoco'
                ? 'fundada'
                : mission === 'm_lima'
                  ? 'ciudad'
                  : 'in_use',
          );
        }
        // Tambotoco's `site` ref is Huanacaure; Act IV lives at Inticancha. Frame the four canchas
        // themselves, or the "late" view measures the shrine meadow and the settlement sits off-camera.
        const canchas =
          mission === 'm_tambotoco'
            ? [
                [156, 190],
                [180, 190],
                [168, 178],
                [168, 202],
              ]
            : null;
        const site =
          canchas === null
            ? g.resolveMissionPoint({ ref: 'site', dx: 0, dz: 0 })
            : {
                x: canchas.reduce((sum, [x]) => sum + x, 0) / canchas.length,
                z: canchas.reduce((sum, [, z]) => sum + z, 0) / canchas.length,
              };
        if (mission === 'm8_independencia') {
          // Act III: Ayacucho.
          for (let i = 0; i < 14; i++) {
            const kind = i % 5 === 0 ? 'patriota_montonera' : 'rifleman';
            g.spawnScriptedUnit(kind, 0, site.x - 15 + (i % 5) * 5, site.z + 10 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 12; i++) {
            const kind = i % 4 === 0 ? 'realista_dragon' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 4) * 5, site.z - 10 + Math.floor(i / 4) * 4);
          }
        } else if (mission === 'm6b_guerra_civil') {
          // Act II: the battle of Quipaipan. `musketeer` is the legacy ranged id (hondero), not a firearm.
          for (let i = 0; i < 14; i++) {
            const kind = i % 5 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 15 + (i % 5) * 5, site.z + 10 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 12; i++) {
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 4) * 5, site.z - 10 + Math.floor(i / 4) * 4);
          }
        } else if (mission === 'm6_chimu_inca') {
          // Act III: the surrender of Chan Chan. `musketeer` is the legacy ranged id (hondero), not a firearm.
          for (let i = 0; i < 14; i++) {
            const kind = i % 4 === 0 ? 'rifleman' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 16 + (i % 5) * 5, site.z + 10 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 12; i++) {
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 4) * 5, site.z - 10 + Math.floor(i / 4) * 4);
          }
        } else if (mission === 'm5_yahuar_pampa') {
          // Act II: the Inca counterattack on the Chanca heights. `musketeer` is the legacy ranged id
          // (hondero in this era), not a firearm.
          for (let i = 0; i < 14; i++) {
            const kind = i % 4 === 0 ? 'rifleman' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 15 + (i % 5) * 5, site.z + 10 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 12; i++) {
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 4) * 5, site.z - 10 + Math.floor(i / 4) * 4);
          }
        } else if (mission === 'm4_wari') {
          // Act III: the frontier node with Wari workers/guardians and Tiahuanaco influence.
          for (let i = 0; i < 12; i++) {
            const kind = i % 5 === 0 ? 'wari_guardian' : i % 4 === 0 ? 'worker' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 14 + (i % 4) * 5, site.z + 10 + Math.floor(i / 4) * 4);
          }
          for (let i = 0; i < 10; i++) {
            // `musketeer` is the legacy ranged id: Tiahuanaco fields honderos, not firearms.
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 5) * 5, site.z - 10 + Math.floor(i / 5) * 4);
          }
        } else if (mission === 'm3_moche_recuay') {
          // Act II: the huacas plaza under Recuay pressure.
          for (let i = 0; i < 14; i++) {
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 14 + (i % 5) * 5, site.z + 9 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 12; i++) {
            const kind = i % 4 === 0 ? 'musketeer' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 9 + (i % 4) * 5, site.z - 10 + Math.floor(i / 4) * 4);
          }
        } else if (mission === 'm7_tupac_amaru') {
          // The Act III siege/retreat: rebels on the slopes and the royalists at Cusco.
          for (let i = 0; i < 14; i++) {
            const kind = i % 4 === 0 ? 'rifleman' : 'soldier';
            g.spawnScriptedUnit(kind, 0, site.x - 16 + (i % 5) * 5, site.z + 10 + Math.floor(i / 5) * 4);
          }
          for (let i = 0; i < 14; i++) {
            const kind = i % 5 === 0 ? 'realista_dragon' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 10 + (i % 5) * 5, site.z - 8 + Math.floor(i / 5) * 4);
          }
        } else if (mission === 'm9_guerra_pacifico') {
          // The documented Act III assault at the battery: the garrison and the Chilean infantry.
          for (let i = 0; i < 12; i++) {
            const kind = i % 3 === 0 ? 'republica_defensor' : 'rifleman';
            g.spawnScriptedUnit(kind, 0, site.x - 14 + (i % 4) * 5, site.z + 10 + Math.floor(i / 4) * 4);
          }
          for (let i = 0; i < 16; i++) {
            const kind = i % 4 === 0 ? 'chile_infante' : 'soldier';
            g.spawnScriptedUnit(kind, 1, site.x + 8 + (i % 4) * 5, site.z + 6 + Math.floor(i / 4) * 4);
          }
        } else if (mission !== 'm_tambotoco') {
          const crowd = mission === 'm2_chavin' ? 20 : 30;
          for (let i = 0; i < crowd; i++) {
            g.spawnScriptedUnit('worker', 0, site.x - 12 + (i % 6) * 4, site.z + 18 + Math.floor(i / 6) * 3);
          }
        }
        if (canchas) {
          // Measure the Act IV settlement, not an empty meadow: the store and the four canchas.
          g.spawnScriptedBuilding('mill', 0, site.x, site.z);
          for (const [x, z] of canchas) g.spawnScriptedBuilding('house', 0, x, z);
        }
        let t = 1;
        for (let i = 0; i < 60; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        if (mission === 'm1_caral') g.startEnvironmentalEvent('drought', true);
        g.camera.moveTo(site.x, site.z + 20, true);
        for (let i = 0; i < 40; i++) {
          g.update(0.05, t);
          t += 0.05;
        }
        p = { x: site.x, z: site.z + 20 };
      }
      g.camera.moveTo(p.x, p.z, true);
      g.camera.setHeight(54);
      // Pin every LOD manager to the measured framing, like the trees: their per-frame update depends
      // on where the camera happened to be when the loop last ran.
      const focus = g.camera.getTarget();
      g.trees.update(0, focus);
      g.quarries?.update(focus);
      g.pacae?.update(focus);
      g.siteCrew?.update(0, focus);
      for (const d of g.settlementDressing ?? []) d.update(focus);
      for (let i = 0; i < 120; i++) g.camera.update(1 / 30, i / 30);
      g.camera.camera.updateMatrixWorld();
      g.terrain.updateLod(g.camera.camera.position, true);
      // Refit the sun's shadow frustum to this view, as the frame loop does.
      g.runtime.frameShadows();
      g.sky.update(0);
      const measure = () => {
        const info = g.renderer.info;
        // Per sample: the shadow pass must be in both the full and the kit-hidden numbers, so the
        // difference isolates the kit instead of dropping the whole shadow pass.
        g.runtime.frameShadows();
        info.autoReset = false;
        info.reset();
        g.renderer.render(g.scene, g.camera.camera);
        const out = { calls: info.render.calls, triangles: info.render.triangles };
        out.camera = g.camera.camera.position.toArray().map((v) => Math.round(v));
        info.autoReset = true;
        return out;
      };
      const scene = measure();
      const kitObjects = [];
      g.scene.traverse((o) => {
        if (kit.test(o.name) && o.visible) kitObjects.push(o);
      });
      kitObjects.forEach((o) => (o.visible = false));
      const withoutKit = measure();
      kitObjects.forEach((o) => (o.visible = true));
      return {
        scene,
        kit: { calls: scene.calls - withoutKit.calls, triangles: scene.triangles - withoutKit.triangles },
        kitObjects: kitObjects.length,
      };
    },
    { kitPattern: KIT_NAMES.source, stage, mission, quality },
  );
  const sceneStats = await readSceneStats(page);
  const frame = frames
    ? await page.evaluate(
        async ({ ms, direct, noRefraction }) => {
          const g = window.game;
          window.__directRender = direct;
          if (noRefraction) window.__noWaterRefraction = true;
          g.loop.stop();
          g.loop.start();
          const longTasks = [];
          try {
            const po = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) longTasks.push(entry.duration);
            });
            po.observe({ type: 'longtask' });
          } catch {
            /* longtask unsupported */
          }
          const times = [];
          await new Promise((done) => {
            let last = performance.now();
            const end = last + ms;
            let first = true;
            const step = () => {
              const now = performance.now();
              if (!first) times.push(now - last);
              first = false;
              last = now;
              if (now >= end) done();
              else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
          times.sort((a, b) => a - b);
          const at = (p) => times[Math.min(times.length - 1, Math.floor(times.length * p))];
          const p50 = at(0.5);
          const loopFps = g.loop.getFps();
          // `renderer.info` after a post-processed frame describes only the last quad, so count the whole
          // frame on its own (same trap bench.mjs documents).
          g.loop.stop();
          g.runtime.frameShadows();
          const info = g.renderer.info;
          info.autoReset = false;
          info.reset();
          g.runtime.render();
          const drawCalls = info.render.calls;
          const triangles = info.render.triangles;
          info.autoReset = true;
          info.reset();
          return {
            samples: times.length,
            loopFps,
            fpsP50: 1000 / p50,
            frameMsAvg: times.reduce((s, x) => s + x, 0) / times.length,
            frameMsP50: p50,
            frameMsP95: at(0.95),
            frameMsP99: at(0.99),
            framesAt60Hz: p50 / (1000 / 60),
            quality: g.runtime.getAppliedQuality(),
            cinematic: g.postfx.cinematicEnabled,
            direct,
            refraction: !direct && g.shouldRenderWaterRefraction(),
            pixelRatio: g.renderer.getPixelRatio(),
            drawCalls,
            triangles,
            camera: g.camera.camera.position.toArray().map((v) => Math.round(v)),
            longTasks: longTasks.length,
            longTaskMs: longTasks.reduce((s, x) => s + x, 0),
          };
        },
        { ms: 2000, direct, noRefraction },
      )
    : null;

  const budget =
    stage === 'late' ? BUDGETS[`${mission}_late`] : stage === 'camp' ? BUDGETS[`${mission}_camp`] : BUDGETS[mission];
  const gl = await readGlRenderer(page);
  const gpuInfo = { ...gl, software: isSoftwareRenderer(`${gl.renderer} ${gl.vendor}`) };
  const report = {
    mission,
    stage,
    quality,
    viewport: { width: viewWidth, height: viewHeight },
    ...result,
    sceneStats,
    frame,
    budget,
    gpu: gpuInfo,
    loadavg: os.loadavg().map((v) => Math.round(v * 100) / 100),
    errors,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n');
  console.log(
    `${mission}: scene ${result.scene.triangles} tris / ${result.scene.calls} calls; ` +
      `vegetation+fauna kit ${result.kit.triangles} tris / ${result.kit.calls} calls (${result.kitObjects} objects)`,
  );
  console.log(
    `scene objects: ${sceneStats.meshes} meshes (${sceneStats.instancedMeshes} instanced), ` +
      `${sceneStats.uniqueGeometries} geometries, ${sceneStats.uniqueMaterials} materials`,
  );
  console.log(`renderer: ${gpuInfo.renderer} (${gpuInfo.software ? 'software' : 'hardware'})`);
  if (frame) {
    console.log(
      `frame: p50/p95/p99 ${frame.frameMsP50.toFixed(1)}/${frame.frameMsP95.toFixed(1)}/${frame.frameMsP99.toFixed(1)} ms ` +
        `(fps ${frame.fpsP50.toFixed(0)} from p50, loop counter ${frame.loopFps}, ${frame.framesAt60Hz.toFixed(1)} frames at 60 Hz, ` +
        `quality=${frame.quality}, cinematic=${frame.cinematic}, refraction=${frame.refraction}, ` +
        `pixelRatio=${frame.pixelRatio}, long tasks ${frame.longTasks}/${frame.longTaskMs.toFixed(0)} ms)`,
    );
  }
  if (useGpu() && gpuInfo.software) {
    console.error(
      `--gpu was requested but the page rendered in software (${gpuInfo.renderer}). Try --gl=egl, --gl=angle-vulkan or run with a display.`,
    );
    failed = true;
  }
  if (assert) {
    const problems = [];
    if (!budget) problems.push(`no budget for ${mission}`);
    else {
      if (result.scene.triangles > budget.sceneTriangles)
        problems.push(`scene triangles ${result.scene.triangles} > ${budget.sceneTriangles}`);
      if (result.scene.calls > budget.sceneDrawCalls)
        problems.push(`scene draw calls ${result.scene.calls} > ${budget.sceneDrawCalls}`);
      if (result.kit.triangles > budget.kitTriangles)
        problems.push(`kit triangles ${result.kit.triangles} > ${budget.kitTriangles}`);
      if (result.kit.calls > budget.kitDrawCalls)
        problems.push(`kit draw calls ${result.kit.calls} > ${budget.kitDrawCalls}`);
      if (result.kitObjects === 0) problems.push('vegetation kit not drawn');
    }
    if (errors.length) problems.push(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    if (problems.length) {
      console.error(`scene budget failed: ${problems.join('; ')}`);
      failed = true;
    }
  }
} finally {
  await browser.close();
  await close();
}
if (failed) process.exit(1);
