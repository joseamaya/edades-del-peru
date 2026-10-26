import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import type { Building } from '../entities/Building';
import { MissionDef, ObjectiveDef, ObjectiveKind, TriggerDef, TriggerEffect, MissionPoint } from './types';
import { OrderKind, BuildingKind } from '../core/types';
import { distance2D } from '../util/math';
import { commanderFor } from '../model/defs/commanders';
import type { MissionSave } from '../game/saveTypes';

export type ObjState = 'pendiente' | 'activo' | 'completed' | 'failed';

/** HUD-facing numeric progress for an objective that has a measurable target. */
export interface ObjectiveProgress {
  current: number;
  target: number;
  format: 'count' | 'time';
}

/**
 * Mission controller: evaluates objectives and triggers every frame,
 * spawns waves/reinforcements and declares victory or narrative defeat.
 */
export class Mission {
  def: MissionDef;
  ended = false;
  /** Result once `ended` is true: `true` won, `false` lost, `null` still running. */
  won: boolean | null = null;
  private game: Game;
  private timer = 0;
  private started = false;
  private objState = new Map<string, ObjState>();
  private fired = new Set<string>();
  private lastFired = new Map<string, number>();
  private spawnedCount = new Map<string, number>();
  private holdTimers = new Map<string, number>();
  private onEnd: (win: boolean) => void;

  constructor(game: Game, def: MissionDef, onEnd: (win: boolean) => void) {
    this.game = game;
    this.def = def;
    this.onEnd = onEnd;
    for (const o of def.objectives) this.objState.set(o.id, this.defaultState(o));
  }

  private defaultState(o: ObjectiveDef): ObjState {
    return o.hidden ? 'pendiente' : 'activo';
  }

  get activeObjectives(): { def: ObjectiveDef; state: ObjState }[] {
    return this.def.objectives
      .filter(
        (o) =>
          this.objState.get(o.id) === 'activo' ||
          this.objState.get(o.id) === 'completed' ||
          this.objState.get(o.id) === 'failed',
      )
      .map((o) => ({ def: o, state: this.objState.get(o.id) as ObjState }));
  }

  private baseCenter(owner: number): { x: number; z: number } {
    const c = [...this.game.buildings.values()].find(
      (b) => b.owner === owner && b.kind === BuildingKind.CENTER && !b.dead,
    );
    if (c) return { x: c.pos.x, z: c.pos.z };
    return { x: this.game.settings.mapSize / 2, z: this.game.settings.mapSize / 2 };
  }

  private resolvePoint(p: MissionPoint): { x: number; z: number } {
    const ref =
      p.ref === 'enemy'
        ? this.baseCenter(1)
        : p.ref === 'player'
          ? this.baseCenter(0)
          : p.ref === 'canal'
            ? (this.game.canalSite ?? { x: this.game.settings.mapSize / 2, z: this.game.settings.mapSize / 2 })
            : p.ref === 'landmark'
              ? (this.game.landmark?.position ?? {
                  x: this.game.settings.mapSize / 2,
                  z: this.game.settings.mapSize / 2,
                })
              : { x: 0, z: 0 };
    return { x: ref.x + p.dx, z: ref.z + p.dz };
  }

  private byTag(tag: string): (Unit | Building)[] {
    const units = [...this.game.units.values()].filter((u) => u.tag === tag);
    const buildings = [...this.game.buildings.values()].filter((b) => b.tag === tag);
    return [...units, ...buildings];
  }

  private countAlive(tag: string): number {
    return this.byTag(tag).filter((e) => !e.dead).length;
  }

  /** Buildings that satisfy a `build` objective, including its optional location. */
  private countBuilt(o: ObjectiveDef): number {
    if (!o.buildingKind) return 0;
    const tp = o.pos ? this.resolvePoint(o.pos) : null;
    return [...this.game.buildings.values()].filter(
      (b) =>
        b.owner === 0 &&
        b.kind === o.buildingKind &&
        b.constructionComplete &&
        !b.dead &&
        (!tp || distance2D(b.pos.x, b.pos.z, tp.x, tp.z) < (o.radius ?? 12)),
    ).length;
  }

