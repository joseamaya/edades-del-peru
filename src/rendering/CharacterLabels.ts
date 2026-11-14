import type { RTSCamera } from '../core/Camera';
import type { Unit } from '../entities/Unit';
import type { Fow } from '../game/Fow';
import { commanderById, commanderLabel } from '../model/defs/commanders';
import type { WorldLabel, WorldLabelLayer } from '../ui/WorldLabels';
import { labelFade } from './MapLabels';

/**
 * Nameplates over campaign characters. A unit's mission tag doubles as its commander id, so a
 * tagged unit reads as a person on the board instead of an anonymous soldier. Purely visual: HTML
 * over the 3D view, spread apart by the layer when the party walks packed together.
 */
export class CharacterLabels {
  readonly labels = new Map<number, WorldLabel>();

  constructor(private readonly layer: WorldLabelLayer) {}

  /** Hide every plate (mission title card or opening flight). */
  setVisible(visible: boolean): void {
    this.layer.setCharactersVisible(visible);
  }

  /** Follow living characters; enemy names only show while the fog lets the player see them. */
  sync(units: Iterable<Unit>, camera: RTSCamera, fow: Fow, fogOn: boolean): void {
    const fade = labelFade(camera.getZoom(), camera.maxZoom);
    const live = new Set<number>();
    for (const unit of units) {
      const commander = commanderById(unit.tag);
      if (!commander || unit.dead) continue;
      if (unit.owner !== 0 && fogOn && !fow.isVisible(unit.pos.x, unit.pos.z)) continue;
      live.add(unit.id);
      let label = this.labels.get(unit.id);
      if (!label) {
        label = this.layer.create(
          commanderLabel(commander),
          unit.owner === 0 ? 'character' : 'character-enemy',
          `party-${unit.owner}`,
        );
        label.el.dataset.character = commander.id;
        this.labels.set(unit.id, label);
      }
      label.visible = fade > 0.02;
      label.x = unit.pos.x;
      label.y = unit.pos.y + 2.2 + unit.radius * 2;
      label.z = unit.pos.z;
      label.opacity = fade * (unit.owner === 0 ? 1 : 0.8);
    }
    for (const [id, label] of this.labels) {
      if (live.has(id)) continue;
      this.layer.remove(label);
      this.labels.delete(id);
    }
  }

  dispose(): void {
    for (const label of this.labels.values()) this.layer.remove(label);
    this.labels.clear();
  }
}
