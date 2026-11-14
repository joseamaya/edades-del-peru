import * as THREE from 'three';
import { bus } from './EventBus';
import { createRenderer, createPostFX } from '../rendering/Renderer';
import { PostFX } from '../rendering/PostFX';
import { SHADOW_MAP_SIZE } from '../rendering/shadowFrame';
import { Sky } from '../rendering/Sky';
import type { ArchitectureCity, CaralCity } from '../rendering/architectureKit';
import { isKnownPhase, standsAt, SINGLE_PHASE } from '../model/defs/sitePhases';
import { ENVIRONMENT_EVENTS, waterLevelOffset, type EnvironmentEventId } from './environment';
import { t } from '../i18n';
import { Terrain } from '../rendering/Terrain';
import { HeadlessTerrain } from '../sim/HeadlessTerrain';
import { Water } from '../rendering/Water';
import { CulturalLandscape } from '../rendering/CulturalLandscape';
import { SacredCity } from '../rendering/SacredCity';
import { Particles } from '../rendering/Particles';
import { Debris } from '../rendering/Debris';
import { RTSCamera } from './Camera';
import { GameLoop } from './GameLoop';
import { Fow } from '../game/Fow';
import { FowTexture } from '../rendering/FowTexture';
import { Pathfinder, MAX_WALKABLE_SLOPE, fishingApproach } from '../game/Pathfinding';
import { planStartSettlement } from '../sim/WorldBuilder';
import { Unit, UnitContext, HARVEST_STAND_RANGE, FISHERS_PER_GROUND } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode } from '../entities/ResourceNode';
import { clearResourceCaches } from '../rendering/ResourceNodeView';
import { OrderMarkers } from '../entities/OrderMarker';
import { TreeInstances, kitLod0RadiusFor } from '../rendering/TreeInstances';
import { PropKitInstances } from '../rendering/PropKitInstances';
import type { SiteCrew } from '../rendering/SiteCrew';
import type { CaralMayorPhase } from '../model/defs/caralPhases';
import { loadPropsKit } from '../rendering/propsKit';
import { isCoastalRegion, loadKitModel } from '../rendering/vegetationKit';
import { attachVegetationKit } from '../rendering/vegetationKitLoader';
import { Props } from '../rendering/Props';
import { GroundCover } from '../rendering/GroundCover';
import { MapLabels } from '../rendering/MapLabels';
import { CharacterLabels } from '../rendering/CharacterLabels';
import { HeroMarkers } from '../rendering/HeroMarkers';
import type { AylluSite } from '../rendering/AylluSite';
import type { ColonialLife } from '../rendering/ColonialLife';
import { MemoryStones } from '../rendering/MemoryStones';
import { Discoveries } from '../game/Discoveries';
import { Wildlife } from '../rendering/Wildlife';
import { clearFaunaTemplates } from '../rendering/faunaModels';
import { clearModelAssets } from '../rendering/ModelAssets';
import { disposeStaticGltf } from '../rendering/StaticModel';
import { Projectile } from '../entities/Projectile';
import { ProjectileView } from '../rendering/ProjectileView';
import { attachBuilding, attachResource, attachUnit, detachUnit, rebuildBuilding } from '../rendering/RenderSync';
import { AI } from '../game/AI';
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
  Order,
  OrderKind,
  OrderTarget,
  Team,
  RESOURCE_KEYS,
  ResourceKind,
} from '../core/types';
import { getCiv } from '../model/defs/civs';
import { CANAL_PROP_MARGIN, DEFAULT_CANAL_WIDTH, canalEdgeHalfWidth } from '../model/defs/canal';
import { RNG } from '../util/rng';
import { distance2D, distanceToPath, distanceToPolyline, smoothPolyline } from '../util/math';
import { archProfileFor } from '../model/defs/architecture';
import { createFowUniforms, applyFowToObject } from '../rendering/FowMaterial';
import type { HeritageBuildingDef, HeritageBuildingId } from '../model/defs/heritage';
import { BuildContext, disposeModel, clearModelCaches } from '../model/ProceduralModel';
import { clearTextureCache } from '../rendering/Textures';
import { CAMERA_SPEED_SCALE, DEFAULT_SETTINGS, GameSettings, OPENING_BASE_CLEARANCE, STARTING_BANKS } from './Config';
import { QualityGovernor } from './QualityGovernor';
import {
  applyMapOverrides,
  quarryObstacleRadius,
  resolveMapProfile,
  type HistoricalMapProfile,
  type GeographicRegion,
} from '../model/defs/profiles';
import { resolveColorGrade } from '../model/defs/grades';
import type { SettlementPlan } from '../model/defs/settlementPlan';
import { inCaralCity, planCaralCity, type CaralCityPlan } from '../model/defs/setpieces';
import { riverCentreZ } from '../model/defs/terrainLayout';
import { SettlementOverlay } from '../rendering/SettlementOverlay';
import { SettlementDressing } from '../rendering/SettlementDressing';
import { VALLEY_FIELD_MARGIN, type CaralValleyPlan } from '../model/defs/caralValley';
import { farmYieldMultiplier, nearbyCanal } from '../model/defs/farmYield';
import { getAuthoredSite, isLatePeriod, type AuthoredSiteDef } from '../model/defs/sites';
import { detectSoftwareRenderer } from '../util/gpu';
import { ERA_DEFS } from '../model/defs/eras';
import { BUILDING_DEFS, BUILDING_INFO, getBuildingStats } from '../model/defs/buildings';
import { getUnitStats, unitAvailableToCiv, type DamageClass } from '../model/defs/units';
import { getTech } from '../model/defs/techs';
import { AudioEngine } from '../audio/AudioEngine';
import { Mission } from '../campaign/Mission';
import { Tutorial } from '../campaign/Tutorial';
import { tutorialForMission } from '../campaign/defs/tutorials';
import { PlayerCommand, Replay, ReplayPlayer, ReplayRecorder } from '../game/replay';
import { MatchStatsCollector } from '../game/matchStats';
import { applyMarketTrade, createMarketState, marketQuote, type MarketQuote, type MarketState } from '../game/market';
import { getMission } from '../campaign/defs/campaign';
import type { MissionDef, MissionAtmosphere, MissionLayout, MissionLabel, MissionPoint } from '../campaign/types';
import { CommandProcessor } from '../game/CommandProcessor';
import { InputController } from './InputController';
import { WorldViewDecor } from './WorldViewDecor';
import { RuntimeController, type DeathFx } from './RuntimeController';
import { StartBaseBuilder } from './StartBaseBuilder';
import { SelectionController, type DeliveryGate } from './SelectionController';
import { MissionRings } from '../rendering/MissionRings';
import { stateHashOf } from '../game/stateHash';
import type { SaveData, HarvestLedgerRow } from '../game/saveTypes';

/** When false the main loop does not auto-start, so tests can drive fixed steps from step 0. */
let autoStart = true;
export function setAutoStart(value: boolean): void {
  autoStart = value;
}

/** What sits under a screen point: at most one resource/unit/building. */
/** A death animation: animates a detached model, then frees it. */

/** Seed multipliers so ambient scatter does not correlate with the map/replay RNG. */

/** Shared empty list so matches without place names do not allocate one per frame. */
const NO_PLACE_NAMES: readonly MissionLabel[] = [];

