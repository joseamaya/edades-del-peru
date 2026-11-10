import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { MISSIONS } from '../src/campaign/defs/campaign';
import { CAMPAIGNS } from '../src/campaign/defs/campaigns';
import { PREINCA_PROLOGUE, SERIES_INTRO } from '../src/campaign/defs/cinematics';
import { EDUCATIONAL, PROLOGUE } from '../src/campaign/defs/educational';
import { tutorialForMission } from '../src/campaign/defs/tutorials';
import { BuildingKind, CivId } from '../src/core/types';
import { es } from '../src/i18n/es';
import { getBuildingCard } from '../src/model/defs/buildingCards';
import { CIVS } from '../src/model/defs/civs';
import { HERITAGE_BUILDINGS } from '../src/model/defs/heritage';
import { TECHS } from '../src/model/defs/techs';

const CARAL = MISSIONS.find((mission) => mission.id === 'm1_caral')!;

/** Keys whose string values are shown to the player (ids, tags and paths are deliberately excluded). */
const TEXT_KEYS = new Set([
  'title',
  'subtitle',
  'history',
  'victory',
  'defeat',
  'periodNote',
  'briefing',
  'context',
  'didYouKnow',
  'epilogue',
  'summary',
  'description',
  'name',
  'role',
  'confidence',
  'citation',
  'kicker',
  'text',
  'bonuses',
  'narrator',
  'speaker',
  'playerName',
  'enemyName',
]);

function collect(value: unknown, out: string[], parentKey?: string): void {
  if (typeof value === 'string') {
    if (!parentKey || TEXT_KEYS.has(parentKey)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collect(item, out, parentKey);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) collect(item, out, key);
}

/** Every player-facing Caral text from the mission, the school layer, the tutorial and the cards. */
function caralTexts(): string {
  const texts: string[] = [];
  collect(CARAL, texts);
  collect(EDUCATIONAL.m1_caral, texts);
  collect(tutorialForMission('m1_caral'), texts);
  collect(
    CIVS.find((civ) => civ.id === CivId.CARAL),
    texts,
  );
  collect(
    CAMPAIGNS.find((campaign) => campaign.id === 'preinca'),
    texts,
  );
  collect([PREINCA_PROLOGUE, SERIES_INTRO], texts);
  collect(PROLOGUE, texts);
  collect(
    [BuildingKind.HOUSE, BuildingKind.FARM, BuildingKind.MILL].map((kind) => getBuildingCard('m1_caral', kind)),
    texts,
  );
  collect(
    Object.values(HERITAGE_BUILDINGS).filter((building) => building.id.startsWith('caral_')),
    texts,
  );
  texts.push(...Object.values(CARAL.buildingNames ?? {}));
  texts.push(...Object.values(CARAL.buildingIcons ?? {}));
  return texts.join('\n');
}

describe('Caral player texts match the dossier', () => {
  it('does not assert debated claims, colonial terms or Peninsular address', () => {
    const corpus = caralTexts();
    expect(corpus).not.toMatch(/primera ciudad de am[eé]rica/i);
    expect(corpus).not.toMatch(/ciudad m[aá]s antigua de am[eé]rica/i);
    expect(corpus).not.toMatch(/\band[eé]n(es)?\b/i);
    expect(corpus).not.toMatch(/\btroje\b/i);
    expect(corpus).not.toMatch(
      /\b(abrid|reunid|avanzad|defended|sostened|resistid|repeled|cortad|reforzad|asegurad|proteged|mantened|tomad|conectad|construid|pulsad|observad|llevad|haced|seguid|enviad|traed|poned|salid|venid)\b/i,
    );
  });

  it('uses period names and icons for Caral buildings', () => {
    expect(CARAL.buildingNames?.[BuildingKind.CENTER]).toBe('Recinto comunal');
    expect(CARAL.buildingNames?.[BuildingKind.MILL]).toBe('Depósito comunal');
    expect(CARAL.buildingIcons?.[BuildingKind.CENTER]).toBe('🏘️');
    expect(CARAL.buildingIcons?.[BuildingKind.FARM]).toBe('🌱');
    expect(getBuildingCard('m1_caral', BuildingKind.MILL)?.name).toBe('Depósito comunal');
    expect(es['hotkey.centerBase']).not.toContain('Plaza Mayor');
    expect(es['hud.menu.controls.keys']).not.toContain('Plaza Mayor');
  });

  it('keeps the documented technologies and the canal as the irrigation mechanic', () => {
    expect(CARAL.allowedTechs).toEqual(expect.arrayContaining(['cotton_nets', 'caral_shicras', 'caral_trade']));
    expect(CARAL.allowedTechs).not.toContain('irrigation_canal');
    expect(TECHS.find((tech) => tech.id === 'caral_trade')?.name).toBe('Intercambio Interregional');
    expect(es['hud.environment.wetSeason']).toBe('Crecida de verano');
  });

  it('unifies the pyramid name, the canal sector and the assembly abstraction', () => {
    expect(CARAL.victory).toContain('Pirámide Mayor');
    expect(CARAL.objectives.find((objective) => objective.id === 'obj_asamblea')?.title).toContain(
      'abstracción jugable',
    );
    expect(HERITAGE_BUILDINGS.caral_pyramid_mayor.name).toBe('Pirámide Mayor y Plaza Central');
    expect(HERITAGE_BUILDINGS.caral_canal.sector).toBe('Valle de Supe');
  });

  it('records the new abstractions and the population estimate in the dossier table', () => {
    const dossier = fs.readFileSync('docs/historia/campanas/caral.md', 'utf8');
    expect(dossier).toContain('| Nombre «depósito comunal»');
    expect(dossier).toContain('| Asamblea comunal en la Plaza Central');
    expect(dossier).toContain('| Población de Caral (1000–3000 personas)');
  });
});
