import type { Order, OrderTarget, Resources, UnitKind, BuildingKind, Era, CivBonuses } from '../core/types';
import type { GameSettings } from '../core/Config';

/** Bump when the snapshot shape changes; older saves are rejected. */
export const SAVE_VERSION = 1;

export type ResourceKind = 'tree' | 'mine' | 'well' | 'hunt' | 'fishing' | 'berry';
export type CombatStance = 'agresivo' | 'defensivo' | 'pasivo';

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
}
