#!/usr/bin/env node
/**
 * Fail on runtime import cycles in src/. Type-only imports (`import type`) are skipped: they vanish at
 * compile time and cannot create a load-order bug. src/ has none today, so any cycle is a regression.
 *
 * Usage: yarn cycles
 */
import madge from 'madge';

const result = await madge('src', {
  fileExtensions: ['ts'],
  tsConfig: 'tsconfig.json',
  detectiveOptions: { ts: { skipTypeImports: true }, es6: { skipTypeImports: true } },
});
const cycles = result.circular();
if (cycles.length > 0) {
  console.error(`[cycles] ${cycles.length} runtime import cycle(s) in src/:`);
  for (const cycle of cycles) console.error(`  ${cycle.join(' -> ')}`);
  console.error('Break the cycle (move the shared piece, or import it as `import type` when only types cross).');
  process.exit(1);
}
console.log(`[cycles] no runtime import cycles across ${Object.keys(result.obj()).length} files`);