  /** A `reach` objective with no tag accepts any living player unit. */
  private reached(o: ObjectiveDef): boolean {
    if (!o.pos) return false;
    const tp = this.resolvePoint(o.pos);
    const pts = o.entityTag
      ? this.byTag(o.entityTag).filter((e) => !e.dead && 'owner' in e && (e as Unit).owner === 0)
      : [...this.game.units.values()].filter((u) => u.owner === 0 && !u.dead);
    return pts.some((e) => distance2D(e.pos.x, e.pos.z, tp.x, tp.z) < (o.radius ?? 6));
  }

  private spawned(tag: string): boolean {
    const n = this.spawnedCount.get(tag) ?? 0;
    return n > 0 || this.byTag(tag).length > 0;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    // remember which tags exist at start so that objectives/triggers that
    // keep references valid even if the entity dies later
    for (const e of this.def.start.buildings ?? []) if (e.tag) this.spawnedCount.set(e.tag, 1);
    for (const u of this.def.start.units ?? []) if (u.tag) this.spawnedCount.set(u.tag, 1);
    for (const m of this.def.mark ?? []) this.spawnedCount.set(m.tag, 1);
    for (const m of this.def.mark ?? []) {
      const b = [...this.game.buildings.values()].find((x) => x.owner === m.owner && x.kind === m.kind && !x.dead);
      if (b) b.tag = m.tag;
    }
    this.game.hud.showBriefing(this.def, () => {
      // start the match
      if (this.game.getPaused()) this.game.togglePause();
      this.game.loop.start();
      this.game.playIntro();
      this.triggerDialogue(this.def.history.split('\n')[0] ?? 'Comienza la misión.', 4);
    });
  }

  update(dt: number, t: number): void {
    if (this.ended || !this.started) return;
    void t;
    this.timer += dt;
    this.updateHoldTimers(dt);
    this.evalObjectives();
    if (this.ended) return;
    this.evalTriggers();
  }

  private updateHoldTimers(dt: number): void {
    for (const o of this.def.objectives) {
      if (o.kind !== 'hold' || this.objState.get(o.id) !== 'activo' || !o.pos) continue;
      const tp = this.resolvePoint(o.pos);
      const radius = o.radius ?? 8;
      const held = [...this.game.units.values()].some(
        (u) =>
          u.owner === 0 &&
          !u.dead &&
          (!o.unitKind || u.kind === o.unitKind) &&
          distance2D(u.pos.x, u.pos.z, tp.x, tp.z) <= radius,
      );
      const current = this.holdTimers.get(o.id) ?? 0;
      this.holdTimers.set(o.id, held ? Math.min(o.time ?? 0, current + dt) : 0);
    }
  }

  private complete(id: string): void {
    if (this.objState.get(id) === 'completed') return;
    this.objState.set(id, 'completed');
    this.game.hud.showToast('✔ Objetivo completado: ' + this.def.objectives.find((o) => o.id === id)?.title, 'success');
    this.game.audio?.uiClick?.();
  }

  private fail(id: string): void {
    if (this.objState.get(id) === 'failed' || this.objState.get(id) === 'completed') return;
    this.objState.set(id, 'failed');
    this.game.hud.showToast('✖ Objetivo fallado: ' + this.def.objectives.find((o) => o.id === id)?.title, 'danger');
  }

  // --- objectives ---

  private evalObjectives(): void {
    for (const o of this.def.objectives) {
      const st = this.objState.get(o.id);
      if (st !== 'activo') continue;
      const done = this.evalObjective(o);
      if (done === 'win') this.complete(o.id);
      else if (done === 'fail') this.fail(o.id);
    }
    this.checkAllComplete();
    this.checkBaseLost();
  }

