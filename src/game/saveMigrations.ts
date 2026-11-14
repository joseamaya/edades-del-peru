import { SAVE_VERSION } from './saveTypes';

/**
 * Upgrade a stored snapshot to the current `SAVE_VERSION` one step at a time, instead of dropping a
 * player's save whenever the format moves. A version bump must add its step here, with a fixture test
 * in `tests/save-migrations.test.ts`. A step returns `null` when the old data cannot be carried over
 * honestly (the save is then reported as incompatible, not silently replaced).
 */
type Snapshot = Record<string, unknown> & { version: number };
type Step = (save: Snapshot) => Snapshot | null;

/** Oldest version that can still be upgraded. v1 predates the map-profile rework, so its terrain can't be rebuilt. */
export const OLDEST_MIGRATABLE_VERSION = 2;

const STEPS: Record<number, Step> = {
  // v2 → v3 removed the sci-fi `mech` unit (chronology audit); a v2 save may still hold one.
  2: (save) => ({
    ...save,
    units: Array.isArray(save.units)
      ? save.units.filter((u) => (u as { kind?: unknown } | null)?.kind !== 'mech')
      : save.units,
    version: 3,
  }),
  // v3 → v4 changed how farm reserves follow the drought, not the snapshot's shape; farms rebase on load.
  3: (save) => ({ ...save, version: 4 }),
};

export type MigrationResult =
  | { status: 'current' | 'migrated'; save: Snapshot; from: number }
  | { status: 'too-old' | 'too-new' | 'invalid'; from: number | null };

export function migrateSave(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object' || typeof (raw as { version?: unknown }).version !== 'number') {
    return { status: 'invalid', from: null };
  }
  let save = raw as Snapshot;
  const from = save.version;
  if (from > SAVE_VERSION) return { status: 'too-new', from };
  if (from === SAVE_VERSION) return { status: 'current', save, from };
  if (from < OLDEST_MIGRATABLE_VERSION) return { status: 'too-old', from };
  while (save.version < SAVE_VERSION) {
    const step = STEPS[save.version];
    const next = step ? step(save) : null;
    if (!next) return { status: 'too-old', from };
    save = next;
  }
  return { status: 'migrated', save, from };
}

/** Every version between the oldest migratable one and the current has a step (tests assert it). */
export function missingMigrationSteps(): number[] {
  const missing: number[] = [];
  for (let v = OLDEST_MIGRATABLE_VERSION; v < SAVE_VERSION; v++) if (!STEPS[v]) missing.push(v);
  return missing;
}
