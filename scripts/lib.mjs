import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const SOFTWARE_GL_ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];

/** Flags that make headless Chromium actually use the host GPU. */
const GPU_ARGS = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy'];

/** Renderer strings that mean "no GPU": keep in sync with `isSoftwareRenderer` in `src/util/gpu.ts`. */
const SOFTWARE_RENDERERS = ['swiftshader', 'llvmpipe', 'softpipe', 'software rasterizer', 'microsoft basic render'];

/** True when a hardware-GPU run was requested (`--gpu` or `GPU=1`). */
export function useGpu() {
  return process.argv.includes('--gpu') || process.env.GPU === '1' || process.env.GPU === 'true';
}

export function isSoftwareRenderer(name) {
  const s = String(name ?? '').toLowerCase();
  return SOFTWARE_RENDERERS.some((needle) => s.includes(needle));
}

/** Optional backend override: `--gl=egl`, `--gl=angle-vulkan`, `--gl=angle-gl`, `--gl=auto`... */
function glArgs() {
  const value = process.env.GPU_GL || cliArg('gl', '');
  if (!value) {
    // ANGLE Vulkan is the backend that reaches the host GPU in headless Chromium (Linux/Windows);
    // letting Chrome choose falls back to SwiftShader. macOS uses Metal.
    return process.platform === 'darwin'
      ? ['--use-gl=angle', '--use-angle=metal']
      : ['--use-gl=angle', '--use-angle=vulkan'];
  }
  if (value === 'auto') return [];
  if (value === 'angle-vulkan') return ['--use-gl=angle', '--use-angle=vulkan'];
  if (value === 'angle-gl') return ['--use-gl=angle', '--use-angle=gl'];
  if (value === 'angle-d3d11') return ['--use-gl=angle', '--use-angle=d3d11'];
  if (value === 'angle-metal') return ['--use-gl=angle', '--use-angle=metal'];
  return [`--use-gl=${value}`];
}

/** Launch Chromium with SwiftShader unless `--gpu` / `GPU=1` asks for the real GPU.
 * Respects CHROME_PATH. `opts.args` appends extra flags (e.g. `--js-flags=--expose-gc`). */
export async function launchChromium(opts = {}) {
  const executablePath = process.env.CHROME_PATH || chromium.executablePath();
  const gl = useGpu() ? [...GPU_ARGS, ...glArgs()] : SOFTWARE_GL_ARGS;
  return chromium.launch({
    executablePath,
    args: [...gl, '--disable-gpu-sandbox', '--no-sandbox', ...(opts.args ?? [])],
  });
}

/** Unmasked WebGL renderer/vendor for the page, plus the software flag. */
export async function readGlRenderer(page) {
  return page.evaluate(() => {
    const g = window.game;
    const gl = g.renderer.getContext();
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const read = (unmasked, plain) => (debug ? gl.getParameter(debug[unmasked]) : gl.getParameter(gl[plain]));
    return {
      renderer: String(read('UNMASKED_RENDERER_WEBGL', 'RENDERER') ?? ''),
      vendor: String(read('UNMASKED_VENDOR_WEBGL', 'VENDOR') ?? ''),
    };
  });
}

/** Start a Vite server on a free port and return base + close.
 * Watching is disabled: the capture/bench scripts serve static files and a
 * file watcher only burns inotify handles (ENOSPC in constrained environments). */
export async function withViteServer(options = {}) {
  const server = await createServer({
    ...options,
    server: { port: 0, watch: { ignored: ['**'] }, ...(options.server ?? {}) },
  });
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
