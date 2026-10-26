import { SCENERY_MODEL_URLS } from './sceneryModels';
import { SHOWCASE_SAND, SHOWCASE_SKY, type StaticShowcaseOptions } from './StaticShowcase';

export type SceneryAssetId = 'caral-pyramid-mayor' | 'caral-anfiteatro';

const shared = {
  handleName: '__sceneryDemo',
  eyebrow: 'Blender GLB · Caral',
  sky: SHOWCASE_SKY,
};

const visualOnlyBounds: StaticShowcaseOptions['boundsLabel'] = (size) =>
  `Huella ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} · pivote centrado a nivel de suelo · Y-up · visual-only`;

export const SCENERY_ASSETS: Record<SceneryAssetId, StaticShowcaseOptions> = {
  'caral-pyramid-mayor': {
    ...shared,
    title: 'Pirámide Mayor y Plaza',
    note: 'Piloto modular del complejo ceremonial. Excluye la Plaza Central, los puestos de mercado y el terreno. Visual-only hasta validar la huella en el RTS.',
    lod0Url: SCENERY_MODEL_URLS.caral_pyramid_mayor.lod0,
    lod1Url: SCENERY_MODEL_URLS.caral_pyramid_mayor.lod1,
    fog: [60, 180],
    camera: {
      position: [16, 10, 20],
      target: [0, 1, 0],
      minDistance: 7,
      maxDistance: 90,
    },
    ground: { color: SHOWCASE_SAND, y: -0.17, size: 120 },
    shadow: { extent: 24, far: 100 },
    boundsLabel: visualOnlyBounds,
  },
  'caral-anfiteatro': {
    ...shared,
    title: 'Anfiteatro y Altar',
    note: 'Templo del Anfiteatro + Altar Redondo + Templo de la Banqueta. La banqueta es una plataforma separada en el layout fuente. Visual-only hasta validar la huella en el RTS.',
    lod0Url: SCENERY_MODEL_URLS.caral_anfiteatro.lod0,
    lod1Url: SCENERY_MODEL_URLS.caral_anfiteatro.lod1,
    fog: [50, 160],
    camera: {
      position: [14, 8, 16],
      target: [0, 0.4, 0],
      minDistance: 6,
      maxDistance: 80,
    },
    ground: { color: SHOWCASE_SAND, y: -0.21, size: 100 },
    shadow: { extent: 20, far: 80 },
    boundsLabel: visualOnlyBounds,
  },
};

export function resolveSceneryAsset(value: string | null): SceneryAssetId | null {
  if (value === 'caral') return 'caral-pyramid-mayor';
  if (value === 'caral-anfiteatro') return 'caral-anfiteatro';
  return null;
}
