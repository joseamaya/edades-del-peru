import { CivId, Era, HistoricalPeriod, Resources } from '../../core/types';
import { UNIT_ARCHETYPES, UnitOverride, DamageClass, ProjectileKind } from '../../model/defs/units';
import { BUILDING_DEFS, BuildingOverride } from '../../model/defs/buildings';
import { TECHS, TechDef, TechEffect } from '../../model/defs/techs';
import { CIVS, ArchStyle, EmblemId } from '../../model/defs/civs';

/**
 * Hand-rolled schema + validator for JSON mods (no external dependency). A mod
 * is a data patch over the game's definitions; `validateMod` returns clear
 * errors so a bad mod is ignored instead of crashing the game.
 *
 * Sources of truth for the valid id/field sets: `src/model/defs/*`.
 */
export const SCHEMA_VERSION = 2;

export interface UnitModEntry extends UnitOverride {
  id: string;
}
export interface BuildingModEntry extends BuildingOverride {
  id: string;
}
export interface TechModEntry extends Partial<TechDef> {
  id: string;
}
export interface CivModEntry {
  id: string;
  colors?: { primary: string; secondary: string; accent: string };
  bonuses?: string[];
  effects?: Record<string, unknown>;
  visual?: { arch: ArchStyle; emblem: EmblemId };
}

export interface ModDef {
  schemaVersion: number;
  name: string;
  description?: string;
  units?: UnitModEntry[];
  buildings?: BuildingModEntry[];
  techs?: TechModEntry[];
  civs?: CivModEntry[];
}

export type ValidationResult = { ok: true; mod: ModDef } | { ok: false; errors: string[] };

const RESOURCE_KEYS: (keyof Resources)[] = ['food', 'wood', 'silver', 'stone'];
const DAMAGE_CLASSES: DamageClass[] = ['light', 'heavy', 'fortified'];
const PROJECTILES: ProjectileKind[] = [
  'bullet',
  'rocket',
  'howitzer_shell',
  'nuclear',
  'tracer',
  'arrow',
  'sling_stone',
];
const UNIT_CATEGORIES = ['econ', 'infantry', 'ranged', 'cavalry', 'siege', 'special', 'unique'];
const BUILDING_CATEGORIES = ['economy', 'military', 'defense', 'advance', 'special'];
const ARCH_STYLES: ArchStyle[] = [
  'coastal-adobe',
  'andean-masonry',
  'altiplano-stone',
  'highland-terraced',
  'colonial',
  'republican',
];
const EMBLEMS: EmblemId[] = [
  'wave',
  'feline',
  'fret',
  'geometric',
  'staff',
  'condor',
  'sun',
  'cross',
  'sunburst',
  'shield',
];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isPosNum = (v: unknown): v is number => isNum(v) && v >= 0;
const isPeriod = (v: unknown): v is number =>
  isNum(v) && v >= HistoricalPeriod.ARCHAIC && v <= HistoricalPeriod.CONTEMPORARY;

function checkResources(v: unknown, where: string, errors: string[]): void {
  if (!isObj(v)) {
    errors.push(`${where}: cost must be an object`);
    return;
  }
  for (const [k, val] of Object.entries(v)) {
    if (!RESOURCE_KEYS.includes(k as keyof Resources)) errors.push(`${where}: unknown resource "${k}"`);
    else if (!isPosNum(val)) errors.push(`${where}: cost.${k} must be a number >= 0`);
  }
}

function checkEraMods(v: unknown, where: string, errors: string[]): void {
  if (!isObj(v)) {
    errors.push(`${where}: eraStats must be an object`);
    return;
  }
  for (const [k, val] of Object.entries(v)) {
    const era = Number(k);
    if (!Number.isInteger(era) || era < Era.FORMATIVE || era > Era.CONTEMPORARY) {
      errors.push(`${where}: eraStats key "${k}" is not an era (0-${Era.CONTEMPORARY})`);
      continue;
    }
    if (!isObj(val)) {
      errors.push(`${where}: eraStats[${k}] must be an object`);
      continue;
    }
    for (const [mk, mv] of Object.entries(val)) {
      if (!isPosNum(mv)) errors.push(`${where}: eraStats[${k}].${mk} must be a number >= 0`);
    }
  }
}

function validateUnit(e: unknown, i: number, errors: string[]): void {
  const where = `units[${i}]`;
  if (!isObj(e) || !isStr(e.id)) {
    errors.push(`${where}: needs a string "id"`);
    return;
  }
  if (!(e.id in UNIT_ARCHETYPES)) {
    errors.push(`${where}: unknown unit id "${e.id}"`);
    return;
  }
  if (e.name !== undefined && !isStr(e.name)) errors.push(`${where}: name must be a string`);
  if (e.description !== undefined && !isStr(e.description)) errors.push(`${where}: description must be a string`);
  if (e.category !== undefined && !UNIT_CATEGORIES.includes(e.category as string))
    errors.push(`${where}: unknown category "${e.category}"`);
  if (e.stats !== undefined) {
    if (!isObj(e.stats)) errors.push(`${where}: stats must be an object`);
    else {
      for (const [k, v] of Object.entries(e.stats)) {
        if (k === 'cost') checkResources(v, where, errors);
        else if (k === 'damageType') {
          if (!DAMAGE_CLASSES.includes(v as DamageClass)) errors.push(`${where}: unknown damageType "${v}"`);
        } else if (k === 'projectile') {
          if (!PROJECTILES.includes(v as ProjectileKind)) errors.push(`${where}: unknown projectile "${v}"`);
        } else if (!isPosNum(v)) errors.push(`${where}: stats.${k} must be a number >= 0`);
      }
    }
  }
  if (e.eraStats !== undefined) checkEraMods(e.eraStats, where, errors);
}

