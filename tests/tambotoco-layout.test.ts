import { describe, expect, it } from 'vitest';
import { mTambotoco } from '../src/campaign/defs/missions/m_tambotoco';
import { resolveMapProfile } from '../src/model/defs/profiles';
import { getAuthoredSite } from '../src/model/defs/sites';
import {
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_FIELDS,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_PLAZA_RADIUS,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_TERRACES,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../src/model/defs/tambotocoLayout';
import { canchaPlot, pavedPlaza, type Parts } from '../src/rendering/aylluKit';
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

  it('paints a wet sand margin on the stream bank and a gravel bar at the ford', () => {
    // The heightfield stays as it was; the paint moves sand/dirt, so resource placement carries a replay bump.
    const ground = (x: number, z: number) => TERRAIN.getAuthoredGround(x, z)!;
    const bank = ground(150.5, 214);
    expect(bank[2], 'the wet margin is sandier than the grass').toBeGreaterThan(bank[0]);
    expect(bank[2]).toBeGreaterThan(0.3);
    const ford = ground(153.5, 190);
    expect(ford[2], 'the ford bar reads as gravel').toBeGreaterThan(0.45);
    expect(ford[0]).toBeLessThan(0.2);
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

  it('plants every field and terrace on dry, gently sloping ground', () => {
    const plots: { name: string; kind: 'field' | 'terrace'; x: number; z: number; w: number; d: number }[] = [
      ...TAMBOTOCO_VILLAGES.map((v) => ({ name: `${v.name} field`, kind: 'field' as const, ...v.field })),
      ...TAMBOTOCO_FIELDS.map((f, i) => ({ name: `inticancha field ${i}`, kind: 'field' as const, ...f })),
      ...TAMBOTOCO_TERRACES.map((t, i) => ({ name: `terrace ${i}`, kind: 'terrace' as const, ...t })),
    ];
    for (const plot of plots) {
      let min = Infinity;
      let max = -Infinity;
      // Sample the whole footprint: a 3×3 grid missed the stream crossing a 22 m terrace.
      for (let dz = -plot.d / 2; dz <= plot.d / 2 + 1e-6; dz += 0.5) {
        for (let dx = -plot.w / 2; dx <= plot.w / 2 + 1e-6; dx += 0.5) {
          const x = plot.x + dx;
          const z = plot.z + dz;
          expect(TERRAIN.isWater(x, z), `${plot.name} touches water at ${x},${z}`).toBe(false);
          const h = TERRAIN.getHeight(x, z);
          min = Math.min(min, h);
          max = Math.max(max, h);
        }
      }
      // A retaining terrace may step the slope; a field must not become a mesa.
      const limit = plot.kind === 'terrace' ? 3.6 : 2.2;
      expect(max - min, `${plot.name} spans ${(max - min).toFixed(1)} m`).toBeLessThan(limit);
    }
  });

  it('lays every cancha on the ground the player builds on', () => {
    for (const cancha of TAMBOTOCO_CANCHAS) {
      const parts: Parts = [];
      const floor = canchaPlot(parts, cancha.dx, cancha.dz, TAMBOTOCO_INTICANCHA, (x, z) => TERRAIN.getHeight(x, z));
      // `a4_canchas` places a house at the plot centre on the terrain height, so the floor must be at grade.
      const centre = TERRAIN.getHeight(cancha.dx, cancha.dz);
      expect(Math.abs(floor - (centre + 0.1)), `cancha at ${cancha.dx},${cancha.dz}`).toBeLessThan(0.01);
      for (const g of parts) {
        const position = g.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i);
          const y = position.getY(i);
          const z = position.getZ(i);
          expect(TERRAIN.isWater(x, z), `cancha at ${cancha.dx},${cancha.dz} touches water at ${x},${z}`).toBe(false);
          // A rigid paving stone may be partly buried on the slope, but never floats or forms a podium.
          const offset = y - TERRAIN.getHeight(x, z);
          expect(offset, `cancha vertex at ${x.toFixed(1)},${z.toFixed(1)}`).toBeGreaterThan(-0.7);
          expect(offset).toBeLessThan(1);
        }
      }
      // The floor mesh itself (the first part) follows the ground vertex by vertex.
      const floorGeometry = parts[0]!;
      const position = floorGeometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const offset = position.getY(i) - TERRAIN.getHeight(position.getX(i), position.getZ(i));
        expect(Math.abs(offset)).toBeLessThan(0.11);
      }
      parts.forEach((g) => g.dispose());
    }
  });

  it('paves Inticancha at grade so the communal store is not sunk', () => {
    const parts: Parts = [];
    const height = (x: number, z: number): number => TERRAIN.getHeight(x, z);
    const top = pavedPlaza(parts, TAMBOTOCO_INTICANCHA.x, TAMBOTOCO_INTICANCHA.z, TAMBOTOCO_PLAZA_RADIUS, height);
    // `a4_inticancha` places the mill at the plaza centre on the terrain height.
    expect(Math.abs(top - (height(TAMBOTOCO_INTICANCHA.x, TAMBOTOCO_INTICANCHA.z) + 0.12))).toBeLessThan(0.01);
    for (let dz = -TAMBOTOCO_PLAZA_RADIUS; dz <= TAMBOTOCO_PLAZA_RADIUS; dz += 1) {
      for (let dx = -TAMBOTOCO_PLAZA_RADIUS; dx <= TAMBOTOCO_PLAZA_RADIUS; dx += 1) {
        if (Math.hypot(dx, dz) > TAMBOTOCO_PLAZA_RADIUS) continue;
        expect(
          TERRAIN.isWater(TAMBOTOCO_INTICANCHA.x + dx, TAMBOTOCO_INTICANCHA.z + dz),
          `plaza touches water at ${dx},${dz}`,
        ).toBe(false);
      }
    }
    parts.forEach((g) => g.dispose());
  });
});
