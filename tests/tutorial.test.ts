import { describe, it, expect } from 'vitest';
import { Tutorial } from '../src/campaign/Tutorial';

function stubGame() {
  return { buildings: new Map(), units: new Map() };
}

const base = { houses: 0, barracks: 0, soldiers: 0 };

describe('tutorial save compatibility', () => {
  it('restores a save by step id after the step list changes', () => {
    const tutorial = new Tutorial(stubGame() as any);
    tutorial.applySave({
      idx: 0,
      stepId: 'landmark',
      begun: true,
      finished: false,
      delay: 0,
      base,
    });
    expect(tutorial.toSave().stepId).toBe('landmark');
  });

  it('maps the legacy indices to the closest current step', () => {
    const tutorial = new Tutorial(stubGame() as any);
    // Legacy index 3 was the removed market step; the coast is its closest replacement.
    tutorial.applySave({ idx: 3, begun: true, finished: false, delay: 0, base });
    expect(tutorial.toSave().stepId).toBe('coast');
  });
});
