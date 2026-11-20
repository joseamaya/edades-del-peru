import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { es } from '../src/i18n/es';

describe('documented endings', () => {
  it('marks the retreats and the resistance', () => {
    const outcomes = MISSIONS.filter((mission) => mission.outcome).map((mission) => `${mission.id}:${mission.outcome}`);
    expect(outcomes).toEqual([
      'm_cusco_1536:retirada',
      'm_vilcabamba:retirada',
      'm7_tupac_amaru:retirada',
      'm_junta_cusco:retirada',
      'm9_guerra_pacifico:resistencia',
      'm_miraflores:retirada',
      'm_brena:retirada',
    ]);
  });

  it('has the labels the result screen uses', () => {
    expect(es['hud.victory.resistance']).toBe('RESISTENCIA CUMPLIDA');
    expect(es['hud.victory.retreat']).toBe('RETIRADA CUMPLIDA');
  });
});
