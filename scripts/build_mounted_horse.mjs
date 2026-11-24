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
// Only rotations carry the gait; the bones' translation and scale tracks are constant or near it, so dropping
// them (the root's translation excepted) halves the animation data without a visible change.
for (const animation of doc.getRoot().listAnimations()) {
  for (const channel of animation.listChannels()) {
    const path = channel.getTargetPath();
    const node = channel.getTargetNode()?.getName() ?? '';
    if (path === 'scale' || (path === 'translation' && node !== 'Body')) {
      const sampler = channel.getSampler();
      channel.dispose();
      if (sampler && sampler.listParents().length <= 1) sampler.dispose();
    }
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
