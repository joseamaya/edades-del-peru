import { PNG } from 'pngjs';
import fs from 'fs';

/**
 * Analiza una captura para la revisión visual por subagentes.
 * Extrae métricas: luminancia, saturación, contraste, distribución de color,
 * presencia de agua/cielo, densidad de bordes y detalle.
 */
const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const { width, height, data } = png;

const bins = { r: 0, g: 0, b: 0 };
let satSum = 0;
let contrast;
let edgeDensity = 0;
let waterPixels = 0;
let skyPixels = 0;
let terrainPixels = 0;
let darkPixels = 0;
let brightPixels = 0;
let warmPixels = 0;
let greenPixels = 0;
let count = 0;

const lum = new Float32Array(width * height);
const sat = new Float32Array(width * height);

function toLum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

let totalLum = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = toLum(r, g, b) / 255;
    lum[y * width + x] = l;
    totalLum += l;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const s = mx === 0 ? 0 : (mx - mn) / mx;
    sat[y * width + x] = s;
    satSum += s;
    bins.r += r; bins.g += g; bins.b += b;
    count++;
    // regiones
    if (y < height * 0.16) skyPixels++;
    else if (y > height * 0.22) {
      if (s < 0.25 && l > 0.3 && l < 0.85 && b > r && b > g && (b - r) > 20) waterPixels++;
      terrainPixels++;
    }
    if (l < 0.22) darkPixels++;
    if (l > 0.8) brightPixels++;
    if (r > g && r > b && r > 120) warmPixels++;
    if (g > r && g > b) greenPixels++;
  }
}

// contraste global
const mean = totalLum / count;
let varSum = 0;
for (let i = 0; i < lum.length; i++) {
  const d = lum[i] - mean;
  varSum += d * d;
}
contrast = Math.sqrt(varSum / count);

// densidad de bordes (gradiente de luminancia)
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const dx = Math.abs(lum[i + 1] - lum[i - 1]);
    const dy = Math.abs(lum[i + width] - lum[i - width]);
    const grad = Math.max(dx, dy);
    if (grad > 0.18) edgeDensity++;
  }
}
edgeDensity /= width * height;

const avg = (v) => v / count;
const balance = avg(bins.r) - avg(bins.g);
const blueShift = avg(bins.b) - avg(bins.g);

console.log(JSON.stringify({
  file,
  dims: `${width}x${height}`,
  metrics: {
    luminanciaMedia: +(avg(bins.r) * 0.2126 + avg(bins.g) * 0.7152 + avg(bins.b) * 0.0722).toFixed(3),
    brillo: +avg((bins.r + bins.g + bins.b) / 3).toFixed(1),
    saturacionMedia: +(satSum / count).toFixed(3),
    contraste: +contrast.toFixed(3),
    densidadBordes: +(edgeDensity * 100).toFixed(2) + '%',
    pctAgua: +((waterPixels / terrainPixels) * 100).toFixed(1) + '%',
    pctCielo: +((skyPixels / count) * 100).toFixed(1) + '%',
    pctOscuro: +((darkPixels / count) * 100).toFixed(1) + '%',
    pctBrillante: +((brightPixels / count) * 100).toFixed(1) + '%',
    pctCalido: +((warmPixels / count) * 100).toFixed(1) + '%',
    pctVerde: +((greenPixels / count) * 100).toFixed(1) + '%',
    balanceRojoVerde: +balance.toFixed(2),
    desviacionAzul: +blueShift.toFixed(2),
    canales: { r: +avg(bins.r).toFixed(1), g: +avg(bins.g).toFixed(1), b: +avg(bins.b).toFixed(1) },
  },
}, null, 2));
