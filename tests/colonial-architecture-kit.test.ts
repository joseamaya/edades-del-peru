import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { ARCH_SURFACES } from '../src/rendering/architectureKit';
import { applyFow, createFowUniforms } from '../src/rendering/FowMaterial';
import { colonialCityBlockers, colonialLayoutAt } from '../src/model/defs/colonialCity';
import { getAuthoredSite, LIMA_SITE_ORIGIN } from '../src/model/defs/sites';
import { MISSIONS } from '../src/campaign/defs/campaign';

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

/** Art-direction §4.2: 5k / 1.5k per building, 8k / 2.4k for a monument, at most 4 materials. */
const LOD0 = 5000;
const LOD1 = 1500;
const MONUMENT = { LOD0: 8000, LOD1: 2400 } as const;

const ROOT = path.resolve('art-src/blender/exports/colonial/architecture');
const names = fs
  .readdirSync(ROOT)
  .filter((file) => file.endsWith('_manifest.json'))
  .map((file) => file.replace('_manifest.json', '').replace('colonial_', ''))
  .sort();
const manifests = new Map<string, Manifest>(
  names.map((name) => [
    name,
    JSON.parse(fs.readFileSync(path.join(ROOT, `colonial_${name}_manifest.json`), 'utf8')) as Manifest,
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

describe('colonial architecture kit', () => {
  it('ships every piece within the §4.2 triangle and material budgets', () => {
    expect(names).toEqual(['cabildo', 'casona', 'catedral', 'patio_wall', 'pileta', 'plaza', 'portal']);
    for (const [name, manifest] of manifests) {
      const budget = name === 'catedral' ? MONUMENT : { LOD0, LOD1 };
      for (const lod of ['LOD0', 'LOD1'] as const) {
        const stats = manifest.lods[lod];
        expect(stats.triangles, `${name} ${lod}`).toBeLessThanOrEqual(budget[lod]);
        expect(stats.materials.length, `${name} ${lod}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('uses at most eight materials across the kit and includes the paving split', () => {
    const kit = new Set<string>();
    for (const manifest of manifests.values()) {
      for (const lod of ['LOD0', 'LOD1'] as const) {
        for (const material of manifest.lods[lod].materials) kit.add(material);
      }
    }
    expect(kit.size).toBeLessThanOrEqual(8);
    for (const material of [
      'MAT-Arch_ColonialPaving',
      'MAT-Arch_ColonialStone',
      'MAT-Arch_ColonialTile',
      'MAT-Arch_ColonialPlaster',
      'MAT-Arch_ColonialDark',
    ]) {
      expect(kit, material).toContain(material);
    }
    expect(manifests.get('plaza')!.lods.LOD0.materials).toEqual(['MAT-Arch_ColonialPaving', 'MAT-Arch_ColonialStone']);
    for (const name of ['catedral', 'cabildo', 'casona', 'portal', 'pileta', 'patio_wall']) {
      expect(manifests.get(name)!.lods.LOD0.materials, name).not.toContain('MAT-Arch_ColonialPaving');
    }
  });
});

describe('runtime surfaces', () => {
  it('ships the paving in the game GLB and keeps the tile below the desaturation ceiling', () => {
    expect(ARCH_SURFACES['MAT-Arch_ColonialPaving'].set).toBe('ground_plaza');
    expect(ARCH_SURFACES['MAT-Arch_ColonialStone'].lift).toBeGreaterThan(1);
    expect(ARCH_SURFACES['MAT-Arch_ColonialTile'].saturation).toBeLessThanOrEqual(0.5);
    const json = glbJson(path.resolve('src/assets/architecture/colonial/colonial_plaza_lod0.glb'));
    expect((json.materials ?? []).map((material: { name?: string }) => material.name)).toContain(
      'MAT-Arch_ColonialPaving',
    );
  });

  it('uses the same fired-clay mapping as the independence kit', () => {
    for (const tile of [ARCH_SURFACES['MAT-Arch_ColonialTile'], ARCH_SURFACES['MAT-Arch_IndependenceTile']]) {
      expect(tile.set).toBe('tile');
      expect(tile.tint).toBe(0xf2d3a6);
      expect(tile.saturation).toBe(0.5);
      expect(tile.hue).toBe(12);
    }
  });
});

describe('fog material program keys', () => {
  it('keeps a material’s own shader variant when the fog is applied', () => {
    const material = new THREE.MeshStandardMaterial();
    material.customProgramCacheKey = () => 'arch-saturation-0.55';
    applyFow(material, createFowUniforms());
    expect(material.customProgramCacheKey()).toBe('arch-saturation-0.55|fow-v2');
  });
});

describe('Lima cabildo plot', () => {
  it('leaves the cabildo out of the kit and its blockers for Lima', () => {
    const anchor = { x: 0, z: 0 };
    expect(colonialLayoutAt(anchor).some((p) => p.asset === 'cabildo')).toBe(true);
    expect(colonialLayoutAt(anchor, undefined, { omit: ['cabildo'] }).some((p) => p.asset === 'cabildo')).toBe(false);
    const mission = MISSIONS.find((m) => m.id === 'm_lima')!;
    expect(mission.layout?.site?.kitOmit).toEqual(['cabildo']);
    // The shared site keeps the cabildo for Lima 1821; only the founding mission omits it.
    expect(getAuthoredSite('lima_site')!.blockers.some((b) => Math.abs(b.z - (LIMA_SITE_ORIGIN.z + 18.5)) < 0.1)).toBe(
      true,
    );
    expect(colonialCityBlockers(anchor, 'ciudad', { omit: ['cabildo'] })).not.toEqual(
      colonialCityBlockers(anchor, 'ciudad'),
    );
  });

  it('reserves the plot and points the cabildo objective at it', () => {
    const mission = MISSIONS.find((m) => m.id === 'm_lima')!;
    expect(mission.layout?.site?.reservedPlots?.[0]).toMatchObject({
      x: LIMA_SITE_ORIGIN.x,
      z: LIMA_SITE_ORIGIN.z + 18.5,
      w: 16,
      d: 9,
    });
    const objective = mission.objectives.find((o) => o.id === 'a1_cabildo')!;
    expect(objective.pos).toEqual({ dx: LIMA_SITE_ORIGIN.x, dz: LIMA_SITE_ORIGIN.z + 18.5 });
  });
});
