import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  KIT_PROPS,
  KIT_PROPS_ANDES,
  KIT_TREE_VARIANTS,
  KIT_TREE_VARIANTS_ANDES,
  VEGETATION_PACKS,
  partsFromScene,
  type VegetationKitId,
} from '../src/rendering/vegetationKit';
import { KIT_LOD0_RADIUS, KIT_LOD0_RADIUS_LOW, kitLod0RadiusFor, kitLodFor } from '../src/rendering/TreeInstances';
import { PROP_IDS } from '../src/model/defs/props';
import type { VegetationPack } from '../src/model/defs/profiles';

// Per-species LOD0/LOD1 triangle budgets, docs/design/art-direction.md §7.
const BUDGETS: Record<VegetationKitId, [number, number]> = {
  huarango: [1500, 400],
  sauce: [1200, 350],
  cana_brava: [600, 150],
  carrizo: [400, 120],
  totora: [400, 120],
  pacae: [1100, 320],
  molle: [1500, 400],
  pacay: [1100, 320],
  ichu: [220, 60],
};
/** Bark + leaf cards; only the Caral pacae adds hanging pods. */
const MAX_PARTS: Partial<Record<VegetationKitId, number>> = { pacae: 3 };
const CARAL_IDS: VegetationKitId[] = ['huarango', 'sauce', 'cana_brava', 'carrizo', 'totora', 'pacae'];
const ANDES_IDS: VegetationKitId[] = ['molle', 'pacay', 'ichu'];

interface KitManifest {
  asset_id: string;
  reviewed: boolean;
  reviewer?: string;
  reviewedAt?: string;
  confidence: string;
  sources: string[];
  budget: { LOD0: number; LOD1: number };
  lods: Record<'LOD0' | 'LOD1', { file: string; triangles: number; draw_calls: number; bounds: { size: number[] } }>;
}

function manifest(id: VegetationKitId, pack: VegetationPack): KitManifest {
  const file = path.resolve(
    `art-src/blender/exports/${pack === 'caral' ? 'caral/vegetation' : 'tambotoco/vegetation'}/${pack}_${id}_manifest.json`,
  );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as KitManifest;
}

function glbUrl(id: VegetationKitId, lod: 0 | 1, pack: VegetationPack): URL {
  return new URL(
    `../src/assets/vegetation/${pack === 'caral' ? 'caral' : 'andes'}/${pack}_${id}_lod${lod}.glb`,
    import.meta.url,
  );
}

/** Drop texture references from the GLB's JSON chunk (node has no image decoder). */
function withoutTextures(file: Buffer): ArrayBuffer {
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
  for (const material of json.materials ?? []) delete material.pbrMetallicRoughness?.baseColorTexture;
  delete json.textures;
  delete json.images;
  delete json.samplers;
  let text = JSON.stringify(json);
  while (text.length % 4) text += ' ';
  const rest = file.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + text.length + rest.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const out = Buffer.concat([header, Buffer.from(text, 'utf8'), rest]);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
}

async function parse(url: URL): Promise<GLTF> {
  await MeshoptDecoder.ready;
  const data = withoutTextures(fs.readFileSync(fileURLToPath(url)));
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => loader.parse(data, '', resolve, reject));
}

function triangles(parts: { geometry: THREE.BufferGeometry }[]): number {
  return parts.reduce((n, p) => n + (p.geometry.index?.count ?? p.geometry.getAttribute('position').count) / 3, 0);
}

/** Union bounds of a baked kit; both LODs share the pivot, so size and centre must nearly match. */
function kitBounds(parts: { geometry: THREE.BufferGeometry }[]): THREE.Box3 {
  const box = new THREE.Box3();
  for (const part of parts) {
    part.geometry.computeBoundingBox();
    box.union(part.geometry.boundingBox!);
  }
  return box;
}

