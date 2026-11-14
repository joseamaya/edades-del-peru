import type { MissionLabel } from '../campaign/types';
import type { RTSCamera } from '../core/Camera';
import type { Fow } from '../game/Fow';
import type { WorldLabel, WorldLabelLayer } from '../ui/WorldLabels';
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

/** Fade the names out as the camera approaches the map's widest framing. */
export function labelFade(zoom: number, maxZoom: number): number {
  const start = maxZoom * 0.78;
  return Math.max(0, Math.min(1, (maxZoom - zoom) / Math.max(1e-6, maxZoom - start)));
}

interface LabelItem {
  readonly label: MissionLabel;
  readonly kind: LabelKind;
  readonly view: WorldLabel;
}

/**
 * Source-backed place names, drawn as HTML over the 3D view (crisp at any render scale). They fade
 * out when the camera zooms out and disappear under unexplored fog of war.
 */
export class MapLabels {
  private readonly items: LabelItem[] = [];

  constructor(
    private readonly layer: WorldLabelLayer,
    labels: readonly MissionLabel[],
    private readonly terrain: Terrain,
    private readonly mapSize: number,
  ) {
    for (const label of labels) {
      const kind = label.kind ?? 'region';
      // Grouped so two names on one spot (Tambotoco over Pacaritambo) stack instead of overprinting.
      const view = layer.create(label.text, kind, 'map');
      view.el.dataset.geoLabel = label.text;
      this.items.push({ label, kind, view });
    }
  }

  update(camera: RTSCamera, fow: Fow, fogOn: boolean): void {
    const zoom = camera.getZoom();
    const fade = labelFade(zoom, camera.maxZoom);
    for (const item of this.items) {
      const x = item.label.x * this.mapSize;
      const z = item.label.z * this.mapSize;
      const view = item.view;
      view.visible = fade > 0.01 && !(fogOn && !fow.isExplored(x, z));
      if (!view.visible) continue;
      const ground = Math.max(this.terrain.getHeight(x, z), this.terrain.waterLevel);
      view.x = x;
      view.y = ground + 0.4;
      view.z = z;
      view.opacity = fade * LABEL_OPACITY[item.kind];
    }
  }

  dispose(): void {
    for (const item of this.items) this.layer.remove(item.view);
    this.items.length = 0;
  }
}
