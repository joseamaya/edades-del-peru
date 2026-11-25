import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import {
  ARICA_CITY_LAYOUT,
  REAL_FELIPE_CITY_LAYOUT,
  REPUBLIC_KIT_FOOTPRINTS,
  TARAPACA_CITY_LAYOUT,
  aricaCityBlockers,
  realFelipeCityBlockers,
  tarapacaCityBlockers,
} from '../src/model/defs/republicCity';
import { AUTHORED_SITES } from '../src/model/defs/sites';

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

const ROOT = path.resolve('art-src/blender/exports/republic/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('republic_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `republic_${name}_manifest.json`), 'utf8')) as Manifest,
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

describe('republican architecture kit', () => {
  it('ships every piece within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual([
      'adobe_house',
      'apron',
      'bastion',
      'battery',
      'chapel',
      'corral_wall',
      'curtain',
      'fort_plaza',
      'magazine',
      'outcrop',
      'parapet',
      'pier',
      'warehouse',
      'well',
    ]);
    for (const [name, manifest] of manifests) {
      const budget = name === 'chapel' || name === 'bastion' ? MONUMENT : { LOD0, LOD1 };
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const stats = manifest.lods[lod];
        expect(stats.triangles, `${name} ${lod}`).toBeLessThanOrEqual(budget[lod]);
        expect(stats.materials.length, `${name} ${lod}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses at most eight materials across the kit', () => {
    const kit = new Set<string>();
    for (const manifest of manifests.values()) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        for (const material of manifest.lods[lod].materials) kit.add(material);
      }
    }
    expect(kit.size).toBeLessThanOrEqual(8);
    for (const material of [
      'MAT-Arch_RepublicBrick',
      'MAT-Arch_RepublicStone',
      'MAT-Arch_RepublicAdobe',
      'MAT-Arch_RepublicEarth',
      'MAT-Arch_RepublicWood',
      'MAT-Arch_RepublicPaving',
      'MAT-Arch_RepublicPlaza',
      'MAT-Arch_RepublicDark',
    ]) {
      expect(kit, material).toContain(material);
    }
    // The earth apron and the stone plaza have their own floor materials; no building inherits either.
    expect(manifests.get('apron')!.lods.LOD0.materials).toContain('MAT-Arch_RepublicPaving');
    expect(manifests.get('fort_plaza')!.lods.LOD0.materials).toContain('MAT-Arch_RepublicPlaza');
    for (const name of ['battery', 'warehouse', 'curtain', 'bastion', 'magazine', 'chapel', 'adobe_house']) {
      expect(manifests.get(name)!.lods.LOD0.materials, name).not.toContain('MAT-Arch_RepublicPaving');
      expect(manifests.get(name)!.lods.LOD0.materials, name).not.toContain('MAT-Arch_RepublicPlaza');
    }
  });

  it('places every layout asset from the kit', () => {
    for (const layout of [ARICA_CITY_LAYOUT, REAL_FELIPE_CITY_LAYOUT, TARAPACA_CITY_LAYOUT]) {
      for (const placement of layout) {
        expect(names, `${placement.asset} in the kit`).toContain(placement.asset);
      }
    }
  });
});

describe('runtime surfaces', () => {
  it('ships the paved apron in the game GLB and textures the kit sets', () => {
    expect(ARCH_SURFACES['MAT-Arch_RepublicPaving'].set).toBe('plaster_detail');
    expect(ARCH_SURFACES['MAT-Arch_RepublicPlaza'].set).toBe('ground_plaza');
    expect(ARCH_SURFACES['MAT-Arch_RepublicBrick'].set).toBe('wall_brick');
    expect(ARCH_SURFACES['MAT-Arch_RepublicStone'].lift).toBeGreaterThan(1);
    expect(ARCH_SURFACES['MAT-Arch_RepublicAdobe'].keepColor).toBe(true);
    const apron = glbJson(path.resolve('src/assets/architecture/republic/republic_apron_lod0.glb'));
    expect((apron.materials ?? []).map((material: { name?: string }) => material.name)).toContain(
      'MAT-Arch_RepublicPaving',
    );
    const plaza = glbJson(path.resolve('src/assets/architecture/republic/republic_fort_plaza_lod0.glb'));
    expect((plaza.materials ?? []).map((material: { name?: string }) => material.name)).toContain(
      'MAT-Arch_RepublicPlaza',
    );
  });
});

describe('republican layouts', () => {
  it('blocks the battery and warehouse but leaves the apron and pier walkable', () => {
    expect(aricaCityBlockers()).toHaveLength(2);
    const walkable = ARICA_CITY_LAYOUT.filter((p) => !REPUBLIC_KIT_FOOTPRINTS[p.asset]).map((p) => p.asset);
    expect(walkable).toEqual(['apron', 'pier']);
  });

  it('closes the Real Felipe curtains and keeps the sally gates open', () => {
    const blockers = realFelipeCityBlockers();
    const anchor = AUTHORED_SITES.real_felipe_site.anchor;
    const covers = (x: number, z: number): boolean =>
      blockers.some((blocker) => Math.abs(x - blocker.x) <= blocker.w / 2 && Math.abs(z - blocker.z) <= blocker.d / 2);
    expect(blockers).toHaveLength(14);
    expect(covers(anchor.x, anchor.z - 12), 'north curtain').toBe(true);
    expect(covers(anchor.x + 12, anchor.z), 'east curtain').toBe(true);
    expect(covers(anchor.x, anchor.z + 12), 'south gate').toBe(false);
    expect(covers(anchor.x - 12, anchor.z), 'west gate').toBe(false);
  });

  it('draws every Tarapacá cluster and blocks the houses, not the plaza', () => {
    const blockers = tarapacaCityBlockers();
    const covers = (x: number, z: number): boolean =>
      blockers.some((blocker) => Math.abs(x - blocker.x) <= blocker.w / 2 && Math.abs(z - blocker.z) <= blocker.d / 2);
    expect(covers(96, 168), 'village plaza').toBe(false);
    expect(covers(106, 168), 'east street').toBe(false);
    expect(covers(96, 158), 'village house').toBe(true);
    expect(covers(160, 123), 'crest parapet').toBe(true);
    expect(covers(198, 158), 'Pachica corral').toBe(true);
    expect(TARAPACA_CITY_LAYOUT.filter((p) => p.asset === 'adobe_house')).toHaveLength(12);
  });

  it('is the collision each site uses', () => {
    expect(AUTHORED_SITES.arica_site.blockers).toEqual(aricaCityBlockers());
    expect(AUTHORED_SITES.real_felipe_site.blockers).toEqual(realFelipeCityBlockers());
    expect(AUTHORED_SITES.tarapaca_site.blockers).toEqual(tarapacaCityBlockers());
    for (const id of ['arica_site', 'real_felipe_site', 'tarapaca_site'] as const) {
      expect(AUTHORED_SITES[id].simulationCollision, id).toBe(true);
      expect(AUTHORED_SITES[id].style, id).toBe('republic');
    }
  });
});
