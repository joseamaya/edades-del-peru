import { insideSiteBlocker, type SiteBlocker } from '../src/model/defs/sites';

/** Whether any blocker covers (x, z), using the same AABB the construction rule uses. */
export function blockersCover(blockers: readonly SiteBlocker[], x: number, z: number): boolean {
  return blockers.some((blocker) => insideSiteBlocker(blocker, x, z));
}
