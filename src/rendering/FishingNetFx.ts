import * as THREE from 'three';
import { WATER_LEVEL } from '../model/defs/profiles';

/**
 * Presentation-only fishing from the shore: a worker casts a cotton net with gourd floats over the
 * fishing ground and drags it back to the bank, in a loop while it gathers there. Cotton nets and gourd
 * floats are documented at Áspero (docs/historia/campanas/caral.md); casting and dragging from the shore
 * is the game's assumed way of showing them in use. No gameplay effect: the gather rate is unchanged.
 */

/** Seconds of one cast-and-drag cycle (two gather ticks of 1.4 s). */
const CYCLE = 2.8;
/** Share of the cycle the net is in the air, then dragged, then back in the hand. */
const FLIGHT = 0.22;
const DRAG_END = 0.86;
const NET_RADIUS = 1.1;

let sharedGeometry: THREE.CircleGeometry | null = null;
let sharedMaterial: THREE.MeshStandardMaterial | null = null;

function netTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const c = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 6, 0, Math.PI * 2);
  ctx.clip();
  // Cotton mesh: a diagonal lattice of thin cords.
  ctx.strokeStyle = 'rgba(236, 226, 200, 1)';
  ctx.lineWidth = 2.2;
  for (let k = -size; k < size * 2; k += 14) {
    ctx.beginPath();
    ctx.moveTo(k, 0);
    ctx.lineTo(k + size, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(k, size);
    ctx.lineTo(k + size, 0);
    ctx.stroke();
  }
  ctx.restore();
  // Head rope and gourd floats (mates) around the rim.
  ctx.strokeStyle = 'rgba(214, 196, 150, 1)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, c - 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(185, 138, 62, 1)';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * (c - 6), c + Math.sin(a) * (c - 6), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // No mipmaps: averaged mip levels would turn the open mesh into a solid disc.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function netMesh(): THREE.Mesh {
  sharedGeometry ??= new THREE.CircleGeometry(NET_RADIUS, 20);
  sharedMaterial ??= new THREE.MeshStandardMaterial({
    map: netTexture(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 1,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(sharedGeometry, sharedMaterial);
  mesh.name = 'fishing_net';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

const _from = new THREE.Vector3();
const _land = new THREE.Vector3();
const _bank = new THREE.Vector3();

export class FishingNetFx {
  private readonly mesh = netMesh();

  constructor(private readonly scene: THREE.Scene) {
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /**
   * Place the net for this frame. `from` is the fisher's position, `ground` the fishing ground.
   * Returns whether the net is back in the hand (the attire then shows the folded bundle).
   */
  update(time: number, seed: number, from: { x: number; y: number; z: number }, ground: { x: number; z: number }) {
    const t = (time / CYCLE + (seed % 7) * 0.137) % 1;
    const dx = ground.x - from.x;
    const dz = ground.z - from.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const ux = dx / len;
    const uz = dz / len;
    const water = WATER_LEVEL + 0.04;
    _from.set(from.x + ux * 0.4, from.y + 1.45, from.z + uz * 0.4);
    _land.set(ground.x - ux * 0.4, water, ground.z - uz * 0.4);
    _bank.set(from.x + ux * 1.4, water, from.z + uz * 1.4);
    if (t >= DRAG_END) {
      this.mesh.visible = false;
      return true;
    }
    this.mesh.visible = true;
    if (t < FLIGHT) {
      // Thrown in an arc, opening as it flies.
      const k = t / FLIGHT;
      this.mesh.position.lerpVectors(_from, _land, k);
      this.mesh.position.y += Math.sin(Math.PI * k) * 1.6;
      this.mesh.scale.setScalar(0.25 + 0.75 * k);
      this.mesh.rotation.set(-Math.PI / 2 + (1 - k) * 0.9, 0, Math.atan2(ux, uz));
    } else {
      // Dragged back over the water, closing as the floats come in.
      const k = (t - FLIGHT) / (DRAG_END - FLIGHT);
      const ease = k * k * (3 - 2 * k);
      this.mesh.position.lerpVectors(_land, _bank, ease);
      this.mesh.position.y = water + Math.sin(time * 5 + seed) * 0.02;
      this.mesh.scale.set(1 - 0.45 * ease, 1 - 0.2 * ease, 1);
      this.mesh.rotation.set(-Math.PI / 2, 0, Math.atan2(ux, uz));
    }
    return false;
  }

  hide(): void {
    this.mesh.visible = false;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
  }
}
