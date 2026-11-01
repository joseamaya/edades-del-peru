import * as THREE from 'three';
import { bus } from './EventBus';
import { createRenderer, createPostFX } from '../rendering/Renderer';
import { PostFX } from '../rendering/PostFX';
import { Sky, cloudDensity } from '../rendering/Sky';
import { Terrain } from '../rendering/Terrain';
import { Water } from '../rendering/Water';
import { CulturalLandscape } from '../rendering/CulturalLandscape';
import { SacredCity } from '../rendering/SacredCity';
import { Particles } from '../rendering/Particles';
import { Debris } from '../rendering/Debris';
import { RTSCamera } from './Camera';
import { GameLoop } from './GameLoop';
import { Fow } from '../game/Fow';
import { applyFowToObject, createFowUniforms } from '../rendering/FowMaterial';
import { Pathfinder, MAX_WALKABLE_SLOPE } from '../game/Pathfinding';
import { Unit, UnitContext } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode, clearResourceCaches } from '../entities/ResourceNode';
import { OrderMarkers, MarkerKind } from '../entities/OrderMarker';
import { TreeInstances } from '../rendering/TreeInstances';
import { Props } from '../rendering/Props';
import { Wildlife } from '../rendering/Wildlife';
import { clearFaunaTemplates } from '../rendering/faunaModels';
import { clearModelAssets } from '../rendering/ModelAssets';
import { disposeStaticGltf } from '../rendering/StaticModel';
import { loadSceneryModel } from '../rendering/sceneryModels';
import { loadSiteModel } from '../rendering/siteModels';
import { loadDecorModel } from '../rendering/decorModels';
import { planProps, propCountFor } from '../model/defs/props';
import { planWildlife, faunaCountFor } from '../model/defs/wildlife';
import { Projectile, updateProjectilePools } from '../entities/Projectile';
import { EntityView, reserveIds } from '../entities/EntityView';
import { AI } from '../game/AI';
import { computeDamage, elevationDamageMultiplier, ArmorProfile } from '../game/combat';
import type { Difficulty } from './Config';
import { Economy } from '../game/Economy';
import { HUD } from '../ui/HUD';
import {
  Era,
  Resources,
  ZERO_RESOURCES,
  PlayerState,
  CivId,
  UnitKind,
  BuildingKind,
  OrderKind,
  Order,
  OrderTarget,
  Team,
  RESOURCE_KEYS,
} from '../core/types';
import { getCiv } from '../model/defs/civs';
import { archProfileFor } from '../model/defs/architecture';
import { LANDMARKS, PadSize, setpiecePadRadius } from '../model/defs/landmarks';
import { getHeritageBuilding, type HeritageBuildingDef, type HeritageBuildingId } from '../model/defs/heritage';
import { getPeriod } from '../model/defs/periods';
import { BuildContext, buildModel, buildLandmarkModel, disposeModel, clearModelCaches } from '../model/ProceduralModel';
import { clearTextureCache } from '../rendering/Textures';
import { CAMERA_SPEED_SCALE, DEFAULT_SETTINGS, GameSettings, OPENING_BASE_CLEARANCE, RESOURCE_INFO } from './Config';
import { QualityGovernor } from './QualityGovernor';
import {
  applyMapOverrides,
  resolveMapProfile,
  type HistoricalMapProfile,
  type GeographicRegion,
} from '../model/defs/profiles';
import { resolveColorGrade } from '../model/defs/grades';
import { planSettlementSite, type SettlementPlan } from '../model/defs/settlementPlan';
import { inCaralCity, planCaralCity, type CaralCityPlan } from '../model/defs/setpieces';
import { insideTerrainRect, riverCentreZ } from '../model/defs/terrainLayout';
import { SettlementOverlay } from '../rendering/SettlementOverlay';
import { SettlementDressing } from '../rendering/SettlementDressing';
import { planSettlementDressing } from '../model/defs/settlementDressing';
import {
  CARAL_VALLEY_PATH_WIDTH,
  VALLEY_FIELD_MARGIN,
  planCaralValley,
  planCaralValleyProps,
  type CaralValleyPlan,
  type CaralValleyQuery,
} from '../model/defs/caralValley';
import { farmYieldMultiplier, nearbyCanal } from '../model/defs/farmYield';
import { distance2D, distanceToSegment } from '../util/math';
import { isTypingTarget } from '../util/dom';
import { RNG, hashCode, weightedPick } from '../util/rng';
import { keyFor } from './hotkeys';
import { getAuthoredSite, type AuthoredSiteDef, type SiteHeritageProxy } from '../model/defs/sites';
import { detectSoftwareRenderer } from '../util/gpu';
import { ERA_DEFS } from '../model/defs/eras';
import { BUILDING_DEFS, getBuildingStats, BUILDING_INFO } from '../model/defs/buildings';
import {
  getUnitStats,
  getUnitModel,
  unitDisplayDescription,
  unitDisplayIcon,
  unitDisplayName,
  isConverter,
  DamageClass,
} from '../model/defs/units';
import { getTech } from '../model/defs/techs';
import { AudioEngine } from '../audio/AudioEngine';
import { Mission } from '../campaign/Mission';
import { Tutorial } from '../campaign/Tutorial';
import { tutorialForMission } from '../campaign/defs/tutorials';
import { PlayerCommand, Replay, ReplayPlayer, ReplayRecorder, saveReplay } from '../game/replay';
import { getMission } from '../campaign/defs/campaign';
import type { MissionDef, MissionAtmosphere, MissionLayout, MissionPoint, MissionSite } from '../campaign/types';
import { serializeGame, saveToStorage } from '../game/SaveGame';
import type { SaveData } from '../game/saveTypes';

/** When false the main loop does not auto-start, so tests can drive fixed steps from step 0. */
let autoStart = true;
export function setAutoStart(value: boolean): void {
  autoStart = value;
}

const NODE_INFO: Record<ResourceNode['kind'], { name: string; icon: string }> = {
  tree: { name: 'Árbol', icon: '🌳' },
  mine: { name: 'Mina', icon: '⛏️' },
  well: { name: 'Cantera', icon: '🪨' },
  hunt: { name: 'Caza', icon: '🦌' },
  fishing: { name: 'Banco de peces', icon: '🐟' },
  berry: { name: 'Arbusto', icon: '🫐' },
};

/** What sits under a screen point: at most one resource/unit/building. */
type PickResult = { resource: ResourceNode | null; unit?: Unit; building?: Building; heritage?: HeritageBuildingDef };

/** A death animation: animates a detached model, then frees it. */
interface DeathFx {
  view: EntityView;
  t: number;
  dur: number;
  /** Fall angle (units topple over; buildings barely tilt). */
  topple: number;
  /** How far the model sinks into the ground. */
  sink: number;
  baseY: number;
  radius: number;
  building: boolean;
  emitTimer: number;
  cleanup: () => void;
}

/** Seed multipliers so ambient scatter does not correlate with the map/replay RNG. */
const AMBIENT_PROP_SEED = 7;
const AMBIENT_FAUNA_SEED = 13;

/** Campaign intro flyover framing, relative to the player base. */
const INTRO_CAMERA = { offset: 34, fromHeight: 52, toZoom: 30, seconds: 2.6 } as const;
/** Opening deployment: four workers and the scout, on the camera-facing arc. */
const STARTING_UNIT_COUNT = 5;
const STARTING_UNIT_ANGLES = [0, -0.52, 0.52, -1.05, 1.05, -1.6, 1.6] as const;
const STARTING_UNIT_RADII = [5.2, 6.1, 7.0, 7.9, 8.8, 9.7] as const;
/** Keep guaranteed fishing searches inside the authored river and map edge. */
const FISHING_SCAN_MARGIN = 4;
export class Game {
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera!: RTSCamera;
  postfx!: PostFX;
  sky!: Sky;
  terrain!: Terrain;
  water!: Water;
  /** Resolved visual world profile for this match (map identity + resources). */
  mapProfile!: HistoricalMapProfile;
  /** Explicit map region of the current mission, if any. */
  private missionRegion?: GeographicRegion;
  private readonly missionAtmosphere?: MissionAtmosphere;
  /** Authored scenario config (base, terrain, setpiece), if any. */
  private readonly missionDef?: MissionDef;
  private readonly missionLayout?: MissionLayout;
  /** Authored site definition resolved from the mission layout. */
  private readonly siteDef?: AuthoredSiteDef;
  private setpiecePlan: CaralCityPlan | null = null;
  /** Visual-only Caral city scene (Caral Alto + Caral Bajo). */
  setpiece: SacredCity | null = null;
  /** Authored site model and its focus, when the mission uses one. */
  private siteFocus: { x: number; z: number } | null = null;
  /** Objective anchors for the authored site (world units). */
  siteAnchor: { x: number; z: number } | null = null;
  siteCenter: { x: number; z: number } | null = null;
  /** Authored canal target in world units (mission mechanic + visual). */
  canalSite: { x: number; z: number } | null = null;
  private canalGroup: THREE.Group | null = null;
  private canalWater: THREE.Mesh | null = null;
  private canalGate: THREE.Mesh | null = null;
  private canalOpen = false;
  private scenarioDecor: THREE.Group | null = null;
  /** Decorative historical landmark of the map (visual only), if any. */
  landmark: THREE.Group | null = null;
  private landmarkOwnsStatic = false;
  private landmarkLoadToken = 0;
  private setpieceLoadToken = 0;
  /** Cultural landscape (roads, fields, plazas, canals); visual only. */
  landscape: CulturalLandscape | null = null;
  /** Per-base settlement overlays (planned fields/roads); visual only. */
  settlements: SettlementOverlay[] = [];
  /** Per-base settlement dressing (visual only). */
  settlementDressing: SettlementDressing[] = [];
  /** Visual-only valley plan; reserved before resources/props scatter. */
  private caralValleyPlan: CaralValleyPlan | null = null;
  private caralValleyBase: { x: number; z: number } | null = null;
  private startSpots: [number, number][] = [];
  particles!: Particles;
  debris!: Debris;
  fow!: Fow;
  /** Shared fog-of-war uniforms for the visual-only layers (landscape, overlays, landmark). */
  private readonly fowUniforms = createFowUniforms();
  pathfinder!: Pathfinder;
  markers!: OrderMarkers;
  trees!: TreeInstances;
  props!: Props;
  wildlife!: Wildlife;
  loop = new GameLoop();
  hud!: HUD;
  audio = new AudioEngine();
  mission: Mission | null = null;
  tutorial: Tutorial | null = null;
  private unitContext!: UnitContext;
  economy!: Economy;

  settings: GameSettings;
  /** Deterministic match RNG (derived from the map seed). */
  readonly rng: RNG;
  /** Force a specific devicePixelRatio (e.g. low mode). */
  pixelRatioOverride: number | null = null;
  /** Play the campaign's camera flyover at mission start (off with `?intro=0`). */
  introEnabled = true;
  players: PlayerState[] = [];
  units = new Map<number, Unit>();
  buildings = new Map<number, Building>();
  resourceNodes = new Map<number, ResourceNode>();
  projectiles: Projectile[] = [];

  selectedUnits: number[] = [];
  selectedBuilding: number | null = null;
  selectedHeritage: HeritageBuildingId | null = null;
  private readonly visitedHeritage = new Set<HeritageBuildingId>();
  private selectionStart: THREE.Vector2 | null = null;
  obstacleHandles = new Map<number, { x: number; z: number; radius: number }>();
  private readonly spatialCell = 6;
  private spatial = new Map<number, Unit[]>();
  private mouse = new THREE.Vector2();
  private mouseScreen = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private placingBuilding: { kind: BuildingKind; valid: boolean; ghost: THREE.Group } | null = null;
  private shiftQueue = false;
  private paused = false;
  private gameEnded = false;
  private wonderReqTime = 300;
  /** Whether player 1 has an active opponent (skirmish, or a mission with an enemy). */
  private readonly enemyActive: boolean;
  private pendingSnapshot: SaveData | null = null;
  /** Simulation step counter (fixed 60Hz ticks), used to time recorded commands. */
  stepCount = 0;
  private fxRng!: RNG;
  private recorder: ReplayRecorder | null = null;
  private replay: ReplayPlayer | null = null;
  private qualityGovernor!: QualityGovernor;
  /** Skip the software-renderer auto-degrade (`?cine=1`). */
  private readonly forceCinematic: boolean;
  /** True when the renderer is a software rasterizer (safe profile applied). */
  private softwareFallback = false;
  /** One-shot death animations that outlive their entity (topple / collapse). */
  private deathFx: DeathFx[] = [];
  private teardownHooks: (() => void)[] = [];

  constructor(
    settings: GameSettings,
    snapshot: SaveData | null = null,
    replay: Replay | null = null,
    forceCinematic = false,
  ) {
    this.forceCinematic = forceCinematic;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.pendingSnapshot = snapshot;
    this.replay = replay ? new ReplayPlayer(replay) : null;
    const mis = this.settings.missionId ? getMission(this.settings.missionId) : undefined;
    if (mis) {
      // fixed mission configuration overrides the skirmish
      this.settings.civPlayer = mis.playerCiv;
      this.settings.civAI = mis.enemyCiv;
      this.settings.period = mis.period;
      this.settings.startingEra = mis.startingEra;
      this.settings.mapSeed = mis.map.seed;
      this.settings.mapType = mis.map.type;
      this.settings.mapSize = mis.map.size;
      this.settings.timeOfDay = mis.timeOfDay;
      this.settings.difficulty = mis.enemy.difficulty;
      this.settings.victoryMode = 'conquest'; // the campaign does not use wonder victory
    }
    this.missionDef = mis;
    this.missionRegion = mis?.region;
    this.missionAtmosphere = mis?.atmosphere;
    this.missionLayout = mis?.layout;
    this.siteDef = getAuthoredSite(this.missionLayout?.site?.id);
    this.enemyActive = !mis || mis.enemy.active;
    this.rng = new RNG((this.settings.mapSeed * 2654435761) >>> 0);
    // Cosmetic-only randomness must not consume the simulation sequence.
    this.fxRng = new RNG((this.settings.mapSeed * 2654435761 + 0x9e3779b9) >>> 0);
    this.initRenderer();
    const cinematic = this.settings.cinematic && !this.softwareFallback;
    this.postfx.setCinematic(cinematic);
    this.postfx.setQuality(this.softwareFallback ? 'low' : this.settings.quality);
    this.qualityGovernor = new QualityGovernor(this);
    if (this.softwareFallback) this.qualityGovernor.setUserQuality('low');
    this.initWorld();
    this.unitContext = this.ctxFor();
    this.economy = new Economy(this);
    this.initPlayers();
    if (this.missionLayout?.site) {
      this.spawnAuthoredSite(this.missionLayout.site);
    } else {
      this.spawnLandmark();
      this.spawnSacredCity();
    }
    this.spawnCanal();
    this.spawnMissionDecor();
    if (!this.pendingSnapshot) this.spawnMissionRoads();
    this.spawnCulturalLandscape();
    this.initInput();
    this.initHUD();
    this.mission = mis ? new Mission(this, mis, (win) => this.missionEnd(win)) : null;
    const tutorialDef = mis ? tutorialForMission(mis.id) : undefined;
    this.tutorial =
      mis && mis.tutorial && tutorialDef && this.settings.showHints ? new Tutorial(this, tutorialDef) : null;
    if (!mis || mis.enemy.active) this.addAI(1);
    this.audio.setEra(this.players[0].era);
    this.initAudio();
    if (mis && !this.pendingSnapshot) this.applyMissionSetup(mis);
    if (this.pendingSnapshot) this.applySnapshot(this.pendingSnapshot);
    if (mis?.guaranteedFishing) this.ensureFishingGrounds(mis.guaranteedFishing);
    this.loop.onUpdate = (dt, t) => this.update(dt, t);
    this.loop.onRender = () => this.render();
    if (autoStart) this.loop.start();
    if (mis && !this.pendingSnapshot) this.mission?.start();
    // record skirmish matches (not replays or loaded saves) for the local player
    if (!replay && !snapshot && !mis) this.recorder = new ReplayRecorder(this.settings);
    bus.emit('game:ready', {});
  }

  private initRenderer(): void {
    this.renderer = createRenderer();
    // Software rasterizers (SwiftShader/llvmpipe) cannot afford the cinematic set.
    // Apply the safe *render profile* without touching the saved player settings;
    // `?cine=1` skips this fallback.
    if (!this.forceCinematic && detectSoftwareRenderer(this.renderer.getContext())) {
      this.softwareFallback = true;
      this.pixelRatioOverride = 1;
      this.renderer.setPixelRatio(1);
    }
    this.camera = new RTSCamera(this.renderer.domElement, this.settings.mapSize);
    this.camera.setRotationEnabled(this.settings.rotateCamera);
    this.camera.setSpeedScale(CAMERA_SPEED_SCALE[this.settings.cameraSpeed]);
    this.camera.setFollowResolver((id) => {
      const e = this.units.get(id) ?? this.buildings.get(id);
      return e ? { x: e.pos.x, z: e.pos.z } : null;
    });
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.postfx = createPostFX(this.renderer, this.scene, this.camera.camera);
    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onResizeBound = (): void => this.onResize();

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.loop.stop();
    this.hud?.showToast('Se perdió el contexto WebGL. Recarga la página.', 'error');
  };

  private onContextRestored = (): void => {
    location.reload();
  };

