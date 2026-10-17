import * as THREE from 'three';
import { fbm2, noise2 } from '../util/noise';
import { RNG } from '../util/rng';

/** 100% procedural texture generator via Canvas2D. */

const cache = new Map<string, THREE.CanvasTexture>();

function canvasTexture(canvas: HTMLCanvasElement, key: string, srgb = true): THREE.CanvasTexture {
  const prev = cache.get(key);
  if (prev) prev.dispose();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function addNoiseLayer(ctx: CanvasRenderingContext2D, size: number, rng: RNG, amount = 0.06): void {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.float() - 0.5) * 255 * amount * 2;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Grass texture with patches and variation. */
function genGrass(): THREE.CanvasTexture {
  if (cache.has('grass')) return cache.get('grass')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#5a8a3a';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.02, y * 0.02, 3);
      const blade = (noise2(x * 0.35, y * 0.35) > 0.52 ? 1 : 0) * (0.5 + 0.5 * noise2(x * 0.7, y * 0.7));
      const r = 82 + n * 26 - blade * 8;
      const g = 138 + n * 30 - blade * 20;
      const b = 58 + n * 18;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  addNoiseLayer(ctx, size, new RNG(11), 0.05);
  return canvasTexture(c, 'grass', true);
}

/** Soil texture. */
function genDirt(): THREE.CanvasTexture {
  if (cache.has('dirt')) return cache.get('dirt')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#7a6045';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.03 + 9, y * 0.03, 4);
      const r = 118 + n * 22 + (rng.float() - 0.5) * 14;
      const g = 96 + n * 18 + (rng.float() - 0.5) * 12;
      const b = 69 + n * 16 + (rng.float() - 0.5) * 10;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // pebbles
  for (let k = 0; k < 140; k++) {
    const px = rng.int(2, size - 3);
    const py = rng.int(2, size - 3);
    const rad = rng.float() * 2 + 0.5;
    const gr = 150 + rng.float() * 40;
    ctx.fillStyle = `rgba(${gr},${gr},${gr - 14},0.5)`;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTexture(c, 'dirt', true);
}

/** Sand texture. */
function genSand(): THREE.CanvasTexture {
  if (cache.has('sand')) return cache.get('sand')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#c8b07a';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(33);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.05 + 3, y * 0.05, 3);
      const r = 200 + n * 24 + (rng.float() - 0.5) * 12;
      const g = 176 + n * 22 + (rng.float() - 0.5) * 10;
      const b = 122 + n * 20 + (rng.float() - 0.5) * 8;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // dune ripples
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + 0.04 * Math.sin(y * 0.05)})`;
    ctx.fillRect(0, y, size, 1);
  }
  return canvasTexture(c, 'sand', true);
}

/** Rock/mountain texture. */
function genRock(): THREE.CanvasTexture {
  if (cache.has('rock')) return cache.get('rock')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8a8580';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(44);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.04 + 6, y * 0.04, 4);
      const crack = Math.abs(noise2(x * 0.18 + 2, y * 0.18) - 0.5) > 0.46 ? -24 : 0;
      const r = 128 + n * 30 + crack;
      const g = 122 + n * 28 + crack;
      const b = 118 + n * 26 + crack;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 60; k++) {
    const px = rng.int(1, size - 2);
    const py = rng.int(1, size - 2);
    ctx.strokeStyle = `rgba(${60 + rng.int(0, 30)},${60 + rng.int(0, 30)},${60},${0.5 + rng.float() * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + rng.int(-12, 12), py + rng.int(-12, 12));
    ctx.stroke();
  }
  return canvasTexture(c, 'rock', true);
}

/** Snow texture. */
function genSnow(): THREE.CanvasTexture {
  if (cache.has('snow')) return cache.get('snow')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#e8eaf0';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(55);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.06 + 8, y * 0.06, 3);
      const v = 235 + n * 12 + (rng.float() - 0.5) * 10;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, 'snow', true);
}

