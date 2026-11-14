import fs from 'node:fs';
import { launch, bootMission } from './lib.mjs';
const [OUT, MODE] = [process.argv[2], process.argv[3]];
const PREVIEW = MODE === 'preview';
const PLAN = [
  ['m1_caral', 'city', 'p0'], ['m2_chavin', 'city', 'site'], ['m3_moche_recuay', 'city', 'site'], ['m4_wari', 'city', 'site'],
  ['m_tambotoco', 'march', 'p0'], ['m5_yahuar_pampa', 'battle'], ['m6_chimu_inca', 'battle'], ['m6b_guerra_civil', 'battle'],
  ['m_lima', 'city', 'site'], ['m7_tupac_amaru', 'battle'], ['m_junta_cusco', 'battle'], ['m8_independencia', 'battle'], ['m9_guerra_pacifico', 'battle'],
].filter(p => process.argv.length <= 4 || process.argv.slice(4).includes(p[0]));
const FPS = 30, SECS = 2.7;
const { browser, page } = await launch(1920, 1080);
for (const [id, kind, at] of PLAN) {
  await bootMission(page, id, 3000);
  await page.addStyleTag({ content: '#ui-root,#ed-world-labels{visibility:hidden!important}' });
  const info = await page.evaluate(({ kind, at }) => {
    const g = window.game, H = window.__H;
    for (const u of g.units.values()) u.selected = false; g.selectUnits?.([]);
    const site = g.siteCenter ? { x: g.siteCenter.x, z: g.siteCenter.z } : null;
    const p0 = g.playerCenter(0), p1 = g.playerCenter(1);
    if (kind === 'city' || kind === 'march') {
      const c = at === 'site' && site ? site : p0;
      const mine = [...g.units.values()].filter(u => u.owner === 0 && !u.dead);
      mine.forEach((u, i) => u.issueOrder({ kind: 'move', target: { x: c.x + 6 + (i % 5) * 1.6, z: c.z + 14 + Math.floor(i / 5) * 1.6 } }, true));
      window.__step(kind === 'march' ? 60 : 120);
      window.__cam = (u) => { const e = u * u * (3 - 2 * u); const a = 0.75 + 0.35 * e, r = (kind === 'march' ? 30 : 34) - 4 * e;
        const p = [c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r]; p[1] = H(p[0], p[2]) + (kind === 'march' ? 16 : 17) - 2 * e;
        return { pos: p, look: [c.x, H(c.x, c.z) + 2, c.z], fov: 46 }; };
      return { c };
    }
    // battle: the mission's own soldiers on each side, between the player base and the objective
    const tgt = site ?? p1;
    let dx = tgt.x - p0.x, dz = tgt.z - p0.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const mid = { x: p0.x + dx * Math.min(30, L * 0.45), z: p0.z + dz * Math.min(30, L * 0.45) };
    const px = -dz, pz = dx;
    const kindsOf = (owner) => { const m = new Map(); for (const u of g.units.values()) if (u.owner === owner && !u.dead && u.kind !== 'worker' && u.kind !== 'scout') m.set(u.kind, (m.get(u.kind) ?? 0) + 1); return [...m.keys()]; };
    let A = kindsOf(0), B = kindsOf(1); if (!B.length) B = A; if (!A.length) A = B;
    const spawn = (kinds, owner, cx, cz, face, n) => { const ids = []; for (let i = 0; i < n; i++) { const k = kinds[i % kinds.length]; const row = Math.floor(i / 6), col = i % 6;
      const x = cx + px * (col - 2.5) * 2.2 - face * dx * row * 2, z = cz + pz * (col - 2.5) * 2.2 - face * dz * row * 2;
      try { ids.push(g.spawnScriptedUnit(k, owner, x, z)); } catch (e) {} } return ids; };
    const a = spawn(A, 0, mid.x - dx * 9, mid.z - dz * 9, 1, 18);
    const b = spawn(B, 1, mid.x + dx * 9, mid.z + dz * 9, -1, 18);
    for (const u of a) u.issueOrder({ kind: 'attack_move', target: { x: mid.x + dx * 14, z: mid.z + dz * 14 } }, true);
    for (const u of b) u.issueOrder({ kind: 'attack_move', target: { x: mid.x - dx * 14, z: mid.z - dz * 14 } }, true);
    window.__step(90);
    window.__cam = (u) => { const e = u * u * (3 - 2 * u); const side = 20 - 5 * e, along = -8 + 12 * e; const h = H(mid.x, mid.z);
      return { pos: [mid.x + px * side + dx * along, h + 6.5 - 1.2 * e, mid.z + pz * side + dz * along], look: [mid.x + dx * along * 0.3, h + 1.2, mid.z + dz * along * 0.3], fov: 42 }; };
    return { mid, A, B, a: a.length, b: b.length };
  }, { kind, at });
  const dir = `${OUT}/${id}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const n = PREVIEW ? 2 : Math.round(SECS * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate(({ u, steps }) => { window.__shot = window.__cam(u); window.__step(steps); }, { u: n > 1 ? f / (n - 1) : 0, steps: PREVIEW ? 80 : 2 });
    await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  console.log(id, kind, JSON.stringify(info));
}
await browser.close();
