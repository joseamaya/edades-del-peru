import { describe, expect, it } from 'vitest';
import { TerrainData } from '../src/sim/TerrainData';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { planCulturalLandscape, type LandscapeQuery } from '../src/model/defs/landscapePlan';
import { wallBaseSamples } from '../src/rendering/landscapeConform';

const PROFILES = [MAP_PROFILES.high_andes, MAP_PROFILES.altiplano] as const;

describe('cultural landscape conforms to terrain', () => {
  for (const seed of [777, 4242]) {
    for (const profile of PROFILES) {
      it(`${profile.id} seed ${seed}: wall and terrace bases sit on the terrain`, () => {
        const terrain = new TerrainData(128, 96, seed, profile);
        const q: LandscapeQuery = {
          size: terrain.size,
          isWater: (x, z) => terrain.isWater(x, z),
          isBuildable: (x, z) => terrain.isBuildable(x, z),
          getSlope: (x, z) => terrain.getSlope(x, z),
          getTerrace: (x, z) => terrain.getTerrace(x, z),
        };
        const plan = planCulturalLandscape(profile.culturalLandscape!, seed, q);
        const rows = plan.filter((p) => p.chain === undefined && (p.feature === 'wall' || p.feature === 'terrace'));
        expect(rows.length).toBeGreaterThan(0);
        for (const p of rows) {
          const opts = {
            x: p.x,
            z: p.z,
            size: p.size,
            yaw: p.yaw,
            height: p.feature === 'wall' ? 0.9 : 1.2,
            depth: p.feature === 'wall' ? 0.3 : 0.35,
            offset: 0.03,
            getHeight: (x: number, z: number) => terrain.getHeight(x, z),
          };
          const samples = wallBaseSamples(opts);
          for (const sample of samples) {
            for (const point of [sample.front, sample.back]) {
              expect(Math.abs(point.y - (terrain.getHeight(point.x, point.z) + 0.03))).toBeLessThan(0.011);
            }
          }
          for (let i = 0; i < samples.length - 1; i++) {
            for (const side of ['front', 'back'] as const) {
              const a = samples[i][side];
              const b = samples[i + 1][side];
              const midX = (a.x + b.x) / 2;
              const midZ = (a.z + b.z) / 2;
              const midY = (a.y + b.y) / 2;
              expect(Math.abs(midY - (terrain.getHeight(midX, midZ) + 0.03))).toBeLessThan(0.11);
            }
          }
        }
      });
    }
  }
});
