import * as THREE from 'three';

/** Visual family of a world label; each maps to a CSS class with its own size and colour. */
export type WorldLabelKind = 'settlement' | 'water' | 'region' | 'character' | 'character-enemy' | 'memory';

/**
 * One label anchored to a world point. Owners set `x/y/z`, `opacity` and `visible` while the game
 * updates; the layer projects it to the screen when the frame is rendered.
 */
export interface WorldLabel {
  readonly el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  opacity: number;
  visible: boolean;
  /** Extra screen offset in px (negative = up), set by the layer's de-overlap pass. */
  lift: number;
  /** Measured box, cached so the centring offsets stay whole pixels. */
  width: number;
  height: number;
  /** Labels in the same group are spread vertically when their boxes overlap (the hero party). */
  readonly group: string | null;
}

const STYLE_ID = 'ed-world-labels-style';
const CSS = `
#ed-world-labels { position: fixed; inset: 0; pointer-events: none; z-index: 15; overflow: hidden; }
#ed-world-labels.hidden-characters .wl-character, #ed-world-labels.hidden-characters .wl-character-enemy { display: none !important; }
.wl { position: absolute; left: 0; top: 0; white-space: nowrap; will-change: transform; font-family: Georgia, "Times New Roman", serif; font-weight: 600; line-height: 1; padding: 1px 4px;
  text-shadow: 0 0 2px rgba(6, 8, 10, 0.95), 0 0 4px rgba(6, 8, 10, 0.85), 0 1px 1px rgba(0, 0, 0, 0.9); }
.wl-settlement { font-size: 17px; color: #f2dfae; letter-spacing: 0.3px; }
.wl-water { font-size: 15px; color: #d4ece8; font-style: italic; }
.wl-region { font-size: 14px; color: #e7ddc4; letter-spacing: 1.2px; text-transform: uppercase; }
.wl-character { font-size: 14px; color: #f6e7bf; }
.wl-character-enemy { font-size: 14px; color: #e8b7a0; }
.wl-memory { font-size: 13px; color: #f2dfae; }
`;

/**
 * HTML labels over the 3D view. World billboards were canvas textures inside the scene: minified
 * without mipmaps, softened by FXAA and bloom, and upscaled whenever the render scale dropped, so
 * names read blurred. DOM text keeps the device's full resolution whatever the 3D does.
 */
export class WorldLabelLayer {
  readonly root: HTMLDivElement;
  private readonly labels = new Set<WorldLabel>();
  private readonly tmp = new THREE.Vector3();

  constructor(parent: HTMLElement = document.body) {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.root = document.createElement('div');
    this.root.id = 'ed-world-labels';
    parent.appendChild(this.root);
  }

  create(text: string, kind: WorldLabelKind, group: string | null = null): WorldLabel {
    const el = document.createElement('div');
    el.className = `wl wl-${kind}`;
    el.textContent = text;
    el.style.display = 'none';
    this.root.appendChild(el);
    const label: WorldLabel = { el, x: 0, y: 0, z: 0, opacity: 1, visible: false, lift: 0, width: 0, height: 0, group };
    this.labels.add(label);
    return label;
  }

  remove(label: WorldLabel): void {
    label.el.remove();
    this.labels.delete(label);
  }

  /** Hide or show the character nameplates (title cards and opening flights). */
  setCharactersVisible(visible: boolean): void {
    this.root.classList.toggle('hidden-characters', !visible);
  }

  /** Project every visible label for the camera of the frame being rendered. */
  project(camera: THREE.Camera): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const placed: { label: WorldLabel; sx: number; sy: number }[] = [];
    for (const label of this.labels) {
      if (!label.visible || label.opacity <= 0.01) {
        if (label.el.style.display !== 'none') label.el.style.display = 'none';
        continue;
      }
      this.tmp.set(label.x, label.y, label.z).project(camera);
      // Behind the camera or far off-screen: nothing to draw.
      if (this.tmp.z > 1 || this.tmp.x < -1.3 || this.tmp.x > 1.3 || this.tmp.y < -1.3 || this.tmp.y > 1.3) {
        if (label.el.style.display !== 'none') label.el.style.display = 'none';
        continue;
      }
      if (label.el.style.display === 'none') label.el.style.display = 'block';
      if (label.width === 0) {
        label.width = label.el.offsetWidth;
        label.height = label.el.offsetHeight;
      }
      placed.push({ label, sx: (this.tmp.x * 0.5 + 0.5) * w, sy: (-this.tmp.y * 0.5 + 0.5) * h });
    }
    this.spreadGroups(placed);
    for (const { label, sx, sy } of placed) {
      // Whole pixels: a fractional translate resamples the glyphs and blurs them again.
      const left = Math.round(sx - label.width / 2);
      const top = Math.round(sy - label.height + label.lift);
      label.el.style.transform = `translate(${left}px, ${top}px)`;
      label.el.style.opacity = label.opacity.toFixed(2);
    }
  }

  /** Push overlapping labels of one group upward so a packed party still reads name by name. */
  private spreadGroups(placed: { label: WorldLabel; sx: number; sy: number }[]): void {
    const boxes: { x0: number; x1: number; y0: number; y1: number; group: string }[] = [];
    const grouped = placed.filter((p) => p.label.group !== null).sort((a, b) => b.sy - a.sy);
    for (const p of placed) p.label.lift = 0;
    for (const p of grouped) {
      const x0 = p.sx - p.label.width / 2;
      const x1 = x0 + p.label.width;
      let y1 = p.sy;
      let y0 = y1 - p.label.height;
      for (let pass = 0; pass < 8; pass++) {
        const hit = boxes.find((b) => b.group === p.label.group && x0 < b.x1 && x1 > b.x0 && y0 < b.y1 && y1 > b.y0);
        if (!hit) break;
        const shift = y1 - hit.y0 + 1;
        y0 -= shift;
        y1 -= shift;
        p.label.lift -= shift;
      }
      boxes.push({ x0, x1, y0, y1, group: p.label.group! });
    }
  }

  dispose(): void {
    for (const label of this.labels) label.el.remove();
    this.labels.clear();
    this.root.remove();
  }
}
