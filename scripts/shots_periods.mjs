import path from 'path';
import { reviewDir } from './lib.mjs';
import { captureScenes } from './scenes.mjs';

const outDir = path.join(reviewDir(), 'periods');
const results = await captureScenes(outDir);
for (const r of results) console.log(r.name, !r.ok ? 'FAIL' : r.errors.length ? 'ERR:' + r.errors.slice(0, 2) : 'ok');
console.log('done');
