import { describe, it, expect } from 'vitest';
import { Mission } from '../src/campaign/Mission';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { Era } from '../src/core/types';
import type { MissionDef } from '../src/campaign/types';

const MOCHE = MISSIONS.find((m) => m.id === 'm3_moche_recuay')!;
const WARI = MISSIONS.find((m) => m.id === 'm4_wari')!;

function stubGame() {
  return {
    players: [
      { resources: { food: 0, wood: 0, silver: 0, stone: 0 }, era: Era.REGIONAL_STATES, techs: new Set<string>() },
    ],
    units: new Map<number, unknown>(),
    buildings: new Map<number, unknown>(),
    showToast: () => {},
    hud: {
      showToast: () => {},
      showDialogue: () => {},
      showActCard: () => {},
      isMissionCardOpen: () => false,
    },
    audio: { uiClick: () => {} },
    camera: { focusOn: () => {} },
    rng: { float: () => 0.5 },
    resolveMissionPoint: () => ({ x: 0, z: 0 }),
    isHeritageVisited: () => false,
    getVisitedHeritage: () => [],
    setVisitedHeritage: () => {},
    setSitePhase: () => {},
    sitePhasePlan: { phases: [], initial: 'none' },
    isCinematicActive: () => false,
    getPaused: () => false,
    hasBuildings: () => true,
  } as any;
}

/** Two hand-over goals at the same monument plus one at another, with no triggers in the way. */
const DELIVERY: MissionDef = {
  ...MOCHE,
  id: 'test_delivery',
  objectives: [
    { id: 'req', kind: 'deliver', resource: 'silver', count: 100, heritageId: 'moche_huaca_luna', title: 'req' },
    {
      id: 'opt',
      kind: 'deliver',
      resource: 'silver',
      count: 150,
      optional: true,
      heritageId: 'moche_huaca_luna',
      title: 'opt',
    },
    { id: 'other', kind: 'deliver', resource: 'silver', count: 100, heritageId: 'moche_plaza', title: 'other' },
  ],
  triggers: [],
};

describe('mission deliveries', () => {
  it('credits the required and optional hand-over at the same heritage with one load', () => {
    const mission = new Mission(stubGame(), DELIVERY, () => {});
    expect(mission.recordDelivery('silver', 50, undefined, 'moche_huaca_luna')).toBe(50);
    let delivered = new Map(mission.toSave().delivered ?? []);
    expect(delivered.get('req')).toBe(50);
    expect(delivered.get('opt')).toBe(50);
    // A different monument does not receive the same load.
    expect(delivered.get('other')).toBeUndefined();

    mission.recordDelivery('silver', 50, undefined, 'moche_huaca_luna');
    delivered = new Map(mission.toSave().delivered ?? []);
    expect(mission.getObjectiveState('req')).toBe('completed');
    expect(delivered.get('opt')).toBe(100);

    mission.recordDelivery('silver', 50, undefined, 'moche_huaca_luna');
    expect(mission.getObjectiveProgress('opt')?.current).toBe(150);
    expect(mission.getObjectiveState('opt')).toBe('completed');
    expect(mission.won, 'the optional alone never wins').toBeNull();
  });

  it('m3 gives the 400 optional a window after the required 250', () => {
    const objectives = MOCHE.objectives;
    const required = objectives.find((o) => o.id === 'obj_intercambio')!;
    const optional = objectives.find((o) => o.id === 'bonus_intercambio')!;
    const closing = objectives.find((o) => o.id === 'obj_cierre')!;
    expect(optional.optional).toBe(true);
    expect(optional.count).toBeGreaterThan(required.count!);
    expect(optional.heritageId).toBe('moche_huaca_luna');
    expect(closing.requires).toBe('obj_intercambio');
    expect(closing.optional).toBeUndefined();
    expect(MOCHE.startingResources.silver).toBeLessThanOrEqual(100);
    expect(MOCHE.triggers.some((tr) => tr.id === 't_declive')).toBe(false);
  });

  it('drops the Wari decline timer and calls it an expansive state', () => {
    expect(WARI.triggers.some((tr) => tr.id === 't_declive')).toBe(false);
  });
});
