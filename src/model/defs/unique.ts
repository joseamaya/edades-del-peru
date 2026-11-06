import type { CivId } from '../../core/types';
import { TECHS, type TechDef } from './techs';
import { UNIT_ARCHETYPES, type UnitArchetype } from './units';

/** Unique units belonging to a civilization, in declaration order. */
export function uniqueUnitsForCiv(civ: CivId): UnitArchetype[] {
  return Object.values(UNIT_ARCHETYPES).filter((unit) => unit.category === 'unique' && unit.civs?.includes(civ));
}

/** Civilization-specific technologies, in declaration order. */
export function uniqueTechsForCiv(civ: CivId): TechDef[] {
  return TECHS.filter((tech) => tech.unique === true && tech.civs?.includes(civ));
}
