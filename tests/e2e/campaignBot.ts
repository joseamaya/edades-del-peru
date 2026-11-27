import type { Page } from '@playwright/test';

export interface CampaignBot {
  /** Advance the stopped match by `seconds` of simulated time, dismissing mission cards. */
  run(seconds: number): void;
  move(ids: number[], x: number, z: number): void;
  /** Send each unit to a live node of `resource`, nearest to `near` (or to the unit). */
  gather(ids: number[], resource: string, near?: { x: number; z: number }): void;
  build(ids: number[], entityId: number): void;
  /** Press the field card's hand-over for an active delivery objective. */
  deliver(id: string): boolean;
  /** Queue a technology at the first owned building that accepts it. */
  research(tech: string): boolean;
  /** Select a monument on the map and press its HUD command (`Visitar` by default). */
  visit(id: string, labelSource?: string): void;
  resources(): Record<string, number>;
  state(id: string): string;
  ended(): boolean;
  won(): boolean | null;
  time(): number;
}

export interface CampaignBotWindow extends Window {
  __campaignBot: CampaignBot;
}

/**
 * Page-side primitives shared by the campaign playtests. They replace the old direct calls
 * (`recordDelivery`, `techs.add`, `visitHeritage`, teleporting a unit onto the site) with the same
 * player commands the HUD sends, so a passing playtest means the mission is playable.
 *
 * The body has to stay self-contained: Playwright serializes it into the page, where imports do not
 * exist. Like `installHeritageClick`, it is installed with `addInitScript` before `page.goto`.
 */
export async function installCampaignBot(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let time = 0;
    const game = (): any => (window as unknown as { game: any }).game;

    const nearestNode = (resource: string, point: { x: number; z: number }): any => {
      const g = game();
      let best: any = null;
      let bestDistance = Infinity;
      for (const node of g.resourceNodes.values()) {
        if (node.dead || node.depleted || node.resource !== resource) continue;
        const d = Math.hypot(node.pos.x - point.x, node.pos.z - point.z);
        if (d < bestDistance) {
          best = node;
          bestDistance = d;
        }
      }
      return best;
    };

    const bot: CampaignBot = {
      run(seconds: number): void {
        const g = game();
        if (!g?.mission) return;
        if (g.getPaused()) g.togglePause();
        const dt = 1 / 60;
        for (let i = 0; i < Math.ceil(seconds / dt) && !g.mission.ended; i++) {
          document.querySelector<HTMLElement>('.ed-mission-card')?.click();
          g.update(dt, time);
          time += dt;
        }
      },
      move(ids: number[], x: number, z: number): void {
        if (!ids.length) return;
        game().executeCommand(
          { kind: 'order', unitIds: ids, order: { kind: 'move', target: { x, z } }, clear: true },
          false,
        );
      },
      gather(ids: number[], resource: string, near?: { x: number; z: number }): void {
        const g = game();
        for (const id of ids) {
          const unit = g.units.get(id);
          if (!unit || unit.dead) continue;
          // A worker on its way to the dropsite carries a full load; clearing that order would strand it
          // at the node with no capacity left.
          if (unit.orderQueue[0]?.kind === 'gather' || unit.orderQueue[0]?.kind === 'deliver') continue;
          if (unit.carryCountNow() > 0) continue;
          const node = nearestNode(resource, near ?? unit.pos);
          if (!node) continue;
          g.executeCommand(
            { kind: 'order', unitIds: [id], order: { kind: 'gather', entityId: node.id }, clear: true },
            false,
          );
        }
      },
      build(ids: number[], entityId: number): void {
        const g = game();
        for (const id of ids) {
          const unit = g.units.get(id);
          if (!unit || unit.dead) continue;
          if (unit.orderQueue[0]?.entityId === entityId) continue;
          g.executeCommand({ kind: 'order', unitIds: [id], order: { kind: 'build', entityId }, clear: true }, false);
        }
      },
      deliver(id: string): boolean {
        return game().deliverToHeritage(id);
      },
      research(tech: string): boolean {
        const g = game();
        if (g.players[0].techs.has(tech)) return true;
        for (const building of g.buildings.values()) {
          if (building.owner !== 0 || building.dead || !building.constructionComplete) continue;
          if (g.executeCommand({ kind: 'research', buildingId: building.id, tech }, false)) return true;
        }
        return false;
      },
      visit(id: string, labelSource = 'Visitar'): void {
        const click = (window as unknown as { __heritageClick?: (id: string, label: string) => void }).__heritageClick;
        if (!click) throw new Error('installHeritageClick was not installed');
        click(id, labelSource);
      },
      resources(): Record<string, number> {
        return { ...game().players[0].resources };
      },
      state(id: string): string {
        return game().mission.getObjectiveState(id);
      },
      ended(): boolean {
        return game().mission.ended;
      },
      won(): boolean | null {
        return game().mission.won;
      },
      time(): number {
        return time;
      },
    };
    (window as unknown as CampaignBotWindow).__campaignBot = bot;
  });
}
