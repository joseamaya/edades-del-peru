import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind, Resources, MapType } from '../core/types';

/** Punto del mundo. `ref` ancla al centro del jugador/enemigo; sin `ref` es absoluto. */
export interface MissionPoint {
  ref?: 'jugador' | 'enemigo';
  dx: number;
  dz: number;
}

export type ObjectiveKind =
  | 'destroy'
  | 'eliminate_all'
  | 'survive'
  | 'reach'
  | 'defend'
  | 'protect'
  | 'build'
  | 'gather'
  | 'reach_era';

export interface ObjectiveDef {
  id: string;
  kind: ObjectiveKind;
  title: string;
  count?: number;
  entityTag?: string;
  pos?: MissionPoint;
  radius?: number;
  time?: number;
  buildingKind?: BuildingKind;
  resource?: keyof Resources;
  era?: Era;
  hidden?: boolean;
}

export type TriggerCond =
  | { type: 'time'; seconds: number }
  | { type: 'objetivo'; objectiveId: string; state: 'activate' | 'completed' | 'failed' }
  | { type: 'entity_dead'; entityTag: string }
  | { type: 'unit_near'; entityTag: string; pos: MissionPoint; radius: number };

export type TriggerEffect =
  | { type: 'wave'; owner: 0 | 1; units: { kind: UnitKind; count: number }[]; pos: MissionPoint; radius?: number; objective?: 'base' | 'position' }
  | { type: 'reinforce'; owner: 0 | 1; units: { kind: UnitKind; count: number }[]; pos: MissionPoint; radius?: number; objective?: 'base' | 'position' }
  | { type: 'dialogue'; text: string; duration?: number }
  | { type: 'objetivo'; objectiveId: string; state: 'activate' | 'complete' | 'fail' }
  | { type: 'camera'; pos: MissionPoint }
  | { type: 'victoria' }
  | { type: 'derrota'; text: string };

export interface TriggerDef {
  id: string;
  condicion: TriggerCond;
  efectos: TriggerEffect[];
  /** Si es true, el trigger puede volver a dispararse tras `cooldown` segundos. */
  repetir?: boolean;
  cooldown?: number;
}

export interface MissionDef {
  id: string;
  title: string;
  subtitle: string;
  history: string;
  victory: string;
  defeat: string;
  /** Periodo histórico de la misión (resuelve fechas y civilizaciones coetáneas). */
  period: HistoricalPeriod;
  /** Muestra el tutorial guiado paso a paso al comenzar (p. ej. la misión de Caral). */
  tutorial?: boolean;
  playerCiv: CivId;
  enemyCiv: CivId;
  map: { seed: number; type: MapType; size: number };
  timeOfDay: 'mañana' | 'mediodía' | 'atardecer' | 'noche';
  startingEra: Era;
  startingResources: Resources;
  start: {
    buildings?: { kind: BuildingKind; dx: number; dz: number; tag?: string }[];
    units?: { kind: UnitKind; dx: number; dz: number; tag?: string; count?: number }[];
  };
  /** Etiqueta edificios existentes al comenzar (p. ej. el centro enemigo). */
  mark?: { tag: string; kind: BuildingKind; owner: 0 | 1 }[];
  enemy: { active: boolean; difficulty: 'facil' | 'normal' | 'dificil' | 'legendario'; aggression: number };
  objectives: ObjectiveDef[];
  triggers: TriggerDef[];
}
