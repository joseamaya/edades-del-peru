import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { aoGeometry } from '../model/ProceduralModel';
import type { SpeciesId } from '../model/defs/wildlife';

/** A species model: one static body plus the geometry shared by its animated limbs. */
export interface FaunaTemplate {
  body: THREE.BufferGeometry;
  /** Quadruped leg; origin at the hip, extends down to the hoof. */
  leg?: THREE.BufferGeometry;
  /** Bird wing; origin at the shoulder, extends +X. */
  wing?: THREE.BufferGeometry;
  hipY: number;
  legX: number;
  legZFront: number;
  legZBack: number;
  shoulderX: number;
  shoulderY: number;
  shoulderZ: number;
  ground: boolean;
  flyHeight: number;
  stride: number;
  flap: number;
}

const cache = new Map<SpeciesId, FaunaTemplate>();

export function faunaTemplate(id: SpeciesId): FaunaTemplate {
  let t = cache.get(id);
  if (!t) {
    t = id === 'llama' ? quadruped('llama') : id === 'vicuna' ? quadruped('vicuna') : bird(id);
    cache.set(id, t);
  }
  return t;
}

/** Free the cached template geometries (game teardown). */
export function clearFaunaTemplates(): void {
  for (const t of cache.values()) {
    t.body.dispose();
    t.leg?.dispose();
    t.wing?.dispose();
  }
  cache.clear();
}

type Part = { geo: THREE.BufferGeometry; color: string };

function place(geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.BufferGeometry {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  return geo;
}

function box(w: number, h: number, d: number, r = 0.03): THREE.BufferGeometry {
  return r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
}

function capsule(radius: number, length: number): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(radius, length, 4, 10);
}

function sphere(radius: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radius, 10, 8);
}

function tapered(rTop: number, rBottom: number, h: number, seg = 7): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, rBottom, h, seg);
}

/** Bake per-part colour + vertex AO and merge the static parts into one geometry. */
function mergeParts(parts: Part[]): THREE.BufferGeometry {
  const baked = parts.map((p) => {
    const out = aoGeometry(p.geo, p.color);
    p.geo.dispose();
    return out;
  });
  const flat = baked.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = mergeGeometries(flat, false);
  for (let i = 0; i < flat.length; i++) if (flat[i] !== baked[i]) flat[i].dispose();
  return merged ?? new THREE.BufferGeometry();
}

function quadruped(id: 'llama' | 'vicuna'): FaunaTemplate {
  const llama = id === 'llama';
  const r = llama ? 0.3 : 0.24;
  const bodyLen = llama ? 0.9 : 0.78;
  const hipY = llama ? 0.62 : 0.58;
  const legLen = hipY;
  const colors = llama
    ? { body: '#8a6a4a', belly: '#b9a186', neck: '#9a7a55', head: '#6f5236', leg: '#7a5c3e', hoof: '#33281d' }
    : { body: '#b2916a', belly: '#e3d6bf', neck: '#bb9c72', head: '#a07f57', leg: '#a0805a', hoof: '#33281d' };

  const bodyTop = hipY + 2 * r * 0.9;
  const frontZ = bodyLen / 2 + r * 0.4;
  const parts: Part[] = [];

  const belly = capsule(r, bodyLen);
  place(belly, 0, hipY + r, 0, Math.PI / 2);
  parts.push({ geo: belly, color: colors.body });
  const underside = sphere(r * 0.82);
  underside.scale(1, 0.5, bodyLen / r + 0.5);
  place(underside, 0, hipY + r * 0.55, 0);
  parts.push({ geo: underside, color: colors.belly });

  const neckLen = llama ? 0.52 : 0.44;
  const tilt = 0.5;
  const baseY = bodyTop - r * 0.2;
  const baseZ = frontZ - r * 0.3;
  const neck = capsule(0.11, neckLen);
  place(neck, 0, baseY + Math.cos(tilt) * neckLen * 0.5, baseZ + Math.sin(tilt) * neckLen * 0.5, tilt);
  parts.push({ geo: neck, color: colors.neck });

  const headY = baseY + Math.cos(tilt) * neckLen;
  const headZ = baseZ + Math.sin(tilt) * neckLen;
  const head = box(0.2, 0.22, 0.26, 0.06);
  place(head, 0, headY, headZ);
  parts.push({ geo: head, color: colors.head });
  const muzzle = box(0.14, 0.13, 0.18, 0.05);
  place(muzzle, 0, headY - 0.02, headZ + 0.16);
  parts.push({ geo: muzzle, color: colors.head });

  const earH = llama ? 0.2 : 0.16;
  for (const side of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.045, earH, 6);
    place(ear, side * 0.07, headY + 0.13, headZ - 0.02, -0.15, 0, side * -0.18);
    parts.push({ geo: ear, color: colors.head });
  }

  const tail = tapered(0.04, 0.02, llama ? 0.34 : 0.26, 6);
  place(tail, 0, hipY + r * 1.4, -(bodyLen / 2 + r * 0.5), -0.9);
  parts.push({ geo: tail, color: colors.head });

  if (llama) {
    const hump = sphere(0.2);
    hump.scale(1, 0.6, 1.2);
    place(hump, 0, bodyTop - 0.02, -0.05);
    parts.push({ geo: hump, color: colors.body });
  }

  const legParts: Part[] = [];
  const leg = tapered(0.075, 0.05, legLen, 6);
  place(leg, 0, -legLen / 2, 0);
  legParts.push({ geo: leg, color: colors.leg });
  const hoof = tapered(0.06, 0.07, 0.08, 6);
  place(hoof, 0, -legLen + 0.04, 0);
  legParts.push({ geo: hoof, color: colors.hoof });

  return {
    body: mergeParts(parts),
    leg: mergeParts(legParts),
    hipY,
    legX: r * 0.62,
    legZFront: bodyLen / 2 - 0.05,
    legZBack: -(bodyLen / 2 - 0.05),
    shoulderX: 0,
    shoulderY: 0,
    shoulderZ: 0,
    ground: true,
    flyHeight: 0,
    stride: llama ? 5.2 : 6,
    flap: 0,
  };
}

