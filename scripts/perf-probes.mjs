/**
 * Browser-side performance probes for the audit harnesses.
 *
 * Design goals:
 * - No game-source changes: every probe wraps an existing method at runtime.
 * - Opt-in and removable: `installProbes` is only called by `bench.mjs` / `sim.mjs`.
 * - Per-step section timing: wrappers accumulate into `__perf.frameTotals` and the
 *   `Game.update` wrapper closes the sample at the end of every fixed step.
 * - Counters are exact (path requests, deliveries, creations, losses); timing
 *   samples are capped so long AI matches stay bounded.
 *
 * The wrappers are deliberately thin: a `performance.now()` pair per call. The
 * benchmarks report the measured overhead of running with probes enabled.
 */

/** Install the probe layer on an already-booted `window.game`. */
export async function installProbes(page, options = {}) {
  await page.evaluate((opts) => {
    const g = window.game;
    if (!g) throw new Error('perf-probes: window.game is not available');
    if (window.__perf && window.__perf.installed) return;

    const P = {
      installed: true,
      enabled: true,
      sampleEvery: Math.max(1, Math.floor(opts.sampleEvery ?? 1)),
      maxSamples: Math.max(100, Math.floor(opts.maxSamples ?? 30000)),
      samples: {},
      renderSamples: [],
      counters: { steps: 0 },
      frameTotals: {},
      first: {},
      gathered: {},
      losses: { units: {}, buildings: {} },
      timeline: [],
      warnings: [],
      time: 0,
      initialBuildings: new Set(),
    };
    window.__perf = P;
    for (const b of g.buildings.values()) P.initialBuildings.add(b.id);

    const protoOf = (value) => (value ? Object.getPrototypeOf(value) : null);
    const push = (label, value, bucket) => {
      const target = bucket ?? P.samples;
      let arr = target[label];
      if (!arr) {
        arr = [];
        target[label] = arr;
      }
      if (arr.length < P.maxSamples) arr.push(value);
    };
    const add = (label, ms) => {
      P.frameTotals[label] = (P.frameTotals[label] ?? 0) + ms;
    };
    const count = (key, by = 1) => {
      P.counters[key] = (P.counters[key] ?? 0) + by;
    };

    const wrap = (obj, name, label) => {
      if (!obj) return false; // optional target (e.g. no projectile exists yet)
      if (typeof obj[name] !== 'function') {
        P.warnings.push('missing probe target: ' + name);
        return false;
      }
      const original = obj[name];
      obj[name] = function (...args) {
        if (!P.enabled) return original.apply(this, args);
        const t0 = performance.now();
        const result = original.apply(this, args);
        add(label, performance.now() - t0);
        return result;
      };
      return true;
    };

    const firstUnit = g.units.values().next().value;
    const firstBuilding = g.buildings.values().next().value;
    const firstNode = g.resourceNodes.values().next().value;
    const firstProjectile = g.projectiles && g.projectiles[0];
    const firstAI = g.ais && g.ais[0];
    const UnitProto = protoOf(firstUnit);
    const BuildingProto = protoOf(firstBuilding);
    const ResourceProto = protoOf(firstNode);
    const ProjectileProto = protoOf(firstProjectile);
    const AICtor = firstAI ? protoOf(firstAI) : null;
    const PathProto = protoOf(g.pathfinder);
    const GameProto = protoOf(g);

    // --- simulation sections ---
    wrap(GameProto, 'rebuildSpatial', 'spatial');
    wrap(GameProto, 'updateFow', 'fow');
    wrap(GameProto, 'applyLod', 'lod');
    wrap(GameProto, 'updatePopulation', 'population');
    wrap(GameProto, 'cleanupDead', 'cleanup');
    wrap(GameProto, 'checkVictory', 'victory');
    wrap(GameProto, 'checkBaseThreat', 'threat');
    wrap(UnitProto, 'update', 'units');
    wrap(BuildingProto, 'update', 'buildings');
    wrap(ResourceProto, 'update', 'resources');
    wrap(ProjectileProto, 'update', 'projectiles');
    wrap(AICtor, 'update', 'ai');

    // --- visuals ---
    wrap(protoOf(g.terrain), 'update', 'terrain');
    wrap(protoOf(g.sky), 'update', 'sky');
    wrap(protoOf(g.water), 'update', 'water');
    wrap(protoOf(g.particles), 'update', 'particles');
    wrap(protoOf(g.debris), 'update', 'debris');
    wrap(protoOf(g.markers), 'update', 'markers');
    wrap(protoOf(g.trees), 'update', 'trees');
    wrap(protoOf(g.wildlife), 'update', 'wildlife');
    wrap(protoOf(g.camera), 'update', 'camera');
    wrap(protoOf(g.hud), 'update', 'hud');

    // --- pathfinding ---
    if (PathProto) {
      const originalPath = PathProto.pathfind;
      if (typeof originalPath === 'function') {
        PathProto.pathfind = function (...args) {
          if (!P.enabled) return originalPath.apply(this, args);
          count('pathRequests');
          const t0 = performance.now();
          const result = originalPath.apply(this, args);
          add('pathfinding', performance.now() - t0);
          count('pathResultCells', result.length);
          if (result.length === 0) count('pathFailures');
          return result;
        };
      } else {
        P.warnings.push('missing probe target: pathfind');
      }
      const originalNearest = PathProto.nearestWalkable;
      if (typeof originalNearest === 'function') {
        PathProto.nearestWalkable = function (...args) {
          if (!P.enabled) return originalNearest.apply(this, args);
          count('nearestWalkableCalls');
          return originalNearest.apply(this, args);
        };
      }
      const originalRebuild = PathProto.rebuild;
      if (typeof originalRebuild === 'function') {
        PathProto.rebuild = function (...args) {
          if (!P.enabled) return originalRebuild.apply(this, args);
          count('gridRebuilds');
          const t0 = performance.now();
          const result = originalRebuild.apply(this, args);
          add('gridRebuild', performance.now() - t0);
          return result;
        };
      }
      const originalAdd = PathProto.addObstacle;
      const originalRemove = PathProto.removeObstacle;
      if (typeof originalAdd === 'function') {
        PathProto.addObstacle = function (...args) {
          if (P.enabled) count('obstaclesAdded');
          return originalAdd.apply(this, args);
        };
      }
      if (typeof originalRemove === 'function') {
        PathProto.removeObstacle = function (...args) {
          if (P.enabled) count('obstaclesRemoved');
          return originalRemove.apply(this, args);
        };
      }
    }

    // --- economy / production / combat events ---
    if (g.unitContext) {
      const ctx = g.unitContext;
      const originalSpawn = ctx.unitSpawn;
      if (typeof originalSpawn === 'function') {
        ctx.unitSpawn = function (...args) {
          const result = originalSpawn.apply(null, args);
          if (P.enabled && result) {
            count('unitsCreated');
            const building = g.buildings.get(args[0]);
            const owner = building ? building.owner : -1;
            const kind = args[1];
            if (kind === 'worker') count('workersCreated');
            else if (kind !== 'scout') {
              count('militaryCreated');
              if (P.first['firstSoldier' + owner] === undefined) P.first['firstSoldier' + owner] = P.time;
            }
          }
          return result;
        };
      }
      const originalGather = ctx.gather;
      if (typeof originalGather === 'function') {
        ctx.gather = function (...args) {
          if (P.enabled && args[2] > 0) {
            const building = g.buildings.get(args[0]);
            const owner = building ? building.owner : -1;
            const key = 'p' + owner;
            if (!P.gathered[key]) P.gathered[key] = { food: 0, wood: 0, silver: 0, stone: 0 };
            if (P.gathered[key][args[3]] !== undefined) P.gathered[key][args[3]] += args[2];
            count('deliveries');
            count('gatheredAmount', args[2]);
          }
          return originalGather.apply(null, args);
        };
      }
    }

    if (UnitProto) {
      const originalIssue = UnitProto.issueOrder;
      if (typeof originalIssue === 'function') {
        UnitProto.issueOrder = function (order, clear) {
          if (P.enabled && order) {
            if (order.kind === 'attack') {
              count('attackOrders');
              if (P.first['firstAttack' + this.owner] === undefined) {
                P.first['firstAttack' + this.owner] = P.time;
              }
            } else if (order.kind === 'gather') count('gatherOrders');
          }
          return originalIssue.call(this, order, clear);
        };
      }
      const originalDie = UnitProto.die;
      if (typeof originalDie === 'function') {
        UnitProto.die = function (...args) {
          if (P.enabled) {
            P.losses.units[this.owner] = (P.losses.units[this.owner] ?? 0) + 1;
            count('unitLosses');
          }
          return originalDie.apply(this, args);
        };
      }
    }
    if (BuildingProto) {
      const originalDie = BuildingProto.die;
      if (typeof originalDie === 'function') {
        BuildingProto.die = function (...args) {
          if (P.enabled) {
            P.losses.buildings[this.owner] = (P.losses.buildings[this.owner] ?? 0) + 1;
            count('buildingLosses');
          }
          return originalDie.apply(this, args);
        };
      }
    }
    if (AICtor) {
      const originalChoose = AICtor.chooseResourceNode;
      if (typeof originalChoose === 'function') {
        AICtor.chooseResourceNode = function (...args) {
          const result = originalChoose.apply(this, args);
          if (P.enabled) {
            count('chooseResourceCalls');
            if (!result) count('chooseResourceNull');
          }
          return result;
        };
      }
    }

    // --- render ---
    const originalRender = GameProto.render;
    if (typeof originalRender === 'function') {
      GameProto.render = function (...args) {
        if (!P.enabled) return originalRender.apply(this, args);
        const t0 = performance.now();
        const result = originalRender.apply(this, args);
        if (P.renderSamples.length < P.maxSamples) P.renderSamples.push(performance.now() - t0);
        return result;
      };
    } else {
      P.warnings.push('missing probe target: render');
    }

    // --- per-step close-out ---
    const originalUpdate = GameProto.update;
    if (typeof originalUpdate !== 'function') {
      throw new Error('perf-probes: Game.update is not available');
    }
    GameProto.update = function (dt, t) {
      P.time = t;
      if (!P.enabled) return originalUpdate.call(this, dt, t);
      const t0 = performance.now();
      const result = originalUpdate.call(this, dt, t);
      const total = performance.now() - t0;
      P.counters.steps++;
      if (P.counters.steps % P.sampleEvery === 0) {
        push('total', total);
        for (const [label, value] of Object.entries(P.frameTotals)) push(label, value);
      }
      P.frameTotals = {};
      return result;
    };

    const stats = (arr) => {
      if (!arr || arr.length === 0) return null;
      const sorted = arr.slice().sort((a, b) => a - b);
      const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
      let sum = 0;
      for (const v of sorted) sum += v;
      return {
        n: sorted.length,
        mean: sum / sorted.length,
        p50: at(0.5),
        p95: at(0.95),
        p99: at(0.99),
        max: sorted[sorted.length - 1],
      };
    };

    P.snapshot = () => {
      const labels = {};
      for (const [label, arr] of Object.entries(P.samples)) labels[label] = stats(arr);
      labels.render = stats(P.renderSamples);

      const units = [...g.units.values()].filter((u) => !u.dead);
      const workers = units.filter((u) => u.kind === 'worker');
      const scouts = units.filter((u) => u.kind === 'scout');
      const military = units.filter((u) => u.kind !== 'worker' && u.kind !== 'scout');
      const activePaths = units.filter((u) => u.path && u.path.length > 0).length;
      const combatants = units.filter((u) => {
        const order = u.orderQueue && u.orderQueue[0];
        return order && (order.kind === 'attack' || order.kind === 'attack_move');
      }).length;
      const idleWorkers = workers.filter((u) => u.orderQueue.length === 0 || !u.isBusy()).length;
      const byResource = {};
      for (const node of g.resourceNodes.values()) {
        if (node.dead) continue;
        byResource[node.resource] = (byResource[node.resource] ?? 0) + 1;
      }
      const buildingsByOwner = {};
      for (const b of g.buildings.values()) {
        if (b.dead) continue;
        const key = 'p' + b.owner;
        if (!buildingsByOwner[key]) buildingsByOwner[key] = {};
        buildingsByOwner[key][b.kind] = (buildingsByOwner[key][b.kind] ?? 0) + 1;
      }
      const resourceNodes = [...g.resourceNodes.values()].filter((n) => !n.dead).length;
      return {
        labels,
        counters: { ...P.counters },
        first: { ...P.first },
        gathered: JSON.parse(JSON.stringify(P.gathered)),
        losses: {
          units: { ...P.losses.units },
          buildings: { ...P.losses.buildings },
        },
        counts: {
          units: units.length,
          workers: workers.length,
          military: military.length,
          scouts: scouts.length,
          idleWorkers,
          buildings: [...g.buildings.values()].filter((b) => !b.dead).length,
          resourceNodes,
          projectiles: g.projectiles.length,
          activePaths,
          combatants,
        },
        byResource,
        buildingsByOwner,
        timeline: P.timeline.slice(),
        warnings: P.warnings.slice(),
        time: P.time,
      };
    };

    P.reset = () => {
      P.samples = {};
      P.renderSamples = [];
      P.counters = { steps: 0 };
      P.frameTotals = {};
      P.first = {};
      P.gathered = {};
      P.losses = { units: {}, buildings: {} };
      P.timeline = [];
      P.time = 0;
    };
  }, options);
}

