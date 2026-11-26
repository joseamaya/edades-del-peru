import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { layoutBlockers } from '../src/model/defs/architectureKit';
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
import { blockersCover } from './site-blockers';
import { setAutoStart } from '../src/core/Game';
import { headlessMission } from './headless';

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
    // The courtyard is the one Republican floor seen at dusk: warmed and lifted, with flatter joints.
    expect(ARCH_SURFACES['MAT-Arch_RepublicPlaza'].tint).toBe(0xf2e2c4);
    expect(ARCH_SURFACES['MAT-Arch_RepublicPlaza'].normal).toBeLessThan(0.5);
    expect(ARCH_SURFACES['MAT-Arch_RepublicPlaza'].lift).toBeGreaterThan(1.5);
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
    expect(blockers).toHaveLength(14);
    expect(blockersCover(blockers, anchor.x, anchor.z - 12), 'north curtain').toBe(true);
    expect(blockersCover(blockers, anchor.x + 12, anchor.z), 'east curtain').toBe(true);
    expect(blockersCover(blockers, anchor.x, anchor.z + 12), 'south gate').toBe(false);
    expect(blockersCover(blockers, anchor.x - 12, anchor.z), 'west gate').toBe(false);
  });

  it('draws every Tarapacá cluster and blocks the houses, not the plaza', () => {
    const blockers = tarapacaCityBlockers();
    expect(blockersCover(blockers, 96, 168), 'village plaza').toBe(false);
    expect(blockersCover(blockers, 106, 168), 'east street').toBe(false);
    expect(blockersCover(blockers, 98, 155), 'village house').toBe(true);
    expect(blockersCover(blockers, 160, 123), 'crest parapet').toBe(true);
    expect(blockersCover(blockers, 198, 158), 'Pachica corral').toBe(true);
    expect(TARAPACA_CITY_LAYOUT.filter((p) => p.asset === 'adobe_house')).toHaveLength(12);
    // The houses and the chapel keep ≥2 m passages between them (AABBs, so the rotated houses are
    // measured conservatively); no house overlaps another.
    const village = layoutBlockers(
      TARAPACA_CITY_LAYOUT.filter((p) => p.asset === 'adobe_house' || p.asset === 'chapel'),
      REPUBLIC_KIT_FOOTPRINTS,
    );
    for (let i = 0; i < village.length; i++) {
      for (let j = i + 1; j < village.length; j++) {
        const a = village[i]!;
        const b = village[j]!;
        const dx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
        const dz = Math.abs(a.z - b.z) - (a.d + b.d) / 2;
        expect(dx < 0 && dz < 0, `houses ${i}/${j} overlap`).toBe(false);
        if (dx >= 0 && dz < 0) expect(dx, `x passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
        if (dz >= 0 && dx < 0) expect(dz, `z passage ${i}/${j}`).toBeGreaterThanOrEqual(2);
      }
    }
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

  it('spawns the Real Felipe garrison clear of the kit pieces and keeps the gate wide', () => {
    const game = headlessMission('m_real_felipe');
    try {
      const site = AUTHORED_SITES.real_felipe_site;
      const garrison = [...game.buildings.values()].filter((building) => building.owner === 1 && !building.dead);
      expect(garrison.length).toBeGreaterThan(0);
      for (const building of garrison) {
        expect(
          blockersCover(site.blockers, building.pos.x, building.pos.z),
          `${building.kind} at ${building.pos.x.toFixed(1)},${building.pos.z.toFixed(1)}`,
        ).toBe(false);
      }
      // The 4 m sally gate loses one blockerPadding on each side to the navigation expansion.
      expect(4 - 2 * site.blockerPadding).toBeGreaterThanOrEqual(2);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});