/** Wood (for houses, carts, logs). */
function genWood(): THREE.CanvasTexture {
  if (cache.has('wood')) return cache.get('wood')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(66);
  const grainY = rng.float() * 1000;
  for (let y = 0; y < size; y++) {
    const grain = 0.5 + 0.5 * Math.sin((y + grainY) * 0.06) * Math.sin((y + grainY) * 0.013 + 2);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.05, y * 0.09, 3);
      const knot = Math.exp(-((x - 128) ** 2 + (y - 128) ** 2) / 2600) * 0.25;
      const r = 112 + n * 20 + grain * 22 - knot * 30;
      const g = 84 + n * 14 + grain * 16 - knot * 22;
      const b = 52 + n * 10 + grain * 8 - knot * 14;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 30; k++) {
    ctx.strokeStyle = `rgba(40,26,12,${0.1 + rng.float() * 0.2})`;
    ctx.beginPath();
    const sx = rng.float() * size;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + (rng.float() - 0.5) * 10, size);
    ctx.stroke();
  }
  return canvasTexture(c, 'wood', true);
}

/** Ladrillo. */
function genBrick(): THREE.CanvasTexture {
  if (cache.has('brick')) return cache.get('brick')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8c3a2e';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(77);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const row = Math.floor(y / 16);
      const offset = row % 2 === 0 ? 0 : 12;
      const px = (x + offset) % 24;
      const brickV = px < 22 && y % 16 < 14 ? 1 : 0;
      const n = fbm2(x * 0.06, y * 0.06, 3);
      const r = 132 + n * 18 + (1 - brickV) * 14;
      const g = 54 + n * 10 + (1 - brickV) * 8;
      const b = 42 + n * 10 + (1 - brickV) * 8;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 90; k++) {
    ctx.fillStyle = `rgba(0,0,0,${0.08 + rng.float() * 0.1})`;
    ctx.fillRect(rng.int(0, size - 3), rng.int(0, size - 2), rng.int(2, 8), rng.int(1, 2));
  }
  return canvasTexture(c, 'brick', true);
}

/** Ashlar stone. */
function genStone(): THREE.CanvasTexture {
  if (cache.has('stone')) return cache.get('stone')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#9a968e';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const rng = new RNG(88);
  const blocks: { x: number; y: number; w: number; h: number; shade: number }[] = [];
  for (let y = 0; y < size; y += 28) {
    const rowOffset = (y / 28) % 2 === 0 ? 0 : 22;
    for (let x = -rowOffset; x < size; x += 44) {
      blocks.push({ x, y, w: 44, h: 28, shade: rng.float() });
    }
  }
  for (const b of blocks) {
    const shade = 0.85 + b.shade * 0.3;
    ctx.fillStyle = `rgba(${150 * shade},${146 * shade},${138 * shade},1)`;
    ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, 'stone', true);
}