function expectStableFootprint(
  near: { geometry: THREE.BufferGeometry }[],
  far: { geometry: THREE.BufferGeometry }[],
  tolerance = 0.18,
): void {
  const a = kitBounds(near);
  const b = kitBounds(far);
  const sizeA = a.getSize(new THREE.Vector3());
  const sizeB = b.getSize(new THREE.Vector3());
  for (const axis of ['x', 'y', 'z'] as const) {
    expect(Math.abs(sizeB[axis] - sizeA[axis]) / sizeA[axis]).toBeLessThan(tolerance);
  }
  const drift = b.getCenter(new THREE.Vector3()).distanceTo(a.getCenter(new THREE.Vector3()));
  expect(drift).toBeLessThan(Math.max(sizeA.x, sizeA.z) * tolerance);
}

describe('vegetation kit mapping', () => {
  it('draws the huarango (Prosopis) as the algarrobo tree and the riverbank willow as sauce', () => {
    expect(KIT_TREE_VARIANTS).toEqual({ algarrobo: 'huarango', sauce: 'sauce' });
  });

  it('draws the highland molle and pacay and keeps the shared willow', () => {
    expect(KIT_TREE_VARIANTS_ANDES).toEqual({ molle: 'molle', pacay: 'pacay', sauce: 'sauce' });
  });

  it('scopes the near-canopy shadow rule to the highland pack', () => {
    expect(VEGETATION_PACKS.andes.nearLeafShadows).toBe(true);
    expect(VEGETATION_PACKS.caral.nearLeafShadows).toBe(false);
  });

  it('only maps known props', () => {
    for (const prop of Object.keys(KIT_PROPS)) expect(PROP_IDS).toContain(prop);
    for (const prop of Object.keys(KIT_PROPS_ANDES)) expect(PROP_IDS).toContain(prop);
  });

  it('switches to LOD1 beyond the radius, and everywhere with radius 0', () => {
    expect(kitLodFor(0, KIT_LOD0_RADIUS)).toBe(0);
    expect(kitLodFor(KIT_LOD0_RADIUS ** 2, KIT_LOD0_RADIUS)).toBe(0);
    expect(kitLodFor(KIT_LOD0_RADIUS ** 2 + 1, KIT_LOD0_RADIUS)).toBe(1);
    expect(kitLodFor(0.5, 0)).toBe(1);
  });

  it('keeps LOD0 near the camera on low quality, just in a smaller radius', () => {
    expect(kitLod0RadiusFor(false)).toBe(KIT_LOD0_RADIUS);
    expect(kitLod0RadiusFor(true)).toBe(KIT_LOD0_RADIUS_LOW);
    expect(KIT_LOD0_RADIUS_LOW).toBeGreaterThan(0);
    expect(KIT_LOD0_RADIUS_LOW).toBeLessThan(KIT_LOD0_RADIUS);
  });
});

describe.each(CARAL_IDS)('%s kit GLB', (id) => {
  let lod0: GLTF;
  let lod1: GLTF;

  beforeAll(async () => {
    [lod0, lod1] = await Promise.all([parse(glbUrl(id, 0, 'caral')), parse(glbUrl(id, 1, 'caral'))]);
  });

  it('records the art-direction budget, the provenance gate and its certainty', () => {
    const m = manifest(id, 'caral');
    expect(m.asset_id).toBe(`caral_${id}`);
    // The Blender script exports every species unreviewed; a human approval records who and when.
    expect(m.reviewed, id).toBe(true);
    expect(m.reviewer, id).toBeTruthy();
    expect(Number.isNaN(Date.parse(m.reviewedAt ?? '')), id).toBe(false);
    expect(m.confidence).toBe(id === 'pacae' ? 'inferred' : 'documented');
    expect(m.sources.length).toBeGreaterThan(0);
    expect(m.budget).toEqual({ LOD0: BUDGETS[id][0], LOD1: BUDGETS[id][1] });
    expect(m.lods.LOD0.triangles).toBeLessThanOrEqual(BUDGETS[id][0]);
    expect(m.lods.LOD1.triangles).toBeLessThanOrEqual(BUDGETS[id][1]);
    expect(m.lods.LOD1.triangles).toBeLessThan(m.lods.LOD0.triangles);
    expect(m.lods.LOD0.draw_calls).toBeLessThanOrEqual(MAX_PARTS[id] ?? 2);
  });

  it('keeps the far LOD footprint close to the near one so the swap does not pop', () => {
    // Clumps legitimately thin out at LOD1; trees and the pacae shrub keep their silhouette.
    if (!['huarango', 'sauce', 'pacae'].includes(id)) return;
    expectStableFootprint(partsFromScene(lod0.scene), partsFromScene(lod1.scene));
  });

  it('bakes into at most two parts per LOD within budget, at game scale', () => {
    const near = partsFromScene(lod0.scene);
    const far = partsFromScene(lod1.scene);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(MAX_PARTS[id] ?? 2);
    expect(far.length).toBe(near.length);
    expect(triangles(near)).toBeLessThanOrEqual(BUDGETS[id][0]);
    expect(triangles(far)).toBeLessThanOrEqual(BUDGETS[id][1]);
    const box = new THREE.Box3();
    for (const part of near) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox!);
    }
    // Y-up, pivot at the base; heights between a reed clump (~1.5) and a tall willow (~8).
    expect(box.min.y).toBeGreaterThan(-0.5);
    expect(box.max.y).toBeGreaterThan(1.2);
    expect(box.max.y).toBeLessThan(9);
    for (const part of near) {
      if (part.leaf) {
        const mat = part.material as THREE.MeshStandardMaterial;
        expect(mat.alphaTest).toBeGreaterThan(0);
        expect(mat.transparent).toBe(false);
      }
    }
  });
});

