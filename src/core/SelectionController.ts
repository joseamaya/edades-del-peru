import { type HeritageBuildingDef, type HeritageBuildingId } from '../model/defs/heritage';
import { bus } from './EventBus';
import { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import { UnitKind } from '../core/types';
import { distance2D } from '../util/math';
import { getHeritageBuilding } from '../model/defs/heritage';
import { RESOURCE_INFO } from './Config';

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

  /** Hand over a field-card offering at the authored site. */
  makeOffering(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'offer', 'ofrenda', 'templo');
  }

  /** Exchange elite goods at a Moche/Recuay site card. */
  makeTrade(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'trade', 'intercambio', 'huacas');
  }

  private makeHeritageExchange(
    id: HeritageBuildingId,
    operation: 'offer' | 'trade',
    noun: string,
    place: string,
  ): boolean {
    const def = getHeritageBuilding(id);
    if (!def || def.operation !== operation) return false;
    const resource = def.operationResource ?? 'silver';
    const amount = def.operationAmount ?? 50;
    const anchor = this.game.siteAnchor ?? this.game.siteCenter;
    const near = anchor
      ? [...this.game.units.values()].some(
          (unit) =>
            unit.owner === 0 &&
            !unit.dead &&
            unit.kind === UnitKind.WORKER &&
            distance2D(unit.pos.x, unit.pos.z, anchor.x, anchor.z) < 18,
        )
      : false;
    if (!near) {
      this.game.hud?.showToast(
        `Acerca un obrero a las ${place} para ${operation === 'offer' ? 'entregar' : 'intercambiar'}.`,
        'warning',
      );
      return false;
    }
    const resourceName = RESOURCE_INFO[resource].name.toLowerCase();
    if (this.game.players[0].resources[resource] < amount) {
      this.game.hud?.showToast(
        `Necesitas ${amount} de ${resourceName} para ${operation === 'offer' ? 'la' : 'el'} ${noun}.`,
        'warning',
      );
      return false;
    }
    const recorded = this.game.mission?.recordDelivery(resource, amount) ?? 0;
    if (recorded <= 0) {
      this.game.hud?.showToast(
        `No hay ${operation === 'offer' ? 'una' : 'un'} ${noun} pendiente en este momento.`,
        'info',
      );
      return false;
    }
    this.game.players[0].resources[resource] -= recorded;
    this.game.hud?.showToast(
      `${noun[0].toUpperCase()}${noun.slice(1)} ${noun === 'ofrenda' ? 'entregada' : 'entregado'}: ${recorded} de ${resourceName}.`,
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