/** Reset samples/counters while keeping the wrappers installed. */
export async function resetProbes(page) {
  await page.evaluate(() => {
    if (window.__perf && window.__perf.reset) window.__perf.reset();
  });
}

/** Read the current probe snapshot (labels, counters, counts, timeline). */
export async function snapshotProbes(page) {
  return page.evaluate(() => {
    if (!window.__perf || !window.__perf.snapshot) throw new Error('perf-probes: not installed');
    return window.__perf.snapshot();
  });
}

/** Enable/disable probe recording without removing the wrappers. */
export async function setProbesEnabled(page, enabled) {
  await page.evaluate((value) => {
    if (window.__perf) window.__perf.enabled = value;
  }, enabled);
}

/** Force a GC (requires `--js-flags=--expose-gc`); no-op when unavailable. */
export async function forceGc(page) {
  await page.evaluate(() => {
    if (typeof window.gc === 'function') window.gc();
  });
}

/** Heap usage in MB (Chromium `performance.memory`). */
export async function readMemory(page) {
  return page.evaluate(() => {
    const m = performance.memory;
    if (!m) return null;
    return {
      usedMB: m.usedJSHeapSize / 1048576,
      totalMB: m.totalJSHeapSize / 1048576,
      limitMB: m.jsHeapSizeLimit / 1048576,
    };
  });
}

