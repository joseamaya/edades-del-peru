import { BuildingKind } from '../../core/types';

export interface BuildingCardDef {
  building: BuildingKind;
  missionId: string;
  name: string;
  role: string;
  summary: string;
  confidence: string;
  citation: string;
  sources: string[];
}

const MISSION_ECONOMY_CARDS: BuildingCardDef[] = [
  {
    building: BuildingKind.FARM,
    missionId: 'm1_caral',
    name: 'Andén · campo de cultivo',
    role: 'Producción de alimentos',
    summary:
      'El Andén representa los campos de cultivo del valle. La humedad del suelo, las terrazas y el canal comunal elevan su reserva de alimentos. No es un término atestiguado en Caral: es una abstracción jugable.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/campanas/caral.md', 'docs/historia/civilizaciones/caral.md'],
  },
  {
    building: BuildingKind.MILL,
    missionId: 'm1_caral',
    name: 'Troje · depósito comunal',
    role: 'Almacenamiento de excedentes',
    summary:
      'El Troje representa el depósito comunal donde se guarda el excedente. Los obreros entregan aquí la comida recolectada. No es un término atestiguado en Caral: es una abstracción jugable.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/campanas/caral.md', 'docs/historia/civilizaciones/caral.md'],
  },
  {
    building: BuildingKind.FARM,
    missionId: 'm2_chavin',
    name: 'Andén · terraza de cultivo',
    role: 'Producción agrícola',
    summary:
      'El Andén representa las terrazas agrícolas del valle altoandino. La humedad y la cercanía al río o al canal elevan su rendimiento; es una abstracción jugable de la agricultura documentada en Chavín.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Chavín · UNESCO 330',
    sources: ['docs/historia/campanas/chavin.md', 'docs/historia/civilizaciones/chavin.md'],
  },
  {
    building: BuildingKind.MILL,
    missionId: 'm2_chavin',
    name: 'Troje · depósito de ofrendas',
    role: 'Almacenamiento',
    summary:
      'El Troje representa el depósito donde se guardan alimentos y bienes del templo. No es un término atestiguado en Chavín: es una abstracción del almacenamiento necesario para sostener peregrinaciones y ceremonias.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Chavín · UNESCO 330',
    sources: ['docs/historia/campanas/chavin.md', 'docs/historia/civilizaciones/chavin.md'],
  },
  {
    building: BuildingKind.MARKET,
    missionId: 'm2_chavin',
    name: 'Feria de peregrinos',
    role: 'Intercambio y prestigio',
    summary:
      'La feria representa el intercambio de larga distancia que acompañaba al centro ceremonial: spondylus, obsidiana y bienes de prestigio. El edificio Mercado es una abstracción jugable; no implica un mercado atestiguado con esa forma.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Chavín · Burger 1995 / UNESCO 330',
    sources: ['docs/historia/campanas/chavin.md', 'docs/historia/civilizaciones/chavin.md'],
  },
];

export function getBuildingCard(missionId: string | null | undefined, building: BuildingKind): BuildingCardDef | null {
  if (!missionId) return null;
  return MISSION_ECONOMY_CARDS.find((card) => card.missionId === missionId && card.building === building) ?? null;
}