/** Bundled straw thatch (Andean ichu roofs). */
function genThatch(): THREE.CanvasTexture {
  if (cache.has('thatch')) return cache.get('thatch')!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#b9973f';
  ctx.fillRect(0, 0, size, size);
  const rng = new RNG(141);
  for (let i = 0; i < 560; i++) {
    const x = rng.float() * size;
    const y = rng.float() * size;
    const len = 8 + rng.float() * 22;
    const ang = Math.PI / 2 + (rng.float() - 0.5) * 0.55;
    const shade = 0.7 + rng.float() * 0.42;
    ctx.strokeStyle = `rgba(${Math.round(192 * shade)},${Math.round(158 * shade)},${Math.round(74 * shade)},0.7)`;
    ctx.lineWidth = 1 + rng.float();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  return canvasTexture(c, 'thatch', true);
}

/** Metal (acerado industrial). */
function genMetal(base = '#8f98a3'): THREE.CanvasTexture {
  const key = 'metal-' + base;
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(99);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.08 + 4, y * 0.08, 3);
      const scratch = Math.abs(noise2(x * 0.5 + 1, y * 0.5)) > 0.58 ? -14 : 0;
      const v = 140 + n * 18 + scratch;
      d[i] = v * 0.95;
      d[i + 1] = v;
      d[i + 2] = v * 1.02;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // rivets
  for (let y = 12; y < size; y += 32) {
    for (let x = 12; x < size; x += 32) {
      const g = 60 + rng.int(0, 20);
      ctx.fillStyle = `rgba(${g + 40},${g + 44},${g + 50},0.9)`;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(x - 0.7, y - 0.7, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return canvasTexture(c, key, true);
}

/** Tile roof (clay or slate). */
function genRoof(base = '#a84838'): THREE.CanvasTexture {
  const key = 'roof-' + base;
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(101);
  const tileW = 32;
  const tileH = 16;
  for (let y = 0; y < size; y++) {
    const row = Math.floor(y / tileH);
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const offset = row % 2 === 0 ? 0 : tileW / 2;
      const px = (x + offset) % tileW;
      // shadow between tiles
      const edgeY = y % tileH;
      const edgeX = px;
      const seam = edgeY > tileH - 3 || edgeX > tileW - 2 ? 0.78 : 1;
      // each tile's curve
      const curve = 1 - Math.abs(edgeX / tileW - 0.5) * 0.35;
      const n = fbm2(x * 0.06, y * 0.06, 3);
      const v = (0.86 + n * 0.2) * seam * curve;
      d[i] = Math.min(255, 168 * v);
      d[i + 1] = Math.min(255, 72 * v);
      d[i + 2] = Math.min(255, 58 * v);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rng.float() * 0.08})`;
    ctx.fillRect(rng.int(0, size - 10), rng.int(0, size - 5), rng.int(4, 12), rng.int(2, 4));
  }
  return canvasTexture(c, key, true);
}

/** Paneled concrete. */
function genConcrete(): THREE.CanvasTexture {
  const key = 'concrete';
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#8a8e94';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(102);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.05 + 5, y * 0.05, 4);
      const v = 138 + n * 16;
      d[i] = v;
      d[i + 1] = v * 0.99;
      d[i + 2] = v * 0.97;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // panel joints (formwork grid)
  ctx.strokeStyle = 'rgba(40,42,46,0.5)';
  ctx.lineWidth = 2;
  for (let y = 32; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  for (let x = 32; x < size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let k = 0; k < 160; k++) {
    ctx.fillStyle = `rgba(${30 + rng.int(0, 40)},${30 + rng.int(0, 40)},${34},${0.12 + rng.float() * 0.2})`;
    ctx.fillRect(rng.int(0, size - 3), rng.int(0, size - 3), rng.int(2, 5), rng.int(2, 5));
  }
  return canvasTexture(c, key, true);
}

/** Cloth/uniform with subtle weave. */
function genCloth(base = '#5a6a52'): THREE.CanvasTexture {
  const key = 'cloth-' + base;
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(103);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const weave = 0.92 + 0.08 * Math.sin(x * 0.7) * Math.sin(y * 0.7);
      const n = (rng.float() - 0.5) * 6;
      const v = weave * (1 + n / 128);
      d[i] = Math.min(255, d[i] * v);
      d[i + 1] = Math.min(255, d[i + 1] * v);
      d[i + 2] = Math.min(255, d[i + 2] * v);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // faint folds
  for (let k = 0; k < 14; k++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.04 + rng.float() * 0.05})`;
    ctx.lineWidth = rng.float() * 2 + 0.5;
    ctx.beginPath();
    const sx = rng.float() * size;
    ctx.moveTo(sx, 0);
    ctx.quadraticCurveTo(sx + rng.float() * 30 - 15, size / 2, sx + rng.float() * 40 - 20, size);
    ctx.stroke();
  }
  return canvasTexture(c, key, true);
}

/** Cuero/gamuza (correaje, sillas). */
function genLeather(base = '#4a3626'): THREE.CanvasTexture {
  const key = 'leather-' + base;
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(104);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = fbm2(x * 0.09 + 3, y * 0.09, 3) * 0.1;
      const n = (rng.float() - 0.5) * 8;
      const v = 1 + grain + n / 128;
      d[i] = Math.min(255, d[i] * v);
      d[i + 1] = Math.min(255, d[i + 1] * v);
      d[i + 2] = Math.min(255, d[i + 2] * v);
    }
  }
  ctx.putImageData(img, 0, 0);
  // seams
  for (let k = 0; k < 6; k++) {
    const sy = rng.float() * size;
    ctx.strokeStyle = 'rgba(20,14,8,0.4)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(size, sy + rng.float() * 16 - 8);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  return canvasTexture(c, key, true);
}

