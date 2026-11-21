import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import type { MissionDef, MissionPoint, ObjectiveDef } from '../src/campaign/types';
import { setAutoStart } from '../src/core/Game';
import { BuildingKind } from '../src/core/types';
import { getTech } from '../src/model/defs/techs';
import { headlessMission } from './headless';

/**
 * Structural contract of the mission data. These are the rules the 20-mission sweep found broken one
 * mission at a time; the tests keep them from coming back.
 */

type Wave = Extract<MissionDef['triggers'][number]['effects'][number], { type: 'wave' }>;
type PositionedHold = ObjectiveDef & { pos: MissionPoint };

/** Probe this fraction of a hold radius for walkable ground (the anchor cell itself may be a building). */
const HOLD_PROBE_FRACTION = 0.6;

function waves(mission: MissionDef): Wave[] {
  return mission.triggers.flatMap((t) => t.effects).filter((e): e is Wave => e.type === 'wave');
}

function positionedHolds(mission: MissionDef): PositionedHold[] {
  return (mission.objectives ?? []).filter((o): o is PositionedHold => o.kind === 'hold' && o.pos !== undefined);
}

/** A wave that appears where it must arrive: no entry point, or an entry point on the objective itself. */
function spawnsOnObjective(wave: Wave): boolean {
  const hasEntry = (p: { dx: number; dz: number } | undefined): boolean =>
    p !== undefined && (p.dx !== wave.pos?.dx || p.dz !== wave.pos?.dz);
  if (hasEntry(wave.spawn)) return false;
  return wave.target === undefined || !hasEntry(wave.target);
}

/**
 * Known debt: waves that still appear on the objective they must reach. The count is a ratchet and must
 * stay exact — a new wave cannot be added without an entry point, and fixing a mission means lowering
 * its number here.
 */
const WAVES_WITHOUT_ENTRY_POINT: Record<string, number> = {
  m5_yahuar_pampa: 2,
  m6_chimu_inca: 1,
  m6b_guerra_civil: 1,
  m_lima: 1,
  m_junta_cusco: 2,
  m8_independencia: 2,
};

/**
 * A hold anchored on the player's own start completes while the player does nothing. The only exception
 * is a position the mission deliberately defends and that an authored column attacks (Tarapacá's village).
 */
const DEFENDED_START_HOLDS = new Set(['m_tarapaca:a1_pueblo']);

describe('campaign mission contract', () => {
  it('records exactly the waves that appear on the objective they must reach', () => {
    const drift: string[] = [];
    for (const mission of MISSIONS) {
      const bad = waves(mission).filter(spawnsOnObjective).length;
      const known = WAVES_WITHOUT_ENTRY_POINT[mission.id] ?? 0;
      if (bad !== known) drift.push(`${mission.id}: ${bad} bad waves, recorded ${known}`);
    }
    expect(drift).toEqual([]);
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

  it('does not offer a technology its allowed buildings cannot host', () => {
    // Chavín listed the loom (institute) and silver metallurgy (smelter) while allowing only a house, a
    // mill, a farm and the market: two techs nobody could ever research.
    const orphans: string[] = [];
    for (const mission of MISSIONS) {
      if (!mission.allowedTechs || !mission.allowedBuildings) continue;
      for (const id of mission.allowedTechs) {
        const tech = getTech(id);
        if (!tech) {
          orphans.push(`${mission.id}: ${id} (unknown tech)`);
          continue;
        }
        // The town centre is always standing, so it never needs to be listed.
        if (tech.building === BuildingKind.CENTER) continue;
        if (!mission.allowedBuildings.includes(tech.building)) orphans.push(`${mission.id}: ${id}`);
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
