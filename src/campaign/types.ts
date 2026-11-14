import type { CinematicBeat } from './defs/cinematics';
import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind, Resources, ResourceKind, MapType } from '../core/types';
import type { GeographicRegion, MapOverrides } from '../model/defs/profiles';
import type { PortraitId } from '../model/defs/commanders';
import type { LandmarkId } from '../model/defs/landmarks';
import type { TerrainLayout } from '../model/defs/terrainLayout';
import type { SetpieceId } from '../model/defs/setpieces';
import type { HeritageBuildingId } from '../model/defs/heritage';
import type { AuthoredSiteId, DecorModelId } from '../model/defs/sites';

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
  /** Optional documented place-name for authored layouts. */
  name?: string;
  /** Normalized centre of the canal. */
  x: number;
  z: number;
  /** Length in world units; defaults to 24. */
  length?: number;
  /** Rotation of the canal axis (radians). */
  yaw?: number;
  /**
   * Optional normalized polyline from the intake to the fields. When present, the canal follows
   * this trace instead of the straight box; the first point is the intake and the gate.
   */
  path?: MissionAnchor[];
  /** Channel width in world units for the authored trace; defaults to 2.2. */
  width?: number;
  /** Initial gate state; defaults to closed. */
  initiallyOpen?: boolean;
  /** Whether the authored canal contributes irrigation yield to nearby farms. */
  irrigation?: boolean;
  /**
   * Objective that must be active before the gate answers (Caral's Act II canal). Until then the
   * gate is scenery: opening it would complete the objective the moment it appears.
   */
  lockedUntilObjective?: string;
  /** Toast shown when the gate is clicked while locked; defaults to Caral's «prepare the fields» hint. */
  lockedHint?: string;
  /** Optional heritage field card exposed by clicking the canal. */
  heritageId?: HeritageBuildingId;
}

export interface MissionRoad {
  from: MissionPoint;
  to: MissionPoint;
  /** Ribbon width in world units; defaults to 4. */
  width?: number;
  /**
   * Paint a stony footpath (earth and stone) under the road. The default «wear» only adds dirt, which does
   * not show on ground that is already dry earth (Tambotoco's cave flat), and the ribbon is faint.
   */
  stonePath?: boolean;
}

export interface MissionDecor {
  model: LandmarkId;
  /** Dedicated GLB used instead of the procedural landmark. */
  glb?: DecorModelId;
  at: 'player' | 'enemy';
  dx: number;
  dz: number;
  yaw?: number;
  scale?: number;
}

export interface MissionSiteKeepout {
  /** Normalized centre. */
  x: number;
  z: number;
  /** Normalized half-extents. */
  rx: number;
  rz: number;
}

/** A fully authored site model, heightfield and reserved city footprint. */
export interface MissionSite {
  id: AuthoredSiteId;
  /** Vertical offset of the model floor in world metres. */
  y?: number;
  /** Optional camera framing anchor for the intro. */
  focus?: MissionAnchor;
  /** Rectangles kept free of procedural resources and props. */
  keepout?: MissionSiteKeepout[];
  /** Rectangles where player construction is forbidden (the archaeological site). */
  buildKeepout?: MissionSiteKeepout[];
  /** Opening construction phase of the site's main monument. */
  phase?: string;
}

/** Source-backed geography named on the map and minimap (toponyms are proper nouns, never translated). */
export interface MissionLabel {
  text: string;
  /** Normalized map position (0..1). */
  x: number;
  z: number;
  kind?: 'water' | 'settlement' | 'region';
}

/** A site revealed with a short "zone discovered" fog animation. */
export interface MissionDiscovery {
  heritageId: HeritageBuildingId;
  /** Reveal at mission start (a visible objective) instead of waiting for exploration. */
  initial?: boolean;
  /** Fog-clear radius in world units; defaults to the heritage footprint plus a margin. */
  radius?: number;
}

