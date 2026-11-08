import { describe, expect, it } from 'vitest';
import { Fow } from '../src/game/Fow';

describe('Fow grid', () => {
  it('reveals, decays and reports visibility/exploration', () => {
    const fow = new Fow(100, 10);
    fow.reveal(50, 50, 12);
    expect(fow.isVisible(50, 50)).toBe(true);
    fow.decay();
    expect(fow.isVisible(50, 50)).toBe(false);
    expect(fow.isExplored(50, 50)).toBe(true);
    expect(fow.isExplored(0, 0)).toBe(false);
  });

  it('explores without granting live vision', () => {
    const fow = new Fow(100, 10);
    fow.explore(50, 50, 12);
    expect(fow.isExplored(50, 50)).toBe(true);
    expect(fow.isVisible(50, 50)).toBe(false);

    fow.reveal(50, 50, 12);
    fow.explore(50, 50, 12);
    expect(fow.isVisible(50, 50)).toBe(true);
  });

  it('flushes RGBA once per change', () => {
    const fow = new Fow(100, 10);
    expect(fow.flush()).toBe(true);
    expect(fow.flush()).toBe(false);
    fow.reveal(50, 50, 12);
    expect(fow.flush()).toBe(true);
    const centre = (5 * 10 + 5) * 4;
    expect([...fow.data.slice(centre, centre + 4)]).toEqual([255, 0, 0, 255]);
    fow.decay();
    fow.flush();
    expect([...fow.data.slice(centre, centre + 4)]).toEqual([150, 0, 0, 255]);
  });

  it('round-trips the explored grid through save data', () => {
    const fow = new Fow(100, 10);
    fow.reveal(20, 20, 8);
    fow.decay();
    const restored = new Fow(100, 10);
    restored.restore(fow.serialize());
    expect(restored.isExplored(20, 20)).toBe(true);
    expect(restored.isVisible(20, 20)).toBe(false);
  });
});
