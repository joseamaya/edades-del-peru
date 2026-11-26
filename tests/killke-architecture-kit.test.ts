import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { layoutBlockers } from '../src/model/defs/architectureKit';
import {
  KILLKE_KIT_FOOTPRINTS,
  KILLKE_SHRINE_TOP,
  TAMBOTOCO_KIT_LAYOUT,
  hutApex,
  hutPlacement,
  tambotocoBlockers,
} from '../src/model/defs/tambotocoCity';
import {
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_SHRINE,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../src/model/defs/tambotocoLayout';
import { AUTHORED_SITES } from '../src/model/defs/sites';
import { blockersCover } from './site-blockers';

interface LodStats {
  triangles: number;
  draw_calls: number;
  materials: string[];
  bytes: number;
  bounds: { min: number[]; max: number[]; size: number[] };
}

interface Manifest {
  asset_id: string;
  confidence: string;
  reviewed: boolean;
  budget: { LOD0: number; LOD1: number };
  lods: { LOD0: LodStats; LOD1: LodStats };
}

/** Art-direction §4.2: 5k / 1.5k per building and at most 4 materials per piece. */
const LOD0 = 5000;
const LOD1 = 1500;

const ROOT = path.resolve('art-src/blender/exports/killke/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('killke_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `killke_${name}_manifest.json`), 'utf8')) as Manifest,
  ]),
);

const HUTS: readonly AylluHut[] = [
  ...TAMBOTOCO_SHRINE_HUTS,
  ...TAMBOTOCO_VILLAGES.flatMap((village) => village.huts),
  ...TAMBOTOCO_INTICANCHA_HUTS,
];

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

