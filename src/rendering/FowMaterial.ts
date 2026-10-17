import * as THREE from 'three';
import { FOW_DIM_GLSL } from './fowGlsl';

/** Shared uniforms so every fogged material samples the same grid (see `Fow`). */
export interface FowUniforms {
  fowMap: { value: THREE.Texture | null };
  fowEnabled: { value: number };
  mapSize: { value: number };
}

/** Create the shared fog-of-war uniforms (assigned to materials by `applyFow`). */
export function createFowUniforms(): FowUniforms {
  return { fowMap: { value: null }, fowEnabled: { value: 0 }, mapSize: { value: 0 } };
}

/**
 * Dim `material` with the fog-of-war grid, matching the terrain shader
 * (`Terrain.ts`, via the shared `FOW_DIM_GLSL`): unexplored black, explored
 * dimmed, currently visible clear. The grid is sampled in world XZ, so the layer
 * dims glued to the relief without a second visibility system. The uniforms are
 * shared, so toggling fog updates every patched material at once.
 */
export function applyFow(material: THREE.Material, u: FowUniforms): void {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.fowMap = u.fowMap;
    shader.uniforms.fowEnabled = u.fowEnabled;
    shader.uniforms.fowMapSize = u.mapSize;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFowWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n  vFowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform sampler2D fowMap;\nuniform float fowEnabled;\nuniform float fowMapSize;\nvarying vec3 vFowWorld;\n${FOW_DIM_GLSL}`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        if (fowEnabled > 0.5) {
          float fowValue = texture2D(fowMap, vFowWorld.xz / fowMapSize).r;
          float fow = fowDim(fowValue);
          gl_FragColor.rgb *= fow;
          gl_FragColor.a *= fow;
        }`,
      );
  };
  material.customProgramCacheKey = () => 'fow-v1';
  material.userData.fow = u;
  material.needsUpdate = true;
}

/** Apply the fog grid to every (unique) mesh material under `root`. */
export function applyFowToObject(root: THREE.Object3D, u: FowUniforms): void {
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      applyFow(m, u);
    }
  });
}
