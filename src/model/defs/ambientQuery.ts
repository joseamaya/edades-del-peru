import type { TerrainQuery } from './terrainQuery';

/** Terrain facts the ambient props/fauna planners need (Terrain satisfies this). */
export interface AmbientQuery extends TerrainQuery {
  getHeight(x: number, z: number): number;
  isBeach(x: number, z: number): boolean;
  getMoisture(x: number, z: number): number;
}
