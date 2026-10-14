import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind, Resources, MapType } from '../core/types';

/** World point. `ref` anchors to the player/enemy center; without `ref` it is absolute. */
export interface MissionPoint {
  ref?: 'player' | 'enemy';
  dx: number;
  dz: number;
}

export type ObjectiveKind =
  'destroy' | 'eliminate_all' | 'survive' | 'reach' | 'defend' | 'protect' | 'build' | 'gather' | 'reach_era';

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
  | { type: 'objective'; objectiveId: string; state: 'activate' | 'completed' | 'failed' }
  | { type: 'entity_dead'; entityTag: string }
  | { type: 'unit_near'; entityTag: string; pos: MissionPoint; radius: number };

export type TriggerEffect =
  | {
      type: 'wave';
      owner: 0 | 1;
      units: { kind: UnitKind; count: number }[];
      pos: MissionPoint;
      radius?: number;
      objective?: 'base' | 'position';
    }
  | {
      type: 'reinforce';
      owner: 0 | 1;
      units: { kind: UnitKind; count: number }[];
      pos: MissionPoint;
      radius?: number;
      objective?: 'base' | 'position';
    }
  | { type: 'dialogue'; text: string; duration?: number }
  | { type: 'objective'; objectiveId: string; state: 'activate' | 'complete' | 'fail' }
  | { type: 'camera'; pos: MissionPoint }
  | { type: 'victory' }
  | { type: 'defeat'; text: string };

export interface TriggerDef {
  id: string;
  condition: TriggerCond;
  effects: TriggerEffect[];
  /** If true, the trigger can fire again after `cooldown` seconds. */
  repeat?: boolean;
  cooldown?: number;
}

export interface MissionDef {
  id: string;
  title: string;
  subtitle: string;
  history: string;
  victory: string;
  defeat: string;
  /** Historical period of the mission (resolves dates and coetaneous civilizations). */
  period: HistoricalPeriod;
  /** Show the step-by-step guided tutorial at start (e.g. the Caral mission). */
  tutorial?: boolean;
  playerCiv: CivId;
  enemyCiv: CivId;
  map: { seed: number; type: MapType; size: number };
  timeOfDay: 'morning' | 'noon' | 'dusk' | 'night';
  startingEra: Era;
  startingResources: Resources;
  start: {
    buildings?: { kind: BuildingKind; dx: number; dz: number; tag?: string }[];
    units?: { kind: UnitKind; dx: number; dz: number; tag?: string; count?: number }[];
  };
  /** Tag existing buildings at start (e.g. the enemy center). */
  mark?: { tag: string; kind: BuildingKind; owner: 0 | 1 }[];
  enemy: { active: boolean; difficulty: 'easy' | 'normal' | 'hard' | 'legendary'; aggression: number };
  /**
   * If set, the player can only train these units (a scenario restriction, e.g.
   * a naval campaign with no siege train). Omit for the full roster.
   */
  allowedUnits?: UnitKind[];
  objectives: ObjectiveDef[];
  triggers: TriggerDef[];
}
