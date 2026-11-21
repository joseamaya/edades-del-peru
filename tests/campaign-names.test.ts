import { describe, expect, it } from 'vitest';
import { Game } from '../src/core/Game';
import { CivId, Era, UnitKind } from '../src/core/types';
import { mBrena } from '../src/campaign/defs/missions/m_brena';
import { mMiraflores } from '../src/campaign/defs/missions/m_miraflores';
import { m9GuerraPacifico } from '../src/campaign/defs/missions/m9_guerra_pacifico';
import { mTarapaca } from '../src/campaign/defs/missions/m_tarapaca';
import { unitDisplayName } from '../src/model/defs/units';

const DEFENSOR = UnitKind.REPUBLICA_DEFENSOR;

describe('campaign unit names', () => {
  it('keeps the generic republican infantry neutral', () => {
    // The name used to be the Arica garrison's: every republican mission inherited it.
    expect(unitDisplayName(DEFENSOR, CivId.REPUBLIC, Era.REPUBLIC)).toBe('Defensor republicano');
  });

  it('gives each republican mission its own force', () => {
    expect(m9GuerraPacifico.unitNames?.[DEFENSOR]).toBe('Defensor de Arica');
    expect(mTarapaca.unitNames?.[DEFENSOR]).toBe('Defensor de Tarapacá');
    expect(mMiraflores.unitNames?.[DEFENSOR]).toBe('Reservista de Miraflores');
    expect(mBrena.unitNames?.[DEFENSOR]).toBe('Guerrillero de la Breña');
  });

  it('shows a named character by name, not by the unit kind', () => {
    // Pizarro is a CAVALRY unit tagged `pizarro`; the hover card used to read «Caballería de Choque».
    const named = Game.prototype.entityName.call(
      { unitName: () => 'Caballería de Choque' },
      { kind: UnitKind.CAVALRY, owner: 0, tag: 'pizarro' },
    );
    expect(named).toBe('Francisco Pizarro');
    const anonymous = Game.prototype.entityName.call(
      { unitName: () => 'Caballería de Choque' },
      { kind: UnitKind.CAVALRY, owner: 0 },
    );
    expect(anonymous).toBe('Caballería de Choque');
  });
});
