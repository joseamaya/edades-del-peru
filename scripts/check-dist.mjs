import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const TOTAL_LIMIT = 25 * 1024 * 1024;
const ENTRY_GZIP_LIMIT = 600 * 1024;
const REQUIRED_ROOT_FILES = ['LICENSE', 'ATTRIBUTION.md'];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

if (!fs.existsSync(DIST)) {
  console.error('dist/ does not exist; run `yarn build` first');
  process.exit(1);
}

const files = walk(DIST);
const total = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const entry = /<script[^>]+src="\.?\/?([^"]+\.js)"/.exec(html)?.[1];
if (!entry) {
  console.error('dist/index.html has no module entry script');
  process.exit(1);
}
const assetsAt = entry.lastIndexOf('/assets/');
const relativeEntry = assetsAt >= 0 ? entry.slice(assetsAt + 1) : entry.replace(/^\/+/, '');
const entryPath = path.join(DIST, relativeEntry);
if (!fs.existsSync(entryPath)) {
  console.error(`entry script not found in dist: ${entry}`);
  process.exit(1);
}
const entryGzip = zlib.gzipSync(fs.readFileSync(entryPath), { level: 9 }).length;
// The landing page defers the game bundle: index-*.js is a small loader that imports boot-*.js and
// three-*.js. Enforce the 600 KB loader budget, and report the real first-play payload separately so
// the release record shows what the player actually downloads.
const entrySource = fs.readFileSync(entryPath, 'utf8');
const firstPlayFiles = new Set([entryPath]);
for (const match of entrySource.matchAll(/["'`](\.\/[^"'`]+\.js)["'`]/g)) {
  const dep = path.join(path.dirname(entryPath), match[1]);
  if (fs.existsSync(dep)) firstPlayFiles.add(dep);
  else console.warn(`  referenced chunk missing from dist: ${match[1]}`);
}
const firstPlayGzip = [...firstPlayFiles].reduce(
  (sum, file) => sum + zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length,
  0,
);

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const kb = (bytes) => (bytes / 1024).toFixed(0);
let failed = false;

console.log(`dist total: ${mb(total)} MB (limit ${mb(TOTAL_LIMIT)} MB)`);
if (total > TOTAL_LIMIT) {
  console.error(`  over budget by ${mb(total - TOTAL_LIMIT)} MB`);
  failed = true;
}

console.log(`loader ${entry}: ${kb(entryGzip)} KB gzip (limit ${kb(ENTRY_GZIP_LIMIT)} KB)`);
if (entryGzip > ENTRY_GZIP_LIMIT) {
  console.error(`  over budget by ${kb(entryGzip - ENTRY_GZIP_LIMIT)} KB`);
  failed = true;
}
console.log(
  `first play payload (loader + ${firstPlayFiles.size - 1} chunks): ${mb(firstPlayGzip)} MB gzip (informational)`,
);

for (const required of REQUIRED_ROOT_FILES) {
  if (!fs.existsSync(path.join(DIST, required))) {
    console.error(`missing ${required} in dist/ (the build must ship licence and attribution)`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
