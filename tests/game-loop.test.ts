import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameLoop } from '../src/core/GameLoop';

const originalRaf = globalThis.requestAnimationFrame;
const originalCancel = globalThis.cancelAnimationFrame;

function harness() {
  const queue: FrameRequestCallback[] = [];
  let now = 0;
  let paused = false;
  (globalThis as unknown as { requestAnimationFrame: (cb: FrameRequestCallback) => number }).requestAnimationFrame = (
    cb,
  ) => {
    queue.push(cb);
    return queue.length;
  };
  (globalThis as unknown as { cancelAnimationFrame: (id: number) => void }).cancelAnimationFrame = () => {};
  vi.spyOn(performance, 'now').mockImplementation(() => now);

  const loop = new GameLoop();
  const times: number[] = [];
  loop.onUpdate = (_dt, time) => {
    times.push(time);
    return !paused;
  };
  loop.start();
  const advance = (ms: number): void => {
    now += ms;
    const frame = queue.shift();
    frame?.(now);
  };
  return {
    loop,
    times,
    advance,
    setPaused(value: boolean): void {
      paused = value;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancel;
});

describe('GameLoop simulation clock', () => {
  it('passes stepCount * step regardless of wall-clock cadence', () => {
    const { loop, times, advance } = harness();
    advance(100);
    advance(200);
    expect(times.slice(0, 6).map((t) => t.toFixed(6))).toEqual([0, 1, 2, 3, 4, 5].map((k) => (k / 60).toFixed(6)));
    expect(times.slice(6, 12).map((t) => t.toFixed(6))).toEqual([6, 7, 8, 9, 10, 11].map((k) => (k / 60).toFixed(6)));
    loop.stop();
  });

  it('does not advance the clock for steps that did not simulate', () => {
    const { loop, times, advance, setPaused } = harness();
    setPaused(true);
    advance(100);
    expect(new Set(times)).toEqual(new Set([0]));
    setPaused(false);
    advance(100);
    expect(times.slice(-6).map((t) => t.toFixed(6))).toEqual([0, 1, 2, 3, 4, 5].map((k) => (k / 60).toFixed(6)));
    loop.stop();
  });
});