function validateBuilding(e: unknown, i: number, errors: string[]): void {
  const where = `buildings[${i}]`;
  if (!isObj(e) || !isStr(e.id)) {
    errors.push(`${where}: needs a string "id"`);
    return;
  }
  if (!(e.id in BUILDING_DEFS)) {
    errors.push(`${where}: unknown building id "${e.id}"`);
    return;
  }
  if (e.name !== undefined && !isStr(e.name)) errors.push(`${where}: name must be a string`);
  if (e.description !== undefined && !isStr(e.description)) errors.push(`${where}: description must be a string`);
  if (e.category !== undefined && !BUILDING_CATEGORIES.includes(e.category as string))
    errors.push(`${where}: unknown category "${e.category}"`);
  if (e.stats !== undefined) {
    if (!isObj(e.stats)) errors.push(`${where}: stats must be an object`);
    else {
      for (const [k, v] of Object.entries(e.stats)) {
        if (k === 'cost') checkResources(v, where, errors);
        else if (k === 'attack') {
          if (!isObj(v)) errors.push(`${where}: stats.attack must be an object`);
        } else if (!isPosNum(v)) errors.push(`${where}: stats.${k} must be a number >= 0`);
      }
    }
  }
  if (e.eraStats !== undefined) checkEraMods(e.eraStats, where, errors);
}

function validateTech(e: unknown, i: number, errors: string[]): void {
  const where = `techs[${i}]`;
  if (!isObj(e) || !isStr(e.id)) {
    errors.push(`${where}: needs a string "id"`);
    return;
  }
  const existing = TECHS.some((t) => t.id === e.id);
  if (e.name !== undefined && !isStr(e.name)) errors.push(`${where}: name must be a string`);
  if (e.description !== undefined && !isStr(e.description)) errors.push(`${where}: description must be a string`);
  if (e.cost !== undefined) checkResources(e.cost, where, errors);
  if (e.time !== undefined && !isPosNum(e.time)) errors.push(`${where}: time must be a number >= 0`);
  if (e.minPeriod !== undefined && !isPeriod(e.minPeriod)) errors.push(`${where}: minPeriod out of range`);
  if (e.maxPeriod !== undefined && !isPeriod(e.maxPeriod)) errors.push(`${where}: maxPeriod out of range`);
  if (e.building !== undefined && (!isStr(e.building) || !(e.building in BUILDING_DEFS)))
    errors.push(`${where}: unknown building "${String(e.building)}"`);
  if (e.effect !== undefined && !isObj(e.effect)) errors.push(`${where}: effect must be an object`);
  if (!existing) {
    // a brand-new tech must be complete enough to be usable
    for (const req of ['name', 'description', 'cost', 'time', 'minPeriod', 'building', 'effect'] as const) {
      if (e[req] === undefined) errors.push(`${where}: new tech "${e.id}" is missing "${req}"`);
    }
  }
}

function validateCiv(e: unknown, i: number, errors: string[]): void {
  const where = `civs[${i}]`;
  if (!isObj(e) || !isStr(e.id)) {
    errors.push(`${where}: needs a string "id"`);
    return;
  }
  if (!CIVS.some((c) => c.id === (e.id as CivId))) {
    errors.push(`${where}: unknown civ id "${e.id}"`);
    return;
  }
  if (e.colors !== undefined) {
    if (!isObj(e.colors)) errors.push(`${where}: colors must be an object`);
    else
      for (const k of ['primary', 'secondary', 'accent'] as const) {
        if (!isStr(e.colors[k])) errors.push(`${where}: colors.${k} must be a string`);
      }
  }
  if (e.bonuses !== undefined && (!Array.isArray(e.bonuses) || !e.bonuses.every(isStr)))
    errors.push(`${where}: bonuses must be an array of strings`);
  if (e.visual !== undefined) {
    if (!isObj(e.visual)) errors.push(`${where}: visual must be an object`);
    else {
      if (!ARCH_STYLES.includes(e.visual.arch as ArchStyle)) errors.push(`${where}: unknown visual.arch`);
      if (!EMBLEMS.includes(e.visual.emblem as EmblemId)) errors.push(`${where}: unknown visual.emblem`);
    }
  }
}

/** Validate an arbitrary parsed JSON value as a mod. */
export function validateMod(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['mod must be a JSON object'] };
  if (raw.schemaVersion !== SCHEMA_VERSION)
    errors.push(`unsupported schemaVersion ${String(raw.schemaVersion)} (expected ${SCHEMA_VERSION})`);
  if (!isStr(raw.name) || raw.name.trim() === '') errors.push('mod needs a non-empty "name"');

  const sections: [keyof ModDef, (e: unknown, i: number, err: string[]) => void][] = [
    ['units', validateUnit],
    ['buildings', validateBuilding],
    ['techs', validateTech],
    ['civs', validateCiv],
  ];
  for (const [key, fn] of sections) {
    const list = raw[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      errors.push(`"${key}" must be an array`);
      continue;
    }
    list.forEach((entry, i) => fn(entry, i, errors));
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, mod: raw as unknown as ModDef };
}

// Re-export for the loader so it can apply patches without importing the defs.
export type { UnitOverride, BuildingOverride, TechEffect };
