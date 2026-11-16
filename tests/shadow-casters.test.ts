import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { limitShadowCasters, RIG_SHADOW_COVERAGE } from '../src/rendering/shadowCasters';

function mesh(triangles: number, visible = true): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(triangles * 3 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  m.castShadow = true;
  m.visible = visible;
  return m;
}

function rig(...meshes: THREE.Mesh[]): THREE.Group {
  const root = new THREE.Group();
  for (const m of meshes) root.add(m);
  return root;
}

describe('limitShadowCasters', () => {
  it('keeps the few meshes that make the silhouette and drops the detail ones', () => {
    const body = mesh(2400);
    const tunic = mesh(1000);
    const hair = mesh(780);
    const eyes = mesh(760);
    const eyebrows = mesh(16);
    const root = rig(body, tunic, hair, eyes, eyebrows);
    expect(limitShadowCasters(root)).toBe(2);
    expect([body, tunic].every((m) => m.castShadow)).toBe(true);
    expect([hair, eyes, eyebrows].some((m) => m.castShadow)).toBe(false);
  });

  it('never turns a caster on', () => {
    const body = mesh(2400);
    const tunic = mesh(1000);
    tunic.castShadow = false;
    limitShadowCasters(rig(body, tunic), 1);
    expect(body.castShadow).toBe(true);
    expect(tunic.castShadow).toBe(false);
  });

  it('keeps one caster even when it is smaller than the coverage', () => {
    const small = mesh(10);
    expect(limitShadowCasters(rig(small))).toBe(1);
    expect(small.castShadow).toBe(true);
  });

  it('ignores hidden meshes, so a hidden gender variant never casts', () => {
    const body = mesh(2400);
    const hidden = mesh(2400, false);
    const root = rig(body, hidden);
    expect(limitShadowCasters(root)).toBe(1);
    expect(body.castShadow).toBe(true);
    expect(hidden.castShadow).toBe(true);
  });

  it('covers the declared share of the visible triangles', () => {
    const big = mesh(1000);
    const mid = mesh(600);
    const small = mesh(400);
    const root = rig(big, mid, small);
    limitShadowCasters(root, RIG_SHADOW_COVERAGE);
    const covered = [big, mid, small].filter((m) => m.castShadow).length;
    expect(covered).toBe(2);
  });
});