/** Scene inventory: meshes, instancing, geometries/materials and duplicate usage. */
export async function readSceneStats(page) {
  return page.evaluate(() => {
    const g = window.game;
    let meshes = 0;
    let instancedMeshes = 0;
    let points = 0;
    let groups = 0;
    let sprites = 0;
    const geometries = new Map();
    const materials = new Map();
    g.scene.traverse((object) => {
      if (object.isGroup) groups++;
      if (object.isPoints) points++;
      if (object.isSprite) sprites++;
      if (object.isMesh) {
        meshes++;
        if (object.isInstancedMesh) instancedMeshes++;
        if (object.geometry) geometries.set(object.geometry.uuid, (geometries.get(object.geometry.uuid) ?? 0) + 1);
        const mats = Array.isArray(object.material) ? object.material : [object.material];
        for (const mat of mats) if (mat) materials.set(mat.uuid, (materials.get(mat.uuid) ?? 0) + 1);
      }
    });
    const topDuplicates = (map) =>
      [...map.values()]
        .filter((n) => n > 1)
        .sort((a, b) => b - a)
        .slice(0, 10);
    return {
      meshes,
      instancedMeshes,
      points,
      groups,
      sprites,
      uniqueGeometries: geometries.size,
      uniqueMaterials: materials.size,
      geometryUses: [...geometries.values()].reduce((s, n) => s + n, 0),
      materialUses: [...materials.values()].reduce((s, n) => s + n, 0),
      topGeometryDuplicates: topDuplicates(geometries),
      topMaterialDuplicates: topDuplicates(materials),
      renderer: {
        geometries: g.renderer.info.memory.geometries,
        textures: g.renderer.info.memory.textures,
        programs: g.renderer.info.programs ? g.renderer.info.programs.length : null,
      },
    };
  });
}
