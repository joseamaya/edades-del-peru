import { describe, expect, it } from 'vitest';
import { mTambotoco } from '../src/campaign/defs/missions/m_tambotoco';
import { resolveMapProfile } from '../src/model/defs/profiles';
import { getAuthoredSite } from '../src/model/defs/sites';
import {
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../src/model/defs/tambotocoLayout';
import { TerrainData } from '../src/sim/TerrainData';

const SITE = getAuthoredSite(mTambotoco.layout?.site?.id)!;
const HEIGHTFIELD = SITE.heightField!;
const PROFILE = resolveMapProfile({
  period: mTambotoco.period,
  civ: mTambotoco.playerCiv,
  mapType: mTambotoco.map.type,
});
const TERRAIN = new TerrainData(
  mTambotoco.map.size,
  HEIGHTFIELD.size - 1,
  mTambotoco.map.seed,
  PROFILE,
  mTambotoco.layout?.terrain,
  SITE,
);

function huts(): { name: string; hut: AylluHut }[] {
  return [
    ...TAMBOTOCO_SHRINE_HUTS.map((hut) => ({ name: 'shrine', hut })),
    ...TAMBOTOCO_VILLAGES.flatMap((v) => v.huts.map((hut) => ({ name: v.name, hut }))),
    ...TAMBOTOCO_INTICANCHA_HUTS.map((hut) => ({ name: 'inticancha', hut })),
  ];
}

describe('Tambotoco authored huts', () => {
  it('stands every hut on dry, buildable ground (centre and footprint corners)', () => {
    for (const { name, hut } of huts()) {
      const points = [
        [hut.x, hut.z],
        [hut.x - hut.w / 2, hut.z - hut.d / 2],
        [hut.x + hut.w / 2, hut.z - hut.d / 2],
        [hut.x - hut.w / 2, hut.z + hut.d / 2],
        [hut.x + hut.w / 2, hut.z + hut.d / 2],
      ] as const;
      for (const [x, z] of points) {
        expect(TERRAIN.isWater(x, z), `${name} hut at ${hut.x},${hut.z} touches water at ${x},${z}`).toBe(false);
        expect(TERRAIN.isBuildable(x, z), `${name} hut at ${hut.x},${hut.z} is not buildable at ${x},${z}`).toBe(true);
      }
    }
  });

  it('does not overlap two hut footprints', () => {
    const all = huts();
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!;
        const b = all[j]!;
        const overlapX = Math.abs(a.hut.x - b.hut.x) < (a.hut.w + b.hut.w) / 2;
        const overlapZ = Math.abs(a.hut.z - b.hut.z) < (a.hut.d + b.hut.d) / 2;
        expect(overlapX && overlapZ, `${a.name} ${a.hut.x},${a.hut.z} overlaps ${b.name} ${b.hut.x},${b.hut.z}`).toBe(
          false,
        );
      }
    }
  });
});
