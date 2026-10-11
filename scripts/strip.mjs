import { readPng } from './lib.mjs';

const file = process.argv[2];
const rowFrac = parseFloat(process.argv[3] ?? '0.7');
const { width, height, data } = readPng(file);
const y = Math.floor(height * rowFrac);
const step = Math.max(1, Math.floor(width / 64));
let out = '';
for (let x = 0; x < width; x += step) {
  const i = (y * width + x) * 4;
  out += `(${data[i]},${data[i + 1]},${data[i + 2]}) `;
}
console.log(out);
