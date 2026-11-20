import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { CivId, Era } from '../src/core/types';
import { archProfileFor, isColonialAndeanProfile, usesAndeanArchitecture } from '../src/model/defs/architecture';
import { getAuthoredSite } from '../src/model/defs/sites';
import { SiteLandmarks } from '../src/rendering/SiteLandmarks';
import type { SiteLandmarkKind } from '../src/model/defs/siteLandmarks';

function mission(id: string) {
  const found = MISSIONS.find((m) => m.id === id);
  if (!found) throw new Error(`missing mission ${id}`);
  return found;
}

describe('mission site landmarks', () => {
  it('declares the Cusco plaza and Sacsayhuamán wall front', () => {
    const kinds = mission('m_cusco_1536').layout?.siteLandmarks?.map((landmark) => landmark.kind);
    expect(kinds).toEqual(['cusco-plaza', 'sacsayhuaman']);
    // Quipaipan uses the same site GLB but must not inherit Cusco's landmarks.
    expect(mission('m6b_guerra_civil').layout?.siteLandmarks).toBeUndefined();
    expect(mission('m6b_guerra_civil').layout?.site?.hideModel).toBeUndefined();
    expect(mission('m_cusco_1536').layout?.site?.hideModel).toBe(true);
    expect(getAuthoredSite('cusco_inca_site')?.hideModel).toBeUndefined();
  });

  it('replaces the borrowed GLBs with procedural landmarks', () => {
    for (const [missionId, kind] of [
      ['m_real_felipe', 'real-felipe'],
      ['m_tarapaca', 'tarapaca-village'],
      ['m_vilcabamba', 'vilcabamba-refuge'],
    ] as const) {
      expect(mission(missionId).layout?.siteLandmarks?.map((landmark) => landmark.kind)).toEqual([kind]);
    }
    for (const siteId of ['real_felipe_site', 'tarapaca_site', 'vilcabamba_site'] as const) {
      expect(getAuthoredSite(siteId)?.hideModel, siteId).toBe(true);
    }
  });

  it('puts the Tarapacá site and its camera on the village, not the Arica terrace', () => {
    const site = getAuthoredSite('tarapaca_site')!;
    expect(site.origin).toEqual({ x: 96, z: 168 });
    expect(site.anchor).toEqual({ x: 96, z: 168 });
    const layout = mission('m_tarapaca').layout!;
    expect(layout.site?.focus).toEqual({ x: 96 / 256, z: 168 / 256 });
    expect(layout.site?.y).toBeCloseTo(6.942, 3);
  });

  it('builds visible geometry for every landmark kind', () => {
    const kinds: SiteLandmarkKind[] = [
      'cusco-plaza',
      'sacsayhuaman',
      'real-felipe',
      'tarapaca-village',
      'vilcabamba-refuge',
    ];
    const heightAt = (x: number, z: number): number => 5 + Math.sin(x * 0.02) * 0.25 + Math.cos(z * 0.02) * 0.2;
    for (const kind of kinds) {
      const landmarks = new SiteLandmarks([{ kind, x: 0.5, z: 0.5 }], 256, heightAt, 5);
      const meshes: THREE.Mesh[] = [];
      landmarks.group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) meshes.push(mesh);
      });
      expect(meshes.length, `${kind} meshes`).toBeGreaterThan(1);
      const size = new THREE.Box3().setFromObject(landmarks.group).getSize(new THREE.Vector3());
      expect(size.x, `${kind} width`).toBeGreaterThan(6);
      expect(size.z, `${kind} depth`).toBeGreaterThan(6);
      landmarks.dispose();
    }
  });

  it('sinks the Tarapacá foundations into the quebrada slope', () => {
    const heightAt = (x: number, z: number): number => 5 + (x - 128) * 0.04 + (z - 168) * 0.02;
    const landmarks = new SiteLandmarks([{ kind: 'tarapaca-village', x: 0.5, z: 0.5 }], 256, heightAt, 5);
    const box = new THREE.Box3().setFromObject(landmarks.group);
    const terrain = heightAt(box.min.x, box.min.z);
    expect(box.min.y).toBeGreaterThan(terrain - 1.2);
    expect(box.min.y).toBeLessThan(terrain + 0.8);
    landmarks.dispose();
  });

  it('registers the Real Felipe walls with the sally gates open', () => {
    const site = getAuthoredSite('real_felipe_site')!;
    const blockers = site.blockers;
    expect(blockers.length).toBeGreaterThanOrEqual(10);
    expect(blockers.some((blocker) => blocker.w === 24 && blocker.d === 1.4)).toBe(true);
    expect(blockers.some((blocker) => blocker.w === 6 && blocker.d === 6)).toBe(true);
    const anchor = site.anchor;
    const covers = (x: number, z: number): boolean =>
      blockers.some((blocker) => Math.abs(x - blocker.x) <= blocker.w / 2 && Math.abs(z - blocker.z) <= blocker.d / 2);
    expect(covers(anchor.x, anchor.z - 12), 'north curtain').toBe(true);
    expect(covers(anchor.x, anchor.z + 12), 'south sally gate').toBe(false);
    expect(covers(anchor.x - 12, anchor.z), 'west sally gate').toBe(false);
  });
});

describe('colonial-andean architecture', () => {
  it('keeps fieldstone, thatch and terraces for the Inca under Viceroyalty rule', () => {
    const profile = archProfileFor(CivId.INCA, Era.VICEROYALTY);
    expect(isColonialAndeanProfile(profile)).toBe(true);
    expect(profile.wall).toBe('fieldstone');
    expect(profile.roof).toBe('thatch');
    expect(profile.foundation).toBe('terrace');
    expect(usesAndeanArchitecture(profile, Era.VICEROYALTY, 'andean-masonry')).toBe(true);
  });

  it('keeps the Spanish colonial kit and does not leak into the Republic', () => {
    const realistas = archProfileFor(CivId.REALISTAS, Era.VICEROYALTY);
    expect(isColonialAndeanProfile(realistas)).toBe(false);
    expect(usesAndeanArchitecture(realistas, Era.VICEROYALTY, 'colonial')).toBe(false);
    expect(archProfileFor(CivId.INCA, Era.REPUBLIC).style).toBe('republican');
    expect(usesAndeanArchitecture(archProfileFor(CivId.INCA, Era.REPUBLIC), Era.REPUBLIC, 'andean-masonry')).toBe(
      false,
    );
  });
});
