import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

/** Launch Chromium with SwiftShader (works without GPU). Respects CHROME_PATH.
 * `opts.args` appends extra flags (e.g. `--js-flags=--expose-gc` for heap audits). */
export async function launchChromium(opts = {}) {
  const executablePath = process.env.CHROME_PATH || chromium.executablePath();
  return chromium.launch({
    executablePath,
    args: [
      '--use-gl=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      ...(opts.args ?? []),
    ],
  });
}

/** Start a Vite server on a free port and return base + close.
 * Watching is disabled: the capture/bench scripts serve static files and a
 * file watcher only burns inotify handles (ENOSPC in constrained environments). */
export async function withViteServer() {
  const server = await createServer({ server: { port: 0, watch: { ignored: ['**'] } } });
  await server.listen();
  const base = `http://localhost:${server.config.server.port}`;
  return { base, close: () => server.close() };
}

/** Screenshot output directory (review/), created if missing. */
export function reviewDir() {
  const dir = path.resolve('review');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Read a `--name=value` CLI argument, returning `fallback` when absent. */
export function cliArg(name, fallback) {
  const prefix = `--${name}=`;
  const a = process.argv.find((v) => v.startsWith(prefix));
  return a ? a.slice(prefix.length) : fallback;
}

/** Read a PNG and return its raw data. */
export function readPng(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  return { width: png.width, height: png.height, data: png.data };
}

/** Classify an RGB color into a character for ASCII views. */
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
