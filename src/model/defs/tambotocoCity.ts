import { layoutBlockers, type ArchFootprint, type ArchPlacement, type ArchitectureKitId } from './architectureKit';
import { type SitePhasePlan } from './sitePhases';
import {
  TAMBOTOCO_CAVE,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_SHRINE,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from './tambotocoLayout';
import type { SiteBlocker } from './sites';

/**
 * Tambotoco's domestic architecture, drawn from the Killke/ayllu kit
 * (`scripts/blender/build_killke_architecture_kit.py`). Every hut, qollqa and ramada in
 * `tambotocoLayout.ts` is mapped to a kit piece here, and the same placement list yields the site
 * blockers, so what is drawn and what blocks cannot drift. The cave and Huanacaure heroes keep their
 * own GLBs; the paved plaza, canchas, terraces and fields are ground and stay procedural
 * (art-direction §4.2).
 */
export const KILLKE_KIT: ArchitectureKitId = 'killke';

/** The four acts are the site's construction phases; the gate is the `fundada` act card. */
export const TAMBOTOCO_PHASE_PLAN: SitePhasePlan = {
  phases: ['cave', 'huanacaure', 'inticancha', 'fundada'],
  initial: 'cave',
};

/** The summit slab of the shrine piece; the huaca rests on it. */
export const KILLKE_SHRINE_TOP = 2.41;

const HOUSE_WALL = 2.55;
const QOLLQA_WALL = 2.35;
const RAMADA_POST = 2.45;

interface Piece {
  /** Model footprint in metres, matching the GLB bounds of the LOD0 piece. */
  readonly width: number;
  readonly depth: number;
  readonly wall: number;
  /** Roof apex above the model datum. */
  readonly apex: number;
}

/** Model dimensions of each kit piece (see the manifests in `art-src/blender/exports/killke`). */
const PIECES = {
  house: { width: 6.4, depth: 4.4, wall: HOUSE_WALL, apex: 4.4 },
  house_earth: { width: 6.4, depth: 4.4, wall: HOUSE_WALL, apex: 4.35 },
  qollqa: { width: 3.2, depth: 3.2, wall: QOLLQA_WALL, apex: 4.21 },
  ramada: { width: 3.6, depth: 2.8, wall: RAMADA_POST, apex: 3.78 },
} as const satisfies Record<string, Piece>;

type HutPieceId = keyof typeof PIECES;

/**
 * Solid footprints in model space (game +Z = Blender -Y). They include the eaves, so no unit stands
 * under a roof and clips the wall; the buried plinth is inside them.
 */
export const KILLKE_KIT_FOOTPRINTS: Partial<Record<string, ArchFootprint>> = {
  house: { minX: -3.65, maxX: 3.65, minZ: -2.8, maxZ: 2.8 },
  house_earth: { minX: -3.6, maxX: 3.6, minZ: -2.75, maxZ: 2.75 },
  qollqa: { minX: -2.12, maxX: 2.12, minZ: -2.12, maxZ: 2.12 },
  ramada: { minX: -2.0, maxX: 2.0, minZ: -1.74, maxZ: 1.74 },
  shrine: { minX: -4.7, maxX: 4.7, minZ: -5.45, maxZ: 4.0 },
};

function pieceFor(hut: AylluHut): HutPieceId {
  if (hut.kind === 'storehouse') return 'qollqa';
  if (hut.kind === 'shed') return 'ramada';
  return hut.wallColor === 'earth' ? 'house_earth' : 'house';
}

/**
 * The authored hut scaled to its dimensions. Each piece is seated at the ground under its centre: a
 * hillside hut cuts into the slope and the buried footing shows as a coursed foundation downhill, the
 * same stance the procedural kit took.
 */
export function hutPlacement(hut: AylluHut, since?: string): ArchPlacement {
  const piece = pieceFor(hut);
  const model = PIECES[piece];
  return {
    asset: piece,
    x: hut.x,
    z: hut.z,
    rotY: hut.ry ?? 0,
    scale: [hut.w / model.width, hut.wall / model.wall, hut.d / model.depth],
    seat: 'centre',
    ...(since ? { since } : {}),
  };
}

/** Roof apex above the hut's ground, used to start its smoke at the ridge instead of mid-air. */
export function hutApex(hut: AylluHut): number {
  const model = PIECES[pieceFor(hut)];
  return model.apex * (hut.wall / model.wall);
}

/** Huanacaure's stepped platform; the huaca GLB sits on its summit slab. */
const SHRINE_PLACEMENT: ArchPlacement = {
  asset: 'shrine',
  x: TAMBOTOCO_SHRINE.x,
  z: TAMBOTOCO_SHRINE.z,
  rotY: 0,
  scale: [1, 1, 1],
};

/** All kit pieces of the site: the shrine, the two shrine huts, the three hamlets and Inticancha. */
export const TAMBOTOCO_KIT_LAYOUT: readonly ArchPlacement[] = [
  SHRINE_PLACEMENT,
  ...TAMBOTOCO_SHRINE_HUTS.map((hut) => hutPlacement(hut)),
  ...TAMBOTOCO_VILLAGES.flatMap((village) => village.huts.map((hut) => hutPlacement(hut))),
  ...TAMBOTOCO_INTICANCHA_HUTS.map((hut) => hutPlacement(hut, 'fundada')),
];

/**
 * The cave mouth is a hero GLB with its own authored footprint; every other solid piece comes from
 * the kit layout. The shrine's heritage proxy stays a separate heritage/camera contract.
 */
export function tambotocoBlockers(): SiteBlocker[] {
  return [
    { x: TAMBOTOCO_CAVE.x, z: TAMBOTOCO_CAVE.z, w: 11, d: 9 },
    ...layoutBlockers(TAMBOTOCO_KIT_LAYOUT, KILLKE_KIT_FOOTPRINTS),
  ];
}
