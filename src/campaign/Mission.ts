import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import type { Building } from '../entities/Building';
import {
  MissionDef,
  ObjectiveDef,
  ObjectiveKind,
  ObjectiveProgress,
  ObjState,
  TriggerDef,
  TriggerEffect,
  MissionPoint,
  MissionGoal,
} from './types';
import type { HeritageBuildingId } from '../model/defs/heritage';
import { BuildingKind, OrderKind, Resources } from '../core/types';
import { distance2D } from '../util/math';
import { t } from '../i18n';
import { commanderFor } from '../model/defs/commanders';
import { unitBaseKind, unitClassFor } from '../model/defs/units';
import { phaseOrder } from '../model/defs/sitePhases';
import type { MissionSave } from '../game/saveTypes';

/**
 * Mission controller: evaluates objectives and triggers every frame,
 * spawns waves/reinforcements and declares victory or narrative defeat.
 */
export class Mission {
  def: MissionDef;
  ended = false;
  /** Set while the victory tick fires its closing triggers, so a `victory` effect cannot re-enter. */
  private winning = false;
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
  /** Mission time at which each objective was activated (for `wait` beats). */
  private activatedAt = new Map<string, number>();
  private stalledHolds = new Set<string>();
  /** Activations a one-shot trigger requested before their `requires` prerequisite completed. */
  private deferredActivations = new Map<string, boolean>();
  private delivered = new Map<string, number>();
  private onEnd: (win: boolean) => void;

  constructor(game: Game, def: MissionDef, onEnd: (win: boolean) => void) {
    this.game = game;
    this.def = def;
    this.onEnd = onEnd;
    for (const o of def.objectives) this.objState.set(o.id, this.defaultState(o));
    if (def.layout?.site?.phase) game.setSitePhase(def.layout.site.phase);
  }

  private defaultState(o: ObjectiveDef): ObjState {
    return o.hidden || o.awaitsCall ? 'pendiente' : 'activo';
  }

  get activeObjectives(): { def: ObjectiveDef; state: ObjState }[] {
    return this.def.objectives
      .filter(
        (o) =>
          this.objState.get(o.id) === 'activo' ||
          this.objState.get(o.id) === 'completed' ||
          this.objState.get(o.id) === 'failed' ||
          (o.awaitsCall === true &&
            this.objState.get(o.id) === 'pendiente' &&
            (!o.requires || this.objState.get(o.requires) === 'completed')),
      )
      .map((o) => ({ def: o, state: this.objState.get(o.id) as ObjState }));
  }

  /**
   * Active `reach`/`hold` objectives with a ground point, for the world markers. The tutorial text
   * ("hasta la marca del valle") only makes sense if the marker is drawn.
   */
  activeGoals(): MissionGoal[] {
    const goals: MissionGoal[] = [];
    for (const o of this.def.objectives) {
      if (!o.pos || (o.kind !== 'reach' && o.kind !== 'hold')) continue;
      if (this.objState.get(o.id) !== 'activo') continue;
      const p = this.resolvePoint(o.pos);
      goals.push({ id: o.id, x: p.x, z: p.z, radius: o.radius ?? 8 });
    }
    return goals;
  }

  /** Radius an active `inspect` objective demands around a card, or null when the visit is free. */
  inspectRadiusFor(id: HeritageBuildingId): number | null {
    for (const o of this.def.objectives) {
      if (o.kind !== 'inspect' || !o.inspectRadius || !(o.heritageIds ?? []).includes(id)) continue;
      if (this.objState.get(o.id) === 'activo') return o.inspectRadius;
    }
    return null;
  }

  private resolvePoint(p: MissionPoint): { x: number; z: number } {
    return this.game.resolveMissionPoint(p);
  }

