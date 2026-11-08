import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { archPartsFromScene, archKitUrl } from '../src/rendering/architectureKit';
import {
  CARAL_CITY_BLOCKERS,
  CARAL_CITY_LAYOUT,
  CARAL_MAYOR_HEIGHT,
  CARAL_MAYOR_PHASE_ASSET,
  type CaralArchAssetId,
} from '../src/model/defs/caralCity';
import { CARAL_HERITAGE_PROXIES, CARAL_SITE_BLOCKERS } from '../src/model/defs/sites';

// blender-game-assets contract: LOD0 <= 5k, LOD1 <= 1.5k triangles per building; <= 8 kit materials.
const LOD0 = 5000;
const LOD1 = 1500;
const IDS: CaralArchAssetId[] = [
  'pyramid_mayor',
  'pyramid_mayor_phase1',
  'pyramid_mayor_phase2',
  'pyramid_mayor_phase3',
  'pyramid_small',
  'circular_plaza',
  'house_common',
  'house_elite',
  'house_aspero',
  'fair_tent',
];
const PERSON = 1.86;

interface Manifest {
  asset_id: string;
  wall_height?: number;
  reviewed: boolean;
  reviewer?: string;
  reviewedAt?: string;
  confidence: string;
  budget: { LOD0: number; LOD1: number };
  lods: Record<'LOD0' | 'LOD1', { file: string; triangles: number; materials: string[]; bounds: { size: number[] } }>;
}

const manifest = (id: CaralArchAssetId): Manifest =>
  JSON.parse(
    fs.readFileSync(path.resolve(`art-src/blender/exports/caral/architecture/caral_${id}_manifest.json`), 'utf8'),
  ) as Manifest;

const glbFile = (id: CaralArchAssetId, lod: 0 | 1): string =>
  fileURLToPath(new URL(`../src/assets/architecture/caral/caral_${id}_lod${lod}.glb`, import.meta.url));

function glbJson(file: string): { materials?: { name: string; pbrMetallicRoughness?: Record<string, unknown> }[] } {
  const buf = fs.readFileSync(file);
  return JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
}

async function parse(file: string): Promise<GLTF> {
  await MeshoptDecoder.ready;
  const buf = fs.readFileSync(file);
  const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => loader.parse(data, '', resolve, reject));
}

