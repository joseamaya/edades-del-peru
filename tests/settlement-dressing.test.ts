import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CivId } from '../src/core/types';
import { SettlementDressing } from '../src/rendering/SettlementDressing';
import {
  CENTER_CLEARANCE,
  DRESSING_SETS,
  dressingProfileFor,
  planSettlementDressing,
  propClearance,
  propSeparation,
  type DressingQuery,
} from '../src/model/defs/settlementDressing';
import { planSettlementSite, type SettlementPlan, type SettlementQuery } from '../src/model/defs/settlementPlan';

const plan: SettlementPlan = {
  center: { x: 50, z: 50 },
  dwellings: [
    { x: 56, z: 50, yaw: 0 },
    { x: 47, z: 53, yaw: 1 },
    { x: 53, z: 57, yaw: 2 },
  ],
  fields: [],
  roads: [],
};

const flat: DressingQuery = {
  isWater: () => false,
  isBuildable: () => true,
  getSlope: () => 0.1,
  getHeight: () => 0,
};

const anchors = [{ ...plan.center, center: true }, ...plan.dwellings.map((d) => ({ ...d, center: false }))];

/** Every household set the game can place. */
const PROFILES = ['caral', 'chavin', 'moche', 'wari', 'inca'] as const;
/** Pinned prop budget per set: a sequence that grows has to say so here. */
const PROP_BUDGET: Record<(typeof PROFILES)[number], number> = {
  caral: 14,
  chavin: 10,
  moche: 12,
  wari: 9,
  inca: 9,
};

