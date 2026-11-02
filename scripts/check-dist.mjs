import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const TOTAL_LIMIT = 25 * 1024 * 1024;
const ENTRY_GZIP_LIMIT = 600 * 1024;

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
const entryPath = path.join(DIST, entry);
const entryGzip = zlib.gzipSync(fs.readFileSync(entryPath), { level: 9 }).length;

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2);
const kb = (bytes) => (bytes / 1024).toFixed(0);
let failed = false;

console.log(`dist total: ${mb(total)} MB (limit ${mb(TOTAL_LIMIT)} MB)`);
if (total > TOTAL_LIMIT) {
  console.error(`  over budget by ${mb(total - TOTAL_LIMIT)} MB`);
  failed = true;
}

console.log(`entry ${entry}: ${kb(entryGzip)} KB gzip (limit ${kb(ENTRY_GZIP_LIMIT)} KB)`);
if (entryGzip > ENTRY_GZIP_LIMIT) {
  console.error(`  over budget by ${kb(entryGzip - ENTRY_GZIP_LIMIT)} KB`);
  failed = true;
}

process.exit(failed ? 1 : 0);