/** Foliage with transparency for billboard canopies (billboard + alphaTest). */
function genFoliage(kind: 'broad' | 'needle' | 'frond' | 'bush'): THREE.CanvasTexture {
  const key = 'foliage-' + kind;
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  const rng = new RNG(137 + kind.length * 97);
  const cx = size / 2;
  const cy = size * (kind === 'frond' ? 0.72 : 0.48);
  const palettes: Record<string, string[]> = {
    broad: ['#26491c', '#336324', '#3f7a2c', '#4e9436', '#63ab45', '#7cc356'],
    needle: ['#162e1d', '#1f3f28', '#2a5733', '#376b3d', '#458048'],
    frond: ['#2f5a22', '#3f7a2c', '#529434', '#6bb24a', '#8fce68'],
    bush: ['#26491c', '#336324', '#3f7a2c', '#4e9436', '#63ab45'],
  };
  const pal = palettes[kind];

  const paintCluster = (x: number, y: number, radius: number, dark: number): void => {
    const col = pal[Math.min(pal.length - 1, Math.floor(dark * pal.length))];
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * (kind === 'needle' ? 0.5 : 0.85), rng.float() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  };

  if (kind === 'needle') {
    for (let i = 0; i < 900; i++) {
      const a = rng.float() * Math.PI * 2;
      const rr = Math.pow(rng.float(), 0.6) * size * 0.42;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.85;
      const len = 5 + rng.float() * 9;
      ctx.strokeStyle = pal[Math.floor(rng.float() * pal.length)];
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng.float() - 0.5) * 7, y + len);
      ctx.stroke();
    }
  } else if (kind === 'frond') {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4 + (rng.float() - 0.5) * 0.2;
      const len = size * (0.34 + rng.float() * 0.16);
      const half = 9 + rng.float() * 6;
      const base = pal[Math.floor(rng.float() * pal.length)];
      ctx.strokeStyle = base;
      ctx.globalAlpha = 0.95;
      for (let t = 0; t < 1; t += 0.06) {
        const px = cx + Math.cos(a) * len * t;
        const py = cy + Math.sin(a) * len * t;
        const w = half * (1 - t * 0.7);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(px - w, py + w * 0.5);
        ctx.lineTo(px + w, py - w * 0.5);
        ctx.stroke();
      }
    }
  } else {
    const count = kind === 'bush' ? 420 : 360;
    for (let i = 0; i < count; i++) {
      const a = rng.float() * Math.PI * 2;
      const rr = Math.pow(rng.float(), 0.55) * size * (kind === 'bush' ? 0.34 : 0.46);
      const edge = rr / (size * 0.46);
      if (rng.float() < edge * 0.35) continue; // irregular silhouette
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr * 0.9;
      const rad = 6 + rng.float() * 11;
      const dark = Math.min(1, rng.float() * 0.7 + edge * 0.35);
      paintCluster(x, y, rad, dark);
    }
  }
  ctx.globalAlpha = 1;
  return canvasTexture(c, key, true);
}

/** Tree bark (vertical, grayish). */
function genBark(): THREE.CanvasTexture {
  if (cache.has('bark')) return cache.get('bark')!;
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = '#6a5236';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(303);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.12, y * 0.32, 3);
      const stripe = Math.sin(x * 0.5 + n * 6) * 0.5 + 0.5;
      const v = 0.72 + n * 0.35 - stripe * 0.12;
      d[i] = 118 * v;
      d[i + 1] = 92 * v;
      d[i + 2] = 62 * v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 26; k++) {
    ctx.strokeStyle = `rgba(30,20,10,${0.12 + rng.float() * 0.22})`;
    ctx.lineWidth = 0.7 + rng.float();
    ctx.beginPath();
    const sx = rng.float() * size;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + (rng.float() - 0.5) * 6, size);
    ctx.stroke();
  }
  return canvasTexture(c, 'bark', true);
}

