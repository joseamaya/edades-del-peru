import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SettlementDressing } from '../src/rendering/SettlementDressing';
import type { DressingKit, DressingPropId, PropsKitModel } from '../src/rendering/propsKit';
import type { DressingKind, DressingPlacement } from '../src/model/defs/settlementDressing';

const PLACEMENTS: DressingPlacement[] = [
  { kind: 'hearth', x: 2, z: 0, yaw: 0, scale: 1 },
  { kind: 'basket', x: 5, z: 0, yaw: 1, scale: 1 },
];

function model(id: DressingPropId, material: THREE.MeshStandardMaterial, far = 0.5): PropsKitModel {
  const part = (size: number) => [{ geometry: new THREE.BoxGeometry(size, size, size), material }];
  return { id, lods: [part(1), far > 0 ? part(far) : []] };
}

function kit(stone = new THREE.MeshStandardMaterial({ name: 'MAT-Arch_Stone' })): DressingKit {
  const cane = new THREE.MeshStandardMaterial({ name: 'MAT-Arch_CaneMat' });
  return new Map<DressingKind, PropsKitModel>([
    ['hearth', model('hearth', stone)],
    ['basket', model('basket', cane)],
  ]);
}

const named = (dressing: SettlementDressing, suffix: string): THREE.Mesh[] =>
  dressing.group.children.filter((c) => c.name.endsWith(suffix)) as THREE.Mesh[];

describe('settlement dressing kit', () => {
  it('replaces the procedural props with one mesh per material and LOD', () => {
    const dressing = new SettlementDressing(PLACEMENTS, () => 0);
    expect(dressing.group.children[0]?.name).toBe('dressing');
    expect(dressing.attachKit(kit())).toBe(true);
    const names = dressing.group.children.map((c) => c.name);
    expect(names).not.toContain('dressing');
    expect(names).toEqual(
      expect.arrayContaining([
        'props_kit_dressing_stone_lod0',
        'props_kit_dressing_canemat_lod0',
        'props_kit_dressing_stone_lod1',
        'props_kit_dressing_canemat_lod1',
      ]),
    );
    expect(named(dressing, 'lod0')).toHaveLength(2);
    expect(named(dressing, 'lod1')).toHaveLength(2);
    dressing.dispose();
  });

  it('starts on LOD0, switches with the camera focus and refuses a second attach', () => {
    const dressing = new SettlementDressing(PLACEMENTS, () => 0);
    expect(dressing.attachKit(kit())).toBe(true);
    expect(dressing.attachKit(kit())).toBe(false);
    dressing.update({ x: 3.5, z: 0 });
    expect(named(dressing, 'lod0').every((m) => m.visible)).toBe(true);
    expect(named(dressing, 'lod1').every((m) => !m.visible)).toBe(true);
    dressing.update({ x: 80, z: 80 });
    expect(named(dressing, 'lod0').every((m) => !m.visible)).toBe(true);
    expect(named(dressing, 'lod1').every((m) => m.visible)).toBe(true);
    dressing.dispose();
  });

  it('keeps the near LOD when the kit has no far LOD', () => {
    const dressing = new SettlementDressing(PLACEMENTS, () => 0);
    const cane = new THREE.MeshStandardMaterial({ name: 'MAT-Arch_CaneMat' });
    const nearOnly = new Map<DressingKind, PropsKitModel>([
      ['hearth', model('hearth', cane, 0)],
      ['basket', model('basket', cane, 0)],
    ]);
    expect(dressing.attachKit(nearOnly)).toBe(true);
    expect(named(dressing, 'lod1')).toHaveLength(0);
    dressing.update({ x: 200, z: 200 });
    expect(named(dressing, 'lod0').every((m) => m.visible)).toBe(true);
    dressing.dispose();
  });

  it('bakes the placement transform (yaw, scale and terrain height)', () => {
    const dressing = new SettlementDressing([{ kind: 'hearth', x: 10, z: 4, yaw: 0, scale: 2 }], () => 5);
    const stone = new THREE.MeshStandardMaterial({ name: 'MAT-Arch_Stone' });
    dressing.attachKit(new Map<DressingKind, PropsKitModel>([['hearth', model('hearth', stone)]]));
    const mesh = named(dressing, 'lod0')[0]!;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    expect(box.min.x).toBeCloseTo(9, 4);
    expect(box.max.x).toBeCloseTo(11, 4);
    expect(box.min.y).toBeCloseTo(4, 4);
    expect(box.max.y).toBeCloseTo(6, 4);
    expect(box.min.z).toBeCloseTo(3, 4);
    expect(box.max.z).toBeCloseTo(5, 4);
    dressing.dispose();
  });

  it('clones the shared kit materials so each base can carry its own fog', () => {
    const source = new THREE.MeshStandardMaterial({ name: 'MAT-Arch_Stone' });
    const a = new SettlementDressing(PLACEMENTS, () => 0);
    const b = new SettlementDressing(PLACEMENTS, () => 0);
    a.attachKit(kit(source));
    b.attachKit(kit(source));
    const matA = (a.group.getObjectByName('props_kit_dressing_stone_lod0') as THREE.Mesh).material;
    const matB = (b.group.getObjectByName('props_kit_dressing_stone_lod0') as THREE.Mesh).material;
    expect(matA).not.toBe(source);
    expect(matA).not.toBe(matB);
    a.dispose();
    b.dispose();
  });

  it('keeps the procedural fallback when a piece is missing and after disposal', () => {
    const partial = new Map<DressingKind, PropsKitModel>([
      ['hearth', model('hearth', new THREE.MeshStandardMaterial())],
    ]);
    const incomplete = new SettlementDressing([{ kind: 'stela', x: 0, z: 0, yaw: 0, scale: 1 }], () => 0);
    expect(incomplete.attachKit(partial)).toBe(false);
    expect(incomplete.group.children[0]?.name).toBe('dressing');
    incomplete.dispose();

    const dressing = new SettlementDressing(PLACEMENTS, () => 0);
    dressing.dispose();
    expect(dressing.attachKit(kit())).toBe(false);
  });

  it('removes both LOD sets and leaves the scene on dispose', () => {
    const dressing = new SettlementDressing(PLACEMENTS, () => 0);
    dressing.attachKit(kit());
    const group = dressing.group;
    dressing.dispose();
    expect(group.children).toHaveLength(0);
  });
});
