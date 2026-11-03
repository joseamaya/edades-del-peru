import { describe, expect, it } from 'vitest';
import { TerrainData } from '../src/sim/TerrainData';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { planCulturalLandscape, type LandscapeQuery } from '../src/model/defs/landscapePlan';
import { conformWallGeometry } from '../src/rendering/landscapeConform';

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
          const geo = conformWallGeometry({
            x: p.x,
            z: p.z,
            size: p.size,
            yaw: p.yaw,
            height: p.feature === 'wall' ? 0.9 : 1.2,
            depth: p.feature === 'wall' ? 0.3 : 0.35,
            offset: 0.03,
            getHeight: (x, z) => terrain.getHeight(x, z),
          });
          const pos = geo.getAttribute('position') as import('three').BufferAttribute;
          for (let i = 0; i < pos.count; i += 4) {
            const wx = pos.getX(i);
            const wz = pos.getZ(i);
            expect(Math.abs(pos.getY(i) - (terrain.getHeight(wx, wz) + 0.03))).toBeLessThan(0.011);
          }
          geo.dispose();
        }
      });
    }
  }
});
