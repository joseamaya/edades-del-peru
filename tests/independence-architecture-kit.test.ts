import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import {
  BRENA_CITY_ANCHOR,
  BRENA_CITY_LAYOUT,
  INDEPENDENCE_CHAPEL_ANCHOR,
  INDEPENDENCE_CITY_ANCHOR,
  INDEPENDENCE_CITY_LAYOUT,
  INDEPENDENCE_KIT_FOOTPRINTS,
  brenaCityBlockers,
  independenceCityBlockers,
} from '../src/model/defs/independenceCity';
import { AUTHORED_SITES } from '../src/model/defs/sites';
import { blockersCover } from './site-blockers';

interface LodStats {
  triangles: number;
  draw_calls: number;
  materials: string[];
  bytes: number;
}

interface Manifest {
  asset_id: string;
  budget: { LOD0: number; LOD1: number };
  lods: { LOD0: LodStats; LOD1: LodStats };
}

/** Art-direction §4.2: 5k / 1.5k per building, 8k / 2.4k for a monument, at most 4 materials per piece. */
const LOD0 = 5000;
const LOD1 = 1500;
const MONUMENT = { LOD0: 8000, LOD1: 2400 } as const;

const ROOT = path.resolve('art-src/blender/exports/independence/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('independence_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `independence_${name}_manifest.json`), 'utf8')) as Manifest,
  ]),
);

function glbJson(file: string): Record<string, any> {
  const data = fs.readFileSync(file);
  let offset = 12;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.readUInt32LE(offset + 4);
    offset += 8;
    if (type === 0x4e4f534a) {
      return JSON.parse(
        data
          .subarray(offset, offset + length)
          .toString('utf8')
          .trim(),
      ) as Record<string, any>;
    }
    offset += length;
  }
  throw new Error(`no JSON chunk in ${file}`);
}

