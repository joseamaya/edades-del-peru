import { readPng, classify } from './lib.mjs';

const file = process.argv[2];
const cols = parseInt(process.argv[3] ?? '48');
const rows = parseInt(process.argv[4] ?? '20');
const { width, height, data } = readPng(file);

let out = '';
for (let y = 0; y < rows; y++) {
  let row = '';
  for (let x = 0; x < cols; x++) {
    // promedio del bloque
    const x0 = Math.floor((x / cols) * width);
    const x1 = Math.floor(((x + 1) / cols) * width);
    const y0 = Math.floor((y / rows) * height);
    const y1 = Math.floor(((y + 1) / rows) * height);
    let r = 0;
    let g = 0;
    let b = 0;
    let c = 0;
    for (let py = y0; py < y1; py += 2)
      for (let px = x0; px < x1; px += 2) {
        const i = (py * width + px) * 4;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        c++;
      }
    row += classify(r / c, g / c, b / c);
  }
  out += row + '\n';
}
console.log(out);
