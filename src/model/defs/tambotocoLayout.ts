/**
 * Authored layout of the Tambotoco ayllu site (legendary Ayar route). The renderer only draws these
 * positions; the mission and the site colliders read the same data, so a hut cannot drift from its
 * blocker.
 */
export const TAMBOTOCO_CAVE = { x: 40, z: 55 } as const;
export const TAMBOTOCO_SHRINE = { x: 120, z: 106 } as const;
export const TAMBOTOCO_INTICANCHA = { x: 168, z: 190 } as const;
/** Levelled plaza radius and the cancha plot footprint the `inticancha` phase traces. */
export const TAMBOTOCO_PLAZA_RADIUS = 6;
export const AYLLU_CANCHA_SIZE = { w: 4.8, d: 4.0 } as const;
/** Huanacaure's three stepped tiers (top-down) and the height of each. */
export const TAMBOTOCO_SHRINE_TIERS = [
  { w: 9, d: 7.5 },
  { w: 7, d: 5.5 },
  { w: 5, d: 4 },
] as const;
export const TAMBOTOCO_SHRINE_TIER_HEIGHT = 0.75;

export type AylluHutKind = 'house' | 'storehouse' | 'shed';

export interface AylluHut {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly wall: number;
  /** Chimney smoke while its phase is standing. */
  readonly smoke: boolean;
  /** Silhouette the kit draws; defaults to a plastered house. */
  readonly kind?: AylluHutKind;
  /** Yaw in radians. */
  readonly ry?: number;
  /** Wall finish for a house; the qollqa and shed ignore it. */
  readonly wallColor?: 'earth' | 'plaster';
}

export const TAMBOTOCO_SHRINE_HUTS: readonly AylluHut[] = [
  { x: 112, z: 100, w: 2.6, d: 2.3, wall: 1.9, smoke: true },
  { x: 128, z: 101, w: 2.6, d: 2.3, wall: 1.9, smoke: true, kind: 'storehouse' },
];

export const TAMBOTOCO_CANCHAS = [
  { dx: TAMBOTOCO_INTICANCHA.x - 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x + 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z - 12 },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z + 12 },
];

export const TAMBOTOCO_INTICANCHA_HUTS: readonly AylluHut[] = [
  { x: 158, z: 176, w: 3.2, d: 2.8, wall: 2.1, smoke: true },
  { x: 180, z: 176, w: 3.2, d: 2.8, wall: 2.1, smoke: false, ry: 0.16, wallColor: 'earth' },
  { x: 162, z: 203, w: 3.2, d: 2.8, wall: 2.1, smoke: true },
  { x: 181, z: 203, w: 3.2, d: 2.8, wall: 2.1, smoke: false, kind: 'storehouse' },
  { x: 168, z: 172, w: 4.2, d: 2.8, wall: 2.1, smoke: true },
  { x: 168, z: 210, w: 3.2, d: 2.8, wall: 2.1, smoke: false, kind: 'storehouse' },
];

export const TAMBOTOCO_TERRACES = [
  { x: 140, z: 201, w: 21, d: 1.1, ry: 0.06 },
  { x: 187, z: 201, w: 20, d: 1.1, ry: -0.08 },
] as const;

export interface AylluField {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rows: number;
}

export interface AylluVillage {
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly huts: readonly AylluHut[];
  readonly field: AylluField;
}

export const TAMBOTOCO_VILLAGES: readonly AylluVillage[] = [
  {
    name: 'hualla',
    x: 138,
    z: 162,
    huts: [
      { x: 134, z: 160, w: 3, d: 2.6, wall: 2.0, smoke: true },
      { x: 142, z: 163, w: 3, d: 2.6, wall: 2.0, smoke: true, ry: 0.26, wallColor: 'earth' },
      { x: 138, z: 167, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'storehouse' },
      { x: 132, z: 166, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'shed', ry: -0.18 },
    ],
    field: { x: 131, z: 175, w: 10, d: 7, rows: 5 },
  },
  {
    name: 'sauaseray',
    x: 188,
    z: 214,
    huts: [
      { x: 184, z: 212, w: 3, d: 2.6, wall: 2.0, smoke: true },
      { x: 192, z: 215, w: 3, d: 2.6, wall: 2.0, smoke: true, ry: -0.24, wallColor: 'earth' },
      { x: 188, z: 219, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'storehouse' },
      { x: 182, z: 221, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'shed', ry: 0.2 },
    ],
    field: { x: 197, z: 209, w: 10, d: 7, rows: 5 },
  },
  {
    name: 'alcabizas',
    x: 198,
    z: 166,
    huts: [
      { x: 194, z: 164, w: 3, d: 2.6, wall: 2.0, smoke: true },
      { x: 202, z: 167, w: 3, d: 2.6, wall: 2.0, smoke: true, ry: 0.22, wallColor: 'earth' },
      { x: 198, z: 171, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'storehouse' },
      { x: 192, z: 174, w: 3, d: 2.6, wall: 2.0, smoke: false, kind: 'shed', ry: -0.22 },
    ],
    field: { x: 207, z: 161, w: 10, d: 7, rows: 5 },
  },
];

export const TAMBOTOCO_FIELDS: readonly AylluField[] = [
  { x: TAMBOTOCO_INTICANCHA.x - 22, z: TAMBOTOCO_INTICANCHA.z + 2, w: 12, d: 8, rows: 6 },
  { x: TAMBOTOCO_INTICANCHA.x + 22, z: TAMBOTOCO_INTICANCHA.z + 2, w: 12, d: 8, rows: 6 },
];

/** Footpaths that tie the hamlets, the shrine and Inticancha together (visual only). */
export interface AylluPath {
  readonly points: readonly { readonly x: number; readonly z: number }[];
  /** Metres. */
  readonly width: number;
}

export const TAMBOTOCO_PATHS: readonly AylluPath[] = [
  {
    width: 1.5,
    points: [
      { x: 120, z: 106 },
      { x: 126, z: 124 },
      { x: 132, z: 142 },
      { x: 138, z: 158 },
    ],
  },
  {
    width: 1.3,
    points: [
      { x: 150, z: 160 },
      { x: 144, z: 160 },
      { x: 139, z: 164 },
    ],
  },
  {
    width: 1.3,
    points: [
      { x: 176, z: 184 },
      { x: 186, z: 177 },
      { x: 196, z: 170 },
    ],
  },
  {
    width: 1.3,
    points: [
      { x: 176, z: 196 },
      { x: 182, z: 206 },
      { x: 188, z: 212 },
    ],
  },
  {
    width: 1.2,
    points: [
      { x: 162, z: 190 },
      { x: 154, z: 191 },
      { x: 147, z: 192 },
    ],
  },
];
