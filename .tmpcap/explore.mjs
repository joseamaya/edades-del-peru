import { launch, bootMission } from './lib.mjs';
const OUT = process.argv[2]; const ids = process.argv.slice(3);
const { browser, page } = await launch(960, 540);
for (const id of ids) {
  try {
    await bootMission(page, id, 3000);
    await page.addStyleTag({ content: '#ui-root,#ed-world-labels{visibility:hidden!important}' });
    const info = await page.evaluate(() => { const g = window.game, m = g.mission.def;
      for (const u of g.units.values()) u.selected = false; g.selectUnits?.([]);
      const site = g.siteCenter ? { x: g.siteCenter.x, z: g.siteCenter.z } : null;
      const p0 = g.playerCenter(0), p1 = g.playerCenter(1);
      return { title: m.title, subtitle: m.subtitle, site, p0, p1, size: g.settings.mapSize };
    });
    console.log(id, JSON.stringify(info));
    const pts = [['site', info.site], ['p0', info.p0]].filter(p => p[1]);
    for (const [name, p] of pts) {
      await page.evaluate(({ p }) => { const H = window.__H; window.__shot = { pos: [p.x + 26, H(p.x, p.z) + 16, p.z + 26], look: [p.x, H(p.x, p.z) + 1, p.z], fov: 46 }; window.__step(20); }, { p });
      await page.screenshot({ path: `${OUT}/${id}_${name}.jpg`, type: 'jpeg', quality: 85 });
    }
  } catch (e) { console.log(id, 'ERR', e.message.split('\n')[0]); }
}
await browser.close();
