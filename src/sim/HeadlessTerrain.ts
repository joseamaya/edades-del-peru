import { TerrainData } from './TerrainData';
import type { HistoricalMapProfile } from '../model/defs/profiles';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import type { AuthoredSiteDef } from '../model/defs/sites';

/** Terrain data facade used when the match runs without a renderer. */
export class HeadlessTerrain {
  readonly data: TerrainData;
  readonly heightMap: Float32Array;
  readonly moistureMap: Float32Array;
  readonly terraceMap: Float32Array;
  readonly canalMap: Float32Array;
  readonly canalPaths: { x: number; z: number }[][];
  readonly waterLevel: number;
  readonly size: number;
  readonly resolution: number;

  constructor(
    size: number,
    resolution: number,
    seed: number,
    profile: HistoricalMapProfile,
    layout?: TerrainLayout,
    site?: AuthoredSiteDef,
  ) {
    this.data = new TerrainData(size, resolution, seed, profile, layout, site);
    this.heightMap = this.data.heightMap;
    this.moistureMap = this.data.moistureMap;
    this.terraceMap = this.data.terraceMap;
    this.canalMap = this.data.canalMap;
    this.canalPaths = this.data.canalPaths;
    this.waterLevel = this.data.waterLevel;
    this.size = size;
    this.resolution = resolution;
  }

  getHeight(x: number, z: number): number {
    return this.data.getHeight(x, z);
  }
  getSlope(x: number, z: number): number {
    return this.data.getSlope(x, z);
  }
  getMoisture(x: number, z: number): number {
    return this.data.getMoisture(x, z);
  }
  getTerrace(x: number, z: number): number {
    return this.data.getTerrace(x, z);
  }
  getCanal(x: number, z: number): number {
    return this.data.getCanal(x, z);
  }
  getCanalPaths(): { x: number; z: number }[][] {
    return this.data.getCanalPaths();
  }
  isWater(x: number, z: number): boolean {
    return this.data.isWater(x, z);
  }
  isBeach(x: number, z: number): boolean {
    return this.data.isBeach(x, z);
  }
  isBuildable(x: number, z: number): boolean {
    return this.data.isBuildable(x, z);
  }
  update(): void {}
  setSunLight(): void {}
  setHemisphere(): void {}
  setCloudShadow(): void {}
  setFow(): void {}
  setLowDetail(): void {}
  getTexture(): null {
    return null;
  }
  dispose(): void {}
}