/** Animal fur. */
function genHide(base = '#8a6a4a'): THREE.CanvasTexture {
  const key = 'hide-' + base;
  if (cache.has(key)) return cache.get(key)!;
  const size = 128;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(404);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = fbm2(x * 0.4, y * 0.9, 4);
      const v = 0.78 + n * 0.45;
      d[i] *= v;
      d[i + 1] *= v;
      d[i + 2] *= v;
    }
  }
  ctx.putImageData(img, 0, 0);
  for (let k = 0; k < 220; k++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + rng.float() * 0.1})`;
    ctx.lineWidth = 0.6;
    const sx = rng.float() * size;
    const sy = rng.float() * size;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy + 3 + rng.float() * 4);
    ctx.stroke();
  }
  return canvasTexture(c, key, true);
}

/** Neutral base texture with color. */
function genFlat(color: string): THREE.CanvasTexture {
  const key = 'flat-' + color;
  if (cache.has(key)) return cache.get(key)!;
  const size = 64;
  const [c, ctx] = makeCanvas(size);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const rng = new RNG(42);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.float() - 0.5) * 10;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, key, true);
}

/** Procedural normal map from noise (for detailed materials). */
function genNormal(seed = 7, scale = 1): THREE.CanvasTexture {
  const key = 'normal-' + seed;
  if (cache.has(key)) return cache.get(key)!;
  const size = 256;
  const [c, ctx] = makeCanvas(size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      h[y * size + x] = fbm2(x * 0.05 * scale + seed, y * 0.05 * scale + seed, 4);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = h[y * size + ((x + size - 1) % size)];
      const x1 = h[y * size + ((x + 1) % size)];
      const y0 = h[((y + size - 1) % size) * size + x];
      const y1 = h[((y + 1) % size) * size + x];
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      d[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / len) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, key, false);
}

export interface GroundTextures {
  grass: THREE.CanvasTexture;
  dirt: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  rock: THREE.CanvasTexture;
  snow: THREE.CanvasTexture;
}

export function getGroundTextures(): GroundTextures {
  return {
    grass: genGrass(),
    dirt: genDirt(),
    sand: genSand(),
    rock: genRock(),
    snow: genSnow(),
  };
}

export const MaterialTex = {
  wood: () => genWood(),
  brick: () => genBrick(),
  stone: () => genStone(),
  metal: () => genMetal(),
  metalDark: () => genMetal('#5a626c'),
  metalWarm: () => genMetal('#8a7a5a'),
  concrete: () => genConcrete(),
  roof: () => genRoof(),
  cloth: (base?: string) => genCloth(base),
  textile: (base?: string) => genCloth(base),
  leather: () => genLeather(),
  dirt: () => genDirt(),
  adobe: () => genBrick(),
  cutstone: () => genStone(),
  megalith: () => genStone(),
  fieldstone: () => genStone(),
  thatch: () => genThatch(),
  flatstone: () => genStone(),
  flatmetal: () => genMetal('#7d848c'),
  textile_inca: (base?: string) => genCloth(base),
  textile_wari: (base?: string) => genCloth(base),
  textile_tiahuanaco: (base?: string) => genCloth(base),
  textile_moche: (base?: string) => genCloth(base),
  textile_chavin: (base?: string) => genCloth(base),
  textile_paracas: (base?: string) => genCloth(base),
  textile_nazca: (base?: string) => genCloth(base),
  textile_chimu: (base?: string) => genCloth(base),
  foliage: (kind: 'broad' | 'needle' | 'frond' | 'bush') => genFoliage(kind),
  bark: () => genBark(),
  hide: (base?: string) => genHide(base),
  flat: (color: string) => genFlat(color),
  normal: (seed: number) => genNormal(seed),
};

export function clearTextureCache(): void {
  cache.forEach((t) => t.dispose());
  cache.clear();
}
