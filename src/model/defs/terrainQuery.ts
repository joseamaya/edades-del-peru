/** Common terrain predicates shared by the landscape and settlement planners. */
export interface TerrainQuery {
  isWater(x: number, z: number): boolean;
  isBuildable(x: number, z: number): boolean;
  getSlope(x: number, z: number): number;
}
