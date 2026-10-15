/** Pure helpers for the visual regression (no browser / no I/O). */

function round1(v) {
  return Math.round(v * 10) / 10;
}

/**
 * Coarse colour signature of a PNG (`{ width, height, data }`, RGBA): the mean
 * colour of each cell of a `grid × grid` tiling plus the global mean. Robust to
 * small per-pixel differences (tree positions, wind), sensitive to a scene whose
 * overall identity changes.
 */
export function signature(png, grid = 4) {
  const { width, height, data } = png;
  const cells = Array.from({ length: grid * grid }, () => [0, 0, 0, 0]);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    const gy = Math.min(grid - 1, Math.floor((y / height) * grid));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const gx = Math.min(grid - 1, Math.floor((x / width) * grid));
      const c = cells[gy * grid + gx];
      c[0] += data[i];
      c[1] += data[i + 1];
      c[2] += data[i + 2];
      c[3]++;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
  }
  return {
    grid,
    cells: cells.map((c) => [round1(c[0] / c[3]), round1(c[1] / c[3]), round1(c[2] / c[3])]),
    mean: [round1(r / n), round1(g / n), round1(b / n)],
  };
}

/** Mean per-channel L1 distance (0..255) between two signatures. */
export function compareSignatures(a, b) {
  if (a.grid !== b.grid || a.cells.length !== b.cells.length) {
    return { score: Infinity, worst: Infinity };
  }
  let sum = 0;
  let count = 0;
  let worstCell = 0;
  for (let i = 0; i < a.cells.length; i++) {
    let cell = 0;
    for (let k = 0; k < 3; k++) {
      const d = Math.abs(a.cells[i][k] - b.cells[i][k]);
      sum += d;
      cell += d;
      count++;
    }
    worstCell = Math.max(worstCell, cell / 3);
  }
  let mean = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.abs(a.mean[k] - b.mean[k]);
    sum += d;
    mean += d;
    count++;
  }
  return { score: count ? sum / count : 0, worst: Math.max(worstCell, mean / 3) };
}
