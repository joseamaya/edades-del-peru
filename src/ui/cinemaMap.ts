import type { CinematicMap, CinematicMapPoint, CinematicMapRoute, CinematicMapView } from '../campaign/defs/cinematics';
import { escapeHtml } from '../util/escapeHtml';

/** Terrain the map is drawn from: the live mission terrain, in world coordinates. */
export interface CinemaMapTerrain {
  size: number;
  heightAt: (x: number, z: number) => number;
  /** Height below which the ground is drawn as water; missing, the map has no water. */
  waterLevel?: number;
}

/** The whole map, when a beat does not crop it. */
export function fullView(size: number): CinematicMapView {
  return { x: 0, z: 0, size };
}

export const CINEMA_SIDE_COLORS = { player: '#2f64b8', enemy: '#b3332a', place: '#3b2a17' } as const;

const DEFAULT_DRAW = 2.2;
/** Parchment ramp from the lowest to the highest ground. */
const LOW = [236, 221, 186];
const HIGH = [176, 134, 84];

/**
 * Paint the mission terrain as an old campaign map: a parchment height ramp, hill shading from the
 * north-west and a contour every twelfth of the relief. North (z = 0) is at the top.
 */
export function paintCampaignMap(
  canvas: HTMLCanvasElement,
  terrain: CinemaMapTerrain,
  view: CinematicMapView = fullView(terrain.size),
  pixels = 360,
): void {
  canvas.width = pixels;
  canvas.height = pixels;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const step = view.size / pixels;
  const heights = new Float32Array(pixels * pixels);
  // Water is decided on the raw heights: smoothing would blur the shoreline.
  const water = new Uint8Array(pixels * pixels);
  const waterLevel = terrain.waterLevel;
  let min = Infinity;
  let max = -Infinity;
  // `pixels` is fixed at 360 for the pilot: ~50 ms per map (sampling, two blurs and shading). The intro
  // paints each map once when it opens, so a future multi-map film should budget for that or lower this.
  for (let j = 0; j < pixels; j++) {
    for (let i = 0; i < pixels; i++) {
      const h = terrain.heightAt(view.x + (i + 0.5) * step, view.z + (j + 0.5) * step);
      heights[j * pixels + i] = h;
      if (waterLevel !== undefined && h < waterLevel) water[j * pixels + i] = 1;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  // The game terrain carries fine noise (ripples, dunes) that a map must not show: smooth it before
  // shading, or the hill shade turns into stripes and every ripple draws a contour.
  smooth(heights, pixels, Math.max(2, Math.round(pixels / 60)));
  smooth(heights, pixels, Math.max(2, Math.round(pixels / 60)));
  min = Infinity;
  max = -Infinity;
  for (const h of heights) {
    if (h < min) min = h;
    if (h > max) max = h;
  }
  const range = Math.max(1e-3, max - min);
  const contour = range / 7;
  const minSlope = (range / pixels) * 2.5;
  const image = ctx.createImageData(pixels, pixels);
  const at = (i: number, j: number) =>
    heights[Math.min(pixels - 1, Math.max(0, j)) * pixels + Math.min(pixels - 1, Math.max(0, i))]!;
  for (let j = 0; j < pixels; j++) {
    for (let i = 0; i < pixels; i++) {
      const h = at(i, j);
      const t = (h - min) / range;
      // Light from the north-west: slopes facing it brighten, the others darken.
      const dx = at(i + 1, j) - at(i - 1, j);
      const dz = at(i, j + 1) - at(i, j - 1);
      const shade = Math.max(-0.35, Math.min(0.35, ((-dx - dz) * 0.9) / Math.max(step, 0.5)));
      const band = Math.floor((h - min) / contour);
      // Contours only on real slopes: on the flat desert the residual noise would draw a maze.
      const slope = Math.hypot(dx, dz);
      const edge =
        slope > minSlope &&
        (Math.floor((at(i + 1, j) - min) / contour) !== band || Math.floor((at(i, j + 1) - min) / contour) !== band);
      const wet = water[j * pixels + i] === 1;
      const k = (j * pixels + i) * 4;
      for (let c = 0; c < 3; c++) {
        let v = LOW[c]! + (HIGH[c]! - LOW[c]!) * t;
        v *= 1 + shade * 0.55;
        if (edge) v *= 0.8;
        if (wet) v = [150, 170, 172][c]!;
        image.data[k + c] = Math.max(0, Math.min(255, v));
      }
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** In-place separable box blur of a square height grid, with the edge samples clamped to the border. */
function smooth(grid: Float32Array, n: number, radius: number): void {
  const tmp = new Float32Array(grid.length);
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          const c = Math.min(n - 1, Math.max(0, b + k));
          sum += horizontal ? src[a * n + c]! : src[c * n + a]!;
        }
        if (horizontal) dst[a * n + b] = sum / (radius * 2 + 1);
        else dst[b * n + a] = sum / (radius * 2 + 1);
      }
    }
  };
  pass(grid, tmp, true);
  pass(tmp, grid, false);
}

function pathData(points: CinematicMapPoint[]): string {
  if (points.length < 2) return '';
  // A Catmull-Rom spline through the points, as cubic Béziers: marching columns do not turn on a corner.
  const p = points;
  let d = `M${p[0]!.x.toFixed(1)},${p[0]!.z.toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, z: p1.z + (p2.z - p0.z) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, z: p2.z - (p3.z - p1.z) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.z.toFixed(1)} ${c2.x.toFixed(1)},${c2.z.toFixed(1)} ${p2.x.toFixed(1)},${p2.z.toFixed(1)}`;
  }
  return d;
}

