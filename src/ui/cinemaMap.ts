import type { CinematicMap, CinematicMapPoint, CinematicMapRoute, CinematicMapView } from '../campaign/defs/cinematics';

/** Terrain the map is drawn from: the live mission terrain, in world coordinates. */
export interface CinemaMapTerrain {
  size: number;
  heightAt: (x: number, z: number) => number;
  isWater?: (x: number, z: number) => boolean;
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
  let min = Infinity;
  let max = -Infinity;
  for (let j = 0; j < pixels; j++) {
    for (let i = 0; i < pixels; i++) {
      const h = terrain.heightAt(view.x + (i + 0.5) * step, view.z + (j + 0.5) * step);
      heights[j * pixels + i] = h;
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
      const water = terrain.isWater?.(view.x + (i + 0.5) * step, view.z + (j + 0.5) * step) ?? false;
      const k = (j * pixels + i) * 4;
      for (let c = 0; c < 3; c++) {
        let v = LOW[c]! + (HIGH[c]! - LOW[c]!) * t;
        v *= 1 + shade * 0.55;
        if (edge) v *= 0.8;
        if (water) v = [150, 170, 172][c]!;
        image.data[k + c] = Math.max(0, Math.min(255, v));
      }
      image.data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** In-place separable box blur of a square height grid. */
function smooth(grid: Float32Array, n: number, radius: number): void {
  const tmp = new Float32Array(grid.length);
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    for (let a = 0; a < n; a++) {
      let sum = 0;
      let count = 0;
      const at = (b: number) => (horizontal ? src[a * n + b]! : src[b * n + a]!);
      for (let b = 0; b <= Math.min(n - 1, radius); b++) {
        sum += at(b);
        count++;
      }
      for (let b = 0; b < n; b++) {
        if (horizontal) dst[a * n + b] = sum / count;
        else dst[b * n + a] = sum / count;
        const add = b + radius + 1;
        const drop = b - radius;
        if (add < n) {
          sum += at(add);
          count++;
        }
        if (drop >= 0) {
          sum -= at(drop);
          count--;
        }
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

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function routeLabel(route: CinematicMapRoute, size: number, delay: number, draw: number): string {
  if (!route.label || route.points.length < 2) return '';
  const start = route.points[0]!;
  const fs = size * 0.026;
  return `<text class="cine-map-route-label" x="${start.x}" y="${start.z - fs * 0.9}" text-anchor="middle"
    font-size="${fs.toFixed(2)}" fill="${CINEMA_SIDE_COLORS[route.side]}"
    style="animation-delay:${(delay + draw * 0.3).toFixed(2)}s">${escapeXml(route.label)}</text>`;
}

/**
 * SVG overlay for the animated map, in world units (its viewBox is the cropped view, so marks keep their
 * world coordinates). Arrows draw themselves with
 * a stroke-dash animation; marks fade in after their delay. Timing lives in inline CSS so the player only
 * has to insert the markup.
 */
export function campaignMapSvg(map: CinematicMap, view: CinematicMapView): string {
  const size = view.size;
  const stroke = size * 0.011;
  const markers = (['player', 'enemy'] as const)
    .map(
      (side) => `<marker id="cine-head-${side}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="3.2"
        markerHeight="3.2" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${CINEMA_SIDE_COLORS[side]}"/></marker>`,
    )
    .join('');
  const routes = map.routes
    .map((route) => {
      const delay = route.delay ?? 0;
      const draw = route.draw ?? DEFAULT_DRAW;
      const d = pathData(route.points);
      const color = CINEMA_SIDE_COLORS[route.side];
      const dash = route.dashed ? `stroke-dasharray="${(stroke * 2.2).toFixed(2)} ${(stroke * 1.6).toFixed(2)}"` : '';
      // A dashed route reveals itself through a mask, because its own dash pattern cannot be animated.
      const id = `cine-route-${Math.round(delay * 100)}-${route.points.length}-${Math.round(route.points[0]!.x)}`;
      const reveal = `<path d="${d}" pathLength="1" class="cine-map-draw" stroke="#fff" stroke-width="${(stroke * 3).toFixed(2)}"
        fill="none" stroke-linecap="round" style="animation-delay:${delay}s;animation-duration:${draw}s"/>`;
      return `<mask id="${id}" maskUnits="userSpaceOnUse">${reveal}</mask>
        <path d="${d}" fill="none" stroke="rgba(30,20,10,.35)" stroke-width="${(stroke * 2.1).toFixed(2)}"
          stroke-linecap="round" mask="url(#${id})"/>
        <path d="${d}" fill="none" stroke="${color}" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round"
          ${dash} mask="url(#${id})"/>
        <path d="${d}" fill="none" stroke="transparent" stroke-width="${stroke.toFixed(2)}" class="cine-map-head"
          marker-end="url(#cine-head-${route.side})" style="animation-delay:${(delay + draw * 0.92).toFixed(2)}s"/>
        ${routeLabel(route, size, delay, draw)}`;
    })
    .join('');
  const marks = map.marks
    .map((mark) => {
      const delay = mark.delay ?? 0;
      const fs = size * (mark.side === 'place' ? 0.03 : 0.026);
      const color = CINEMA_SIDE_COLORS[mark.side];
      const glyph =
        mark.side === 'place'
          ? `<circle cx="${mark.x}" cy="${mark.z}" r="${(size * 0.008).toFixed(2)}" fill="${color}"/>`
          : `<rect x="${mark.x - size * 0.022}" y="${mark.z - size * 0.014}" width="${size * 0.044}" height="${size * 0.028}"
              fill="${color}" stroke="#f3e6c8" stroke-width="${(size * 0.003).toFixed(2)}"/>
             <path d="M${mark.x - size * 0.022},${mark.z - size * 0.014} L${mark.x + size * 0.022},${mark.z + size * 0.014}
               M${mark.x + size * 0.022},${mark.z - size * 0.014} L${mark.x - size * 0.022},${mark.z + size * 0.014}"
               stroke="#f3e6c8" stroke-width="${(size * 0.0025).toFixed(2)}"/>`;
      const labelY = mark.side === 'place' ? mark.z - fs * 0.7 : mark.z + size * 0.014 + fs * 1.05;
      return `<g class="cine-map-mark cine-map-${mark.side}" style="animation-delay:${delay}s">${glyph}
        <text x="${mark.x}" y="${labelY}" text-anchor="middle" font-size="${fs.toFixed(2)}" fill="${color}">${escapeXml(mark.label)}</text></g>`;
    })
    .join('');
  return `<svg class="cine-map-svg" viewBox="${view.x} ${view.z} ${size} ${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>${markers}</defs>${routes}${marks}</svg>`;
}
