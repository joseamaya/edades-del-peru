import { describe, expect, it } from 'vitest';
import { saveIncompatible, validateSave } from '../src/game/SaveGame';
import { migrateSave, missingMigrationSteps, OLDEST_MIGRATABLE_VERSION } from '../src/game/saveMigrations';
import { SAVE_VERSION } from '../src/game/saveTypes';

function snapshot(version: number, units: unknown[] = []) {
  return {
    version,
    settings: {},
    rngState: 0,
    camera: { x: 0, z: 0, zoom: 100, yaw: 0 },
    fog: '',
    players: [],
    units,
    buildings: [],
    resourceNodes: [],
  };
}

describe('save migrations', () => {
  it('has an upgrade step for every version a player can still hold', () => {
    expect(missingMigrationSteps()).toEqual([]);
  });

  it('upgrades a v3 save to the current version instead of dropping it', () => {
    const result = migrateSave(snapshot(3));
    expect(result.status).toBe('migrated');
    expect(validateSave(snapshot(3))?.version).toBe(SAVE_VERSION);
  });

  it('drops the removed sci-fi unit when it upgrades a v2 save', () => {
    const units = [
      { id: 1, kind: 'worker' },
      { id: 2, kind: 'mech' },
    ];
    const result = migrateSave(snapshot(2, units));
    expect(result.status).toBe('migrated');
    if (result.status !== 'migrated') return;
    expect((result.save.units as { kind: string }[]).map((u) => u.kind)).toEqual(['worker']);
    expect(result.save.version).toBe(SAVE_VERSION);
  });

  it('reports saves it cannot carry over instead of guessing', () => {
    expect(migrateSave(snapshot(OLDEST_MIGRATABLE_VERSION - 1)).status).toBe('too-old');
    expect(migrateSave(snapshot(SAVE_VERSION + 1)).status).toBe('too-new');
    expect(migrateSave({ nope: true }).status).toBe('invalid');
    expect(validateSave(snapshot(1))).toBeNull();
    // m9 moved from 192 m to 256 m: its old coordinates are not honest to keep.
    const oldM9 = snapshot(4);
    oldM9.settings = { missionId: 'm9_guerra_pacifico' } as never;
    expect(migrateSave(oldM9).status).toBe('too-old');
    const other = snapshot(4);
    other.settings = { missionId: 'm1_caral', mapSize: 192 } as never;
    expect(migrateSave(other).status).toBe('migrated');
    // m7 moved from 192 m to 256 m on the next version; its old coordinates are not honest either.
    const oldM7 = snapshot(5);
    oldM7.settings = { missionId: 'm7_tupac_amaru' } as never;
    expect(migrateSave(oldM7).status).toBe('too-old');
    const m9V5 = snapshot(5);
    m9V5.settings = { missionId: 'm9_guerra_pacifico' } as never;
    expect(migrateSave(m9V5).status).toBe('migrated');
  });

  it('reports a stored save the current build cannot load', () => {
    const raw = JSON.stringify({ version: 4, settings: { missionId: 'm9_guerra_pacifico' } });
    const store = { getItem: () => raw, removeItem: () => {}, setItem: () => {} };
    const previous = (globalThis as { localStorage?: unknown }).localStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true });
    try {
      expect(saveIncompatible()).toBe(true);
      store.getItem = () => null;
      expect(saveIncompatible()).toBe(false);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: previous, configurable: true });
    }
  });

  it('leaves a current save untouched', () => {
    const save = snapshot(SAVE_VERSION);
    const result = migrateSave(save);
    expect(result.status).toBe('current');
    if (result.status === 'current') expect(result.save).toBe(save);
  });
});