  private objective(id: string): ObjectiveDef | undefined {
    return this.def.objectives.find((o) => o.id === id);
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

  /** Completed player buildings at each `network` node. */
  private countNetwork(o: ObjectiveDef): number {
    if (!o.buildingKind || !o.nodes) return 0;
    return o.nodes.filter((node) => {
      const p = this.resolvePoint(node);
      return [...this.game.buildings.values()].some(
        (b) =>
          b.owner === 0 &&
          b.kind === o.buildingKind &&
          b.constructionComplete &&
          !b.dead &&
          distance2D(b.pos.x, b.pos.z, p.x, p.z) < (o.radius ?? 12),
      );
    }).length;
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
    const briefing = () => this.showBriefing();
    if (this.def.intro?.length && this.game.introEnabled && !this.game.headless) {
      this.game.hud.playMissionIntro(this.def, briefing);
    } else briefing();
  }

  private showBriefing(): void {
    this.game.hud.showBriefing(this.def, () => {
      // start the match
      if (this.game.getPaused()) this.game.togglePause();
      this.game.loop.start();
      this.game.reframeMissionOpening?.();
      this.game.playIntro();
      // With the intro on, the title card narrates this line; without it, the dialogue carries the start.
      if (!this.game.introEnabled) {
        this.triggerDialogue(this.def.history.split('\n')[0] ?? 'Comienza la misión.', 4);
      }
    });
  }

  update(dt: number, t: number): void {
    if (this.ended || !this.started) return;
    void t;
    // The title card and the opening camera flight are not gameplay time.
    if (this.game.isCinematicActive()) return;
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
      let crew = 0;
      for (const u of this.game.units.values()) {
        if (
          u.owner === 0 &&
          !u.dead &&
          (!o.unitKind ||
            u.kind === o.unitKind ||
            (unitBaseKind(u.kind) !== u.kind && unitClassFor(u.kind) === unitClassFor(o.unitKind))) &&
          distance2D(u.pos.x, u.pos.z, tp.x, tp.z) <= radius
        ) {
          crew++;
        }
      }
      const held = crew >= (o.minUnits ?? 1);
      const current = this.holdTimers.get(o.id) ?? 0;
      if (!held) {
        // A work turn that already paid its upkeep keeps its progress while the crew steps away; only
        // objectives without an upkeep restart from zero.
        if (!o.consume) this.holdTimers.set(o.id, 0);
        this.stalledHolds.delete(o.id);
        continue;
      }
      const advance = current >= (o.time ?? 0) || this.payHoldCost(o, dt, (o.time ?? 0) - current);
      if (advance) {
        this.stalledHolds.delete(o.id);
        this.holdTimers.set(o.id, Math.min(o.time ?? 0, current + dt));
      } else {
        this.holdTimers.set(o.id, current);
      }
    }
  }

  /** Charge a work turn's upkeep; false when the store cannot pay and the turn must wait. */
  private payHoldCost(o: ObjectiveDef, dt: number, remaining: number): boolean {
    if (!o.consume) return true;
    if (o.consume.store && !this.ownsFinished(o.consume.store)) {
      return this.stall(o, t('hud.toast.workTurnNeedsStore', { store: this.game.buildingName(o.consume.store) }));
    }
    const player = this.game.players[0];
    const cost = o.consume.perSecond * Math.min(dt, remaining);
    if (player && player.resources[o.consume.resource] >= cost) {
      player.resources[o.consume.resource] -= cost;
      return true;
    }
    return this.stall(o, t('hud.toast.constructionStalled'));
  }

  /** Whether player 0 owns a finished building of this kind (Caral's communal store feeds the crew). */
  private ownsFinished(kind: BuildingKind): boolean {
    for (const b of this.game.buildings.values()) {
      if (b.owner === 0 && b.kind === kind && b.constructionComplete && !b.dead) return true;
    }
    return false;
  }

  /** Announce a stalled turn once, until it moves again. */
  private stall(o: ObjectiveDef, message: string): false {
    if (!this.stalledHolds.has(o.id)) {
      this.stalledHolds.add(o.id);
      this.game.hud.showToast(message, 'warning');
    }
    return false;
  }

  private complete(id: string): void {
    if (this.objState.get(id) === 'completed') return;
    this.objState.set(id, 'completed');
    this.game.hud.showToast('✔ Objetivo completado: ' + this.objective(id)?.title, 'success');
    this.game.audio?.uiClick?.();
    this.retryDeferredActivations();
  }

