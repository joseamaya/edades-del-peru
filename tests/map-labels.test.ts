import { describe, expect, it } from 'vitest';
import { getMission } from '../src/campaign/defs/campaign';
import { labelFade } from '../src/rendering/MapLabels';

const m1 = getMission('m1_caral')!;
const labels = m1.layout?.labels ?? [];

describe('Caral geography labels', () => {
  it('names the Supe river and the documented places', () => {
    const names = labels.map((l) => l.text);
    expect(names).toContain('Río Supe');
    expect(names).toContain('Áspero');
    expect(names).toContain('Caral');
  });

  it('keeps every label inside the normalized map', () => {
    for (const label of labels) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x).toBeLessThanOrEqual(1);
      expect(label.z).toBeGreaterThanOrEqual(0);
      expect(label.z).toBeLessThanOrEqual(1);
    }
  });

  it('does not duplicate names', () => {
    expect(new Set(labels.map((l) => l.text)).size).toBe(labels.length);
  });
});

describe('geography label fade', () => {
  const maxZoom = 120;

  it('is fully visible at the RTS framing', () => {
    expect(labelFade(34, maxZoom)).toBe(1);
  });

  it('fades progressively when the camera zooms out', () => {
    expect(labelFade(100, maxZoom)).toBeGreaterThan(0);
    expect(labelFade(100, maxZoom)).toBeLessThan(1);
    expect(labelFade(maxZoom, maxZoom)).toBe(0);
  });

  it('derives the fade from the map zoom limit, not a fixed number', () => {
    expect(labelFade(90, 108)).toBeGreaterThan(0.5);
    expect(labelFade(108, 108)).toBe(0);
    expect(labelFade(120, 108)).toBe(0);
  });
});
