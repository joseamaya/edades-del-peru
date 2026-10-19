import { describe, it, expect } from 'vitest';
import { isSoftwareRenderer } from '../src/util/gpu';

describe('software renderer detection', () => {
  it('recognizes software rasterizers', () => {
    expect(isSoftwareRenderer('Google SwiftShader')).toBe(true);
    expect(isSoftwareRenderer('Mesa/X.org llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Software Rasterizer')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
  });

  it('does not flag real GPUs', () => {
    expect(isSoftwareRenderer('ANGLE (NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)')).toBe(false);
    expect(isSoftwareRenderer('ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)')).toBe(false);
    expect(isSoftwareRenderer('Apple M1')).toBe(false);
    expect(isSoftwareRenderer('AMD Radeon RX 6800')).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
});