describe('settlement dressing', () => {
  it('is deterministic for the same plan and seed', () => {
    expect(planSettlementDressing(plan, 7, flat)).toEqual(planSettlementDressing(plan, 7, flat));
  });

  it('places the documented household set, clear of the buildings', () => {
    const out = planSettlementDressing(plan, 7, flat);
    expect(out.length).toBeGreaterThan(8);
    expect(out.some((p) => p.kind === 'hearth')).toBe(true);
    expect(out.some((p) => p.kind === 'drying_rack')).toBe(true);
    for (const p of out) {
      // The rendered walls overhang the footprint; the clearance grows with the prop's radius.
      for (const a of anchors) {
        const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
        expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThanOrEqual(clearance);
      }
      for (const q of out) {
        if (q === p) continue;
        expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThanOrEqual(
          propSeparation(p.kind, p.scale, q.kind, q.scale),
        );
      }
      // The ring around a dwelling at the edge of the plan can reach a little past 12 from the centre.
      expect(Math.hypot(plan.center.x - p.x, plan.center.z - p.z)).toBeLessThan(14);
    }
  });

  it('avoids water, unbuildable and steep ground', () => {
    const bad: DressingQuery = {
      isWater: (x) => x > 54,
      isBuildable: (_x, z) => z >= 52,
      getSlope: (_x, z) => (z > 56 ? 0.9 : 0.1),
      getHeight: () => 0,
    };
    const out = planSettlementDressing(plan, 11, bad);
    for (const p of out) {
      expect(p.x).toBeLessThanOrEqual(54);
      expect(p.z).toBeGreaterThanOrEqual(52);
      expect(p.z).toBeLessThanOrEqual(56);
    }
  });

  it('gives each culture its own household mix, all inside the shared kit', () => {
    const kinds = Object.fromEntries(
      PROFILES.map((profile) => [profile, planSettlementDressing(plan, 7, flat, profile).map((p) => p.kind)]),
    );
    // The coastal household keeps the fish racks; the highland state households drop them.
    expect(kinds.moche).toContain('drying_rack');
    expect(kinds.wari).not.toContain('drying_rack');
    expect(kinds.inca).not.toContain('drying_rack');
    // Incan and Wari bases are storage-and-textile households, not ritual ones.
    expect(kinds.inca.filter((kind) => kind === 'basket').length).toBeGreaterThanOrEqual(2);
    expect(kinds.wari).toContain('cotton');
    // Only Chavin keeps the ritual set.
    expect(kinds.chavin).toContain('stela');
    expect(kinds.inca).not.toContain('stela');
    // Every profile keeps its pinned budget, so a set cannot quietly grow.
    for (const profile of PROFILES) expect(DRESSING_SETS[profile].sequence.length, profile).toBe(PROP_BUDGET[profile]);
    // The three new sets are tinted apart from each other; Caral and Chavín keep their reviewed colour.
    const tints = PROFILES.map((profile) => DRESSING_SETS[profile].tint);
    expect(new Set(tints.slice(2)).size).toBe(3);
    // Caral and Chavín share the neutral white, so four distinct tints over five sets.
    expect(new Set(tints).size).toBe(4);
    // Caral and Chavín keep the reviewed neutral colour; only the new sets are tinted.
    expect(DRESSING_SETS.caral.tint).toBe(0xffffff);
    expect(DRESSING_SETS.chavin.tint).toBe(0xffffff);
    const [caral, , moche, wari, inca] = PROFILES.map((profile) => new THREE.Color(DRESSING_SETS[profile].tint));
    expect(moche.r - moche.b).toBeGreaterThan(0.1);
    expect(wari.b - wari.r).toBeGreaterThan(0.02);
    expect(inca.r - inca.b).toBeGreaterThan(moche.r - moche.b);
    expect(caral.getHex()).toBe(0xffffff);
  });

  it('produces a different layout for a different seed', () => {
    expect(planSettlementDressing(plan, 7, flat)).not.toEqual(planSettlementDressing(plan, 8, flat));
  });

  it('keeps the central clearance above the real Plaza Mayor plinth', () => {
    // `buildCaralCenter(3.4)` makes 6.46 x 5.27 walls; the plinth is 1.12x per side.
    const halfDiagonal = Math.hypot((3.4 * 1.9 * 1.12) / 2, (3.4 * 1.55 * 1.12) / 2);
    expect(CENTER_CLEARANCE).toBeGreaterThanOrEqual(halfDiagonal);
  });

  it('never overlaps a wall or another prop across 1,000 seeds', () => {
    let violation = '';
    for (const profile of PROFILES) {
      const expected = PROP_BUDGET[profile];
      for (let seed = 1; seed <= 1000; seed++) {
        const out = planSettlementDressing(plan, seed, flat, profile);
        if (out.length !== expected) {
          violation = `${profile} seed ${seed}: placed ${out.length}/${expected}`;
          break;
        }
        for (const p of out) {
          for (const a of anchors) {
            const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
            if (Math.hypot(a.x - p.x, a.z - p.z) < clearance - 1e-6) {
              violation = `${profile} seed ${seed}: ${p.kind} at ${Math.hypot(a.x - p.x, a.z - p.z).toFixed(2)} < ${clearance.toFixed(2)}`;
              break;
            }
          }
          if (violation) break;
          for (const q of out) {
            if (q === p) continue;
            const separation = propSeparation(p.kind, p.scale, q.kind, q.scale);
            if (Math.hypot(q.x - p.x, q.z - p.z) < separation - 1e-6) {
              violation = `${profile} seed ${seed}: ${p.kind}/${q.kind} at ${Math.hypot(q.x - p.x, q.z - p.z).toFixed(2)} < ${separation.toFixed(2)}`;
              break;
            }
          }
          if (violation) break;
        }
        if (violation) break;
      }
      if (violation) break;
    }
    expect(violation).toBe('');
  });

  it('keeps the rule on 1,000 generated settlement plans', () => {
    const siteQuery: SettlementQuery = {
      ...flat,
      getMoisture: () => 0.6,
      getTerrace: () => 0.2,
      getCanal: () => 0.1,
    };
    let violation = '';
    for (let siteSeed = 1; siteSeed <= 10 && !violation; siteSeed++) {
      const generated = planSettlementSite(
        { shape: 'riverside', seed: siteSeed, anchor: { x: 100, z: 100 }, count: 4 },
        siteQuery,
      );
      const genAnchors = [
        { ...generated.center, center: true },
        ...generated.dwellings.map((d) => ({ ...d, center: false })),
      ];
      for (let seed = 1; seed <= 100 && !violation; seed++) {
        const profile = seed % 2 ? 'caral' : 'chavin';
        const out = planSettlementDressing(generated, seed, flat, profile);
        if (!out.length) {
          violation = `${profile} site ${siteSeed} seed ${seed}: no props`;
          break;
        }
        for (const p of out) {
          for (const a of genAnchors) {
            const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
            if (Math.hypot(a.x - p.x, a.z - p.z) < clearance - 1e-6) {
              violation = `${profile} site ${siteSeed} seed ${seed}: ${p.kind} wall`;
              break;
            }
          }
          if (violation) break;
          for (const q of out) {
            if (q === p) continue;
            const separation = propSeparation(p.kind, p.scale, q.kind, q.scale);
            if (Math.hypot(q.x - p.x, q.z - p.z) < separation - 1e-6) {
              violation = `${profile} site ${siteSeed} seed ${seed}: ${p.kind}/${q.kind}`;
              break;
            }
          }
          if (violation) break;
        }
      }
    }
    expect(violation).toBe('');
  });
});

