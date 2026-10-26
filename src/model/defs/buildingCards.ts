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

const CARAL_ECONOMY_CARDS: BuildingCardDef[] = [
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
];

export function getBuildingCard(missionId: string | null | undefined, building: BuildingKind): BuildingCardDef | null {
  if (!missionId) return null;
  return CARAL_ECONOMY_CARDS.find((card) => card.missionId === missionId && card.building === building) ?? null;
}
