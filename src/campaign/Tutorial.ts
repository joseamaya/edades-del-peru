import type { Game } from '../core/Game';
import { UnitKind, BuildingKind, OrderKind } from '../core/types';

interface PasoTutorial {
  id: string;
  texto: string;
  /** Selector de un elemento del HUD a resaltar (opcional). */
  highlight?: string;
  check: (game: Game) => boolean;
}

/**
 * Tutorial guiado paso a paso para la primera campaña (Caral). Observa el estado del juego
 * y avanza cuando el jugador realiza cada acción. Es independiente de los objetivos de la
 * misión (no altera la condición de victoria) y respeta el ajuste «Mostrar consejos».
 */
export class Tutorial {
  private game: Game;
  private pasos: PasoTutorial[];
  private idx = 0;
  private begun = false;
  private finished = false;
  private delay = 0;
  private readonly base: { viviendas: number; cuarteles: number; soldados: number };

  constructor(game: Game) {
    this.game = game;
    const countB = (k: BuildingKind): number =>
      [...game.buildings.values()].filter((b) => b.owner === 0 && b.kind === k && !b.dead).length;
    const countU = (k: UnitKind): number =>
      [...game.units.values()].filter((u) => u.owner === 0 && u.kind === k && !u.dead).length;
    this.base = {
      viviendas: countB(BuildingKind.VIVIENDA),
      cuarteles: countB(BuildingKind.CUARTEL),
      soldados: countU(UnitKind.SOLDADO),
    };
    const buildBottom = '#ed-bottom';
    this.pasos = [
      {
        id: 'seleccionar',
        texto: 'Selecciona a tus obreros: haz clic izquierdo sobre uno o arrastra un recuadro para seleccionar varios.',
        check: (g) => g.selectedUnits.some((id) => g.units.get(id)?.owner === 0 && g.units.get(id)?.kind === UnitKind.OBRERO),
      },
      {
        id: 'vivienda',
        texto: 'Con obreros seleccionados, pulsa V (o el botón Vivienda) y haz clic en el suelo para construir una vivienda.',
        highlight: buildBottom,
        check: (g) =>
          [...g.buildings.values()].filter((b) => b.owner === 0 && b.kind === BuildingKind.VIVIENDA && !b.dead).length >
          this.base.viviendas,
      },
      {
        id: 'cuartel',
        texto: 'Ahora construye una Casa del Guerrero (Cuartel): te permitirá entrenar soldados.',
        highlight: buildBottom,
        check: (g) =>
          [...g.buildings.values()].filter((b) => b.owner === 0 && b.kind === BuildingKind.CUARTEL && !b.dead).length >
          this.base.cuarteles,
      },
      {
        id: 'entrenar',
        texto: 'Selecciona la Casa del Guerrero y entrena un Guerrero para defender el asentamiento.',
        highlight: buildBottom,
        check: (g) =>
          [...g.units.values()].filter((u) => u.owner === 0 && u.kind === UnitKind.SOLDADO && !u.dead).length >
          this.base.soldados,
      },
      {
        id: 'atacar',
        texto: 'Selecciona tu ejército y da una orden: clic derecho para mover o atacar, Ctrl+clic derecho para atacar-mover.',
        check: (g) =>
          [...g.units.values()].some(
            (u) =>
              u.owner === 0 &&
              !u.dead &&
              (u.orderQueue[0]?.kind === OrderKind.ATTACK || u.orderQueue[0]?.kind === OrderKind.ATTACK_MOVE),
          ),
      },
    ];
  }

  /** Avanza el tutorial; se muestra tras cerrarse el briefing y reanudarse la partida. */
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
    const paso = this.pasos[this.idx];
    this.game.hud.showTutorialStep(paso.texto, this.idx, this.pasos.length, () => this.finish());
    if (paso.highlight) this.game.hud.highlightHud(paso.highlight);
    else this.game.hud.clearHudHighlight();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.game.hud.hideTutorial();
    this.game.hud.showToast('🎓 Tutorial completado. ¡Buena suerte, estratega!', 'success');
  }
}
