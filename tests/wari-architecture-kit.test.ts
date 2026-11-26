import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import {
  CHANCA_CITY_ANCHOR,
  CHANCA_CITY_LAYOUT,
  WARI_CITY_ANCHOR,
  WARI_CITY_LAYOUT,
  VILCABAMBA_REFUGE_ANCHOR,
  VILCABAMBA_REFUGE_LAYOUT,
  WARI_KIT_FOOTPRINTS,
  chancaCityBlockers,
  vilcabambaRefugeBlockers,
  wariCityBlockers,
} from '../src/model/defs/wariChancaCity';
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

const ROOT = path.resolve('art-src/blender/exports/wari/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('wari_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `wari_${name}_manifest.json`), 'utf8')) as Manifest,
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

describe('wari architecture kit', () => {
  it('ships every piece within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual([
      'altar',
      'd_temple',
      'gallery',
      'mural',
      'plaza',
      'pukara_wall',
      'room',
      'terrace',
      'tower',
    ]);
    for (const [name, manifest] of manifests) {
      const budget = name === 'd_temple' ? MONUMENT : { LOD0, LOD1 };
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
      'MAT-Arch_WariStone',
      'MAT-Arch_WariCutstone',
      'MAT-Arch_WariPlasterWhite',
      'MAT-Arch_WariPlasterRed',
      'MAT-Arch_WariEarth',
      'MAT-Arch_WariThatch',
      'MAT-Arch_WariWood',
      'MAT-Arch_WariDark',
    ]) {
      expect(kit, material).toContain(material);
    }
  });

  it('ships the same materials the manifests declare in the compressed game GLBs', () => {
    for (const [name, manifest] of manifests) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const glb = glbJson(path.resolve(`src/assets/architecture/wari/wari_${name}_lod${lod.slice(-1)}.glb`));
        const shipped = (glb.materials ?? []).map((material: { name?: string }) => material.name).sort();
        expect(shipped, `${name} ${lod}`).toEqual([...manifest.lods[lod].materials].sort());
      }
    }
  });

  it('places every layout asset from the kit', () => {
    for (const layout of [WARI_CITY_LAYOUT, CHANCA_CITY_LAYOUT, VILCABAMBA_REFUGE_LAYOUT]) {
      for (const placement of layout) {
        expect(names, `${placement.asset} in the kit`).toContain(placement.asset);
      }
    }
  });
});

describe('runtime surfaces', () => {
  it('maps the stone, plaster, thatch and openings', () => {
    expect(ARCH_SURFACES['MAT-Arch_WariStone'].set).toBe('wall_fieldstone');
    expect(ARCH_SURFACES['MAT-Arch_WariStone'].lift).toBeGreaterThan(1);
    expect(ARCH_SURFACES['MAT-Arch_WariCutstone'].set).toBe('wall_cutstone');
    for (const material of ['MAT-Arch_WariPlasterWhite', 'MAT-Arch_WariPlasterRed', 'MAT-Arch_WariEarth']) {
      expect(ARCH_SURFACES[material]?.set, material).toBe('plaster_detail');
      expect(ARCH_SURFACES[material]?.keepColor, material).toBe(true);
    }
    expect(ARCH_SURFACES['MAT-Arch_WariThatch'].set).toBe('roof_thatch');
    const temple = glbJson(path.resolve('src/assets/architecture/wari/wari_d_temple_lod0.glb'));
    const materials = (temple.materials ?? []).map((material: { name?: string }) => material.name);
    expect(materials).toContain('MAT-Arch_WariPlasterRed');
    expect(materials).toContain('MAT-Arch_WariDark');
  });
});

