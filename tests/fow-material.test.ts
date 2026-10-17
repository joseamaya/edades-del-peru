import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyFow, applyFowToObject, createFowUniforms } from '../src/rendering/FowMaterial';

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
  it('injects the fog grid and shares the uniforms', () => {
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
    expect(material.userData.fow).toBe(fow);
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
