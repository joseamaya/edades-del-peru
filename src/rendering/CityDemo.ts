import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import cityLod0Url from '../assets/cities/caral_city_lod0.glb?url';
import cityLod1Url from '../assets/cities/caral_city_lod1.glb?url';
import { disposeStaticGltf, loadStaticGltf } from './StaticModel';

const SKY = '#c9d6df';
const SAND = '#c8b088';
const GROUND_Y = -0.22;

export interface CityDemoHandle {
  bounds: { x: number; y: number; z: number };
  lod0Triangles: number;
  lod1Triangles: number;
  drawCalls: number;
  materials: string[];
  readonly lodLevel: 0 | 1;
  setLod(level: 0 | 1): void;
  dispose(): void;
}

function triangleCount(root: THREE.Object3D): number {
  let triangles = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    if (!geometry) return;
    triangles += (geometry.index ? geometry.index.count : geometry.getAttribute('position').count) / 3;
  });
  return triangles;
}

function meshCount(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) count++;
  });
  return count;
}

function materialNames(root: THREE.Object3D): string[] {
  const names = new Set<string>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) if (material?.name) names.add(material.name);
  });
  return [...names].sort();
}

/**
 * The Blender GLB exports MAT-Sand_Desert without a baseColorFactor, so three.js
 * falls back to white. Use a sandy colour in the viewer until the material is
 * fixed in the source export.
 */
function fixMaterials(root: THREE.Object3D): void {
  const sand = new THREE.Color(SAND);
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (material instanceof THREE.MeshStandardMaterial && material.name === 'MAT-Sand_Desert') {
        material.color.copy(sand);
        material.roughness = 0.95;
        material.needsUpdate = true;
      }
    }
  });
}

function overlayHtml(): string {
  return `
    <style>
      #city-demo-ui { position: fixed; inset: 0; pointer-events: none; z-index: 100; color: #f0ece2;
        font-family: "Bahnschrift", "Arial Narrow", "Segoe UI", sans-serif; }
      #city-demo-ui .panel { position: absolute; left: 16px; top: 16px; width: min(400px, 90vw);
        background: rgba(16, 18, 22, 0.9); border: 1px solid rgba(232, 195, 106, 0.35);
        border-radius: 8px; padding: 14px 16px; pointer-events: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55); }
      #city-demo-ui .eyebrow { color: #d8b45a; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
      #city-demo-ui h1 { margin: 2px 0 6px; font-family: Georgia, serif; font-size: 22px; color: #e8c36a; }
      #city-demo-ui p { margin: 4px 0; color: #c9c4b8; font-size: 12px; line-height: 1.5; }
      #city-demo-ui .row { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 4px; }
      #city-demo-ui button { pointer-events: auto; cursor: pointer; border-radius: 4px;
        border: 1px solid rgba(232, 195, 106, 0.35); background: rgba(30, 33, 40, 0.9);
        color: #f0ece2; padding: 6px 10px; font-size: 12px; font-weight: 600; }
      #city-demo-ui button:hover, #city-demo-ui button.active { border-color: #e8c36a; color: #e8c36a; }
      #city-demo-ui .note { color: #d8b45a; margin-top: 8px; }
      #city-demo-ui .error { color: #ff8a80; }
    </style>
    <div class="panel">
      <div class="eyebrow">Blender GLB · Caral</div>
      <h1>Ciudad Sagrada</h1>
      <p class="stats"></p>
      <p class="bounds"></p>
      <div class="row">
        <button data-lod="0" class="active">LOD0</button>
        <button data-lod="1">LOD1</button>
        <button data-reset>Reset cámara</button>
        <button data-close>Volver</button>
      </div>
      <p class="note">MAT-Sand_Desert corregido en el visor: el GLB no exporta su baseColor.
        Los puestos de plaza deben revisarse contra la nota histórica de Caral antes de la campaña.</p>
      <p class="error"></p>
    </div>
  `;
}

