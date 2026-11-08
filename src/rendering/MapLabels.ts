import * as THREE from 'three';
import type { MissionLabel } from '../campaign/types';
import type { RTSCamera } from '../core/Camera';
import type { Fow } from '../game/Fow';
import type { Terrain } from './Terrain';

type LabelKind = NonNullable<MissionLabel['kind']>;

export const LABEL_COLORS: Record<LabelKind, string> = {
  water: '#d4ece8',
  settlement: '#f2dfae',
  region: '#e7ddc4',
};

/** Region names sit back so settlements stay the loudest labels. */
export const LABEL_OPACITY: Record<LabelKind, number> = {
  water: 0.7,
  settlement: 0.92,
  region: 0.45,
};

const SCALE: Record<LabelKind, number> = {
  water: 1,
  settlement: 1,
  region: 0.82,
};

/** Screen height the label keeps while zooming (world height is derived from the zoom). */
const LABEL_SCREEN_FACTOR = 0.022;

/** Fade the names out as the camera approaches the map's widest framing. */
export function labelFade(zoom: number, maxZoom: number): number {
  const start = maxZoom * 0.78;
  return Math.max(0, Math.min(1, (maxZoom - zoom) / Math.max(1e-6, maxZoom - start)));
}

interface LabelItem {
  readonly label: MissionLabel;
  readonly kind: LabelKind;
  readonly sprite: THREE.Sprite;
  readonly material: THREE.SpriteMaterial;
  readonly texture: THREE.CanvasTexture;
  readonly aspect: number;
}

function makeTexture(label: MissionLabel, kind: LabelKind): { texture: THREE.CanvasTexture; aspect: number } {
  const fontSize = 64;
  const font = `600 ${fontSize}px Georgia, "Times New Roman", serif`;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const padX = 22;
  const padY = 10;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(measure.measureText(label.text).width) + padX * 2;
  canvas.height = fontSize + padY * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, fontSize * 0.09);
  ctx.strokeStyle = 'rgba(6, 8, 10, 0.85)';
  ctx.strokeText(label.text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = LABEL_COLORS[kind];
  ctx.fillText(label.text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return { texture, aspect: canvas.width / canvas.height };
}

/**
 * Source-backed place names drawn as ground-anchored billboards. They keep a readable screen
 * size, fade out when the camera zooms out, and disappear under unexplored fog of war. Depth
 * testing lets terrain, buildings and units occlude them instead of covering the board.
 */
export class MapLabels {
  private readonly items: LabelItem[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    labels: readonly MissionLabel[],
    private readonly terrain: Terrain,
    private readonly mapSize: number,
  ) {
    for (const label of labels) {
      const kind = label.kind ?? 'region';
      const { texture, aspect } = makeTexture(label, kind);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: true,
        fog: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.name = `geo-label:${label.text}`;
      sprite.center.set(0.5, 0);
      sprite.renderOrder = 2;
      scene.add(sprite);
      this.items.push({ label, kind, sprite, material, texture, aspect });
    }
  }

  update(camera: RTSCamera, fow: Fow, fogOn: boolean): void {
    const zoom = camera.getZoom();
    const fade = labelFade(zoom, camera.maxZoom);
    for (const item of this.items) {
      const x = item.label.x * this.mapSize;
      const z = item.label.z * this.mapSize;
      if (fade <= 0.01 || (fogOn && !fow.isExplored(x, z))) {
        item.sprite.visible = false;
        continue;
      }
      item.sprite.visible = true;
      const height = zoom * LABEL_SCREEN_FACTOR * SCALE[item.kind];
      item.sprite.scale.set(height * item.aspect, height, 1);
      const ground = Math.max(this.terrain.getHeight(x, z), this.terrain.waterLevel);
      item.sprite.position.set(x, ground + zoom * 0.006 + 0.4, z);
      item.material.opacity = fade * LABEL_OPACITY[item.kind];
    }
  }

  dispose(): void {
    for (const item of this.items) {
      this.scene.remove(item.sprite);
      item.texture.dispose();
      item.material.dispose();
    }
    this.items.length = 0;
  }
}
