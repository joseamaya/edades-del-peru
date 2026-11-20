import { describe, expect, it } from 'vitest';
import { mTarapaca } from '../src/campaign/defs/missions/m_tarapaca';
import { getEducational } from '../src/campaign/defs/educational';
import { textOverlap } from '../src/ui/textOverlap';

describe('victory text overlap', () => {
  it('detects the Tarapacá victory line duplicated by its epilogue', () => {
    const epilogue = getEducational('m_tarapaca')!.epilogue!;
    expect(textOverlap(mTarapaca.victory, epilogue)).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps a result sentence that adds information', () => {
    expect(
      textOverlap('La ciudad resiste y el ejército escapa.', 'El epílogo describe la campaña de la sierra.'),
    ).toBeLessThan(0.5);
  });

  it('returns zero for an empty side', () => {
    expect(textOverlap('', 'texto')).toBe(0);
  });
});
