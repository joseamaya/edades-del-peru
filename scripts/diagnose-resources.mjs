import fs from 'fs';
import path from 'path';
import { launchChromium, withViteServer, cliArg, reviewDir } from './lib.mjs';

/**
 * Read-only diagnosis of start-resource reachability.
 *
 * Usage: node scripts/diagnose-resources.mjs [--seeds=777,783,786] [--radius=16]
 *
 * For each base it reports the nearby resource nodes, whether they sit on water,
 * how many walkable stand cells exist within harvest range, and how many of those
 * are actually reachable from the base. It also lists workers whose GATHER target
 * is outside harvest range while they hold an active path. This is the evidence
 * used to justify the P0 economy/pathfinding fix.
 */

const seeds = String(cliArg('seeds', '777,783,786'))
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n));
const START_RADIUS = Number.parseFloat(cliArg('radius', '16'));
const HARVEST_RANGE = 2.8;
const STAND_RANGE = 2.2;

async function diagnose(browser, base, seed) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const errors = [];
  const consoleMessages = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error' || msg.type() === 'info') consoleMessages.push(msg.text());
  });
  await page.goto(`${base}/?play=1&seed=${seed}&low=1&fog=0&noloop=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.game !== undefined, null, { timeout: 60_000 });

  const out = await page.evaluate(
    ({ startRadius, harvestRange, standRange }) => {
      const g = window.game;
      g.loop.stop();
      g.paused = false;
      const cell = g.pathfinder.grid.cell;
      const bases = [];
      const walkable = (cx, cz) =>
        cx >= 0 && cz >= 0 && cx < g.pathfinder.grid.cols && cz < g.pathfinder.grid.cols
          ? g.pathfinder.grid.walkable[cz * g.pathfinder.grid.cols + cx] === 1
          : false;
      const componentFrom = (cx, cz) => {
        const cols = g.pathfinder.grid.cols;
        const comp = new Int32Array(cols * cols);
        const start = cz * cols + cx;
        if (!walkable(cx, cz)) return { size: 0, comp };
        const stack = [start];
        comp[start] = 1;
        let size = 0;
        while (stack.length) {
          const cur = stack.pop();
          size++;
          const x = cur % cols;
          const z = (cur - x) / cols;
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dz) continue;
              const nx = x + dx;
              const nz = z + dz;
              if (!walkable(nx, nz)) continue;
              if (dx && dz && (!walkable(x + dx, z) || !walkable(x, z + dz))) continue;
              const ni = nz * cols + nx;
              if (comp[ni]) continue;
              comp[ni] = 1;
              stack.push(ni);
            }
          }
        }
        return { size, comp };
      };
      for (const owner of [0, 1]) {
        const center = [...g.buildings.values()].find((b) => b.owner === owner && b.kind === 'center' && !b.dead);
        if (!center) continue;
        const nodes = [...g.resourceNodes.values()].filter(
          (n) => !n.dead && Math.hypot(n.pos.x - center.pos.x, n.pos.z - center.pos.z) <= startRadius,
        );
        const baseCx = Math.floor(center.pos.x / cell);
        const baseCz = Math.floor(center.pos.z / cell);
        let startCx = baseCx;
        let startCz = baseCz;
        outer: for (let r = 0; r <= 12; r++) {
          for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
              if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
              if (walkable(baseCx + dx, baseCz + dz)) {
                startCx = baseCx + dx;
                startCz = baseCz + dz;
                break outer;
              }
            }
          }
        }
        const component = componentFrom(startCx, startCz);
        const mapCx = Math.floor(g.settings.mapSize / 2 / cell);
        const mapCz = mapCx;
        const mapInComponent = component.comp[mapCz * g.pathfinder.grid.cols + mapCx] === 1;
        const asciiRows = [];
        for (let dz = -12; dz <= 12; dz++) {
          let line = '';
          for (let dx = -12; dx <= 12; dx++) {
            const cx = baseCx + dx;
            const cz = baseCz + dz;
            if (dx === 0 && dz === 0) line += 'C';
            else if (!walkable(cx, cz)) line += '#';
            else if (component.comp[cz * g.pathfinder.grid.cols + cx] === 1) line += '.';
            else line += ' ';
          }
          asciiRows.push(line);
        }
        const rows = [];
        for (const node of nodes) {
          const cx = Math.floor(node.pos.x / cell);
          const cz = Math.floor(node.pos.z / cell);
          let walkableCells = 0;
          let standCells = 0;
          let reachableStands = 0;
          let bestStandDist = Infinity;
          for (let dz = -2; dz <= 2; dz++) {
            for (let dx = -2; dx <= 2; dx++) {
              const gx = cx + dx;
              const gz = cz + dz;
              if (gx < 0 || gz < 0 || gx >= g.pathfinder.grid.cols || gz >= g.pathfinder.grid.cols) continue;
              if (!g.pathfinder.isWalkable(gx * cell + cell / 2, gz * cell + cell / 2)) continue;
              walkableCells++;
              const sx = gx * cell + cell / 2;
              const sz = gz * cell + cell / 2;
              const d = Math.hypot(sx - node.pos.x, sz - node.pos.z);
              if (d > standRange) continue;
              standCells++;
              bestStandDist = Math.min(bestStandDist, d);
              const path = g.pathfinder.pathfind(center.pos.x, center.pos.z, sx, sz);
              if (path.length > 0) reachableStands++;
            }
          }
          const direct = g.pathfinder.pathfind(center.pos.x, center.pos.z, node.pos.x, node.pos.z);
          const last = direct.length ? direct[direct.length - 1] : null;
          const approach = g.pathfinder.findApproachPath(
            center.pos.x,
            center.pos.z,
            node.pos.x,
            node.pos.z,
            standRange,
          );
          const approachLast = approach.length ? approach[approach.length - 1] : null;
          rows.push({
            kind: node.kind,
            resource: node.resource,
            x: Number(node.pos.x.toFixed(1)),
            z: Number(node.pos.z.toFixed(1)),
            amount: Math.round(node.amount),
            distFromBase: Number(Math.hypot(node.pos.x - center.pos.x, node.pos.z - center.pos.z).toFixed(1)),
            onWater: g.terrain.isWater(node.pos.x, node.pos.z),
            onBeach: g.terrain.isBeach(node.pos.x, node.pos.z),
            walkableCells,
            standCells,
            reachableStands,
            bestStandDist: Number.isFinite(bestStandDist) ? Number(bestStandDist.toFixed(2)) : null,
            pathToNodeLen: direct.length,
            lastWaypointDist:
              last == null ? null : Number(Math.hypot(last.x - node.pos.x, last.z - node.pos.z).toFixed(2)),
            harvestable: approach.length > 0 || reachableStands > 0,
            approachLen: approach.length,
            approachLastDist:
              approachLast == null
                ? null
                : Number(Math.hypot(approachLast.x - node.pos.x, approachLast.z - node.pos.z).toFixed(2)),
          });
        }
        bases.push({
          owner,
          center: { x: Number(center.pos.x.toFixed(1)), z: Number(center.pos.z.toFixed(1)) },
          startCell: { x: startCx, z: startCz },
          componentSize: component.size,
          mapCenterInComponent: mapInComponent,
          ascii: asciiRows,
          resources: rows,
          summary: {
            food: rows.filter((r) => r.resource === 'food'),
            wood: rows.filter((r) => r.resource === 'wood'),
            silver: rows.filter((r) => r.resource === 'silver'),
            stone: rows.filter((r) => r.resource === 'stone'),
            reachableFood: rows.filter((r) => r.resource === 'food' && r.harvestable).length,
            reachableWood: rows.filter((r) => r.resource === 'wood' && r.harvestable).length,
            triedFood: rows.filter((r) => r.resource === 'food').length,
            triedWood: rows.filter((r) => r.resource === 'wood').length,
          },
        });
      }

      const workers = [];
      for (const u of g.units.values()) {
        if (u.dead || u.kind !== 'worker') continue;
        const order = u.orderQueue[0];
        if (!order || order.kind !== 'gather') continue;
        const node = g.resourceNodes.get(order.entityId);
        if (!node) continue;
        const dist = Math.hypot(node.pos.x - u.pos.x, node.pos.z - u.pos.z);
        workers.push({
          owner: u.owner,
          nodeId: node.id,
          kind: node.kind,
          dist: Number(dist.toFixed(2)),
          outOfRange: dist > harvestRange,
          pathLen: u.path ? u.path.length : 0,
        });
      }

      return { seed: g.settings.mapSeed, cell, bases, workers, errors: [] };
    },
    { startRadius: START_RADIUS, harvestRange: HARVEST_RANGE, standRange: STAND_RANGE },
  );

  await context.close();
  return { ...out, pageErrors: errors, consoleMessages };
}

async function main() {
  const { base, close } = await withViteServer();
  const browser = await launchChromium();
  const rows = [];
  try {
    for (const seed of seeds) {
      process.stdout.write(`diagnose: seed ${seed}... `);
      const row = await diagnose(browser, base, seed);
      rows.push(row);
      const summaries = row.bases
        .map(
          (b) =>
            `P${b.owner} food ${b.summary.reachableFood}/${b.summary.triedFood}, wood ${b.summary.reachableWood}/${b.summary.triedWood}`,
        )
        .join(' | ');
      console.log(summaries);
    }
  } finally {
    await browser.close();
    await close();
  }

  const dir = reviewDir();
  const outPath = path.join(dir, `diagnose-resources-${seeds.join('-')}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ rows, date: new Date().toISOString() }, null, 2));

  for (const row of rows) {
    console.log(`\n=== seed ${row.seed} ===`);
    for (const b of row.bases) {
      console.log(
        `P${b.owner} base (${b.center.x}, ${b.center.z}) startCell=${b.startCell.x},${b.startCell.z} ` +
          `component=${b.componentSize} mapCenter=${b.mapCenterInComponent}`,
      );
      for (const line of b.ascii) console.log(`    ${line}`);
      for (const r of b.resources) {
        console.log(
          `  ${r.resource.padEnd(6)} ${r.kind.padEnd(6)} @(${r.x},${r.z}) d=${r.distFromBase} ` +
            `water=${r.onWater} stands=${r.reachableStands}/${r.standCells} best=${r.bestStandDist} ` +
            `path=${r.pathToNodeLen} last=${r.lastWaypointDist} approach=${r.approachLen} ` +
            `alast=${r.approachLastDist} harvestable=${r.harvestable}`,
        );
      }
    }
    if (row.workers.length) {
      console.log(`  workers with GATHER: ${row.workers.length}`);
      for (const w of row.workers.slice(0, 20)) {
        console.log(`    P${w.owner} ${w.kind} d=${w.dist} outOfRange=${w.outOfRange} pathLen=${w.pathLen}`);
      }
    }
    if (row.pageErrors.length) console.log(`  page errors: ${row.pageErrors.join(' | ')}`);
    if (row.consoleMessages.length) {
      console.log('  console warnings:');
      for (const message of row.consoleMessages) console.log(`    ${message}`);
    }
  }
  console.log(`\nwrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
