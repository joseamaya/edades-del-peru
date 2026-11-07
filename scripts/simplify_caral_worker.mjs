import fs from 'fs';
import path from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { cliArg } from './lib.mjs';

/**
 * Bring the Caral worker to an RTS unit budget. The Quaternius base bodies are about 12k triangles
 * each, mostly hidden under the cotton tunic and skirt; at game camera distances that detail is
 * invisible but it dominated a late Caral scene (35 workers drew 1.2M triangles). The bodies, the long
 * hair and the tunics are simplified in place (skin weights, UVs and normals stay per vertex, open
 * borders such as hems are locked), and the GLB is re-encoded with meshopt compression.
 *
 * Usage: node scripts/simplify_caral_worker.mjs [--file=src/assets/models/caral_worker.glb]
 * `yarn models:build` runs it after rebuilding the worker from its sources.
 */
/**
 * Triangle budget and simplification ratio per part. Parts already within budget are left alone, so
 * the script is idempotent.
 */
const PART_BUDGETS = {
  Body_f: { budget: 3000, ratio: 0.2 },
  Body_m: { budget: 3000, ratio: 0.2 },
  Hair_f: { budget: 1000, ratio: 0.3 },
  Hair_m: { budget: 1000, ratio: 0.6 },
  attire_tunic_f: { budget: 1000, ratio: 0.35 },
  attire_tunic_m: { budget: 1000, ratio: 0.45 },
};

export async function simplifyCaralWorker(file) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const document = await io.read(file);
  const report = [];
  let changed = false;
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    const part = PART_BUDGETS[node.getName()];
    if (!mesh || !part) continue;
    for (const prim of mesh.listPrimitives()) {
      const before = (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;
      if (before <= part.budget) {
        report.push(`${node.getName()}: ${before} tris (already within budget)`);
        continue;
      }
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: part.ratio, error: 0.01, lockBorder: true });
      const after = prim.getIndices().getCount() / 3;
      report.push(`${node.getName()}: ${before} -> ${after} tris`);
      changed = true;
    }
  }
  if (changed) {
    await document.transform(weld(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await io.write(file, document);
  }
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = path.resolve(cliArg('file', 'src/assets/models/caral_worker.glb'));
  const before = fs.statSync(file).size;
  for (const line of await simplifyCaralWorker(file)) console.log(line);
  console.log(`${path.relative(process.cwd(), file)}: ${before} -> ${fs.statSync(file).size} bytes`);
}
