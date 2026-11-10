import { type HeritageBuildingDef, type HeritageBuildingId } from '../model/defs/heritage';
import { bus } from './EventBus';
import { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import { UnitKind, type Resources } from '../core/types';
import type { Mission } from '../campaign/Mission';
import type { ObjectiveDef } from '../campaign/types';
import { distance2D } from '../util/math';
import { getHeritageBuilding } from '../model/defs/heritage';
import { RESOURCE_INFO } from './Config';
import { t } from '../i18n';

/** Whether a field card can take materials, and why it cannot (drives the HUD button too). */
export interface DeliveryGate {
  ok: boolean;
  amount: number;
  resource: keyof Resources | null;
  reason: 'away' | 'short' | null;
  /** How much of `resource` is still missing when `reason` is `short`. */
  missing: number;
}

/** Selection, focus, formation and heritage/assembly helpers. */
export class SelectionController {
  constructor(private readonly game: any) {}

  getSelectedUnits(): Unit[] {
    return this.game.selectedUnits
      .map((id: number) => this.game.units.get(id))
      .filter((u: Unit | undefined): u is Unit => !!u && !u.dead);
  }

  /** Player-owned workers with no orders, not garrisoned and not constructing. */
  idleWorkerIds(): number[] {
    return [...this.game.units.values()]
      .filter(
        (u) =>
          u.owner === 0 &&
          u.kind === UnitKind.WORKER &&
          !u.dead &&
          u.garrisonedIn === null &&
          u.isConstructing === null &&
          u.orderQueue.length === 0,
      )
      .map((u) => u.id)
      .sort((a, b) => a - b);
  }

  /** Cycle through idle workers, centering the camera on each one. */
  cycleIdleWorker(): number | null {
    const ids = this.idleWorkerIds();
    if (ids.length === 0) {
      this.game.hud?.showToast('No hay obreros ociosos', 'info');
      return null;
    }
    this.game.idleCursor = (this.game.idleCursor + 1) % ids.length;
    const id = ids[this.game.idleCursor];
    this.focusUnit(id);
    return id;
  }

  cycleFormation(): string {
    const order = ['box', 'line', 'dispersed'] as const;
    this.game.formationPreset =
      order[(order.indexOf(this.game.formationPreset as 'box' | 'line' | 'dispersed') + 1) % order.length];
    const labels: Record<string, string> = { box: 'caja', line: 'línea', dispersed: 'dispersa' };
    const label = labels[this.game.formationPreset] ?? 'caja';
    this.game.hud?.showToast(`Formación: ${label}`, 'info');
    return label;
  }

  selectIdleWorkers(): number[] {
    const ids = this.idleWorkerIds();
    if (ids.length > 0) this.selectUnits(ids);
    return ids;
  }

  /** Select and focus a player-owned unit, e.g. from a blocked-worker alert. */
  focusUnit(id: number): void {
    const u = this.game.units.get(id);
    if (!u || u.dead || u.owner !== 0) return;
    this.game.selectedUnits = [id];
    this.game.selectedBuilding = null;
    this.game.selectedHeritage = null;
    this.game.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [id] });
    this.game.camera.focusOn(u.pos.x, u.pos.z);
  }

  getSelectedBuilding(): Building | null {
    return this.game.selectedBuilding !== null ? (this.game.buildings.get(this.game.selectedBuilding) ?? null) : null;
  }

  getSelectedHeritage(): HeritageBuildingDef | null {
    return getHeritageBuilding(this.game.selectedHeritage);
  }

  getAssemblyState(): string {
    return this.game.mission?.getObjectiveState('obj_asamblea') ?? 'pendiente';
  }

  canStartAssembly(): boolean {
    return this.game.mission?.canActivateObjective('obj_asamblea') ?? false;
  }

  startAssembly(): boolean {
    return this.game.mission?.activateObjective('obj_asamblea') ?? false;
  }

  /** Hand materials to the active construction objective of a field card (e.g. the Caral Pyramid Mayor). */
  deliverToHeritage(id: HeritageBuildingId): boolean {
    const mission: Mission | null = this.game.mission;
    const delivery = mission?.activeDeliveryFor(id);
    if (!delivery?.def.resource) return false;
    const { def } = delivery;
    return this.handOver('construct', def.resource!, this.deliveryGate(id).amount, {
      at: this.deliveryAnchor(def),
      radius: def.radius ?? 18,
      objectiveId: def.id,
    });
  }

  /**
   * Why the active delivery of a field card can or cannot take materials now. The HUD uses it to
   * disable the button with a reason instead of letting the player click into a toast (issue 387).
   */
  deliveryGate(id: HeritageBuildingId): DeliveryGate {
    const delivery = this.game.mission?.activeDeliveryFor(id);
    const def = delivery?.def;
    if (!delivery || !def?.resource) return { ok: false, amount: 0, resource: null, reason: null, missing: 0 };
    const resource = def.resource;
    const amount = Math.min(def.step ?? 50, (def.count ?? 0) - delivery.delivered);
    if (amount <= 0) return { ok: false, amount: 0, resource, reason: null, missing: 0 };
    if (!this.workerNear(this.deliveryAnchor(def), def.radius ?? 18)) {
      return { ok: false, amount, resource, reason: 'away', missing: 0 };
    }
    const have = this.game.players[0].resources[resource];
    if (have < amount) return { ok: false, amount, resource, reason: 'short', missing: amount - have };
    return { ok: true, amount, resource, reason: null, missing: 0 };
  }

  /** Where a delivery objective hands materials over. */
  private deliveryAnchor(def: ObjectiveDef): { x: number; z: number } {
    return def.pos ? this.game.resolveMissionPoint(def.pos) : (this.game.siteAnchor ?? this.game.siteCenter);
  }

  private workerNear(anchor: { x: number; z: number } | null, radius: number): boolean {
    if (!anchor) return false;
    return [...this.game.units.values()].some(
      (unit) =>
        unit.owner === 0 &&
        !unit.dead &&
        unit.kind === UnitKind.WORKER &&
        distance2D(unit.pos.x, unit.pos.z, anchor.x, anchor.z) < radius,
    );
  }

  /** Hand over a field-card offering at the authored site. */
  makeOffering(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'offer');
  }

  /** Exchange elite goods at a Moche/Recuay site card. */
  makeTrade(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'trade');
  }

  private makeHeritageExchange(id: HeritageBuildingId, operation: 'offer' | 'trade'): boolean {
    const def = getHeritageBuilding(id);
    if (!def || def.operation !== operation) return false;
    return this.handOver(operation, def.operationResource ?? 'silver', def.operationAmount ?? 50, {
      at: this.game.siteAnchor ?? this.game.siteCenter,
      radius: 18,
    });
  }

  /** Shared field-card hand-over: a worker on site, the stock to pay, and a mission goal to record it. */
  private handOver(
    operation: 'offer' | 'trade' | 'construct',
    resource: keyof Resources,
    amount: number,
    where: { at: { x: number; z: number } | null; radius: number; objectiveId?: string },
  ): boolean {
    if (amount <= 0) return false;
    const toast = (kind: 'away' | 'short' | 'none' | 'done', level: string) =>
      this.game.hud?.showToast(
        t(`hud.heritage.${operation}.${kind}`, { amount, resource: RESOURCE_INFO[resource].name.toLowerCase() }),
        level,
      );
    if (!this.workerNear(where.at, where.radius)) {
      toast('away', 'warning');
      return false;
    }
    if (this.game.players[0].resources[resource] < amount) {
      toast('short', 'warning');
      return false;
    }
    const recorded = this.game.mission?.recordDelivery(resource, amount, where.objectiveId) ?? 0;
    if (recorded <= 0) {
      toast('none', 'info');
      return false;
    }
    this.game.players[0].resources[resource] -= recorded;
    this.game.hud?.showToast(
      t(`hud.heritage.${operation}.done`, { amount: recorded, resource: RESOURCE_INFO[resource].name.toLowerCase() }),
      'success',
    );
    this.game.audio.uiClick?.();
    return true;
  }

  isHeritageVisited(id: HeritageBuildingId): boolean {
    return this.game.visitedHeritage.has(id);
  }

  getVisitedHeritage(): HeritageBuildingId[] {
    return [...this.game.visitedHeritage];
  }

  setVisitedHeritage(ids: HeritageBuildingId[]): void {
    this.game.visitedHeritage.clear();
    for (const id of ids) if (getHeritageBuilding(id)) this.game.visitedHeritage.add(id);
  }

  /**
   * Whether the local player has a unit within `radius` of a heritage card's footprint. The distance
   * is measured to the proxy rectangle, not its centre: a large pyramid centre is unreachable. Cards
   * without a proxy (sites that do not author one) cannot be walked to, so they do not gate the visit.
   */
  unitNearHeritage(id: HeritageBuildingId, radius: number): boolean {
    const proxy = this.game.siteDef?.heritageProxies.find((entry: { id: string }) => entry.id === id);
    if (!proxy) return true;
    const halfW = proxy.w / 2;
    const halfD = proxy.d / 2;
    for (const u of this.game.units.values()) {
      if (u.owner !== 0 || u.dead) continue;
      const dx = Math.max(0, Math.abs(u.pos.x - proxy.x) - halfW);
      const dz = Math.max(0, Math.abs(u.pos.z - proxy.z) - halfD);
      if (Math.hypot(dx, dz) <= radius) return true;
    }
    return false;
  }

  visitHeritage(id: HeritageBuildingId): void {
    const def = getHeritageBuilding(id);
    if (!def) return;
    this.game.visitedHeritage.add(def.id);
    this.game.hud?.showToast(`Ficha registrada: ${def.name}`, 'success');
    this.game.audio.uiClick?.();
  }

  /** Select a building by id (debug harness and inspector tests). */
  selectBuilding(id: number): void {
    const b = this.game.buildings.get(id);
    if (!b || b.dead) return;
    this.game.selectedUnits = [];
    this.game.selectedBuilding = id;
    this.game.selectedHeritage = null;
    this.game.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [] });
    this.game.audio.select();
  }

  /** Replace the unit selection with the given ids (only own and alive). */
  selectUnits(ids: number[]): void {
    const valid = ids.filter((id: number) => {
      const u = this.game.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.game.selectedUnits = valid;
    this.game.selectedBuilding = null;
    this.game.selectedHeritage = null;
    this.game.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [...valid] });
    this.game.audio.select();
  }

  /** Register teardown work (debug harnesses) that must run before shared caches are freed. */
}
