/**
 * Generic construction phases for an authored site. A mission names a phase and every piece/blocker
 * whose `since` is at or before it stands; the order lives in the site definition, not in the engine.
 */
export interface SitePhasePlan {
  /** Earliest to latest. */
  readonly phases: readonly string[];
  /** Phase of a mission that does not move its monument. */
  readonly initial: string;
}

export const SINGLE_PHASE: SitePhasePlan = { phases: ['in_use'], initial: 'in_use' };

/** Position of a phase in its plan; unknown phases sort before every known one. */
export function phaseOrder(plan: SitePhasePlan | undefined, phase: string): number {
  if (!plan) return 0;
  const index = plan.phases.indexOf(phase);
  return index < 0 ? -1 : index;
}

/** Whether a piece whose construction starts at `since` stands while the site is in `phase`. */
export function standsAt(since: string | undefined, phase: string, plan?: SitePhasePlan): boolean {
  if (!since) return true;
  return phaseOrder(plan, phase) >= phaseOrder(plan, since);
}

/** Whether a piece that stands from `since` is still there in `phase` (it may leave at `until`). */
export function standsIn(
  since: string | undefined,
  until: string | undefined,
  phase: string,
  plan?: SitePhasePlan,
): boolean {
  if (!standsAt(since, phase, plan)) return false;
  return !until || phaseOrder(plan, phase) < phaseOrder(plan, until);
}

export function isKnownPhase(plan: SitePhasePlan | undefined, phase: string): boolean {
  return !plan || plan.phases.includes(phase);
}
