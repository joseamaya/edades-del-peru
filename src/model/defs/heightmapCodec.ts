/**
 * Decode an authored heightfield: signed delta-varint samples, base64 encoded.
 * Heights are stored as integer millimetres (scale 0.001) so the decoded values
 * match the previous 16-bit encoding bit for bit.
 */
export function decodeHeightmap(b64: string, count: number, scale: number): Float32Array {
  const bin = atob(b64);
  const out = new Float32Array(count);
  let i = 0;
  let o = 0;
  let value = 0;
  while (o < count) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = bin.charCodeAt(i++);
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    const delta = (result >>> 1) ^ -(result & 1);
    value += delta;
    out[o++] = value * scale;
  }
  return out;
}
