import { PNG } from 'pngjs';
import fs from 'fs';
const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const { width, height, data } = png;
// sample an 8x8 grid of pixels averaged per block (only the lower half where the building is)
let out = '';
for (let by = 0; by < 8; by++) {
  let row = '';
  for (let bx = 0; bx < 8; bx++) {
    const x0 = Math.floor((bx / 8) * width),
      x1 = Math.floor(((bx + 1) / 8) * width);
    const y0 = Math.floor(((by / 8) * 0.6 + 0.4) * height),
      y1 = Math.floor((((by + 1) / 8) * 0.6 + 0.4) * height);
    let r = 0,
      g = 0,
      b = 0,
      c = 0;
    for (let py = y0; py < y1; py += 2)
      for (let px = x0; px < x1; px += 2) {
        const i = (py * width + px) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        c++;
      }
    const rr = Math.round(r / c),
      gg = Math.round(g / c),
      bb = Math.round(b / c);
    row += `(${rr},${gg},${bb}) `;
  }
  out += row + '\n';
}
console.log(out);
