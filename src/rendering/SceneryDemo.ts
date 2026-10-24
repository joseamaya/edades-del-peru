import lod0Url from '../assets/scenery/caral/caral_pyramid_mayor_lod0.glb?url';
import lod1Url from '../assets/scenery/caral/caral_pyramid_mayor_lod1.glb?url';
import {
  mountStaticShowcase,
  SHOWCASE_SAND,
  SHOWCASE_SKY,
  type StaticShowcaseHandle,
  type StaticShowcaseOptions,
} from './StaticShowcase';

export type SceneryDemoHandle = StaticShowcaseHandle;

const options: StaticShowcaseOptions = {
  handleName: '__sceneryDemo',
  eyebrow: 'Blender GLB · Caral',
  title: 'Pirámide Mayor y Plaza',
  note: 'Piloto modular del complejo ceremonial. Excluye la Plaza Central, los puestos de mercado y el terreno. Visual-only hasta validar la huella en el RTS.',
  lod0Url,
  lod1Url,
  sky: SHOWCASE_SKY,
  fog: [60, 180],
  camera: {
    position: [16, 10, 20],
    target: [0, 1, 0],
    minDistance: 7,
    maxDistance: 90,
  },
  ground: { color: SHOWCASE_SAND, y: -0.17, size: 120 },
  shadow: { extent: 24, far: 100 },
  boundsLabel: (size) =>
    `Huella ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} · pivote centrado a nivel de suelo · Y-up · visual-only`,
};

export async function mountSceneryDemo(): Promise<SceneryDemoHandle> {
  return mountStaticShowcase(options);
}
