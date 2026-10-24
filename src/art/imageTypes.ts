import type { ImageType } from './types';

export interface ImageTypeRule {
  /** Player-facing label. */
  label: string;
  /** Final WebP dimensions. */
  width: number;
  height: number;
  /** Optional smaller variant width. */
  variantWidth?: number;
  /** Maximum size of the main WebP asset. */
  maxBytes: number;
}

/**
 * Output rules for Blender renders. The source PNG is produced outside the
 * repository; the ingestion step only resizes/crops and converts it to WebP.
 */
export const IMAGE_TYPE_RULES: Record<ImageType, ImageTypeRule> = {
  'campaign-intro': {
    label: 'Introducción de campaña',
    width: 1280,
    height: 720,
    variantWidth: 800,
    maxBytes: 450_000,
  },
  'campaign-scene': {
    label: 'Escena de campaña',
    width: 1280,
    height: 720,
    variantWidth: 800,
    maxBytes: 400_000,
  },
  educational: {
    label: 'Material didáctico',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  architecture: {
    label: 'Arquitectura histórica',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  'daily-life': {
    label: 'Vida cotidiana',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  technology: {
    label: 'Tecnología y oficios',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  agriculture: {
    label: 'Agricultura',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  religion: {
    label: 'Religión y ritual',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
  map: {
    label: 'Mapa histórico/educativo',
    width: 1280,
    height: 720,
    variantWidth: 800,
    maxBytes: 400_000,
  },
  environment: {
    label: 'Entorno natural',
    width: 1280,
    height: 720,
    variantWidth: 800,
    maxBytes: 400_000,
  },
  'character-reference': {
    label: 'Referencia de personaje y vestimenta',
    width: 768,
    height: 1024,
    maxBytes: 280_000,
  },
  'tour-concept': {
    label: 'Concept art para recorrido',
    width: 1280,
    height: 720,
    variantWidth: 800,
    maxBytes: 400_000,
  },
  reconstruction: {
    label: 'Reconstrucción histórica',
    width: 1280,
    height: 720,
    maxBytes: 350_000,
  },
};
