import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

/**
 * Three's DRACOLoader embeds its own decoder URLs, so Vite emits a second copy of the decoder even
 * though the game always calls `setDecoderPath(DRACO_DECODER_PATH)` and serves `public/draco/`.
 * Drop those unreferenced assets from the bundle; abort the prune if the public decoder or the
 * `setDecoderPath` call disappears, so a future loader cannot fail silently.
 */
function pruneBundledDraco(): Plugin {
  return {
    name: 'prune-bundled-draco',
    apply: 'build',
    generateBundle(_options, bundle) {
      const decoder = path.join(ROOT, 'public/draco/draco_decoder.wasm');
      const staticModel = fs.readFileSync(path.join(ROOT, 'src/rendering/StaticModel.ts'), 'utf8');
      if (!fs.existsSync(decoder) || !staticModel.includes('setDecoderPath(DRACO_DECODER_PATH)')) {
        this.warn('kept the bundled Draco decoder: public/draco or StaticModel.setDecoderPath is missing');
        return;
      }
      for (const name of Object.keys(bundle)) {
        if (/^assets\/draco_(decoder|wasm_wrapper)-/.test(name)) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  plugins: [pruneBundledDraco()],
  base: process.env.VITE_BASE ?? './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