export interface MissionLayout {
  /** Named geography of the scenario, e.g. the Supe river and its settlements. */
  labels?: MissionLabel[];
  /** Opening camera focus (normalized); defaults to the player base. */
  opening?: MissionAnchor;
  /** Sites that announce themselves when explored. */
  discoveries?: MissionDiscovery[];
  base?: MissionAnchor;
  /** Fixed enemy opening base; defaults to the procedural skirmish placement. */
  enemyBase?: MissionAnchor;
  setpiece?: MissionSetpiece;
  /** Authored site model; takes precedence over the modular setpiece. */
  site?: MissionSite;
  terrain?: TerrainLayout;
  /** Authored canal used by a mission mechanic (visual-only geometry + a reach target). */
  canal?: MissionCanal;
  /**
   * Authored departure/rendezvous point (normalized), e.g. Caral's Act IV beach. Fishing banks keep
   * clear of it so workers already on the shore cannot satisfy a `hold` objective by accident.
   */
  departure?: MissionAnchor;
  /**
   * Authored fishing grounds (normalized). Placed before the procedural supply so a coastal
   * scenario's first banks sit in the intended water and opening sightline (issue 378).
   */
  fishing?: MissionAnchor[];
  /** Visual-only landmark/decor placed relative to a base. */
  decor?: MissionDecor;
  /** Visual-only roads that read the provincial network. */
  roads?: MissionRoad[];
}

/** World point. `ref` anchors to the player/enemy center, canal, landmark, site or departure point; without it, absolute. */
export interface MissionPoint {
  ref?: 'player' | 'enemy' | 'canal' | 'landmark' | 'site' | 'departure';
  dx: number;
  dz: number;
}

export type ObjectiveKind =
  | 'destroy'
  | 'eliminate_all'
  | 'survive'
  /** Elapsed time since the objective was activated (a beat, not a defence). */
  | 'wait'
  | 'reach'
  | 'hold'
  | 'defend'
  | 'protect'
  | 'build'
  | 'gather'
  | 'reach_era'
  | 'inspect'
  | 'deliver'
  | 'canal_open'
  | 'network'
  | 'research';

export type ObjState = 'pendiente' | 'activo' | 'completed' | 'failed';

export interface ObjectiveProgress {
  current: number;
  target: number;
  format: 'count' | 'time';
}

