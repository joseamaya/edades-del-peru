/**
 * Authored layout of the colonial sites (Lima 1535, Cusco 1814). Positions are world metres; the
 * renderer draws them and `sites.ts` derives the blockers from the same data.
 */
export interface ColonialHouse {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly h: number;
  readonly ry: number;
}

export interface ColonialStall {
  readonly x: number;
  readonly z: number;
  readonly ry: number;
}

export interface ColonialLayout {
  readonly center: { x: number; z: number };
  readonly traza: readonly ColonialHouse[];
  readonly houses: readonly ColonialHouse[];
  readonly stalls: readonly ColonialStall[];
  readonly well: { x: number; z: number };
}

export const LIMA_COLONIAL: ColonialLayout = {
  center: { x: 90, z: 150 },
  // The traced plaza: provisional shelters and cord lines before the cabildo is raised.
  traza: [
    { x: 78, z: 140, w: 3.4, d: 3, h: 2.1, ry: 0.2 },
    { x: 102, z: 158, w: 3.4, d: 3, h: 2.1, ry: -0.25 },
    { x: 100, z: 139, w: 3.4, d: 3, h: 2.1, ry: 0.1 },
  ],
  houses: [
    { x: 76, z: 139, w: 4.2, d: 3.6, h: 3.1, ry: 0.05 },
    { x: 104, z: 139, w: 4.2, d: 3.6, h: 3.1, ry: -0.04 },
    { x: 75, z: 161, w: 4.2, d: 3.6, h: 3.1, ry: 0.02 },
    { x: 105, z: 161, w: 4.2, d: 3.6, h: 3.1, ry: -0.03 },
    { x: 84, z: 130, w: 4.6, d: 4, h: 3.5, ry: 0.08 },
    { x: 98, z: 130, w: 4.6, d: 4, h: 3.5, ry: -0.06 },
    { x: 84, z: 170, w: 4.6, d: 4, h: 3.5, ry: -0.02 },
    { x: 98, z: 170, w: 4.6, d: 4, h: 3.5, ry: 0.04 },
    { x: 68, z: 150, w: 4, d: 3.4, h: 3, ry: 0.1 },
    { x: 112, z: 150, w: 4, d: 3.4, h: 3, ry: -0.1 },
  ],
  stalls: [
    { x: 82, z: 144, ry: 0.2 },
    { x: 98, z: 144, ry: -0.2 },
    { x: 82, z: 156, ry: -0.15 },
    { x: 98, z: 156, ry: 0.15 },
  ],
  well: { x: 90, z: 159 },
};

export const CUSCO_COLONIAL: ColonialLayout = {
  center: { x: 72, z: 58 },
  traza: [],
  houses: [
    { x: 60, z: 48, w: 4.2, d: 3.6, h: 3.2, ry: 0.03 },
    { x: 84, z: 48, w: 4.2, d: 3.6, h: 3.2, ry: -0.03 },
    { x: 60, z: 68, w: 4.2, d: 3.6, h: 3.2, ry: -0.02 },
    { x: 84, z: 68, w: 4.2, d: 3.6, h: 3.2, ry: 0.04 },
    { x: 66, z: 40, w: 4.6, d: 4, h: 3.6, ry: 0.06 },
    { x: 78, z: 40, w: 4.6, d: 4, h: 3.6, ry: -0.05 },
    { x: 66, z: 76, w: 4.6, d: 4, h: 3.6, ry: -0.04 },
    { x: 78, z: 76, w: 4.6, d: 4, h: 3.6, ry: 0.02 },
  ],
  stalls: [
    { x: 64, z: 53, ry: 0.2 },
    { x: 80, z: 53, ry: -0.2 },
    { x: 64, z: 63, ry: -0.15 },
    { x: 80, z: 63, ry: 0.15 },
  ],
  well: { x: 72, z: 65 },
};

export const COLONIAL_LAYOUTS = {
  lima_site: LIMA_COLONIAL,
  cusco_junta_site: CUSCO_COLONIAL,
} as const;