  private fail(id: string): void {
    if (this.objState.get(id) === 'failed' || this.objState.get(id) === 'completed') return;
    this.objState.set(id, 'failed');
    this.game.hud.showToast('✖ Objetivo fallado: ' + this.objective(id)?.title, 'danger');
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

  /** Current value of a `gather` objective: fished/harvested from its node kind, or the resource reserve. */
  private gatherCurrent(o: ObjectiveDef): number {
    if (o.fromNode) return this.game.harvestedBy(0, o.fromNode);
    return this.game.players[0].resources[o.resource ?? 'food'];
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
      case 'wait':
        // A beat measured from activation, not from the mission start.
        return this.timer - (this.activatedAt.get(o.id) ?? 0) >= (o.time ?? 0) ? 'win' : 'ok';
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
      case 'deliver':
        return (this.delivered.get(o.id) ?? 0) >= (o.count ?? 0) ? 'win' : 'ok';
      case 'network':
        return this.countNetwork(o) >= (o.count ?? o.nodes?.length ?? 0) ? 'win' : 'ok';
      case 'gather':
        return this.gatherCurrent(o) >= (o.count ?? 0) ? 'win' : 'ok';
      case 'inspect': {
        const ids = o.heritageIds ?? [];
        const visited = ids.length > 0 && ids.every((id) => this.game.isHeritageVisited(id));
        // with a location, the card must also be observed from the site
        return visited && (!o.pos || this.reached(o)) ? 'win' : 'ok';
      }
      case 'canal_open':
        return this.game.isCanalOpen() ? 'win' : 'ok';
      case 'reach_era':
        return p.era >= (o.era ?? 0) ? 'win' : 'ok';
      case 'research':
        return o.tech && p.techs.has(o.tech) ? 'win' : 'ok';
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
    if (this.game.hasBuildings(0)) return;
    // A party that starts with no base (Tambotoco) is lost only when no one of it is left.
    if (this.def.start.base === false && [...this.game.units.values()].some((u) => u.owner === 0 && !u.dead)) return;
    this.defeat();
  }

  // --- triggers ---

  /** Triggers waiting on an objective that is now completed (used on the victory tick). */
  private fireCompletionTriggers(): void {
    for (const tr of this.def.triggers) {
      if (this.fired.has(tr.id) || tr.condition.type !== 'objective' || !this.evalCond(tr.condition)) continue;
      this.fired.add(tr.id);
      this.lastFired.set(tr.id, this.timer);
      for (const fx of tr.effects) this.applyEffect(fx);
    }
  }

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
            // enemy waves attack a target: an explicit point, the player base, or they hold their spawn
            const t =
              fx.type === 'wave' && fx.target
                ? this.resolvePoint(fx.target)
                : fx.objective === 'position'
                  ? p
                  : this.game.playerCenter(0);
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
        this.triggerDialogue(fx.text, fx.duration ?? 5, fx.speaker);
        break;
      case 'act':
        this.game.hud.showActCard(fx.kicker, fx.title, fx.text, fx.image);
        break;
      case 'site_phase':
        this.game.setSitePhase(fx.phase);
        break;
      case 'reveal':
        this.game.revealDiscovery(fx.heritageId);
        break;
      case 'ritual': {
        const p = this.resolvePoint(fx.pos);
        this.game.playSiteRitual(p.x, p.z);
        break;
      }
      case 'memory': {
        this.game.retireCharacter(fx.tag);
        const p = this.resolvePoint(fx.pos);
        this.game.raiseMemoryStone(fx.tag, p.x, p.z, fx.label);
        break;
      }
      case 'environment':
        this.game.startEnvironmentalEvent(fx.event);
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
        if (fx.state === 'activate') this.activate(fx.objectiveId, fx.announce === true);
        else this.objState.set(fx.objectiveId, fx.state === 'complete' ? 'completed' : 'failed');
        break;
      case 'camera': {
        const p = this.resolvePoint(fx.pos);
        this.game.camera.focusOn(p.x, p.z);
        break;
      }
      case 'truce':
        this.game.declareTruce(fx.owner ?? 1);
        break;
      case 'victory':
        this.win();
        break;
      case 'defeat':
        this.defeat(fx.text);
        break;
    }
  }

  private triggerDialogue(text: string, duration = 5, label?: string): void {
    if (label) {
      // A named speaker keeps their (stylized) portrait even when the mission has a narrator.
      const cmd = commanderFor(label);
      this.game.hud.showDialogue(cmd?.name ?? label, text, duration, cmd?.id);
      return;
    }
    const narrator = this.def.narrator;
    if (narrator) {
      this.game.hud.showDialogue(narrator, text, duration);
      return;
    }
    // Speakers are written as `Nombre: —texto`; resolve a known commander so the
    // dialogue box can show their (stylized) portrait and drop the redundant prefix.
    const match = text.match(/^\s*([^:\n]{2,40}):\s/);
    const speaker = match?.[1]?.trim();
    const cmd = speaker ? commanderFor(speaker) : undefined;
    // A named speaker who is not a portrait commander (Señor de Moche, General patriota) still labels the
    // box; keeping the prefix in the text read as «Comandante: Señor de Moche: —…».
    const body = match ? text.slice(match[0].length) : text;
    this.game.hud.showDialogue(cmd?.name ?? speaker ?? 'Comandante', body, duration, cmd?.id);
  }

  private win(): void {
    if (this.ended || this.winning) return;
    this.winning = true;
    // The goal that ends the mission may also own a closing beat (Tambotoco's founded Inticancha):
    // fire the triggers on goals completed this tick before the mission stops evaluating them.
    this.fireCompletionTriggers();
    this.ended = true;
    this.won = true;
    // A protect goal can only fail while the match runs; reaching victory with the
    // escort alive is what completes it, so the victory card credits it as achieved.
    for (const o of this.def.objectives) {
      if (o.kind === 'protect' && this.objState.get(o.id) === 'activo') this.objState.set(o.id, 'completed');
    }
    this.onEnd(true);
  }

  private defeat(text?: string): void {
    if (this.ended) return;
    this.ended = true;
    this.won = false;
    if (text) this.game.hud.showDialogue(this.def.narrator ?? 'Comandante', text, 4);
    this.onEnd(false);
  }

  /**
   * Record a resource handed over at a site. Required goals fill first, then
   * optional ones, so a single delivery is never charged to two objectives.
   */
  recordDelivery(resource: keyof Resources, amount: number, objectiveId?: string): number {
    let remaining = amount;
    const ordered = objectiveId
      ? this.def.objectives.filter((objective) => objective.id === objectiveId)
      : [
          ...this.def.objectives.filter((objective) => !objective.optional),
          ...this.def.objectives.filter((objective) => objective.optional),
        ];
    for (const objective of ordered) {
      if (remaining <= 0) break;
      if (objective.kind !== 'deliver' || objective.resource !== resource) continue;
      if (this.objState.get(objective.id) !== 'activo') continue;
      const target = objective.count ?? 0;
      const current = this.delivered.get(objective.id) ?? 0;
      if (current >= target) continue;
      const delta = Math.min(remaining, target - current);
      this.delivered.set(objective.id, current + delta);
      remaining -= delta;
      if (current + delta >= target) this.complete(objective.id);
    }
    const recorded = amount - remaining;
    if (recorded > 0) this.checkAllComplete();
    return recorded;
  }

  /** The active `deliver` objective a field card collects materials for, if any. */
  activeDeliveryFor(heritageId: string): { def: ObjectiveDef; delivered: number } | null {
    const o = this.def.objectives.find(
      (objective) =>
        objective.kind === 'deliver' &&
        objective.heritageId === heritageId &&
        this.objState.get(objective.id) === 'activo',
    );
    return o ? { def: o, delivered: this.delivered.get(o.id) ?? 0 } : null;
  }

  /** Re-apply the latest monument phase set by an already fired trigger (after a load). */
  private restoreSitePhase(): void {
    if (this.game.sitePhaseRestored) return;
    let phase: Extract<TriggerEffect, { type: 'site_phase' }>['phase'] | null = null;
    let at = -Infinity;
    for (const tr of this.def.triggers) {
      if (!this.fired.has(tr.id)) continue;
      const firedAt = this.lastFired.get(tr.id) ?? 0;
      for (const fx of tr.effects) {
        if (fx.type === 'site_phase' && firedAt >= at) {
          phase = fx.phase;
          at = firedAt;
        }
      }
    }
    if (phase) this.game.setSitePhase(phase);
    else {
      let best = -1;
      for (const rule of this.def.legacyPhases ?? []) {
        if (this.objState.get(rule.objectiveId) !== 'completed') continue;
        const order = phaseOrder(this.game.sitePhasePlan, rule.phase);
        if (order > best) {
          phase = rule.phase;
          best = order;
        }
      }
      if (phase) this.game.setSitePhase(phase);
    }
    const events = new Set<string>();
    for (const tr of this.def.triggers) {
      if (!this.fired.has(tr.id)) continue;
      for (const fx of tr.effects) {
        if (fx.type === 'environment') events.add(fx.event);
        // A truce is not in the save: re-apply it without marching the warriors home again.
        if (fx.type === 'truce') this.game.declareTruce(fx.owner ?? 1, true);
      }
    }
    if (!this.game.environmentRestored) for (const event of events) this.game.startEnvironmentalEvent(event, true);
  }

  /** World anchor of an active objective, for the minimap. */
  getObjectiveAnchor(id: string): { x: number; z: number } | null {
    const o = this.objective(id);
    if (!o) return null;
    if (o.kind === 'canal_open') return this.game.canalSite;
    if (o.kind === 'network') {
      const node = o.nodes?.find((point) => {
        const p = this.resolvePoint(point);
        return ![...this.game.buildings.values()].some(
          (b) =>
            b.owner === 0 &&
            b.kind === o.buildingKind &&
            b.constructionComplete &&
            !b.dead &&
            distance2D(b.pos.x, b.pos.z, p.x, p.z) < (o.radius ?? 12),
        );
      });
      return node ? this.resolvePoint(node) : null;
    }
    return o.pos ? this.resolvePoint(o.pos) : null;
  }

  /** For HUD: state of an objective by id. */
  getObjectiveState(id: string): ObjState {
    return this.objState.get(id) ?? 'pendiente';
  }

  /** Whether a hidden/pending objective has met its prerequisites. */
  canActivateObjective(id: string): boolean {
    const def = this.objective(id);
    if (!def || this.objState.get(id) !== 'pendiente') return false;
    return !def.requires || this.objState.get(def.requires) === 'completed';
  }

  /** Activate a hidden or pending objective (e.g. a field-card action). */
  activateObjective(id: string): boolean {
    return this.activate(id, true);
  }

  /** Shared activation path; triggers can opt out of the new-goal toast. */
  private activate(id: string, announce: boolean): boolean {
    const def = this.objective(id);
    if (!def || this.objState.get(id) !== 'pendiente') return false;
    if (!this.canActivateObjective(id)) {
      // A one-shot trigger may fire before the objective it gates on completes; retry on that completion.
      this.deferredActivations.set(id, announce);
      return false;
    }
    this.deferredActivations.delete(id);
    this.activatedAt.set(id, this.timer);
    this.objState.set(id, 'activo');
    if (this.evalObjective(def) === 'win') {
      this.complete(id);
      return true;
    }
    if (announce) this.game.hud?.showToast('Nuevo objetivo: ' + def.title, 'info');
    return true;
  }

  /** Activate any objective whose prerequisite completed after its trigger had already fired. */
  private retryDeferredActivations(): void {
    for (const [id, announce] of [...this.deferredActivations]) {
      if (this.objState.get(id) !== 'pendiente') {
        this.deferredActivations.delete(id);
        continue;
      }
      this.activate(id, announce);
    }
  }

  /** Numeric progress for the HUD, or null for objectives without a meter. */
  getObjectiveProgress(id: string): ObjectiveProgress | null {
    const o = this.objective(id);
    if (!o) return null;
    const p = this.game.players[0];
    switch (o.kind) {
      case 'gather':
        return {
          current: this.gatherCurrent(o),
          target: o.count ?? 0,
          format: 'count',
        };
      case 'build':
        return { current: this.countBuilt(o), target: o.count ?? 1, format: 'count' };
      case 'deliver':
        return {
          current: Math.min(this.delivered.get(o.id) ?? 0, o.count ?? 0),
          target: o.count ?? 0,
          format: 'count',
        };
      case 'network':
        return { current: this.countNetwork(o), target: o.count ?? o.nodes?.length ?? 0, format: 'count' };
      case 'wait':
        return {
          current: Math.min(this.timer - (this.activatedAt.get(o.id) ?? 0), o.time ?? 0),
          target: o.time ?? 0,
          format: 'time',
        };
      case 'survive':
      case 'defend':
        return { current: Math.min(this.timer, o.time ?? 0), target: o.time ?? 0, format: 'time' };
      case 'hold':
        return { current: this.holdTimers.get(o.id) ?? 0, target: o.time ?? 0, format: 'time' };
      case 'inspect': {
        const ids = o.heritageIds ?? [];
        const visited = ids.filter((hid) => this.game.isHeritageVisited(hid)).length;
        if (!ids.length) return null;
        if (o.pos) return { current: visited === ids.length && this.reached(o) ? 1 : 0, target: 1, format: 'count' };
        return { current: visited, target: ids.length, format: 'count' };
      }
      case 'canal_open':
        return { current: this.game.isCanalOpen() ? 1 : 0, target: 1, format: 'count' };
      case 'reach':
        return { current: this.reached(o) ? 1 : 0, target: 1, format: 'count' };
      case 'reach_era':
        return { current: p.era, target: o.era ?? 0, format: 'count' };
      case 'research':
        return { current: o.tech && p.techs.has(o.tech) ? 1 : 0, target: 1, format: 'count' };
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
      activatedAt: [...this.activatedAt.entries()],
      delivered: [...this.delivered.entries()],
      heritage: this.game.getVisitedHeritage(),
      deferredActivations: [...this.deferredActivations.entries()],
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
    this.activatedAt = new Map(s.activatedAt ?? []);
    // Older saves have no timestamps: a beat that was already running restarts from the load, never
    // completing instantly.
    for (const o of this.def.objectives) {
      if (o.kind !== 'wait' || this.objState.get(o.id) !== 'activo') continue;
      if (!this.activatedAt.has(o.id)) this.activatedAt.set(o.id, this.timer);
    }
    this.stalledHolds.clear();
    this.deferredActivations = new Map(s.deferredActivations ?? []);
    this.delivered = new Map(s.delivered ?? []);
    this.game.setVisitedHeritage(s.heritage ?? []);
    this.restoreSitePhase();
    // The huaca markers are presentation only and are not saved: rebuild the ones whose trigger
    // already ran, so a loaded match keeps the legend's places on the board.
    for (const trigger of this.def.triggers) {
      if (!this.fired.has(trigger.id)) continue;
      for (const fx of trigger.effects) {
        if (fx.type === 'memory') this.applyEffect(fx);
      }
    }
    // New hidden objectives can be added after a save was written. Their activation trigger may
    // already be in `fired`, so repair them from the saved site phase or their prerequisite. The
    // prerequisite branch only fires when the activating trigger already ran; otherwise the normal
    // trigger evaluation will activate it on the next update (and command-only objectives like the
    // optional assembly stay pending until the player asks for them).
    const repaired = new Set<string>();
    for (const o of this.def.objectives) {
      if (this.objState.get(o.id) !== 'pendiente') continue;
      if (o.afterPhase && this.phaseReached(o.afterPhase)) {
        this.objState.set(o.id, 'completed');
        repaired.add(o.id);
      } else if (o.requires && this.objState.get(o.requires) === 'completed' && this.activationTriggerFired(o.id)) {
        this.objState.set(o.id, 'activo');
        repaired.add(o.id);
      }
    }
    // A save whose site already reached a phase must not replay the trigger that raised it.
    const plan = this.game.sitePhasePlan;
    for (const tr of this.def.triggers) {
      const phase = tr.effects.find((fx) => fx.type === 'site_phase');
      if (phase?.type !== 'site_phase') continue;
      if (phaseOrder(plan, this.game.sitePhase) >= phaseOrder(plan, phase.phase)) this.fired.add(tr.id);
    }
    // A repaired objective must not replay the one-shot trigger that already produced its state.
    for (const id of repaired) {
      if (this.objState.get(id) !== 'completed') continue;
      for (const tr of this.def.triggers) {
        if (
          tr.condition.type === 'objective' &&
          tr.condition.objectiveId === id &&
          tr.condition.state === 'completed'
        ) {
          this.fired.add(tr.id);
        }
      }
    }
  }

  /** Whether a one-shot trigger that activates this objective already fired in the save. */
  private activationTriggerFired(id: string): boolean {
    return this.def.triggers.some(
      (tr) =>
        this.fired.has(tr.id) &&
        tr.effects.some((fx) => fx.type === 'objective' && fx.objectiveId === id && fx.state === 'activate'),
    );
  }

  /** Whether the authored site stands at `phase` or later. */
  private phaseReached(phase: string): boolean {
    const plan = this.game.sitePhasePlan;
    if (!plan) return false;
    const target = phaseOrder(plan, phase);
    return target >= 0 && phaseOrder(plan, this.game.sitePhase) >= target;
  }
}