describe('highland layouts', () => {
  it('blocks the temple, the galleries and the panels but keeps the plaza and its south road open', () => {
    const blockers = wariCityBlockers();
    const a = WARI_CITY_ANCHOR;
    expect(blockers).toHaveLength(8);
    expect(blockersCover(blockers, a.x, a.z - 4), 'temple').toBe(true);
    expect(blockersCover(blockers, a.x - 12.8, a.z + 7), 'west gallery').toBe(true);
    expect(blockersCover(blockers, a.x, a.z + 7), 'plaza floor').toBe(false);
    expect(blockersCover(blockers, a.x, a.z + 20), 'south road').toBe(false);
  });

  it('blocks the pucará walls and towers but keeps the gate open', () => {
    const blockers = chancaCityBlockers();
    const a = CHANCA_CITY_ANCHOR;
    expect(blockers).toHaveLength(10);
    expect(blockersCover(blockers, a.x, a.z - 6.2), 'north wall').toBe(true);
    expect(blockersCover(blockers, a.x + 3, a.z + 2), 'terrace').toBe(false);
    expect(blockersCover(blockers, a.x, a.z + 6.4), 'gate').toBe(false);
    // The two southern segments leave a gate wide enough for the site pad (0.8 m per side at runtime).
    const south = blockers.filter((b) => b.z > a.z + 4 && b.d < 3).sort((l, r) => l.x - r.x);
    const gate = south[1]!.x - south[1]!.w / 2 - (south[0]!.x + south[0]!.w / 2);
    expect(gate, 'gate width').toBeGreaterThanOrEqual(4);
    expect(blockersCover(blockers, a.x - 5.2, a.z + 6.4), 'south wall').toBe(true);
    expect(blockersCover(blockers, a.x - 9.3, a.z - 8.7), 'north-west tower').toBe(true);
  });

  it('leaves ≥2 m between buildings; the pucará walls and towers meet at their corners', () => {
    for (const layout of [WARI_CITY_LAYOUT, CHANCA_CITY_LAYOUT, VILCABAMBA_REFUGE_LAYOUT]) {
      const solid = layoutBlockers(
        layout.filter((placement) => !placement.lift),
        WARI_KIT_FOOTPRINTS,
      );
      // The pucará trace: long thin walls and the ~3.7 m round towers.
      const isTrace = (blocker: { w: number; d: number }): boolean =>
        (blocker.w > 5 && blocker.d < 3.5) ||
        (blocker.d > 5 && blocker.w < 3.5) ||
        (Math.abs(blocker.w - 3.7) < 0.8 && Math.abs(blocker.d - 3.7) < 0.8);
      for (let i = 0; i < solid.length; i++) {
        for (let j = i + 1; j < solid.length; j++) {
          const a = solid[i]!;
          const b = solid[j]!;
          const dx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
          const dz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
          if (dx < 0 && dz < 0) {
            expect(isTrace(a) && isTrace(b), `pieces ${i}/${j} overlap`).toBe(true);
            continue;
          }
          // The pucará trace is a chain of walls and towers: their corners can close to a joint.
          const joint = isTrace(a) && isTrace(b);
          if (dx >= 0 && dz < 0) expect(dx, `x passage ${i}/${j}`).toBeGreaterThanOrEqual(joint ? 0 : 2);
          if (dz >= 0 && dx < 0) expect(dz, `z passage ${i}/${j}`).toBeGreaterThanOrEqual(joint ? 0 : 2);
        }
      }
    }
  });

  it('draws the Vilcabamba refuge with its south gate open', () => {
    const blockers = vilcabambaRefugeBlockers();
    const a = VILCABAMBA_REFUGE_ANCHOR;
    expect(blockers).toHaveLength(9);
    expect(blockersCover(blockers, a.x, a.z - 11), 'north wall').toBe(true);
    expect(blockersCover(blockers, a.x - 10.5, a.z), 'west wall').toBe(true);
    expect(blockersCover(blockers, a.x - 4.6, a.z - 5), 'longhouse').toBe(true);
    expect(blockersCover(blockers, a.x, a.z + 2), 'plaza').toBe(false);
    expect(blockersCover(blockers, a.x, a.z + 9), 'south gate').toBe(false);
  });

  it('is the collision each site uses', () => {
    expect(AUTHORED_SITES.wari_site.blockers).toEqual(wariCityBlockers());
    expect(AUTHORED_SITES.chanca_site.blockers).toEqual(chancaCityBlockers());
    expect(AUTHORED_SITES.vilcabamba_site.blockers).toEqual(vilcabambaRefugeBlockers());
    for (const id of ['wari_site', 'chanca_site', 'vilcabamba_site'] as const) {
      expect(AUTHORED_SITES[id].simulationCollision, id).toBe(true);
      expect(AUTHORED_SITES[id].style, id).toBe('wari');
      expect(AUTHORED_SITES[id].hideModel, id).toBe(true);
      expect(AUTHORED_SITES[id].wallCollision?.meshPatterns, id).toEqual([]);
    }
    const temple = AUTHORED_SITES.wari_site.heritageProxies[0]!;
    expect(temple.id).toBe('wari_templo_d');
    expect([temple.w, temple.d]).toEqual([18, 18.4]);
    const pucara = AUTHORED_SITES.chanca_site.heritageProxies[0]!;
    expect(pucara.id).toBe('chanca_pucara');
    expect(pucara.x).toBeCloseTo(CHANCA_CITY_ANCHOR.x, 6);
  });
});
