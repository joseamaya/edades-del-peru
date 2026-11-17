import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildRibbon, offsetPolyline } from './ribbon';
import { CANAL_BANK_WIDTH, CANAL_BED_EXTRA } from '../model/defs/canal';

/** Height of the water ribbon above the terrain (m). */
export const CANAL_WATER_LIFT = 0.12;
/** Height of the dry bed ribbon above the terrain (m). */
export const CANAL_BED_LIFT = 0.06;
/** Height of the earth berms above the terrain (m). */
export const CANAL_BANK_LIFT = 0.2;

/**
 * A small near-white streak texture for the flowing acequia. The water UVs run along the channel, so
 * scrolling the map offset reads as visible flow even when the normal-map shimmer is too subtle.
 */
export function canalFlowTexture(): THREE.DataTexture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const streak = 0.5 + 0.5 * Math.sin(v * 9 + Math.sin(u * 2 + v * 0.7) * 1.8);
      const value = Math.round((0.82 + streak * 0.18) * 255);
      const i = (y * size + x) * 4;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Ribbon geometries for an authored irrigation channel (no boxes). */
export interface CanalMeshGeometry {
  bed: THREE.BufferGeometry;
  water: THREE.BufferGeometry;
  banks: THREE.BufferGeometry;
  gate: THREE.BufferGeometry;
}

/**
 * Build an earth acequia along a polyline: a dark bed, a water ribbon and two low earth berms, all
 * sampling the terrain at every vertex so the channel follows the relief. The stone-and-turf gate is a
 * single merged low-poly mesh at the intake, not a factory wall.
 */
export function buildCanalGeometry(
  path: { x: number; z: number }[],
  width: number,
  heightAt: (x: number, z: number) => number,
): CanalMeshGeometry | null {
  if (path.length < 2) return null;
  const bed = buildRibbon(path, width + CANAL_BED_EXTRA, (x, z) => heightAt(x, z) + CANAL_BED_LIFT);
  const water = buildRibbon(path, width, (x, z) => heightAt(x, z) + CANAL_WATER_LIFT);
  const offset = width / 2 + CANAL_BANK_WIDTH;
  const left = buildRibbon(offsetPolyline(path, offset), CANAL_BANK_WIDTH, (x, z) => heightAt(x, z) + CANAL_BANK_LIFT);
  const right = buildRibbon(
    offsetPolyline(path, -offset),
    CANAL_BANK_WIDTH,
    (x, z) => heightAt(x, z) + CANAL_BANK_LIFT,
  );
  if (!bed || !water || !left || !right) {
    for (const geo of [bed, water, left, right]) geo?.dispose();
    return null;
  }
  const banks = mergeGeometries([left, right], false);
  const gate = buildCanalGate(path, width, heightAt);
  left.dispose();
  right.dispose();
  if (!banks || !gate) {
    for (const geo of [bed, water, banks, gate]) geo?.dispose();
    return null;
  }
  return { bed, water, banks, gate };
}

/** Low stone plug across the intake; deterministic so screenshots and replays match. */
function buildCanalGate(
  path: { x: number; z: number }[],
  width: number,
  heightAt: (x: number, z: number) => number,
): THREE.BufferGeometry | null {
  const start = path[0];
  const next = path[1];
  const dx = next.x - start.x;
  const dz = next.z - start.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len;
  const uz = dz / len;
  const px = -uz;
  const pz = ux;
  const across = width / 2 + 0.3;
  const pieces: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const lateral = (i / 4) * 2 - 1;
    const x = start.x + px * lateral * across + ux * 0.6;
    const z = start.z + pz * lateral * across + uz * 0.6;
    const size = 0.32 + ((i * 13) % 5) * 0.05;
    const rock = new THREE.DodecahedronGeometry(size, 0);
    rock.scale(1, 0.55, 1);
    rock.rotateY(i * 0.9);
    rock.translate(x, heightAt(x, z) + 0.12, z);
    pieces.push(rock);
  }
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((geo) => geo.dispose());
  return merged;
}