/** Campaign intro flyover framing, relative to the player base. */
const INTRO_CAMERA = { offset: 34, fromHeight: 52, toZoom: 30, seconds: 2.6 } as const;
/** How long m1's drought takes to dry the valley out. */
const DROUGHT_SECONDS = 40;
/** Drought level change that deserves a farm-yield rescale (about half a dozen steps per ramp). */
const DROUGHT_YIELD_STEP = 0.05;
/** Keep guaranteed fishing searches inside the authored river and map edge. */

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
  missionAtmosphere?: MissionAtmosphere;
  /** Campaign pacing multiplier applied to every unit's base speed (1 = the skirmish speeds). */
  readonly unitSpeedScale: number;
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
  /** Named geography of the mission, drawn on the board and the minimap. */
  mapLabels: MapLabels | null = null;
  /** Nameplates over campaign characters (a unit tag that matches a commander). */
  characterLabels: CharacterLabels | null = null;
  /** Hero rings and banners over the Ayar. */
  heroMarkers: HeroMarkers | null = null;
  /** Huacas raised by myth beats, with the name of the character they remember. */
  memoryStones: MemoryStones | null = null;
  /** Fog-clearing "zone discovered" announcements for authored sites. */
  discoveries: Discoveries | null = null;
  /** Ground rings under the active reach/hold objectives (presentation only; follows the live fog). */
  missionRings: MissionRings | null = null;
  /** Stone mound that buries the Mayor's summit once the city is sealed. */
  private sealCap: THREE.Mesh | null = null;
  /** Authored canal target in world units (mission mechanic + visual). */
  canalSite: { x: number; z: number } | null = null;
  /** Authored departure/rendezvous anchor in world units (e.g. Caral's Act IV beach). */
  departureSite: { x: number; z: number } | null = null;
  /** Authored canal polyline in world units (intake first), when the mission defines one. */
  canalPath: { x: number; z: number }[] | null = null;
  private canalGroup: THREE.Group | null = null;
  canalWater: THREE.Mesh | null = null;
  canalGate: THREE.Mesh | null = null;
  private canalOpen = false;
  private scenarioDecor: THREE.Group | null = null;
  /** Decorative historical landmark of the map (visual only), if any. */
  landmark: THREE.Group | null = null;
  private landmarkOwnsStatic = false;
  landmarkLoadToken = 0;
  /** The Caral Sacred City in use (architecture kit), when the mission site is Caral. */
  caralCity: CaralCity | null = null;
  /** The Chavín ceremonial centre built by phases, when the mission site is Chavín. */
  chavinCity: ArchitectureCity | null = null;
  /** The ayllu world of Tambotoco (cave, shrine, hamlets, planned Inticancha); null elsewhere. */
  aylluSite: AylluSite | null = null;
  /** The colonial life around Lima/Cusco (houses, market, people); null elsewhere. */
  colonialSite: ColonialLife | null = null;
  /** The loaded authored site GLB, so a founding can hide it until the city phase. */
  siteModel: THREE.Group | null = null;
  /** Presentation-only construction crew in the Caral camp (issue 422); null elsewhere. */
  siteCrew: SiteCrew | null = null;
  /** Named environmental events and their progress (0 = off, 1 = fully applied). */
  environment: Record<string, number> = {};
  private environmentTargets: Record<string, number> = {};
  private environmentShown: Record<string, number> = {};
  /** Drought level whose yield factor is already folded into the standing farms. */
  private droughtFarmLevel = 0;
  /** Whether the standing fields are drawn with the late crops. */
  private caralLateShown = false;
  private droughtBaseAtmosphere: MissionAtmosphere | undefined;
  /** Construction phase of the authored site's main monument (mission-driven; the city follows it). */
  sitePhase = 'in_use';
  /** True when a loaded save supplied the phase/events, so trigger replay must not rewind them. */
  sitePhaseRestored = false;
  environmentRestored = false;
  setpieceLoadToken = 0;
  /** Cultural landscape (roads, fields, plazas, canals); visual only. */
  landscape: CulturalLandscape | null = null;
  /** Instanced low ground cover (ichu/grass/ferns/gravel); visual only. */
  groundCover: GroundCover | null = null;
  /** Per-base settlement overlays (planned fields/roads); visual only. */
  settlements: SettlementOverlay[] = [];
  /** Per-base settlement dressing (visual only). */
  settlementDressing: SettlementDressing[] = [];
  /** Visual-only valley plan; reserved before resources/props scatter. */
  private caralValleyPlan: CaralValleyPlan | null = null;
  caralValleyBase: { x: number; z: number } | null = null;
  /** Decorative Caral groves: instanced tree slots with no resource or obstacle behind them. */
  caralGroves: { slot: number; x: number; z: number }[] = [];
  private startSpots: [number, number][] = [];
  particles!: Particles;
  debris!: Debris;
  fow!: Fow;
  fowTexture!: FowTexture;
  /** Shared fog-of-war uniforms for the visual-only layers (landscape, overlays, landmark). */
  private readonly fowUniforms = createFowUniforms();
  pathfinder!: Pathfinder;
  markers!: OrderMarkers;
  trees!: TreeInstances;
  props!: Props;
  /** Instanced kit outcrops for stone nodes on authored scenarios; null in headless runs. */
  quarries: PropKitInstances | null = null;
  /** Instanced pacae shrubs; it exists on every rendered map but only Caral profiles feed it. */
  pacae: PropKitInstances | null = null;
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
  private projectileViews = new Map<number, ProjectileView>();

  readonly input = new InputController(this);
  readonly world = new WorldViewDecor(this);
  readonly runtime = new RuntimeController(this);
  readonly start = new StartBaseBuilder(this);
  readonly selection = new SelectionController(this);
  ais: AI[] = [];
  alertTimer = 0;
  lastBaseAlert = 0;
  lastUnitAlert = 0;
  alerted = false;
  idleCursor = -1;
  formationPreset: 'box' | 'line' | 'dispersed' = 'box';
  get placingBuilding(): { kind: BuildingKind; valid: boolean; ghost: THREE.Group } | null {
    return this.input.placingBuilding;
  }

  get mouseScreen(): THREE.Vector2 {
    return this.input.mouseScreen;
  }

  selectedUnits: number[] = [];
  selectedBuilding: number | null = null;
  selectedHeritage: HeritageBuildingId | null = null;
  readonly visitedHeritage = new Set<HeritageBuildingId>();
  obstacleHandles = new Map<number, { x: number; z: number; radius: number; gate?: boolean; owner?: number }>();
  private readonly spatialCell = 6;
  private spatial = new Map<number, Unit[]>();
  readonly headless: boolean;
  paused = false;
  gameEnded = false;
  private wonderReqTime = 300;
  /** Whether player 1 has an active opponent (skirmish, or a mission with an enemy). */
  private readonly enemyActive: boolean;
  private pendingSnapshot: SaveData | null = null;
  /** Simulation step counter (fixed 60Hz ticks), used to time recorded commands. */
  stepCount = 0;
  readonly matchStats = new MatchStatsCollector();
  /**
   * Monotonic amount harvested per player and node kind. Missions use it to count e.g. only
   * food fished (issue 378); unlike `resources` it never goes down when units are trained.
   */
  readonly harvested = new Map<number, Map<ResourceKind, number>>();
  markets: MarketState[] = [];
  /** Last finished/abandoned replay, kept for the post-game action. */
  lastReplay: Replay | null = null;
  fxRng!: RNG;
  private recorder: ReplayRecorder | null = null;
  private replay: ReplayPlayer | null = null;
  private commandProcessor!: CommandProcessor;
  private qualityGovernor!: QualityGovernor;
  /** Skip the software-renderer auto-degrade (`?cine=1`). */
  private readonly forceCinematic: boolean;
  /** True when the renderer is a software rasterizer (safe profile applied). */
  private softwareFallback = false;

  /** True when the renderer fell back to the software-safe profile. */
  get usesSoftwareRenderer(): boolean {
    return this.softwareFallback;
  }
  /** Source-backed place names of the current mission (normalized map coordinates). */
  get placeNames(): readonly MissionLabel[] {
    return this.missionLayout?.labels ?? NO_PLACE_NAMES;
  }
  /** One-shot death animations that outlive their entity (topple / collapse). */
  deathFx: DeathFx[] = [];
  private teardownHooks: (() => void)[] = [];

  constructor(
    settings: GameSettings,
    snapshot: SaveData | null = null,
    replay: Replay | null = null,
    forceCinematic = false,
    headless = false,
    /** False skips the mission's narrated intro and opening flight (?intro=0, ?noloop=1). */
    intro = true,
  ) {
    this.forceCinematic = forceCinematic;
    this.headless = headless;
    this.introEnabled = intro;
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
    this.unitSpeedScale = mis?.unitSpeedScale ?? 1;
    this.missionRegion = mis?.region;
    this.missionAtmosphere = mis?.atmosphere;
    this.missionLayout = mis?.layout;
    this.siteDef = getAuthoredSite(this.missionLayout?.site?.id);
    this.sitePhase = this.siteDef?.phases?.initial ?? 'in_use';
    this.enemyActive = !mis || mis.enemy.active;
    this.rng = new RNG((this.settings.mapSeed * 2654435761) >>> 0);
    // Cosmetic-only randomness must not consume the simulation sequence.
    this.fxRng = new RNG((this.settings.mapSeed * 2654435761 + 0x9e3779b9) >>> 0);
    if (!headless) {
      this.initRenderer();
      const cinematic = this.settings.cinematic && !this.softwareFallback;
      this.postfx.setCinematic(cinematic);
      this.postfx.setQuality(this.softwareFallback ? 'low' : this.settings.quality);
      this.qualityGovernor = new QualityGovernor(this);
      if (this.softwareFallback) this.qualityGovernor.setUserQuality('low');
    } else {
      const noop = (): void => {};
      const proxy = new Proxy({}, { get: () => noop });
      this.camera = proxy as never;
      this.postfx = proxy as never;
      this.particles = proxy as never;
      this.debris = proxy as never;
      this.markers = proxy as never;
      this.trees = proxy as never;
      this.props = proxy as never;
      this.wildlife = proxy as never;
      this.hud = proxy as never;
      this.qualityGovernor = proxy as never;
    }
    this.initWorld();
    this.unitContext = this.ctxFor();
    this.economy = new Economy(this);
    this.initPlayers();
    this.commandProcessor = new CommandProcessor({
      units: this.units,
      placeBuilding: (kind: BuildingKind, x: number, z: number) => this.placeBuilding(kind, x, z) !== null,
      trainUnit: (buildingId: number, unit: UnitKind) => this.trainUnit(buildingId, unit),
      researchTech: (buildingId: number, tech: string) => this.researchTech(buildingId, tech),
      cancelProduction: (buildingId: number, index: number) => this.cancelProduction(buildingId, index),
      ungarrison: (buildingId: number) => this.ungarrison(buildingId),
      setRallyPoint: (buildingId: number, target: OrderTarget) => this.setRallyPoint(buildingId, target),
      advanceEra: () => this.advanceEra(0),
      marketTrade: (resource, action, amount) => this.tradeMarket(0, resource, action, amount),
      replantFarm: (buildingId) => this.replantFarm(buildingId),
    });
    if (!this.headless) {
      if (this.missionLayout?.site) {
        this.world.spawnAuthoredSite(this.missionLayout.site);
      } else {
        this.world.spawnLandmark();
        this.world.spawnSacredCity();
      }
      this.world.spawnCanal();
      this.world.spawnMissionDecor();
      if (!this.pendingSnapshot) this.world.spawnMissionRoads();
      this.world.spawnCulturalLandscape();
      this.initInput();
      this.initHUD();
    }
    this.mission = mis ? new Mission(this, mis, (win) => this.missionEnd(win)) : null;
    const tutorialDef = mis ? tutorialForMission(mis.id) : undefined;
    this.tutorial =
      mis && mis.tutorial && tutorialDef && this.settings.showHints ? new Tutorial(this, tutorialDef) : null;
    if (!mis || mis.enemy.active) this.addAI(1);
    if (!this.headless) {
      this.audio.setEra(this.players[0].era);
      this.initAudio();
    }
    if (mis && !this.pendingSnapshot && !this.headless) this.applyMissionSetup(mis);
    if (this.pendingSnapshot) {
      this.applySnapshot(this.pendingSnapshot);
      // A loaded Caral save skips the opening-base pass that usually draws the valley: regenerate the
      // deterministic scenery here, before the ground cover is planned.
      const base = this.missionLayout?.base;
      if (!this.headless && base && this.siteDef?.environs?.valley === 'caral') {
        this.world.addCaralValley(base.x * this.settings.mapSize, base.z * this.settings.mapSize);
      }
    }
    if (!this.headless) this.initGroundCover();
    if (mis?.guaranteedFishing) this.world.ensureFishingGrounds(mis.guaranteedFishing);
    this.loop.onUpdate = (dt, t) => this.update(dt, t);
    this.loop.onRender = () => this.render();
    if (autoStart && !headless) this.loop.start();
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
    this.camera.setKeymap(this.settings.hotkeys);
    this.camera.setRotationEnabled(this.settings.rotateCamera);
    this.camera.setSpeedScale(CAMERA_SPEED_SCALE[this.settings.cameraSpeed]);
    this.camera.setEdgeScroll(this.settings.edgeScroll);
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
    if (this.headless) {
      this.initHeadlessWorld();
      return;
    }
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
    this.terrain.setLowDetail(this.softwareFallback || this.settings.quality === 'low');
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
      this.canalPath = canal.path
        ? smoothPolyline(
            canal.path.map((p) => ({ x: p.x * s.mapSize, z: p.z * s.mapSize })),
            2,
          )
        : null;
      this.canalOpen = canal.initiallyOpen ?? false;
    }
    const departure = this.missionLayout?.departure;
    if (departure) this.departureSite = { x: departure.x * s.mapSize, z: departure.z * s.mapSize };
    this.sky = new Sky(this.scene);
    this.sky.setShadowMapSize(SHADOW_MAP_SIZE[this.softwareFallback ? 'low' : this.settings.quality]);
    // No atmospheric fog over the board: classic RTS look, sharp.
    this.scene.fog = null;
    this.setTimeOfDay(s.timeOfDay);
    this.water = new Water(
      this.scene,
      this.terrain.heightMap,
      s.mapSize,
      this.mapProfile.water.level,
      this.mapProfile.water.inland,
      this.siteDef?.heightField?.coast?.x ?? null,
    );
    const waterPalette = this.siteDef?.terrain?.water;
    if (waterPalette) this.water.setPalette(waterPalette);
    this.world.applyAtmosphere();
    this.postfx.setColorGrade(resolveColorGrade(s.period, this.mapProfile));
    this.syncWaterRefractionSize();
    this.particles = new Particles(this.scene, 4096);
    this.debris = new Debris(this.scene);
    this.markers = new OrderMarkers(this.scene);
    this.trees = new TreeInstances(this.scene);
    this.props = new Props(this.scene);
    if (!this.headless) {
      this.quarries = new PropKitInstances(this.scene, (x, z) => this.terrain.getHeight(x, z), this.camera.getTarget());
      if (this.mapProfile.quarryStyle) {
        const style = this.mapProfile.quarryStyle;
        void loadPropsKit(style)
          .then((model) => this.quarries?.attachKit(model))
          .catch((error) => console.warn(`[props-kit] ${style} failed to load; using the procedural quarry`, error));
      }
      // The pacae shrub keeps its trunk vertical: a tilted shrub reads as fallen.
      this.pacae = new PropKitInstances(this.scene, (x, z) => this.terrain.getHeight(x, z), this.camera.getTarget(), {
        tilt: false,
        sink: 0.06,
        sway: 0.035,
      });
      if (this.mapProfile.berryShrub === 'pacae') {
        void loadKitModel('pacae')
          .then((model) => this.pacae?.attachKit(model))
          .catch((error) => console.warn('[vegetation-kit] pacae failed to load; using the procedural shrub', error));
      }
    }
    if (!this.headless) {
      this.trees.kitLod0Radius = kitLod0RadiusFor(this.softwareFallback || this.settings.quality === 'low');
      void attachVegetationKit(this.trees, this.props, isCoastalRegion(this.mapProfile.region));
    }
    this.wildlife = new Wildlife(this.scene);
    this.fow = new Fow(s.mapSize, 128);
    const opening = this.missionLayout?.opening;
    if (opening && this.siteDef?.openingHeight) {
      // The opening frames the cave before the camp units can see it: light it for the hold and keep
      // its clearing explored afterwards so it never sits under black fog.
      const x = opening.x * s.mapSize;
      const z = opening.z * s.mapSize;
      this.fow.reveal(x, z, 26);
      this.fow.explore(x, z, 40);
    }
    this.fowTexture = new FowTexture(this.fow);
    this.terrain.setFow(this.fowTexture.texture, s.fogOfWar);
    this.fowUniforms.fowMap.value = this.fowTexture.texture;
    this.fowUniforms.mapSize.value = s.mapSize;
    this.fowUniforms.fowEnabled.value = s.fogOfWar ? 1 : 0;
    this.mapLabels = new MapLabels(this.scene, this.placeNames, this.terrain, s.mapSize);
    this.characterLabels = new CharacterLabels(this.scene);
    this.heroMarkers = new HeroMarkers(this.scene);
    this.memoryStones = new MemoryStones(
      this.scene,
      (x, z) => this.terrain.getHeight(x, z),
      (root) => applyFowToObject(root, this.fowUniforms),
    );
    this.discoveries = new Discoveries(this.missionLayout?.discoveries, this.siteDef, !!this.pendingSnapshot);
    // Quest markers stay visible over fog: they guide the player without revealing the terrain.
    this.missionRings = new MissionRings(this.scene, (x, z) => this.terrain.getHeight(x, z));
    // The authored site has thin walls and doors; 1 m cells keep them solid
    // without closing the narrow residential openings.
    this.pathfinder = new Pathfinder(s.mapSize, this.siteDef?.pathCellSize ?? 2);
    this.pathfinder.bakeTerrain(
      (x, z) => this.terrain.getHeight(x, z),
      this.terrain.waterLevel,
      (x, z) => this.isFordAt(x, z),
    );
    this.startSpots = this.planStartSpots();
    // Reserve the valley plan even on a loaded save: its fields are the stable base the deterministic
    // scenery is replanned against, and the saved nodes must not move into them.
    this.world.reserveCaralValley();
    if (!this.pendingSnapshot) this.world.spawnResources();
    this.world.spawnAmbient();
  }

  /** Build the static low cover after bases, fields and roads have claimed their ground. */
  private initGroundCover(): void {
    this.groundCover = new GroundCover(
      this.terrain,
      this.mapProfile,
      this.settings.mapSeed,
      { isExcluded: (x, z) => this.isGroundCoverExcluded(x, z) },
      this.fowUniforms,
    );
    this.scene.add(this.groundCover.group);
    this.groundCover.setEnabled(!(this.softwareFallback || this.settings.quality === 'low'));
  }

  /** Keep cover off buildings, resources, fields, roads, water and authored keep-outs. */
  private isGroundCoverExcluded(x: number, z: number): boolean {
    if (this.terrain.isWater(x, z) || this.terrain.getCanal(x, z) > 0.1) return true;
    if (this.isReserved(x, z, false)) return true;
    for (const approach of this.caralValleyPlan?.approaches ?? []) {
      if (distanceToPath(x, z, approach.points) <= approach.width / 2 + 0.6) return true;
    }
    for (const b of this.buildings.values()) {
      if (Math.hypot(x - b.pos.x, z - b.pos.z) < b.radius + 0.7) return true;
    }
    for (const n of this.resourceNodes.values()) {
      if (Math.hypot(x - n.pos.x, z - n.pos.z) < Math.max(n.radius, n.navRadius) + 0.4) return true;
    }
    for (const overlay of this.settlements) {
      if (overlay.blocksGroundCover(x, z)) return true;
    }
    if (this.landscape?.blocksGroundCover(x, z)) return true;
    return false;
  }

  private initHeadlessWorld(): void {
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
    this.terrain = new HeadlessTerrain(
      s.mapSize,
      terrainRes,
      s.mapSeed,
      this.mapProfile,
      this.missionLayout?.terrain,
      this.siteDef,
    ) as unknown as Terrain;
    this.pathfinder = new Pathfinder(s.mapSize, this.siteDef?.pathCellSize ?? 2);
    this.pathfinder.bakeTerrain(
      (x, z) => this.terrain.getHeight(x, z),
      this.terrain.waterLevel,
      (x, z) => this.isFordAt(x, z),
    );
    this.fow = new Fow(s.mapSize, 128);
    this.startSpots = this.planStartSpots();
    if (!this.pendingSnapshot) this.world.spawnResources();
  }

  /** Plan the valley before resource/prop scatter so no node lands on a plot. */
  private setTimeOfDay(mode: string): void {
    const map: Record<string, number> = { morning: 0.62, noon: 0.5, dusk: 0.28, night: 0.05 };
    this.sky.setTimeOfDay(map[mode] ?? 0.5);
  }

  /**
   * Player-chosen post-processing quality preset (persisted with the settings).
   * The adaptive governor can drop the *applied* preset below this at runtime, but
   * never writes it, so an automatic downgrade is not saved as the default.
   */
  private initPlayers(): void {
    const civs = [this.settings.civPlayer, this.settings.civAI];
    const preset = this.missionDef ? 'standard' : (this.settings.startingResources ?? 'standard');
    this.markets = [createMarketState(), createMarketState()];
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
        resources: { ...(STARTING_BANKS[preset] ?? STARTING_BANKS.standard) },
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
      this.start.spawnStartBase(i, this.startSpots[i][0], this.startSpots[i][1]);
    }
    // Camera on the player. Authored sites open with the city just ahead so
    // the first frame shows both the base and the monument, not an empty field.
    this.world.frameAuthoredSite(this.startSpots[0][0], this.startSpots[0][1]);
  }

  /** Reserve opening base centres before random resources and props are scattered. */
  private planStartSpots(): [number, number][] {
    const s = this.settings.mapSize;
    const rng = new RNG(this.settings.mapSeed + 7);
    const spots: [number, number][] = [];
    if (this.enemyActive && !this.missionLayout?.base && !this.missionLayout?.enemyBase) {
      const diagonal = Math.SQRT2 * s;
      const radius = (diagonal * 0.45) / 2;
      const ok = (p: { x: number; z: number }): boolean =>
        p.x > 12 && p.z > 12 && p.x < s - 12 && p.z < s - 12 && this.terrain.isBuildable(p.x, p.z);
      for (let attempt = 0; attempt < 200; attempt++) {
        const ang = rng.range(0, Math.PI * 2);
        const a = { x: s / 2 - Math.cos(ang) * radius, z: s / 2 - Math.sin(ang) * radius };
        const b = { x: s / 2 + Math.cos(ang) * radius, z: s / 2 + Math.sin(ang) * radius };
        if (ok(a) && ok(b)) {
          spots.push([a.x, a.z], [b.x, b.z]);
          return spots;
        }
      }
    }
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
  isReserved(x: number, z: number, includeOpening = true): boolean {
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
    if (this.canalPath) {
      const width = this.missionLayout?.canal?.width ?? DEFAULT_CANAL_WIDTH;
      if (distanceToPath(x, z, this.canalPath) < canalEdgeHalfWidth(width) + CANAL_PROP_MARGIN) return true;
    }
    for (const field of this.caralValleyPlan?.fields ?? []) {
      const radius = field.size / 2 + VALLEY_FIELD_MARGIN;
      if (Math.abs(x - field.x) <= radius && Math.abs(z - field.z) <= radius) return true;
    }
    return false;
  }

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
              : p.ref === 'departure'
                ? (this.departureSite ?? centre)
                : p.ref === 'landmark'
                  ? (this.siteAnchor ?? this.landmark?.position ?? centre)
                  : { x: 0, z: 0 };
    return { x: ref.x + p.dx, z: ref.z + p.dz };
  }

  /** Draw the mission's visual road network; no pathfinding or gameplay effect. */
  private registerObstacle(b: Building): void {
    const stats = getBuildingStats(b.kind, b.era);
    if (b.kind === BuildingKind.GATE) {
      const team = this.players[b.owner]?.team;
      const owners = this.players.filter((p) => p.team === team).map((p) => p.id);
      const gate = { x: b.pos.x, z: b.pos.z, radius: stats.size * 0.6, owners, gate: true as const };
      this.obstacleHandles.set(b.id, gate);
      this.pathfinder.addGate(gate);
      return;
    }
    const handle = { x: b.pos.x, z: b.pos.z, radius: stats.size * 0.6 };
    this.obstacleHandles.set(b.id, handle);
    this.pathfinder.addObstacle(handle);
  }

  /** Register a solid resource node as a pathfinding obstacle (animals/fish are not). */
  registerResourceObstacle(id: number, x: number, z: number, kind: ResourceNode['kind']): void {
    if (kind === 'hunt' || kind === 'fishing') return;
    const radius = kind === 'tree' ? 0.5 : kind === 'well' ? quarryObstacleRadius(this.mapProfile.quarryStyle) : 1.1;
    const node = this.resourceNodes.get(id);
    if (node) node.navRadius = radius;
    const handle = { x, z, radius };
    this.obstacleHandles.set(id, handle);
    this.pathfinder.addObstacle(handle);
  }

  settlementPlanFor(player: number, x: number, z: number): SettlementPlan {
    return planStartSettlement({
      shape: this.mapProfile.culturalLandscape?.settlementShape ?? 'dispersed',
      seed: this.settings.mapSeed,
      player,
      x,
      z,
      terrain: this.terrain,
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
      caralLate: this.caralLate,
    };
  }

  /** Whether a harvest stroke is the player's and close enough to the camera to be heard. */
  private harvestAudible(e: { x: number; z: number; owner: number }): boolean {
    if (e.owner !== 0) return false;
    const target = this.camera.getTarget();
    return distance2D(e.x, e.z, target.x, target.z) <= Math.max(18, this.camera.getZoom() * 0.9);
  }

  /** Center of a player (its main building), else its opening spot (a party with no base), else the map center. */
  playerCenter(owner: number): { x: number; z: number } {
    const c = [...this.buildings.values()].find((b) => b.owner === owner && b.kind === BuildingKind.CENTER && !b.dead);
    if (c) return { x: c.pos.x, z: c.pos.z };
    return { x: this.settings.mapSize / 2, z: this.settings.mapSize / 2 };
  }
    const spot = this.startSpots[owner];
    if (spot) return { x: spot[0], z: spot[1] };

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
    const land = this.findLandNear(x, z);
    const main = this.pathfinder.mainComponent();
    const spot =
      this.pathfinder.componentAt(land.x, land.z) === main ? land : (this.mainComponentPoint(land.x, land.z) ?? land);
    const ctx = this.makeBuildContext(owner);
    const u = new Unit(kind, owner, era, ctx);
    u.pos.set(spot.x, this.terrain.getHeight(spot.x, spot.z), spot.z);
    u.setContext(this.unitContext);
    if (this.players[owner]) this.applyPlayerBonuses(u, this.players[owner]);
    // The tag is hero identity: the view reads it when it is created, so set it before attaching.
    if (tag) u.tag = tag;
    this.attachUnit(u);
    this.units.set(u.id, u);
    const p = this.players[owner];
    if (p) p.populationUsed += u.stats.population;
    return u;
  }

  /**
   * Remove a scripted character from the board without the death animation: the mission script
   * turns Ayar Uchu to stone and buries Ayar Cachi, so a toppling corpse would be the wrong beat.
   */
  retireCharacter(tag: string): { x: number; z: number } | null {
    const unit = [...this.units.values()].find((u) => u.tag === tag && !u.dead);
    if (!unit) return null;
    const at = { x: unit.pos.x, z: unit.pos.z };
    unit.dead = true;
    detachUnit(unit);
    this.units.delete(unit.id);
    this.selectedUnits = this.selectedUnits.filter((id) => id !== unit.id);
    return at;
  }

  /** Raise a memory stone (huaca) for a character the legend leaves behind. */
  raiseMemoryStone(id: string, x: number, z: number, label: string): void {
    this.memoryStones?.add(id, x, z, label);
    this.playSiteRitual(x, z);
  }

  /** Create a scripted building (campaign), already finished. */
  spawnScriptedBuilding(kind: BuildingKind, owner: number, x: number, z: number, tag?: string): Building {
    const era = this.players[owner]?.era ?? this.settings.startingEra;
    const land = this.findLandNear(x, z, 26);
    const b = new Building(kind, owner, era);
    b.pos.set(land.x, this.terrain.getHeight(land.x, land.z), land.z);
    this.applyTerrainFarmYield(b);
    this.attachBuilding(b);
    b.beginConstruction();
    b.addBuildProgress(9999);
    if (tag) b.tag = tag;
    this.addBuilding(b);
    this.registerObstacle(b);
    return b;
  }

  reframeMissionOpening(): void {
    if (!this.missionLayout?.site && !this.missionLayout?.opening) return;
    const c = this.playerCenter(0);
    const opening = this.missionLayout?.opening;
    if (this.introEnabled && opening && this.siteDef?.openingHeight) {
      // The title card and the opening flight hold the cave, not the camp: the legend starts there.
      // Without the intro the player starts looking at the camp, not at a cave they already left.
      const size = this.settings.mapSize;
      this.camera.moveTo(opening.x * size, opening.z * size, true);
      this.camera.setHeight(this.siteDef.openingHeight);
      return;
    }
    this.world.frameAuthoredSite(c.x, c.z);
  }

  /** True while the opening flight or the chapter title card is holding the mission clock. */
  isCinematicActive(): boolean {
    return this.camera.isFlying() || this.hud.isMissionCardOpen();
  }

  /**
   * Keep the cave lit while the opening holds it. Fog decays visible cells to explored every frame and
   * no unit stands at the cave yet, so without this the story's landmark is born under a blue fog tint.
   */
  revealOpeningWhileCinematic(): void {
    if (!this.introEnabled || !this.isCinematicActive()) return;
    const opening = this.missionLayout?.opening;
    if (!opening || !this.siteDef?.openingHeight) return;
    const size = this.settings.mapSize;
    this.fow.reveal(opening.x * size, opening.z * size, 26);
  }

  /** Campaign intro: a short overview flight down to the player's base. */
  playIntro(): void {
    if (!this.introEnabled) return;
    const c = this.playerCenter(0);
    const opening = this.missionLayout?.opening;
    if (opening && this.siteDef?.openingHeight) {
      // The legend starts in the cave: hold it, then fly down to the camp.
      const size = this.settings.mapSize;
      this.camera.moveTo(opening.x * size, opening.z * size, true);
      this.camera.setHeight(this.siteDef.openingHeight);
      this.camera.flyTo(c.x, c.z, this.siteDef.cameraHeight, INTRO_CAMERA.seconds);
      return;
    }
    const city = this.siteFocus ?? this.setpiecePlan?.upper;
    if (city) {
      this.camera.moveTo(city.x, city.z, true);
      this.camera.setHeight(INTRO_CAMERA.fromHeight + 12);
    } else {
      this.camera.moveTo(c.x + INTRO_CAMERA.offset, c.z + INTRO_CAMERA.offset, true);
      this.camera.setHeight(INTRO_CAMERA.fromHeight);
    }
    const framing = this.world.missionFraming(c.x, c.z);
    this.camera.flyTo(framing.x, framing.z, framing.height ?? INTRO_CAMERA.toZoom, INTRO_CAMERA.seconds);
  }

  private siteBlocksConstruction(x: number, z: number, pad: number): boolean {
    return this.input.siteBlocksConstruction(x, z, pad);
  }

  private initInput(): void {
    this.input.init();
  }

  isPointerOverUi(): boolean {
    return this.input.isPointerOverUi();
  }

  togglePause(): void {
    this.input.togglePause();
  }

  getPaused(): boolean {
    return this.input.getPaused();
  }

  screenToWorld(x: number, z: number): THREE.Vector3 | null {
    return this.input.screenToWorld(x, z);
  }

  hasEnded(): boolean {
    return this.input.hasEnded();
  }

  commitWallLine(a: { x: number; z: number }, b: { x: number; z: number }): void {
    this.input.commitWallLine(a, b);
  }

  commandMoveToWorld(x: number, z: number, ctrlQueue?: boolean, shiftQueue?: boolean): void {
    this.input.commandMoveToWorld(x, z, ctrlQueue, shiftQueue);
  }

  startPlacement(kind: BuildingKind): void {
    this.input.startPlacement(kind);
  }

  cancelPlacement(): void {
    this.input.cancelPlacement();
  }

  pickAt(x: number, y: number): { unit?: Unit; building?: Building } {
    return this.input.pickAt(x, y);
  }

  pickEntity(x: number, y: number): { unit?: Unit; building?: Building } {
    return this.input.pickEntity(x, y);
  }

  unitSpawn = (buildingId: number, unit: UnitKind, rally: OrderTarget, hasRally: boolean): boolean =>
    this.runtime.unitSpawn(buildingId, unit, rally, hasRally);

  techComplete = (playerId: number, techId: string): void => this.runtime.techComplete(playerId, techId);

  resolveDamage(attackerId: number, targetId: number, damage: number, from: any, damageType?: DamageClass): void {
    this.runtime.resolveDamage(attackerId, targetId, damage, from, damageType);
  }

  refreshSelectionVisuals(): void {
    this.input.refreshSelectionVisuals();
  }

  getSelectedUnits(): Unit[] {
    return this.selection.getSelectedUnits();
  }
  idleWorkerIds(): number[] {
    return this.selection.idleWorkerIds();
  }
  cycleIdleWorker(): number | null {
    return this.selection.cycleIdleWorker();
  }
  cycleFormation(): string {
    return this.selection.cycleFormation();
  }
  selectIdleWorkers(): number[] {
    return this.selection.selectIdleWorkers();
  }
  focusUnit(id: number): void {
    this.selection.focusUnit(id);
  }
  getSelectedBuilding(): Building | null {
    return this.selection.getSelectedBuilding();
  }
  getSelectedHeritage(): HeritageBuildingDef | null {
    return this.selection.getSelectedHeritage();
  }
  getAssemblyState(): string {
    return this.selection.getAssemblyState();
  }
  canStartAssembly(): boolean {
    return this.selection.canStartAssembly();
  }
  startAssembly(): boolean {
    return this.selection.startAssembly();
  }
  /** Ordered phases of the authored site's main monument. */
  get sitePhasePlan() {
    return this.siteDef?.phases ?? SINGLE_PHASE;
  }

  /**
   * The late city: the Act IV drought marks the final period of Caral and the fields sow a little maize.
   * Any drought level counts: the event itself starts the period, so the fields change with Act IV.
   */
  get caralLate(): boolean {
    return isLatePeriod(this.siteDef?.id, this.environment);
  }

  /**
   * Start a named environmental event. `drought` closes Caral: the valley dries in patches, the haze
   * turns to dust, the fields lose half their remaining harvest and part of the riverside grove dies.
   * `instant` restores it at once (loaded saves).
   */
  startEnvironmentalEvent(event: string, instant = false): void {
    const definition = ENVIRONMENT_EVENTS[event as EnvironmentEventId];
    if (!definition) return;
    if (!instant) this.hud.showToast(t(definition.labelKey), 'info');
    this.environmentTargets[event] = 1;
    this.environment[event] ??= 0;
    if (event === 'drought') {
      this.droughtBaseAtmosphere ??= this.missionAtmosphere;
      if (instant) {
        // A loaded save already holds the dried harvests: rebuild the dry grove and the look.
        this.environment.drought = 1;
        this.applyEnvironmentalEvent('drought', 1);
        this.dryRiparianGrove();
      }
    } else if (event === 'wet_season' && instant) {
      this.environment.wet_season = 1;
      this.applyWetSeason(1);
    }
  }

  /** Restore named events from a save without re-applying their losses. */
  restoreEnvironment(state: Record<string, number>): void {
    this.environmentRestored = true;
    for (const [event, level] of Object.entries(state)) {
      if (!(event in ENVIRONMENT_EVENTS)) continue;
      this.environment[event] = level;
      this.environmentTargets[event] = level;
      if (event === 'drought') {
        this.droughtBaseAtmosphere ??= this.missionAtmosphere;
      }
      this.applyEnvironmentalEvent(event, level);
    }
  }

  /**
   * The drought dries the riparian grove: the trees along the Supe die standing (bare wood), never a
   * map-wide falling forest. Visual only; the trees stay harvestable and a loaded save rebuilds them.
   */
  dryRiparianGrove(): void {
    const river = this.siteDef?.heightField?.river;
    // No authored river means no riparian grove: never dry the whole map.
    if (!river) return;
    const reach = this.siteDef?.life?.dryGroveRadius ?? 26;
    for (const node of this.resourceNodes.values()) {
      if (node.kind !== 'tree' || node.dead || node.depleted) continue;
      if (distanceToPolyline(node.pos.x, node.pos.z, river.path) > reach) continue;
      node.nodeView?.setDry();
    }
  }

  private lifeTimer = 0;
  private lifeTurn = 0;

  /**
   * The city in use (presentation only): cooking smoke behind the dwellings near the camera, the sacred
   * fire on the Pyramid Mayor once it is in use, and a large blaze while the community gathers for the
   * act III fire offering. Cooking pits and sacred-fire altars are documented in the dossier.
   */
  updateCityLife(dt: number): void {
    if (this.headless) return;
    this.lifeTimer += dt;
    if (this.lifeTimer < 0.35) return;
    this.lifeTimer = 0;
    this.lifeTurn++;
    const focus = this.camera.getTarget();
    // The ayllu kit owns its life sources (huts, altars) and reuses this presentation tick, so it
    // inherits the same 70 m camera cap as Caral's cooking smoke.
    this.aylluSite?.updateLife(focus, this.particles, this.lifeTurn);
    this.colonialSite?.updateLife(focus, this.particles, this.lifeTurn);
    const city = this.caralCity ?? this.chavinCity;
    if (!city) return;
    const quietPhase = this.siteDef?.life?.quietPhase;
    const near =
      quietPhase && this.sitePhase === quietPhase
        ? []
        : city
            .standingHouses()
            .filter((h) => Math.hypot(h.x - focus.x, h.z - focus.z) < 70)
            .slice(0, 24);
    if (near.length) {
      const house = near[this.lifeTurn % near.length]!;
      this.particles.emit({
        x: house.x + 1.6,
        y: this.terrain.getHeight(house.x, house.z) + 1.2,
        z: house.z + 2.4,
        count: 2,
        color: 0x8a847a,
        kind: 'smoke',
        speed: 0.7,
        life: 3.2,
        size: 1.6,
        grow: 1.6,
      });
    }
    // Surf grows louder as the camera nears the sea on Caral's west edge, never on the highlands.
    if (this.siteDef?.environs?.valley === 'caral') {
      this.audio.setSurf?.(1 - Math.max(0, Math.min(1, (focus.x - 18) / 45)));
    }
    const mayor = this.siteDef?.anchor;
    if (!mayor) return;
    const offeringObjective = this.siteDef?.life?.offeringObjective;
    const offering = offeringObjective ? this.mission?.getObjectiveState(offeringObjective) === 'activo' : false;
    const firePhase = this.siteDef?.life?.firePhase ?? 'in_use';
    if (this.sitePhase === firePhase || offering) {
      const fireHeight = this.siteDef?.life?.fireHeight ?? 16.6;
      const top = offering
        ? { x: mayor.x, y: this.terrain.getHeight(mayor.x, mayor.z + 32) + 0.4, z: mayor.z + 32 }
        : { x: mayor.x, y: this.terrain.getHeight(mayor.x, mayor.z) + fireHeight, z: mayor.z };
      this.particles.emit({
        ...top,
        count: offering ? 6 : 2,
        color: 0xff8a2a,
        kind: 'fire',
        speed: 0.9,
        life: 0.9,
        size: offering ? 1.8 : 1,
      });
      this.particles.emit({
        ...top,
        count: 1,
        color: 0x6e6860,
        kind: 'smoke',
        speed: 1.1,
        life: 3,
        size: 1.8,
        grow: 1.4,
      });
    }
  }

  updateEnvironment(dt: number): void {
    for (const [event, target] of Object.entries(this.environmentTargets)) {
      const current = this.environment[event] ?? 0;
      if (current >= target) continue;
      const definition = ENVIRONMENT_EVENTS[event as EnvironmentEventId];
      this.environment[event] = Math.min(target, current + dt / (definition?.duration ?? DROUGHT_SECONDS));
      this.applyEnvironmentalEvent(event, this.environment[event]);
    }
  }

  private applyEnvironmentalEvent(event: string, level: number): void {
    if (event === 'drought') this.applyDrought(level);
    else if (event === 'wet_season') this.applyWetSeason(level);
  }

  /** Summer flood (sierra rains): the river rises; the lomas green is a separate winter-fog cue (purely visual). */
  private applyWetSeason(level: number): void {
    if (this.headless) return;
    const shown = this.environmentShown.wet_season ?? -1;
    if (Math.abs(level - shown) < 0.04 && level < 1) return;
    this.environmentShown.wet_season = level;
    this.terrain.setWetSeason(level);
    this.water.setLevelOffset(waterLevelOffset(this.environment));
    this.updateCanalVisual();
  }

  private applyDrought(level: number): void {
    // The yield factor is continuous (see `farmYieldAt`): rescale the standing reserves whenever the
    // drought moves enough to matter (and at either end of the ramp), so fields sown before it dry out
    // with it. Rescaling is ratio-based, so repeating it at the same level is a no-op (load path).
    const step = Math.abs(level - this.droughtFarmLevel);
    if (step >= DROUGHT_YIELD_STEP || (level >= 1 && this.droughtFarmLevel < 1) || (level === 0 && step > 0)) {
      this.droughtFarmLevel = level;
      this.refreshFarmYields();
    }
    // Idempotent (setDry bails out): also re-dries trees whose view was rebuilt at a lower quality.
    if (level >= 0.6) this.dryRiparianGrove();
    // The drought is Caral's late period: the standing fields are resown with the little late maize.
    const late = this.caralLate;
    if (late !== this.caralLateShown) {
      this.caralLateShown = late;
      this.refreshLateFields();
    }
    if (this.headless) return;
    const shown = this.environmentShown.drought ?? -1;
    if (Math.abs(level - shown) < 0.04 && level < 1) return;
    this.environmentShown.drought = level;
    (this.terrain as { setDrought?(f: number): void }).setDrought?.(level);
    this.water.setLevelOffset(waterLevelOffset(this.environment));
    this.updateCanalVisual();
    const base = this.droughtBaseAtmosphere ?? {};
    const mix = (a: number, b: number) => a + (b - a) * level;
    const sky = new THREE.Color(base.skyTint ?? '#cdd3d2').lerp(new THREE.Color('#d9c49a'), level);
    this.missionAtmosphere = {
      fogDensity: mix(base.fogDensity ?? 0.0015, 0.0028),
      skyTint: `#${sky.getHexString()}`,
      sunWarmth: mix(base.sunWarmth ?? 0.9, 1.15),
    };
    this.world.applyAtmosphere();
  }

  /** Rebuild the standing fields when the late period starts. */
  private refreshLateFields(): void {
    if (this.headless) return;
    for (const b of this.buildings.values()) {
      if (b.dead || !b.view || b.kind !== BuildingKind.FARM) continue;
      rebuildBuilding(b, this.makeBuildContext(b.owner));
    }
  }

  /** The authored GLB appears at its `modelSince` phase (Lima: the city after the cabildo). */
  syncSiteModelVisibility(): void {
    if (!this.siteModel || !this.siteDef?.modelSince) return;
    this.siteModel.visible = standsAt(this.siteDef.modelSince, this.sitePhase, this.sitePhasePlan);
  }

  setSitePhase(phase: string): void {
    if (!isKnownPhase(this.sitePhasePlan, phase)) {
      console.warn(`[site] unknown phase ${phase} for ${this.siteDef?.id ?? 'no site'}`);
      return;
    }
    this.sitePhase = phase;
    this.caralCity?.setPhase(phase);
    this.chavinCity?.setPhase(phase);
    this.aylluSite?.setPhase(phase);
    this.colonialSite?.setPhase(phase);
    this.syncSiteModelVisibility();
    this.siteCrew?.setPhase(phase as CaralMayorPhase);
    this.world.syncSitePhase(phase);
    this.syncSealCap(phase === 'sealed');
  }

  /**
   * Bury the Mayor's summit under a stone mound when the city is sealed (the model itself only swaps
   * back to bare plaster), and clear it if a save or a phase change brings the city back.
   */
  private syncSealCap(on: boolean): void {
    if (this.headless) return;
    if (!on) {
      if (!this.sealCap) return;
      this.scene.remove(this.sealCap);
      this.sealCap.geometry.dispose();
      (this.sealCap.material as THREE.Material).dispose();
      this.sealCap = null;
      return;
    }
    const anchor = this.siteDef?.anchor;
    if (this.sealCap || !anchor) return;
    const height = this.terrain.getHeight(anchor.x, anchor.z) + (this.siteDef?.life?.fireHeight ?? 16.6);
    const geometry = new THREE.ConeGeometry(5.4, 2.3, 7);
    geometry.translate(0, 0.55, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0xa1977f, roughness: 1, flatShading: true });
    const cap = new THREE.Mesh(geometry, material);
    cap.name = 'sealed_summit';
    cap.position.set(anchor.x, height, anchor.z);
    cap.rotation.y = 0.4;
    cap.castShadow = true;
    cap.receiveShadow = true;
    this.scene.add(cap);
    this.sealCap = cap;
  }

  /** Presentation-only ritual beat at the authored site (e.g. the burial between construction phases). */
  playSiteRitual(x: number, z: number): void {
    if (this.headless) return;
    const y = this.terrain.getHeight(x, z);
    this.particles.emit({
      x,
      y: y + 0.6,
      z,
      count: 20,
      color: 0xc9b89a,
      kind: 'dust',
      speed: 0.8,
      life: 2.4,
      size: 2.2,
      grow: 1.6,
      spread: 7,
    });
    this.particles.emit({
      x,
      y: y + 1,
      z,
      count: 6,
      color: 0xff8a2a,
      kind: 'fire',
      speed: 0.6,
      life: 1.1,
      size: 1.2,
      spread: 2,
    });
    this.camera.addShake(0.12);
  }

  /** Whether a heritage building already stands (the site raises its monuments phase by phase). */
  heritageStanding(id: HeritageBuildingId): boolean {
    const since = this.siteDef?.heritageSince?.[id];
    return standsAt(since, this.sitePhase, this.siteDef?.phases);
  }
  deliverToHeritage(id: HeritageBuildingId): boolean {
    return this.selection.deliverToHeritage(id);
  }
  deliveryGate(id: HeritageBuildingId): DeliveryGate {
    return this.selection.deliveryGate(id);
  }
  makeOffering(id: HeritageBuildingId): boolean {
    return this.selection.makeOffering(id);
  }
  makeTrade(id: HeritageBuildingId): boolean {
    return this.selection.makeTrade(id);
  }
  isHeritageVisited(id: HeritageBuildingId): boolean {
    return this.selection.isHeritageVisited(id);
  }
  getVisitedHeritage(): HeritageBuildingId[] {
    return this.selection.getVisitedHeritage();
  }
  setVisitedHeritage(ids: HeritageBuildingId[]): void {
    this.selection.setVisitedHeritage(ids);
  }
  visitHeritage(id: HeritageBuildingId): boolean {
    const near = this.mission?.inspectRadiusFor(id) ?? null;
    if (near !== null && !this.selection.unitNearHeritage(id, near)) {
      this.hud?.showToast(t('hud.heritage.visit.away'), 'warning');
      return false;
    }
    this.selection.visitHeritage(id);
    return true;
  }

  /** Play the fog-clearing animation over an authored discovery (mission effect). */
  revealDiscovery(id: HeritageBuildingId): void {
    this.discoveries?.reveal(id);
  }
  selectBuilding(id: number): void {
    this.selection.selectBuilding(id);
  }
  selectUnits(ids: number[]): void {
    this.selection.selectUnits(ids);
  }

  setQuality(q: GameSettings['quality']): void {
    this.runtime.setQuality(q);
  }
  applyQualityPreset(q: GameSettings['quality']): void {
    this.runtime.applyQualityPreset(q);
  }
  setPixelRatioOverride(ratio: number | null): void {
    this.runtime.setPixelRatioOverride(ratio);
  }
  getAppliedQuality(): GameSettings['quality'] {
    return this.runtime.getAppliedQuality();
  }
  shouldRenderWaterRefraction(): boolean {
    return this.runtime.shouldRenderWaterRefraction();
  }
  resetGame(): void {
    this.runtime.resetGame();
  }
  saveSettings(): void {
    try {
      localStorage.setItem('peru-settings', JSON.stringify(this.settings));
    } catch {
      /* storage unavailable */
    }
  }

  saveMatch(): boolean {
    return this.runtime.saveMatch();
  }
  loadMatch(): void {
    this.runtime.loadMatch();
  }
  loadReplayMatch(): void {
    this.runtime.loadReplayMatch();
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

  /** Compatibility wrapper for tests/tools that update the placement ghost. */
  updatePlacementGhost(x: number, z: number): void {
    this.input.updatePlacementGhost(x, z);
  }

  /** Compatibility wrapper for tests/tools that place the current placement ghost. */
  commitPlacement(x: number, z: number): void {
    this.input.commitPlacement(x, z);
  }

  /** Apply the cinematic/quality gate to the water material without a render pass. */
  syncWaterRefraction(): boolean {
    return this.runtime.syncWaterRefraction();
  }

  /** Restart the match with the current configuration. */
  executeCommand(cmd: PlayerCommand, record = true): boolean {
    // no live input during playback: it would desync the replay
    if (this.replay && record) return false;
    if (record && this.recorder) this.recorder.record(this.stepCount, cmd);
    // A group fishing order is spread over nearby banks before the generic per-unit dispatch;
    // the recorded command stays the single group order, so replays run the same distribution.
    if (cmd.kind === 'order' && cmd.order.kind === OrderKind.GATHER && cmd.order.entityId !== undefined) {
      if (this.distributeFishingOrder(cmd.unitIds, cmd.order.entityId, cmd.clear)) return true;
    }
    return this.commandProcessor.apply(cmd);
  }

  /**
   * Spread a group ordered to fish over the clicked bank and the nearby ones it cannot all
   * fit on. Returns false (leaving the order untouched) when this is not a pure fishing group.
   */
  private distributeFishingOrder(unitIds: number[], entityId: number, clear: boolean): boolean {
    const target = this.resourceNodes.get(entityId);
    if (!target || target.dead || target.kind !== 'fishing' || unitIds.length < 2) return false;
    const units: Unit[] = [];
    for (const id of unitIds) {
      const u = this.units.get(id);
      if (!u || u.dead) continue;
      if (u.kind !== UnitKind.WORKER) return false;
      units.push(u);
    }
    if (units.length < 2) return false;
    const owner = units[0].owner;
    if (units.some((u) => u.owner !== owner)) return false;
    const pf = this.pathfinder;
    const component = pf.mainComponent();
    const group = new Set(units.map((u) => u.id));
    const busy = new Map<number, number>();
    for (const u of this.units.values()) {
      if (u.dead || u.owner !== owner || group.has(u.id)) continue;
      // Count every queued gather target, not just the front order: a fisher carrying a load
      // back to the dropsite still holds a slot at its bank.
      const seen = new Set<number>();
      for (const order of u.orderQueue) {
        if (order.kind !== OrderKind.GATHER || order.entityId === undefined || seen.has(order.entityId)) continue;
        seen.add(order.entityId);
        busy.set(order.entityId, (busy.get(order.entityId) ?? 0) + 1);
      }
    }
    const all = [...this.resourceNodes.values()]
      .filter((n) => n.kind === 'fishing' && !n.dead && !n.depleted && (n.amount ?? 0) > 0)
      .map((n) => {
        const capacity = pf.standCapacity(n.pos.x, n.pos.z, HARVEST_STAND_RANGE, owner, fishingApproach({ component }));
        const free = Math.max(0, Math.min(FISHERS_PER_GROUND, capacity) - (busy.get(n.id) ?? 0));
        return { node: n, free };
      });
    if (all.length === 0) return false;
    // The clicked bank is the anchor: workers closest to it fill it first, the rest spill over.
    const queue = [...units].sort(
      (a, b) =>
        distance2D(a.pos.x, a.pos.z, target.pos.x, target.pos.z) -
          distance2D(b.pos.x, b.pos.z, target.pos.x, target.pos.z) || a.id - b.id,
    );
    const dist = (node: { pos: { x: number; z: number } }, p: { x: number; z: number }): number =>
      distance2D(node.pos.x, node.pos.z, p.x, p.z);
    const reachable = (unit: Unit, node: { pos: { x: number; z: number } }): boolean =>
      pf.reachableToNode(unit.pos.x, unit.pos.z, node.pos.x, node.pos.z, HARVEST_STAND_RANGE, owner, fishingApproach());
    for (const worker of queue) {
      const ranked = [...all].sort((a, b) => {
        const aFree = a.free > 0 ? 1 : 0;
        const bFree = b.free > 0 ? 1 : 0;
        if (aFree !== bFree) return bFree - aFree;
        // Fill the clicked bank first; when every bank is full, spread the overflow evenly.
        if (aFree && a.node.id === target.id) return -1;
        if (aFree && b.node.id === target.id) return 1;
        return b.free - a.free || dist(a.node, worker.pos) - dist(b.node, worker.pos) || a.node.id - b.node.id;
      });
      const picked =
        ranked.find((c) => c.free > 0 && reachable(worker, c.node)) ??
        ranked.find((c) => reachable(worker, c.node)) ??
        ranked[0];
      picked.free--;
      worker.issueOrder({ kind: OrderKind.GATHER, entityId: picked.node.id }, clear);
    }
    return true;
  }

  /** Create and attach a unit view from the current build context. */
  attachUnit(u: Unit): void {
    if (!this.headless) attachUnit(this.scene, u, this.makeBuildContext(u.owner));
  }

  /** Create and attach a building view from the current build context. */
  attachBuilding(b: Building): void {
    if (!this.headless) attachBuilding(this.scene, b, this.makeBuildContext(b.owner));
  }

  /** Register a building and paint its footprint wear into the terrain splat. */
  addBuilding(b: Building): void {
    this.buildings.set(b.id, b);
    if (!this.headless) {
      this.terrain.paintWear(b.pos.x, b.pos.z, b.radius * 1.6, 0.9);
      this.groundCover?.excludeCircle(b.pos.x, b.pos.z, b.radius + 0.7);
    }
  }

  /** Remove cover under a settlement/field/road overlay created after the initial plan. */
  excludeGroundCoverForOverlay(overlay: SettlementOverlay): void {
    this.groundCover?.excludeWhere((x, z) => overlay.blocksGroundCover(x, z));
  }

  attachResourceNode(
    node: ResourceNode,
    mapType: string,
    trees?: typeof this.trees,
    variants?: typeof this.mapProfile.vegetation.variants,
  ): void {
    if (!this.headless) {
      attachResource(this.scene, node, mapType, {
        treeMgr: trees,
        treeVariants: variants,
        berryShrub: this.mapProfile.berryShrub,
        quarryMgr: this.quarries ?? undefined,
        pacaeMgr: this.pacae ?? undefined,
        quarryStyle: this.mapProfile.quarryStyle,
      });
    }
  }

  /** A stable hash of the gameplay state (replay/determinism verification). */
  stateHash(): number {
    return stateHashOf({
      units: this.units.values(),
      buildings: this.buildings.values(),
      nodes: this.resourceNodes.values(),
      players: this.players,
      rngState: this.rng.getState(),
      markets: this.markets.map((market) => market.pressure),
      harvested: this.harvestedSave(),
    });
  }

  /** Record a harvest into the monotonic ledger (see `harvested`). */
  recordHarvest(owner: number, kind: ResourceKind, amount: number): void {
    if (amount > 0) this.addHarvested(owner, kind, amount);
  }

  private addHarvested(owner: number, kind: ResourceKind, amount: number): void {
    let byKind = this.harvested.get(owner);
    if (!byKind) {
      byKind = new Map();
      this.harvested.set(owner, byKind);
    }
    byKind.set(kind, (byKind.get(kind) ?? 0) + amount);
  }

  /** Total amount of one node kind harvested by a player. */
  harvestedBy(owner: number, kind: ResourceKind): number {
    return this.harvested.get(owner)?.get(kind) ?? 0;
  }

  harvestedSave(): HarvestLedgerRow[] {
    const out: HarvestLedgerRow[] = [];
    for (const [player, byKind] of this.harvested) {
      for (const [kind, amount] of byKind) out.push([player, kind, amount]);
    }
    return out;
  }

  restoreHarvested(entries: HarvestLedgerRow[] | undefined): void {
    this.harvested.clear();
    for (const [player, kind, amount] of entries ?? []) {
      if (!Number.isFinite(amount) || amount <= 0) continue;
      this.addHarvested(player, kind, amount);
    }
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
  orderUnit(u: Unit, order: Order, clear: boolean): void {
    this.executeCommand({ kind: 'order', unitIds: [u.id], order, clear });
  }

  /** Spend and create a building for player 0 (worker assignment is a separate order). */
  private placeBuilding(kind: BuildingKind, x: number, z: number): Building | null {
    if (!this.canBuildKind(kind)) return null;
    const stats = getBuildingStats(kind, this.players[0].era);
    if (!this.canPlace(x, z, stats.size)) return null;
    if (!this.spendResource(0, stats.cost)) return null;
    const b = new Building(kind, 0, this.players[0].era);
    b.pos.set(x, this.terrain.getHeight(x, z), z);
    this.applyTerrainFarmYield(b);
    this.attachBuilding(b);
    b.beginConstruction();
    if (BUILDING_DEFS[kind].instant) b.completeInstantly();
    this.addBuilding(b);
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

  /** Rescale every standing field to the current terrain, irrigation and drought. */
  refreshFarmYields(): void {
    for (const b of this.buildings.values()) if (b.isFarm && !b.dead) this.applyTerrainFarmYield(b);
  }

  /** Terrain multiplier for a farm at (x, z), shared by the simulation and the HUD. */
  farmYieldAt(x: number, z: number): number {
    return farmYieldMultiplier({
      terrace: this.terrain.getTerrace(x, z),
      moisture: this.terrain.getMoisture(x, z),
      canal: nearbyCanal((cx, cz) => Math.max(this.terrain.getCanal(cx, cz), this.authoredCanalAt(cx, cz)), x, z),
      drought: this.environment.drought ?? 0,
    });
  }

  isCanalOpen(): boolean {
    return this.canalOpen;
  }

  /** Shallow ford over the site's river: walkable water that links both banks (Caral's Supe). */
  isFordAt(x: number, z: number): boolean {
    const field = this.siteDef?.heightField;
    const fords = field?.fords;
    if (!field?.river || !fords?.length) return false;
    // Cheap z test first: the polyline distance runs for every path cell at bake time.
    if (!fords.some((ford) => Math.abs(z - ford.z) <= ford.halfWidth)) return false;
    if (distanceToPolyline(x, z, field.river.path) > field.river.halfWidth + 2) return false;
    // Only the shallow bar is wadeable: a ford never makes a deep channel walkable.
    return this.terrain.getHeight(x, z) > this.terrain.waterLevel - 0.75;
  }

  /**
   * Water surface height at a point (world metres). The sea keeps its level all year; inland water
   * (east of the authored coastline) follows the flood and the drought, exactly like the shader.
   */
  waterSurfaceAt(x: number, z: number): number {
    const sea = this.mapProfile.water.level;
    const field = this.siteDef?.heightField;
    const coast = field?.coast;
    if (!field || !coast) return sea + waterLevelOffset(this.environment);
    const n = coast.x.length;
    const t = Math.max(0, Math.min(1, z / field.worldSize));
    const coastX = coast.x[Math.min(n - 1, Math.round(t * (n - 1)))] ?? sea;
    // Same 1..4 m shoreline ramp as the shader mask.
    const k = Math.max(0, Math.min(1, (x - coastX - 1) / 3));
    return sea + waterLevelOffset(this.environment) * k * k * (3 - 2 * k);
  }

  toggleCanal(): boolean {
    if (!this.canalSite) return false;
    const locked = this.missionLayout?.canal?.lockedUntilObjective;
    const lockState = locked ? this.mission?.getObjectiveState(locked) : 'activo';
    if (lockState !== 'activo' && lockState !== 'completed') {
      this.hud?.showToast(this.missionLayout?.canal?.lockedHint ?? t('hud.toast.canalLocked'), 'info');
      return this.canalOpen;
    }
    this.canalOpen = !this.canalOpen;
    this.updateCanalVisual();
    this.refreshFarmYields();
    this.hud?.showToast(
      this.canalOpen ? 'Compuerta abierta: las chacras cercanas riegan mejor' : 'Compuerta cerrada',
      this.canalOpen ? 'success' : 'info',
    );
    return this.canalOpen;
  }

  trainUnit(buildingId: number, unit: UnitKind): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead || b.owner !== 0) return false;
    // a mission can restrict the roster (e.g. no siege train in a naval campaign)
    const allowed = this.mission?.def.allowedUnits;
    if (allowed && !allowed.includes(unit)) return false;
    if (!unitAvailableToCiv(unit, this.players[0]?.civ)) return false;
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
  /** Whether the mission's technology restriction allows this research. */
  canResearchTech(techId: string): boolean {
    const allowed = this.mission?.def.allowedTechs;
    return !allowed || allowed.includes(techId);
  }

  researchTech(buildingId: number, techId: string): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead || b.owner !== 0) return false;
    const tech = getTech(techId);
    if (!tech || !this.canResearchTech(techId)) return false;
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
      this.start.assignInitialWorkers(playerId, c.x, c.z);
    }
  }

  /** Restore a snapshot into a freshly built game (load mode; no default spawns). */
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
    // Harvest strokes only sound for the player's own workers on screen (never the AI's, never off-screen).
    bus.on('fx:wood', (e) => this.harvestAudible(e) && this.audio.woodChop());
    bus.on('fx:mine', (e) => this.harvestAudible(e) && this.audio.mineHit());
  }

  // --- UnitContext context ---

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
  marketQuote(player: number, resource: keyof Resources, action: 'buy' | 'sell', amount = 100): MarketQuote {
    return marketQuote(this.markets[player] ?? createMarketState(), resource, action, amount);
  }

  /** Buy or sell at a player's market. AI uses it directly, player input via a recorded command. */
  tradeMarket(player: number, resource: keyof Resources, action: 'buy' | 'sell', amount = 100): boolean {
    const state = this.markets[player];
    if (!state || !applyMarketTrade(this.players[player].resources, state, resource, action, amount)) return false;
    bus.emit('resources:changed', { player, resources: { ...this.players[player].resources } });
    return true;
  }

  /** Restore a depleted farm's food reserve for a wood cost. */
  replantFarm(buildingId: number, player = 0): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.owner !== player || !b.isFarm || b.foodAmount > 0 || b.dead) return false;
    if (!this.spendResource(player, { ...ZERO_RESOURCES, wood: 40 })) return false;
    b.replant();
    return true;
  }

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
      if (b.owner === player && b.era !== p.era) {
        b.era = p.era;
        rebuildBuilding(b, ctx);
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

  onDestroy(fn: () => void): void {
    this.teardownHooks.push(fn);
  }

  destroy(): void {
    this.loop.stop();
    if (this.headless) {
      for (const node of this.resourceNodes.values()) node.remove();
      this.resourceNodes.clear();
      this.units.clear();
      this.buildings.clear();
      this.projectiles.length = 0;
      this.projectileViews.clear();
      this.ais.length = 0;
      return;
    }
    this.input.dispose();
    this.camera.dispose();
    window.removeEventListener('resize', this.onResizeBound);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    if (this.groundCover) {
      this.groundCover.dispose();
      this.groundCover = null;
    }
    this.terrain.dispose();
    this.sky.dispose();
    this.water.dispose();
    this.particles.dispose();
    this.debris.dispose();
    this.markers.dispose();
    this.mapLabels?.dispose();
    this.mapLabels = null;
    this.characterLabels?.dispose();
    this.characterLabels = null;
    this.heroMarkers?.dispose();
    this.heroMarkers = null;
    this.memoryStones?.dispose();
    this.memoryStones = null;
    this.discoveries = null;
    this.missionRings?.dispose();
    this.missionRings = null;
    this.syncSealCap(false);
    for (const node of this.resourceNodes.values()) node.remove();
    this.resourceNodes.clear();
    this.trees.dispose();
    this.props.dispose();
    this.quarries?.dispose();
    this.pacae?.dispose();
    this.siteCrew?.dispose();
    this.siteCrew = null;
    this.aylluSite?.dispose();
    this.aylluSite = null;
    this.colonialSite?.dispose();
    this.colonialSite = null;
    this.siteModel = null;
    this.wildlife.dispose();
    if (this.landmark) {
      this.landmarkLoadToken++;
      this.scene.remove(this.landmark);
      if (this.landmarkOwnsStatic) disposeStaticGltf(this.landmark);
      else disposeModel(this.landmark);
      this.landmark = null;
      this.landmarkOwnsStatic = false;
      this.caralCity = null;
      this.chavinCity = null;
    }
    this.sitePhase = this.siteDef?.phases?.initial ?? 'in_use';
    this.sitePhaseRestored = false;
    this.environmentRestored = false;
    this.environment = {};
    this.environmentTargets = {};
    this.environmentShown = {};
    this.droughtFarmLevel = 0;
    this.caralLateShown = false;
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
      this.canalPath = null;
    }
    this.departureSite = null;
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
    for (const unit of this.units.values()) detachUnit(unit);
    this.units.clear();
    for (const hook of this.teardownHooks.splice(0)) hook();
    for (const view of this.projectileViews.values()) view.dispose();
    this.projectileViews.clear();
    this.fowTexture.dispose();
    this.postfx.dispose();
    clearModelAssets();
    clearModelCaches();
    clearFaunaTemplates();
    clearResourceCaches();
    clearTextureCache();
    this.renderer.dispose();
    canvas.remove();
  }

  private setRallyPoint(buildingId: number, target: OrderTarget): void {
    const b = this.buildings.get(buildingId);
    if (b) {
      b.rallyPoint = target;
      b.hasRallyPoint = true;
      this.hud.showToast('Punto de reunión establecido', 'info');
    }
  }

  findFreeSpot(x: number, z: number, foot: number): { x: number; z: number };

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

  canPlace(x: number, z: number, foot: number): boolean {
    const r = foot / 2;
    if (this.terrain.isWater(x, z) || !this.terrain.isBuildable(x, z)) return false;
    // keep placement on ground units can reach (same slope limit as the nav mesh)
    if (this.terrain.getSlope(x, z) > MAX_WALKABLE_SLOPE) return false;
    if (this.canalPath) {
      const width = this.missionLayout?.canal?.width ?? DEFAULT_CANAL_WIDTH;
      if (distanceToPath(x, z, this.canalPath) < canalEdgeHalfWidth(width) + r) return false;
    }
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
      if (distance2D(x, z, n.pos.x, n.pos.z) < Math.max(n.radius, n.navRadius) + r * 0.9) return false;
    }
    return true;
  }

  setFogOfWar(on: boolean): void {
    this.runtime.setFogOfWar(on);
  }

  updateCanalVisual(): void {
    this.runtime.updateCanalVisual();
  }

  private modernizeUnits(player: number): void {
    this.runtime.modernizeUnits(player);
  }

  ctxFor(): UnitContext {
    return this.runtime.ctxFor();
  }

  missionEnd(win: boolean): void {
    this.runtime.missionEnd(win);
  }

  applyMissionSetup(mis: MissionDef): void {
    this.runtime.applyMissionSetup(mis);
  }

  applySnapshot(data: SaveData): void {
    this.runtime.applySnapshot(data);
  }

  update(dt: number, time: number): boolean {
    const running = this.runtime.update(dt, time);
    if (this.missionRings) {
      this.missionRings.sync(this.mission?.activeGoals() ?? []);
      this.missionRings.pulse(time);
    }
    return running;
  }

  private render(): void {
    this.runtime.render();
  }

  private onResize(): void {
    this.runtime.onResize();
  }

  private syncWaterRefractionSize(): void {
    this.runtime.syncWaterRefractionSize();
  }

  mainComponentPoint(x: number, z: number): { x: number; z: number } | null {
    return this.runtime.mainComponentPoint(x, z);
  }

  mainComponentSpot(x: number, z: number): { x: number; z: number } {
    return this.runtime.mainComponentSpot(x, z);
  }

  applyPlayerBonuses(u: Unit, p: PlayerState): void {
    this.runtime.applyPlayerBonuses(u, p);
  }

  authoredCanalAt(x: number, z: number): number {
    return this.runtime.authoredCanalAt(x, z);
  }

  endGame(winner: number): void {
    this.runtime.endGame(winner);
  }

  hasBuildings(player: number): boolean {
    for (const b of this.buildings.values()) {
      if (b.owner === player && !b.dead) return true;
    }
    return false;
  }

  saveRecording(): void {
    this.runtime.saveRecording();
  }

  /** Player-facing building name, honouring the mission's period-specific override. */
  buildingName(kind: BuildingKind): string {
    return this.missionDef?.buildingNames?.[kind] ?? BUILDING_INFO[kind].name;
  }

  /** Player-facing building icon, honouring the mission's period-specific override. */
  buildingIcon(kind: BuildingKind): string {
    return this.missionDef?.buildingIcons?.[kind] ?? BUILDING_INFO[kind].icon;
  }

  /**
   * Can this building be constructed in the current match? It accounts for the era
   * (period-locked matches) and the Sacred Huaca, which depends on the victory mode,
   * not the era (so wonder victory is reachable in any period).
   */
  canBuildKind(kind: BuildingKind): boolean {
    if (kind === BuildingKind.CENTER) return false;
    const allowed = this.mission?.def.allowedBuildings;
    if (allowed && !allowed.includes(kind)) return false;
    if (kind === BuildingKind.WONDER) return this.settings.victoryMode === 'wonder';
    return this.players[0].era >= BUILDING_DEFS[kind].minEra;
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

  ungarrison(buildingId: number): boolean {
    const b = this.buildings.get(buildingId);
    if (!b || b.dead) return false;
    const ids = b.ungarrisonAll();
    for (const id of ids) {
      const u = this.units.get(id);
      if (!u) continue;
      u.garrisonedIn = null;
      if (u.view) u.view.group.visible = true;
      const ang = this.rng.float() * Math.PI * 2;
      const px = b.pos.x + Math.cos(ang) * (b.radius + 0.6);
      const pz = b.pos.z + Math.sin(ang) * (b.radius + 0.6);
      u.pos.set(px, this.terrain.getHeight(px, pz), pz);
      u.snapToGround();
    }
    return true;
  }
  lastBattleEvent: number | null = null;
}
