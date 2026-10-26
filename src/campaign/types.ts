import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind, Resources, MapType } from '../core/types';
import type { GeographicRegion, MapOverrides } from '../model/defs/profiles';
import type { PortraitId } from '../model/defs/commanders';
import type { LandmarkId } from '../model/defs/landmarks';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import type { SetpieceId } from '../model/defs/setpieces';

/** Normalized map point (0..1); resolved to world units from the mission map size. */
export interface MissionAnchor {
  x: number;
  z: number;
}

/** Authored scene anchors for a mission's two halves. */
export interface MissionSetpiece {
  id: SetpieceId;
  /** Caral Alto (the monumental Upper Half). */
  upper: MissionAnchor;
  /** Caral Bajo (the player's Lower Half). */
  lower: MissionAnchor;
  /** Rotation of the city's main axis (radians). */
  rotation?: number;
}

/**
 * Authored scenario layout. Left undefined for the classic procedural skirmish.
 * `base` fixes the player's starting center; `setpiece` adds a source-backed
 * scenery composition; `terrain` carves the documented local landforms.
 */
export interface MissionCanal {
  /** Normalized centre of the canal. */
  x: number;
  z: number;
  /** Length in world units; defaults to 24. */
  length?: number;
  /** Rotation of the canal axis (radians). */
  yaw?: number;
}

export interface MissionDecor {
  model: LandmarkId;
  at: 'player' | 'enemy';
  dx: number;
  dz: number;
  yaw?: number;
  scale?: number;
}

export interface MissionLayout {
  base?: MissionAnchor;
  setpiece?: MissionSetpiece;
  terrain?: TerrainLayout;
  /** Authored canal used by a mission mechanic (visual-only geometry + a reach target). */
  canal?: MissionCanal;
  /** Visual-only landmark/decor placed relative to a base. */
  decor?: MissionDecor;
}

/** World point. `ref` anchors to the player/enemy center; without `ref` it is absolute. */
export interface MissionPoint {
  ref?: 'player' | 'enemy' | 'canal';
  dx: number;
  dz: number;
}

export type ObjectiveKind =
  'destroy' | 'eliminate_all' | 'survive' | 'reach' | 'hold' | 'defend' | 'protect' | 'build' | 'gather' | 'reach_era';

export interface ObjectiveDef {
  id: string;
  kind: ObjectiveKind;
  title: string;
  count?: number;
  entityTag?: string;
  /** Anchor for `reach`/`hold`, or the required location for a `build` (expansion/outpost). */
  pos?: MissionPoint;
  /** Radius around `pos` for `reach`/`hold`/`build`. */
  radius?: number;
  /** Unit kind that must hold the position (optional; all player units by default). */
  unitKind?: UnitKind;
  time?: number;
  buildingKind?: BuildingKind;
  resource?: keyof Resources;
  era?: Era;
  hidden?: boolean;
  /**
   * Objectives sharing a group are alternatives: the group is satisfied when
   * any member is (a strategic choice, e.g. assault *or* besiege). Omit for a
   * required objective.
   */
  group?: string;
  /**
   * A bonus objective: it is evaluated and can be completed, but it never gates
   * victory nor causes defeat when failed.
   */
  optional?: boolean;
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

/** Per-scenario atmosphere override (fields mirror `HistoricalMapProfile.atmosphere`). */
export interface MissionAtmosphere {
  fogDensity?: number;
  skyTint?: string;
  sunWarmth?: number;
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
  /**
   * Explicit geographic region of the map, when the scenario's geography differs
   * from the player civilization's (e.g. the Inca campaigning on the Chimú north
   * coast). Left undefined, it is derived from the civilization.
   */
  region?: GeographicRegion;
  /** Optional per-scenario atmosphere override (e.g. the Chavín mist). */
  atmosphere?: MissionAtmosphere;
  /** Authored base/setpiece/terrain layout (campaign scenarios). */
  layout?: MissionLayout;
  /** Scenario-level map profile tweaks (terrain, climate, vegetation, resources). */
  mapOverrides?: MapOverrides;
  /**
   * Extra fishing grounds guaranteed on coastal scenarios whose procedural
   * placement would otherwise leave the coast without a usable fishing node.
   */
  guaranteedFishing?: number;
  /** Commanders shown as portrait cards in the briefing (stylized, not likenesses). */
  commanders?: PortraitId[];
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
