import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import type { Building } from '../entities/Building';
import { MissionDef, ObjectiveDef, ObjectiveKind, TriggerDef, TriggerEffect, MissionPoint } from './types';
import { OrderKind, BuildingKind } from '../core/types';
import { distance2D } from '../util/math';

type ObjState = 'pendiente' | 'activo' | 'completado' | 'fallado';

/**
 * Controlador de misión: evalúa objetivos y triggers en cada frame,
 * genera oleadas/reforzamientos y declara victoria o derrota narrativa.
 */
export class Mission {
  def: MissionDef;
  ended = false;
  private game: Game;
  private timer = 0;
  private started = false;
  private objState = new Map<string, ObjState>();
  private fired = new Set<string>();
  private lastFired = new Map<string, number>();
  private spawnedCount = new Map<string, number>();
  private onEnd: (win: boolean) => void;

  constructor(game: Game, def: MissionDef, onEnd: (win: boolean) => void) {
    this.game = game;
    this.def = def;
    this.onEnd = onEnd;
    for (const o of def.objetivos) this.objState.set(o.id, o.oculto ? 'pendiente' : 'activo');
  }

  get activeObjectives(): { def: ObjectiveDef; state: ObjState }[] {
    return this.def.objetivos
      .filter((o) => this.objState.get(o.id) === 'activo' || this.objState.get(o.id) === 'completado' || this.objState.get(o.id) === 'fallado')
      .map((o) => ({ def: o, state: this.objState.get(o.id) as ObjState }));
  }

  private baseCenter(owner: number): { x: number; z: number } {
    const c = [...this.game.buildings.values()].find((b) => b.owner === owner && b.kind === BuildingKind.CENTRO && !b.dead);
    if (c) return { x: c.pos.x, z: c.pos.z };
    return { x: this.game.settings.mapSize / 2, z: this.game.settings.mapSize / 2 };
  }

