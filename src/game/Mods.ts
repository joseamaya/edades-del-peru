import { BuildingKind, CivId, UnitKind } from '../core/types';
import type { CivDef } from '../model/defs/civs';
import { overrideCiv } from '../model/defs/civs';
import { overrideBuilding } from '../model/defs/buildings';
import { overrideTech } from '../model/defs/techs';
import { overrideUnit } from '../model/defs/units';
import { ModDef, validateMod } from './mods/schema';

export interface ModLoadResult {
  /** Mod ids that were validated and applied, in order. */
  loaded: string[];
  /** Human-readable errors for mods that were skipped. */
  errors: string[];
}

/** Apply a validated mod to the in-memory definitions (mutates the defs). */
export function applyMod(mod: ModDef): void {
  for (const u of mod.units ?? []) overrideUnit(u.id as UnitKind, u);
  for (const b of mod.buildings ?? []) overrideBuilding(b.id as BuildingKind, b);
  for (const t of mod.techs ?? []) overrideTech(t);
  for (const c of mod.civs ?? []) overrideCiv(c.id as CivId, c as Partial<CivDef>);
}

/**
 * Fetch, validate and apply mods from `base` in order (later mods win). An
 * invalid or missing mod is skipped with an error, never thrown, so one bad mod
 * cannot stop the game from booting.
 */
export async function loadMods(ids: string[], base = './mods/'): Promise<ModLoadResult> {
  const loaded: string[] = [];
  const errors: string[] = [];
  for (const id of ids) {
    try {
      const res = await fetch(`${base}${id}.json`);
      if (!res.ok) {
        errors.push(`mod "${id}": not found (${res.status})`);
        continue;
      }
      const result = validateMod(await res.json());
      if (!result.ok) {
        errors.push(`mod "${id}": ${result.errors.join('; ')}`);
        continue;
      }
      applyMod(result.mod);
      loaded.push(id);
    } catch (e) {
      errors.push(`mod "${id}": ${(e as Error).message}`);
    }
  }
  return { loaded, errors };
}