describe('Chavín settlement dressing', () => {
  it('is deterministic and uses the ritual/megalithic set', () => {
    const out = planSettlementDressing(plan, 7, flat, 'chavin');
    expect(out).toEqual(planSettlementDressing(plan, 7, flat, 'chavin'));
    expect(out.some((p) => p.kind === 'stela')).toBe(true);
    expect(out.some((p) => p.kind === 'offering')).toBe(true);
    expect(out.some((p) => p.kind === 'stone_head')).toBe(true);
    expect(out.some((p) => p.kind === 'megalith')).toBe(true);
    expect(out.some((p) => p.kind === 'hearth')).toBe(false);
  });

  it('keeps props clear of the buildings and each other', () => {
    const out = planSettlementDressing(plan, 7, flat, 'chavin');
    for (const p of out) {
      // The rendered walls overhang the footprint; the clearance grows with the prop's radius.
      for (const a of anchors) {
        const clearance = propClearance(p.kind, p.scale, a.center ? 'center' : 'dwelling');
        expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeGreaterThanOrEqual(clearance);
      }
      for (const q of out) {
        if (q === p) continue;
        expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeGreaterThanOrEqual(
          propSeparation(p.kind, p.scale, q.kind, q.scale),
        );
      }
    }
  });
});

describe('dressing profiles', () => {
  it('maps each culture with an authored set and leaves the rest bare', () => {
    expect(dressingProfileFor(CivId.CARAL)).toBe('caral');
    expect(dressingProfileFor(CivId.CHAVIN)).toBe('chavin');
    expect(dressingProfileFor(CivId.MOCHE)).toBe('moche');
    expect(dressingProfileFor(CivId.WARI)).toBe('wari');
    expect(dressingProfileFor(CivId.INCA)).toBe('inca');
    // Cusco 1536 and Vilcabamba 1572 are still Inca households.
    expect(dressingProfileFor(CivId.INCA, 'm_cusco_1536')).toBe('inca');
    expect(dressingProfileFor(CivId.INCA, 'm_vilcabamba')).toBe('inca');
    // The 1780 rebellion is `INCA` but a colonial camp: no Incan household there.
    expect(dressingProfileFor(CivId.INCA, 'm7_tupac_amaru')).toBeNull();
    // Cultures without an authored set stay bare rather than borrowing one.
    for (const civ of [CivId.CHIMU, CivId.CHANCA, CivId.PARACAS, CivId.RECUAY, CivId.TIAHUANACO]) {
      expect(dressingProfileFor(civ), CivId[civ]).toBeNull();
    }
    expect(dressingProfileFor(CivId.PATRIOTAS)).toBeNull();
  });

  it('tints the procedural props with the culture colour', () => {
    const dressing = new SettlementDressing(
      [{ kind: 'hearth', x: 0, z: 0, yaw: 0, scale: 1 }],
      () => 0,
      DRESSING_SETS.moche.tint,
    );
    const mesh = dressing.group.getObjectByName('dressing') as THREE.Mesh;
    expect(mesh).toBeTruthy();
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.color.getHex()).toBe(DRESSING_SETS.moche.tint);
    dressing.dispose();
  });
});