  private resolvePoint(p: MissionPoint): { x: number; z: number } {
    const ref = p.ref === 'enemigo' ? this.baseCenter(1) : p.ref === 'jugador' ? this.baseCenter(0) : { x: 0, z: 0 };
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

  private spawned(tag: string): boolean {
    const n = this.spawnedCount.get(tag) ?? 0;
    return n > 0 || this.byTag(tag).length > 0;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    // recordar qué etiquetas existen al inicio para que objetivos/triggers que
    // las referencian sigan siendo válidos aunque la entidad muera después
    for (const e of this.def.inicio.edificios ?? []) if (e.tag) this.spawnedCount.set(e.tag, 1);
    for (const u of this.def.inicio.unidades ?? []) if (u.tag) this.spawnedCount.set(u.tag, 1);
    for (const m of this.def.marcar ?? []) this.spawnedCount.set(m.tag, 1);
    for (const m of this.def.marcar ?? []) {
      const b = [...this.game.buildings.values()].find((x) => x.owner === m.owner && x.kind === m.kind && !x.dead);
      if (b) b.tag = m.tag;
    }
    this.game.hud.showBriefing(this.def, () => {
      // iniciar la partida
      if (this.game.getPaused()) this.game.togglePause();
      this.game.loop.start();
      this.triggerDialogue(this.def.historia.split('\n')[0] ?? 'Comienza la misión.', 4);
    });
  }

  update(dt: number, t: number): void {
    if (this.ended || !this.started) return;
    void t;
    this.timer += dt;
    this.evalObjectives();
    if (this.ended) return;
    this.evalTriggers();
  }

  private complete(id: string): void {
    if (this.objState.get(id) === 'completado') return;
    this.objState.set(id, 'completado');
    this.game.hud.showToast('✔ Objetivo completado: ' + this.def.objetivos.find((o) => o.id === id)?.titulo, 'success');
    this.game.audio?.uiClick?.();
  }

  private fail(id: string): void {
    if (this.objState.get(id) === 'fallado' || this.objState.get(id) === 'completado') return;
    this.objState.set(id, 'fallado');
    this.game.hud.showToast('✖ Objetivo fallado: ' + this.def.objetivos.find((o) => o.id === id)?.titulo, 'danger');
  }

  // --- objetivos ---

  private evalObjectives(): void {
    for (const o of this.def.objetivos) {
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
      case 'destruir': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        return this.countAlive(o.entityTag) === 0 ? 'win' : 'ok';
      }
      case 'eliminar_todos': {
        const enemyUnits = [...this.game.units.values()].filter((u) => u.owner !== 0 && !u.dead && this.game.players[u.owner]?.team !== this.game.players[0]?.team);
        const enemyBlds = [...this.game.buildings.values()].filter((b) => b.owner !== 0 && !b.dead && this.game.players[b.owner]?.team !== this.game.players[0]?.team);
        return enemyUnits.length === 0 && enemyBlds.length === 0 ? 'win' : 'ok';
      }
      case 'sobrevivir':
        return this.timer >= (o.time ?? 0) ? 'win' : 'ok';
      case 'alcanzar': {
        if (!o.entityTag || !o.pos) return 'ok';
        const pts = this.byTag(o.entityTag).filter((e) => !e.dead && 'owner' in e && (e as Unit).owner === 0);
        if (pts.length === 0) return 'ok';
        const tp = this.resolvePoint(o.pos);
        return pts.some((e) => distance2D(e.pos.x, e.pos.z, tp.x, tp.z) < (o.radio ?? 6)) ? 'win' : 'ok';
      }
      case 'defender': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        if (this.countAlive(o.entityTag) === 0) return 'fail';
        return this.timer >= (o.time ?? 0) ? 'win' : 'ok';
      }
      case 'proteger': {
        if (!o.entityTag) return 'ok';
        if (!this.spawned(o.entityTag)) return 'ok';
        return this.countAlive(o.entityTag) === 0 ? 'fail' : 'ok';
      }
      case 'construir': {
        if (!o.buildingKind) return 'ok';
        const n = [...this.game.buildings.values()].filter((b) => b.owner === 0 && b.kind === o.buildingKind && b.constructionComplete && !b.dead).length;
        return n >= (o.cantidad ?? 1) ? 'win' : 'ok';
      }
      case 'recolectar':
        return p.resources[o.resource ?? 'comida'] >= (o.cantidad ?? 0) ? 'win' : 'ok';
      case 'alcanzar_era':
        return p.era >= (o.era ?? 0) ? 'win' : 'ok';
      default:
        return 'ok';
    }
  }

  private checkAllComplete(): void {
    const objs = this.def.objetivos;
    if (objs.length === 0) return;
    const failed = objs.find((o) => this.objState.get(o.id) === 'fallado');
    if (failed) {
      this.defeat();
      return;
    }
    // 'proteger' es una guardia continua: cuenta como satisfecho mientras viva la entidad
    const satisfied = (o: ObjectiveDef): boolean => {
      const st = this.objState.get(o.id);
      if (st === 'completado') return true;
      if (st === 'activo' && o.kind === 'proteger' && o.entityTag) return this.countAlive(o.entityTag) > 0;
      return false;
    };
    if (objs.every(satisfied)) this.win();
  }

  private checkBaseLost(): void {
    const hasCenter = [...this.game.buildings.values()].some((b) => b.owner === 0 && b.kind === BuildingKind.CENTRO && !b.dead);
    if (!hasCenter) {
      this.defeat();
    }
  }

  // --- triggers ---

  private evalTriggers(): void {
    for (const tr of this.def.triggers) {
      const last = this.lastFired.get(tr.id);
      if (this.fired.has(tr.id)) {
        if (!tr.repetir) continue;
        if (last !== undefined && this.timer - last < (tr.cooldown ?? 2)) continue;
      }
      if (this.evalCond(tr.condicion)) {
        this.fired.add(tr.id);
        this.lastFired.set(tr.id, this.timer);
        for (const fx of tr.efectos) this.applyEffect(fx);
      }
    }
  }

  private evalCond(c: TriggerDef['condicion']): boolean {
    switch (c.tipo) {
      case 'tiempo':
        return this.timer >= c.segundos;
      case 'objetivo': {
        const st = this.objState.get(c.objetivoId);
        return c.estado === 'completado' ? st === 'completado' : c.estado === 'fallado' ? st === 'fallado' : st === 'activo' || st === 'pendiente';
      }
      case 'entidad_muerta':
        if (!c.entityTag) return false;
        if (!this.spawned(c.entityTag)) return false;
        return this.countAlive(c.entityTag) === 0;
      case 'unidad_cerca': {
        const tp = this.resolvePoint(c.pos);
        return this.byTag(c.entityTag).some((e) => !e.dead && distance2D(e.pos.x, e.pos.z, tp.x, tp.z) < c.radio);
      }
      default:
        return false;
    }
  }

  private applyEffect(fx: TriggerEffect): void {
    if (fx.tipo === 'oleada' || fx.tipo === 'reforzar') {
      const p = this.resolvePoint(fx.pos ?? { dx: 0, dz: 0, ref: 'jugador' });
      for (const u of fx.unidades) {
        for (let i = 0; i < u.cantidad; i++) {
          const jitter = (this.game.rng.float() - 0.5) * (fx.radio ?? 6) * 2;
          const k = (this.game.rng.float() - 0.5) * (fx.radio ?? 6) * 2;
          const unit = this.game.spawnScriptedUnit(u.kind, fx.owner, p.x + jitter, p.z + k);
          if (fx.owner === 1) {
            // las oleadas enemigas atacan un objetivo (base del jugador o la posición)
            const t = fx.objetivo === 'posicion' ? p : this.baseCenter(0);
            unit.issueOrder({ kind: OrderKind.ATTACK_MOVE, target: { x: t.x, z: t.z } });
          }
        }
      }
      // solo las oleadas que van a la base del jugador anuncian el peligro
      if (fx.tipo === 'oleada' && (fx.objetivo === undefined || fx.objetivo === 'base')) {
        this.game.hud.showToast('⚠ ¡Oleada enemiga en camino!', 'warning');
      }
      return;
    }
    switch (fx.tipo) {
      case 'dialogo':
        this.triggerDialogue(fx.texto, fx.duracion ?? 5);
        break;
      case 'objetivo':
        this.objState.set(fx.objetivoId, fx.estado === 'activar' ? 'activo' : fx.estado === 'completar' ? 'completado' : 'fallado');
        break;
      case 'camara': {
        const p = this.resolvePoint(fx.pos);
        this.game.camera.focusOn(p.x, p.z);
        break;
      }
      case 'victoria':
        this.win();
        break;
      case 'derrota':
        this.defeat(fx.texto);
        break;
    }
  }

  private triggerDialogue(texto: string, duracion = 5): void {
    this.game.hud.showDialogue('Comandante', texto, duracion);
  }

  private win(): void {
    if (this.ended) return;
    this.ended = true;
    this.onEnd(true);
  }

  private defeat(texto?: string): void {
    if (this.ended) return;
    this.ended = true;
    if (texto) this.game.hud.showDialogue('Comandante', texto, 4);
    this.onEnd(false);
  }

  /** Para HUD: estado de un objetivo por id. */
  getObjectiveState(id: string): ObjState {
    return this.objState.get(id) ?? 'pendiente';
  }
}
