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
  // PCFSoft, not VSM: three's VSM also renders every shadow *receiver* into the shadow map, so a
  // scene with ~1 000 receiving meshes pays a second full draw for all of them. On the m8 opening that
  // was 391 of 823 calls; PCFSoft draws only the casters and drops the two VSM blur passes.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostFX {
  return new PostFX(renderer, scene, camera, window.innerWidth, window.innerHeight);
}