  private evalObjective(o: ObjectiveDef): 'ok' | 'win' | 'fail' {
    const p = this.game.players[0];
    switch (o.kind as ObjectiveKind) {
      case 'destroy': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        return this.countAlive(o.entityTag) === 0 ? 'win' : 'ok';
      }
      case 'eliminate_all': {
        const enemyUnits = [...this.game.units.values()].filter(
          (u) => u.owner !== 0 && !u.dead && this.game.players[u.owner]?.team !== this.game.players[0]?.team,
        );
        const enemyBlds = [...this.game.buildings.values()].filter(
          (b) => b.owner !== 0 && !b.dead && this.game.players[b.owner]?.team !== this.game.players[0]?.team,
        );
        return enemyUnits.length === 0 && enemyBlds.length === 0 ? 'win' : 'ok';
      }
      case 'survive':
        return this.timer >= (o.time ?? 0) ? 'win' : 'ok';
      case 'reach': {
        if (!o.pos) return 'ok';
        return this.reached(o) ? 'win' : 'ok';
      }
      case 'hold':
        return (this.holdTimers.get(o.id) ?? 0) >= (o.time ?? 0) ? 'win' : 'ok';
      case 'defend': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        if (this.countAlive(o.entityTag) === 0) return 'fail';
        return this.timer >= (o.time ?? 0) ? 'win' : 'ok';
      }
      case 'protect': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        return this.countAlive(o.entityTag) === 0 ? 'fail' : 'ok';
      }
      case 'build':
        return this.countBuilt(o) >= (o.count ?? 1) ? 'win' : 'ok';
      case 'gather':
        return p.resources[o.resource ?? 'food'] >= (o.count ?? 0) ? 'win' : 'ok';
      case 'inspect': {
        const ids = o.heritageIds ?? [];
        return ids.length > 0 && ids.every((id) => this.game.isHeritageVisited(id)) ? 'win' : 'ok';
      }
      case 'canal_open':
        return this.game.isCanalOpen() ? 'win' : 'ok';
      case 'reach_era':
        return p.era >= (o.era ?? 0) ? 'win' : 'ok';
      default:
        return 'ok';
    }
  }

  private checkAllComplete(): void {
    const objs = this.def.objectives;
    if (objs.length === 0) return;
    const state = (o: ObjectiveDef): ObjState => this.objState.get(o.id) ?? 'pendiente';
    // 'protect' is a continuous guard: counts as satisfied while the entity is alive
    const satisfied = (o: ObjectiveDef): boolean => {
      const st = state(o);
      if (st === 'completed') return true;
      if (st === 'activo' && o.kind === 'protect' && o.entityTag) return this.countAlive(o.entityTag) > 0;
      return false;
    };
    // bonus objectives never gate victory and never cause defeat
    const optional = (o: ObjectiveDef): boolean => o.optional === true;

    // objectives sharing a `group` are alternatives: satisfying any one wins the
    // group. A failed required objective — or a group whose every branch failed —
    // ends the mission.
    const groups = new Map<string, ObjectiveDef[]>();
    for (const o of objs) {
      if (!o.group || optional(o)) continue;
      const g = groups.get(o.group) ?? [];
      g.push(o);
      groups.set(o.group, g);
    }
    if (objs.some((o) => !optional(o) && !o.group && state(o) === 'failed')) return this.defeat();
    for (const g of groups.values()) {
      if (g.every((o) => state(o) === 'failed')) return this.defeat();
    }

    const groupsOk = [...groups.values()].every((g) => g.some(satisfied));
    const looseOk = objs.filter((o) => !optional(o) && !o.group).every(satisfied);
    if (groupsOk && looseOk) this.win();
  }

  private checkBaseLost(): void {
    if (!this.game.hasBuildings(0)) {
      this.defeat();
    }
  }

  // --- triggers ---

  private evalTriggers(): void {
    for (const tr of this.def.triggers) {
      const last = this.lastFired.get(tr.id);
      if (this.fired.has(tr.id)) {
        if (!tr.repeat) continue;
        if (last !== undefined && this.timer - last < (tr.cooldown ?? 2)) continue;
      }
      if (this.evalCond(tr.condition)) {
        this.fired.add(tr.id);
        this.lastFired.set(tr.id, this.timer);
        for (const fx of tr.effects) this.applyEffect(fx);
      }
    }
  }

  private evalCond(c: TriggerDef['condition']): boolean {
    switch (c.type) {
      case 'time':
        return this.timer >= c.seconds;
      case 'objective': {
        const st = this.objState.get(c.objectiveId);
        return c.state === 'completed'
          ? st === 'completed'
          : c.state === 'failed'
            ? st === 'failed'
            : st === 'activo' || st === 'pendiente';
      }
      case 'entity_dead':
        if (!c.entityTag) return false;
        if (!this.spawned(c.entityTag)) return false;
        return this.countAlive(c.entityTag) === 0;
      case 'unit_near': {
        const tp = this.resolvePoint(c.pos);
        return this.byTag(c.entityTag).some((e) => !e.dead && distance2D(e.pos.x, e.pos.z, tp.x, tp.z) < c.radius);
      }
      default:
        return false;
    }
  }

  private applyEffect(fx: TriggerEffect): void {
    if (fx.type === 'wave' || fx.type === 'reinforce') {
      const p = this.resolvePoint(fx.pos ?? { dx: 0, dz: 0, ref: 'player' });
      for (const u of fx.units) {
        for (let i = 0; i < u.count; i++) {
          const jitter = (this.game.rng.float() - 0.5) * (fx.radius ?? 6) * 2;
          const k = (this.game.rng.float() - 0.5) * (fx.radius ?? 6) * 2;
          const unit = this.game.spawnScriptedUnit(u.kind, fx.owner, p.x + jitter, p.z + k);
          if (fx.owner === 1) {
            // enemy waves attack a target (the player base or the position)
            const t = fx.objective === 'position' ? p : this.baseCenter(0);
            unit.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: t.x, z: t.z } });
          }
        }
      }
      // only waves heading to the player base announce the danger
      if (fx.type === 'wave' && (fx.objective === undefined || fx.objective === 'base')) {
        this.game.hud.showToast('⚠ ¡Oleada enemiga en camino!', 'warning');
      }
      return;
    }
    switch (fx.type) {
      case 'dialogue':
        this.triggerDialogue(fx.text, fx.duration ?? 5);
        break;
      case 'resources': {
        const p = this.game.players[fx.player ?? 0];
        if (p) {
          for (const [key, value] of Object.entries(fx.amount)) {
            p.resources[key as keyof typeof p.resources] += value;
          }
        }
        break;
      }
      case 'objective':
        this.objState.set(
          fx.objectiveId,
          fx.state === 'activate' ? 'activo' : fx.state === 'complete' ? 'completed' : 'failed',
        );
        break;
      case 'camera': {
        const p = this.resolvePoint(fx.pos);
        this.game.camera.focusOn(p.x, p.z);
        break;
      }
      case 'victory':
        this.win();
        break;
      case 'defeat':
        this.defeat(fx.text);
        break;
    }
  }

  private triggerDialogue(text: string, duration = 5): void {
    // Speakers are written as `Nombre: —texto`; resolve a known commander so the
    // dialogue box can show their (stylized) portrait and drop the redundant prefix.
    const match = text.match(/^\s*([^:\n]{2,40}):\s/);
    const speaker = match?.[1]?.trim();
    const cmd = speaker ? commanderFor(speaker) : undefined;
    const body = cmd && match ? text.slice(match[0].length) : text;
    this.game.hud.showDialogue(cmd?.name ?? 'Comandante', body, duration, cmd?.id);
  }

  private win(): void {
    if (this.ended) return;
    this.ended = true;
    this.won = true;
    this.onEnd(true);
  }

  private defeat(text?: string): void {
    if (this.ended) return;
    this.ended = true;
    this.won = false;
    if (text) this.game.hud.showDialogue('Comandante', text, 4);
    this.onEnd(false);
  }

  /** World anchor of an active objective, for the minimap. */
  getObjectiveAnchor(id: string): { x: number; z: number } | null {
    const o = this.def.objectives.find((x) => x.id === id);
    if (!o) return null;
    if (o.kind === 'canal_open') return this.game.canalSite;
    return o.pos ? this.resolvePoint(o.pos) : null;
  }

  /** For HUD: state of an objective by id. */
  getObjectiveState(id: string): ObjState {
    return this.objState.get(id) ?? 'pendiente';
  }

  /** Activate a hidden or pending objective (e.g. a field-card action). */
  activateObjective(id: string): boolean {
    const def = this.def.objectives.find((o) => o.id === id);
    if (!def || this.objState.get(id) !== 'pendiente') return false;
    this.objState.set(id, 'activo');
    this.game.hud?.showToast('Nuevo objetivo: ' + def.title, 'info');
    return true;
  }

  /** Numeric progress for the HUD, or null for objectives without a meter. */
  getObjectiveProgress(id: string): ObjectiveProgress | null {
    const o = this.def.objectives.find((x) => x.id === id);
    if (!o) return null;
    const p = this.game.players[0];
    switch (o.kind) {
      case 'gather':
        return { current: p.resources[o.resource ?? 'food'], target: o.count ?? 0, format: 'count' };
      case 'build':
        return { current: this.countBuilt(o), target: o.count ?? 1, format: 'count' };
      case 'survive':
      case 'defend':
        return { current: Math.min(this.timer, o.time ?? 0), target: o.time ?? 0, format: 'time' };
      case 'hold':
        return { current: this.holdTimers.get(o.id) ?? 0, target: o.time ?? 0, format: 'time' };
      case 'inspect': {
        const ids = o.heritageIds ?? [];
        return {
          current: ids.filter((hid) => this.game.isHeritageVisited(hid)).length,
          target: ids.length,
          format: 'count',
        };
      }
      case 'canal_open':
        return { current: this.game.isCanalOpen() ? 1 : 0, target: 1, format: 'count' };
      case 'reach':
        return { current: this.reached(o) ? 1 : 0, target: 1, format: 'count' };
      case 'reach_era':
        return { current: p.era, target: o.era ?? 0, format: 'count' };
      default:
        return null;
    }
  }

  /** Snapshot the mission state (used by save/load). */
  toSave(): MissionSave {
    return {
      started: this.started,
      ended: this.ended,
      won: this.won,
      timer: this.timer,
      objState: [...this.objState.entries()],
      fired: [...this.fired],
      lastFired: [...this.lastFired.entries()],
      spawnedCount: [...this.spawnedCount.entries()],
      holdTimers: [...this.holdTimers.entries()],
      heritage: this.game.getVisitedHeritage(),
    };
  }

  applySave(s: MissionSave): void {
    this.started = s.started;
    this.ended = s.ended;
    this.won = s.won ?? null;
    this.timer = s.timer;
    this.objState = new Map(s.objState);
    // Campaign objectives can change between versions; a loaded save keeps the
    // states it knows and starts any new objective in its default state.
    for (const o of this.def.objectives) {
      if (!this.objState.has(o.id)) this.objState.set(o.id, this.defaultState(o));
    }
    this.fired = new Set(s.fired);
    this.lastFired = new Map(s.lastFired);
    this.spawnedCount = new Map(s.spawnedCount);
    this.holdTimers = new Map(s.holdTimers ?? []);
    this.game.setVisitedHeritage(s.heritage ?? []);
  }
}
