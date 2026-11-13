/**
 * Authored layout of the Tambotoco ayllu site (legendary Ayar route). The renderer only draws these
 * positions; the mission and the site colliders read the same data, so a hut cannot drift from its
 * blocker.
 */
export const TAMBOTOCO_CAVE = { x: 40, z: 55 } as const;
export const TAMBOTOCO_SHRINE = { x: 120, z: 106 } as const;
export const TAMBOTOCO_INTICANCHA = { x: 168, z: 190 } as const;

export interface AylluHut {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly wall: number;
  /** Chimney smoke while its phase is standing. */
  readonly smoke: boolean;
}

export const TAMBOTOCO_CAVE_HUTS: readonly AylluHut[] = [
  { x: 32, z: 58, w: 3.2, d: 2.8, wall: 1.5, smoke: true },
  { x: 50, z: 58, w: 3.2, d: 2.8, wall: 1.5, smoke: true },
  { x: 36, z: 70, w: 3.2, d: 2.8, wall: 1.5, smoke: true },
];

export const TAMBOTOCO_SHRINE_HUTS: readonly AylluHut[] = [
  { x: 112, z: 100, w: 2.6, d: 2.3, wall: 1.3, smoke: true },
  { x: 128, z: 101, w: 2.6, d: 2.3, wall: 1.3, smoke: true },
];

export const TAMBOTOCO_CANCHAS = [
  { dx: TAMBOTOCO_INTICANCHA.x - 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x + 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z - 12 },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z + 12 },
];

export const TAMBOTOCO_INTICANCHA_HUTS: readonly AylluHut[] = [
  { x: 156, z: 176, w: 3.2, d: 2.8, wall: 1.5, smoke: true },
  { x: 180, z: 176, w: 3.2, d: 2.8, wall: 1.5, smoke: false },
  { x: 155, z: 203, w: 3.2, d: 2.8, wall: 1.5, smoke: true },
  { x: 181, z: 203, w: 3.2, d: 2.8, wall: 1.5, smoke: false },
  { x: 168, z: 172, w: 4.2, d: 2.8, wall: 1.5, smoke: true },
  { x: 168, z: 210, w: 3.2, d: 2.8, wall: 1.5, smoke: false },
];

export const TAMBOTOCO_TERRACES = [
  { x: 150, z: 201, w: 22, d: 1.1, ry: 0.06 },
  { x: 187, z: 201, w: 20, d: 1.1, ry: -0.08 },
  { x: 151, z: 176, w: 18, d: 1.1, ry: -0.04 },
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
      { x: 134, z: 160, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 142, z: 163, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 138, z: 167, w: 3, d: 2.6, wall: 1.4, smoke: false },
      { x: 136, z: 168, w: 3, d: 2.6, wall: 1.4, smoke: false },
    ],
    field: { x: 147, z: 157, w: 10, d: 7, rows: 5 },
  },
  {
    name: 'sauaseray',
    x: 188,
    z: 214,
    huts: [
      { x: 184, z: 212, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 192, z: 215, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 188, z: 219, w: 3, d: 2.6, wall: 1.4, smoke: false },
      { x: 186, z: 220, w: 3, d: 2.6, wall: 1.4, smoke: false },
    ],
    field: { x: 197, z: 209, w: 10, d: 7, rows: 5 },
  },
  {
    name: 'alcabizas',
    x: 198,
    z: 166,
    huts: [
      { x: 194, z: 164, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 202, z: 167, w: 3, d: 2.6, wall: 1.4, smoke: true },
      { x: 198, z: 171, w: 3, d: 2.6, wall: 1.4, smoke: false },
      { x: 196, z: 172, w: 3, d: 2.6, wall: 1.4, smoke: false },
    ],
    field: { x: 207, z: 161, w: 10, d: 7, rows: 5 },
  },
];

export const TAMBOTOCO_FIELDS: readonly AylluField[] = [
  { x: TAMBOTOCO_INTICANCHA.x - 22, z: TAMBOTOCO_INTICANCHA.z + 2, w: 12, d: 8, rows: 6 },
  { x: TAMBOTOCO_INTICANCHA.x + 22, z: TAMBOTOCO_INTICANCHA.z + 2, w: 12, d: 8, rows: 6 },
];
