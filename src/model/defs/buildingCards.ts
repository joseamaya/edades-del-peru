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
  {
    building: BuildingKind.FARM,
    missionId: 'm3_moche_recuay',
    name: 'Andén · campo de valle',
    role: 'Producción agrícola',
    summary:
      'El Andén representa los campos irrigados de los valles de Moche y Chicama. La cercanía al canal eleva su rendimiento; es una abstracción jugable de la agricultura de valle documentada.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Moche · Cultura moche',
    sources: ['docs/historia/campanas/moche_recuay.md', 'docs/historia/civilizaciones/moche.md'],
  },
  {
    building: BuildingKind.MILL,
    missionId: 'm3_moche_recuay',
    name: 'Troje · depósito de valle',
    role: 'Almacenamiento de excedentes',
    summary:
      'El Troje representa el almacenamiento del excedente agrícola que sostiene a la elite y a los especialistas. No es un término atestiguado en Moche: es una abstracción jugable.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Moche · Cultura moche',
    sources: ['docs/historia/campanas/moche_recuay.md', 'docs/historia/civilizaciones/moche.md'],
  },
  {
    building: BuildingKind.FARM,
    missionId: 'm4_wari',
    name: 'Andén · terraza wari',
    role: 'Producción agrícola',
    summary:
      'El Andén representa las terrazas agrícolas que sostenían la red wari. La humedad y la cercanía al agua elevan su rendimiento; es una abstracción jugable de los andenes documentados.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Wari · Ministerio de Cultura',
    sources: ['docs/historia/campanas/wari_tiahuanaco.md', 'docs/historia/civilizaciones/wari.md'],
  },
  {
    building: BuildingKind.MILL,
    missionId: 'm4_wari',
    name: 'Troje · almacén provincial',
    role: 'Almacenamiento y redistribución',
    summary:
      'El Troje representa los almacenes que articulaban la producción y la administración wari. No es un término atestiguado en Wari: es una abstracción jugable.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Wari · Isbell / Ministerio de Cultura',
    sources: ['docs/historia/campanas/wari_tiahuanaco.md', 'docs/historia/civilizaciones/wari.md'],
  },
  {
    building: BuildingKind.MARKET,
    missionId: 'm4_wari',
    name: 'Centro provincial',
    role: 'Nodo de la red wari',
    summary:
      'El Mercado representa un centro administrativo y de intercambio de la red wari. Su forma es una abstracción; la red de centros y caminos es la forma documentada de expansión.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Wari · Ministerio de Cultura',
    sources: ['docs/historia/campanas/wari_tiahuanaco.md', 'docs/historia/civilizaciones/wari.md'],
  },
  {
    building: BuildingKind.MARKET,
    missionId: 'm3_moche_recuay',
    name: 'Plaza de intercambio',
    role: 'Intercambio de élite',
    summary:
      'La plaza representa el intercambio de bienes de prestigio entre la costa moche y la sierra recuay. El edificio Mercado es una abstracción; no implica un mercado atestiguado con esa forma.',
    confidence: 'abstracción jugable',
    citation: 'Dossier de Moche · PUCP / Cultura moche',
    sources: ['docs/historia/campanas/moche_recuay.md', 'docs/historia/civilizaciones/moche.md'],
  },
];

export function getBuildingCard(missionId: string | null | undefined, building: BuildingKind): BuildingCardDef | null {
  if (!missionId) return null;
  return MISSION_ECONOMY_CARDS.find((card) => card.missionId === missionId && card.building === building) ?? null;
}
