import { describe, expect, it } from 'vitest';
import { generateHeightField } from '../src/sim/heightField';
import { MAP_PROFILES } from '../src/model/defs/profiles';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { MapType, HistoricalPeriod } from '../src/core/types';

function relief(profile: (typeof MAP_PROFILES)[keyof typeof MAP_PROFILES], seed: number): number[] {
  const f = generateHeightField(96, seed, profile);
  return Array.from(f.heightMap);
}

describe('readable Andean relief', () => {
  it('keeps the relief deterministic and tall enough for valleys and ridges', () => {
    for (const profile of [MAP_PROFILES.andean_valley, MAP_PROFILES.high_andes, MAP_PROFILES.altiplano]) {
      const a = relief(profile, 777);
      const b = relief(profile, 777);
      expect(a).toEqual(b);
      const min = Math.min(...a);
      const max = Math.max(...a);
      expect(max - min).toBeGreaterThan(5);
    }
  });

  it('keeps both starting bases connected on andes and altiplano', () => {
    setAutoStart(false);
    for (const [mapType, period] of [
      ['andes', HistoricalPeriod.MIDDLE_HORIZON],
      ['altiplano', HistoricalPeriod.MIDDLE_HORIZON],
    ] as const) {
      for (const seed of [777, 4242]) {
        const game = new Game(
          {
            ...DEFAULT_SETTINGS,
            mapSize: 128,
            mapType: mapType as MapType,
            mapSeed: seed,
            period,
            startingEra: 2,
            fogOfWar: false,
            cinematic: false,
            showHints: false,
            soundEnabled: false,
          },
          null,
          null,
          false,
          true,
        );
        const ca = game.playerCenter(0);
        const cb = game.playerCenter(1);
        const a = game.pathfinder.nearestWalkablePoint(ca.x, ca.z) ?? ca;
        const b = game.pathfinder.nearestWalkablePoint(cb.x, cb.z) ?? cb;
        expect(game.pathfinder.isWalkable(a.x, a.z), `${mapType}/${seed} base A`).toBe(true);
        expect(game.pathfinder.isWalkable(b.x, b.z), `${mapType}/${seed} base B`).toBe(true);
        const path = game.pathfinder.pathfind(a.x, a.z, b.x, b.z, 0);
        expect(path.length, `${mapType}/${seed} path`).toBeGreaterThan(0);
        game.destroy();
      }
    }
    setAutoStart(true);
  });
});