export async function mountCityDemo(): Promise<CityDemoHandle> {
  const container = document.getElementById('app') ?? document.body;
  container.style.cssText = 'position:fixed;inset:0;overflow:hidden;';

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 90, 240);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(28, 16, 34);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 160;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xdfe8ef, 0x8a7a5a, 1.15));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.3);
  sun.position.set(38, 62, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.35);
  fill.position.set(-40, 25, -30);
  scene.add(fill);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: SAND, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  const overlay = document.createElement('div');
  overlay.id = 'city-demo-ui';
  overlay.innerHTML = overlayHtml();
  document.body.appendChild(overlay);
  const stats = overlay.querySelector('.stats') as HTMLElement;
  const boundsEl = overlay.querySelector('.bounds') as HTMLElement;
  const errorEl = overlay.querySelector('.error') as HTMLElement;
  const lodButtons = [...overlay.querySelectorAll<HTMLButtonElement>('[data-lod]')];
  const resetButton = overlay.querySelector('[data-reset]') as HTMLButtonElement;
  const closeButton = overlay.querySelector('[data-close]') as HTMLButtonElement;

  let lod0: THREE.Group | null = null;
  let lod1: THREE.Group | null = null;
  let lod: THREE.LOD | null = null;
  let currentLod: 0 | 1 = 0;

  const onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', onResize);

  const dispose = (): void => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', onResize);
    controls.dispose();
    if (lod0) disposeStaticGltf(lod0);
    if (lod1) disposeStaticGltf(lod1);
    ground.geometry.dispose();
    (ground.material as THREE.Material).dispose();
    renderer.dispose();
    renderer.domElement.remove();
    overlay.remove();
    delete (window as { __cityDemo?: unknown }).__cityDemo;
  };

  const setLod = (level: 0 | 1): void => {
    if (!lod) return;
    currentLod = level;
    lod.levels.forEach((entry, index) => {
      entry.object.visible = index === level;
    });
    for (const button of lodButtons) button.classList.toggle('active', button.dataset.lod === String(level));
  };

  resetButton.addEventListener('click', () => {
    camera.position.set(28, 16, 34);
    controls.target.set(0, 1, 0);
    controls.update();
  });
  closeButton.addEventListener('click', () => {
    dispose();
    location.href = './';
  });
  for (const button of lodButtons) {
    button.addEventListener('click', () => setLod(button.dataset.lod === '1' ? 1 : 0));
  }

  try {
    const [city0, city1] = await Promise.all([loadStaticGltf(cityLod0Url), loadStaticGltf(cityLod1Url)]);
    lod0 = city0;
    lod1 = city1;
    fixMaterials(city0);
    fixMaterials(city1);

    const box = new THREE.Box3().setFromObject(city0);
    const size = box.getSize(new THREE.Vector3());
    const triangles0 = triangleCount(city0);
    const triangles1 = triangleCount(city1);
    const materials = materialNames(city0);
    const drawCalls = meshCount(city0);

    lod = new THREE.LOD();
    lod.addLevel(city0, 0);
    lod.addLevel(city1, 45);
    lod.autoUpdate = false;
    scene.add(lod);
    setLod(0);

    stats.textContent = `LOD0 ${triangles0.toLocaleString('es')} tris · LOD1 ${triangles1.toLocaleString('es')} tris · ${drawCalls} draw calls · ${materials.length} materiales`;
    boundsEl.textContent = `Huella ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} · pivote centrado a nivel de suelo · Y-up · escalera +Z`;

    const handle: CityDemoHandle = {
      bounds: { x: size.x, y: size.y, z: size.z },
      lod0Triangles: triangles0,
      lod1Triangles: triangles1,
      drawCalls,
      materials,
      get lodLevel() {
        return currentLod;
      },
      setLod,
      dispose,
    };
    (window as { __cityDemo?: CityDemoHandle }).__cityDemo = handle;

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });
    return handle;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorEl.textContent = `No se pudo cargar el GLB: ${message}`;
    console.error('[city]', error);
    throw error;
  }
}
