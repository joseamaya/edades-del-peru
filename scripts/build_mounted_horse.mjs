#!/usr/bin/env node
/**
 * Build the cavalry horse from Quaternius' CC0 «Horse» (Ultimate Animated Animal Pack, via Poly Pizza; see
 * PROVENANCE.md). The source GLB stays untouched in `art-src/quaternius/horse.glb`; this keeps the clips the
 * mounted rig plays, drops the FBX duplicates (`AnimalArmature|*`) and the rest, and re-encodes with meshopt.
 *
 * Usage: node scripts/build_mounted_horse.mjs [--src=art-src/quaternius/horse.glb] [--out=src/assets/models/quaternius_horse.glb]
 */
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, resample } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { cliArg } from './lib.mjs';

const src = cliArg('src', 'art-src/quaternius/horse.glb');
const out = cliArg('out', 'src/assets/models/quaternius_horse.glb');
/** Idle, trot (the walk), gallop, the charge strike and death: the states the mounted rig plays. */
export const HORSE_CLIPS = ['Idle', 'Walk', 'Gallop', 'Attack_Headbutt', 'Death'];

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
for (const animation of doc.getRoot().listAnimations()) {
  if (!HORSE_CLIPS.includes(animation.getName())) animation.dispose();
}
const kept = doc
  .getRoot()
  .listAnimations()
  .map((a) => a.getName());
const missing = HORSE_CLIPS.filter((name) => !kept.includes(name));
if (missing.length) throw new Error(`horse source lacks clips: ${missing.join(', ')}`);
// Drop only the tracks that do not move. The leg IK bones (`IKFrontLeg.*`, `IKBackLeg.*`) carry the hooves and
// lower legs by translation, so their translation tracks are the gait: dropping every non-root translation
// left the hooves behind while the legs swung.
const CONSTANT = 1e-4;
for (const animation of doc.getRoot().listAnimations()) {
  for (const channel of animation.listChannels()) {
    const path = channel.getTargetPath();
    if (path !== 'scale' && path !== 'translation') continue;
    const sampler = channel.getSampler();
    const values = sampler?.getOutput()?.getArray();
    if (!values) continue;
    let range = 0;
    for (let k = 0; k < 3; k++) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = k; i < values.length; i += 3) {
        lo = Math.min(lo, values[i]);
        hi = Math.max(hi, values[i]);
      }
      range = Math.max(range, hi - lo);
    }
    if (range > CONSTANT) continue;
    channel.dispose();
    if (sampler.listParents().length <= 1) sampler.dispose();
  }
}
await doc.transform(
  resample({ tolerance: 5e-4 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  prune(),
);
await io.write(out, doc);
const bytes = fs.statSync(out).size;
console.log(`[horse] ${out}: ${(bytes / 1024).toFixed(0)} KiB, clips ${kept.join(', ')}`);