describe.each(ANDES_IDS)('%s andes kit GLB', (id) => {
  let lod0: GLTF;
  let lod1: GLTF;

  beforeAll(async () => {
    [lod0, lod1] = await Promise.all([parse(glbUrl(id, 0, 'andes')), parse(glbUrl(id, 1, 'andes'))]);
  });

  it('records the art-direction budget and the inferred provenance', () => {
    const m = manifest(id, 'andes');
    expect(m.asset_id).toBe(`andes_${id}`);
    expect(m.confidence).toBe('inferred');
    expect(m.sources.length).toBeGreaterThan(0);
    expect(m.budget).toEqual({ LOD0: BUDGETS[id][0], LOD1: BUDGETS[id][1] });
    expect(m.lods.LOD0.triangles).toBeLessThanOrEqual(BUDGETS[id][0]);
    expect(m.lods.LOD1.triangles).toBeLessThanOrEqual(BUDGETS[id][1]);
    expect(m.lods.LOD1.triangles).toBeLessThan(m.lods.LOD0.triangles);
    expect(m.lods.LOD0.draw_calls).toBeLessThanOrEqual(MAX_PARTS[id] ?? 2);
  });

  it('keeps the far LOD footprint close to the near one for trees', () => {
    if (id === 'ichu') return;
    expectStableFootprint(partsFromScene(lod0.scene), partsFromScene(lod1.scene), 0.14);
  });

  it('bakes into at most three parts per LOD within budget, at game scale', () => {
    const near = partsFromScene(lod0.scene);
    const far = partsFromScene(lod1.scene);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(MAX_PARTS[id] ?? 2);
    expect(far.length).toBe(near.length);
    expect(triangles(near)).toBeLessThanOrEqual(BUDGETS[id][0]);
    expect(triangles(far)).toBeLessThanOrEqual(BUDGETS[id][1]);
    const box = new THREE.Box3();
    for (const part of near) {
      part.geometry.computeBoundingBox();
      box.union(part.geometry.boundingBox!);
    }
    expect(box.min.y).toBeGreaterThan(-0.5);
    if (id === 'ichu') {
      expect(box.max.y).toBeGreaterThan(0.4);
      expect(box.max.y).toBeLessThan(1.5);
    } else {
      expect(box.max.y).toBeGreaterThan(1.2);
      expect(box.max.y).toBeLessThan(9);
    }
    for (const part of near) {
      if (part.leaf) {
        const mat = part.material as THREE.MeshStandardMaterial;
        expect(mat.alphaTest).toBeGreaterThan(0);
        expect(mat.transparent).toBe(false);
      }
    }
  });
});
