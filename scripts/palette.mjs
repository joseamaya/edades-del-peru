import { PNG } from 'pngjs';
import fs from 'fs';
const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const { width, height, data } = png;
const buckets = {};
// base zone: bottom 45%
for (let y = Math.floor(height * 0.45); y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const key = `${Math.floor(r / 32) * 32}-${Math.floor(g / 32) * 32}-${Math.floor(b / 32) * 32}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }
}
const entries = Object.entries(buckets)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6);
const tot = height * width * 0.55;
const out = entries.map(([k, v]) => ({ rgb: k.replace(/-/g, ','), pct: +((v / tot) * 100).toFixed(1) }));
console.log(file, JSON.stringify(out));
