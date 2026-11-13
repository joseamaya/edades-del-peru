import * as THREE from 'three';
import type { RTSCamera } from '../core/Camera';
import type { Unit } from '../entities/Unit';
import type { Fow } from '../game/Fow';
import { commanderById, commanderLabel } from '../model/defs/commanders';
import { labelFade } from './MapLabels';
import { labelSprite, type LabelSprite } from './textSprite';

/** Screen height a nameplate keeps while zooming (the world height follows the camera). */
const NAME_SCREEN_FACTOR = 0.018;
/** Vertical offset per unit id, so a tight group does not stack every name on the same line. */
const NAME_STAGGER = 0.32;

/**
 * Nameplates over campaign characters. A unit's mission tag doubles as its commander id, so a
 * tagged unit reads as a person on the board instead of an anonymous soldier. Purely visual.
 */
export class CharacterLabels {
  private readonly group = new THREE.Group();
  private readonly labels = new Map<number, LabelSprite>();

  constructor(scene: THREE.Scene) {
    this.group.name = 'character-labels';
    scene.add(this.group);
  }

  /** Hide every plate (mission title card or opening flight). */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Follow living characters; enemy names only show while the fog lets the player see them. */
  sync(units: Iterable<Unit>, camera: RTSCamera, fow: Fow, fogOn: boolean): void {
    const zoom = camera.getZoom();
    const fade = labelFade(zoom, camera.maxZoom);
    const live = new Set<number>();
    for (const unit of units) {
      const commander = commanderById(unit.tag);
      if (!commander || unit.dead) continue;
      if (unit.owner !== 0 && fogOn && !fow.isVisible(unit.pos.x, unit.pos.z)) continue;
      live.add(unit.id);
      let label = this.labels.get(unit.id);
      if (!label) {
        if (fade <= 0.02) continue;
        label = labelSprite(commanderLabel(commander), {
          fontSize: 44,
          // The accent lives on the hero ring, crest and HUD portrait; the name stays legible.
          color: unit.owner === 0 ? '#f6e7bf' : '#e8b7a0',
          paddingX: 16,
          paddingY: 8,
        });
        label.sprite.name = `character-label:${commander.id}`;
        this.group.add(label.sprite);
        this.labels.set(unit.id, label);
      }
      if (fade <= 0.02) {
        label.sprite.visible = false;
        continue;
      }
      const height = zoom * NAME_SCREEN_FACTOR;
      label.sprite.visible = true;
      label.sprite.scale.set(height * label.aspect, height, 1);
      label.sprite.position.set(
        unit.pos.x,
        unit.pos.y + 2.2 + unit.radius * 2 + (unit.id % 3) * NAME_STAGGER,
        unit.pos.z,
      );
      label.material.opacity = fade * (unit.owner === 0 ? 1 : 0.8);
    }
    for (const [id, label] of this.labels) {
      if (live.has(id)) continue;
      this.group.remove(label.sprite);
      label.texture.dispose();
      label.material.dispose();
      this.labels.delete(id);
    }
  }

  dispose(): void {
    for (const label of this.labels.values()) {
      this.group.remove(label.sprite);
      label.texture.dispose();
      label.material.dispose();
    }
    this.labels.clear();
    this.group.removeFromParent();
  }
}