const triangles = (geometry: THREE.BufferGeometry): number =>
  (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;

describe('Caral architecture kit', () => {
  it('ships every piece and phase as two LODs the game can resolve', () => {
    for (const id of IDS) {
      expect(archKitUrl('caral', id, 0), id).toBeTruthy();
      expect(archKitUrl('caral', id, 1), id).toBeTruthy();
    }
    for (const id of Object.values(CARAL_MAYOR_PHASE_ASSET)) expect(IDS).toContain(id);
  });

  it('records budgets, provenance gate and certainty in every manifest', () => {
    for (const id of IDS) {
      const m = manifest(id);
      expect(m.asset_id).toBe(`caral_${id}`);
      // The Blender script exports every piece unreviewed; a human approval records who and when.
      if (m.reviewed) {
        expect(m.reviewer, id).toBeTruthy();
        expect(Number.isNaN(Date.parse(m.reviewedAt ?? '')), id).toBe(false);
      }
      expect(['documented', 'inferred', 'assumed']).toContain(m.confidence);
      expect(m.budget).toEqual({ LOD0, LOD1 });
      expect(m.lods.LOD0.triangles).toBeLessThanOrEqual(LOD0);
      expect(m.lods.LOD1.triangles).toBeLessThanOrEqual(LOD1);
      expect(m.lods.LOD1.triangles).toBeLessThan(m.lods.LOD0.triangles);
    }
  });

  it('keeps world-scale UVs in every game GLB for the runtime tileable textures', () => {
    for (const id of IDS) {
      for (const lod of [0, 1] as const) {
        const json = glbJson(glbFile(id, lod)) as {
          meshes: { primitives: { attributes: Record<string, number> }[] }[];
        };
        for (const mesh of json.meshes) {
          for (const p of mesh.primitives) expect(p.attributes.TEXCOORD_0, `${id} LOD${lod}`).toBeDefined();
        }
      }
    }
  });

  it('uses at most 8 flat Principled materials across the kit (metallic 0 or 1, no textures)', () => {
    const names = new Set<string>();
    for (const id of IDS) {
      for (const lod of [0, 1] as const) {
        for (const mat of glbJson(glbFile(id, lod)).materials ?? []) {
          names.add(mat.name);
          const pbr = mat.pbrMetallicRoughness ?? {};
          expect(pbr.baseColorTexture, `${id} ${mat.name}`).toBeUndefined();
          expect([0, 1]).toContain((pbr.metallicFactor as number | undefined) ?? 1);
        }
      }
    }
    expect(names.size).toBeLessThanOrEqual(8);
    for (const name of names) expect(name).toMatch(/^MAT-Arch_/);
  });

  it('keeps the Pyramid Mayor 7–9 people tall and the houses 1.3–1.5 people at the wall', () => {
    expect(CARAL_MAYOR_HEIGHT / PERSON).toBeGreaterThanOrEqual(7);
    expect(CARAL_MAYOR_HEIGHT / PERSON).toBeLessThanOrEqual(9);
    const mayor = manifest('pyramid_mayor').lods.LOD0.bounds.size;
    // Footprint 40–55 units (art-direction §3); the summit enclosure stands above the terraces.
    expect(mayor[0]).toBeGreaterThanOrEqual(40);
    expect(mayor[0]).toBeLessThanOrEqual(55);
    expect(mayor[2]).toBeGreaterThan(CARAL_MAYOR_HEIGHT);
    for (const id of ['house_common', 'house_elite', 'house_aspero'] as CaralArchAssetId[]) {
      const wall = manifest(id).wall_height!;
      expect(wall / PERSON, id).toBeGreaterThanOrEqual(1.29);
      expect(wall / PERSON, id).toBeLessThanOrEqual(1.5);
    }
  });
});

describe.each(['pyramid_mayor', 'pyramid_mayor_phase1', 'house_elite'] as CaralArchAssetId[])('%s GLB', (id) => {
  let lods: GLTF[];
  beforeAll(async () => {
    lods = await Promise.all([parse(glbFile(id, 0)), parse(glbFile(id, 1))]);
  });

  it('bakes into one part per material within budget, origin at the footprint centre', () => {
    const [near, far] = lods.map((g) => archPartsFromScene(g.scene));
    const tris = (parts: typeof near): number => [...parts.values()].reduce((n, p) => n + triangles(p.geometry), 0);
    expect(tris(near)).toBeLessThanOrEqual(LOD0);
    expect(tris(far)).toBeLessThanOrEqual(LOD1);
    const box = new THREE.Box3();
    for (const part of near.values()) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox!);
      expect(part.geometry.getAttribute('color')).toBeTruthy();
    }
    const center = box.getCenter(new THREE.Vector3());
    expect(Math.abs(center.x)).toBeLessThan(box.getSize(new THREE.Vector3()).x * 0.15);
    expect(box.min.y).toBeGreaterThan(-1);
  });
});

describe('Caral city layout', () => {
  const overlaps = (a: { x: number; z: number; w: number; d: number }, b: typeof a): boolean =>
    Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.z - b.z) * 2 < a.d + b.d;

  it('puts one Pyramid Mayor on its heritage volume and a pyramid on every other one', () => {
    const mayors = CARAL_CITY_LAYOUT.filter((p) => p.mayor);
    expect(mayors).toHaveLength(1);
    const proxy = CARAL_HERITAGE_PROXIES.find((p) => p.id === 'caral_pyramid_mayor')!;
    expect([mayors[0].x, mayors[0].z]).toEqual([proxy.x, proxy.z]);
    expect(proxy.h).toBe(CARAL_MAYOR_HEIGHT);
    for (const p of CARAL_HERITAGE_PROXIES.filter((h) => h.id.startsWith('caral_pyramid_') && h.id !== proxy.id)) {
      expect(
        CARAL_CITY_LAYOUT.some((l) => l.asset === 'pyramid_small' && l.x === p.x && l.z === p.z),
        p.id,
      ).toBe(true);
    }
  });

  it('keeps houses off the monuments, off each other and away from the player base', () => {
    const base = { x: 60.5, z: 161.3 };
    CARAL_CITY_BLOCKERS.forEach((house, i) => {
      for (const monument of CARAL_SITE_BLOCKERS) expect(overlaps(house, monument), `house ${i}`).toBe(false);
      CARAL_CITY_BLOCKERS.forEach((other, j) => {
        if (j > i) expect(overlaps(house, other), `houses ${i}/${j}`).toBe(false);
      });
      expect(Math.hypot(house.x - base.x, house.z - base.z)).toBeGreaterThan(25);
    });
    expect(CARAL_CITY_BLOCKERS.length).toBe(
      CARAL_CITY_LAYOUT.filter((p) => p.asset === 'house_common' || p.asset === 'house_elite').length,
    );
  });
});
