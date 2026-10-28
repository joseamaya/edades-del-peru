import type { Game } from '../core/Game';
import { UnitKind, BuildingKind } from '../core/types';
import { distance2D } from '../util/math';
import type { TutorialSave, TutorialBase } from '../game/saveTypes';

interface PasoTutorial {
  id: string;
  text: string;
  /** HUD element selector to highlight (optional). */
  highlight?: string;
  /** Skip this step until the player has reached the matching mission beat. */
  gate?: (game: Game) => boolean;
  check: (game: Game) => boolean;
}

/** A scout must get this close to a fishing ground to discover it. */
const COAST_DISCOVERY_RADIUS = 16;
/** A scout must get this close to the ceremonial complex to observe it. */
const LANDMARK_DISCOVERY_RADIUS = 12;

/**
 * Step-by-step guided tutorial for the first campaign (Caral). Observes the game state
 * and advances when the player performs each action. It is independent of the mission
 * objectives (it does not change the victory condition) and respects the «Mostrar consejos» setting.
 */
export class Tutorial {
  private game: Game;
  private pasos: PasoTutorial[];
  private idx = 0;
  private begun = false;
  private finished = false;
  private delay = 0;
  private base: TutorialBase;

  constructor(game: Game) {
    this.game = game;
    const countB = (k: BuildingKind): number =>
      [...game.buildings.values()].filter((b) => b.owner === 0 && b.kind === k && !b.dead).length;
    const countU = (k: UnitKind): number =>
      [...game.units.values()].filter((u) => u.owner === 0 && u.kind === k && !u.dead).length;
    this.base = {
      houses: countB(BuildingKind.HOUSE),
      barracks: countB(BuildingKind.BARRACKS),
      soldiers: countU(UnitKind.SOLDIER),
      farms: countB(BuildingKind.FARM),
      mills: countB(BuildingKind.MILL),
    };
    const buildBottom = '#ed-bottom';
    this.pasos = [
      {
        id: 'select',
        text: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: (g) =>
          g.selectedUnits.some((id) => g.units.get(id)?.owner === 0 && g.units.get(id)?.kind === UnitKind.WORKER),
      },
      {
        id: 'coast',
        text: 'Selecciona tu explorador y recorre el valle hacia el litoral hasta descubrir un banco de peces.',
        check: (g) => {
          const scouts = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.SCOUT);
          const fish = [...g.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead);
          return scouts.some((u) =>
            fish.some((n) => distance2D(u.pos.x, u.pos.z, n.pos.x, n.pos.z) < COAST_DISCOVERY_RADIUS),
          );
        },
      },
      {
        id: 'house',
        text: 'Con obreros seleccionados, pulsa V (o el botón Vivienda) y haz clic en el suelo para construir una vivienda.',
        highlight: buildBottom,
        check: (g) =>
          [...g.buildings.values()].filter(
            (b) => b.owner === 0 && b.kind === BuildingKind.HOUSE && b.constructionComplete && !b.dead,
          ).length > this.base.houses,
      },
      {
        id: 'farm',
        text: 'Pulsa G (o el botón Andén) y coloca el cultivo cerca del agua o de un canal: la tierra húmeda rinde más.',
        highlight: buildBottom,
        check: (g) =>
          [...g.buildings.values()].filter(
            (b) => b.owner === 0 && b.kind === BuildingKind.FARM && b.constructionComplete && !b.dead,
          ).length > (this.base.farms ?? 0),
      },
      {
        id: 'landmark',
        text: 'Acércate al complejo ceremonial y observa sus plazas y pirámides: la monumentalidad nace del trabajo comunal.',
        check: (g) => {
          const landmark = g.landmark;
          if (!landmark) return false;
          const target = g.siteCenter ?? { x: landmark.position.x, z: landmark.position.z };
          const scouts = [...g.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind === UnitKind.SCOUT);
          return scouts.some((u) => distance2D(u.pos.x, u.pos.z, target.x, target.z) < LANDMARK_DISCOVERY_RADIUS);
        },
      },
      {
        id: 'storage',
        text: 'Construye un depósito comunal (Troje) para guardar el excedente de la comunidad.',
        highlight: buildBottom,
        gate: (g) => g.mission?.getObjectiveState('obj_almacenamiento') !== 'pendiente',
        check: (g) =>
          [...g.buildings.values()].filter(
            (b) => b.owner === 0 && b.kind === BuildingKind.MILL && b.constructionComplete && !b.dead,
          ).length > (this.base.mills ?? 0),
      },
    ];
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
    if (paso.check(this.game)) {
      this.idx++;
      if (this.idx >= this.pasos.length) {
        this.finish();
        return;
      }
      this.show();
    }
  }

  private show(): void {
    while (this.idx < this.pasos.length) {
      const candidate = this.pasos[this.idx];
      if (!candidate.gate || candidate.gate(this.game)) break;
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
