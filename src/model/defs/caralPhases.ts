import { standsAt as genericStandsAt, type SitePhasePlan } from './sitePhases';

/** Construction states of the Caral Pyramid Mayor (act III of docs/design/caral-model-mission.md). */
export type CaralMayorPhase = 'foundation' | 'fill' | 'finished' | 'in_use';

export const CARAL_PHASE_PLAN: SitePhasePlan = {
  phases: ['foundation', 'fill', 'finished', 'in_use'],
  initial: 'in_use',
};

/** Whether a Caral placement stands while the Pyramid Mayor is in `phase`. */
export function standsAt(p: { since?: CaralMayorPhase }, phase: CaralMayorPhase): boolean {
  return genericStandsAt(p.since, phase, CARAL_PHASE_PLAN);
}
