import * as THREE from 'three';
import { PostFX } from './PostFX';

/** Central WebGLRenderer configuration with shadows and ACES tone. */
export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  // PCF, not VSM: three's VSM also renders every shadow *receiver* into the shadow map, so a scene with
  // ~1 000 receiving meshes pays a second full draw for all of them. On the m8 opening that was 391 of
  // 823 calls; PCF draws only the casters. (PCFSoft is deprecated in r185 and falls back to PCF.)
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The map is redrawn once per frame from `RuntimeController.frameShadows`: a frame with
  // post-processing renders the scene twice (water refraction + composer) and three would otherwise
  // run the whole shadow pass inside each of them.
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.id = 'render-canvas';
  document.body.appendChild(renderer.domElement);
  return renderer;
}

/**
 * Keep every skinned mesh posed with the current frame's bones in every render.
 *
 * three (r185) culls and updates skeletons (`WebGLObjects.update`, keyed by `info.render.frame`) *before* it
 * increments that counter, and the shadow pass then updates the shadow casters again under the new value.
 * The next `render()` therefore sees the casters as already updated and skips them. When that render has no
 * shadow pass (`shadowMap.autoUpdate` is off here; a direct render, a capture, a paused frame), the unit's
 * body, its only caster, is drawn with the previous frame's bones while the merged gear (hat, weapon, coat,
 * hair: not casters) uses the current ones, so helmets and weapons float off the body as it moves.
 * Advancing the counter at the start of each render keeps the keys of two renders from colliding; a caster
 * is then updated once in the cull and once in the shadow pass of the same render, which is cheap.
 */
export function keepSkinningCurrent(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  const previous = scene.onBeforeRender;
  scene.onBeforeRender = (...args) => {
    renderer.info.render.frame++;
    previous.apply(scene, args);
  };
}

export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostFX {
  return new PostFX(renderer, scene, camera, window.innerWidth, window.innerHeight);
}
