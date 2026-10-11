import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

/** Lanza Chromium con SwiftShader (funciona sin GPU). Respeta CHROME_PATH. */
export async function launchChromium() {
  const executablePath = process.env.CHROME_PATH || chromium.executablePath();
  return chromium.launch({
    executablePath,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
}

/** Arranca un servidor Vite en un puerto libre y devuelve base + cierre. */
export async function withViteServer() {
  const server = await createServer({ server: { port: 0 } });
  await server.listen();
  const base = `http://localhost:${server.config.server.port}`;
  return { base, close: () => server.close() };
}

/** Directorio de salida de capturas (review/), creado si no existe. */
export function reviewDir() {
  const dir = path.resolve('review');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Lee un PNG y devuelve sus datos crudos. */
export function readPng(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { width: png.width, height: png.height, data: png.data };
}

/** Clasifica un color RGB en un carácter para las vistas ASCII. */
export function classify(r, g, b) {
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const s = mx === 0 ? 0 : (mx - mn) / mx;
  if (l > 0.85 && s < 0.25) return '.';
  if (b > r && b > g && b - r > 18 && s < 0.3 && l < 0.75) return '~';
  if (g >= r * 0.9 && g > b && g > 55) return g > r && r - b < 45 ? 'G' : 'g';
  if (r > g * 1.18 && r - b > 25) return 'S';
  if (s < 0.18 && l > 0.3 && l < 0.85) return 'R';
  if (l < 0.32) return 'D';
  if (r > g && g > b) return 'B';
  return '?';
}