/** A placed label: its baseline anchor and the box it covers, in world units. */
export interface MapLabel {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fontSize: number;
  box: { x0: number; y0: number; x1: number; y1: number };
}

/** Width of bold italic Georgia, per character and em: a conservative estimate (no DOM to measure). */
const CHAR_EM = 0.56;

function labelBox(text: string, x: number, y: number, anchor: MapLabel['anchor'], fs: number): MapLabel['box'] {
  const w = text.length * fs * CHAR_EM;
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
  return { x0, y0: y - fs * 0.8, x1: x0 + w, y1: y + fs * 0.25 };
}

function overlap(a: MapLabel['box'], b: MapLabel['box']): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Place every label of a map so none leaves the view or covers another label or marker. Each label tries a
 * few spots around its point (the authored one first) and takes the first that is clear; if none is, the
 * least crowded one, nudged inside the view. Marks are placed before route labels: towns matter more.
 */
export function layoutMapLabels(
  map: CinematicMap,
  view: CinematicMapView,
): { marks: MapLabel[]; routes: (MapLabel | null)[] } {
  const size = view.size;
  const margin = size * 0.012;
  const placed: MapLabel['box'][] = [];
  // The glyphs themselves are obstacles: a label must not sit on a town dot or a force marker.
  for (const mark of map.marks) {
    const r = mark.side === 'place' ? size * 0.01 : size * 0.024;
    placed.push({ x0: mark.x - r, y0: mark.z - r * 0.7, x1: mark.x + r, y1: mark.z + r * 0.7 });
  }
  const inside = (b: MapLabel['box']) =>
    b.x0 >= view.x + margin &&
    b.x1 <= view.x + size - margin &&
    b.y0 >= view.z + margin &&
    b.y1 <= view.z + size - margin;
  const place = (text: string, fs: number, candidates: [number, number, MapLabel['anchor']][]): MapLabel => {
    let best: MapLabel | null = null;
    let bestCost = Infinity;
    for (const [x, y, anchor] of candidates) {
      let box = labelBox(text, x, y, anchor, fs);
      let cx = x;
      let cy = y;
      // Nudge into the view rather than discarding a spot that only grazes the frame.
      const dx = Math.max(0, view.x + margin - box.x0) - Math.max(0, box.x1 - (view.x + size - margin));
      const dy = Math.max(0, view.z + margin - box.y0) - Math.max(0, box.y1 - (view.z + size - margin));
      cx += dx;
      cy += dy;
      box = labelBox(text, cx, cy, anchor, fs);
      // Labels keep a gap of about a letter between them: touching words read as one.
      const padded = { x0: box.x0 - fs * 0.35, y0: box.y0 - fs * 0.15, x1: box.x1 + fs * 0.35, y1: box.y1 + fs * 0.15 };
      const crowd = placed.reduce((sum, other) => sum + overlap(padded, other), 0);
      // Prefer the authored spot, then spots that did not need a nudge.
      const cost = crowd * 100 + Math.hypot(dx, dy) + (inside(box) ? 0 : 1e6);
      if (cost < bestCost) {
        bestCost = cost;
        best = { text, x: cx, y: cy, anchor, fontSize: fs, box };
      }
      if (crowd === 0 && dx === 0 && dy === 0) break;
    }
    placed.push(best!.box);
    return best!;
  };
  const marks = map.marks.map((mark) => {
    const fs = size * (mark.side === 'place' ? 0.03 : 0.026);
    const gap = mark.side === 'place' ? size * 0.014 : size * 0.03;
    const above: [number, number, MapLabel['anchor']] = [mark.x, mark.z - fs * 0.7, 'middle'];
    const below: [number, number, MapLabel['anchor']] = [mark.x, mark.z + size * 0.014 + fs * 1.05, 'middle'];
    const right: [number, number, MapLabel['anchor']] = [mark.x + gap, mark.z + fs * 0.3, 'start'];
    const left: [number, number, MapLabel['anchor']] = [mark.x - gap, mark.z + fs * 0.3, 'end'];
    return place(mark.label, fs, mark.side === 'place' ? [above, right, left, below] : [below, right, left, above]);
  });
  const routes = map.routes.map((route) => {
    if (!route.label || route.points.length < 2) return null;
    const fs = size * 0.026;
    const start = route.points[0]!;
    const next = route.points[1]!;
    const mid = { x: (start.x + next.x) / 2, z: (start.z + next.z) / 2 };
    return place(route.label, fs, [
      [start.x, start.z - fs * 0.9, 'middle'],
      [start.x, start.z + fs * 1.4, 'middle'],
      [start.x + size * 0.02, start.z + fs * 0.3, 'start'],
      [start.x - size * 0.02, start.z + fs * 0.3, 'end'],
      [mid.x + size * 0.02, mid.z, 'start'],
      [mid.x - size * 0.02, mid.z, 'end'],
      [start.x + size * 0.02, start.z - fs * 0.9, 'start'],
      [start.x - size * 0.02, start.z - fs * 0.9, 'end'],
      [start.x + size * 0.02, start.z + fs * 1.4, 'start'],
      [start.x - size * 0.02, start.z + fs * 1.4, 'end'],
    ]);
  });
  return { marks, routes };
}