describe('killke architecture kit', () => {
  it('ships the five pieces within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual(['house', 'house_earth', 'qollqa', 'ramada', 'shrine']);
    for (const [name, manifest] of manifests) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const stats = manifest.lods[lod];
        expect(stats.triangles, `${name} ${lod}`).toBeLessThanOrEqual(lod === 'LOD0' ? LOD0 : LOD1);
        // A Killke building is a domestic piece, not a monument: four materials is the cap.
        expect(stats.materials.length, `${name} ${lod}`).toBeLessThanOrEqual(4);
      }
      expect(manifest.reviewed, name).toBe(false);
      expect(manifest.confidence, name).toBeTruthy();
    }
  });

  it('uses seven materials across the kit', () => {
    const kit = new Set<string>();
    for (const manifest of manifests.values()) {
      for (const lod of ['LOD0', 'LOD1'] as const)
        for (const material of manifest.lods[lod].materials) kit.add(material);
    }
    expect(kit.size).toBe(7);
    for (const material of [
      'MAT-Arch_KillkeStone',
      'MAT-Arch_KillkeCutstone',
      'MAT-Arch_KillkePlaster',
      'MAT-Arch_KillkeEarth',
      'MAT-Arch_KillkeThatch',
      'MAT-Arch_KillkeWood',
      'MAT-Arch_KillkeDark',
    ]) {
      expect(kit, material).toContain(material);
    }
  });

  it('ships the same materials the manifests declare in the compressed game GLBs', () => {
    for (const [name, manifest] of manifests) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const glb = glbJson(path.resolve(`src/assets/architecture/killke/killke_${name}_lod${lod.slice(-1)}.glb`));
        const shipped = (glb.materials ?? []).map((material: { name?: string }) => material.name).sort();
        expect(shipped, `${name} ${lod}`).toEqual([...manifest.lods[lod].materials].sort());
      }
    }
  });

  it('maps every authored hut to a kit piece and keeps the shrine on its anchor', () => {
    expect(TAMBOTOCO_KIT_LAYOUT).toHaveLength(HUTS.length + 1);
    for (const hut of HUTS) {
      const placement = hutPlacement(hut);
      expect(placement.asset, `${hut.x},${hut.z}`).toBe(
        hut.kind === 'storehouse'
          ? 'qollqa'
          : hut.kind === 'shed'
            ? 'ramada'
            : hut.wallColor === 'earth'
              ? 'house_earth'
              : 'house',
      );
      expect(placement.seat).toBe('centre');
      // The piece is scaled to the authored dimensions, so the silhouette and the blocker agree.
      const blocker = layoutBlockers([placement], KILLKE_KIT_FOOTPRINTS)[0]!;
      expect(blocker.w, `${hut.x},${hut.z} width`).toBeGreaterThan(hut.w);
      expect(blocker.w, `${hut.x},${hut.z} width`).toBeLessThan(hut.w + 2.5);
      expect(blocker.d, `${hut.x},${hut.z} depth`).toBeGreaterThan(hut.d);
      expect(blocker.d, `${hut.x},${hut.z} depth`).toBeLessThan(hut.d + 2.5);
    }
    const shrine = TAMBOTOCO_KIT_LAYOUT[0]!;
    expect(shrine.asset).toBe('shrine');
    expect(shrine.x).toBe(TAMBOTOCO_SHRINE.x);
    expect(shrine.z).toBe(TAMBOTOCO_SHRINE.z);
  });

  it('starts each hut smoke at the modelled roof apex', () => {
    for (const hut of HUTS) {
      const placement = hutPlacement(hut);
      const apex = manifests.get(placement.asset)!.lods.LOD0.bounds.max[2];
      expect(hutApex(hut), `${hut.x},${hut.z}`).toBeCloseTo(apex * placement.scale[1], 5);
    }
    // The huaca sits on the shrine's summit slab, which both LODs carry; LOD0 adds the corner stones.
    const shrine = manifests.get('shrine')!.lods;
    expect(KILLKE_SHRINE_TOP).toBeCloseTo(shrine.LOD1.bounds.max[2], 5);
    expect(shrine.LOD0.bounds.max[2]).toBeGreaterThan(KILLKE_SHRINE_TOP);
  });

  it('gives every hut a solid blocker and leaves the plaza and cancha plots open', () => {
    const blockers = tambotocoBlockers();
    expect(blockers).toEqual(AUTHORED_SITES.tambotoco_site.blockers);
    expect(AUTHORED_SITES.tambotoco_site.simulationCollision).toBe(true);
    // The cave GLB keeps its own authored footprint; every other solid piece comes from the layout.
    expect(blockers).toHaveLength(layoutBlockers(TAMBOTOCO_KIT_LAYOUT, KILLKE_KIT_FOOTPRINTS).length + 1);
    for (const hut of HUTS) {
      expect(blockersCover(blockers, hut.x, hut.z), `hut at ${hut.x},${hut.z}`).toBe(true);
    }
    expect(blockersCover(blockers, TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z), 'the shrine platform').toBe(true);
    expect(blockersCover(blockers, TAMBOTOCO_INTICANCHA.x, TAMBOTOCO_INTICANCHA.z), 'plaza centre').toBe(false);
    for (const cancha of TAMBOTOCO_CANCHAS) {
      expect(blockersCover(blockers, cancha.dx, cancha.dz), `cancha at ${cancha.dx},${cancha.dz}`).toBe(false);
    }
  });

  it('shows the Inticancha ring only once the settlement is founded', () => {
    const inticancha = TAMBOTOCO_KIT_LAYOUT.filter((p) =>
      TAMBOTOCO_INTICANCHA_HUTS.some((h) => h.x === p.x && h.z === p.z),
    );
    expect(inticancha).toHaveLength(TAMBOTOCO_INTICANCHA_HUTS.length);
    for (const placement of inticancha) expect(placement.since).toBe('fundada');
    const rest = TAMBOTOCO_KIT_LAYOUT.filter((p) => !TAMBOTOCO_INTICANCHA_HUTS.some((h) => h.x === p.x && h.z === p.z));
    expect(rest.every((p) => p.since === undefined)).toBe(true);
    const blocker = tambotocoBlockers().find(
      (b) =>
        Math.abs(b.x - TAMBOTOCO_INTICANCHA_HUTS[0]!.x) < 0.01 &&
        Math.abs(b.z - TAMBOTOCO_INTICANCHA_HUTS[0]!.z) < 0.01,
    );
    expect(blocker?.since).toBe('fundada');
  });
});

describe('runtime surfaces', () => {
  it('maps the highland fieldstone, plaster, thatch and openings', () => {
    expect(ARCH_SURFACES['MAT-Arch_KillkeStone'].set).toBe('wall_fieldstone');
    expect(ARCH_SURFACES['MAT-Arch_KillkeStone'].lift).toBeGreaterThan(1);
    expect(ARCH_SURFACES['MAT-Arch_KillkeCutstone'].set).toBe('wall_cutstone');
    for (const material of ['MAT-Arch_KillkePlaster', 'MAT-Arch_KillkeEarth', 'MAT-Arch_KillkeDark']) {
      expect(ARCH_SURFACES[material]?.set, material).toBe('plaster_detail');
      expect(ARCH_SURFACES[material]?.keepColor, material).toBe(true);
    }
    expect(ARCH_SURFACES['MAT-Arch_KillkeThatch'].set).toBe('roof_thatch');
    expect(ARCH_SURFACES['MAT-Arch_KillkeWood'].set).toBe('wood');
  });
});
