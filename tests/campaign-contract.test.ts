import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import type { MissionDef } from '../src/campaign/types';
import { setAutoStart } from '../src/core/Game';
import { headlessMission } from './headless';

/**
 * Structural contract of the mission data. These are the rules the 20-mission sweep found broken one
 * mission at a time; the tests keep them from coming back.
 */

type Wave = Extract<MissionDef['triggers'][number]['effects'][number], { type: 'wave' }>;

function waves(mission: MissionDef): Wave[] {
  return mission.triggers.flatMap((t) => t.effects).filter((e): e is Wave => e.type === 'wave');
}

/** A wave that appears where it must arrive: no `spawn` and no separate target. */
function spawnsOnObjective(wave: Wave): boolean {
  if (wave.spawn) return false;
  if (!wave.target || !wave.pos) return true;
  return wave.pos.dx === wave.target.dx && wave.pos.dz === wave.target.dz;
}

/**
 * Known debt: waves that still appear on the objective they must reach. The number is a ratchet — a new
 * wave cannot be added without an entry point, and fixing a mission means lowering its count here.
 */
const WAVES_WITHOUT_ENTRY_POINT: Record<string, number> = {
  m3_moche_recuay: 3,
  m5_yahuar_pampa: 2,
  m6_chimu_inca: 1,
  m6b_guerra_civil: 2,
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
  it('does not add waves that appear on the objective they must reach', () => {
    const unexpected: string[] = [];
    for (const mission of MISSIONS) {
      const bad = waves(mission).filter(spawnsOnObjective).length;
      const known = WAVES_WITHOUT_ENTRY_POINT[mission.id] ?? 0;
      if (bad > known) unexpected.push(`${mission.id}: ${bad} waves (known debt ${known})`);
    }
    expect(unexpected).toEqual([]);
  });

  it('does not add a hold that completes on the player start position', () => {
    const offenders: string[] = [];
    const unreachable: string[] = [];
    for (const mission of MISSIONS) {
      const holds = (mission.objectives ?? []).filter((o) => o.kind === 'hold' && o.pos);
      if (holds.length === 0) continue;
      const game = headlessMission(mission.id);
      try {
        const start = game.playerCenter(0);
        for (const hold of holds) {
          const at = game.resolveMissionPoint(hold.pos as never);
          // An anchor whose radius has no walkable ground is an objective that can never be finished.
          // Holds inside an enemy town are anchored on a blocked plaza cell, so probe the radius too.
          const reach = (hold.radius ?? 6) * 0.6;
          const probe = [
            [0, 0],
            [reach, 0],
            [-reach, 0],
            [0, reach],
            [0, -reach],
          ] as const;
          const reachable = probe.some(([dx, dz]) => game.pathfinder.isWalkable(at.x + dx, at.z + dz, 0));
          if (!reachable) {
            unreachable.push(`${mission.id}:${hold.id}`);
            continue;
          }
          const distance = Math.hypot(at.x - start.x, at.z - start.z);
          if (distance > 8) continue;
          if (DEFENDED_START_HOLDS.has(`${mission.id}:${hold.id}`)) continue;
          if (hold.clearEnemies === true) continue;
          offenders.push(`${mission.id}:${hold.id} at ${distance.toFixed(0)} m`);
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
