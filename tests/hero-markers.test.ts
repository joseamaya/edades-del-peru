import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { Unit } from '../src/entities/Unit';
import { COMMANDERS, type PortraitId } from '../src/model/defs/commanders';
import { HeroMarkers } from '../src/rendering/HeroMarkers';

const AYAR: PortraitId[] = [
  'manco_capac',
  'ayar_auca',
  'ayar_cachi',
  'ayar_uchu',
  'mama_huaco',
  'mama_ocllo',
  'mama_ipacura',
  'mama_raua',
];

function hero(tag: string): Unit {
  return { dead: false, owner: 0, tag, pos: { x: 10, y: 2, z: 20 } } as unknown as Unit;
}

describe('hero field markers', () => {
  it('shows the banner close in and drops to the ring at the strategic zoom', () => {
    const markers = new HeroMarkers(new THREE.Scene());
    const units = [hero('manco_capac'), hero('mama_huaco')];
    markers.sync(units, 40, 200);
    expect(markers.detailVisible).toBe(true);
    markers.sync(units, 120, 200);
    expect(markers.detailVisible).toBe(false);
    markers.dispose();
  });

  it('gives the eight Ayar at least three crest shapes, none of them shared by more than two', () => {
    const crests = AYAR.map((id) => COMMANDERS[id].crest);
    for (const crest of crests) expect(crest).toBeDefined();
    const counts = new Map<string, number>();
    for (const crest of crests) counts.set(crest!, (counts.get(crest!) ?? 0) + 1);
    // Locked distribution: two heroes per shape, so no pair of siblings shares the same crest by accident.
    expect(Object.fromEntries([...counts.entries()].sort())).toEqual({ diamond: 2, spire: 2, stone: 2, tetra: 2 });
  });

  it('owns its geometries, so two live matches never share or dispose each other', () => {
    const scene = new THREE.Scene();
    const first = new HeroMarkers(scene);
    const second = new HeroMarkers(scene);
    const geometries = (markers: HeroMarkers): string[] =>
      markers.group.children
        .filter((child): child is THREE.InstancedMesh => (child as THREE.InstancedMesh).isInstancedMesh)
        .map((mesh) => mesh.geometry.uuid);
    const shared = new Set(geometries(first));
    expect(geometries(second).some((uuid) => shared.has(uuid))).toBe(false);
    first.sync([hero('manco_capac')], 40, 200);
    first.dispose();
    second.sync([hero('manco_capac')], 40, 200);
    expect(second.detailVisible).toBe(true);
    second.dispose();
  });
});
