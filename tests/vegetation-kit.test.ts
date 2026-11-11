import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { KIT_PROPS, KIT_TREE_VARIANTS, partsFromScene, type VegetationKitId } from '../src/rendering/vegetationKit';
import { KIT_LOD0_RADIUS, KIT_LOD0_RADIUS_LOW, kitLod0RadiusFor, kitLodFor } from '../src/rendering/TreeInstances';
import { PROP_IDS } from '../src/model/defs/props';

// Per-species LOD0/LOD1 triangle budgets, docs/design/art-direction.md §7.
const BUDGETS: Record<VegetationKitId, [number, number]> = {
  huarango: [1500, 400],
  sauce: [1200, 350],
  cana_brava: [600, 150],
  carrizo: [400, 120],
  totora: [400, 120],
  pacae: [1100, 320],
};
/** Bark + leaf cards; the pacae adds hanging pods. */
const MAX_PARTS: Partial<Record<VegetationKitId, number>> = { pacae: 3 };
const IDS = Object.keys(BUDGETS) as VegetationKitId[];

interface KitManifest {
  asset_id: string;
  budget: { LOD0: number; LOD1: number };
  lods: Record<'LOD0' | 'LOD1', { file: string; triangles: number; draw_calls: number; bounds: { size: number[] } }>;
}

function manifest(id: VegetationKitId): KitManifest {
  const file = path.resolve(`art-src/blender/exports/caral/vegetation/caral_${id}_manifest.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as KitManifest;
}

function glbUrl(id: VegetationKitId, lod: 0 | 1): URL {
  return new URL(`../src/assets/vegetation/caral/caral_${id}_lod${lod}.glb`, import.meta.url);
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

describe('vegetation kit mapping', () => {
  it('draws the huarango (Prosopis) as the algarrobo tree and the riverbank willow as sauce', () => {
    expect(KIT_TREE_VARIANTS).toEqual({ algarrobo: 'huarango', sauce: 'sauce' });
  });

  it('only maps known props', () => {
    for (const prop of Object.keys(KIT_PROPS)) expect(PROP_IDS).toContain(prop);
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

describe.each(IDS)('%s kit GLB', (id) => {
  let lod0: GLTF;
  let lod1: GLTF;

  beforeAll(async () => {
    [lod0, lod1] = await Promise.all([parse(glbUrl(id, 0)), parse(glbUrl(id, 1))]);
  });

  it('records the art-direction budget and stays within it in the manifest', () => {
    const m = manifest(id);
    expect(m.asset_id).toBe(`caral_${id}`);
    expect(m.budget).toEqual({ LOD0: BUDGETS[id][0], LOD1: BUDGETS[id][1] });
    expect(m.lods.LOD0.triangles).toBeLessThanOrEqual(BUDGETS[id][0]);
    expect(m.lods.LOD1.triangles).toBeLessThanOrEqual(BUDGETS[id][1]);
    expect(m.lods.LOD1.triangles).toBeLessThan(m.lods.LOD0.triangles);
    expect(m.lods.LOD0.draw_calls).toBeLessThanOrEqual(MAX_PARTS[id] ?? 2);
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
