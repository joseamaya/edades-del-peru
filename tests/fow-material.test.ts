import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyFow, applyFowToObject, createFowUniforms } from '../src/rendering/FowMaterial';
import { FOW_DIM_GLSL, FOW_ZONES, fowDimFactor } from '../src/rendering/fowGlsl';

function runCompile(material: THREE.Material): { uniforms: Record<string, unknown>; vertex: string; fragment: string } {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: '#include <common>\n#include <project_vertex>',
    fragmentShader: '#include <common>\n#include <opaque_fragment>',
  };
  material.onBeforeCompile(shader as never, null as never);
  return { uniforms: shader.uniforms, vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

describe('applyFow', () => {
  it('injects the shared fog grid and uniforms', () => {
    const material = new THREE.MeshStandardMaterial();
    const fow = createFowUniforms();
    applyFow(material, fow);

    const { uniforms, vertex, fragment } = runCompile(material);
    expect(uniforms.fowMap).toBe(fow.fowMap);
    expect(uniforms.fowEnabled).toBe(fow.fowEnabled);
    expect(uniforms.fowMapSize).toBe(fow.mapSize);
    expect(vertex).toContain('vFowWorld');
    expect(fragment).toContain('uniform sampler2D fowMap');
    expect(fragment).toContain('texture2D(fowMap');
    expect(fragment).toContain('fowDim(');
    expect(material.userData.fow).toBe(fow);
  });

  it('chains any pre-existing onBeforeCompile', () => {
    const material = new THREE.MeshStandardMaterial();
    let previousCalls = 0;
    material.onBeforeCompile = () => {
      previousCalls++;
    };
    applyFow(material, createFowUniforms());
    runCompile(material);
    expect(previousCalls).toBe(1);
  });
});

describe('fowDimFactor', () => {
  it('black in unexplored, clear when visible, and a dim step in between', () => {
    expect(fowDimFactor(0)).toBe(0);
    expect(fowDimFactor(1)).toBe(1);
    const explored = fowDimFactor(150 / 255);
    expect(explored).toBeGreaterThan(0);
    expect(explored).toBeLessThan(FOW_ZONES.exploredDim + 0.05);
    expect(fowDimFactor(0)).toBeLessThan(explored);
    expect(explored).toBeLessThan(fowDimFactor(1));
  });

  it('the GLSL curve is generated from the same zones', () => {
    expect(FOW_DIM_GLSL).toContain(String(FOW_ZONES.exploredLow));
    expect(FOW_DIM_GLSL).toContain(String(FOW_ZONES.exploredDim));
    expect(FOW_DIM_GLSL).toContain('fowDim(');
  });
});

describe('applyFowToObject', () => {
  it('patches every unique mesh material once', () => {
    const fow = createFowUniforms();
    const shared = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BufferGeometry(), shared));
    root.add(new THREE.Mesh(new THREE.BufferGeometry(), shared));

    applyFowToObject(root, fow);
    expect(shared.userData.fow).toBe(fow);
    expect(root.children.every((c) => (c as THREE.Mesh).material === shared)).toBe(true);
  });
});
