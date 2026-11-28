import * as THREE from 'three';
import { createRigAttireTools, mergeColoredGeometry } from './rigAttire';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';

/**
 * Presentation-only cargo for the llama caravan. The pack turns the project llama into the trade unit
 * the panel names.
 * The geometry is attached to the `Back` bone so it follows the walk/eat clips.
 */
export function dressCaravan(rig: RigInstance): RigVariantHandle | null {
  const tools = createRigAttireTools(rig.root);
  const back = tools.bonePosition('Back');
  if (!back) {
    tools.dispose();
    return null;
  }

  const cloth = new THREE.Color(0x7a4a28);
  const sack = new THREE.Color(0xb08a5a);
  const rope = new THREE.Color(0x2e2018);
  const packPieces: [THREE.BufferGeometry, THREE.Color][] = [
    [new THREE.BoxGeometry(0.34, 0.22, 0.42).translate(0, 0.02, 0), cloth],
    [new THREE.BoxGeometry(0.12, 0.28, 0.32).translate(0.22, -0.02, 0), sack],
    [new THREE.BoxGeometry(0.12, 0.28, 0.32).translate(-0.22, -0.02, 0), sack],
    [new THREE.BoxGeometry(0.16, 0.14, 0.2).translate(0.1, 0.16, 0.08), sack],
    [new THREE.CylinderGeometry(0.06, 0.06, 0.38, 8).rotateZ(Math.PI / 2).translate(0, 0.17, -0.06), cloth],
    [new THREE.BoxGeometry(0.36, 0.03, 0.03).translate(0, 0.15, -0.15), rope],
    [new THREE.BoxGeometry(0.36, 0.03, 0.03).translate(0, 0.15, 0.15), rope],
    [new THREE.BoxGeometry(0.03, 0.03, 0.38).translate(0.18, -0.08, 0), rope],
    [new THREE.BoxGeometry(0.03, 0.03, 0.38).translate(-0.18, -0.08, 0), rope],
  ];

  const merged = mergeColoredGeometry(packPieces);
  if (!merged) {
    tools.dispose();
    return null;
  }

  const pack = new THREE.Mesh(tools.track(merged), tools.vertexMaterial(0.92));
  pack.name = 'attire_caravan_pack';
  tools.attach('Back', pack, back.clone().add(new THREE.Vector3(0, 0.18, 0)));

  return { dispose: tools.dispose };
}