function bird(id: 'condor' | 'pelican'): FaunaTemplate {
  const condor = id === 'condor';
  const parts: Part[] = [];
  const bodyColor = condor ? '#2b2b30' : '#e2e5e6';
  const bodyR = condor ? 0.19 : 0.18;
  const bodyLen = condor ? 0.62 : 0.5;

  const body = capsule(bodyR, bodyLen);
  place(body, 0, 0, 0, Math.PI / 2);
  parts.push({ geo: body, color: bodyColor });

  if (condor) {
    const collar = tapered(bodyR * 0.95, bodyR * 0.75, 0.12, 10);
    place(collar, 0, 0.02, bodyLen * 0.42, Math.PI / 2);
    parts.push({ geo: collar, color: '#e8e4dc' });
    const head = sphere(0.11);
    place(head, 0, 0.07, bodyLen * 0.5 + 0.12);
    parts.push({ geo: head, color: '#a53a2a' });
    const beak = new THREE.ConeGeometry(0.04, 0.16, 6);
    place(beak, 0, 0.05, bodyLen * 0.5 + 0.24, Math.PI / 2);
    parts.push({ geo: beak, color: '#d8c9a0' });
  } else {
    const head = sphere(0.1);
    place(head, 0, 0.06, bodyLen * 0.5 + 0.1);
    parts.push({ geo: head, color: bodyColor });
    const beak = tapered(0.03, 0.05, 0.34, 6);
    place(beak, 0, 0.02, bodyLen * 0.5 + 0.26, Math.PI / 2);
    parts.push({ geo: beak, color: '#d9822b' });
    const pouch = sphere(0.09);
    pouch.scale(1, 0.8, 1.5);
    place(pouch, 0, -0.04, bodyLen * 0.5 + 0.26);
    parts.push({ geo: pouch, color: '#c9741f' });
  }

  const tailW = condor ? 0.36 : 0.24;
  const tail = box(tailW, 0.03, condor ? 0.3 : 0.2, 0.01);
  place(tail, 0, 0, -(bodyLen / 2 + (condor ? 0.18 : 0.12)), -0.2);
  parts.push({ geo: tail, color: bodyColor });

  // swept wing in the XZ plane (span +X, chord Z, thin in Y)
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.45, 0.14);
  shape.lineTo(condor ? 1.25 : 0.82, 0.04);
  shape.lineTo(condor ? 1.05 : 0.7, -0.2);
  shape.lineTo(0.4, -0.2);
  shape.closePath();
  const wing = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  wing.rotateX(-Math.PI / 2);
  wing.translate(0, 0.02, 0);
  const wingParts: Part[] = [{ geo: wing, color: condor ? '#242428' : '#d3d8da' }];
  if (condor) {
    const tip = box(0.22, 0.045, 0.2, 0.01);
    place(tip, 1.05, 0.02, -0.02);
    wingParts.push({ geo: tip, color: '#e8e4dc' });
  }

  return {
    body: mergeParts(parts),
    wing: mergeParts(wingParts),
    hipY: 0,
    legX: 0,
    legZFront: 0,
    legZBack: 0,
    shoulderX: bodyR * 0.75,
    shoulderY: 0.05,
    shoulderZ: 0,
    ground: false,
    flyHeight: condor ? 10 : 6.5,
    stride: 0,
    flap: condor ? 1.3 : 2.3,
  };
}
