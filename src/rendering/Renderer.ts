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
  renderer.shadowMap.type = THREE.VSMShadowMap;
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
