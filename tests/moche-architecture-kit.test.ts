import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import {
  CHIMU_CITY_ANCHOR,
  CHIMU_CITY_LAYOUT,
  MOCHE_CITY_ANCHOR,
  MOCHE_CITY_LAYOUT,
  MOCHE_HUACA_LUNA_ANCHOR,
  MOCHE_HUACA_SOL_ANCHOR,
  MOCHE_KIT_FOOTPRINTS,
  chimuCityBlockers,
  mocheCityBlockers,
} from '../src/model/defs/mocheChimuCity';
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

const ROOT = path.resolve('art-src/blender/exports/moche/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('moche_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `moche_${name}_manifest.json`), 'utf8')) as Manifest,
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

describe('moche architecture kit', () => {
  it('ships every piece within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual(['altar', 'audiencia', 'frieze', 'hall', 'huaca', 'niche_wall', 'platform', 'plaza', 'wall']);
    for (const [name, manifest] of manifests) {
      const budget = name === 'huaca' || name === 'audiencia' ? MONUMENT : { LOD0, LOD1 };
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
      'MAT-Arch_MocheAdobe',
      'MAT-Arch_MocheAdobeDark',
      'MAT-Arch_MochePlaster',
      'MAT-Arch_MocheFriezeCream',
      'MAT-Arch_MocheFriezeRed',
      'MAT-Arch_MocheEarth',
      'MAT-Arch_MocheWood',
      'MAT-Arch_MocheDark',
    ]) {
      expect(kit, material).toContain(material);
    }
  });

  it('places every layout asset from the kit and ships both LODs in the game folder', () => {
    for (const layout of [MOCHE_CITY_LAYOUT, CHIMU_CITY_LAYOUT]) {
      for (const placement of layout) {
        expect(names, `${placement.asset} in the kit`).toContain(placement.asset);
        for (const lod of ['lod0', 'lod1'] as const) {
          expect(
            fs.existsSync(path.resolve(`src/assets/architecture/moche/moche_${placement.asset}_${lod}.glb`)),
            `${placement.asset} ${lod}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('runtime surfaces', () => {
  it('maps the adobe, friezes, earth and openings to the plaster detail set', () => {
    for (const material of [
      'MAT-Arch_MocheAdobe',
      'MAT-Arch_MocheAdobeDark',
      'MAT-Arch_MochePlaster',
      'MAT-Arch_MocheFriezeCream',
      'MAT-Arch_MocheFriezeRed',
      'MAT-Arch_MocheEarth',
      'MAT-Arch_MocheDark',
    ]) {
      expect(ARCH_SURFACES[material]?.set, material).toBe('plaster_detail');
      expect(ARCH_SURFACES[material]?.keepColor, material).toBe(true);
    }
    expect(ARCH_SURFACES['MAT-Arch_MocheWood'].set).toBe('wood');
    const huaca = glbJson(path.resolve('src/assets/architecture/moche/moche_huaca_lod0.glb'));
    const materials = (huaca.materials ?? []).map((material: { name?: string }) => material.name);
    expect(materials).toContain('MAT-Arch_MocheFriezeRed');
    expect(materials).toContain('MAT-Arch_MocheFriezeCream');
  });
});

describe('north-coast layouts', () => {
  it('blocks the two huacas and the plaza edge but keeps the south approach open', () => {
    const blockers = mocheCityBlockers();
    const a = MOCHE_CITY_ANCHOR;
    expect(blockers).toHaveLength(11);
    expect(blockersCover(blockers, MOCHE_HUACA_SOL_ANCHOR.x, MOCHE_HUACA_SOL_ANCHOR.z), 'huaca del Sol').toBe(true);
    expect(blockersCover(blockers, MOCHE_HUACA_LUNA_ANCHOR.x, MOCHE_HUACA_LUNA_ANCHOR.z), 'huaca de la Luna').toBe(
      true,
    );
    expect(blockersCover(blockers, a.x, a.z), 'plaza center').toBe(false);
    // The approach from the south-west base (0.3, 0.66 of the map) crosses the south edge of the plaza.
    expect(blockersCover(blockers, a.x + 1.7, a.z + 10.7), 'south approach').toBe(false);
    expect(blockersCover(blockers, a.x + 3.7, a.z - 6), 'altar').toBe(true);
  });

  it('blocks the Chimú compound but keeps the south gate open', () => {
    const blockers = chimuCityBlockers();
    const a = CHIMU_CITY_ANCHOR;
    expect(blockers).toHaveLength(8);
    expect(blockersCover(blockers, a.x, a.z - 1), 'platform').toBe(true);
    expect(blockersCover(blockers, a.x, a.z + 11.5), 'south gate').toBe(false);
    expect(blockersCover(blockers, a.x - 8, a.z + 11.5), 'south wall').toBe(true);
    expect(blockersCover(blockers, a.x - 10.5, a.z), 'west niched wall').toBe(true);
  });

  it('has no overlapping buildings and ≥2 m gaps, except the stacked altar and audiencia', () => {
    for (const layout of [MOCHE_CITY_LAYOUT, CHIMU_CITY_LAYOUT]) {
      const solid = layoutBlockers(
        layout.filter((placement) => !placement.lift),
        MOCHE_KIT_FOOTPRINTS,
      );
      for (let i = 0; i < solid.length; i++) {
        for (let j = i + 1; j < solid.length; j++) {
          const a = solid[i]!;
          const b = solid[j]!;
          const dx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
          const dz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
          expect(dx < 0 && dz < 0, `pieces ${i}/${j} overlap`).toBe(false);
          if (dx >= 0 && dz < 0) expect(dx, `x passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
          if (dz >= 0 && dx < 0) expect(dz, `z passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('is the collision each site uses', () => {
    expect(AUTHORED_SITES.moche_site.blockers).toEqual(mocheCityBlockers());
    expect(AUTHORED_SITES.chimu_site.blockers).toEqual(chimuCityBlockers());
    for (const id of ['moche_site', 'chimu_site'] as const) {
      expect(AUTHORED_SITES[id].simulationCollision, id).toBe(true);
      expect(AUTHORED_SITES[id].style, id).toBe('moche');
      expect(AUTHORED_SITES[id].hideModel, id).toBe(true);
      expect(AUTHORED_SITES[id].wallCollision?.meshPatterns, id).toEqual([]);
    }
    // The heritage cards point at the drawn massing, not at the old GLB bounds.
    const sol = AUTHORED_SITES.moche_site.heritageProxies[0]!;
    expect(sol.id).toBe('moche_huaca_sol');
    expect(sol.x).toBeCloseTo(MOCHE_HUACA_SOL_ANCHOR.x, 6);
    expect([sol.w, sol.d]).toEqual([24, 18.5]);
    const compound = AUTHORED_SITES.chimu_site.heritageProxies[0]!;
    expect(compound.id).toBe('chimu_compound');
    expect(compound.x).toBeCloseTo(CHIMU_CITY_ANCHOR.x, 6);
  });
});