/** Ground marker for an active objective (`Mission.activeGoals` → `MissionRings`). */
export interface MissionGoal {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface ObjectiveDef {
  id: string;
  kind: ObjectiveKind;
  title: string;
  count?: number;
  entityTag?: string;
  /** Anchor for `reach`/`hold`, or the required location for a `build` (expansion/outpost). */
  pos?: MissionPoint;
  /** Required nodes for a `network` objective. */
  nodes?: MissionPoint[];
  /** Radius around `pos` for `reach`/`hold`/`build`. */
  radius?: number;
  /** Unit kind that must hold the position (optional; all player units by default). */
  unitKind?: UnitKind;
  /**
   * For `hold` with `time`: consume a resource per second while the hold advances. The timer pauses (it
   * does not reset) when the player cannot pay or the crew steps out of the radius, so an empty communal
   * store stalls construction until refilled. `store` names the building that must stand for the crew to
   * be fed (Caral's communal store).
   */
  consume?: { resource: keyof Resources; perSecond: number; store?: BuildingKind };
  /**
   * Save-compatibility guard for a hidden objective added after a save was written: if the authored site
   * already stands at this phase or later, the objective is marked completed instead of waiting for a
   * trigger that already fired.
   */
  afterPhase?: string;
  /** Another objective id that must be completed before this one can activate. */
  requires?: string;
  time?: number;
  /**
   * For a `hold` objective: how many qualifying units must stand inside `radius` before the timer
   * advances. Defaults to 1. Caral's Act IV departure uses three so the fishers already working the
   * anchoveta banks cannot end the act on their own.
   */
  minUnits?: number;
  buildingKind?: BuildingKind;
  resource?: keyof Resources;
  /**
   * For a `gather` objective: count only what was harvested from this node kind (e.g. `fishing`).
   * The counter is monotonic, so spending or training units never moves it backwards.
   */
  fromNode?: ResourceKind;
  /** Heritage cards that must be visited for an `inspect` objective. */
  heritageIds?: HeritageBuildingId[];
  /**
   * `inspect` only: a player unit must be this close (world metres) to the card being visited, so
   * the objective cannot be completed from the other side of the map.
   */
  inspectRadius?: number;
  /** Field card that receives a `deliver` objective's materials (shows a hand-over command). */
  heritageId?: HeritageBuildingId;
  /** Amount handed over per `deliver` command; defaults to 50. */
  step?: number;
  /** Technology a `research` objective waits for. */
  tech?: string;
  era?: Era;
  hidden?: boolean;
  /**
   * Starts pending but listed in the objective panel, so the player knows an optional action is
   * available (Caral's communal assembly) and only calls it from its card.
   */
  awaitsCall?: boolean;
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
  | { type: 'dialogue'; text: string; duration?: number; speaker?: string }
  /** Chapter card between acts of one mission (pauses the mission clock while open). */
  | { type: 'act'; kicker: string; title: string; text: string; image?: string }
  /** Construction phase of the authored site's main monument. */
  | { type: 'site_phase'; phase: string }
  /** Clear (or force) the fog animation over an authored discovery. */
  | { type: 'reveal'; heritageId: HeritageBuildingId }
  /** Presentation-only ritual beat at the authored site (e.g. the burial between construction phases). */
  | { type: 'ritual'; pos: MissionPoint }
  /** A named character leaves the board and becomes a huaca at `pos`. */
  | { type: 'memory'; tag: string; pos: MissionPoint; label: string }
  /** A named environmental event (drought, flood, ...). */
  | { type: 'environment'; event: string }
  | { type: 'resources'; player?: 0 | 1; amount: Partial<Resources> }
  | { type: 'objective'; objectiveId: string; state: 'activate' | 'complete' | 'fail'; announce?: boolean }
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

export type TutorialBuildBaseline = 'houses' | 'farms' | 'mills' | 'markets';

export type TutorialCheck =
  | { type: 'selectUnit'; unitKind: UnitKind }
  | { type: 'reachFishing'; radius: number }
  | { type: 'build'; buildingKind: BuildingKind; baseline: TutorialBuildBaseline }
  | { type: 'objectiveCompleted'; objectiveId: string }
  | { type: 'objectiveGroupCompleted'; group: string }
  | { type: 'approachSite'; radius: number; unitKind?: UnitKind }
  /** Informational step that advances on its own after `seconds` of play (non-blocking). */
  | { type: 'elapsed'; seconds: number }
  /** Step that completes when a player unit stands next to the entity carrying `entityTag`. */
  | { type: 'unitNearEntity'; entityTag: string; unitKind?: UnitKind; radius: number };

export interface TutorialStepDef {
  id: string;
  text: string;
  /** HUD element selector to highlight (optional). */
  highlight?: string;
  /** Hide this step until an objective has moved past `pendiente`. */
  gateObjective?: string;
  check: TutorialCheck;
}

export interface TutorialDef {
  steps: TutorialStepDef[];
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
  /** Optional clarification when the mission covers only part of its historical period. */
  periodNote?: string;
  /** Speaker label for unattributed dialogue; defaults to the commander label. */
  narrator?: string;
  /**
   * Fallback for saves written before the site phase was persisted: the latest completed objective in
   * this list restores the authored phase.
   */
  legacyPhases?: { objectiveId: string; phase: string }[];
  /** Narrated intro played before the briefing (skipped with ?intro=0). */
  intro?: CinematicBeat[];
  /** Backdrop of the victory epilogue (public asset path). */
  epilogueImage?: string;
  /** Show the step-by-step guided tutorial at start (e.g. the Caral mission). */
  tutorial?: boolean;
  /** Promoted to the model-mission pattern; `tests/campaign-scale.test.ts` enforces its map values. */
  modelMission?: boolean;
  playerCiv: CivId;
  enemyCiv: CivId;
  /** Optional player-facing faction names for civil wars or coalitions. */
  playerName?: string;
  enemyName?: string;
  /** Optional owner colours when both sides share a civilization. */
  playerColor?: string;
  enemyColor?: string;
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
  /**
   * Multiplier on every unit's base speed for campaign pacing (1 = the skirmish speeds). Caral and Chavín use 0.75
   * so the 256 m transect reads as travel; the scout and every other unit scale in proportion.
   */
  unitSpeedScale?: number;
  startingResources: Resources;
  start: {
    /**
     * `false`: the player starts as a party on the move, with no centre or dwellings (Tambotoco: the Ayar
     * leave the cave with nothing built). Defeat then waits until the party has neither buildings nor units.
     */
    base?: boolean;
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
  /**
   * If set, the player can only build these buildings (e.g. Caral: no metallurgy, no documented war,
   * no permanent market). Omit for every building of the era.
   */
  allowedBuildings?: BuildingKind[];
  /** Player-facing building labels for this scenario (e.g. Caral's «Depósito comunal»). */
  buildingNames?: Partial<Record<BuildingKind, string>>;
  /** Period-appropriate building icons that override the global defaults (e.g. Caral's neutral farm). */
  buildingIcons?: Partial<Record<BuildingKind, string>>;
  /** If set, only these technologies may be researched in the match. */
  allowedTechs?: string[];
  objectives: ObjectiveDef[];
  triggers: TriggerDef[];
}