  private initWorld(): void {
    const s = this.settings;
    const terrainRes = s.mapSize <= 128 ? 192 : s.mapSize <= 192 ? 256 : 320;
    this.mapProfile = applyMapOverrides(
      resolveMapProfile({
        period: s.period,
        civ: s.civPlayer,
        mapType: s.mapType,
        region: this.missionRegion,
      }),
      this.missionDef?.mapOverrides,
    );
    this.terrain = new Terrain(
      s.mapSize,
      terrainRes,
      s.mapSeed,
      this.mapProfile,
      this.missionLayout?.terrain,
      this.siteDef,
    );
    this.terrain.camera = this.camera.camera;
    this.scene.add(this.terrain.group);
    const city = this.missionLayout?.setpiece;
    if (city && city.id === 'caral_sacred_city' && !this.missionLayout?.site) {
      const river = this.missionLayout?.terrain?.river;
      const fords = river
        ? (river.fords ?? []).map((ford) => {
            return {
              x: ford.x * s.mapSize,
              z: riverCentreZ(river, ford.x) * s.mapSize,
              width: ford.width * s.mapSize,
              depth: Math.max(8, river.width * s.mapSize + 6),
            };
          })
        : [];
      this.setpiecePlan = planCaralCity({
        size: s.mapSize,
        upper: { x: city.upper.x * s.mapSize, z: city.upper.z * s.mapSize },
        lower: { x: city.lower.x * s.mapSize, z: city.lower.z * s.mapSize },
        yaw: city.rotation,
        fords,
      });
    }
    const canal = this.missionLayout?.canal;
    if (canal) {
      let cx = canal.x * s.mapSize;
      let cz = canal.z * s.mapSize;
      if (this.terrain.isWater(cx, cz) || this.terrain.isBeach(cx, cz)) {
        for (let r = 3; r <= 18 && (this.terrain.isWater(cx, cz) || this.terrain.isBeach(cx, cz)); r += 3) {
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            const nx = canal.x * s.mapSize + Math.cos(ang) * r;
            const nz = canal.z * s.mapSize + Math.sin(ang) * r;
            if (!this.terrain.isWater(nx, nz) && !this.terrain.isBeach(nx, nz)) {
              cx = nx;
              cz = nz;
              break;
            }
          }
        }
      }
      this.canalSite = { x: cx, z: cz };
      this.canalOpen = canal.initiallyOpen ?? false;
    }
    this.sky = new Sky(this.scene);
    // No atmospheric fog over the board: classic RTS look, sharp.
    this.scene.fog = null;
    this.setTimeOfDay(s.timeOfDay);
    this.water = new Water(
      this.scene,
      this.terrain.heightMap,
      s.mapSize,
      this.mapProfile.water.level,
      this.mapProfile.water.inland,
    );
    this.applyAtmosphere();
    this.postfx.setColorGrade(resolveColorGrade(s.period, this.mapProfile));
    this.syncWaterRefractionSize();
    this.particles = new Particles(this.scene, 4096);
    this.debris = new Debris(this.scene);
    this.markers = new OrderMarkers(this.scene);
    this.trees = new TreeInstances(this.scene);
    this.props = new Props(this.scene);
    this.wildlife = new Wildlife(this.scene);
    this.fow = new Fow(s.mapSize, 128);
    this.terrain.setFow(this.fow.texture, s.fogOfWar);
    this.fowUniforms.fowMap.value = this.fow.texture;
    this.fowUniforms.mapSize.value = s.mapSize;
    this.fowUniforms.fowEnabled.value = s.fogOfWar ? 1 : 0;
    // The authored site has thin walls and doors; 1 m cells keep them solid
    // without closing the narrow residential openings.
    this.pathfinder = new Pathfinder(s.mapSize, this.siteDef?.pathCellSize ?? 2);
    this.pathfinder.bakeTerrain((x, z) => this.terrain.getHeight(x, z), this.terrain.waterLevel);
    this.startSpots = this.planStartSpots();
    if (!this.pendingSnapshot) {
      this.reserveCaralValley();
      this.spawnResources();
    }
    this.spawnAmbient();
  }

  /** Plan the valley before resource/prop scatter so no node lands on a plot. */
  private reserveCaralValley(): void {
    if (this.siteDef?.environs?.valley !== 'caral' || this.caralValleyPlan) return;
    const base = this.missionLayout?.base;
    if (!base) return;
    const size = this.settings.mapSize;
    this.caralValleyBase = { x: base.x * size, z: base.z * size };
    this.caralValleyPlan = this.planCaralValleyAt(this.caralValleyBase.x, this.caralValleyBase.z);
  }

  private setTimeOfDay(mode: string): void {
    const map: Record<string, number> = { morning: 0.62, noon: 0.5, dusk: 0.28, night: 0.05 };
    this.sky.setTimeOfDay(map[mode] ?? 0.5);
  }

  /**
   * Player-chosen post-processing quality preset (persisted with the settings).
   * The adaptive governor can drop the *applied* preset below this at runtime, but
   * never writes it, so an automatic downgrade is not saved as the default.
   */
  setQuality(q: GameSettings['quality']): void {
    this.settings.quality = q;
    this.qualityGovernor.setUserQuality(q);
  }

  /** Apply a preset to the renderer without touching the saved settings (governor). */
  applyQualityPreset(q: GameSettings['quality']): void {
    this.postfx.setQuality(q);
  }

  /** Force a render scale (`null` restores the default) and apply it immediately. */
  setPixelRatioOverride(ratio: number | null): void {
    this.pixelRatioOverride = ratio;
    this.onResize();
  }

  /** The quality preset the adaptive governor currently applies (debug overlay). */
  getAppliedQuality(): GameSettings['quality'] {
    return this.qualityGovernor.applied;
  }

  /** Whether the water refraction pass runs this frame. */
  shouldRenderWaterRefraction(): boolean {
    return this.postfx.cinematicEnabled && this.getAppliedQuality() !== 'low';
  }

  /**
   * Apply the region's atmosphere (`HistoricalMapProfile.atmosphere`): the sky
   * tint/haze/sun-warmth plus the terrain/water aerial perspective. `scene.fog`
   * stays null; the effect is distance-bounded and buildings are not dimmed.
   */
  private applyAtmosphere(): void {
    const a = this.mapProfile.atmosphere;
    const o = this.missionAtmosphere;
    const skyTint = o?.skyTint ?? a.skyTint;
    const fogDensity = o?.fogDensity ?? a.fogDensity;
    const sunWarmth = o?.sunWarmth ?? a.sunWarmth;
    const tint = new THREE.Color(skyTint);
    this.terrain.setFogColor(tint);
    this.terrain.setFogDensity(fogDensity);
    this.water.setFog(skyTint, fogDensity);
    this.sky.setAtmosphere(skyTint, sunWarmth);
  }

  private initPlayers(): void {
    const civs = [this.settings.civPlayer, this.settings.civAI];
    for (let i = 0; i < 2; i++) {
      const civ = getCiv(civs[i] as CivId);
      const isAI = i === 1;
      const name = isAI
        ? (this.missionDef?.enemyName ?? civ.name) + ' (IA)'
        : (this.missionDef?.playerName ?? civ.name);
      const colorHex = isAI
        ? (this.missionDef?.enemyColor ?? civ.colors.primary)
        : (this.missionDef?.playerColor ?? civ.colors.primary);
      this.players.push({
        id: i,
        name,
        civ: civ.id,
        team: i as Team,
        color: new THREE.Color(colorHex),
        colorHex,
        isAI,
        difficulty: i === 1 ? 1 : 0,
        resources: { food: 250, wood: 220, silver: 100, stone: 50 },
        populationUsed: 0,
        populationCap: this.settings.populationCap,
        era: this.settings.startingEra,
        ageBuildings: 0,
        techs: new Set(),
        alive: true,
        kills: 0,
        totalLost: 0,
        wonderActive: false,
        bonus: {
          attack: civ.effects?.attack ?? 0,
          armor: civ.effects?.armor ?? 0,
          gathering: { ...(civ.effects?.gathering ?? {}) },
          carry: civ.effects?.carry ?? 0,
          los: civ.effects?.los ?? 0,
          range: civ.effects?.range ?? 0,
          speed: civ.effects?.speed ?? 0,
          training: civ.effects?.training ?? 0,
          population: civ.effects?.population ?? 0,
        },
        stats: { created: 0, destroyed: 0, military: 0, econ: 0 },
      });
    }
    if (this.pendingSnapshot) return;
    for (let i = 0; i < (this.enemyActive ? 2 : 1); i++) {
      this.spawnStartBase(i, this.startSpots[i][0], this.startSpots[i][1]);
    }
    // Camera on the player. Authored sites open with the city just ahead so
    // the first frame shows both the base and the monument, not an empty field.
    this.frameAuthoredSite(this.startSpots[0][0], this.startSpots[0][1]);
  }

  /** Reserve opening base centres before random resources and props are scattered. */
  private planStartSpots(): [number, number][] {
    const s = this.settings.mapSize;
    const rng = new RNG(this.settings.mapSeed + 7);
    const spots: [number, number][] = [];
    for (let i = 0; i < (this.enemyActive ? 2 : 1); i++) {
      const fixed = i === 0 ? this.missionLayout?.base : this.missionLayout?.enemyBase;
      if (fixed) {
        const fx = fixed.x * s;
        const fz = fixed.z * s;
        if (!this.terrain.isWater(fx, fz) && this.terrain.isBuildable(fx, fz)) {
          spots.push([fx, fz]);
          continue;
        }
      }
      let x: number;
      let z: number;
      let attempts = 0;
      do {
        const ang = rng.range(0, Math.PI * 2);
        const r = rng.range(0.1, 0.2) * s;
        x = s / 2 + Math.cos(ang) * r;
        z = s / 2 + Math.sin(ang) * r;
        attempts++;
      } while ((!this.terrain.isBuildable(x, z) || this.terrain.isWater(x, z)) && attempts < 200);
      spots.push([x, z]);
    }
    return spots;
  }

  /** Clear the opening base footprint so scatter cannot block doors or unit spots. */
  private isStartReserved(x: number, z: number): boolean {
    return this.startSpots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < OPENING_BASE_CLEARANCE);
  }

  /** Invisible but raycastable volumes over the site's named heritage nodes. */
  private addSiteHeritageProxies(parent: THREE.Group, proxies: readonly SiteHeritageProxy[]): void {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: THREE.DoubleSide,
    });
    for (const p of proxies) {
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), material);
      proxy.name = p.id;
      proxy.position.set(p.x, p.h / 2 + 0.02, p.z);
      proxy.userData.heritageId = p.id;
      proxy.frustumCulled = false;
      parent.add(proxy);
    }
  }

  /** Block the source's monumental volumes while leaving plazas and paths walkable. */
  private addSiteObstacles(def: AuthoredSiteDef): void {
    for (const blocker of def.blockers) {
      this.pathfinder.addObstacle({
        x: blocker.x,
        z: blocker.z,
        w: blocker.w + def.blockerPadding * 2,
        d: blocker.d + def.blockerPadding * 2,
      });
    }
  }

  /**
   * Bake the low residential/retaining walls into the navigation grid. Vertical
   * source faces that start near the floor are walls (including retaining
   * walls); roofs and plaza floors are horizontal, and the tall pyramid volumes
   * are already covered by the AABBs.
   */
  private addSiteWallCollision(model: THREE.Object3D, baseY: number, def: AuthoredSiteDef): void {
    if (def.wallCollision.meshPatterns.length === 0) return;
    const corridor = def.walkableCorridor;
    const corridorFrom = corridor ? this.playerCenter(0) : null;
    const corridorTo = corridor ? def.anchor : null;
    const { cols, rows, cell } = this.pathfinder.grid;
    const mask = new Uint8Array(cols * rows);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const maxWallStartY = baseY + def.wallCollision.maxStartYAboveBase;
    model.updateWorldMatrix(true, true);
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.getAttribute('position')) return;
      if (!def.wallCollision.meshPatterns.some((pattern) => pattern.test(mesh.name))) return;
      const position = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.getIndex();
      const count = index ? index.count : position.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i;
        const ib = index ? index.getX(i + 1) : i + 1;
        const ic = index ? index.getX(i + 2) : i + 2;
        a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const uz = b.z - a.z;
        const vx = c.x - a.x;
        const vy = c.y - a.y;
        const vz = c.z - a.z;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (!len || Math.abs(ny) / len >= 0.35) continue;
        if (Math.min(a.y, b.y, c.y) > maxWallStartY) continue;
        const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x) / cell));
        const x1 = Math.min(cols - 1, Math.floor(Math.max(a.x, b.x, c.x) / cell));
        const z0 = Math.max(0, Math.floor(Math.min(a.z, b.z, c.z) / cell));
        const z1 = Math.min(rows - 1, Math.floor(Math.max(a.z, b.z, c.z) / cell));
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) {
            if (corridor) {
              const px = (x + 0.5) * cell;
              const pz = (z + 0.5) * cell;
              if (
                corridorFrom &&
                corridorTo &&
                distanceToSegment(px, pz, corridorFrom, corridorTo) <= corridor.width / 2
              )
                continue;
            }
            mask[z * cols + x] = 1;
          }
        }
      }
    });
    this.pathfinder.blockCells(mask);
  }

  /** Load the authored campaign site; monumental volumes block pathing, not the whole footprint. */
  private spawnAuthoredSite(site: MissionSite): void {
    const def = this.siteDef;
    if (!def) {
      console.warn(`[site] missing authored definition for ${site.id}`);
      return;
    }
    const group = new THREE.Group();
    group.name = 'landmark';
    group.position.set(0, site.y ?? 0, 0);
    this.landmark = group;
    this.landmarkOwnsStatic = true;
    this.scene.add(group);
    if (site.focus) {
      this.siteFocus = { x: site.focus.x * this.settings.mapSize, z: site.focus.z * this.settings.mapSize };
      this.siteCenter = { ...this.siteFocus };
    }
    this.siteAnchor = { ...def.anchor };
    this.addSiteObstacles(def);
    this.addSiteHeritageProxies(group, def.heritageProxies);
    const token = ++this.landmarkLoadToken;
    void loadSiteModel(def.id)
      .then((model) => {
        if (token !== this.landmarkLoadToken || this.landmark !== group) {
          disposeStaticGltf(model);
          return;
        }
        model.name = def.modelName;
        model.scale.setScalar(def.scale);
        model.position.set(def.origin.x, 0, def.origin.z);
        model.traverse((object) => {
          if (def.hideNodePatterns?.some((pattern) => pattern.test(object.name))) object.visible = false;
          if (def.doubleSidedPatterns?.some((pattern) => pattern.test(object.name))) {
            const mesh = object as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) {
              material.side = THREE.DoubleSide;
              material.polygonOffset = true;
              material.polygonOffsetFactor = -2;
              material.polygonOffsetUnits = -2;
            }
          }
          const heritage = def.heritageNodeMap?.find((entry) => entry.pattern.test(object.name));
          if (heritage) object.userData.heritageId = heritage.id;
        });
        group.add(model);
        group.updateMatrixWorld(true);
        this.addSiteWallCollision(model, site.y ?? 0, def);
        applyFowToObject(model, this.fowUniforms);
        this.enableLandmarkShadows(model);
      })
      .catch((error: unknown) => {
        console.warn(`[site] failed to load authored ${def.id} site`, error);
      });
  }

  /** Frame the base, or the base/site midpoint for sites that need both in shot. */
  private missionFraming(x: number, z: number): { x: number; z: number; height?: number } {
    const focus = this.siteFocus;
    if (this.siteDef?.framing === 'midpoint' && focus) {
      return { x: (x + focus.x) / 2, z: (z + focus.z) / 2, height: this.siteDef.cameraHeight };
    }
    if (this.siteDef?.framing === 'site-biased' && focus) {
      return {
        x: x * 0.75 + focus.x * 0.25,
        z: z * 0.75 + focus.z * 0.25,
        height: this.siteDef.cameraHeight + 10,
      };
    }
    if (this.siteDef?.framing === 'site' && focus) {
      return { x: focus.x, z: focus.z, height: this.siteDef.cameraHeight };
    }
    return { x, z, height: this.siteDef?.cameraHeight };
  }

  private frameAuthoredSite(x: number, z: number): void {
    const framing = this.missionFraming(x, z);
    this.camera.moveTo(framing.x, framing.z, true);
    if (framing.height) this.camera.setHeight(framing.height);
  }

  private spawnLandmark(): void {
    const id = this.mapProfile.landmark;
    if (!id) return;
    const def = LANDMARKS[id];
    const civ = getCiv(def.civ);
    const era = getPeriod(def.period).level;
    const ctx: BuildContext = {
      era,
      civ,
      playerColor: new THREE.Color(civ.colors.primary),
      arch: archProfileFor(civ.id, era),
    };
    const size = this.settings.mapSize;
    const rng = new RNG(this.settings.mapSeed * 131 + 11);
    const LANDMARK_CLEAR_RADIUS = 9;
    const clearOf = (px: number, pz: number, radius: number): boolean => {
      for (const b of this.buildings.values()) if (Math.hypot(b.pos.x - px, b.pos.z - pz) < radius) return false;
      for (const n of this.resourceNodes.values()) if (Math.hypot(n.pos.x - px, n.pos.z - pz) < radius) return false;
      return true;
    };
    // The landmark footprint (Caral ~14 x 16, others ~12 x 16) must sit on a
    // broad, gentle pad, not on a cliff edge where its platform would clip.
    const footprintClear = (px: number, pz: number, radius = LANDMARK_CLEAR_RADIUS): boolean => {
      const h0 = this.terrain.getHeight(px, pz);
      if (this.terrain.isWater(px, pz) || this.terrain.isBeach(px, pz)) return false;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        for (const r of [4, radius]) {
          const x = px + Math.cos(a) * r;
          const z = pz + Math.sin(a) * r;
          if (this.terrain.isWater(x, z) || this.terrain.isBeach(x, z)) return false;
          if (Math.abs(this.terrain.getHeight(x, z) - h0) > 1.1) return false;
          if (this.terrain.getSlope(x, z) > 0.45) return false;
        }
      }
      return true;
    };
    const placeSetpiece = (radius: number): { x: number; z: number } | null => {
      const margin = radius + 4;
      for (let i = 0; i < 240; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(26, 36);
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        if (px < margin || px > size - margin || pz < margin || pz > size - margin) continue;
        if (!footprintClear(px, pz, radius)) continue;
        if (!clearOf(px, pz, radius + 2)) continue;
        return { x: px, z: pz };
      }
      return null;
    };
    let x = size / 2;
    let z = size / 2;
    let found = false;
    if (this.setpiecePlan) {
      x = this.setpiecePlan.mainPyramid.x;
      z = this.setpiecePlan.mainPyramid.z;
      found = true;
    }
    if (!found) {
      for (let i = 0; i < 140; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(0.22, 0.34) * size;
        const px = size / 2 + Math.cos(a) * r;
        const pz = size / 2 + Math.sin(a) * r;
        if (!footprintClear(px, pz)) continue;
        if (!clearOf(px, pz, LANDMARK_CLEAR_RADIUS)) continue;
        x = px;
        z = pz;
        found = true;
        break;
      }
    }
    if (!found) {
      const safe = this.findLandNear(size / 2, size / 2, Math.floor(size * 0.42));
      x = safe.x;
      z = safe.z;
    }
    const scenery = def.scenery;
    if (scenery) {
      const placeholder = new THREE.Group();
      placeholder.name = 'landmark';
      placeholder.position.set(x, this.landmarkPadHeight(x, z, scenery.padRadius) + 0.02, z);
      this.landmark = placeholder;
      this.landmarkOwnsStatic = true;
      this.scene.add(placeholder);
      const token = ++this.landmarkLoadToken;
      const mainRotation = this.setpiecePlan ? this.setpiecePlan.mainPyramid.yaw : rng.range(0, Math.PI * 2);
      void loadSceneryModel(scenery.model)
        .then((model) => {
          model.name = scenery.model;
          model.rotation.y = mainRotation;
          if (!this.attachScenery(placeholder, placeholder, model, token, undefined, scenery.model)) return;
          const pad = this.createLandmarkPad(scenery.padRadius, 'caral_landmark_pad');
          placeholder.add(pad);
          applyFowToObject(pad, this.fowUniforms);
        })
        .catch((error: unknown) => {
          console.warn('[landmark] failed to load Caral scenery; using procedural fallback', error);
          if (token !== this.landmarkLoadToken || this.landmark !== placeholder) return;
          this.landmarkLoadToken++;
          this.setpieceLoadToken++;
          this.clearLandmarkScenery(placeholder);
          const fallback = buildLandmarkModel(id, ctx);
          fallback.name = 'caral_ceremonial_fallback';
          fallback.rotation.y = mainRotation;
          this.enableLandmarkShadows(fallback);
          placeholder.add(fallback);
          applyFowToObject(fallback, this.fowUniforms);
          this.landmarkOwnsStatic = false;
          this.buildSacredCity(this.setpiecePlan);
        });
      const moduleToken = ++this.setpieceLoadToken;
      for (const setpiece of scenery.setpieces ?? []) {
        const planned = setpiece.placement
          ? this.setpiecePlan?.placements.find((placement) => placement.name === setpiece.placement)
          : this.setpiecePlan?.placements.find((placement) => placement.modularAnchor);
        const site = planned ?? placeSetpiece(setpiece.padRadius);
        if (!site || (this.setpiecePlan && setpiece.placement && !planned)) {
          console.warn(`[landmark] missing authored setpiece site for ${setpiece.model}`);
          this.fallbackSetpieces(placeholder);
          break;
        }
        const group = new THREE.Group();
        group.name = 'landmark_setpiece';
        group.position.set(
          site.x - x,
          this.landmarkPadHeight(site.x, site.z, setpiecePadRadius(setpiece)) + 0.02 - placeholder.position.y,
          site.z - z,
        );
        const rotation = planned?.yaw ?? rng.range(0, Math.PI * 2);
        group.rotation.y = rotation;
        placeholder.add(group);
        applyFowToObject(group, this.fowUniforms);
        void loadSceneryModel(setpiece.model)
          .then((model) => {
            model.name = setpiece.model;
            if (!this.attachScenery(placeholder, group, model, token, moduleToken, setpiece.model)) return;
            if (setpiece.platform === false) return;
            const pad = this.createLandmarkPad(setpiece.padRadius, 'caral_landmark_setpiece_pad', setpiece.padSize);
            group.add(pad);
            applyFowToObject(pad, this.fowUniforms);
          })
          .catch((error: unknown) => {
            console.warn(`[landmark] failed to load setpiece ${setpiece.model}; using procedural city`, error);
            if (token !== this.landmarkLoadToken || moduleToken !== this.setpieceLoadToken) return;
            this.fallbackSetpieces(placeholder);
          });
      }
      return;
    }
    const model = buildLandmarkModel(id, ctx);
    model.position.set(x, this.terrain.getHeight(x, z), z);
    model.rotation.y = this.setpiecePlan ? this.setpiecePlan.mainPyramid.yaw : rng.range(0, Math.PI * 2);
    model.name = 'landmark';
    this.enableLandmarkShadows(model);
    this.landmark = model;
    applyFowToObject(model, this.fowUniforms);
    this.scene.add(model);
  }

  private attachScenery(
    placeholder: THREE.Group,
    parent: THREE.Object3D,
    model: THREE.Group,
    token: number,
    setpieceToken?: number,
    heritageId?: string,
  ): boolean {
    if (
      token !== this.landmarkLoadToken ||
      (setpieceToken !== undefined && setpieceToken !== this.setpieceLoadToken) ||
      this.landmark !== placeholder
    ) {
      disposeStaticGltf(model);
      return false;
    }
    if (heritageId) model.userData.heritageId = heritageId;
    parent.add(model);
    applyFowToObject(model, this.fowUniforms);
    return true;
  }

  private clearLandmarkScenery(placeholder: THREE.Group): void {
    for (const child of [...placeholder.children]) {
      placeholder.remove(child);
      disposeStaticGltf(child);
    }
  }

  private clearLandmarkSetpieces(placeholder: THREE.Group): void {
    for (const child of [...placeholder.children]) {
      if (child.name !== 'landmark_setpiece') continue;
      placeholder.remove(child);
      disposeStaticGltf(child);
    }
  }

  private fallbackSetpieces(placeholder: THREE.Group): void {
    if (this.landmark !== placeholder) return;
    this.setpieceLoadToken++;
    this.clearLandmarkSetpieces(placeholder);
    this.buildSacredCity(this.setpiecePlan);
  }

  private enableLandmarkShadows(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }

  private landmarkPadHeight(x: number, z: number, radius: number): number {
    let height = this.terrain.getHeight(x, z);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      for (const r of [radius * 0.5, radius]) {
        height = Math.max(height, this.terrain.getHeight(x + Math.cos(angle) * r, z + Math.sin(angle) * r));
      }
    }
    return height;
  }

  private createLandmarkPad(radius: number, name: string, size?: PadSize): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 1, metalness: 0 });
    let pad: THREE.Mesh;
    if (size) {
      const topX = size.x / 2;
      const topZ = size.z / 2;
      const bottomX = topX + 3;
      const bottomZ = topZ + 3;
      const vertices = new Float32Array([
        -topX,
        1.5,
        -topZ,
        topX,
        1.5,
        -topZ,
        topX,
        1.5,
        topZ,
        -topX,
        1.5,
        topZ,
        -bottomX,
        -1.5,
        -bottomZ,
        bottomX,
        -1.5,
        -bottomZ,
        bottomX,
        -1.5,
        bottomZ,
        -bottomX,
        -1.5,
        bottomZ,
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex([0, 3, 2, 0, 2, 1, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
      geometry.computeVertexNormals();
      material.side = THREE.DoubleSide;
      material.flatShading = true;
      pad = new THREE.Mesh(geometry, material);
      pad.name = name;
      pad.position.y = -1.52;
      pad.receiveShadow = true;
      pad.userData.padSize = { ...size };
      pad.userData.padHeight = 3;
      return pad;
    }
    pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 2, 2.2, 32), material);
    pad.name = name;
    pad.position.y = -1.12;
    pad.receiveShadow = true;
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.2, radius + 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    );
    rim.name = `${name}_rim`;
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.005;
    rim.receiveShadow = true;
    pad.add(rim);
    return pad;
  }

  /**
   * Build the visual-only city plan (Caral Alto and Caral Bajo). The Great
   * Pyramid is already the map landmark; this layer adds the other five
   * pyramids, plazas, residential compounds and lower-half temples.
   */
  private spawnSacredCity(): void {
    if (!this.setpiecePlan) return;
    this.buildSacredCity({
      ...this.setpiecePlan,
      placements: this.setpiecePlan.placements.filter((placement) => !placement.modularReplaced),
    });
  }

  private buildSacredCity(plan: CaralCityPlan | null): void {
    if (!plan) return;
    this.setpiece?.dispose();
    this.setpiece = new SacredCity(this.makeBuildContext(0), plan, this.terrain);
    this.setpiece.group.userData.proceduralLower = plan === this.setpiecePlan;
    this.setpiece.group.userData.placements = plan.placements.map((placement) => placement.name ?? placement.kind);
    applyFowToObject(this.setpiece.group, this.fowUniforms);
    this.scene.add(this.setpiece.group);
  }

  /**
   * Place the map's cultural landscape (roads, fields, plazas, canals; visual
   * only, deterministic). Derived from `seed + profile`, so it is regenerated on
   * load and never saved (like the terrain and the landmark).
   */
  private spawnMissionDecor(): void {
    const decor = this.missionLayout?.decor;
    if (!decor) return;
    const owner = decor.at === 'enemy' ? 1 : 0;
    const center = [...this.buildings.values()].find(
      (b) => b.owner === owner && b.kind === BuildingKind.CENTER && !b.dead,
    );
    if (!center) return;
    const x = center.pos.x + decor.dx;
    const z = center.pos.z + decor.dz;
    const site = this.findLandNear(x, z, 18);
    const group = new THREE.Group();
    group.name = `mission_decor_${decor.model}`;
    group.position.set(site.x, this.terrain.getHeight(site.x, site.z), site.z);
    group.rotation.y = decor.yaw ?? 0;
    group.scale.setScalar(decor.scale ?? 1);
    if (decor.glb) group.userData.authoredGlb = decor.glb;
    this.scene.add(group);
    this.scenarioDecor = group;
    if (decor.glb) {
      void loadDecorModel(decor.glb)
        .then((model) => {
          if (this.scenarioDecor !== group) return;
          model.name = decor.glb!;
          group.add(model);
          this.enableLandmarkShadows(model);
          applyFowToObject(model, this.fowUniforms);
        })
        .catch((error: unknown) => {
          console.warn(`[decor] failed to load ${decor.glb}; using procedural fallback`, error);
          if (this.scenarioDecor !== group) return;
          const fallback = buildLandmarkModel(decor.model, this.makeBuildContext(owner));
          group.add(fallback);
          this.enableLandmarkShadows(fallback);
          applyFowToObject(fallback, this.fowUniforms);
        });
    } else {
      const model = buildLandmarkModel(decor.model, this.makeBuildContext(owner));
      group.add(model);
      this.enableLandmarkShadows(model);
      applyFowToObject(model, this.fowUniforms);
    }
  }

  private spawnCanal(): void {
    const spec = this.missionLayout?.canal;
    if (!spec || !this.canalSite) return;
    const group = new THREE.Group();
    group.name = 'canal';
    if (spec.heritageId) group.userData.heritageId = spec.heritageId;
    const length = spec.length ?? 24;
    group.position.set(this.canalSite.x, this.terrain.getHeight(this.canalSite.x, this.canalSite.z), this.canalSite.z);
    group.rotation.y = spec.yaw ?? 0;
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.12, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2f6f7a, roughness: 0.45, metalness: 0.1 }),
    );
    water.name = 'canal_water';
    water.position.y = 0.08;
    water.receiveShadow = true;
    group.add(water);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x9a8460, roughness: 1, metalness: 0 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.7, 0.5), wallMaterial);
      wall.name = 'canal_bank';
      wall.position.set(0, 0.35, side * 1.35);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 3.2), wallMaterial);
    gate.name = 'canal_gate';
    gate.position.set(length / 2, 0.8, 0);
    gate.castShadow = true;
    gate.receiveShadow = true;
    group.add(gate);
    this.canalGate = gate;
    applyFowToObject(group, this.fowUniforms);
    this.scene.add(group);
    this.canalGroup = group;
    this.canalWater = water;
    this.updateCanalVisual();
  }

  private spawnCulturalLandscape(): void {
    this.landscape = new CulturalLandscape(this.terrain, this.mapProfile, this.settings.mapSeed);
    applyFowToObject(this.landscape.group, this.fowUniforms);
    this.scene.add(this.landscape.group);
  }

  /** Keep authored city/canal footprints free of procedural resources and props. */
  private isReserved(x: number, z: number, includeOpening = true): boolean {
    if (includeOpening && this.isStartReserved(x, z)) return true;
    if (this.setpiecePlan && inCaralCity(this.setpiecePlan, x, z, 1)) return true;
    const site = this.missionLayout?.site;
    if (site?.keepout) {
      const size = this.settings.mapSize;
      for (const r of site.keepout) {
        if (Math.abs(x - r.x * size) <= r.rx * size && Math.abs(z - r.z * size) <= r.rz * size) return true;
      }
    }
    if (this.canalSite) {
      const length = this.missionLayout?.canal?.length ?? 24;
      if (Math.hypot(x - this.canalSite.x, z - this.canalSite.z) < length / 2 + 6) return true;
    }
    for (const field of this.caralValleyPlan?.fields ?? []) {
      const radius = field.size / 2 + VALLEY_FIELD_MARGIN;
      if (Math.abs(x - field.x) <= radius && Math.abs(z - field.z) <= radius) return true;
    }
    return false;
  }

  private spawnResources(): void {
    const s = this.settings;
    const rng = new RNG(this.settings.mapSeed * 31 + 1);
    const mapType = this.mapProfile.baseMapType;
    const variants = this.mapProfile.vegetation.variants;
    const n = Math.floor((s.mapSize * s.mapSize) / 1000);
    let placed = 0;
    let guard = 0;
    while (placed < n && guard++ < n * 4) {
      const x = rng.range(15, s.mapSize - 15);
      const z = rng.range(15, s.mapSize - 15);
      if (this.terrain.isWater(x, z) || this.isReserved(x, z)) continue;
      const h = this.terrain.getHeight(x, z);
      const kind = this.pickResourceKind(rng, x, z, h);
      const amount =
        kind === 'tree'
          ? rng.range(140, 220)
          : kind === 'mine'
            ? rng.range(300, 450)
            : kind === 'well'
              ? rng.range(250, 380)
              : kind === 'berry'
                ? rng.range(120, 180)
                : rng.range(200, 300);
      const node = new ResourceNode(this.scene, kind, x, z, amount, mapType, this.trees, variants);
      node.pos.y = this.terrain.getHeight(x, z);
      node.view.position.set(x, node.pos.y, z);
      node.placeTreeInstance(node.pos.y);
      this.resourceNodes.set(node.id, node);
      this.registerResourceObstacle(node.id, x, z, kind);
      placed++;
    }
    // hunting and fishing (counts from the profile)
    const huntCount = Math.max(0, Math.round(this.mapProfile.resources.hunt));
    for (let i = 0; i < huntCount; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (this.terrain.isWater(x, z) || this.isReserved(x, z)) continue;
      const node = new ResourceNode(this.scene, 'hunt', x, z, rng.range(120, 180), mapType, undefined, variants);
      node.pos.y = this.terrain.getHeight(x, z);
      node.view.position.set(x, node.pos.y, z);
      this.resourceNodes.set(node.id, node);
    }
    const fishingCount = Math.round(this.mapProfile.resources.fishing);
    for (let i = 0; i < fishingCount; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (!this.terrain.isWater(x, z)) continue;
      const node = new ResourceNode(this.scene, 'fishing', x, z, rng.range(150, 220), mapType);
      node.pos.y = 0;
      node.view.position.set(x, 0, z);
      this.resourceNodes.set(node.id, node);
    }
    // The random coastal samples can miss the few water cells near shore; a
    // scenario that depends on fishing asks for a guaranteed reachable supply.
    const mis = s.missionId ? getMission(s.missionId) : undefined;
    for (let i = 0; i < (mis?.guaranteedFishing ?? 0); i++) this.spawnFishingNearShore(rng);
  }

  /** Fill a scenario's minimum fishing supply after loading an older save. */
  private ensureFishingGrounds(min: number): void {
    const have = [...this.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead).length;
    if (have >= min) return;
    const rng = new RNG((this.settings.mapSeed * 2654435761 + 97) >>> 0);
    for (let i = have; i < min; i++) this.spawnFishingNearShore(rng);
  }

  private spawnFishingNearShore(rng: RNG): boolean {
    const size = this.settings.mapSize;
    const candidates: { x: number; z: number }[] = [];
    const existing = [...this.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead);
    for (let x = FISHING_SCAN_MARGIN; x < size - FISHING_SCAN_MARGIN; x += 2) {
      for (let z = FISHING_SCAN_MARGIN; z < size - FISHING_SCAN_MARGIN; z += 2) {
        if (!this.terrain.isWater(x, z)) continue;
        if (existing.some((n) => distance2D(x, z, n.pos.x, n.pos.z) < 5)) continue;
        let nearLand = false;
        for (let i = 0; i < 8 && !nearLand; i++) {
          const a = (i / 8) * Math.PI * 2;
          nearLand = !this.terrain.isWater(x + Math.cos(a) * 5, z + Math.sin(a) * 5);
        }
        if (nearLand) candidates.push({ x, z });
      }
    }
    if (candidates.length === 0) return false;
    const spot = rng.pick(candidates);
    const node = new ResourceNode(
      this.scene,
      'fishing',
      spot.x,
      spot.z,
      rng.range(150, 220),
      this.mapProfile.baseMapType,
    );
    node.pos.y = 0;
    node.view.position.set(spot.x, 0, spot.z);
    this.resourceNodes.set(node.id, node);
    return true;
  }

  /**
   * Ambient life (visual only): scatter props and place fauna from the region
   * profile + seed. Deterministic and regenerated on load (not saved).
   */
  private spawnAmbient(): void {
    const s = this.settings;
    const region = this.mapProfile.region;
    const heightAt = (x: number, z: number): number => this.terrain.getHeight(x, z);
    const propSeed = s.mapSeed * AMBIENT_PROP_SEED + 3;
    const faunaSeed = s.mapSeed * AMBIENT_FAUNA_SEED + 5;
    const query = {
      isWater: (x: number, z: number) => this.terrain.isWater(x, z) || this.isReserved(x, z),
      isBuildable: (x: number, z: number) =>
        this.terrain.isBuildable(x, z) && !this.isReserved(x, z) && !this.isStartReserved(x, z),
      getSlope: (x: number, z: number) => this.terrain.getSlope(x, z),
      getHeight: (x: number, z: number) => this.terrain.getHeight(x, z),
      isBeach: (x: number, z: number) => this.terrain.isBeach(x, z),
      getMoisture: (x: number, z: number) => this.terrain.getMoisture(x, z),
    };
    const propCount = propCountFor(s.mapSize);
    let placements = planProps(region, propSeed, s.mapSize, propCount, query);
    let fauna = planWildlife(region, faunaSeed, s.mapSize, faunaCountFor(region), query);
    if (this.siteDef?.environs?.valley === 'caral') {
      const base = this.caralValleyBase ?? this.playerCenter(0);
      const suppressedProps = new Set(this.siteDef.environs.suppressPropIds ?? []);
      placements = placements.filter((p) => !suppressedProps.has(p.id));
      placements.push(...planCaralValleyProps(this.settings.mapSeed, base, this.caralValleyQuery()));
      const suppressedFauna = new Set(this.siteDef.environs.suppressFaunaIds ?? []);
      fauna = fauna.filter((f) => !suppressedFauna.has(f.id));
    }
    this.props.place(placements, heightAt);
    this.wildlife.spawn(fauna, heightAt);
  }

  /** Geography-driven resource pick: profile weights, gated by height, beach, moisture and slope. */
  private pickResourceKind(rng: RNG, x: number, z: number, h: number): ResourceNode['kind'] {
    const w = this.mapProfile.resources;
    const beach = this.terrain.isBeach(x, z);
    const high = h > 6;
    const mid = h > 3;
    const moist = this.terrain.getMoisture(x, z);
    const slope = this.terrain.getSlope(x, z);
    const options: Array<[ResourceNode['kind'], number]> = [
      ['mine', w.mine * (high ? 2.5 : mid ? 1.5 : 0.5) * (0.6 + slope * 1.4)],
      ['tree', w.tree * (high ? 0.3 : 1) * (0.4 + moist)],
      ['well', w.well * (beach ? 0.05 : 0.8) * (0.6 + slope * 1.8) * (high ? 1.4 : 1)],
      ['berry', w.berry * (beach ? 1.2 : 0.7) * (0.5 + moist)],
    ];
    return weightedPick(rng, options) ?? 'tree';
  }

  /** Resolve a mission point against the player/enemy base, site, canal or landmark. */
  resolveMissionPoint(p: MissionPoint): { x: number; z: number } {
    const centre = { x: this.settings.mapSize / 2, z: this.settings.mapSize / 2 };
    const ref =
      p.ref === 'enemy'
        ? this.playerCenter(1)
        : p.ref === 'player'
          ? this.playerCenter(0)
          : p.ref === 'canal'
            ? (this.canalSite ?? centre)
            : p.ref === 'site'
              ? (this.siteCenter ?? centre)
              : p.ref === 'landmark'
                ? (this.siteAnchor ?? this.landmark?.position ?? centre)
                : { x: 0, z: 0 };
    return { x: ref.x + p.dx, z: ref.z + p.dz };
  }

  /** Draw the mission's visual road network; no pathfinding or gameplay effect. */
  private spawnMissionRoads(): void {
    const roads = this.missionLayout?.roads;
    if (!roads?.length) return;
    for (const overlay of this.settlements.filter((s) => s.group.name.startsWith('mission-roads'))) {
      overlay.dispose();
    }
    this.settlements = this.settlements.filter((s) => !s.group.name.startsWith('mission-roads'));
    const groups = new Map<number, typeof roads>();
    for (const road of roads) {
      const width = road.width ?? 4;
      groups.set(width, [...(groups.get(width) ?? []), road]);
    }
    let index = 0;
    for (const [width, group] of groups) {
      const plan: SettlementPlan = {
        center: this.siteCenter ?? this.playerCenter(0),
        dwellings: [],
        fields: [],
        roads: group.map((road) => ({
          from: this.resolveMissionPoint(road.from),
          to: this.resolveMissionPoint(road.to),
        })),
      };
      const overlay = new SettlementOverlay(plan, this.terrain, { roadWidth: width });
      overlay.group.name = index === 0 ? 'mission-roads' : `mission-roads-${width}`;
      applyFowToObject(overlay.group, this.fowUniforms);
      this.scene.add(overlay.group);
      this.settlements.push(overlay);
      index++;
    }
  }

  /** Register a building as a pathfinding obstacle. */
  private registerObstacle(b: Building): void {
    const stats = getBuildingStats(b.kind, b.era);
    const handle = { x: b.pos.x, z: b.pos.z, radius: stats.size * 0.6 };
    this.obstacleHandles.set(b.id, handle);
    this.pathfinder.addObstacle(handle);
  }

  /** Register a solid resource node as a pathfinding obstacle (animals/fish are not). */
  private registerResourceObstacle(id: number, x: number, z: number, kind: ResourceNode['kind']): void {
    if (kind === 'hunt' || kind === 'fishing') return;
    const handle = { x, z, radius: kind === 'tree' ? 0.5 : 1.1 };
    this.obstacleHandles.set(id, handle);
    this.pathfinder.addObstacle(handle);
  }

  private spawnStartBase(player: number, x: number, z: number): void {
    const ctx = this.makeBuildContext(player);
    // center
    const center = new Building(BuildingKind.CENTER, player, this.players[player].era, ctx);
    center.pos.set(x, 0, z);
    center.pos.y = this.terrain.getHeight(x, z);
    center.attach(this.scene);
    center.beginConstruction();
    center.addBuildProgress(9999);
    this.buildings.set(center.id, center);
    this.registerObstacle(center);
    // starting dwellings + visual fields/roads, laid out by the terrain-aware planner
    const plan = this.settlementPlanFor(player, x, z);
    for (const spot of plan.dwellings) {
      const house = new Building(BuildingKind.HOUSE, player, this.players[player].era, ctx);
      house.pos.set(spot.x, this.terrain.getHeight(spot.x, spot.z), spot.z);
      house.attach(this.scene);
      house.beginConstruction();
      house.addBuildProgress(9999);
      this.buildings.set(house.id, house);
      this.registerObstacle(house);
    }
    this.addSettlementOverlay(plan);
    const civ = this.players[player].civ;
    if (civ === CivId.CARAL || civ === CivId.CHAVIN) {
      this.addSettlementDressing(plan, player, civ === CivId.CHAVIN ? 'chavin' : 'caral');
    }
    if (player === 0 && this.siteDef?.environs?.valley === 'caral') this.addCaralValley(x, z);
    // nearby resources to start
    this.spawnStartResources(player, x, z);
    const rng = new RNG(this.settings.mapSeed + player * 100);
    // The Caral opening deploys outside the civic core, on the camera-facing
    // side where the frame reads. Other matches and AI seats keep their ring.
    const startingSpots =
      player === 0 && this.siteDef?.environs?.opening === 'caral' ? this.startingUnitSpots(x, z) : null;
    for (let i = 0; i < STARTING_UNIT_COUNT - 1; i++) {
      const unit = new Unit(UnitKind.WORKER, player, this.players[player].era, ctx);
      const raw = startingSpots?.[i] ?? { x: x + rng.range(-3, 3), z: z + rng.range(-3, 3) };
      const spot = this.mainComponentSpot(raw.x, raw.z);
      unit.pos.set(spot.x, this.terrain.getHeight(spot.x, spot.z), spot.z);
      unit.setContext(this.unitContext);
      this.applyPlayerBonuses(unit, this.players[player]);
      unit.attach(this.scene);
      this.units.set(unit.id, unit);
      this.players[player].populationUsed += unit.stats.population;
    }
    const scout = new Unit(UnitKind.SCOUT, player, this.players[player].era, ctx);
    const rawScout = startingSpots?.[STARTING_UNIT_COUNT - 1] ?? { x: x + 4, z: z + 4 };
    const scoutSpot = this.mainComponentSpot(rawScout.x, rawScout.z);
    scout.pos.set(scoutSpot.x, this.terrain.getHeight(scoutSpot.x, scoutSpot.z), scoutSpot.z);
    scout.setContext(this.unitContext);
    this.applyPlayerBonuses(scout, this.players[player]);
    scout.attach(this.scene);
    this.units.set(scout.id, scout);
    this.players[player].populationUsed += scout.stats.population;
    // auto-gathering
    // AI seats start gathering immediately; the human player keeps control of
    // the opening workers so they stay selectable at the base. AI-vs-AI seats
    // get their orders from the AI controller on its first update.
    if (this.players[player]?.isAI) this.assignInitialWorkers(player, x, z);
  }

  /**
   * Free deployment spots around a new base, away from every building and
   * resource. The first four sit on the camera-facing arc; the fifth is the scout.
   */
  private startingUnitSpots(x: number, z: number): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = [];
    for (let i = 0; i < STARTING_UNIT_COUNT; i++) {
      let found: { x: number; z: number } | null = null;
      for (const radius of STARTING_UNIT_RADII) {
        for (const offset of STARTING_UNIT_ANGLES) {
          const angle = Math.PI / 2 + offset;
          const px = x + Math.cos(angle) * radius;
          const pz = z + Math.sin(angle) * radius;
          if (this.startingUnitSpotClear(px, pz, out)) {
            found = { x: px, z: pz };
            break;
          }
        }
        if (found) break;
      }
      const fallback = found ?? this.startingUnitFallback(x, z, out);
      out.push({ x: fallback.x, z: fallback.z });
    }
    return out;
  }

  private startingUnitFallback(x: number, z: number, used: { x: number; z: number }[]): { x: number; z: number } {
    const fallback = this.findFreeSpot(x, z, 2) ?? this.findLandNear(x, z, 24);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 2 + i * 0.8;
      const px = fallback.x + Math.cos(angle) * radius;
      const pz = fallback.z + Math.sin(angle) * radius;
      if (this.startingUnitSpotClear(px, pz, used)) return { x: px, z: pz };
    }
    return fallback;
  }

  private startingUnitSpotClear(x: number, z: number, used: { x: number; z: number }[]): boolean {
    if (this.terrain.isWater(x, z) || this.terrain.isBeach(x, z)) return false;
    if (this.terrain.getSlope(x, z) > MAX_WALKABLE_SLOPE) return false;
    for (const b of this.buildings.values()) {
      if (b.dead) continue;
      if (distance2D(x, z, b.pos.x, b.pos.z) < b.radius + 0.9) return false;
    }
    for (const n of this.resourceNodes.values()) {
      if (n.dead) continue;
      if (distance2D(x, z, n.pos.x, n.pos.z) < n.radius + 0.6) return false;
    }
    return used.every((p) => distance2D(x, z, p.x, p.z) >= 1.1);
  }

  /** Deterministic settlement plan for a base at (x, z) (dwellings + fields + roads). */
  private settlementPlanFor(player: number, x: number, z: number): SettlementPlan {
    const shape = this.mapProfile.culturalLandscape?.settlementShape ?? 'dispersed';
    return planSettlementSite(
      { shape, seed: this.settings.mapSeed * 131 + player * 100 + 1, anchor: { x, z }, count: 3 },
      this.terrain,
    );
  }

  /** Add the visual fields/roads of a planned settlement (no entities, no obstacles). */
  private addSettlementOverlay(plan: SettlementPlan): void {
    const overlay = new SettlementOverlay(plan, this.terrain);
    applyFowToObject(overlay.group, this.fowUniforms);
    this.scene.add(overlay.group);
    this.settlements.push(overlay);
  }

  /** Household/ritual props around a base (visual only, deterministic, no obstacles). */
  private addSettlementDressing(plan: SettlementPlan, player: number, profile: 'caral' | 'chavin'): void {
    const placements = planSettlementDressing(
      plan,
      this.settings.mapSeed * 977 + player * 31 + 7,
      this.terrain,
      profile,
    );
    const dressing = new SettlementDressing(placements, (x, z) => this.terrain.getHeight(x, z));
    applyFowToObject(dressing.group, this.fowUniforms);
    this.scene.add(dressing.group);
    this.settlementDressing.push(dressing);
  }

  private caralValleyQuery(): CaralValleyQuery {
    return {
      isWater: (px, pz) => this.terrain.isWater(px, pz),
      isBuildable: (px, pz) => this.terrain.isBuildable(px, pz),
      getSlope: (px, pz) => this.terrain.getSlope(px, pz),
      isReserved: (px, pz) => this.isReserved(px, pz),
    };
  }

  private planCaralValleyAt(x: number, z: number): CaralValleyPlan {
    return planCaralValley(
      this.settings.mapSeed * 97 + 31,
      { x, z },
      this.caralValleyQuery(),
      this.caralValleySiteTarget() ?? undefined,
    );
  }

  /** Open ground just west of the Anfiteatro, derived from the authored proxy. */
  private caralValleySiteTarget(): { x: number; z: number } | null {
    const anf = this.siteDef?.heritageProxies.find((p) => p.id === 'caral_anfiteatro');
    return anf ? { x: anf.x - anf.w / 2 - 4, z: anf.z } : null;
  }

  /** Visual-only riverside fields and paths; no entities, obstacles or yields. */
  private addCaralValley(x: number, z: number): void {
    const valley = this.caralValleyPlan ?? this.planCaralValleyAt(x, z);
    this.caralValleyPlan = valley;
    this.caralValleyBase ??= { x, z };
    if (!valley.fields.length && !valley.roads.length) return;
    const overlay = new SettlementOverlay(
      { center: { x, z }, dwellings: [], fields: valley.fields, roads: valley.roads },
      this.terrain,
      { roadWidth: CARAL_VALLEY_PATH_WIDTH, fieldBorders: true },
    );
    overlay.group.name = 'caral-valley';
    applyFowToObject(overlay.group, this.fowUniforms);
    this.scene.add(overlay.group);
    this.settlements.push(overlay);
  }

  private spawnStartResources(player: number, x: number, z: number): void {
    const rng = new RNG(this.settings.mapSeed + player * 911);
    const place = (kind: ResourceNode['kind'], amount: number, dx: number, dz: number) => {
      const nx = x + dx;
      const nz = z + dz;
      if (this.isReserved(nx, nz, false)) return;
      const node = new ResourceNode(
        this.scene,
        kind,
        nx,
        nz,
        amount,
        this.mapProfile.baseMapType,
        this.trees,
        this.mapProfile.vegetation.variants,
      );
      node.pos.y = this.terrain.getHeight(nx, nz);
      node.view.position.set(nx, node.pos.y, nz);
      node.placeTreeInstance(node.pos.y);
      this.resourceNodes.set(node.id, node);
      this.registerResourceObstacle(node.id, nx, nz, kind);
    };
    // Trees: in the authored Caral scene the wood grove sits on the valley edge
    // (the gallery forest of the Supe), not inside the residential compounds.
    if (this.siteDef?.environs?.opening === 'caral') {
      // Keep the authored site core clear: wood and the opening stone/berries sit
      // west of the terrace or south of the keep-out, not on the plazas.
      for (let i = 0; i < 5; i++) {
        place('tree', rng.range(140, 200), -18 + rng.range(-1.5, 1.5), rng.range(-1.5, 1.5));
      }
      place('well', 400, -18, 20);
      place('berry', 150, 20, 20);
    } else if (this.setpiecePlan) {
      const grove = this.setpiecePlan;
      // Keep the base -> ford axis clear: the gallery forest sits west of it,
      // on the valley edge, and the opening mine/berries sit in the base ring.
      for (let i = 0; i < 8; i++) {
        const tx = grove.lower.x - 14 + rng.range(-4, 4);
        const tz = grove.lower.z - 22 + rng.range(-2, 2);
        place('tree', rng.range(140, 200), tx - x, tz - z);
      }
      place('mine', 400, -13, -24);
      place('berry', 150, 12, -24);
    } else {
      for (let i = 0; i < 10; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(8, 13);
        place('tree', rng.range(140, 200), Math.cos(a) * r, Math.sin(a) * r);
      }
      // steel mine
      const ma = rng.range(0, Math.PI * 2);
      place('mine', 400, Math.cos(ma) * 12, Math.sin(ma) * 12);
      // berries
      place('berry', 150, rng.range(-6, 6), rng.range(9, 13));
    }
    // well (if the era allows it)
    if (this.players[player].era >= Era.TAHUANTINSUYO) {
      const wa = rng.range(0, Math.PI * 2);
      place('well', 300, Math.cos(wa) * 14, Math.sin(wa) * 14);
    }
  }

  private assignInitialWorkers(player: number, x: number, z: number): void {
    const workers = [...this.units.values()].filter((u) => u.owner === player && u.kind === UnitKind.WORKER);
    const foods = [...this.resourceNodes.values()].filter((n) => n.resource === 'food' && n.kind === 'berry');
    const woods = [...this.resourceNodes.values()].filter((n) => n.resource === 'wood');
    const steels = [...this.resourceNodes.values()].filter((n) => n.resource === 'silver');
    const stones = [...this.resourceNodes.values()].filter((n) => n.resource === 'stone');
    const nearest = (list: ResourceNode[], px: number, pz: number) =>
      list.reduce(
        (best, n) =>
          best ? (distance2D(px, pz, n.pos.x, n.pos.z) < distance2D(px, pz, best.pos.x, best.pos.z) ? n : best) : n,
        null as ResourceNode | null,
      );
    const foodNode = nearest(foods, x, z);
    const woodNode = nearest(woods, x, z);
    const mineralNode = nearest(steels.length ? steels : stones, x, z);
    const plan = [foodNode, woodNode, woodNode, mineralNode];
    workers.forEach((w, i) => {
      const node = plan[i] ?? foodNode;
      if (node) {
        w.issueOrder({ kind: OrderKind.GATHER, entityId: node.id });
      }
    });
  }

  makeBuildContext(player: number): BuildContext {
    const p = this.players[player];
    const civ = getCiv(p.civ);
    return {
      era: p.era,
      civ,
      playerColor: new THREE.Color(civ.colors.primary),
      arch: archProfileFor(civ.id, p.era),
      caralSetpiece: !!this.setpiecePlan || !!this.missionLayout?.site,
    };
  }

  /** Center of a player (its main building) or the map center. */
  playerCenter(owner: number): { x: number; z: number } {
    const c = [...this.buildings.values()].find((b) => b.owner === owner && b.kind === BuildingKind.CENTER && !b.dead);
    if (c) return { x: c.pos.x, z: c.pos.z };
    return { x: this.settings.mapSize / 2, z: this.settings.mapSize / 2 };
  }

  /** Find the nearest solid land to a point (for scripted spawns). */
  findLandNear(x: number, z: number, radius = 16): { x: number; z: number } {
    if (!this.terrain.isWater(x, z) && !this.terrain.isBeach(x, z)) return { x, z };
    for (let r = 3; r <= radius; r += 3) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const nx = x + Math.cos(ang) * r;
        const nz = z + Math.sin(ang) * r;
        if (!this.terrain.isWater(nx, nz)) return { x: nx, z: nz };
      }
    }
    const c = this.playerCenter(0);
    return { x: c.x, z: c.z };
  }

  /** Create a scripted unit (campaign). */
  spawnScriptedUnit(kind: UnitKind, owner: number, x: number, z: number, tag?: string): Unit {
    const era = this.players[owner]?.era ?? this.settings.startingEra;
    const ctx = this.makeBuildContext(owner);
    const land = this.findLandNear(x, z);
    const main = this.pathfinder.mainComponent();
    const spot =
      this.pathfinder.componentAt(land.x, land.z) === main ? land : (this.mainComponentPoint(land.x, land.z) ?? land);
    const u = new Unit(kind, owner, era, ctx);
    u.pos.set(spot.x, this.terrain.getHeight(spot.x, spot.z), spot.z);
    u.setContext(this.unitContext);
    if (this.players[owner]) this.applyPlayerBonuses(u, this.players[owner]);
    u.attach(this.scene);
    if (tag) u.tag = tag;
    this.units.set(u.id, u);
    const p = this.players[owner];
    if (p) p.populationUsed += u.stats.population;
    return u;
  }

  /** Create a scripted building (campaign), already finished. */
  spawnScriptedBuilding(kind: BuildingKind, owner: number, x: number, z: number, tag?: string): Building {
    const era = this.players[owner]?.era ?? this.settings.startingEra;
    const ctx = this.makeBuildContext(owner);
    const land = this.findLandNear(x, z, 26);
    const b = new Building(kind, owner, era, ctx);
    b.pos.set(land.x, this.terrain.getHeight(land.x, land.z), land.z);
    this.applyTerrainFarmYield(b);
    b.attach(this.scene);
    b.beginConstruction();
    b.addBuildProgress(9999);
    if (tag) b.tag = tag;
    this.buildings.set(b.id, b);
    this.registerObstacle(b);
    return b;
  }

  private applyMissionSetup(mis: MissionDef): void {
    const p = this.players[0];
    p.resources = { ...mis.startingResources };
    const c = this.playerCenter(0);
    for (const e of mis.start.buildings ?? []) {
      this.spawnScriptedBuilding(e.kind, 0, c.x + e.dx, c.z + e.dz, e.tag);
    }
    for (const u of mis.start.units ?? []) {
      for (let i = 0; i < (u.count ?? 1); i++) {
        const jx = this.rng.range(-1.5, 1.5);
        const jz = this.rng.range(-1.5, 1.5);
        this.spawnScriptedUnit(u.kind, 0, c.x + u.dx + jx, c.z + u.dz + jz, u.tag);
      }
    }
    this.frameAuthoredSite(c.x, c.z);
  }

  /** Re-apply the authored-site opening framing after the briefing closes. */
  reframeMissionOpening(): void {
    if (!this.missionLayout?.site) return;
    const c = this.playerCenter(0);
    this.frameAuthoredSite(c.x, c.z);
  }

  /** True while the opening flight or the chapter title card is holding the mission clock. */
  isCinematicActive(): boolean {
    return this.camera.isFlying() || this.hud.isMissionCardOpen();
  }

  /** Campaign intro: a short overview flight down to the player's base. */
  playIntro(): void {
    if (!this.introEnabled) return;
    const c = this.playerCenter(0);
    const city = this.siteFocus ?? this.setpiecePlan?.upper;
    if (city) {
      this.camera.moveTo(city.x, city.z, true);
      this.camera.setHeight(INTRO_CAMERA.fromHeight + 12);
    } else {
      this.camera.moveTo(c.x + INTRO_CAMERA.offset, c.z + INTRO_CAMERA.offset, true);
      this.camera.setHeight(INTRO_CAMERA.fromHeight);
    }
    const framing = this.missionFraming(c.x, c.z);
    this.camera.flyTo(framing.x, framing.z, framing.height ?? INTRO_CAMERA.toZoom, INTRO_CAMERA.seconds);
  }

  private missionEnd(win: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    const mis = this.mission?.def;
    if (mis) {
      if (win) this.hud.saveCampaignProgress(mis.id);
      this.hud.showVictory(win, mis.victory, mis.defeat);
    } else {
      this.hud.showVictory(win);
    }
    this.loop.stop();
    this.audio.uiClick?.();
  }

  private initHUD(): void {
    this.hud = new HUD(this);
    bus.on('player:era', (e) => {
      if (e.player === 0) this.hud.showEraBanner(e.era);
    });
    bus.on('game:end', (e) => {
      if (e.winner === 0) {
        this.hud.showVictory(true);
      } else if (e.winner === 1) {
        this.hud.showVictory(false);
      }
    });
    bus.on('wonder:time', (e) => {
      if (this.settings.victoryMode === 'wonder' && e.time >= this.wonderReqTime) {
        this.endGame(e.owner);
      }
    });
  }

  /** Restart the match with the current configuration. */
  resetGame(): void {
    try {
      localStorage.setItem('peru-settings', JSON.stringify(this.settings));
    } catch {
      /* noop */
    }
    // ?play=1 avoids showing the main menu again after reloading
    const url = new URL(location.href);
    url.searchParams.set('play', '1');
    url.searchParams.delete('load');
    if (this.settings.missionId) url.searchParams.set('mission', this.settings.missionId);
    else url.searchParams.delete('mission');
    location.href = url.toString();
  }

  /** Serialize the current match into the single save slot. Returns false if unavailable or the match is over. */
  saveMatch(): boolean {
    if (this.gameEnded) return false;
    return saveToStorage(serializeGame(this));
  }

  /** Reload the page into the saved match. */
  loadMatch(): void {
    const url = new URL(location.href);
    url.searchParams.set('load', '1');
    url.searchParams.delete('mission');
    url.searchParams.delete('menu');
    location.href = url.toString();
  }

  /** Reload the page into a recorded replay. */
  loadReplayMatch(): void {
    const url = new URL(location.href);
    url.searchParams.set('replay', '1');
    url.searchParams.delete('load');
    url.searchParams.delete('mission');
    url.searchParams.delete('menu');
    location.href = url.toString();
  }

  /**
   * Apply a player command, recording it for the replay when enabled. This is the
   * single entry point for player intent, so a replay only has to feed the same
   * commands back at the same steps.
   */
  executeCommand(cmd: PlayerCommand, record = true): boolean {
    // no live input during playback: it would desync the replay
    if (this.replay && record) return false;
    if (record && this.recorder) this.recorder.record(this.stepCount, cmd);
    return this.applyCommand(cmd);
  }

  /** A stable hash of the gameplay state (replay/determinism verification). */
  stateHash(): number {
    const units = [...this.units.values()]
      .filter((u) => !u.dead)
      .sort((a, b) => a.id - b.id)
      .map((u) => [
        u.id,
        u.owner,
        u.kind,
        u.pos.x,
        u.pos.z,
        u.hp,
        u.orderQueue.map((o) => [o.kind, o.entityId ?? null, o.target?.x ?? null, o.target?.z ?? null]),
      ]);
    const buildings = [...this.buildings.values()]
      .filter((b) => !b.dead)
      .sort((a, b) => a.id - b.id)
      .map((b) => [
        b.id,
        b.owner,
        b.kind,
        b.pos.x,
        b.pos.z,
        b.hp,
        b.constructionComplete,
        b.constructionProgress,
        b.productionQueue.map((q) => q.unit),
        b.researchQueue,
        b.foodAmount,
      ]);
    const nodes = [...this.resourceNodes.values()]
      .filter((n) => !n.dead)
      .sort((a, b) => a.id - b.id)
      .map((n) => [n.id, n.amount, n.depleted]);
    const players = this.players.map((p) => [
      p.id,
      p.era,
      p.resources.food,
      p.resources.wood,
      p.resources.silver,
      p.resources.stone,
      p.populationUsed,
      [...p.techs].sort(),
      p.alive,
    ]);
    return hashCode(JSON.stringify({ units, buildings, nodes, players, rng: this.rng.getState() }));
  }

  /** The replay recorded so far (skirmish only), or null. */
  exportReplay(): Replay | null {
    return this.recorder ? this.recorder.toReplay() : null;
  }

  /** True while a replay is being played back. */
  get replayActive(): boolean {
    return this.replay !== null;
  }

  /** Route a single-unit order through the command layer (records it for replays). */
  private orderUnit(u: Unit, order: Order, clear: boolean): void {
    this.executeCommand({ kind: 'order', unitIds: [u.id], order, clear });
  }

  private applyCommand(cmd: PlayerCommand): boolean {
    switch (cmd.kind) {
      case 'order':
        for (const id of cmd.unitIds) {
          const u = this.units.get(id);
          if (u && !u.dead) u.issueOrder(cmd.order, cmd.clear);
        }
        return true;
      case 'stop':
        for (const id of cmd.unitIds) this.units.get(id)?.clearOrders();
        return true;
      case 'stance':
        for (const id of cmd.unitIds) {
          const u = this.units.get(id);
          if (u && !u.dead) u.setCombatStance(cmd.stance);
        }
        return true;
      case 'place':
        return this.placeBuilding(cmd.building, cmd.x, cmd.z) !== null;
      case 'train':
        return this.trainUnit(cmd.buildingId, cmd.unit);
      case 'research':
        return this.researchTech(cmd.buildingId, cmd.tech);
      case 'cancel':
        this.cancelProduction(cmd.buildingId, cmd.index);
        return true;
      case 'ungarrison':
        return this.ungarrison(cmd.buildingId);
      case 'rally':
        this.setRallyPoint(cmd.buildingId, cmd.target);
        return true;
      case 'advanceEra':
        return this.advanceEra(0);
    }
  }

  /** Spend and create a building for player 0 (worker assignment is a separate order). */
  private placeBuilding(kind: BuildingKind, x: number, z: number): Building | null {
    const stats = getBuildingStats(kind, this.players[0].era);
    if (!this.canPlace(x, z, stats.size)) return null;
    if (!this.spendResource(0, stats.cost)) return null;
    const ctx = this.makeBuildContext(0);
    const b = new Building(kind, 0, this.players[0].era, ctx);
    b.pos.set(x, this.terrain.getHeight(x, z), z);
    this.applyTerrainFarmYield(b);
    b.attach(this.scene);
    b.beginConstruction();
    this.buildings.set(b.id, b);
    this.registerObstacle(b);
    return b;
  }

  /**
   * Scale a farm's food reserve by the terrain under it: terracing (andenes),
   * soil moisture and nearby irrigation. Deterministic, so replay/save safe.
   */
  applyTerrainFarmYield(b: Building): void {
    b.applyTerrainYield(this.farmYieldAt(b.pos.x, b.pos.z));
  }

  /** Terrain multiplier for a farm at (x, z), shared by the simulation and the HUD. */
  farmYieldAt(x: number, z: number): number {
    return farmYieldMultiplier({
      terrace: this.terrain.getTerrace(x, z),
      moisture: this.terrain.getMoisture(x, z),
      canal: nearbyCanal((cx, cz) => Math.max(this.terrain.getCanal(cx, cz), this.authoredCanalAt(cx, cz)), x, z),
    });
  }

  private authoredCanalAt(x: number, z: number): number {
    const spec = this.missionLayout?.canal;
    if (!this.canalOpen || !spec?.irrigation || !this.canalSite) return 0;
    const yaw = spec.yaw ?? 0;
    const dx = x - this.canalSite.x;
    const dz = z - this.canalSite.z;
    const along = dx * Math.cos(yaw) + dz * Math.sin(yaw);
    const across = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
    if (Math.abs(along) > (spec.length ?? 24) / 2) return 0;
    return Math.max(0, 1 - Math.abs(across) / 2.5);
  }

  isCanalOpen(): boolean {
    return this.canalOpen;
  }

  toggleCanal(): boolean {
    if (!this.canalSite) return false;
    this.canalOpen = !this.canalOpen;
    this.updateCanalVisual();
    for (const b of this.buildings.values()) {
      if (b.isFarm) b.applyTerrainYield(this.farmYieldAt(b.pos.x, b.pos.z));
    }
    this.hud?.showToast(
      this.canalOpen ? 'Compuerta abierta: los andenes cercanos riegan mejor' : 'Compuerta cerrada',
      this.canalOpen ? 'success' : 'info',
    );
    return this.canalOpen;
  }

  private updateCanalVisual(): void {
    if (!this.canalWater) return;
    const material = this.canalWater.material as THREE.MeshStandardMaterial;
    material.opacity = this.canalOpen ? 0.82 : 0.38;
    material.color.setHex(this.canalOpen ? 0x2f6f7a : 0x5c4a33);
    material.transparent = true;
    material.needsUpdate = true;
    if (this.canalGate) this.canalGate.position.y = this.canalOpen ? 1.55 : 0.8;
  }

  /** Train a unit in a completed building of player 0. */
  trainUnit(buildingId: number, unit: UnitKind): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead || b.owner !== 0) return false;
    // a mission can restrict the roster (e.g. no siege train in a naval campaign)
    const allowed = this.mission?.def.allowedUnits;
    if (allowed && !allowed.includes(unit)) return false;
    const stats = getUnitStats(unit, b.era);
    const p = this.players[0];
    if (p.populationUsed + stats.population > p.populationCap) return false;
    if (!this.spendResource(0, stats.cost)) return false;
    if (!b.queueUnit(unit)) {
      this.addResource(0, stats.cost);
      return false;
    }
    return true;
  }

  /** Queue a technology in a building of player 0. */
  researchTech(buildingId: number, techId: string): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead || b.owner !== 0) return false;
    const tech = getTech(techId);
    if (!tech) return false;
    if (!this.spendResource(0, tech.cost)) return false;
    if (!b.queueTech(techId)) {
      this.addResource(0, tech.cost);
      return false;
    }
    return true;
  }

  /** Attach an AI controller to a player (AI-vs-AI runs/tests). */
  addAI(playerId: number, difficulty?: Difficulty): void {
    this.ais.push(new AI(this, playerId, difficulty));
    // Attaching an AI after boot (sim/test) must still give it the balanced
    // opening gather plan; human seats never get this call.
    const workers = [...this.units.values()].filter(
      (u) => u.owner === playerId && u.kind === UnitKind.WORKER && !u.dead,
    );
    if (workers.length > 0 && workers.every((w) => !w.isBusy())) {
      const c = this.playerCenter(playerId);
      this.assignInitialWorkers(playerId, c.x, c.z);
    }
  }

  /** Restore a snapshot into a freshly built game (load mode; no default spawns). */
  private applySnapshot(data: SaveData): void {
    this.rng.setState(data.rngState);
    this.canalOpen = data.canalOpen ?? this.canalOpen;

    for (const ps of data.players) {
      const p = this.players[ps.id];
      if (!p) continue;
      p.resources = { ...ps.resources };
      p.populationUsed = ps.populationUsed;
      p.era = ps.era;
      p.ageBuildings = ps.ageBuildings;
      p.techs = new Set(ps.techs);
      p.alive = ps.alive;
      p.kills = ps.kills;
      p.totalLost = ps.totalLost;
      p.wonderActive = ps.wonderActive;
      p.stats = { ...ps.stats };
      p.bonus = { ...ps.bonus, gathering: { ...ps.bonus.gathering } };
    }

    let maxId = 0;
    for (const u of data.units) maxId = Math.max(maxId, u.id);
    for (const b of data.buildings) maxId = Math.max(maxId, b.id);
    for (const n of data.resourceNodes) maxId = Math.max(maxId, n.id);
    reserveIds(maxId);

    for (const ns of data.resourceNodes) {
      const node = new ResourceNode(
        this.scene,
        ns.kind,
        ns.x,
        ns.z,
        ns.amount,
        this.mapProfile.baseMapType,
        this.trees,
        this.mapProfile.vegetation.variants,
      );
      node.applySave(ns);
      node.pos.y = ns.kind === 'fishing' ? 0 : this.terrain.getHeight(ns.x, ns.z);
      node.view.position.set(ns.x, node.pos.y, ns.z);
      node.placeTreeInstance(node.pos.y);
      this.resourceNodes.set(node.id, node);
      this.registerResourceObstacle(node.id, ns.x, ns.z, ns.kind);
    }

    for (const bs of data.buildings) {
      const b = new Building(bs.kind, bs.owner, bs.era, this.makeBuildContext(bs.owner));
      b.applySave(bs);
      b.attach(this.scene);
      this.buildings.set(b.id, b);
      this.registerObstacle(b);
    }

    for (const us of data.units) {
      const u = new Unit(us.kind, us.owner, us.era, this.makeBuildContext(us.owner), us.id);
      u.setContext(this.unitContext);
      this.applyPlayerBonuses(u, this.players[us.owner]);
      u.applySave(us);
      u.attach(this.scene);
      this.units.set(u.id, u);
    }

    this.camera.moveTo(data.camera.x, data.camera.z, true);
    this.camera.setHeight(data.camera.zoom);
    this.camera.setYaw(data.camera.yaw);
    this.fow.restore(data.fog);
    this.audio.setEra(this.players[0].era);

    // the settlement overlay is derived (not saved): rebuild it from each base's
    // restored center, exactly as on a fresh spawn
    for (const b of this.buildings.values()) {
      if (b.kind === BuildingKind.CENTER) {
        this.addSettlementOverlay(this.settlementPlanFor(b.owner, b.pos.x, b.pos.z));
      }
    }
    this.spawnMissionRoads();

    if (data.mission && this.mission) {
      this.mission.applySave(data.mission);
      // a save taken before the briefing: show it again so the mission can start
      if (!data.mission.started) this.mission.start();
    }
    if (data.tutorial && this.tutorial) this.tutorial.applySave(data.tutorial);
    if (this.canalSite) {
      this.updateCanalVisual();
      const savedById = new Map(data.buildings.map((saved) => [saved.id, saved]));
      for (const b of this.buildings.values()) {
        if (!b.isFarm) continue;
        const saved = savedById.get(b.id);
        if (saved?.terrainYield === undefined) {
          b.terrainYield = this.farmYieldAt(b.pos.x, b.pos.z);
        } else {
          b.applyTerrainYield(this.farmYieldAt(b.pos.x, b.pos.z));
        }
      }
    }
  }

  /** Show the victory/defeat screen. */
  showVictory(winner: number): void {
    this.gameEnded = true;
    this.loop.stop();
    this.hud.showVictory(winner === 0);
  }

  private initAudio(): void {
    this.audio.enabled = this.settings.soundEnabled;
    this.audio.musicEnabled = this.settings.musicEnabled;
    const enable = () => {
      this.audio.init();
      this.audio.resume();
      if (this.settings.musicEnabled) this.audio.startMusic();
      window.removeEventListener('pointerdown', enable);
    };
    window.addEventListener('pointerdown', enable, { once: true });
    bus.on('fx:shot', () => this.audio.shot());
    bus.on('fx:artillery', () => this.audio.artillery());
    bus.on('fx:bow', () => this.audio.bow());
    bus.on('fx:sling', () => this.audio.sling());
    bus.on('fx:explosion', () => this.audio.explosion());
    bus.on('fx:death', () => this.audio.death());
    bus.on('fx:hit', () => this.audio.hit());
    bus.on('fx:wood', () => this.audio.woodChop());
    bus.on('fx:mine', () => this.audio.mineHit());
  }

  private initInput(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  // --- input ---

  private screenToWorld(sx: number, sy: number): THREE.Vector3 | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    // first shot: plane y=0 (lower bound of the terrain)
    if (!ray.intersectPlane(this.groundPlane, hit)) return null;
    const dir = ray.direction;
    if (Math.abs(dir.y) < 1e-4) return hit;
    // refined against the heightfield: fixed point sampling the real height
    const size = this.settings.mapSize;
    const p = new THREE.Vector3();
    let t = ray.origin.distanceTo(hit);
    for (let i = 0; i < 5; i++) {
      ray.at(t, p);
      const hx = Math.min(Math.max(p.x, 0), size);
      const hz = Math.min(Math.max(p.z, 0), size);
      const h = this.terrain.getHeight(hx, hz);
      const nt = (h - ray.origin.y) / dir.y;
      if (!Number.isFinite(nt) || nt <= 0) break;
      t = nt;
    }
    ray.at(t, p);
    p.y = this.terrain.getHeight(Math.min(Math.max(p.x, 0), size), Math.min(Math.max(p.z, 0), size));
    return p;
  }

  /**
   * True if the pointer is over a HUD control. `#ui-root` is `pointer-events:none`
   * and only real controls set `auto`, so `elementFromPoint` returning anything but
   * the canvas means a control is under the cursor (0 A.D.-style edge guard).
   */
  private isPointerOverUi(): boolean {
    return this.hud.isPointerOverUi(this.mouseScreen.x, this.mouseScreen.y);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.gameEnded) return;
    if (this.placingBuilding) {
      if (e.button === 0) {
        const wp = this.screenToWorld(e.clientX, e.clientY);
        if (wp) {
          // recompute with the real click point (do not trust the mousemove state)
          const foot = getBuildingStats(this.placingBuilding.kind, this.players[0].era).size;
          if (this.canPlace(wp.x, wp.z, foot)) this.commitPlacement(wp.x, wp.z);
          else this.updatePlacementGhost(wp.x, wp.z);
        }
      } else if (e.button === 2) {
        this.cancelPlacement();
      }
      return;
    }
    if (e.button === 0) {
      this.leftDown = true;
      this.leftMoved = false;
      this.selectionStart = new THREE.Vector2(e.clientX, e.clientY);
      this.shiftQueue = e.shiftKey;
      this.ctrlQueue = e.ctrlKey || e.altKey;
    } else if (e.button === 2) {
      this.rightDown = true;
    }
  };

  private ctrlQueue = false;
  private leftDown = false;
  private leftMoved = false;
  private rightDown = false;

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 && this.leftDown) {
      this.leftDown = false;
      this.hud?.hideSelectionBox();
      if (this.selectionStart) {
        if (!this.leftMoved) {
          this.selectAt(this.selectionStart.x, this.selectionStart.y);
          // double click: select all units of the same type
          const now = performance.now();
          if (now - this.lastClickTime < 320 && this.selectedUnits.length === 1) {
            const u = this.units.get(this.selectedUnits[0]);
            if (u && u.owner === 0) {
              const sameType = [...this.units.values()].filter((x) => x.owner === 0 && x.kind === u.kind && !x.dead);
              this.selectedUnits = sameType.map((x) => x.id);
              this.refreshSelectionVisuals();
              bus.emit('unit:selected', { ids: [...this.selectedUnits] });
            }
          }
          this.lastClickTime = now;
        } else {
          this.boxSelect(this.selectionStart, new THREE.Vector2(e.clientX, e.clientY));
        }
        this.selectionStart = null;
      }
    } else if (e.button === 2 && this.rightDown) {
      this.rightDown = false;
      this.issueContextOrder(e.clientX, e.clientY);
    }
  };
  private lastClickTime = 0;
  private hoverRaf = 0;
  private pendingHover = new THREE.Vector2();

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseScreen.set(e.clientX, e.clientY);
    this.camera.updateMouse(e.clientX, e.clientY);
    const wp = this.screenToWorld(e.clientX, e.clientY);
    if (wp) {
      this.mouse.set(wp.x, wp.z);
      if (this.placingBuilding) {
        this.updatePlacementGhost(wp.x, wp.z);
      }
    }
    // left-button drag = selection rectangle
    if (this.leftDown && this.selectionStart) {
      const dx = e.clientX - this.selectionStart.x;
      const dy = e.clientY - this.selectionStart.y;
      if (!this.leftMoved && Math.abs(dx) + Math.abs(dy) > 4) this.leftMoved = true;
      if (this.leftMoved)
        this.hud?.showSelectionBox(this.selectionStart.x, this.selectionStart.y, e.clientX, e.clientY);
    }
    // cursor + hover tooltip: one pick per frame, shared by the tooltip and the action icon
    if (!this.gameEnded && !this.placingBuilding) {
      this.pendingHover.set(e.clientX, e.clientY);
      if (this.hoverRaf === 0) this.hoverRaf = requestAnimationFrame(this.flushHover);
    }
  };

  private flushHover = (): void => {
    this.hoverRaf = 0;
    if (this.gameEnded || this.placingBuilding) return;
    const { x, y } = this.pendingHover;
    const picked = this.pickScene(x, y);
    const info = this.computeHover(picked);
    const hasSel = this.selectedUnits.length > 0 || this.selectedBuilding !== null;
    const icon = hasSel ? this.hoverAction(picked) : null;
    this.renderer.domElement.style.cursor = icon ? 'none' : info ? 'pointer' : 'default';
    this.hud?.setHover(info, x, y);
    this.hud?.setCursor(icon, x, y);
  };

  /** Everything under the cursor, resolved once and reused by the tooltip and the action icon. */
  private pickScene(sx: number, sy: number): PickResult {
    const resource = this.pickResource(sx, sy);
    if (resource) return { resource };
    const entity = this.pickAt(sx, sy);
    if (entity.unit || entity.building) return { resource: null, ...entity };
    return { resource: null, ...entity, heritage: this.pickHeritage(sx, sy) ?? undefined };
  }

  private pickHeritage(sx: number, sy: number): HeritageBuildingDef | null {
    const roots = [this.landmark, this.canalGroup].filter((root): root is THREE.Group => !!root);
    if (roots.length === 0) return null;
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const hits = roots.flatMap((root) => this.raycaster.intersectObject(root, true));
    hits.sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.heritageId) object = object.parent;
      const def = getHeritageBuilding(object?.userData.heritageId as string | undefined);
      if (def) return def;
    }
    return null;
  }

  /** Contextual action icon according to what is under the cursor and the selection. */
  private hoverAction(picked: PickResult): string | null {
    if (this.placingBuilding) return '🚧';
    if (picked.resource) {
      const hasWorker = this.selectedUnits.some((id) => this.units.get(id)?.kind === UnitKind.WORKER);
      return hasWorker ? '⛏️' : null;
    }
    if (picked.unit) {
      if (picked.unit.owner === 0) return null;
      const converter = this.selectedUnits
        .map((id) => this.units.get(id))
        .find((u): u is Unit => !!u && !u.dead && isConverter(u.kind));
      return converter ? unitDisplayIcon(converter.kind, converter.era) : '⚔️';
    }
    if (picked.building) return picked.building.owner !== 0 ? '⚔️' : '🏰';
    if (picked.heritage) return '🔎';
    return null;
  }

  /** Information about the entity or resource under the cursor (for the tooltip). */
  private computeHover(picked: PickResult): { icon: string; title: string; detalle: string } | null {
    if (picked.resource) {
      const node = picked.resource;
      const ni = NODE_INFO[node.kind];
      return {
        icon: ni.icon,
        title: ni.name,
        detalle: `${Math.ceil(node.amount)} ${RESOURCE_INFO[node.resource].name}`,
      };
    }
    if (picked.unit) {
      const own = picked.unit.owner === 0 ? 'Tú' : (this.players[picked.unit.owner]?.name ?? 'Enemigo');
      return {
        icon: unitDisplayIcon(picked.unit.kind, picked.unit.era),
        title: unitDisplayName(picked.unit.kind, this.players[picked.unit.owner]?.civ, picked.unit.era),
        detalle: `${own} · HP ${Math.ceil(picked.unit.hp)}/${Math.ceil(picked.unit.maxHp)} · ${unitDisplayDescription(
          picked.unit.kind,
          this.players[picked.unit.owner]?.civ,
          picked.unit.era,
        )}`,
      };
    }
    if (picked.building) {
      const bi = BUILDING_INFO[picked.building.kind];
      const own = picked.building.owner === 0 ? 'Tú' : (this.players[picked.building.owner]?.name ?? 'Enemigo');
      const state = picked.building.constructionComplete
        ? ''
        : ` · Construyendo ${Math.floor(picked.building.buildRatio * 100)}%`;
      return {
        icon: bi.icon,
        title: bi.name,
        detalle: `${own} · HP ${Math.ceil(picked.building.hp)}/${Math.ceil(picked.building.maxHp)}${state}`,
      };
    }
    if (picked.heritage) {
      return {
        icon: '🏛️',
        title: picked.heritage.name,
        detalle: `${picked.heritage.sector} · ${picked.heritage.role}`,
      };
    }
    return null;
  }

  /** Project a world point to screen coordinates. */
  private projectToScreen(x: number, y: number, z: number): { x: number; y: number } {
    const v = this.tmpProject.set(x, y, z).project(this.camera.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
  private tmpProject = new THREE.Vector3();
  private static readonly UNIT_PICK_PX = 30;
  private static readonly BUILDING_PICK_PX = 24;

  /**
   * Tolerant picking: exact raycast first and, if it fails, the entity closest
   * to the cursor on screen (fixes clicking on small/moving units).
   */
  private pickAt(sx: number, sy: number): { unit?: Unit; building?: Building } {
    const direct = this.pickEntity(sx, sy);
    if (direct.unit) return direct;

    // closest unit on screen (tolerance for small units or behind buildings)
    let bestUnit: Unit | undefined;
    let bestUnitD = Game.UNIT_PICK_PX;
    for (const u of this.units.values()) {
      if (u.dead) continue;
      const s = this.projectToScreen(u.pos.x, u.pos.y + 0.5, u.pos.z);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestUnitD) {
        bestUnitD = d;
        bestUnit = u;
      }
    }
    if (bestUnit) {
      if (direct.building) {
        const bs = this.projectToScreen(direct.building.pos.x, direct.building.pos.y + 1.3, direct.building.pos.z);
        const bd = Math.hypot(bs.x - sx, bs.y - sy);
        return bestUnitD <= bd ? { unit: bestUnit } : direct;
      }
      return { unit: bestUnit };
    }
    if (direct.building) return direct;

    // closest building on screen
    let bestBuilding: Building | undefined;
    let bestBuildingD = Game.BUILDING_PICK_PX;
    for (const b of this.buildings.values()) {
      if (b.dead) continue;
      const s = this.projectToScreen(b.pos.x, b.pos.y + 1.3, b.pos.z);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestBuildingD) {
        bestBuildingD = d;
        bestBuilding = b;
      }
    }
    return bestBuilding ? { building: bestBuilding } : {};
  }

  private pickEntity(sx: number, sy: number): { unit?: Unit; building?: Building } {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const proxies: THREE.Object3D[] = [];
    for (const u of this.units.values()) if (!u.dead) proxies.push(u.view.pickProxy);
    for (const b of this.buildings.values()) if (!b.dead) proxies.push(b.view.pickProxy);
    const hits = this.raycaster.intersectObjects(proxies, false);
    for (const h of hits) {
      const e = h.object.userData.owner;
      if (e instanceof Unit) return { unit: e };
      if (e instanceof Building) return { building: e };
    }
    return {};
  }

  private selectAt(sx: number, sy: number): void {
    const picked = this.pickAt(sx, sy);
    if (picked.building && !this.shiftQueue) {
      this.selectedUnits = [];
      this.selectedBuilding = picked.building.id;
      this.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [] });
      this.audio.select();
      return;
    }
    if (picked.unit) {
      if (this.shiftQueue) {
        if (!this.selectedUnits.includes(picked.unit.id)) this.selectedUnits.push(picked.unit.id);
      } else {
        this.selectedUnits = [picked.unit.id];
      }
      this.selectedBuilding = null;
      this.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.selectedUnits] });
      this.audio.select();
      return;
    }
    if (!this.shiftQueue) {
      const heritage = this.pickHeritage(sx, sy);
      if (heritage) {
        this.selectedUnits = [];
        this.selectedBuilding = null;
        this.selectedHeritage = heritage.id;
        this.refreshSelectionVisuals();
        bus.emit('unit:selected', { ids: [] });
        this.audio.select();
        return;
      }
      this.selectedUnits = [];
      this.selectedBuilding = null;
      this.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [] });
      this.audio.select();
    }
  }

  private boxSelect(a: THREE.Vector2, b: THREE.Vector2): void {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const result: number[] = [];
    for (const u of this.units.values()) {
      if (u.owner !== 0) continue;
      if (u.dead) continue;
      const p = u.pos;
      const ndc = new THREE.Vector3().copy(p);
      void ndc;
      // project to screen
      const v = p.clone();
      const screen = v.project(this.camera.camera);
      const sx = (screen.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-screen.y * 0.5 + 0.5) * window.innerHeight;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        result.push(u.id);
      }
    }
    if (result.length > 0) {
      this.selectedUnits = this.shiftQueue ? [...new Set([...this.selectedUnits, ...result])] : result;
      this.selectedBuilding = null;
      this.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.selectedUnits] });
    }
  }

  private refreshSelectionVisuals(): void {
    for (const u of this.units.values()) {
      const sel = this.selectedUnits.includes(u.id);
      u.selected = sel;
      const p = this.players[u.owner];
      u.view.showSelectionColor(sel, p.color);
    }
    for (const b of this.buildings.values()) {
      const sel = this.selectedBuilding === b.id;
      b.selected = sel;
      const p = this.players[b.owner];
      b.view.showSelectionColor(sel, p.color);
    }
  }

  private issueContextOrder(sx: number, sy: number): void {
    const units = this.selectedUnits.map((id) => this.units.get(id)).filter((u): u is Unit => !!u && !u.dead);
    if (units.length === 0) return;
    const picked = this.pickAt(sx, sy);
    const wp = this.screenToWorld(sx, sy);
    const target: OrderTarget = wp ? { x: wp.x, z: wp.z } : { x: this.mouse.x, z: this.mouse.y };

    // click on a resource node -> gather
    const node = this.pickResource(sx, sy);
    if (node) {
      this.markOrder(target, 'gather');
      for (const u of units) {
        if (u.kind === UnitKind.WORKER) {
          this.orderUnit(u, { kind: OrderKind.GATHER, entityId: node.id }, !this.shiftQueue);
        } else {
          this.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
        }
      }
      return;
    }
    if (picked.building) {
      const b = picked.building;
      // farm: workers gather food from it (only if it is complete)
      if (b.owner === 0 && b.isFarm && b.constructionComplete && b.foodAmount > 0) {
        for (const u of units) {
          if (u.kind === UnitKind.WORKER) {
            this.orderUnit(u, { kind: OrderKind.GATHER, entityId: b.id }, !this.shiftQueue);
          } else {
            this.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
          }
        }
        this.audio.order();
        return;
      }
      if (b.owner !== 0) {
        // attack an enemy building
        this.markOrder({ x: b.pos.x, z: b.pos.z }, 'attack');
        for (const u of units) {
          this.orderUnit(u, { kind: OrderKind.ATTACK, entityId: b.id }, !this.shiftQueue);
        }
      } else if (this.shiftQueue) {
        // set rally point
        this.executeCommand({ kind: 'rally', buildingId: b.id, target });
      } else {
        for (const u of units) {
          if (u.kind === UnitKind.WORKER && !b.constructionComplete) {
            this.orderUnit(u, { kind: OrderKind.BUILD, entityId: b.id }, !this.shiftQueue);
          } else if (u.kind === UnitKind.WORKER && b.isDropsite) {
            this.orderUnit(u, { kind: OrderKind.DELIVER, entityId: b.id }, !this.shiftQueue);
          } else if (b.garrisons > 0) {
            this.orderUnit(u, { kind: OrderKind.GARRISON, entityId: b.id }, !this.shiftQueue);
          } else {
            this.orderUnit(u, { kind: OrderKind.MOVE, target }, !this.shiftQueue);
          }
        }
      }
      return;
    }
    if (picked.unit && picked.unit.owner !== 0) {
      const enemyId = picked.unit.id;
      const target = { x: picked.unit.pos.x, z: picked.unit.pos.z };
      const canConvert = units.some((u) => isConverter(u.kind));
      this.markOrder(target, canConvert ? 'convert' : 'attack');
      for (const u of units) {
        if (canConvert && isConverter(u.kind)) {
          this.orderUnit(u, { kind: OrderKind.CONVERT, entityId: enemyId }, !this.shiftQueue);
        } else {
          this.orderUnit(u, { kind: OrderKind.ATTACK, entityId: enemyId }, !this.shiftQueue);
        }
      }
      return;
    }
    if (this.ctrlQueue) {
      // attack-move
      this.markOrder(target, 'attack');
      for (const u of units) {
        this.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
      }
    } else {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
    }
    this.audio.order();
  }

  /** Visually mark the destination of an order on the ground. */
  private markOrder(target: OrderTarget, kind: MarkerKind): void {
    const y = this.terrain.getHeight(target.x, target.z);
    this.markers.spawn(target.x, y, target.z, kind);
  }

  /** Move/attack-move order to a world point (used by the minimap). */
  commandMoveToWorld(x: number, z: number, ctrlQueue = this.ctrlQueue, shiftQueue = this.shiftQueue): void {
    const units = this.selectedUnits.map((id) => this.units.get(id)).filter((u): u is Unit => !!u && !u.dead);
    if (units.length === 0) return;
    const target: OrderTarget = { x, z };
    if (ctrlQueue) {
      this.markOrder(target, 'attack');
      for (const u of units) this.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target }, !shiftQueue);
    } else {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
    }
    this.audio.order();
  }

  /** Line-formation movement orders (AoE2 style). */
  private issueMoveFormation(units: Unit[], target: OrderTarget): void {
    const n = units.length;
    const yaw = Math.atan2(target.z - units[0].pos.z, target.x - units[0].pos.x);
    const spacing = 1.5;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    let idx = 0;
    for (const u of units) {
      const r = Math.floor(idx / cols) - (rows - 1) / 2;
      const c = (idx % cols) - (cols - 1) / 2;
      idx++;
      const ox = Math.cos(yaw) * r * spacing - Math.sin(yaw) * c * spacing;
      const oz = Math.sin(yaw) * r * spacing + Math.cos(yaw) * c * spacing;
      this.orderUnit(u, { kind: OrderKind.MOVE, target: { x: target.x + ox, z: target.z + oz } }, !this.shiftQueue);
    }
  }

  private pickResource(sx: number, sy: number): ResourceNode | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    let best: ResourceNode | null = null;
    let bestD = Infinity;
    // nodes with their own mesh (mine, well, hunt, fishing, berry and reserve trees)
    const meshes: THREE.Object3D[] = [];
    for (const n of this.resourceNodes.values()) {
      if (n.kind === 'tree' && n.treeSlot >= 0) continue;
      meshes.push(n.view);
    }
    const hits = this.raycaster.intersectObjects(meshes, true);
    for (const h of hits) {
      let cur: THREE.Object3D | null = h.object;
      while (cur) {
        let found: ResourceNode | null = null;
        for (const n of this.resourceNodes.values()) {
          if (n.view === cur) {
            found = n;
            break;
          }
        }
        if (found) {
          best = found;
          bestD = h.distance;
          break;
        }
        cur = cur.parent;
      }
      if (best) break; // ordered by distance: the first is the closest
    }
    // instanced trees
    const treeHits: { dist: number; id: number }[] = [];
    this.trees.raycast(this.raycaster, treeHits);
    for (const th of treeHits) {
      if (th.dist < bestD) {
        const n = this.resourceNodes.get(th.id);
        if (n) {
          bestD = th.dist;
          best = n;
        }
      }
    }
    return best;
  }

  private setRallyPoint(buildingId: number, target: OrderTarget): void {
    const b = this.buildings.get(buildingId);
    if (b) {
      b.rallyPoint = target;
      b.hasRallyPoint = true;
      this.hud.showToast('Punto de reunión establecido', 'info');
    }
  }

  // --- construction ---

  /**
   * Can this building be constructed in the current match? It accounts for the era
   * (period-locked matches) and the Sacred Huaca, which depends on the victory mode,
   * not the era (so wonder victory is reachable in any period).
   */
  canBuildKind(kind: BuildingKind): boolean {
    if (kind === BuildingKind.CENTER) return false;
    if (kind === BuildingKind.WONDER) return this.settings.victoryMode === 'wonder';
    return this.players[0].era >= BUILDING_DEFS[kind].minEra;
  }

  startPlacement(kind: BuildingKind): void {
    // RTS standard: building requires selected workers
    const hasWorker = this.selectedUnits.some((id) => {
      const u = this.units.get(id);
      return !!u && !u.dead && u.kind === UnitKind.WORKER;
    });
    if (!hasWorker) {
      this.hud.showToast('Selecciona obreros para construir', 'warning');
      return;
    }
    const ctx = this.makeBuildContext(0);
    const ghost = new THREE.Group();
    this.placingBuilding = { kind, valid: false, ghost };
    this.scene.add(ghost);
    const ghostModel = buildModelForGhost(kind, ctx);
    ghost.add(ghostModel);
    const wp = this.screenToWorld(this.mouseScreen.x, this.mouseScreen.y);
    if (wp) this.updatePlacementGhost(wp.x, wp.z);
  }

  private updatePlacementGhost(x: number, z: number): void {
    if (!this.placingBuilding) return;
    const stats = getBuildingStats(this.placingBuilding.kind, this.players[0].era);
    const foot = stats.size;
    const y = this.terrain.getHeight(x, z);
    const valid = this.canPlace(x, z, foot);
    this.placingBuilding.valid = valid;
    this.placingBuilding.ghost.position.set(x, y + 0.1, z);
    this.placingBuilding.ghost.visible = true;
    this.placingBuilding.ghost.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) mat.color.setHex(valid ? 0x33ff88 : 0xff4444);
      }
    });
  }

  /** Find a free spot near a point to build. */
  findFreeSpot(x: number, z: number, foot: number): { x: number; z: number } | null {
    const rng = new RNG(Math.floor(x * 7 + z * 13));
    for (let i = 0; i < 60; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const r = rng.range(foot + 2, 10);
      const nx = x + Math.cos(ang) * r;
      const nz = z + Math.sin(ang) * r;
      if (this.canPlace(nx, nz, foot)) return { x: nx, z: nz };
    }
    return null;
  }

  /** Whether a building footprint would overlap the authored archaeological site. */
  private siteBlocksConstruction(x: number, z: number, pad: number): boolean {
    const rects = this.siteDef?.buildKeepout ?? this.missionLayout?.site?.buildKeepout;
    if (!rects) return false;
    const size = this.settings.mapSize;
    return rects.some((rect) =>
      insideTerrainRect({ x: rect.x * size, z: rect.z * size, rx: rect.rx * size, rz: rect.rz * size }, x, z, pad),
    );
  }

  canPlace(x: number, z: number, foot: number): boolean {
    const r = foot / 2;
    if (this.terrain.isWater(x, z) || !this.terrain.isBuildable(x, z)) return false;
    // keep placement on ground units can reach (same slope limit as the nav mesh)
    if (this.terrain.getSlope(x, z) > MAX_WALKABLE_SLOPE) return false;
    if (this.siteBlocksConstruction(x, z, r)) return false;
    for (let dx = -r; dx <= r; dx += 1.2) {
      for (let dz = -r; dz <= r; dz += 1.2) {
        if (this.terrain.isWater(x + dx, z + dz)) return false;
      }
    }
    for (const b of this.buildings.values()) {
      if (b.dead) continue;
      if (distance2D(x, z, b.pos.x, b.pos.z) < b.radius * 0.9 + r * 0.8) return false;
    }
    for (const n of this.resourceNodes.values()) {
      if (n.dead) continue;
      if (distance2D(x, z, n.pos.x, n.pos.z) < n.radius + r * 0.9) return false;
    }
    return true;
  }

  private commitPlacement(x: number, z: number): void {
    if (!this.placingBuilding) return;
    const kind = this.placingBuilding.kind;
    this.cancelPlacement();
    const b = this.commandPlace(kind, x, z);
    if (!b) {
      this.hud.showToast('Recursos insuficientes', 'error');
      return;
    }
    // RTS standard: the selected workers build (they interrupt their task)
    const builders = this.selectedUnits
      .map((id) => this.units.get(id))
      .filter((u): u is Unit => !!u && !u.dead && u.kind === UnitKind.WORKER);
    for (const u of builders) {
      this.executeCommand({
        kind: 'order',
        unitIds: [u.id],
        order: { kind: OrderKind.BUILD, entityId: b.id },
        clear: true,
      });
    }
  }

  /** Place a building for player 0 through the command layer; returns the new building. */
  private commandPlace(kind: BuildingKind, x: number, z: number): Building | null {
    const before = new Set(this.buildings.keys());
    if (!this.executeCommand({ kind: 'place', building: kind, x, z })) return null;
    for (const [id, b] of this.buildings) if (!before.has(id)) return b;
    return null;
  }

  private cancelPlacement(): void {
    if (this.placingBuilding) {
      this.scene.remove(this.placingBuilding.ghost);
      disposeModel(this.placingBuilding.ghost);
      this.placingBuilding = null;
    }
  }

  spendResource(player: number, res: Resources): boolean {
    const p = this.players[player];
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < res[k]) return false;
    }
    for (const k of RESOURCE_KEYS) p.resources[k] -= res[k];
    bus.emit('resources:changed', { player, resources: { ...p.resources } });
    return true;
  }

  addResource(player: number, res: Resources): void {
    const p = this.players[player];
    for (const k of RESOURCE_KEYS) p.resources[k] += res[k];
    bus.emit('resources:changed', { player, resources: { ...p.resources } });
  }

  /** Cancel a queued training and refund its cost. */
  cancelProduction(buildingId: number, index: number): void {
    const b = this.buildings.get(buildingId);
    if (!b || b.owner !== 0) return;
    const item = b.productionQueue[index];
    if (!item) return;
    const stats = getUnitStats(item.unit, b.era);
    b.productionQueue.splice(index, 1);
    this.addResource(b.owner, { ...ZERO_RESOURCES, ...stats.cost });
    this.hud?.showToast('Entrenamiento cancelado', 'info');
  }

  /** Release a building's garrisoned units around it (seeded exit positions). */
  ungarrison(buildingId: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead) return false;
    const ids = b.ungarrisonAll();
    for (const id of ids) {
      const u = this.units.get(id);
      if (!u) continue;
      u.garrisonedIn = null;
      u.view.group.visible = true;
      const ang = this.rng.float() * Math.PI * 2;
      const px = b.pos.x + Math.cos(ang) * (b.radius + 0.6);
      const pz = b.pos.z + Math.sin(ang) * (b.radius + 0.6);
      u.pos.set(px, this.terrain.getHeight(px, pz), pz);
      u.snapToGround();
    }
    return true;
  }

  // --- keyboard ---

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    const k = e.key.toLowerCase();
    if (this.gameEnded) return;
    if (k === keyFor('pause')) {
      this.togglePause();
      return;
    }
    // do not process game shortcuts with a menu open or while paused
    if (this.paused || this.hud.hasBlockingOverlay()) return;
    if (k === 'escape') {
      this.cancelPlacement();
      this.selectedUnits = [];
      this.selectedBuilding = null;
      this.selectedHeritage = null;
      this.refreshSelectionVisuals();
      return;
    }
    // control groups (Ctrl/Alt+n assign, n recall, Shift+n add)
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const n = Number(e.key);
      if (e.ctrlKey || e.metaKey || e.altKey) this.assignControlGroup(n);
      else if (e.shiftKey) this.addToControlGroup(n);
      else this.recallControlGroup(n);
      return;
    }
    if (k === keyFor('centerBase')) {
      const center = [...this.buildings.values()].find((b) => b.owner === 0 && b.kind === BuildingKind.CENTER);
      if (center) this.camera.focusOn(center.pos.x, center.pos.z);
    }
    if (k === keyFor('followUnit')) {
      if (this.selectedUnits.length > 0) {
        const u = this.units.get(this.selectedUnits[0]);
        if (u) this.camera.follow(u.id);
      }
    }
    if (k === keyFor('lastBattle')) {
      const lastEvt = this.lastBattleEvent;
      if (lastEvt) {
        const ent = this.units.get(lastEvt) ?? this.buildings.get(lastEvt);
        if (ent) this.camera.focusOn(ent.pos.x, ent.pos.z);
      }
    }
    // select the whole army (own combat units)
    if (k === keyFor('selectArmy')) {
      const army = [...this.units.values()].filter((u) => u.owner === 0 && !u.dead && u.kind !== UnitKind.WORKER);
      this.selectedUnits = army.map((u) => u.id);
      this.selectedBuilding = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.selectedUnits] });
      this.audio.select();
      return;
    }
    // numeric controls for panels
    if (k === keyFor('buildFarm')) this.startPlacement(BuildingKind.FARM);
    if (k === keyFor('buildHouse')) this.startPlacement(BuildingKind.HOUSE);
  };

  private lastBattleEvent: number | null = null;

  private controlGroups = new Map<number, number[]>();
  private lastGroupN = 0;
  private lastGroupTap = 0;

  private assignControlGroup(n: number): void {
    const ids = this.selectedUnits.filter((id) => {
      const u = this.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.controlGroups.set(n, ids);
    this.hud?.showToast(ids.length > 0 ? `Grupo ${n} · ${ids.length} unidades` : `Grupo ${n} vacío`, 'info');
  }

  private addToControlGroup(n: number): void {
    const cur = this.controlGroups.get(n) ?? [];
    const add = this.selectedUnits.filter((id) => {
      const u = this.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.controlGroups.set(n, [...new Set([...cur, ...add])]);
    this.hud?.showToast(`Añadido al grupo ${n}`, 'info');
  }

  private recallControlGroup(n: number): void {
    const ids = (this.controlGroups.get(n) ?? []).filter((id) => {
      const u = this.units.get(id);
      return u && !u.dead;
    });
    if (ids.length === 0) return;
    this.selectedUnits = ids;
    this.selectedBuilding = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [...ids] });
    this.audio.select();
    const now = performance.now();
    if (this.lastGroupN === n && now - this.lastGroupTap < 400) {
      const u = this.units.get(ids[0]);
      if (u) this.camera.focusOn(u.pos.x, u.pos.z);
    }
    this.lastGroupN = n;
    this.lastGroupTap = now;
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    void e;
  };

  togglePause(): void {
    if (!this.paused && this.hud.hasBlockingOverlay()) return;
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
  }

  getPaused(): boolean {
    return this.paused;
  }

  /** True once the match has been decided (victory/defeat). */
  hasEnded(): boolean {
    return this.gameEnded;
  }

  // --- UnitContext context ---

  private ctxFor(): UnitContext {
    return {
      getHeight: (x: number, z: number) => this.terrain.getHeight(x, z),
      findPath: (sx, sz, tx, tz) => this.pathfinder.pathfind(sx, sz, tx, tz),
      findApproachPath: (sx, sz, tx, tz, standRadius: number) =>
        this.pathfinder.findApproachPath(sx, sz, tx, tz, standRadius),
      reachableToNode: (sx, sz, tx, tz, standRadius: number) =>
        this.pathfinder.reachableToNode(sx, sz, tx, tz, standRadius),
      isWalkable: (x, z) => this.pathfinder.isWalkable(x, z),
      nearestWalkable: (x, z) => this.pathfinder.nearestWalkablePoint(x, z),
      unitsNear: (x, z, radius) => this.unitsNear(x, z, radius),
      entitiesById: this.units,
      resourceNodes: this.resourceNodes,
      buildings: this.buildings,
      resolveDamage: (a, t, d, from, type) => this.resolveDamage(a, t, d, from, type),
      spawnProjectile: (o) => this.spawnProjectile(o),
      particles: this.particles,
      players: this.players,
      getPlayer: (id) => this.players[id],
      event: (name, payload) => bus.emit(name, payload),
      gather: (dropId, unitId, amount, resource) => this.deliverGather(dropId, unitId, amount, resource),
      worldSize: this.settings.mapSize,
      period: this.settings.period,
      unitSpawn: this.unitSpawn,
      techComplete: this.techComplete,
      enemiesNear: (x, z, radius, owner) => this.enemiesNear(x, z, radius, owner),
    };
  }

  private unitsNear(x: number, z: number, radius: number): Unit[] {
    const out: Unit[] = [];
    const r2 = radius;
    const c = this.spatialCell;
    const x0 = Math.floor((x - r2) / c);
    const x1 = Math.floor((x + r2) / c);
    const z0 = Math.floor((z - r2) / c);
    const z1 = Math.floor((z + r2) / c);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.spatial.get(cz * 1000 + cx);
        if (!bucket) continue;
        for (const u of bucket) {
          if (u.dead) continue;
          if (distance2D(x, z, u.pos.x, u.pos.z) < r2 + u.radius) out.push(u);
        }
      }
    }
    return out;
  }

  enemiesNear(x: number, z: number, radius: number, owner: number): Unit[] {
    const out: Unit[] = [];
    const team = this.players[owner]?.team;
    const c = this.spatialCell;
    const x0 = Math.floor((x - radius) / c);
    const x1 = Math.floor((x + radius) / c);
    const z0 = Math.floor((z - radius) / c);
    const z1 = Math.floor((z + radius) / c);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        const bucket = this.spatial.get(cz * 1000 + cx);
        if (!bucket) continue;
        for (const u of bucket) {
          if (u.dead || u.owner === owner) continue;
          if (this.players[u.owner]?.team === team) continue;
          if (distance2D(x, z, u.pos.x, u.pos.z) < radius + u.radius) out.push(u);
        }
      }
    }
    return out;
  }

  /** Rebuild the unit spatial hash (once per frame). */
  private rebuildSpatial(): void {
    this.spatial.clear();
    const c = this.spatialCell;
    for (const u of this.units.values()) {
      if (u.dead) continue;
      const key = Math.floor(u.pos.z / c) * 1000 + Math.floor(u.pos.x / c);
      let bucket = this.spatial.get(key);
      if (!bucket) {
        bucket = [];
        this.spatial.set(key, bucket);
      }
      bucket.push(u);
    }
  }

  private deliverGather(dropId: number, unitId: number, amount: number, resource: string): void {
    void unitId;
    const drop = this.buildings.get(dropId);
    if (!drop) return;
    if (amount > 0) {
      const p = this.players[drop.owner];
      p.resources[resource as keyof Resources] += amount;
      bus.emit('resources:changed', { player: drop.owner, resources: { ...p.resources } });
    }
  }

  private resolveDamage(
    attackerId: number,
    targetId: number,
    damage: number,
    from: any,
    damageType: DamageClass = 'heavy',
  ): void {
    const target = this.units.get(targetId) ?? this.buildings.get(targetId);
    if (!target || target.dead) return;
    let armor: ArmorProfile;
    let armorMult = 1;
    if (target instanceof Unit) {
      armor = { light: target.stats.lightArmor, heavy: target.stats.heavyArmor };
      armorMult = target.armorMultiplier;
    } else {
      const a = (target as Building).stats.armor;
      armor = { light: a, heavy: a, building: a };
    }
    const elevated = target instanceof Unit && from?.pos ? elevationDamageMultiplier(from.pos.y, target.pos.y) : 1;
    const final = Math.max(1, computeDamage(damage, damageType, armor, armorMult) * elevated);
    target.takeDamage(final, attackerId);
    const dmgH = target instanceof Unit ? 2.2 : 2.6;
    this.hud?.addDamageNumber(target.pos.x, target.pos.y + dmgH, target.pos.z, final, final >= 40 ? 'big' : 'normal');
    // impact per hit (blood on units, dust/sparks on structures)
    if (target instanceof Unit) {
      this.particles.emit({
        x: target.pos.x,
        y: target.pos.y + 0.9,
        z: target.pos.z,
        count: 4,
        color: 0x7a1010,
        kind: 'dust',
        speed: 1.5,
        life: 0.4,
        size: 0.7,
        grow: 0.3,
        gravity: 10,
        spread: 1.6,
      });
    } else {
      this.particles.emit({
        x: target.pos.x,
        y: target.pos.y + 1.3,
        z: target.pos.z,
        count: 5,
        color: 0xcbb086,
        kind: 'dust',
        speed: 1.2,
        life: 0.45,
        size: 0.9,
        grow: 1.0,
        gravity: 6,
        spread: 1.4,
      });
      if (this.fxRng.float() < 0.5)
        this.particles.emit({
          x: target.pos.x,
          y: target.pos.y + 1.4,
          z: target.pos.z,
          count: 2,
          color: 0xffaa55,
          kind: 'spark',
          speed: 2,
          life: 0.25,
          size: 0.9,
          gravity: 8,
          spread: 1.5,
        });
    }
    if (target.owner === 0) this.notifyUnderAttack(target);
    const owner = from?.owner ?? -1;
    if (owner === 0) {
      this.lastBattleEvent = targetId;
    }
    if (target.dead && owner !== -1) {
      const attackerPlayer = this.players[owner];
      if (attackerPlayer) {
        attackerPlayer.kills++;
        attackerPlayer.stats.destroyed++;
      }
      bus.emit('fx:death', {});
    }
  }

  private lastBaseAlert = 0;
  private lastUnitAlert = 0;

  private notifyUnderAttack(target: Unit | Building): void {
    const now = performance.now();
    if (target instanceof Building) {
      if (now - this.lastBaseAlert > 4000) {
        this.lastBaseAlert = now;
        bus.emit('alert', {
          icon: '🚨',
          text: `¡${BUILDING_INFO[target.kind].name} atacada!`,
          x: target.pos.x,
          z: target.pos.z,
          warn: true,
        });
      }
    } else if (target.hp / target.maxHp < 0.5 && now - this.lastUnitAlert > 3000) {
      this.lastUnitAlert = now;
      bus.emit('alert', { icon: '⚠️', text: 'Unidad bajo ataque', x: target.pos.x, z: target.pos.z, warn: true });
    }
  }

  private spawnProjectile(o: any): void {
    if (o.kind === 'howitzer_shell' || o.kind === 'nuclear') bus.emit('fx:artillery', {});
    else if (o.kind === 'arrow') bus.emit('fx:bow', {});
    else if (o.kind === 'sling_stone') bus.emit('fx:sling', {});
    else bus.emit('fx:shot', {});
    const p = new Projectile(this.scene, {
      ...o,
      getTargetPos: () => {
        const t = this.units.get(o.targetId) ?? this.buildings.get(o.targetId);
        return t && !t.dead ? t.pos : null;
      },
      onHit: (targetId: number | undefined) => {
        this.applyProjectileDamage(o, targetId);
      },
    });
    this.projectiles.push(p);
  }

  private applyProjectileDamage(o: any, targetId: number | undefined): void {
    const impact = o.target as THREE.Vector3;
    const damageType: DamageClass = o.damageType ?? 'heavy';
    if (o.area && o.area > 0) {
      // area damage
      const targets: { t: any; d: number }[] = [];
      for (const u of this.units.values()) {
        if (u.dead || u.owner === o.owner) continue;
        if (this.players[u.owner]?.team === this.players[o.owner]?.team) continue;
        const d = u.pos.distanceTo(impact);
        if (d < o.area) targets.push({ t: u, d });
      }
      for (const b of this.buildings.values()) {
        if (b.dead || b.owner === o.owner) continue;
        const d = b.pos.distanceTo(impact);
        if (d < o.area) targets.push({ t: b, d });
      }
      for (const { t, d } of targets) {
        const falloff = 1 - d / o.area;
        this.resolveDamage(o.owner, t.id, o.damage * falloff, { owner: o.owner }, damageType);
      }
      // explosion smoke
      this.particles.emit({
        x: impact.x,
        y: impact.y + 1,
        z: impact.z,
        count: 14,
        color: 0x997755,
        kind: 'smoke',
        speed: 2,
        life: 1.8,
        size: 3,
      });
      this.camera.addShake(0.5);
      bus.emit('fx:explosion', {});
    } else if (targetId !== undefined) {
      const target = this.units.get(targetId) ?? this.buildings.get(targetId);
      if (target && !target.dead) {
        this.resolveDamage(o.owner, targetId, o.damage, { owner: o.owner }, damageType);
      }
    } else {
      // no targetId: damage the enemy closest to the impact point
      let best: any = null;
      let bestD = Infinity;
      for (const u of this.units.values()) {
        if (u.dead || u.owner === o.owner) continue;
        if (this.players[u.owner]?.team === this.players[o.owner]?.team) continue;
        const d = u.pos.distanceTo(impact);
        if (d < bestD) {
          bestD = d;
          best = u;
        }
      }
      if (!best) {
        for (const b of this.buildings.values()) {
          if (b.dead || b.owner === o.owner) continue;
          const d = b.pos.distanceTo(impact);
          if (d < bestD) {
            bestD = d;
            best = b;
          }
        }
      }
      if (best && bestD < 3) this.resolveDamage(o.owner, best.id, o.damage, { owner: o.owner }, damageType);
    }
  }

  /** Nearest walkable point in the main landmass, searching the whole map. */
  private mainComponentPoint(x: number, z: number): { x: number; z: number } | null {
    const main = this.pathfinder.mainComponent();
    return this.pathfinder.nearestWalkablePoint(x, z, this.pathfinder.grid.cols, main);
  }

  /**
   * A walkable point in the main landmass. Spawns that would land in a pocket
   * enclosed by trees, houses or props are moved to the nearest main-component cell.
   */
  private mainComponentSpot(x: number, z: number): { x: number; z: number } {
    const main = this.pathfinder.mainComponent();
    if (this.pathfinder.componentAt(x, z) === main) return { x, z };
    return this.mainComponentPoint(x, z) ?? { x, z };
  }

  /** Spawn around a building on the rally's landmass (or the main one), avoiding isolated pockets. */
  private spawnPointAround(b: Building, component = this.pathfinder.mainComponent()): { x: number; z: number } {
    const startAngle = this.rng.float() * Math.PI * 2;
    const baseR = b.radius + 0.5;
    for (let i = 0; i < 12; i++) {
      const angle = startAngle + (i / 12) * Math.PI * 2;
      for (const pad of [0, 1.2, 2.4]) {
        const x = b.pos.x + Math.cos(angle) * (baseR + pad);
        const z = b.pos.z + Math.sin(angle) * (baseR + pad);
        if (this.pathfinder.componentAt(x, z) === component) return { x, z };
      }
    }
    return (
      this.pathfinder.nearestWalkablePoint(b.pos.x, b.pos.z, this.pathfinder.grid.cols, component) ?? {
        x: b.pos.x + baseR,
        z: b.pos.z,
      }
    );
  }

  // --- spawn from buildings ---

  unitSpawn = (buildingId: number, unit: UnitKind, rally: OrderTarget, hasRally: boolean): boolean => {
    const b = this.buildings.get(buildingId);
    if (!b) return false;
    const player = b.owner;
    const p = this.players[player];
    const stats = getUnitStats(unit, p.era);
    if (p.populationUsed + stats.population > p.populationCap) {
      return false;
    }
    const ctx = this.makeBuildContext(player);
    const u = new Unit(unit, player, p.era, ctx);
    const rallyComponent = hasRally && rally ? this.pathfinder.componentAt(rally.x, rally.z) : 0;
    const { x: px, z: pz } = this.spawnPointAround(b, rallyComponent || undefined);
    u.pos.set(px, this.terrain.getHeight(px, pz), pz);
    u.setContext(this.unitContext);
    this.applyPlayerBonuses(u, p);
    u.attach(this.scene);
    this.units.set(u.id, u);
    p.populationUsed += stats.population;
    p.stats.created++;
    if (hasRally) {
      u.issueOrder({ kind: OrderKind.MOVE, target: rally });
    }
    // worker auto-gathering
    if (unit === UnitKind.WORKER && !hasRally) {
      this.economy.assignWorker(u.id);
    }
    return true;
  };

  techComplete = (playerId: number, techId: string): void => {
    const p = this.players[playerId];
    p.techs.add(techId);
    const tech = getTech(techId);
    if (tech) {
      if (tech.effect.attackMult) {
        p.bonus.attack += tech.effect.attackMult;
        this.applyAttackBonus(playerId, tech.effect.attackMult);
      }
      if (tech.effect.armorMult) {
        p.bonus.armor += tech.effect.armorMult;
        this.applyArmorBonus(playerId, tech.effect.armorMult);
      }
      if (tech.effect.gatheringMult) {
        for (const k of RESOURCE_KEYS) {
          const v = tech.effect.gatheringMult[k];
          if (v) {
            p.bonus.gathering[k] = (p.bonus.gathering[k] ?? 0) + v;
            this.applyGatherBonus(playerId, k, v);
          }
        }
      }
      if (tech.effect.capacityBonus) {
        p.bonus.carry += tech.effect.capacityBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId && u.kind === UnitKind.WORKER)
            u.setCarryCapacity(u.maxCarry + tech.effect.capacityBonus);
        }
      }
      if (tech.effect.losBonus) {
        p.bonus.los += tech.effect.losBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId) u.stats.los += tech.effect.losBonus;
        }
      }
      if (tech.effect.rangeBonus) {
        p.bonus.range += tech.effect.rangeBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId && u.stats.range > 0) u.stats.range += tech.effect.rangeBonus;
        }
      }
      if (tech.effect.speedBonus) {
        p.bonus.speed += tech.effect.speedBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId) u.stats.speed += tech.effect.speedBonus;
        }
      }
      if (tech.effect.priceDiscount) {
        p.bonus.training += tech.effect.priceDiscount;
      }
    }
    this.hud.showToast(`Tecnología completada: ${tech?.name ?? techId}`, 'info');
  };

  private applyPlayerBonuses(u: Unit, p: PlayerState): void {
    u.attackMultiplier += p.bonus.attack;
    u.armorMultiplier += p.bonus.armor;
    for (const k of RESOURCE_KEYS) {
      const v = p.bonus.gathering[k];
      if (v) u.gatherMultiplier += v;
    }
    if (p.bonus.carry) u.setCarryCapacity(u.maxCarry + p.bonus.carry);
    u.stats.los += p.bonus.los;
    if (u.stats.range > 0) u.stats.range += p.bonus.range;
    u.stats.speed += p.bonus.speed;
  }

  private applyAttackBonus(playerId: number, mult: number): void {
    for (const u of this.units.values()) {
      if (u.owner === playerId) u.attackMultiplier += mult;
    }
  }
  private applyArmorBonus(playerId: number, mult: number): void {
    for (const u of this.units.values()) {
      if (u.owner === playerId) u.armorMultiplier += mult;
    }
  }
  private applyGatherBonus(playerId: number, _res: keyof Resources, mult: number): void {
    for (const u of this.units.values()) {
      if (u.owner === playerId && u.kind === UnitKind.WORKER) u.gatherMultiplier += mult;
    }
  }

  // --- era advancement ---

  canAdvanceEra(player: number): { ok: boolean; reason?: string } {
    const p = this.players[player];
    if (p.era >= Era.CONTEMPORARY) return { ok: false, reason: 'Era máxima' };
    const def = ERA_DEFS[p.era];
    if (!def.advanceCost) return { ok: false, reason: 'Sin coste' };
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < (def.advanceCost[k] ?? 0)) {
        return { ok: false, reason: 'Recursos insuficientes' };
      }
    }
    const count = [...this.buildings.values()].filter(
      (b) =>
        b.owner === player &&
        b.constructionComplete &&
        (b.kind === BuildingKind.CENTER ||
          b.kind === BuildingKind.FORTRESS ||
          b.kind === BuildingKind.MARKET ||
          b.kind === BuildingKind.INSTITUTE),
    ).length;
    if (count < def.advanceRequiredBuildings) {
      return { ok: false, reason: `Necesitas ${def.advanceRequiredBuildings} edificio(s) de avance` };
    }
    return { ok: true };
  }

  advanceEra(player: number): boolean {
    const check = this.canAdvanceEra(player);
    if (!check.ok) {
      this.hud.showToast(check.reason ?? 'No puedes avanzar', 'warning');
      return false;
    }
    const p = this.players[player];
    const def = ERA_DEFS[p.era];
    for (const k of RESOURCE_KEYS) p.resources[k] -= def.advanceCost?.[k] ?? 0;
    p.era = (p.era + 1) as Era;
    bus.emit('player:era', { player, era: p.era });
    // modernize buildings
    const ctx = this.makeBuildContext(player);
    for (const b of this.buildings.values()) {
      if (b.owner === player) {
        b.modernize(p.era, ctx);
      }
    }
    // modernize units in the field
    this.modernizeUnits(player);
    this.hud.showToast(`¡Avanzaste a la ${ERA_DEFS[p.era].name}!`, 'success');
    this.audio.setEra(p.era);
    this.audio.eraAdvance();
    this.camera.addShake(0.4);
    return true;
  }

  private modernizeUnits(player: number): void {
    const p = this.players[player];
    const ctx = this.makeBuildContext(player);
    for (const u of this.units.values()) {
      if (u.owner !== player) continue;
      u.stats = getUnitStats(u.kind, p.era);
      u.maxHp = u.stats.hp;
      if (u.hp > u.maxHp) u.hp = u.maxHp;
      // rebuild model
      const old = u.view.group;
      const model = buildModel(getUnitModel(u.kind, p.era), ctx);
      model.position.copy(old.position);
      model.rotation.copy(old.rotation);
      if (old.parent) {
        old.parent.add(model);
        old.parent.remove(old);
      }
      u.view.dispose();
      disposeModel(old);
      u.view = new EntityView(model, u.radius, u);
      u.findPivots(model);
      // reset multipliers before re-applying (avoids double counting)
      u.attackMultiplier = 1;
      u.armorMultiplier = 1;
      u.gatherMultiplier = 1;
      u.setCarryCapacity(10);
      this.applyPlayerBonuses(u, p);
    }
  }

  // --- fog of war ---

  private updateFow(): void {
    if (!this.settings.fogOfWar) return;
    for (const u of this.units.values()) {
      if (u.owner !== 0 || u.dead) continue;
      this.fow.reveal(u.pos.x, u.pos.z, u.stats.los + 2);
    }
    for (const b of this.buildings.values()) {
      if (b.owner !== 0 || b.dead) continue;
      this.fow.reveal(b.pos.x, b.pos.z, b.stats.los + 2);
    }
    // hide enemy entities that are not visible
    for (const u of this.units.values()) {
      if (u.owner === 0) continue;
      const vis = this.fow.isVisible(u.pos.x, u.pos.z) || !this.settings.fogOfWar;
      u.view.group.visible = vis;
    }
    for (const b of this.buildings.values()) {
      if (b.owner === 0) continue;
      const vis = this.fow.isVisible(b.pos.x, b.pos.z) || !this.settings.fogOfWar;
      b.view.group.visible = vis;
    }
    this.fow.upload();
    this.fow.decay();
  }

  /** Hide distant and unexplored resource nodes (LOD). */
  private applyLod(): void {
    const t = this.camera.getTarget();
    const lod = this.camera.getZoom() * 1.2 + 40;
    const lod2 = lod * lod;
    const fog = this.settings.fogOfWar;
    for (const n of this.resourceNodes.values()) {
      const dx = n.pos.x - t.x;
      const dz = n.pos.z - t.z;
      const near = dx * dx + dz * dz <= lod2;
      n.setVisibleEx(near && (!fog || this.fow.isExplored(n.pos.x, n.pos.z)));
    }
  }

  /** Enable/disable fog of war and reflect the change on the terrain. */
  setFogOfWar(on: boolean): void {
    this.settings.fogOfWar = on;
    this.fow.setEnabled(on);
    this.terrain.setFow(this.fow.texture, on);
    this.fowUniforms.fowEnabled.value = on ? 1 : 0;
    if (!on) {
      for (const u of this.units.values()) u.view.group.visible = true;
      for (const b of this.buildings.values()) b.view.group.visible = true;
      for (const n of this.resourceNodes.values()) n.setVisibleEx(true);
    }
  }

  // --- population ---

  private updatePopulation(): void {
    for (const p of this.players) {
      let used = 0;
      for (const u of this.units.values()) {
        if (u.owner === p.id && !u.dead && u.garrisonedIn === null) {
          used += u.stats.population;
        }
      }
      p.populationUsed = used;
      let cap = 3; // initial center
      for (const b of this.buildings.values()) {
        if (b.owner === p.id && b.constructionComplete) {
          cap += b.providesPop;
        }
      }
      // a civilization population bonus deliberately raises the match cap
      p.populationCap = Math.min(this.settings.populationCap, cap + 4) + p.bonus.population;
    }
  }

  // --- victory ---

  private checkVictory(): void {
    if (this.gameEnded) return;
    // in campaign, victory/defeat is decided by the mission
    if (this.mission) return;
    for (const p of this.players) {
      if (!p.alive) continue;
      // conquest: a player is defeated only when no building of theirs remains
      if (!this.hasBuildings(p.id)) {
        p.alive = false;
        bus.emit('player:defeat', { player: p.id });
        const other = this.players.find((q) => q.id !== p.id);
        if (other && other.alive) {
          this.endGame(other.id);
        }
        return;
      }
    }
  }

  /** True if the player still owns at least one standing building. */
  hasBuildings(player: number): boolean {
    for (const b of this.buildings.values()) {
      if (b.owner === player && !b.dead) return true;
    }
    return false;
  }

  private endGame(winner: number): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.finishRecording();
    bus.emit('game:end', { winner });
  }

  /** Persist the recorded replay (called when the match ends). */
  private finishRecording(): void {
    if (!this.recorder) return;
    saveReplay(this.recorder.toReplay());
    this.recorder = null;
  }

  /** Save the current recording without clearing it (e.g. leaving a match early). */
  saveRecording(): void {
    if (this.recorder) saveReplay(this.recorder.toReplay());
  }

  // --- main update ---

  private update(dt: number, time: number): boolean {
    const t = time;
    const realTime = performance.now() / 1000;
    if (this.paused) {
      this.hud.update(dt, realTime);
      return false;
    }
    this.qualityGovernor.update(dt);
    if (this.replay) {
      for (const cmd of this.replay.commandsFor(this.stepCount)) this.executeCommand(cmd, false);
    }
    const d = dt;

    this.sky.update(realTime);
    this.water.setSunDir(this.sky.sunDir);
    this.water.setDayFactor(this.sky.getDayFactor());
    this.water.update(realTime);
    this.terrain.setSunLight(this.sky.sunDir, this.sky.getSunColor());
    this.terrain.update(realTime);
    // cloud shadows: dim the sun according to cloud density near the sun
    const cs = cloudDensity(this.sky.sunDir.x * 900 + realTime * 3, this.sky.sunDir.z * 900) * 0.22;
    this.terrain.setCloudShadow(1 - cs);
    this.particles.update(d);
    this.debris.update(d);
    this.markers.update(d);
    this.trees.update(d);
    this.wildlife.update(d);

    // a blocking menu/modal suppresses camera panning (edge/keyboard/drag)
    this.camera.setUiCaptured(this.hud.hasBlockingOverlay());
    // edge scrolling is off while the pointer is over a HUD control
    this.camera.setPointerOverUi(this.isPointerOverUi());
    this.camera.update(d, realTime);
    this.rebuildSpatial();

    // units
    for (const u of this.units.values()) {
      if (u.dead) continue;
      u.ctx = this.unitContext;
      // show a health bar for selected or damaged units (all owners): makes fights
      // and wounded enemies readable without hovering
      u.view.showHealthBar(u.selected || u.hp < u.maxHp, this.players[u.owner].color);
      u.update(d, t);
      u.view.faceHealthBar(this.camera.camera.quaternion);
    }
    // buildings
    for (const b of this.buildings.values()) {
      if (b.dead) continue;
      b.ctx = this.unitContext;
      b.update(d, t);
    }
    // resources
    for (const n of this.resourceNodes.values()) {
      if (n.dead) continue;
      n.update(realTime);
    }
    // projectiles
    for (const p of this.projectiles) {
      p.update(d);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    updateProjectilePools(d);

    this.updateFow();
    this.applyLod();
    this.updatePopulation();

    // campaign mission: evaluate BEFORE cleaning up dead so that
    // objectives detect freshly destroyed entities (destroy/protect)
    this.mission?.update(d, t);
    this.tutorial?.update(d);

    // clean up dead
    this.cleanupDead(d);

    // Alert of attack on the player base
    this.alertTimer -= d;
    if (this.alertTimer <= 0) {
      this.alertTimer = 3;
      this.checkBaseThreat();
    }

    // AI
    for (const ai of this.ais) ai.update(d, t);

    this.checkVictory();

    this.hud.update(d, realTime);
    this.stepCount++;
    return true;
  }

  private cleanupDead(dt: number): void {
    for (const [id, u] of this.units) {
      if (u.dead) {
        this.spawnDeathFx(u.view, 'unit', u.radius, () => u.removeFromScene());
        this.units.delete(id);
      }
    }
    for (const [id, b] of this.buildings) {
      if (b.dead) {
        const h = this.obstacleHandles.get(b.id);
        if (h) {
          this.pathfinder.removeObstacle(h);
          this.obstacleHandles.delete(b.id);
        }
        this.spawnDeathFx(b.view, 'building', b.radius, () => b.removeFromScene());
        this.buildings.delete(id);
      }
    }
    for (const [id, n] of this.resourceNodes) {
      if (n.dead) {
        const h = this.obstacleHandles.get(n.id);
        if (h) {
          this.pathfinder.removeObstacle(h);
          this.obstacleHandles.delete(n.id);
        }
        this.resourceNodes.delete(id);
      }
    }
    this.updateDeathFx(dt);
  }

  /** Register a topple/collapse animation for a just-removed entity's model. */
  private spawnDeathFx(view: EntityView, kind: 'unit' | 'building', radius: number, cleanup: () => void): void {
    const building = kind === 'building';
    if (building) {
      this.debris.spawn(
        view.group.position.x,
        view.group.position.y + 0.6,
        view.group.position.z,
        14,
        radius,
        view.group.position.y,
      );
    }
    this.deathFx.push({
      view,
      t: 0,
      dur: building ? 1.1 : 0.5,
      topple: building ? 0.12 : Math.PI * 0.5,
      sink: building ? radius * 0.55 : 0.12,
      baseY: view.group.position.y,
      radius,
      building,
      emitTimer: 0,
      cleanup,
    });
  }

  private updateDeathFx(dt: number): void {
    if (!this.deathFx.length) return;
    const alive: DeathFx[] = [];
    for (const fx of this.deathFx) {
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.dur);
      const e = k * k; // ease-in: the fall accelerates
      fx.view.group.rotation.x = fx.topple * e;
      fx.view.group.position.y = fx.baseY - fx.sink * e;
      const s = 1 - 0.18 * e;
      fx.view.group.scale.set(s, Math.max(0.12, 1 - e), s);
      if (fx.building && k < 1) {
        fx.emitTimer -= dt;
        if (fx.emitTimer <= 0) {
          fx.emitTimer = 0.12;
          const px = fx.view.group.position.x;
          const pz = fx.view.group.position.z;
          this.particles.emit({
            x: px,
            y: fx.baseY + 1,
            z: pz,
            count: 2,
            color: 0x8a7a66,
            kind: 'dust',
            speed: 1.0,
            life: 1.4,
            size: 2.6,
            spread: Math.max(1, fx.radius),
            gravity: 0.5,
          });
          this.particles.emit({
            x: px,
            y: fx.baseY + 0.8,
            z: pz,
            count: 2,
            color: 0xff7a20,
            kind: 'fire',
            speed: 1.1,
            life: 0.7,
            size: 2.4,
            spread: Math.max(0.6, fx.radius * 0.7),
          });
        }
      }
      if (k >= 1) {
        fx.cleanup();
      } else {
        alive.push(fx);
      }
    }
    this.deathFx = alive;
  }

  private ais: AI[] = [];
  private alertTimer = 0;
  private alerted = false;

  private checkBaseThreat(): void {
    const center = [...this.buildings.values()].find((b) => b.owner === 0 && b.kind === BuildingKind.CENTER && !b.dead);
    if (!center) {
      this.alerted = false;
      return;
    }
    let threat = false;
    for (const u of this.units.values()) {
      if (u.owner === 0 || u.dead) continue;
      if (this.players[u.owner]?.team === this.players[0]?.team) continue;
      if (distance2D(u.pos.x, u.pos.z, center.pos.x, center.pos.z) < 22) {
        threat = true;
        break;
      }
    }
    if (threat && !this.alerted) {
      this.alerted = true;
      this.audio.alarm();
      bus.emit('alert', {
        icon: '🚨',
        text: '¡Tu base está bajo ataque!',
        x: center.pos.x,
        z: center.pos.z,
        warn: true,
      });
      this.camera.focusOn(center.pos.x, center.pos.z);
    } else if (!threat && this.alerted) {
      this.alerted = false;
    }
  }

  // --- render ---

  private render(): void {
    if ((window as any).__directRender) {
      this.renderer.render(this.scene, this.camera.camera);
      return;
    }
    this.renderWaterRefraction();
    this.postfx.render(0.016);
  }

  /**
   * Screen-space refraction source: render the scene with the water hidden into
   * the water's target, so its shader can sample the (distorted) seabed. Only
   * when the cinematic effects are on — it costs an extra scene pass.
   */
  private renderWaterRefraction(): void {
    // extra full-scene pass: off in classic mode and once the preset drops to low
    if (!this.syncWaterRefraction()) return;
    const prev = this.renderer.getRenderTarget();
    this.water.mesh.visible = false;
    this.renderer.setRenderTarget(this.water.refractionRT);
    this.renderer.render(this.scene, this.camera.camera);
    this.renderer.setRenderTarget(prev);
    this.water.mesh.visible = true;
  }

  /** Apply the refraction gate to the water material; returns whether it is on. */
  private syncWaterRefraction(): boolean {
    const on = this.shouldRenderWaterRefraction();
    this.water.setRefraction(on);
    return on;
  }

  private onResize(): void {
    const ratio = this.pixelRatioOverride ?? Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.postfx.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.syncWaterRefractionSize();
  }

  private syncWaterRefractionSize(): void {
    if (!this.water) return;
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.water.setSize(db.x, db.y);
  }

  getSelectedUnits(): Unit[] {
    return this.selectedUnits.map((id) => this.units.get(id)).filter((u): u is Unit => !!u && !u.dead);
  }

  /** Select and focus a player-owned unit, e.g. from a blocked-worker alert. */
  focusUnit(id: number): void {
    const u = this.units.get(id);
    if (!u || u.dead || u.owner !== 0) return;
    this.selectedUnits = [id];
    this.selectedBuilding = null;
    this.selectedHeritage = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [id] });
    this.camera.focusOn(u.pos.x, u.pos.z);
  }

  getSelectedBuilding(): Building | null {
    return this.selectedBuilding !== null ? (this.buildings.get(this.selectedBuilding) ?? null) : null;
  }

  getSelectedHeritage(): HeritageBuildingDef | null {
    return getHeritageBuilding(this.selectedHeritage);
  }

  getAssemblyState(): string {
    return this.mission?.getObjectiveState('obj_asamblea') ?? 'pendiente';
  }

  canStartAssembly(): boolean {
    return this.mission?.canActivateObjective('obj_asamblea') ?? false;
  }

  startAssembly(): boolean {
    return this.mission?.activateObjective('obj_asamblea') ?? false;
  }

  /** Hand over a field-card offering at the authored site. */
  makeOffering(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'offer', 'ofrenda', 'templo');
  }

  /** Exchange elite goods at a Moche/Recuay site card. */
  makeTrade(id: HeritageBuildingId): boolean {
    return this.makeHeritageExchange(id, 'trade', 'intercambio', 'huacas');
  }

  private makeHeritageExchange(
    id: HeritageBuildingId,
    operation: 'offer' | 'trade',
    noun: string,
    place: string,
  ): boolean {
    const def = getHeritageBuilding(id);
    if (!def || def.operation !== operation) return false;
    const resource = def.operationResource ?? 'silver';
    const amount = def.operationAmount ?? 50;
    const anchor = this.siteAnchor ?? this.siteCenter;
    const near = anchor
      ? [...this.units.values()].some(
          (unit) =>
            unit.owner === 0 &&
            !unit.dead &&
            unit.kind === UnitKind.WORKER &&
            distance2D(unit.pos.x, unit.pos.z, anchor.x, anchor.z) < 18,
        )
      : false;
    if (!near) {
      this.hud?.showToast(
        `Acerca un obrero a las ${place} para ${operation === 'offer' ? 'entregar' : 'intercambiar'}.`,
        'warning',
      );
      return false;
    }
    const resourceName = RESOURCE_INFO[resource].name.toLowerCase();
    if (this.players[0].resources[resource] < amount) {
      this.hud?.showToast(
        `Necesitas ${amount} de ${resourceName} para ${operation === 'offer' ? 'la' : 'el'} ${noun}.`,
        'warning',
      );
      return false;
    }
    const recorded = this.mission?.recordDelivery(resource, amount) ?? 0;
    if (recorded <= 0) {
      this.hud?.showToast(`No hay ${operation === 'offer' ? 'una' : 'un'} ${noun} pendiente en este momento.`, 'info');
      return false;
    }
    this.players[0].resources[resource] -= recorded;
    this.hud?.showToast(
      `${noun[0].toUpperCase()}${noun.slice(1)} ${noun === 'ofrenda' ? 'entregada' : 'entregado'}: ${recorded} de ${resourceName}.`,
      'success',
    );
    this.audio.uiClick?.();
    return true;
  }

  isHeritageVisited(id: HeritageBuildingId): boolean {
    return this.visitedHeritage.has(id);
  }

  getVisitedHeritage(): HeritageBuildingId[] {
    return [...this.visitedHeritage];
  }

  setVisitedHeritage(ids: HeritageBuildingId[]): void {
    this.visitedHeritage.clear();
    for (const id of ids) if (getHeritageBuilding(id)) this.visitedHeritage.add(id);
  }

  visitHeritage(id: HeritageBuildingId): void {
    const def = getHeritageBuilding(id);
    if (!def) return;
    this.visitedHeritage.add(def.id);
    this.hud?.showToast(`Ficha registrada: ${def.name}`, 'success');
    this.audio.uiClick?.();
  }

  /** Select a building by id (debug harness and inspector tests). */
  selectBuilding(id: number): void {
    const b = this.buildings.get(id);
    if (!b || b.dead) return;
    this.selectedUnits = [];
    this.selectedBuilding = id;
    this.selectedHeritage = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [] });
    this.audio.select();
  }

  /** Replace the unit selection with the given ids (only own and alive). */
  selectUnits(ids: number[]): void {
    const valid = ids.filter((id) => {
      const u = this.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.selectedUnits = valid;
    this.selectedBuilding = null;
    this.selectedHeritage = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [...valid] });
    this.audio.select();
  }

  /** Register teardown work (debug harnesses) that must run before shared caches are freed. */
  onDestroy(fn: () => void): void {
    this.teardownHooks.push(fn);
  }

  destroy(): void {
    this.loop.stop();
    if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf);
    this.camera.dispose();
    window.removeEventListener('resize', this.onResizeBound);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.terrain.dispose();
    this.sky.dispose();
    this.water.dispose();
    this.particles.dispose();
    this.debris.dispose();
    this.markers.dispose();
    for (const node of this.resourceNodes.values()) node.remove();
    this.resourceNodes.clear();
    this.trees.dispose();
    this.props.dispose();
    this.wildlife.dispose();
    if (this.landmark) {
      this.landmarkLoadToken++;
      this.scene.remove(this.landmark);
      if (this.landmarkOwnsStatic) disposeStaticGltf(this.landmark);
      else disposeModel(this.landmark);
      this.landmark = null;
      this.landmarkOwnsStatic = false;
    }
    if (this.landscape) {
      this.scene.remove(this.landscape.group);
      this.landscape.dispose();
      this.landscape = null;
    }
    if (this.setpiece) {
      this.setpiece.dispose();
      this.setpiece = null;
    }
    if (this.canalGroup) {
      this.scene.remove(this.canalGroup);
      disposeStaticGltf(this.canalGroup);
      this.canalGroup = null;
      this.canalSite = null;
    }
    if (this.scenarioDecor) {
      this.scene.remove(this.scenarioDecor);
      disposeModel(this.scenarioDecor);
      this.scenarioDecor = null;
    }
    for (const overlay of this.settlements) overlay.dispose();
    this.settlements = [];
    for (const dressing of this.settlementDressing) dressing.dispose();
    this.settlementDressing = [];
    for (const fx of this.deathFx) fx.cleanup();
    this.deathFx = [];
    for (const unit of this.units.values()) unit.removeFromScene();
    this.units.clear();
    for (const hook of this.teardownHooks.splice(0)) hook();
    this.fow.dispose();
    this.postfx.dispose();
    clearModelAssets();
    clearModelCaches();
    clearFaunaTemplates();
    clearResourceCaches();
    clearTextureCache();
    this.renderer.dispose();
    canvas.remove();
  }
}

function buildModelForGhost(kind: BuildingKind, ctx: BuildContext): THREE.Group {
  const def = BUILDING_DEFS[kind];
  const modelType = Object.values(def.eraModel)[0];
  const g = buildModel({ type: modelType?.type ?? 'center_steam' }, ctx);
  // the ghost is a flat valid/invalid silhouette, so ignore the baked vertex colours
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    m.vertexColors = false;
    m.needsUpdate = true;
  });
  return g;
}
