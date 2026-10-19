import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { cliArg, reviewDir } from './lib.mjs';

/**
 * Package `dist/` for itch.io: a zip whose root contains `index.html`
 * (Vite uses `base: './'`, so relative asset paths work on the itch CDN).
 * Run `yarn build` first; usage: `yarn package:itch [--out=name.zip]`.
 */
const dist = path.resolve('dist');
const target = path.join(reviewDir(), cliArg('out', 'edades-del-peru-itch.zip'));

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('[itch] no dist/index.html — run `yarn build` first');
  process.exit(1);
}
fs.rmSync(target, { force: true });
try {
  execFileSync('zip', ['-r', '-q', target, '.'], { cwd: dist, stdio: 'inherit' });
} catch (e) {
  if (e && e.code === 'ENOENT') {
    console.error('[itch] the `zip` command was not found; install zip or zip dist/ manually');
    process.exit(1);
  }
  throw e;
}
const mb = (fs.statSync(target).size / (1024 * 1024)).toFixed(1);
console.log(`[itch] ${target} (${mb} MB)`);
console.log('[itch] upload: butler push review/edades-del-peru-itch.zip <user>/<game>:html5');
