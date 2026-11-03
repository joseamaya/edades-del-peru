import type { Era, Resources } from '../core/types';

export const MATCH_SNAPSHOT_INTERVAL = 5;

export interface PlayerSnapshot {
  id: number;
  name: string;
  civ: string;
  colorHex: string;
  resources: Resources;
  gathered: Resources;
  populationUsed: number;
  populationCap: number;
  army: number;
  workers: number;
  buildings: number;
  techs: string[];
  era: Era;
  kills: number;
  lost: number;
  alive: boolean;
}

export interface MatchSnapshot {
  t: number;
  players: PlayerSnapshot[];
}

interface PlayerLike {
  id: number;
  name: string;
  civ: string;
  colorHex: string;
  resources: Resources;
  populationUsed: number;
  populationCap: number;
  era: Era;
  techs: Set<string> | string[];
  kills: number;
  totalLost: number;
  alive: boolean;
}

interface UnitLike {
  owner: number;
  kind: string;
  dead: boolean;
}

interface BuildingLike {
  owner: number;
  dead: boolean;
}

function zero(): Resources {
  return { food: 0, wood: 0, silver: 0, stone: 0 };
}

/**
 * Deterministic in-simulation sampling for the post-game screen. It only reads
 * state and advances with the fixed simulation clock, so it never touches the
 * simulation RNG and is deliberately excluded from `stateHashOf`.
 */
export class MatchStatsCollector {
  readonly samples: MatchSnapshot[] = [];
  private readonly gathered = new Map<number, Resources>();
  private timer = 0;
  private elapsed = 0;

  reset(): void {
    this.samples.length = 0;
    this.gathered.clear();
    this.timer = 0;
    this.elapsed = 0;
  }

  recordGather(player: number, resource: keyof Resources, amount: number): void {
    if (!(amount > 0)) return;
    let total = this.gathered.get(player);
    if (!total) {
      total = zero();
      this.gathered.set(player, total);
    }
    total[resource] += amount;
  }

  update(
    dt: number,
    players: Iterable<PlayerLike>,
    units: Iterable<UnitLike>,
    buildings: Iterable<BuildingLike>,
  ): void {
    this.elapsed += Math.max(0, dt);
    this.timer += Math.max(0, dt);
    if (this.timer < MATCH_SNAPSHOT_INTERVAL) return;
    this.timer %= MATCH_SNAPSHOT_INTERVAL;
    this.capture(this.elapsed, players, units, buildings);
  }

  captureNow(players: Iterable<PlayerLike>, units: Iterable<UnitLike>, buildings: Iterable<BuildingLike>): void {
    const last = this.samples[this.samples.length - 1];
    if (last && Math.abs(last.t - this.elapsed) < 1e-6) return;
    this.capture(this.elapsed, players, units, buildings);
  }

  private capture(
    t: number,
    players: Iterable<PlayerLike>,
    units: Iterable<UnitLike>,
    buildings: Iterable<BuildingLike>,
  ): void {
    const counts = new Map<number, { army: number; workers: number; buildings: number }>();
    for (const p of players) counts.set(p.id, { army: 0, workers: 0, buildings: 0 });
    for (const u of units) {
      if (u.dead) continue;
      const c = counts.get(u.owner);
      if (!c) continue;
      if (u.kind === 'worker') c.workers++;
      else if (u.kind !== 'scout') c.army++;
    }
    for (const b of buildings) {
      if (b.dead) continue;
      const c = counts.get(b.owner);
      if (c) c.buildings++;
    }
    const rows: PlayerSnapshot[] = [];
    for (const p of players) {
      const c = counts.get(p.id) ?? { army: 0, workers: 0, buildings: 0 };
      rows.push({
        id: p.id,
        name: p.name,
        civ: p.civ,
        colorHex: p.colorHex,
        resources: { ...p.resources },
        gathered: { ...(this.gathered.get(p.id) ?? zero()) },
        populationUsed: p.populationUsed,
        populationCap: p.populationCap,
        army: c.army,
        workers: c.workers,
        buildings: c.buildings,
        techs: [...(p.techs as Iterable<string>)].sort(),
        era: p.era,
        kills: p.kills,
        lost: p.totalLost,
        alive: p.alive,
      });
    }
    this.samples.push({ t, players: rows });
  }

  toSave(): MatchStatsSave {
    return {
      elapsed: this.elapsed,
      timer: this.timer,
      gathered: [...this.gathered.entries()].map(([id, resources]) => [id, { ...resources }]),
      samples: this.samples.map((sample) => ({
        t: sample.t,
        players: sample.players.map((player) => ({
          ...player,
          resources: { ...player.resources },
          gathered: { ...player.gathered },
          techs: [...player.techs],
        })),
      })),
    };
  }

  applySave(save: MatchStatsSave | undefined): void {
    this.reset();
    if (!save) return;
    this.elapsed = save.elapsed;
    this.timer = save.timer;
    for (const [id, resources] of save.gathered) this.gathered.set(id, { ...resources });
    for (const sample of save.samples) {
      this.samples.push({
        t: sample.t,
        players: sample.players.map((player) => ({
          ...player,
          resources: { ...player.resources },
          gathered: { ...player.gathered },
          techs: [...player.techs],
        })),
      });
    }
  }
}

export interface MatchStatsSave {
  elapsed: number;
  timer: number;
  gathered: [number, Resources][];
  samples: MatchSnapshot[];
}
