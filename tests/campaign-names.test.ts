import { describe, expect, it } from 'vitest';
import { CivId, Era, UnitKind } from '../src/core/types';
import { mBrena } from '../src/campaign/defs/missions/m_brena';
import { mMiraflores } from '../src/campaign/defs/missions/m_miraflores';
import { m9GuerraPacifico } from '../src/campaign/defs/missions/m9_guerra_pacifico';
import { namedEntityName } from '../src/model/defs/commanders';
import { unitDisplayName } from '../src/model/defs/units';

const DEFENSOR = UnitKind.REPUBLICA_DEFENSOR;

describe('campaign unit names', () => {
  it('keeps the generic republican infantry neutral', () => {
    // The name used to be the Arica garrison's: every republican mission inherited it.
    expect(unitDisplayName(DEFENSOR, CivId.REPUBLIC, Era.REPUBLIC)).toBe('Defensor republicano');
  });

  it('gives each republican mission its own force', () => {
    expect(m9GuerraPacifico.unitNames?.[DEFENSOR]).toBe('Defensor de Arica');
    expect(mMiraflores.unitNames?.[DEFENSOR]).toBe('Reservista de Miraflores');
    expect(mBrena.unitNames?.[DEFENSOR]).toBe('Guerrillero de la Breña');
  });

  it('keeps Arica a scripted defence without an enemy economy', () => {
    // The dossier says the enemy runs no economy; the bombardment and the assault are authored waves.
    expect(m9GuerraPacifico.enemy.economy).toBe(false);
    expect(m9GuerraPacifico.enemy.attacks).toBe(false);
  });

  it('shows a named character by name, not by the unit kind', () => {
    // Pizarro is a CAVALRY unit tagged `pizarro`; the hover card used to read «Caballería de Choque».
    expect(namedEntityName('pizarro', 'Caballería de Choque')).toBe('Francisco Pizarro');
    expect(namedEntityName(undefined, 'Caballería de Choque')).toBe('Caballería de Choque');
    expect(namedEntityName('', 'Caballería de Choque')).toBe('Caballería de Choque');
  });
});
