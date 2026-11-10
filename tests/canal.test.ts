import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { HERITAGE_BUILDINGS } from '../src/model/defs/heritage';
import { CARAL_RIVER_HALF_WIDTH, CARAL_RIVER_PATH } from '../src/model/defs/caralHeightmap';
import { canalIrrigationAt } from '../src/model/defs/canal';
import {
  buildCanalGeometry,
  CANAL_BANK_LIFT,
  CANAL_BED_LIFT,
  CANAL_WATER_LIFT,
  type CanalMeshGeometry,
} from '../src/rendering/canal';
import { distanceToPolyline, type XZPoint } from '../src/util/math';

const CARAL = MISSIONS.find((mission) => mission.id === 'm1_caral')!;
const SIZE = CARAL.map.size;

/** Caral's authored canal in world metres. */
function canalPath(): { x: number; z: number }[] {
  return (CARAL.layout?.canal?.path ?? []).map((p) => ({ x: p.x * SIZE, z: p.z * SIZE }));
}

function expectFollowsRelief(
  geometry: CanalMeshGeometry['water'],
  lift: number,
  height: (x: number, z: number) => number,
): void {
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    expect(y, `vertex ${i} at (${x}, ${z})`).toBeCloseTo(height(x, z) + lift, 5);
  }
}

describe('Caral communal canal', () => {
  it('takes water from the Supe and runs inland to the fields', () => {
    const path = canalPath();
    expect(path.length).toBeGreaterThanOrEqual(4);
    const intake = path[0];
    const river = CARAL_RIVER_PATH as readonly XZPoint[];
    expect(distanceToPolyline(intake.x, intake.z, river)).toBeLessThan(CARAL_RIVER_HALF_WIDTH + 2.5);
    // The trace heads west into the valley fields, away from the river.
    const end = path[path.length - 1];
    expect(end.x).toBeLessThan(intake.x);
    expect(end.z).toBeGreaterThan(120);
  });

  it('irrigates along the whole trace and nowhere else', () => {
    const path = canalPath();
    for (const point of path) expect(canalIrrigationAt(path, point.x, point.z)).toBeGreaterThan(0.9);
    const a = path[1];
    const b = path[2];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    expect(canalIrrigationAt(path, mid.x + nx, mid.z + nz)).toBeGreaterThan(0);
    expect(canalIrrigationAt(path, mid.x + nx * 3, mid.z + nz * 3)).toBe(0);
    expect(canalIrrigationAt(path, 200, 200)).toBe(0);
  });

  it('builds relief-following ribbons instead of a flat canal', () => {
    const path = canalPath();
    const height = (x: number, z: number) => 2 + x * 0.05 + Math.sin(z * 0.2) * 0.4;
    const geometry = buildCanalGeometry(path, 2.2, height);
    expect(geometry).not.toBeNull();
    expectFollowsRelief(geometry!.water, CANAL_WATER_LIFT, height);
    expectFollowsRelief(geometry!.bed, CANAL_BED_LIFT, height);
    expectFollowsRelief(geometry!.banks, CANAL_BANK_LIFT, height);

    const ys = geometry!.water.getAttribute('position');
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < ys.count; i++) {
      min = Math.min(min, ys.getY(i));
      max = Math.max(max, ys.getY(i));
    }
    expect(max - min, 'the ribbon is not pinned to one central height').toBeGreaterThan(0.5);
  });

  it('does not call Caral fields andenes', () => {
    expect(HERITAGE_BUILDINGS.caral_canal.summary.toLowerCase()).not.toContain('andenes');
    expect(JSON.stringify(CARAL).toLowerCase()).not.toContain('andenes');
  });
});
