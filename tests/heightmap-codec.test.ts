import { describe, it, expect } from 'vitest';
import { decodeHeightmap } from '../src/model/defs/heightmapCodec';

/** Local encoder for the round-trip test; the runtime only needs the decoder. */
function encode(values: number[]): string {
  const out: number[] = [];
  let prev = 0;
  for (const value of values) {
    let zigzag = (value - prev) << 1;
    if (value - prev < 0) zigzag = ~zigzag;
    prev = value;
    while (zigzag >= 0x80) {
      out.push((zigzag & 0x7f) | 0x80);
      zigzag >>= 7;
    }
    out.push(zigzag);
  }
  return btoa(String.fromCharCode(...out));
}

describe('heightmap codec', () => {
  it('round-trips signed deltas', () => {
    const values = [0, 1000, 1000, 1001, 999, 2400, 2400, -100, 0, 32760];
    const decoded = decodeHeightmap(encode(values), values.length, 0.001);
    expect(Array.from(decoded, (v) => Math.round(v * 1000))).toEqual(values);
  });

  it('decodes the zero stream', () => {
    expect(Array.from(decodeHeightmap('AAAA', 3, 0.001))).toEqual([0, 0, 0]);
  });
});
