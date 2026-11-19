/**
 * Decode an authored ground palette: two 4-bit indices per byte (low nibble first), base64 encoded.
 *
 * A full 128 x 128 RGBA grid is 64 KB and the `dist` budget cannot hold one per mission, so the
 * per-mission grids store each cell as an index into a small palette (16 entries at most) and this
 * decoder expands them back to the RGBA weights `sampleAuthoredGround` expects.
 */
export type GroundPaletteEntry = readonly [number, number, number, number];

export function decodePalettizedGround(b64: string, palette: readonly GroundPaletteEntry[], size: number): Uint8Array {
  const bin = atob(b64);
  const cells = size * size;
  if (bin.length !== Math.ceil(cells / 2)) throw new Error('malformed ground payload');
  const out = new Uint8Array(cells * 4);
  for (let i = 0; i < cells; i++) {
    const byte = bin.charCodeAt(i >> 1);
    const index = i & 1 ? byte >> 4 : byte & 0x0f;
    const entry = palette[index];
    if (!entry) throw new Error(`ground palette index ${index} out of range`);
    const o = i * 4;
    out[o] = entry[0];
    out[o + 1] = entry[1];
    out[o + 2] = entry[2];
    out[o + 3] = entry[3];
  }
  return out;
}
