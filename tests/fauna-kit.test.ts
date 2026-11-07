import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { faunaPartsFromScene } from '../src/rendering/faunaKit';
import { DEER_RIG, RIPARIAN_BIRD_RIG, faunaTemplate } from '../src/rendering/faunaModels';

const ANIMAL_TRIANGLES = 5000; // scripts/bench.mjs RIG_BUDGETS.animal

interface FaunaManifest {
  asset_id: string;
  pivots: Record<string, number>;
  limbs: { legs?: number; wings?: number };
  triangles_per_animal: number;
  budget_per_animal: number;
}

function manifest(id: string): FaunaManifest {
  const file = path.resolve(`art-src/blender/exports/caral/fauna/caral_${id}_manifest.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as FaunaManifest;
}

async function parse(id: string): Promise<GLTF> {
  await MeshoptDecoder.ready;
  const file = fs.readFileSync(fileURLToPath(new URL(`../src/assets/fauna/caral/caral_${id}.glb`, import.meta.url)));
  const data = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => loader.parse(data, '', resolve, reject));
}

function tris(g: { index: { count: number } | null; getAttribute(n: string): { count: number } }): number {
  return (g.index?.count ?? g.getAttribute('position').count) / 3;
}

describe('Caral fauna kit', () => {
  it('keeps the deer and bird pivots in sync with the procedural templates', () => {
    expect(manifest('deer').pivots).toEqual(DEER_RIG);
    expect(manifest('bird').pivots).toEqual(RIPARIAN_BIRD_RIG);
    const deer = faunaTemplate('deer');
    expect([deer.hipY, deer.legX, deer.legZFront, deer.legZBack]).toEqual([
      DEER_RIG.hipY,
      DEER_RIG.legX,
      DEER_RIG.legZFront,
      DEER_RIG.legZBack,
    ]);
    const bird = faunaTemplate('riparian_bird');
    expect(bird.ground).toBe(false);
    expect(bird.shoulderX).toBe(RIPARIAN_BIRD_RIG.shoulderX);
  });

  it.each([
    ['deer', 'leg', 4],
    ['bird', 'wing', 2],
  ] as const)('%s GLB has a body and a %s, vertex-coloured, within the per-animal budget', async (id, limb, n) => {
    const m = manifest(id);
    expect(m.budget_per_animal).toBe(ANIMAL_TRIANGLES);
    expect(m.triangles_per_animal).toBeLessThanOrEqual(ANIMAL_TRIANGLES);
    const parts = faunaPartsFromScene((await parse(id)).scene);
    expect(parts).not.toBeNull();
    const limbGeo = parts![limb]!;
    expect(limbGeo).toBeDefined();
    expect(parts!.body.getAttribute('color')).toBeDefined();
    expect(tris(parts!.body) + tris(limbGeo) * n).toBeLessThanOrEqual(ANIMAL_TRIANGLES);
    parts!.body.computeBoundingBox();
    // Y-up, standing on the origin: the deer stands ~1.6 tall; the bird is centred on its body.
    if (id === 'deer') expect(parts!.body.boundingBox!.max.y).toBeGreaterThan(1.4);
    else expect(parts!.body.boundingBox!.max.y).toBeLessThan(0.2);
  });
});