function routeLabel(route: CinematicMapRoute, label: MapLabel | null, delay: number, draw: number): string {
  if (!label) return '';
  return `<text class="cine-map-route-label" x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="${label.anchor}"
    font-size="${label.fontSize.toFixed(2)}" fill="${CINEMA_SIDE_COLORS[route.side]}"
    style="animation-delay:${(delay + draw * 0.3).toFixed(2)}s">${escapeHtml(label.text)}</text>`;
}

/** Each map gets its own id prefix: two maps can share the DOM while they cross-fade. */
let mapSerial = 0;

/**
 * SVG overlay for the animated map, in world units (its viewBox is the cropped view, so marks keep their
 * world coordinates). Arrows draw themselves with a stroke-dash animation; marks fade in after their delay.
 * Timing lives in inline CSS so the player only has to insert the markup.
 */

export function campaignMapSvg(map: CinematicMap, view: CinematicMapView): string {
  const prefix = `cine-map-${++mapSerial}`;
  const size = view.size;
  const labels = layoutMapLabels(map, view);
  const stroke = size * 0.011;
  const markers = (['player', 'enemy'] as const)
    .map(
      (side) => `<marker id="${prefix}-head-${side}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2"
        markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${CINEMA_SIDE_COLORS[side]}"/></marker>`,
    )
    .join('');
  const routes = map.routes
    .map((route, index) => {
      const delay = route.delay ?? 0;
      const draw = route.draw ?? DEFAULT_DRAW;
      const d = pathData(route.points);
      const color = CINEMA_SIDE_COLORS[route.side];
      const dash = route.dashed ? `stroke-dasharray="${(stroke * 2.2).toFixed(2)} ${(stroke * 1.6).toFixed(2)}"` : '';
      // A dashed route reveals itself through a mask, because its own dash pattern cannot be animated.
      const id = `${prefix}-route-${index}`;
      const reveal = `<path d="${d}" pathLength="1" class="cine-map-draw" stroke="#fff" stroke-width="${(stroke * 3).toFixed(2)}"
        fill="none" stroke-linecap="round" style="animation-delay:${delay}s;animation-duration:${draw}s"/>`;
      return `<mask id="${id}" maskUnits="userSpaceOnUse">${reveal}</mask>
        <path d="${d}" fill="none" stroke="rgba(30,20,10,.35)" stroke-width="${(stroke * 2.1).toFixed(2)}"
          stroke-linecap="round" mask="url(#${id})"/>
        <path d="${d}" fill="none" stroke="${color}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"
          ${dash} mask="url(#${id})"/>
        <path d="${d}" fill="none" stroke="transparent" stroke-width="${stroke.toFixed(2)}" class="cine-map-head"
          marker-end="url(#${prefix}-head-${route.side})" style="animation-delay:${(delay + draw * 0.92).toFixed(2)}s"/>
        ${routeLabel(route, labels.routes[index] ?? null, delay, draw)}`;
    })
    .join('');
  const marks = map.marks
    .map((mark, index) => {
      const delay = mark.delay ?? 0;
      const label = labels.marks[index]!;
      const color = CINEMA_SIDE_COLORS[mark.side];
      const glyph =
        mark.side === 'place'
          ? `<circle cx="${mark.x}" cy="${mark.z}" r="${(size * 0.008).toFixed(2)}" fill="${color}"/>`
          : `<rect x="${mark.x - size * 0.022}" y="${mark.z - size * 0.014}" width="${size * 0.044}" height="${size * 0.028}"
              fill="${color}" stroke="#f3e6c8" stroke-width="${(size * 0.003).toFixed(2)}"/>
             <path d="M${mark.x - size * 0.022},${mark.z - size * 0.014} L${mark.x + size * 0.022},${mark.z + size * 0.014}
               M${mark.x + size * 0.022},${mark.z - size * 0.014} L${mark.x - size * 0.022},${mark.z + size * 0.014}"
               stroke="#f3e6c8" stroke-width="${(size * 0.0025).toFixed(2)}"/>`;
      return `<g class="cine-map-mark cine-map-${mark.side}" style="animation-delay:${delay}s">${glyph}
        <text x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" text-anchor="${label.anchor}" font-size="${label.fontSize.toFixed(2)}"
          fill="${color}">${escapeHtml(label.text)}</text></g>`;
    })
    .join('');
  return `<svg class="cine-map-svg" viewBox="${view.x} ${view.z} ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>${markers}</defs>${routes}${marks}</svg>`;
}