describe('independence architecture kit', () => {
  it('ships every piece within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual([
      'camp_wall',
      'chapel',
      'community_house',
      'earthwork',
      'hacienda',
      'parade_ground',
      'tent',
      'well',
    ]);
    for (const [name, manifest] of manifests) {
      const budget = name === 'chapel' ? MONUMENT : { LOD0, LOD1 };
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const stats = manifest.lods[lod];
        expect(stats.triangles, `${name} ${lod}`).toBeLessThanOrEqual(budget[lod]);
        expect(stats.materials.length, `${name} ${lod}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses eight materials across the kit', () => {
    const kit = new Set<string>();
    for (const manifest of manifests.values()) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        for (const material of manifest.lods[lod].materials) kit.add(material);
      }
    }
    expect(kit.size).toBe(8);
    for (const material of [
      'MAT-Arch_IndependencePlaster',
      'MAT-Arch_IndependenceAdobe',
      'MAT-Arch_IndependenceTile',
      'MAT-Arch_IndependenceStone',
      'MAT-Arch_IndependenceWood',
      'MAT-Arch_IndependenceCanvas',
      'MAT-Arch_IndependenceEarth',
      'MAT-Arch_IndependenceDark',
    ]) {
      expect(kit, material).toContain(material);
    }
  });

  it('places every layout asset from the kit', () => {
    for (const layout of [INDEPENDENCE_CITY_LAYOUT, BRENA_CITY_LAYOUT]) {
      for (const placement of layout) {
        expect(names, `${placement.asset} in the kit`).toContain(placement.asset);
      }
    }
  });
});

describe('runtime surfaces', () => {
  it('ships the canvas and tile in the game GLBs', () => {
    expect(ARCH_SURFACES['MAT-Arch_IndependenceCanvas'].set).toBe('plaster_detail');
    expect(ARCH_SURFACES['MAT-Arch_IndependenceTile'].saturation).toBeLessThanOrEqual(0.5);
    expect(ARCH_SURFACES['MAT-Arch_IndependenceStone'].lift).toBeGreaterThan(1);
    const tent = glbJson(path.resolve('src/assets/architecture/independence/independence_tent_lod0.glb'));
    expect((tent.materials ?? []).map((material: { name?: string }) => material.name)).toContain(
      'MAT-Arch_IndependenceCanvas',
    );
    const chapel = glbJson(path.resolve('src/assets/architecture/independence/independence_chapel_lod0.glb'));
    expect((chapel.materials ?? []).map((material: { name?: string }) => material.name)).toContain(
      'MAT-Arch_IndependenceTile',
    );
  });
});

describe('independence layouts', () => {
  it('keeps the Ayacucho march lane open and blocks the chapel/camp pieces', () => {
    const blockers = independenceCityBlockers();
    const a = INDEPENDENCE_CITY_ANCHOR;
    expect(blockers).toHaveLength(11);
    expect(blockersCover(blockers, a.x, a.z), 'parade ground').toBe(false);
    expect(blockersCover(blockers, a.x - 10, a.z), 'west lane').toBe(false);
    expect(blockersCover(blockers, a.x + 10, a.z), 'east lane').toBe(false);
    expect(blockersCover(blockers, INDEPENDENCE_CHAPEL_ANCHOR.x, INDEPENDENCE_CHAPEL_ANCHOR.z), 'chapel').toBe(true);
    expect(blockersCover(blockers, a.x, a.z + 11.5), 'hacienda').toBe(true);
    expect(blockersCover(blockers, a.x + 9, a.z - 6.5), 'tent').toBe(true);
    // The north wall stays 2 m behind the chapel, not on its back.
    const northWall = blockers.find((blocker) => blocker.z < a.z - 17);
    expect(northWall).toBeDefined();
    expect(INDEPENDENCE_CHAPEL_ANCHOR.z - 4 - (northWall!.z + northWall!.d / 2)).toBeGreaterThanOrEqual(2);
  });

  it('keeps the Breña lane open and blocks the sierra camp', () => {
    const blockers = brenaCityBlockers();
    const a = BRENA_CITY_ANCHOR;
    expect(blockers).toHaveLength(10);
    expect(blockersCover(blockers, a.x, a.z), 'parade ground').toBe(false);
    expect(blockersCover(blockers, a.x - 9, a.z), 'west lane').toBe(false);
    expect(blockersCover(blockers, a.x + 9, a.z), 'east lane').toBe(false);
    expect(blockersCover(blockers, a.x - 8, a.z - 8), 'community house').toBe(true);
    expect(blockersCover(blockers, a.x, a.z + 10), 'hacienda').toBe(true);
    expect(blockersCover(blockers, a.x, a.z - 13), 'earthwork').toBe(true);
    expect(blockersCover(blockers, a.x - 10, a.z + 13), 'corral').toBe(true);
  });

  it('has no overlapping buildings and ≥2 m gaps between the solid buildings, except the corral corner', () => {
    for (const layout of [INDEPENDENCE_CITY_LAYOUT, BRENA_CITY_LAYOUT]) {
      const solid = layoutBlockers(
        layout.filter((placement) => placement.asset !== 'parade_ground'),
        INDEPENDENCE_KIT_FOOTPRINTS,
      );
      for (let i = 0; i < solid.length; i++) {
        for (let j = i + 1; j < solid.length; j++) {
          const a = solid[i]!;
          const b = solid[j]!;
          const isWall = (blocker: { w: number; d: number }): boolean =>
            (blocker.w > 5 && blocker.d < 1) || (blocker.d > 5 && blocker.w < 1);
          const dx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
          const dz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
          if (dx < 0 && dz < 0) {
            // The two corral walls meet at a corner; a 0.2 m joint is intended.
            expect(isWall(a) && isWall(b), `pieces ${i}/${j} overlap`).toBe(true);
            continue;
          }
          if (dx >= 0 && dz < 0) expect(dx, `x passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
          if (dz >= 0 && dx < 0) expect(dz, `z passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('is the collision each site uses', () => {
    expect(AUTHORED_SITES.independence_site.blockers).toEqual(independenceCityBlockers());
    expect(AUTHORED_SITES.brena_site.blockers).toEqual(brenaCityBlockers());
    for (const id of ['independence_site', 'brena_site'] as const) {
      expect(AUTHORED_SITES[id].simulationCollision, id).toBe(true);
      expect(AUTHORED_SITES[id].style, id).toBe('independence');
      expect(AUTHORED_SITES[id].hideModel, id).toBe(true);
    }
    // The heritage card points at the drawn chapel, not at the old 12 x 12 m block.
    const proxy = AUTHORED_SITES.independence_site.heritageProxies[0]!;
    expect(proxy.id).toBe('independence_chapel');
    expect(proxy.x).toBeCloseTo(INDEPENDENCE_CHAPEL_ANCHOR.x, 6);
    expect(proxy.z).toBeCloseTo(INDEPENDENCE_CHAPEL_ANCHOR.z, 6);
    expect([proxy.w, proxy.d, proxy.h]).toEqual([14, 8, 11.6]);
  });
});
