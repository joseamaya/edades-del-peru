import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { seatStartsWithBase, type MissionDef, type MissionPoint, type ObjectiveDef } from '../src/campaign/types';
import { setAutoStart } from '../src/core/Game';
import { BuildingKind, UnitKind } from '../src/core/types';
import { BUILDING_DEFS } from '../src/model/defs/buildings';
import { TECHS, getTech, techAvailable } from '../src/model/defs/techs';
import { UNIT_ARCHETYPES, requiredTechsFor, unitAvailableToCiv, unitTrainableInPeriod } from '../src/model/defs/units';
import { CARAL_CITY_BLOCKERS, CARAL_PLAZA_CENTER } from '../src/model/defs/caralCity';
import { headlessMission } from './headless';

/**
 * Structural contract of the mission data. These are the rules the 20-mission sweep found broken one
 * mission at a time; the tests keep them from coming back.
 */

type Wave = Extract<MissionDef['triggers'][number]['effects'][number], { type: 'wave' }>;
type PositionedHold = ObjectiveDef & { pos: MissionPoint };

/** Minimum clear ground between a wave's entry point and the place it must reach. */
const WAVE_ENTRY_MARGIN = 10;
/** Probe this fraction of a hold radius for walkable ground (the anchor cell itself may be a building). */
const HOLD_PROBE_FRACTION = 0.6;

function waves(mission: MissionDef): Wave[] {
  return mission.triggers.flatMap((t) => t.effects).filter((e): e is Wave => e.type === 'wave');
}

function positionedHolds(mission: MissionDef): PositionedHold[] {
  return (mission.objectives ?? []).filter((o): o is PositionedHold => o.kind === 'hold' && o.pos !== undefined);
}

/** Buildings this mission can put on the map; a base-less opening has no standing centre. */
function buildableKinds(mission: MissionDef): Set<BuildingKind> {
  const kinds = Object.values(BUILDING_DEFS)
    .filter(
      (def) =>
        def.id !== BuildingKind.CENTER &&
        (!mission.allowedBuildings || mission.allowedBuildings.includes(def.id)) &&
        mission.startingEra >= def.minEra,
    )
    .map((def) => def.id);
  return new Set(seatStartsWithBase(mission.start, 0) ? [BuildingKind.CENTER, ...kinds] : kinds);
}

/** Technologies the mission's period, civilization and allowlist leave available. */
function availableTechs(mission: MissionDef): Set<string> {
  return new Set(
    TECHS.filter(
      (tech) =>
        techAvailable(tech, mission.period, mission.playerCiv) &&
        (!mission.allowedTechs || mission.allowedTechs.includes(tech.id)),
    ).map((tech) => tech.id),
  );
}

function producerKinds(kind: UnitKind): BuildingKind[] {
  return Object.values(BUILDING_DEFS)
    .filter((def) => def.trainable?.includes(kind))
    .map((def) => def.id);
}

/**
 * A hold anchored on the player's own start completes while the player does nothing. The only exception
 * is a position the mission deliberately defends and that an authored column attacks (Tarapacá's village).
 */
const DEFENDED_START_HOLDS = new Set(['m_tarapaca:a1_pueblo']);

