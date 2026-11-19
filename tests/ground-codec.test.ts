import { describe, it, expect } from 'vitest';
import { decodePalettizedGround } from '../src/model/defs/groundCodec';

function pack(indices: number[]): string {
  const bytes: number[] = [];
  for (let i = 0; i < indices.length; i += 2) {
    bytes.push((indices[i]! & 0x0f) | (((indices[i + 1] ?? 0) & 0x0f) << 4));
  }
  return Buffer.from(bytes).toString('base64');
}

describe('palettized ground codec', () => {
  const palette = [
    [255, 0, 0, 0],
    [0, 255, 0, 0],
    [0, 0, 255, 0],
    [0, 0, 0, 255],
  ] as const;

  it('expands two indices per byte, low nibble first', () => {
    const b64 = pack([0, 1, 2, 3, 3, 2, 1, 0, 0]);
    const out = decodePalettizedGround(b64, palette, 3);
    expect(out).toHaveLength(3 * 3 * 4);
    expect(Array.from(out.slice(0, 8))).toEqual([255, 0, 0, 0, 0, 255, 0, 0]);
    expect(Array.from(out.slice(8, 16))).toEqual([0, 0, 255, 0, 0, 0, 0, 255]);
    expect(Array.from(out.slice(32, 36))).toEqual([255, 0, 0, 0]);
  });

  it('rejects an index the palette does not define', () => {
    expect(() => decodePalettizedGround(pack([7]), palette, 1)).toThrow(/palette index 7/);
  });

  it('rejects a truncated or oversized payload', () => {
    expect(() => decodePalettizedGround(pack([0, 1, 2]), palette, 4)).toThrow(/malformed ground payload/);
    expect(() => decodePalettizedGround(pack([0, 1, 2, 3, 0]), palette, 2)).toThrow(/malformed ground payload/);
  });
});
