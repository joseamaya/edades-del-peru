import type { Game } from '../core/Game';
import { BuildingKind, UnitKind } from '../core/types';
import { distance2D } from '../util/math';
import type { TutorialSave, TutorialBase } from '../game/saveTypes';
import type { TutorialBuildBaseline, TutorialDef, TutorialStepDef } from './types';

/**
 * Data-driven guided tutorial. It observes the game state and advances when the
 * player performs each action. It is independent of mission objectives and
 * respects the «Mostrar consejos» setting.
 */
export class Tutorial {
  private game: Game;
  private pasos: TutorialStepDef[];
  private idx = 0;
  private begun = false;
  private finished = false;
  private delay = 0;
  private base: TutorialBase;

  constructor(game: Game, def: TutorialDef) {
    this.game = game;
    const countB = (kind: BuildingKind): number =>
      [...game.buildings.values()].filter((b) => b.owner === 0 && b.kind === kind && !b.dead).length;
    const countU = (kind: UnitKind): number =>
      [...game.units.values()].filter((u) => u.owner === 0 && u.kind === kind && !u.dead).length;
    this.base = {
      houses: countB(BuildingKind.HOUSE),
      barracks: countB(BuildingKind.BARRACKS),
      soldiers: countU(UnitKind.SOLDIER),
      farms: countB(BuildingKind.FARM),
      mills: countB(BuildingKind.MILL),
    };
    this.pasos = def.steps;
  }

  /** Advance the tutorial; shown after the briefing closes and the match resumes. */
  update(dt: number): void {
    if (this.finished) return;
    if (!this.begun) {
      if (this.game.getPaused() || !this.game.mission || this.game.mission.activeObjectives.length === 0) return;
      this.delay += dt;
      if (this.delay < 1.2) return;
      this.begun = true;
      this.show();
      return;
    }
    const paso = this.pasos[this.idx];
    if (this.checkStep(paso)) {
      this.idx++;
      if (this.idx >= this.pasos.length) {
        this.finish();
        return;
      }
      this.show();
    }
  }

  private countBuilt(kind: BuildingKind): number {
    return [...this.game.buildings.values()].filter(
      (b) => b.owner === 0 && b.kind === kind && b.constructionComplete && !b.dead,
    ).length;
  }

  private checkStep(paso: TutorialStepDef): boolean {
    const game = this.game;
    switch (paso.check.type) {
      case 'selectUnit': {
        const kind = paso.check.unitKind;
        return game.selectedUnits.some((id) => {
          const unit = game.units.get(id);
          return unit?.owner === 0 && unit.kind === kind;
        });
      }
      case 'reachFishing': {
        const radius = paso.check.radius;
        const scouts = [...game.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.SCOUT);
        const fish = [...game.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead);
        return scouts.some((u) => fish.some((n) => distance2D(u.pos.x, u.pos.z, n.pos.x, n.pos.z) < radius));
      }
      case 'build': {
        const baseline = this.base[paso.check.baseline as TutorialBuildBaseline] ?? 0;
        return this.countBuilt(paso.check.buildingKind) > baseline;
      }
      case 'approachSite': {
        const landmark = game.landmark;
        if (!landmark) return false;
        const target = game.siteCenter ?? { x: landmark.position.x, z: landmark.position.z };
        const unitKind = paso.check.unitKind;
        const radius = paso.check.radius;
        const units = [...game.units.values()].filter(
          (u) => u.owner === 0 && !u.dead && (!unitKind || u.kind === unitKind),
        );
        return units.some((u) => distance2D(u.pos.x, u.pos.z, target.x, target.z) < radius);
      }
      default:
        return false;
    }
  }

  private gateOpen(paso: TutorialStepDef): boolean {
    if (!paso.gateObjective) return true;
    return this.game.mission?.getObjectiveState(paso.gateObjective) !== 'pendiente';
  }

  private show(): void {
    while (this.idx < this.pasos.length) {
      const candidate = this.pasos[this.idx];
      if (this.gateOpen(candidate)) break;
      this.idx++;
    }
    if (this.idx >= this.pasos.length) {
      this.finish();
      return;
    }
    const paso = this.pasos[this.idx];
    this.game.hud.showTutorialStep(paso.text, this.idx, this.pasos.length, () => this.finish());
    if (paso.highlight) this.game.hud.highlightHud(paso.highlight);
    else this.game.hud.clearHudHighlight();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.game.hud.hideTutorial();
    this.game.hud.showToast('🎓 Tutorial completado. ¡Buena suerte, estratega!', 'success');
  }

  /** Snapshot the tutorial progress (used by save/load). */
  toSave(): TutorialSave {
    return {
      idx: this.idx,
      stepId: this.pasos[this.idx]?.id,
      begun: this.begun,
      finished: this.finished,
      delay: this.delay,
      base: { ...this.base },
    };
  }

  applySave(s: TutorialSave): void {
    // Saves written before step ids existed used: select, house, farm, market,
    // explore. Map those positions to their closest current step.
    const legacyIds = ['select', 'house', 'farm', 'coast', 'landmark'];
    const stepId = s.stepId ?? legacyIds[s.idx];
    const found = stepId ? this.pasos.findIndex((p) => p.id === stepId) : -1;
    this.idx = found >= 0 ? found : Math.min(s.idx, this.pasos.length - 1);
    this.begun = s.begun;
    this.finished = s.finished;
    this.delay = s.delay;
    this.base = {
      ...s.base,
      farms: s.base.farms ?? 0,
      mills: s.base.mills ?? 0,
    };
  }
}