describe('campaign mission contract', () => {
  it('does not let a wave appear on the point it must reach', () => {
    const offenders: string[] = [];
    for (const mission of MISSIONS) {
      const list = waves(mission);
      if (list.length === 0) continue;
      const game = headlessMission(mission.id);
      try {
        for (const wave of list) {
          const entry = game.resolveMissionPoint((wave.spawn ?? wave.pos)!);
          const destination = wave.target
            ? game.resolveMissionPoint(wave.target)
            : wave.objective === 'position' && wave.pos
              ? game.resolveMissionPoint(wave.pos)
              : game.playerCenter(0);
          // Units land anywhere inside the wave radius, so the entry must clear that spread plus a margin.
          const spread = (wave.radius ?? 6) * Math.SQRT2 + WAVE_ENTRY_MARGIN;
          const distance = Math.hypot(entry.x - destination.x, entry.z - destination.z);
          if (distance <= spread) {
            offenders.push(
              `${mission.id}: ${wave.units.map((u) => u.kind).join('+')} enters ${distance.toFixed(0)} m from its objective`,
            );
          }
        }
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not add a hold that completes on the player start position', () => {
    const offenders: string[] = [];
    const unreachable: string[] = [];
    for (const mission of MISSIONS) {
      const holds = positionedHolds(mission);
      if (holds.length === 0) continue;
      const game = headlessMission(mission.id);
      try {
        const start = game.playerCenter(0);
        const main = game.pathfinder.mainComponent();
        for (const hold of holds) {
          const at = game.resolveMissionPoint(hold.pos);
          const radius = hold.radius ?? 6;
          // An anchor whose radius has no walkable ground in the main component can never be finished.
          // Holds inside an enemy town are anchored on a blocked plaza cell, so probe the radius too.
          const probe: ReadonlyArray<readonly [number, number]> = [
            [0, 0],
            [radius * HOLD_PROBE_FRACTION, 0],
            [-radius * HOLD_PROBE_FRACTION, 0],
            [0, radius * HOLD_PROBE_FRACTION],
            [0, -radius * HOLD_PROBE_FRACTION],
          ];
          if (!probe.some(([dx, dz]) => game.pathfinder.componentAt(at.x + dx, at.z + dz) === main)) {
            unreachable.push(`${mission.id}:${hold.id}`);
            continue;
          }
          // The goal is only a goal if standing on the start does not already satisfy it.
          const distance = Math.hypot(at.x - start.x, at.z - start.z);
          if (distance > radius) continue;
          if (DEFENDED_START_HOLDS.has(`${mission.id}:${hold.id}`)) continue;
          if (hold.clearEnemies === true) continue;
          offenders.push(`${mission.id}:${hold.id} (start ${distance.toFixed(0)} m inside ${radius.toFixed(0)} m)`);
        }
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
    expect(unreachable).toEqual([]);
    expect(offenders).toEqual([]);
  });

  it('keeps every timed objective tied to something the player does', () => {
    // A `wait`/`survive` with no enemy on the map finishes on its own: it is a beat, not a goal.
    const selfCompleting: string[] = [];
    for (const mission of MISSIONS) {
      if (mission.enemy?.active) continue;
      for (const objective of mission.objectives ?? []) {
        if (objective.kind === 'wait' || objective.kind === 'survive') {
          selfCompleting.push(`${mission.id}:${objective.id} (${objective.kind} ${objective.time}s)`);
        }
      }
    }
    // Caral's Act III prosperity beat is authored pacing, not a defence.
    expect(selfCompleting.filter((entry) => !entry.startsWith('m1_caral:'))).toEqual([]);
  });

  it('does not activate a gated goal before its prerequisite', () => {
    // `requires` only gates trigger-driven activation; a goal that is not `hidden` opens with the mission,
    // which is how the Wari hold ended up live from the first second.
    const leaked: string[] = [];
    for (const mission of MISSIONS) {
      const gated = (mission.objectives ?? []).filter((o) => o.hidden === true && o.requires);
      if (gated.length === 0) continue;
      const game = headlessMission(mission.id);
      try {
        for (const objective of gated) {
          if (game.mission!.getObjectiveState(objective.id) !== 'pendiente') {
            leaked.push(`${mission.id}:${objective.id}`);
          }
        }
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('does not offer a technology or unit its allowed buildings cannot support', () => {
    // Every mission, not only the ones with an explicit allowlist: a restricted building set also
    // restricts the tech tree, and a unit whose producer or tech is unreachable is a phantom option.
    const orphans: string[] = [];
    for (const mission of MISSIONS) {
      const buildings = buildableKinds(mission);
      const techs = availableTechs(mission);
      const units = mission.allowedUnits ?? Object.keys(UNIT_ARCHETYPES).map((kind) => kind as UnitKind);
      for (const kind of units) {
        const arch = UNIT_ARCHETYPES[kind];
        if (!arch) {
          orphans.push(`${mission.id}: ${kind} (unknown unit)`);
          continue;
        }
        if (
          !unitAvailableToCiv(kind, mission.playerCiv) ||
          !unitTrainableInPeriod(kind, mission.period, mission.playerCiv)
        ) {
          orphans.push(`${mission.id}: ${kind} (outside the period or civilization)`);
          continue;
        }
        if (!producerKinds(kind).some((id) => buildings.has(id))) {
          orphans.push(`${mission.id}: ${kind} (no buildable producer)`);
        }
        for (const req of requiredTechsFor(kind, mission.period)) {
          if (!techs.has(req)) orphans.push(`${mission.id}: ${kind} needs ${req}, which the mission does not allow`);
        }
      }
      for (const id of techs) {
        const tech = getTech(id);
        if (!tech) {
          orphans.push(`${mission.id}: ${id} (unknown tech)`);
          continue;
        }
        if (!buildings.has(tech.building)) {
          orphans.push(`${mission.id}: ${id} (building ${tech.building} is not buildable)`);
          continue;
        }
        const unlocked = tech.unlocksUnits ?? [];
        if (unlocked.length && !unlocked.some((kind) => units.includes(kind as UnitKind))) {
          orphans.push(`${mission.id}: ${id} (unlocks ${unlocked.join('/')}, none trainable)`);
        }
      }
    }
    expect(orphans).toEqual([]);
  });

  it('does not activate a goal that already opens with the mission', () => {
    // An objective a trigger activates must start pending, or the trigger is a no-op: the Chavín offering
    // could be handed over before the column reached the centre.
    const leaked: string[] = [];
    for (const mission of MISSIONS) {
      const activated = new Set(
        mission.triggers.flatMap((trigger) =>
          trigger.effects.flatMap((effect) =>
            effect.type === 'objective' && effect.state === 'activate' ? [effect.objectiveId] : [],
          ),
        ),
      );
      for (const objective of mission.objectives ?? []) {
        if (!activated.has(objective.id)) continue;
        if (!objective.hidden && !objective.awaitsCall) leaked.push(`${mission.id}:${objective.id}`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('does not gate a trigger on an objective "activation"', () => {
    // `state: 'activate'` is also true for a pending goal, so such a trigger fires at the mission start:
    // the Cusco counterattack used it and arrived in the first second.
    const early = MISSIONS.flatMap((mission) =>
      mission.triggers
        .filter((trigger) => trigger.condition.type === 'objective' && trigger.condition.state === 'activate')
        .map((trigger) => `${mission.id}:${trigger.id}`),
    );
    expect(early).toEqual([]);
  });

  it('holds Caral’s assembly on the Plaza Central, not on the site focus', () => {
    const mission = MISSIONS.find((m) => m.id === 'm1_caral')!;
    const game = headlessMission('m1_caral');
    try {
      const objective = mission.objectives!.find((o) => o.id === 'obj_asamblea')!;
      const anchor = game.resolveMissionPoint(objective.pos!);
      // The plaza's authored centre, not the site reference (the intro camera focus at the Mayor's forecourt).
      expect(anchor.x).toBeCloseTo(CARAL_PLAZA_CENTER.x, 3);
      expect(anchor.z).toBeCloseTo(CARAL_PLAZA_CENTER.z, 3);
      const focus = mission.layout!.site!.focus!;
      const oldAnchor = { x: focus.x * game.settings.mapSize, z: focus.z * game.settings.mapSize };
      expect(
        Math.hypot(anchor.x - oldAnchor.x, anchor.z - oldAnchor.z),
        'the assembly still sits on the site-focus anchor',
      ).toBeGreaterThan(5);

      // The sunken plaza's rim is solid, so a hold centred on it needs walkable ground on the apron.
      const blockers = [...(game.siteDef?.blockers ?? []), ...CARAL_CITY_BLOCKERS];
      const inside = (x: number, z: number): boolean =>
        blockers.some((b) => Math.abs(x - b.x) <= b.w / 2 && Math.abs(z - b.z) <= b.d / 2);
      const radius = objective.radius ?? 6;
      const probe = (x: number, z: number, fraction: number): number => {
        let free = 0;
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2;
          if (!inside(x + Math.cos(angle) * radius * fraction, z + Math.sin(angle) * radius * fraction)) free++;
        }
        return free;
      };
      expect(probe(anchor.x, anchor.z, 0.75), 'the assembly hold has no walkable apron').toBeGreaterThan(0);

      // And it can be met: one worker on the apron fills the 20 s hold (a second of margin).
      const missionState = game.mission!;
      missionState.start();
      missionState.objState.set('a2_excedente', 'completed');
      expect(missionState.activateObjective('obj_asamblea')).toBe(true);
      const worker = [...game.units.values()].find((u) => u.owner === 0 && u.kind === UnitKind.WORKER && !u.dead)!;
      let spot: { x: number; z: number } | null = null;
      for (let i = 0; i < 24 && !spot; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const x = anchor.x + Math.cos(angle) * radius * 0.75;
        const z = anchor.z + Math.sin(angle) * radius * 0.75;
        if (!inside(x, z)) spot = { x, z };
      }
      expect(spot, 'no apron spot for the assembly').not.toBeNull();
      worker.pos.set(spot!.x, game.terrain.getHeight(spot!.x, spot!.z), spot!.z);
      for (let i = 0; i < 21 * 60; i++) game.update(1 / 60, i / 60);
      expect(missionState.getObjectiveState('obj_asamblea'), 'the assembly hold never advances').toBe('completed');
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('keeps the Miraflores opening on the camp and the Cusco retreat north-west', () => {
    const miraflores = MISSIONS.find((m) => m.id === 'm_miraflores')!;
    const camp = miraflores.layout!.base!;
    const opening = miraflores.layout!.opening!;
    expect(
      Math.hypot((opening.x - camp.x) * 256, (opening.z - camp.z) * 256),
      'the Miraflores opening stopped framing the camp',
    ).toBeLessThan(10);

    const cusco = MISSIONS.find((m) => m.id === 'm_cusco_1536')!;
    const city = cusco.layout!.labels!.find((l) => l.text === 'Cusco')!;
    const retreat = cusco.objectives!.find((o) => o.id === 'a3_retirada')!.pos!;
    // Ollantaytambo is north-west of Cusco: north is -z, so both coordinates must be smaller.
    expect(retreat.dx).toBeLessThan(city.x * 256);
    expect(retreat.dz).toBeLessThan(city.z * 256);
  });

  it('does not finish the Tupac Amaru supply hold while the player does nothing', () => {
    // The goal lasts 20 s and used to sit on the start position: it completed without an order.
    const game = headlessMission('m7_tupac_amaru');
    try {
      for (let i = 0; i < 25 * 60; i++) game.update(1 / 60, i / 60);
      expect(game.mission!.getObjectiveState('a1_avituallamiento')).toBe('activo');
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  }, 30_000);
});
