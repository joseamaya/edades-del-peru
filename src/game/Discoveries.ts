import type { MissionDiscovery } from '../campaign/types';
import { getHeritageBuilding, type HeritageBuildingId } from '../model/defs/heritage';
import type { AuthoredSiteDef } from '../model/defs/sites';

/** How long the fog clearing takes to reach its full radius. */
export const DISCOVERY_REVEAL_SECONDS = 1.2;

export type DiscoveryState = 'pending' | 'revealing' | 'done';

export interface DiscoverySite {
  readonly id: HeritageBuildingId;
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly initial: boolean;
  state: DiscoveryState;
  elapsed: number;
}

/** Minimal fog contract, so the reveal animation is unit-testable without a renderer. */
export interface DiscoveryFow {
  isExplored(x: number, z: number): boolean;
  explore(x: number, z: number, radius: number): void;
}

/**
 * Names and clears the fog over the mission's authored sites. Visible objectives can reveal at
 * start; the rest trigger when the player's vision reaches them. The clearing grows from the site
 * so it reads as a discovery rather than a sudden texture update, and never pauses the match.
 */
export class Discoveries {
  readonly sites: DiscoverySite[] = [];

  constructor(
    defs: readonly MissionDiscovery[] | undefined,
    site: AuthoredSiteDef | undefined,
    private restored = false,
  ) {
    for (const def of defs ?? []) {
      const proxy = site?.heritageProxies.find((p) => p.id === def.heritageId);
      if (!proxy) {
        console.warn(`[discovery] ${def.heritageId} has no heritage proxy`);
        continue;
      }
      this.sites.push({
        id: def.heritageId,
        name: getHeritageBuilding(def.heritageId)?.name ?? def.heritageId,
        x: proxy.x,
        z: proxy.z,
        radius: def.radius ?? Math.max(proxy.w, proxy.d) / 2 + 10,
        initial: def.initial ?? false,
        state: 'pending',
        elapsed: 0,
      });
    }
  }

  /** Force a pending site to reveal now (a mission effect), with the same animation. */
  reveal(id: HeritageBuildingId): boolean {
    const site = this.sites.find((s) => s.id === id);
    if (!site || site.state !== 'pending') return false;
    site.state = 'revealing';
    site.elapsed = 0;
    return true;
  }

  /**
   * Advance pending discoveries. `onStart` fires once per site, when its clearing begins.
   * Discoveries are fog-only: with the fog off the sites are already visible and no animation runs.
   * On a restored save, a site whose fog is already explored is considered already discovered.
   */
  update(
    dt: number,
    fow: DiscoveryFow,
    fogOn: boolean,
    cinematic: boolean,
    onStart: (site: DiscoverySite) => void,
  ): void {
    if (!fogOn) {
      // With the fog off there is nothing to clear: a scripted reveal still counts as done.
      for (const site of this.sites) if (site.state !== 'done') site.state = 'done';
      return;
    }
    if (this.restored) {
      // Only the fog restored at load counts as "already discovered"; later exploration still animates.
      this.restored = false;
      for (const site of this.sites) {
        if (site.state === 'pending' && fow.isExplored(site.x, site.z)) site.state = 'done';
      }
    }
    for (const site of this.sites) {
      if (site.state === 'done') continue;
      if (site.state === 'pending') {
        if (cinematic) continue;
        if (!site.initial && !fow.isExplored(site.x, site.z)) continue;
        site.state = 'revealing';
        site.elapsed = 0;
        onStart(site);
      }
      site.elapsed += dt;
      const k = Math.min(1, site.elapsed / DISCOVERY_REVEAL_SECONDS);
      const eased = 1 - (1 - k) ** 3;
      fow.explore(site.x, site.z, site.radius * Math.max(0.08, eased));
      if (k >= 1) site.state = 'done';
    }
  }
}
