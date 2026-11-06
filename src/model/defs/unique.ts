import { CivId } from '../../core/types';
import { TECHS, type TechDef } from './techs';
import { UNIT_ARCHETYPES, type UnitArchetype } from './units';

/** Documented reasons why a civilization has no unique unit. */
export interface UniqueUnitGap {
  reason: string;
  source: string;
}

export const UNIQUE_UNIT_GAPS: Partial<Record<CivId, UniqueUnitGap>> = {
  [CivId.CARAL]: {
    reason: 'Sociedad estatal sin ejército documentado; no se inventa una unidad militar.',
    source: 'docs/historia/civilizaciones/caral.md',
  },
  [CivId.CHAVIN]: {
    reason: 'Centro ceremonial y oráculo; no hay una unidad militar chavín concreta documentada.',
    source: 'docs/historia/civilizaciones/chavin.md',
  },
  [CivId.PARACAS]: {
    reason: 'Hay armas y trepanaciones, pero no una unidad militar paracas concreta documentada.',
    source: 'docs/historia/civilizaciones/paracas.md',
  },
  [CivId.TIAHUANACO]: {
    reason: 'Estado teocrático-militar sin una unidad concreta documentada; se evita inventarla.',
    source: 'docs/historia/civilizaciones/tiahuanaco.md',
  },
};

export function uniqueUnitGapForCiv(civ: CivId): UniqueUnitGap | null {
  return UNIQUE_UNIT_GAPS[civ] ?? null;
}

/** Unique units belonging to a civilization, in declaration order. */
export function uniqueUnitsForCiv(civ: CivId): UnitArchetype[] {
  return Object.values(UNIT_ARCHETYPES).filter((unit) => unit.category === 'unique' && unit.civs?.includes(civ));
}

/** Civilization-specific technologies, in declaration order. */
export function uniqueTechsForCiv(civ: CivId): TechDef[] {
  return TECHS.filter((tech) => tech.unique === true && tech.civs?.includes(civ));
}
