import type {
  Order,
  OrderTarget,
  Resources,
  UnitKind,
  BuildingKind,
  Era,
  CivBonuses,
  CombatStance,
} from '../core/types';
import type { GameSettings } from '../core/Config';
import type { ObjState } from '../campaign/Mission';
import type { HeritageBuildingId } from '../model/defs/heritage';

/** Bump on a breaking snapshot change; adding optional fields is fine. */
export const SAVE_VERSION = 3;

export type ResourceKind = 'tree' | 'mine' | 'well' | 'hunt' | 'fishing' | 'berry';
export interface TutorialBase {
  houses: number;
  barracks: number;
  soldiers: number;
  farms?: number;
  mills?: number;
}

export interface UnitSave {
  id: number;
  owner: number;
  kind: UnitKind;
  era: Era;
  pos: { x: number; y: number; z: number };
  yaw: number;
  hp: number;
  orders: Order[];
  targetEntityId: number | null;
  attackCooldown: number;
  gatherCarry: Resources;
  carryCapacity: number;
  convertProgress: number;
  garrisonedIn: number | null;
  isConstructing: number | null;
  rallyPoint: OrderTarget | null;
  combatStance: CombatStance;
  buildEfficiency: number;
  gatherMultiplier: number;
  attackMultiplier: number;
  armorMultiplier: number;
  tag?: string;
}

export interface BuildingSave {
  id: number;
  owner: number;
  kind: BuildingKind;
  era: Era;
  pos: { x: number; y: number; z: number };
  yaw: number;
  hp: number;
  constructionProgress: number;
  constructionComplete: boolean;
  productionQueue: { unit: UnitKind; progress: number }[];
  researchQueue: { tech: string; progress: number; playerId: number }[];
  garrisonedIds: number[];
  rallyPoint: OrderTarget;
  hasRallyPoint: boolean;
  attackCooldown: number;
  wonderTimer: number;
  foodAmount: number;
  tag?: string;
}

export interface ResourceNodeSave {
  id: number;
  kind: ResourceKind;
  x: number;
  z: number;
  amount: number;
}

export interface PlayerSave {
  id: number;
  resources: Resources;
  populationUsed: number;
  era: Era;
  ageBuildings: number;
  techs: string[];
  alive: boolean;
  kills: number;
  totalLost: number;
  wonderActive: boolean;
  stats: { created: number; destroyed: number; military: number; econ: number };
  bonus: CivBonuses;
}

export interface MissionSave {
  started: boolean;
  ended: boolean;
  won: boolean | null;
  timer: number;
  objState: [string, ObjState][];
  fired: string[];
  lastFired: [string, number][];
  spawnedCount: [string, number][];
  /** Per-hold-objective elapsed time (optional for older saves). */
  holdTimers?: [string, number][];
  /** Optional heritage field cards recorded during the mission. */
  heritage?: HeritageBuildingId[];
}

export interface TutorialSave {
  idx: number;
  /** Stable step id; older saves only have `idx`. */
  stepId?: string;
  begun: boolean;
  finished: boolean;
  delay: number;
  base: TutorialBase;
}

export interface SaveData {
  version: number;
  settings: GameSettings;
  rngState: number;
  camera: { x: number; z: number; zoom: number; yaw: number };
  fog: string;
  players: PlayerSave[];
  units: UnitSave[];
  buildings: BuildingSave[];
  resourceNodes: ResourceNodeSave[];
  mission?: MissionSave;
  tutorial?: TutorialSave;
}
