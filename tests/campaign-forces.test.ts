import { describe, expect, it } from 'vitest';
import { setAutoStart } from '../src/core/Game';
import { BuildingKind, UnitKind } from '../src/core/types';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { headlessMission } from './headless';

describe('campaign force contract', () => {
  it('never gives a base-less party the generic four workers and scout', () => {
    const game = headlessMission('m_tambotoco');
    try {
      expect(game.startBaseFor(0)).toBe(false);
      expect(game.openingUnitsFor(0), 'opening units default to the seat base flag').toBe(false);
      expect(game.startBaseFor(1)).toBe(true);
      expect(game.openingUnitsFor(1)).toBe(true);
      const workers = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.WORKER);
      // Tambotoco's authored party is five workers, not five plus the generic four.
      expect(workers).toHaveLength(5);
      const playerBuildings = [...game.buildings.values()].filter((b) => b.owner === 0 && !b.dead);
      expect(playerBuildings).toHaveLength(0);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('anchors the opening frame on the army, not on the base', () => {
    // The four missions whose troops stood in a corner: the army is well away from the centre building.
    for (const id of ['m_lima', 'm_lima_1821', 'm_real_felipe', 'm_cusco_1536']) {
      const game = headlessMission(id);
      try {
        const focus = game.seatFocus(0);
        const base = game.playerCenter(0);
        expect(Math.hypot(focus.x - base.x, focus.z - base.z), `${id} frames the base`).toBeGreaterThan(3);
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
    // The landmark missions keep their army on the authored opening, so the cave/huaca still frames the shot.
    for (const id of ['m1_caral', 'm_tambotoco', 'm_tarapaca']) {
      const game = headlessMission(id);
      try {
        const focus = game.seatFocus(0);
        const size = game.settings.mapSize;
        const opening = game.missionLayout!.opening!;
        const distance = Math.hypot(focus.x - opening.x * size, focus.z - opening.z * size);
        expect(distance, `${id} would lose its landmark frame`).toBeLessThanOrEqual(20);
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
  });

  it('starts a mission without an enemy economy with no peasant crew', () => {
    // Tambotoco's later acts are tied to the valley ayllus' camp, so its economy is a separate pass.
    // Chimú and the Inca civil war are the Inca phase: a capital and a field headquarters keep their
    // buildings but neither runs the skirmish economy.
    for (const id of ['m3_moche_recuay', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil']) {
      const game = headlessMission(id);
      try {
        const crew = (kind: UnitKind) =>
          [...game.units.values()].filter((u) => u.owner === 1 && !u.dead && u.kind === kind);
        expect(crew(UnitKind.WORKER), `${id} still fields the generic enemy crew`).toHaveLength(0);
        expect(crew(UnitKind.SCOUT), `${id} still fields the generic enemy scout`).toHaveLength(0);
        const def = MISSIONS.find((m) => m.id === id)!;
        expect(def.enemy.economy, `${id} runs a generic enemy economy`).toBe(false);
        const centre = [...game.buildings.values()].find((b) => b.owner === 1 && b.kind === BuildingKind.CENTER);
        expect(centre, `${id} lost the enemy town it keeps around the scripted force`).toBeDefined();
        expect(centre!.dead).toBeFalsy();
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
    // A besieging army keeps its own economy: the Lima camp feeds the siege.
    const town = headlessMission('m_lima');
    try {
      expect([...town.units.values()].some((u) => u.owner === 1 && u.kind === UnitKind.WORKER)).toBe(true);
      expect(MISSIONS.find((m) => m.id === 'm_lima')!.enemy.economy).not.toBe(false);
    } finally {
      town.destroy();
      setAutoStart(true);
    }
  });

  it('keeps the enemy from hiring or building once the economy is off', () => {
    // The AI's first sawmill lands within a second of a revert, so a minute is long enough to falsify the
    // `economy: false` flag; the mill at ~203 s would never be reached because construction already ran.
    for (const id of ['m3_moche_recuay', 'm5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil']) {
      const game = headlessMission(id);
      try {
        for (let i = 0; i < 60 * 60; i++) game.update(1 / 60, i / 60);
        const enemy = [...game.units.values()].filter((u) => u.owner === 1 && !u.dead);
        expect(
          enemy.filter((u) => u.kind === UnitKind.WORKER),
          `${id} grew a peasant crew`,
        ).toHaveLength(0);
        expect(
          enemy.filter((u) => u.kind === UnitKind.SCOUT),
          `${id} grew a scout`,
        ).toHaveLength(0);
        const industry = [...game.buildings.values()].filter(
          (b) => b.owner === 1 && !b.dead && (b.kind === BuildingKind.SAWMILL || b.kind === BuildingKind.MILL),
        );
        expect(industry, `${id} built a sawmill or mill`).toHaveLength(0);
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
  });

  it('keeps a scripted garrison at its post', () => {
    // `reinforce` defaults to an attack-move on the player's camp (a relief column); a garrison has to say
    // `objective: 'position'`, or it walks off and leaves the city it was meant to hold.
    for (const id of ['m5_yahuar_pampa', 'm6_chimu_inca', 'm6b_guerra_civil']) {
      const game = headlessMission(id);
      try {
        for (let i = 0; i < 2 * 60; i++) game.update(1 / 60, i / 60);
        const guards = [...game.units.values()].filter(
          (u) => u.owner === 1 && !u.dead && u.kind !== UnitKind.WORKER && u.kind !== UnitKind.SCOUT,
        );
        expect(guards.length, `${id} opens without a scripted garrison`).toBeGreaterThan(0);
        const posts = new Map(guards.map((guard) => [guard.id, { x: guard.pos.x, z: guard.pos.z }]));
        for (let i = 0; i < 60 * 60; i++) game.update(1 / 60, i / 60);
        for (const guard of guards) {
          const post = posts.get(guard.id)!;
          const distance = Math.hypot(guard.pos.x - post.x, guard.pos.z - post.z);
          expect(distance, `${id} guard ${guard.id} abandoned its post`).toBeLessThanOrEqual(24);
        }
      } finally {
        game.destroy();
        setAutoStart(true);
      }
    }
  });

  it('keeps a documented scripted defence without an enemy economy', () => {
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    // Its dossier says the enemy runs no economy; the pressure is the authored bombardment and assault.
    expect(m9.enemy.economy).toBe(false);
    expect(m9.enemy.attacks).toBe(false);
    // The Chilean camp is a staging area, not a town, and the garrison holds instead of chasing.
    expect(m9.start?.enemyBase).toBe(false);
    const units = m9.start?.units ?? [];
    expect(units.filter((u) => u.kind !== UnitKind.WORKER).every((u) => u.stance === 'defensivo')).toBe(true);
    const waves = m9.triggers.filter((t) => t.effects.some((e) => e.type === 'wave'));
    const sizes = waves.flatMap((t) =>
      t.effects.filter((e) => e.type === 'wave').map((e) => e.units.reduce((sum, u) => sum + u.count, 0)),
    );
    expect(sizes).toEqual([6, 6, 4]);
  });

  it('pins Arica’s lines to the ground and sends its waves at them', () => {
    const m9 = MISSIONS.find((m) => m.id === 'm9_guerra_pacifico')!;
    const game = headlessMission(m9.id);
    try {
      const holds = m9.objectives.filter((o) => o.kind === 'hold' && o.pos);
      expect(holds.map((o) => o.id)).toEqual(['a1_minas', 'a2_bombardeo', 'a3_asalto']);
      const lines = holds.filter((o) => o.id !== 'a1_minas');
      const before = lines.map((o) => game.resolveMissionPoint(o.pos!));
      // The bombardment can raze the town; a line anchored on the centre would move with the rubble.
      for (const b of [...game.buildings.values()]) if (b.owner === 0) b.dead = true;
      lines.forEach((o, i) => expect(game.resolveMissionPoint(o.pos!)).toEqual(before[i]));

      const waves = m9.triggers.flatMap((t) => t.effects).filter((e) => e.type === 'wave');
      expect(waves.length).toBe(3);
      for (const wave of waves) {
        // Each column attacks a defended line, not the town behind it.
        const target = game.resolveMissionPoint((wave.target ?? wave.pos)!);
        const nearest = Math.min(...before.map((p) => Math.hypot(p.x - target.x, p.z - target.z)));
        expect(nearest, 'a wave aims at the town instead of a defended line').toBeLessThan(1);
        // It enters on the northern approach, clear of the ground it attacks (the contract only guarantees
        // the radius; a column could still appear inside the town and march out).
        const entry = game.resolveMissionPoint((wave.spawn ?? wave.pos)!);
        const toLine = Math.min(...before.map((p) => Math.hypot(p.x - entry.x, p.z - entry.z)));
        expect(toLine, 'a wave spawns inside the defended ground').toBeGreaterThan(20);
        expect(entry.z, 'a wave enters from the south instead of the northern approach').toBeLessThan(
          Math.min(...before.map((p) => p.z)),
        );
        // A 56 m gun against 13 m weapons removes the garrison before it can fight; the bombardment is told.
        expect(wave.units.map((u) => u.kind)).not.toContain(UnitKind.ARTILLERY);
      }
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });

  it('lets a scripted battle disable both seats and skip the opening resource ring', () => {
    const game = headlessMission('m_tarapaca');
    try {
      expect(game.startBaseFor(0)).toBe(false);
      expect(game.startBaseFor(1)).toBe(false);
      expect(game.openingUnitsFor(0)).toBe(false);
      expect(game.openingUnitsFor(1)).toBe(false);
      const workers = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.WORKER);
      expect(workers).toHaveLength(0);
      expect(game.buildings.size).toBe(0);
      expect(game.players[0].resources).toEqual({ food: 0, wood: 0, silver: 0, stone: 0 });
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});
