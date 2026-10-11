import * as THREE from 'three';
import { bus } from './EventBus';
import { createRenderer, createPostFX } from '../rendering/Renderer';
import { PostFX } from '../rendering/PostFX';
import { Sky, cloudDensity } from '../rendering/Sky';
import { Terrain } from '../rendering/Terrain';
import { Water } from '../rendering/Water';
import { Particles } from '../rendering/Particles';
import { RTSCamera } from './Camera';
import { GameLoop } from './GameLoop';
import { Fow } from '../game/Fow';
import { Pathfinder } from '../game/Pathfinding';
import { Unit, UnitContext } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode, clearResourceCaches } from '../entities/ResourceNode';
import { OrderMarkers } from '../entities/OrderMarker';
import { TreeInstances } from '../rendering/TreeInstances';
import { Projectile, updateProjectilePools } from '../entities/Projectile';
import { EntityView } from '../entities/EntityView';
import { AI } from '../game/AI';
import { Economy } from '../game/Economy';
import { HUD } from '../ui/HUD';
import {
  Era, Resources, ZERO_RESOURCES, PlayerState, CivId,
  UnitKind, BuildingKind, OrderKind, OrderTarget, Team, RESOURCE_KEYS,
} from '../core/types';
import { getCiv } from '../model/defs/civs';
import { BuildContext, buildModel, disposeModel, clearModelCaches } from '../model/ProceduralModel';
import { clearTextureCache } from '../rendering/Textures';
import { DEFAULT_SETTINGS, GameSettings, RESOURCE_INFO } from './Config';
import { distance2D } from '../util/math';
import { isTypingTarget } from '../util/dom';
import { RNG } from '../util/rng';
import { ERA_DEFS } from '../model/defs/eras';
import { BUILDING_DEFS, getBuildingStats, BUILDING_INFO } from '../model/defs/buildings';
import { getUnitStats, getUnitModel, UNIT_INFO } from '../model/defs/units';
import { getTech } from '../model/defs/techs';
import { AudioEngine } from '../audio/AudioEngine';
import { Mission } from '../campaign/Mission';
import { Tutorial } from '../campaign/Tutorial';
import { getMission } from '../campaign/defs/campaign';
import type { MissionDef } from '../campaign/types';

const NODE_INFO: Record<ResourceNode['kind'], { nombre: string; icono: string }> = {
  arbol: { nombre: 'Árbol', icono: '🌳' },
  mina: { nombre: 'Mina', icono: '⛏️' },
  pozo: { nombre: 'Pozo', icono: '🛢️' },
  caza: { nombre: 'Caza', icono: '🦌' },
  pesca: { nombre: 'Banco de peces', icono: '🐟' },
  baya: { nombre: 'Arbusto', icono: '🫐' },
};

export class Game {
  renderer!: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera!: RTSCamera;
  postfx!: PostFX;
  sky!: Sky;
  terrain!: Terrain;
  water!: Water;
  particles!: Particles;
  fow!: Fow;
  pathfinder!: Pathfinder;
  markers!: OrderMarkers;
  trees!: TreeInstances;
  loop = new GameLoop();
  hud!: HUD;
  audio = new AudioEngine();
  mission: Mission | null = null;
  tutorial: Tutorial | null = null;
  private unitContext!: UnitContext;
  economy!: Economy;

  settings: GameSettings;
  /** RNG determinista de la partida (derivado de la semilla del mapa). */
  readonly rng: RNG;
  /** Fuerza un devicePixelRatio concreto (p. ej. modo bajo). */
  pixelRatioOverride: number | null = null;
  players: PlayerState[] = [];
  units = new Map<number, Unit>();
  buildings = new Map<number, Building>();
  resourceNodes = new Map<number, ResourceNode>();
  projectiles: Projectile[] = [];

  selectedUnits: number[] = [];
  selectedBuilding: number | null = null;
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

  constructor(settings: GameSettings) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    const mis = this.settings.missionId ? getMission(this.settings.missionId) : undefined;
    if (mis) {
      // configuración fija de la misión sobreescribe la escaramuza
      this.settings.civPlayer = mis.civJugador;
      this.settings.civAI = mis.civEnemigo;
      this.settings.startingEra = mis.eraInicial;
      this.settings.mapSeed = mis.mapa.seed;
      this.settings.mapType = mis.mapa.tipo;
      this.settings.mapSize = mis.mapa.tamano;
      this.settings.timeOfDay = mis.horaDia;
      this.settings.difficulty = mis.enemigo.dificultad;
      this.settings.victoryMode = 'conquista'; // la campaña no usa victoria por maravilla
    }
    this.rng = new RNG((this.settings.mapSeed * 2654435761) >>> 0);
    this.initRenderer();
    this.initWorld();
    this.unitContext = this.ctxFor();
    this.economy = new Economy(this);
    this.initPlayers();
    this.initInput();
    this.initHUD();
    this.mission = mis ? new Mission(this, mis, (win) => this.missionEnd(win)) : null;
    this.tutorial = mis && mis.tutorial && this.settings.showHints ? new Tutorial(this) : null;
    this.ai = mis && !mis.enemigo.activo ? null : new AI(this, 1);
    this.audio.setEra(this.players[0].era);
    this.initAudio();
    if (mis) this.applyMissionSetup(mis);
    this.loop.onUpdate = (dt, t) => this.update(dt, t);
    this.loop.onRender = () => this.render();
    this.loop.start();
    if (mis) this.mission?.start();
    bus.emit('game:ready', {});
  }

  private initRenderer(): void {
    this.renderer = createRenderer();
    this.camera = new RTSCamera(this.renderer.domElement);
    this.camera.setRotationEnabled(this.settings.rotateCamera);
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
    this.terrain = new Terrain(s.mapSize, terrainRes, s.mapSeed, s.mapType);
    this.terrain.camera = this.camera.camera;
    this.scene.add(this.terrain.group);
    this.sky = new Sky(this.scene);
    // Sin niebla atmosférica sobre el tablero: look clásico de RTS, nítido.
    this.scene.fog = null;
    this.setTimeOfDay(s.timeOfDay);
    this.water = new Water(this.scene, this.terrain.heightMap, s.mapSize, this.terrain.waterLevel, s.mapType !== 'costa');
    this.particles = new Particles(this.scene, 4096);
    this.markers = new OrderMarkers(this.scene);
    this.trees = new TreeInstances(this.scene);
    this.fow = new Fow(s.mapSize, 128);
    this.terrain.setFow(this.fow.texture, s.fogOfWar);
    this.pathfinder = new Pathfinder(s.mapSize, 2);
    this.pathfinder.bakeTerrain((x, z) => this.terrain.getHeight(x, z), this.terrain.waterLevel);
    this.spawnResources();
  }

  private setTimeOfDay(mode: string): void {
    const map: Record<string, number> = { 'mañana': 0.62, 'mediodía': 0.5, 'atardecer': 0.28, 'noche': 0.05 };
    this.sky.setTimeOfDay(map[mode] ?? 0.5);
  }

  private initPlayers(): void {
    const civs = [this.settings.civPlayer, this.settings.civAI];
    for (let i = 0; i < 2; i++) {
      const civ = getCiv(civs[i] as CivId);
      const isAI = i === 1;
      this.players.push({
        id: i,
        name: isAI ? civ.nombre + ' (IA)' : civ.nombre,
        civ: civ.id,
        team: i as Team,
        color: new THREE.Color(civ.colors.primary),
        colorHex: civ.colors.primary,
        isAI,
        difficulty: i === 1 ? 1 : 0,
        resources: { comida: 250, madera: 220, acero: 100, energia: 50 },
        populationUsed: 0,
        populationCap: this.settings.populationCap,
        era: this.settings.startingEra,
        ageBuildings: 0,
        techs: new Set(),
        alive: true,
        kills: 0,
        totalLost: 0,
        wonderActive: false,
        bonus: { ataque: 0, armadura: 0, recoleccion: {}, carry: 0, los: 0, rango: 0, velocidad: 0, entrenamiento: 0 },
        stats: { created: 0, destroyed: 0, military: 0, econ: 0 },
      });
    }
    // colocación de jugadores
    const s = this.settings.mapSize;
    const rng = new RNG(this.settings.mapSeed + 7);
    const spots: [number, number][] = [];
    for (let i = 0; i < 2; i++) {
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
    for (let i = 0; i < 2; i++) {
      this.spawnStartBase(i, spots[i][0], spots[i][1]);
    }
    // cámara en el jugador
    this.camera.moveTo(spots[0][0], spots[0][1], true);
  }

  private spawnResources(): void {
    const s = this.settings;
    const rng = new RNG(this.settings.mapSeed * 31 + 1);
    const n = Math.floor(s.mapSize * s.mapSize / 1000);
    let placed = 0;
    let guard = 0;
    while (placed < n && guard++ < n * 4) {
      const x = rng.range(15, s.mapSize - 15);
      const z = rng.range(15, s.mapSize - 15);
      if (this.terrain.isWater(x, z)) continue;
      const h = this.terrain.getHeight(x, z);
      const kind: ResourceNode['kind'] =
        h > 6 ? 'mina' :
        h > 3 ? rng.chance(0.6) ? 'mina' : 'arbol' :
        this.terrain.isBeach(x, z) ? rng.chance(0.5) ? 'pozo' : 'baya' :
        rng.chance(0.45) ? 'arbol' : rng.chance(0.3) ? 'mina' : 'pozo';
      const amount =
        kind === 'arbol' ? rng.range(140, 220) :
        kind === 'mina' ? rng.range(300, 450) :
        kind === 'pozo' ? rng.range(250, 380) :
        kind === 'baya' ? rng.range(120, 180) :
        rng.range(200, 300);
      const node = new ResourceNode(this.scene, kind, x, z, amount, this.settings.mapType, this.trees);
      node.pos.y = this.terrain.getHeight(x, z);
      node.view.position.set(x, node.pos.y, z);
      node.placeTreeInstance(node.pos.y);
      this.resourceNodes.set(node.id, node);
      const handle = { x, z, radius: kind === 'arbol' ? 0.5 : 1.1 };
      this.obstacleHandles.set(node.id, handle);
      this.pathfinder.addObstacle(handle);
      placed++;
    }
    // caza y pesca
    for (let i = 0; i < 12; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (this.terrain.isWater(x, z)) continue;
      const node = new ResourceNode(this.scene, 'caza', x, z, rng.range(120, 180), this.settings.mapType);
      node.pos.y = this.terrain.getHeight(x, z);
      node.view.position.set(x, node.pos.y, z);
      this.resourceNodes.set(node.id, node);
    }
    for (let i = 0; i < 8; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (!this.terrain.isWater(x, z)) continue;
      const node = new ResourceNode(this.scene, 'pesca', x, z, rng.range(150, 220), this.settings.mapType);
      node.pos.y = 0;
      node.view.position.set(x, 0, z);
      this.resourceNodes.set(node.id, node);
    }
  }

  /** Registra un edificio como obstáculo del pathfinding. */
  private registerObstacle(b: Building): void {
    const stats = getBuildingStats(b.kind, b.era);
    const handle = { x: b.pos.x, z: b.pos.z, radius: stats.tamano * 0.6 };
    this.obstacleHandles.set(b.id, handle);
    this.pathfinder.addObstacle(handle);
  }

  private spawnStartBase(player: number, x: number, z: number): void {
    const ctx = this.makeBuildContext(player);
    // centro
    const center = new Building(BuildingKind.CENTRO, player, this.players[player].era, ctx);
    center.pos.set(x, 0, z);
    center.pos.y = this.terrain.getHeight(x, z);
    center.attach(this.scene);
    center.beginConstruction();
    center.addBuildProgress(9999);
    this.buildings.set(center.id, center);
    this.registerObstacle(center);
    // viviendas iniciales
    const rng = new RNG(this.settings.mapSeed + player * 100);
    const dirs = [0, Math.PI / 3, Math.PI * 2 / 3];
    for (const d of dirs) {
      const hx = x + Math.cos(d) * 5.5;
      const hz = z + Math.sin(d) * 5.5;
      const house = new Building(BuildingKind.VIVIENDA, player, this.players[player].era, ctx);
      house.pos.set(hx, this.terrain.getHeight(hx, hz), hz);
      house.attach(this.scene);
      house.beginConstruction();
      house.addBuildProgress(9999);
      this.buildings.set(house.id, house);
      this.registerObstacle(house);
    }
    // recursos cercanos para empezar
    this.spawnStartResources(player, x, z);
    // obreros iniciales
    const workers = player === 0 ? 4 : 4;
    for (let i = 0; i < workers; i++) {
      const unit = new Unit(UnitKind.OBRERO, player, this.players[player].era, ctx);
      unit.pos.set(x + rng.range(-3, 3), this.terrain.getHeight(x + rng.range(-3, 3), z + rng.range(-3, 3)), z + rng.range(-3, 3));
      unit.setContext(this.unitContext);
      unit.attach(this.scene);
      this.units.set(unit.id, unit);
      this.players[player].populationUsed += unit.stats.poblacion;
    }
    // explorador
    const scout = new Unit(UnitKind.EXPLORADOR, player, this.players[player].era, ctx);
    scout.pos.set(x + 4, this.terrain.getHeight(x + 4, z + 4), z + 4);
    scout.setContext(this.unitContext);
    scout.attach(this.scene);
    this.units.set(scout.id, scout);
    this.players[player].populationUsed += scout.stats.poblacion;
    // auto-recolección
    this.assignInitialWorkers(player, x, z);
  }

  private spawnStartResources(player: number, x: number, z: number): void {
    const rng = new RNG(this.settings.mapSeed + player * 911);
    const place = (kind: ResourceNode['kind'], amount: number, dx: number, dz: number) => {
      const nx = x + dx;
      const nz = z + dz;
      const node = new ResourceNode(this.scene, kind, nx, nz, amount, this.settings.mapType, this.trees);
      node.pos.y = this.terrain.getHeight(nx, nz);
      node.view.position.set(nx, node.pos.y, nz);
      node.placeTreeInstance(node.pos.y);
      this.resourceNodes.set(node.id, node);
      const handle = { x: nx, z: nz, radius: kind === 'arbol' ? 0.5 : 1.1 };
      this.obstacleHandles.set(node.id, handle);
      this.pathfinder.addObstacle(handle);
    };
    // árboles
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(8, 13);
      place('arbol', rng.range(140, 200), Math.cos(a) * r, Math.sin(a) * r);
    }
    // mina de acero
    const ma = rng.range(0, Math.PI * 2);
    place('mina', 400, Math.cos(ma) * 12, Math.sin(ma) * 12);
    // bayas
    place('baya', 150, rng.range(-6, 6), rng.range(9, 13));
    // pozo (si era permite)
    if (this.players[player].era >= Era.TAHUANTINSUYO) {
      const wa = rng.range(0, Math.PI * 2);
      place('pozo', 300, Math.cos(wa) * 14, Math.sin(wa) * 14);
    }
  }

  private assignInitialWorkers(player: number, x: number, z: number): void {
    const workers = [...this.units.values()].filter((u) => u.owner === player && u.kind === UnitKind.OBRERO);
    const foods = [...this.resourceNodes.values()].filter((n) => n.resource === 'comida' && n.kind === 'baya');
    const woods = [...this.resourceNodes.values()].filter((n) => n.resource === 'madera');
    const steels = [...this.resourceNodes.values()].filter((n) => n.resource === 'acero');
    const nearest = (list: ResourceNode[], px: number, pz: number) =>
      list.reduce((best, n) => (best ? (distance2D(px, pz, n.pos.x, n.pos.z) < distance2D(px, pz, best.pos.x, best.pos.z) ? n : best) : n), null as ResourceNode | null);
    const foodNode = nearest(foods, x, z);
    const woodNode = nearest(woods, x, z);
    const steelNode = nearest(steels, x, z);
    const plan = [foodNode, woodNode, woodNode, steelNode];
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
    return { era: p.era, civ, playerColor: new THREE.Color(civ.colors.primary) };
  }

  /** Centro de un jugador (su edificio principal) o el centro del mapa. */
  playerCenter(owner: number): { x: number; z: number } {
    const c = [...this.buildings.values()].find((b) => b.owner === owner && b.kind === BuildingKind.CENTRO && !b.dead);
    if (c) return { x: c.pos.x, z: c.pos.z };
    return { x: this.settings.mapSize / 2, z: this.settings.mapSize / 2 };
  }

  /** Busca la tierra firme más cercana a un punto (para spawns guionizados). */
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

  /** Crea una unidad guionizada (campaña). */
  spawnScriptedUnit(kind: UnitKind, owner: number, x: number, z: number, tag?: string): Unit {
    const era = this.players[owner]?.era ?? this.settings.startingEra;
    const ctx = this.makeBuildContext(owner);
    const land = this.findLandNear(x, z);
    const u = new Unit(kind, owner, era, ctx);
    u.pos.set(land.x, this.terrain.getHeight(land.x, land.z), land.z);
    u.setContext(this.unitContext);
    u.attach(this.scene);
    if (tag) u.tag = tag;
    this.units.set(u.id, u);
    const p = this.players[owner];
    if (p) p.populationUsed += u.stats.poblacion;
    return u;
  }

  /** Crea un edificio guionizado (campaña), ya terminado. */
  spawnScriptedBuilding(kind: BuildingKind, owner: number, x: number, z: number, tag?: string): Building {
    const era = this.players[owner]?.era ?? this.settings.startingEra;
    const ctx = this.makeBuildContext(owner);
    const land = this.findLandNear(x, z, 26);
    const b = new Building(kind, owner, era, ctx);
    b.pos.set(land.x, this.terrain.getHeight(land.x, land.z), land.z);
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
    p.resources = { ...mis.recursosIniciales };
    const c = this.playerCenter(0);
    for (const e of mis.inicio.edificios ?? []) {
      this.spawnScriptedBuilding(e.kind, 0, c.x + e.dx, c.z + e.dz, e.tag);
    }
    for (const u of mis.inicio.unidades ?? []) {
      for (let i = 0; i < (u.cantidad ?? 1); i++) {
        const jx = this.rng.range(-1.5, 1.5);
        const jz = this.rng.range(-1.5, 1.5);
        this.spawnScriptedUnit(u.kind, 0, c.x + u.dx + jx, c.z + u.dz + jz, u.tag);
      }
    }
    this.camera.moveTo(c.x, c.z, true);
  }

  private missionEnd(win: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    const mis = this.mission?.def;
    if (mis) {
      if (win) this.hud.saveCampaignProgress(mis.id);
      this.hud.showVictory(win, mis.victoria, mis.derrota);
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
      if (this.settings.victoryMode === 'maravilla' && e.time >= this.wonderReqTime) {
        this.endGame(e.owner);
      }
    });
  }

  /** Reinicia la partida con la configuración actual. */
  resetGame(): void {
    try {
      localStorage.setItem('peru-settings', JSON.stringify(this.settings));
    } catch {
      /* noop */
    }
    // ?play=1 evita volver a mostrar el menú principal tras recargar
    const url = new URL(location.href);
    url.searchParams.set('play', '1');
    if (this.settings.missionId) url.searchParams.set('mission', this.settings.missionId);
    location.href = url.toString();
  }

  /** Muestra la pantalla de victoria/derrota. */
  showVictory(winner: number): void {
    this.gameEnded = true;
    this.loop.stop();
    this.hud.showVictory(winner === 0);
  }

  private initAudio(): void {
    const enable = () => {
      this.audio.init();
      this.audio.resume();
      if (this.settings.musicEnabled) this.audio.startMusic();
      window.removeEventListener('pointerdown', enable);
    };
    window.addEventListener('pointerdown', enable, { once: true });
    bus.on('fx:shot', () => this.audio.shot());
    bus.on('fx:artillery', () => this.audio.artillery());
    bus.on('fx:laser', () => this.audio.laser());
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

  // --- entrada ---

  private screenToWorld(sx: number, sy: number): THREE.Vector3 | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    // primer tiro: plano y=0 (cota inferior del terreno)
    if (!ray.intersectPlane(this.groundPlane, hit)) return null;
    const dir = ray.direction;
    if (Math.abs(dir.y) < 1e-4) return hit;
    // refinado contra el heightfield: punto fijo muestreando la altura real
    const size = this.settings.mapSize;
    const p = new THREE.Vector3();
    let t = ray.origin.distanceTo(hit);
    for (let i = 0; i < 8; i++) {
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

  private onMouseDown = (e: MouseEvent): void => {
    if (this.gameEnded) return;
    if (this.placingBuilding) {
      if (e.button === 0) {
        const wp = this.screenToWorld(e.clientX, e.clientY);
        if (wp) {
          // recalcular con el punto real del clic (no confiar en el estado del mousemove)
          const foot = getBuildingStats(this.placingBuilding.kind, this.players[0].era).tamano;
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
          // doble clic: seleccionar todas las unidades del mismo tipo
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
    // arrastre con botón izquierdo = rectángulo de selección
    if (this.leftDown && this.selectionStart) {
      const dx = e.clientX - this.selectionStart.x;
      const dy = e.clientY - this.selectionStart.y;
      if (!this.leftMoved && Math.abs(dx) + Math.abs(dy) > 4) this.leftMoved = true;
      if (this.leftMoved) this.hud?.showSelectionBox(this.selectionStart.x, this.selectionStart.y, e.clientX, e.clientY);
    }
    // cursor + tooltip de hover
    if (!this.gameEnded && !this.placingBuilding) {
      const info = this.computeHover(e.clientX, e.clientY);
      const hasSel = this.selectedUnits.length > 0 || this.selectedBuilding !== null;
      const icon = hasSel ? this.hoverAction(e.clientX, e.clientY) : null;
      this.renderer.domElement.style.cursor = icon ? 'none' : info ? 'pointer' : 'default';
      this.hud?.setHover(info, e.clientX, e.clientY);
      this.hud?.setCursor(icon, e.clientX, e.clientY);
    }
  };

  /** Icono de acción contextual según lo que hay bajo el cursor y la selección. */
  private hoverAction(sx: number, sy: number): string | null {
    if (this.placingBuilding) return '🚧';
    const node = this.pickResource(sx, sy);
    if (node) {
      const hasWorker = this.selectedUnits.some((id) => this.units.get(id)?.kind === UnitKind.OBRERO);
      return hasWorker ? '⛏️' : null;
    }
    const picked = this.pickAt(sx, sy);
    if (picked.unit) return picked.unit.owner !== 0 ? '⚔️' : null;
    if (picked.building) return picked.building.owner !== 0 ? '⚔️' : '🏰';
    return null;
  }

  /** Información de la entidad o recurso bajo el cursor (para el tooltip). */
  private computeHover(sx: number, sy: number): { icono: string; titulo: string; detalle: string } | null {
    const node = this.pickResource(sx, sy);
    if (node) {
      const ni = NODE_INFO[node.kind];
      return { icono: ni.icono, titulo: ni.nombre, detalle: `${Math.ceil(node.amount)} ${RESOURCE_INFO[node.resource].nombre}` };
    }
    const picked = this.pickAt(sx, sy);
    if (picked.unit) {
      const ui = UNIT_INFO[picked.unit.kind];
      const own = picked.unit.owner === 0 ? 'Tú' : this.players[picked.unit.owner]?.name ?? 'Enemigo';
      return { icono: ui.icono, titulo: `${ui.nombre}`, detalle: `${own} · HP ${Math.ceil(picked.unit.hp)}/${Math.ceil(picked.unit.maxHp)}` };
    }
    if (picked.building) {
      const bi = BUILDING_INFO[picked.building.kind];
      const own = picked.building.owner === 0 ? 'Tú' : this.players[picked.building.owner]?.name ?? 'Enemigo';
      const estado = picked.building.constructionComplete ? '' : ` · Construyendo ${Math.floor(picked.building.buildRatio * 100)}%`;
      return { icono: bi.icono, titulo: bi.nombre, detalle: `${own} · HP ${Math.ceil(picked.building.hp)}/${Math.ceil(picked.building.maxHp)}${estado}` };
    }
    return null;
  }

  /** Proyecta un punto del mundo a coordenadas de pantalla. */
  private projectToScreen(x: number, y: number, z: number): { x: number; y: number } {
    const v = this.tmpProject.set(x, y, z).project(this.camera.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
  private tmpProject = new THREE.Vector3();
  private static readonly UNIT_PICK_PX = 30;
  private static readonly BUILDING_PICK_PX = 24;

  /**
   * Picking con tolerancia: primero raycast exacto y, si falla, la entidad más
   * cercana al cursor en pantalla (soluciona el clic sobre unidades pequeñas/móviles).
   */
  private pickAt(sx: number, sy: number): { unit?: Unit; building?: Building } {
    const direct = this.pickEntity(sx, sy);
    if (direct.unit) return direct;

    // unidad más cercana en pantalla (tolerancia para unidades pequeñas o tras edificios)
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

    // edificio más cercano en pantalla
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
    const meshes: THREE.Object3D[] = [];
    for (const u of this.units.values()) meshes.push(u.view.group);
    for (const b of this.buildings.values()) meshes.push(b.view.group);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return {};
    for (const h of hits) {
      const obj = h.object;
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        for (const u of this.units.values()) {
          if (u.view.group === cur) return { unit: u };
        }
        for (const b of this.buildings.values()) {
          if (b.view.group === cur) return { building: b };
        }
        cur = cur.parent;
      }
    }
    return {};
  }

  private selectAt(sx: number, sy: number): void {
    const picked = this.pickAt(sx, sy);
    if (picked.building && !this.shiftQueue) {
      this.selectedUnits = [];
      this.selectedBuilding = picked.building.id;
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
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.selectedUnits] });
      this.audio.select();
      return;
    }
    if (!this.shiftQueue) {
      this.selectedUnits = [];
      this.selectedBuilding = null;
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
      // proyectar al screen
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
      if (sel) u.view.showHealthBar(true, p.color);
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

    // clic en nodo de recurso -> recolectar
    const node = this.pickResource(sx, sy);
    if (node) {
      this.markOrder(target, 'gather');
      for (const u of units) {
        if (u.kind === UnitKind.OBRERO) {
          u.issueOrder({ kind: OrderKind.GATHER, entityId: node.id }, !this.shiftQueue);
        } else {
          u.issueOrder({ kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
        }
      }
      return;
    }
    if (picked.building) {
      const b = picked.building;
      // granja: los obreros recolectan comida de ella (solo si está completa)
      if (b.owner === 0 && b.isFarm && b.constructionComplete && b.foodAmount > 0) {
        for (const u of units) {
          if (u.kind === UnitKind.OBRERO) {
            u.issueOrder({ kind: OrderKind.GATHER, entityId: b.id }, !this.shiftQueue);
          } else {
            u.issueOrder({ kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
          }
        }
        this.audio.order();
        return;
      }
      if (b.owner !== 0) {
        // atacar edificio enemigo
        this.markOrder({ x: b.pos.x, z: b.pos.z }, 'attack');
        for (const u of units) {
          u.issueOrder({ kind: OrderKind.ATTACK, entityId: b.id }, !this.shiftQueue);
        }
      } else if (this.shiftQueue) {
        // dar rally point
        this.setRallyPoint(b.id, target);
      } else {
        for (const u of units) {
          if (u.kind === UnitKind.OBRERO && !b.constructionComplete) {
            u.issueOrder({ kind: OrderKind.BUILD, entityId: b.id }, !this.shiftQueue);
          } else if (u.kind === UnitKind.OBRERO && b.isDropsite) {
            u.issueOrder({ kind: OrderKind.DELIVER, entityId: b.id }, !this.shiftQueue);
          } else if (b.garrisons > 0) {
            u.issueOrder({ kind: OrderKind.GARRISON, entityId: b.id }, !this.shiftQueue);
          } else {
            u.issueOrder({ kind: OrderKind.MOVE, target }, !this.shiftQueue);
          }
        }
      }
      return;
    }
    if (picked.unit && picked.unit.owner !== 0) {
      // atacar unidad enemiga
      this.markOrder({ x: picked.unit.pos.x, z: picked.unit.pos.z }, 'attack');
      for (const u of units) {
        u.issueOrder({ kind: OrderKind.ATTACK, entityId: picked.unit.id }, !this.shiftQueue);
      }
      return;
    }
    if (this.ctrlQueue) {
      // atacar-mover
      this.markOrder(target, 'attack');
      for (const u of units) {
        u.issueOrder({ kind: OrderKind.ATTACK_MOVE, target }, !this.shiftQueue);
      }
    } else {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
    }
    this.audio.order();
  }

  /** Marca visualmente el destino de una orden en el suelo. */
  private markOrder(target: OrderTarget, kind: 'move' | 'attack' | 'gather'): void {
    const y = this.terrain.getHeight(target.x, target.z);
    this.markers.spawn(target.x, y, target.z, kind);
  }

  /** Orden de movimiento/ataque-mover a un punto del mundo (usado por el minimapa). */
  commandMoveToWorld(x: number, z: number, ctrlQueue = this.ctrlQueue, shiftQueue = this.shiftQueue): void {
    const units = this.selectedUnits.map((id) => this.units.get(id)).filter((u): u is Unit => !!u && !u.dead);
    if (units.length === 0) return;
    const target: OrderTarget = { x, z };
    if (ctrlQueue) {
      this.markOrder(target, 'attack');
      for (const u of units) u.issueOrder({ kind: OrderKind.ATTACK_MOVE, target }, !shiftQueue);
    } else {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
    }
    this.audio.order();
  }

  /** Órdenes de movimiento en formación de línea (estilo AoE2). */
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
      u.issueOrder({ kind: OrderKind.MOVE, target: { x: target.x + ox, z: target.z + oz } }, !this.shiftQueue);
    }
  }

  private pickResource(sx: number, sy: number): ResourceNode | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera.camera);
    let best: ResourceNode | null = null;
    let bestD = Infinity;
    // nodos con malla propia (mina, pozo, caza, pesca, baya y árboles de reserva)
    const meshes: THREE.Object3D[] = [];
    for (const n of this.resourceNodes.values()) {
      if (n.kind === 'arbol' && n.treeSlot >= 0) continue;
      meshes.push(n.view);
    }
    const hits = this.raycaster.intersectObjects(meshes, true);
    for (const h of hits) {
      let cur: THREE.Object3D | null = h.object;
      while (cur) {
        let found: ResourceNode | null = null;
        for (const n of this.resourceNodes.values()) {
          if (n.view === cur) { found = n; break; }
        }
        if (found) {
          best = found;
          bestD = h.distance;
          break;
        }
        cur = cur.parent;
      }
      if (best) break; // ordenado por distancia: el primero es el más cercano
    }
    // árboles instanciados
    const treeHits: { dist: number; id: number }[] = [];
    this.trees.raycast(this.raycaster, treeHits);
    for (const th of treeHits) {
      if (th.dist < bestD) {
        const n = this.resourceNodes.get(th.id);
        if (n) { bestD = th.dist; best = n; }
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

  // --- construcción ---

  /**
   * ¿Se puede construir este edificio en la partida actual? Tiene en cuenta la era
   * (partidas bloqueadas por periodo) y la Huaca Sagrada, que depende del modo victoria
   * y no de la era (para que la victoria por maravilla sea alcanzable en cualquier periodo).
   */
  canBuildKind(kind: BuildingKind): boolean {
    if (kind === BuildingKind.CENTRO) return false;
    if (kind === BuildingKind.MARAVILLA) return this.settings.victoryMode === 'maravilla';
    return this.players[0].era >= BUILDING_DEFS[kind].eraMinima;
  }

  startPlacement(kind: BuildingKind): void {
    // estándar RTS: construir requiere obreros seleccionados
    const hasWorker = this.selectedUnits.some((id) => {
      const u = this.units.get(id);
      return !!u && !u.dead && u.kind === UnitKind.OBRERO;
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
    const foot = stats.tamano;
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

  /** Busca un lugar libre cerca de un punto para construir. */
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

  canPlace(x: number, z: number, foot: number): boolean {    const r = foot / 2;
    if (this.terrain.isWater(x, z) || !this.terrain.isBuildable(x, z)) return false;
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
    const stats = getBuildingStats(kind, this.players[0].era);
    if (!this.spendResource(0, stats.costo)) {
      this.hud.showToast('Recursos insuficientes', 'error');
      this.cancelPlacement();
      return;
    }
    const ctx = this.makeBuildContext(0);
    const b = new Building(kind, 0, this.players[0].era, ctx);
    b.pos.set(x, this.terrain.getHeight(x, z), z);
    b.attach(this.scene);
    b.beginConstruction();
    this.buildings.set(b.id, b);
    this.registerObstacle(b);
    this.cancelPlacement();
    // estándar RTS: construyen los obreros seleccionados (interrumpen su tarea)
    const builders = this.selectedUnits
      .map((id) => this.units.get(id))
      .filter((u): u is Unit => !!u && !u.dead && u.kind === UnitKind.OBRERO);
    for (const u of builders) {
      u.issueOrder({ kind: OrderKind.BUILD, entityId: b.id }, true);
    }
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

  /** Cancela un entrenamiento en cola y reembolsa su coste. */
  cancelProduction(buildingId: number, index: number): void {
    const b = this.buildings.get(buildingId);
    if (!b || b.owner !== 0) return;
    const item = b.productionQueue[index];
    if (!item) return;
    const stats = getUnitStats(item.unit, b.era);
    b.productionQueue.splice(index, 1);
    this.addResource(b.owner, { ...ZERO_RESOURCES, ...stats.costo });
    this.hud?.showToast('Entrenamiento cancelado', 'info');
  }

  // --- teclado ---

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    const k = e.key.toLowerCase();
    if (this.gameEnded) return;
    if (k === 'p') {
      this.togglePause();
      return;
    }
    // no procesar atajos de juego con un menú abierto o en pausa
    if (this.paused || this.hud.hasBlockingOverlay()) return;
    if (k === 'escape') {
      this.cancelPlacement();
      this.selectedUnits = [];
      this.selectedBuilding = null;
      this.refreshSelectionVisuals();
      return;
    }
    // grupos de control (Ctrl/Alt+n asignar, n recuperar, Shift+n añadir)
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const n = Number(e.key);
      if (e.ctrlKey || e.metaKey || e.altKey) this.assignControlGroup(n);
      else if (e.shiftKey) this.addToControlGroup(n);
      else this.recallControlGroup(n);
      return;
    }
    if (k === 'h') {
      const center = [...this.buildings.values()].find((b) => b.owner === 0 && b.kind === BuildingKind.CENTRO);
      if (center) this.camera.focusOn(center.pos.x, center.pos.z);
    }
    if (k === 'f') {
      if (this.selectedUnits.length > 0) {
        const u = this.units.get(this.selectedUnits[0]);
        if (u) this.camera.follow(u.id);
      }
    }
    if (e.key === ' ') {
      const lastEvt = this.lastBattleEvent;
      if (lastEvt) {
        const ent = this.units.get(lastEvt) ?? this.buildings.get(lastEvt);
        if (ent) this.camera.focusOn(ent.pos.x, ent.pos.z);
      }
    }
    // seleccionar todo el ejército (unidades de combate propias)
    if (k === 'e') {
      const army = [...this.units.values()].filter(
        (u) => u.owner === 0 && !u.dead && u.kind !== UnitKind.OBRERO,
      );
      this.selectedUnits = army.map((u) => u.id);
      this.selectedBuilding = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.selectedUnits] });
      this.audio.select();
      return;
    }
    // controles numéricos para paneles
    if (k === 'g') this.startPlacement(BuildingKind.GRANJA);
    if (k === 'v') this.startPlacement(BuildingKind.VIVIENDA);
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

  // --- contexto UnitContext ---

  private ctxFor(): UnitContext {
    return {
      getHeight: (x: number, z: number) => this.terrain.getHeight(x, z),
      findPath: (sx, sz, tx, tz) => this.pathfinder.pathfind(sx, sz, tx, tz),
      unitsNear: (x, z, radius) => this.unitsNear(x, z, radius),
      entitiesById: this.units,
      resourceNodes: this.resourceNodes,
      buildings: this.buildings,
      resolveDamage: (a, t, d, from) => this.resolveDamage(a, t, d, from),
      spawnProjectile: (o) => this.spawnProjectile(o),
      particles: this.particles,
      players: this.players,
      getPlayer: (id) => this.players[id],
      event: (name, payload) => bus.emit(name, payload),
      isVisibleTo: () => true,
      gather: (dropId, unitId, amount, resource) => this.deliverGather(dropId, unitId, amount, resource),
      worldSize: this.settings.mapSize,
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

  /** Reconstruye el hash espacial de unidades (una vez por frame). */
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

  private resolveDamage(attackerId: number, targetId: number, damage: number, from: any): void {
    const target = this.units.get(targetId) ?? this.buildings.get(targetId);
    if (!target || target.dead) return;
    const armor = target instanceof Unit ? target.stats.armaduraPesado * target.armorMultiplier : (target as Building).stats.armadura;
    const final = Math.max(1, damage - armor);
    target.takeDamage(final, attackerId);
    const dmgH = target instanceof Unit ? 2.2 : 2.6;
    this.hud?.addDamageNumber(target.pos.x, target.pos.y + dmgH, target.pos.z, final, final >= 40 ? 'big' : 'normal');
    // impacto por golpe (sangre en unidades, polvo/chispas en estructuras)
    if (target instanceof Unit) {
      this.particles.emit({ x: target.pos.x, y: target.pos.y + 0.9, z: target.pos.z, count: 4, color: 0x7a1010, kind: 'polvo', speed: 1.5, life: 0.4, size: 0.7, grow: 0.3, gravity: 10, spread: 1.6 });
    } else {
      this.particles.emit({ x: target.pos.x, y: target.pos.y + 1.3, z: target.pos.z, count: 5, color: 0xcbb086, kind: 'polvo', speed: 1.2, life: 0.45, size: 0.9, grow: 1.0, gravity: 6, spread: 1.4 });
      if (Math.random() < 0.5) this.particles.emit({ x: target.pos.x, y: target.pos.y + 1.4, z: target.pos.z, count: 2, color: 0xffaa55, kind: 'chispa', speed: 2, life: 0.25, size: 0.9, gravity: 8, spread: 1.5 });
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
        bus.emit('alert', { icono: '🚨', texto: `¡${BUILDING_INFO[target.kind].nombre} atacada!`, x: target.pos.x, z: target.pos.z, warn: true });
      }
    } else if (target.hp / target.maxHp < 0.5 && now - this.lastUnitAlert > 3000) {
      this.lastUnitAlert = now;
      bus.emit('alert', { icono: '⚠️', texto: 'Unidad bajo ataque', x: target.pos.x, z: target.pos.z, warn: true });
    }
  }

  private spawnProjectile(o: any): void {
    if (o.kind === 'obús' || o.kind === 'nuclear') bus.emit('fx:artillery', {});
    else if (o.kind === 'laser' || o.kind === 'rail') bus.emit('fx:laser', {});
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
    if (o.area && o.area > 0) {
      // daño en área
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
        this.resolveDamage(o.owner, t.id, o.damage * falloff, { owner: o.owner });
      }
      // humo de la explosión
      this.particles.emit({ x: impact.x, y: impact.y + 1, z: impact.z, count: 14, color: 0x997755, kind: 'humo', speed: 2, life: 1.8, size: 3 });
      this.camera.addShake(0.5);
      bus.emit('fx:explosion', {});
    } else if (targetId !== undefined) {
      const target = this.units.get(targetId) ?? this.buildings.get(targetId);
      if (target && !target.dead) {
        this.resolveDamage(o.owner, targetId, o.damage, { owner: o.owner });
      }
    } else {
      // sin targetId: dañar al enemigo más cercano al punto de impacto
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
      if (best && bestD < 3) this.resolveDamage(o.owner, best.id, o.damage, { owner: o.owner });
    }
  }

  // --- spawn desde edificios ---

  unitSpawn = (buildingId: number, unit: UnitKind, rally: OrderTarget, hasRally: boolean): boolean => {
    const b = this.buildings.get(buildingId);
    if (!b) return false;
    const player = b.owner;
    const p = this.players[player];
    const stats = getUnitStats(unit, p.era);
    if (p.populationUsed + stats.poblacion > p.populationCap) {
      return false;
    }
    const ctx = this.makeBuildContext(player);
    const u = new Unit(unit, player, p.era, ctx);
    const ang = this.rng.float() * Math.PI * 2;
    const px = b.pos.x + Math.cos(ang) * (b.radius + 0.5);
    const pz = b.pos.z + Math.sin(ang) * (b.radius + 0.5);
    u.pos.set(px, this.terrain.getHeight(px, pz), pz);
    u.setContext(this.unitContext);
    this.applyPlayerBonuses(u, p);
    u.attach(this.scene);
    this.units.set(u.id, u);
    p.populationUsed += stats.poblacion;
    p.stats.created++;
    if (hasRally) {
      u.issueOrder({ kind: OrderKind.MOVE, target: rally });
    }
    // auto-recolección de obreros
    if (unit === UnitKind.OBRERO && !hasRally) {
      this.economy.assignWorker(u.id);
    }
    return true;
  };

  techComplete = (playerId: number, techId: string): void => {
    const p = this.players[playerId];
    p.techs.add(techId);
    const tech = getTech(techId);
    if (tech) {
      if (tech.efecto.ataqueMult) {
        p.bonus.ataque += tech.efecto.ataqueMult;
        this.applyAttackBonus(playerId, tech.efecto.ataqueMult);
      }
      if (tech.efecto.armaduraMult) {
        p.bonus.armadura += tech.efecto.armaduraMult;
        this.applyArmorBonus(playerId, tech.efecto.armaduraMult);
      }
      if (tech.efecto.recoleccionMult) {
        for (const k of RESOURCE_KEYS) {
          const v = tech.efecto.recoleccionMult[k];
          if (v) {
            p.bonus.recoleccion[k] = (p.bonus.recoleccion[k] ?? 0) + v;
            this.applyGatherBonus(playerId, k, v);
          }
        }
      }
      if (tech.efecto.capacidadBonus) {
        p.bonus.carry += tech.efecto.capacidadBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId && u.kind === UnitKind.OBRERO) u.setCarryCapacity(u.maxCarry + tech.efecto.capacidadBonus);
        }
      }
      if (tech.efecto.losBonus) {
        p.bonus.los += tech.efecto.losBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId) u.stats.los += tech.efecto.losBonus;
        }
      }
      if (tech.efecto.rangeBonus) {
        p.bonus.rango += tech.efecto.rangeBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId && u.stats.rango > 0) u.stats.rango += tech.efecto.rangeBonus;
        }
      }
      if (tech.efecto.velocidadBonus) {
        p.bonus.velocidad += tech.efecto.velocidadBonus;
        for (const u of this.units.values()) {
          if (u.owner === playerId) u.stats.velocidad += tech.efecto.velocidadBonus;
        }
      }
      if (tech.efecto.precioDescuento) {
        p.bonus.entrenamiento += tech.efecto.precioDescuento;
      }
    }
    this.hud.showToast(`Tecnología completada: ${tech?.nombre ?? techId}`, 'info');
  };

  private applyPlayerBonuses(u: Unit, p: PlayerState): void {
    u.attackMultiplier += p.bonus.ataque;
    u.armorMultiplier += p.bonus.armadura;
    for (const k of RESOURCE_KEYS) {
      const v = p.bonus.recoleccion[k];
      if (v) u.gatherMultiplier += v;
    }
    if (p.bonus.carry) u.setCarryCapacity(u.maxCarry + p.bonus.carry);
    u.stats.los += p.bonus.los;
    if (u.stats.rango > 0) u.stats.rango += p.bonus.rango;
    u.stats.velocidad += p.bonus.velocidad;
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
      if (u.owner === playerId && u.kind === UnitKind.OBRERO) u.gatherMultiplier += mult;
    }
  }

  // --- avance de era ---

  canAdvanceEra(player: number): { ok: boolean; reason?: string } {
    const p = this.players[player];
    if (p.era >= Era.CONTEMPORANEO) return { ok: false, reason: 'Era máxima' };
    const def = ERA_DEFS[p.era];
    if (!def.advanceCost) return { ok: false, reason: 'Sin coste' };
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < (def.advanceCost[k] ?? 0)) {
        return { ok: false, reason: 'Recursos insuficientes' };
      }
    }
    const count = [...this.buildings.values()].filter((b) => b.owner === player && b.constructionComplete && (b.kind === BuildingKind.CENTRO || b.kind === BuildingKind.FORTALEZA || b.kind === BuildingKind.MERCADO || b.kind === BuildingKind.INSTITUTO)).length;
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
    // modernizar edificios
    const ctx = this.makeBuildContext(player);
    for (const b of this.buildings.values()) {
      if (b.owner === player) {
        b.modernize(p.era, ctx);
      }
    }
    // modernizar unidades en el campo
    this.modernizeUnits(player);
    this.hud.showToast(`¡Avanzaste a la ${ERA_DEFS[p.era].nombre}!`, 'success');
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
      // reconstruir modelo
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
      u.view = new EntityView(model, u.radius);
      u.findPivots(model);
      // resetear multiplicadores antes de re-aplicar (evita doble conteo)
      u.attackMultiplier = 1;
      u.armorMultiplier = 1;
      u.gatherMultiplier = 1;
      u.setCarryCapacity(10);
      this.applyPlayerBonuses(u, p);
    }
  }

  // --- niebla de guerra ---

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
    // ocultar entidades enemigas no visibles
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

  /** Oculta nodos de recurso lejanos (LOD) y no explorados. */
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

  /** Activa/desactiva la niebla de guerra y refleja el cambio en el terreno. */
  setFogOfWar(on: boolean): void {
    this.settings.fogOfWar = on;
    this.fow.setEnabled(on);
    this.terrain.setFow(this.fow.texture, on);
    if (!on) {
      for (const u of this.units.values()) u.view.group.visible = true;
      for (const b of this.buildings.values()) b.view.group.visible = true;
      for (const n of this.resourceNodes.values()) n.setVisibleEx(true);
    }
  }

  // --- población ---

  private updatePopulation(): void {
    for (const p of this.players) {
      let used = 0;
      for (const u of this.units.values()) {
        if (u.owner === p.id && !u.dead && u.garrisonedIn === null) {
          used += u.stats.poblacion;
        }
      }
      p.populationUsed = used;
      let cap = 3; // centro inicial
      for (const b of this.buildings.values()) {
        if (b.owner === p.id && b.constructionComplete) {
          cap += b.providesPop;
        }
      }
      p.populationCap = Math.min(this.settings.populationCap, cap + 4);
    }
  }

  // --- victoria ---

  private checkVictory(): void {
    if (this.gameEnded) return;
    // en campaña la victoria/derrota la decide la misión
    if (this.mission) return;
    for (const p of this.players) {
      if (!p.alive) continue;
      const hasCenter = [...this.buildings.values()].some((b) => b.owner === p.id && b.kind === BuildingKind.CENTRO && !b.dead);
      if (!hasCenter) {
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

  private endGame(winner: number): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    bus.emit('game:end', { winner });
  }

  // --- update principal ---

  private update(dt: number, t: number): void {
    if (this.paused) {
      this.hud.update(dt, t);
      return;
    }
    const d = dt;

    this.sky.update(t);
    this.water.setSunDir(this.sky.sunDir);
    this.water.setDayFactor(this.sky.getDayFactor());
    this.water.update(t);
    this.terrain.setSunLight(this.sky.sunDir, this.sky.sunColor);
    this.terrain.update(t);
    // sombras de nubes: atenúa el sol según densidad de nube cerca del sol
    const cs = cloudDensity(this.sky.sunDir.x * 900 + t * 3, this.sky.sunDir.z * 900) * 0.22;
    this.terrain.setCloudShadow(1 - cs);
    this.particles.update(d);
    this.markers.update(d);
    this.trees.update(d);

    this.camera.update(d, t);
    this.rebuildSpatial();

    // unidades
    for (const u of this.units.values()) {
      if (u.dead) continue;
      u.ctx = this.unitContext;
      u.update(d, t);
    }
    // edificios
    for (const b of this.buildings.values()) {
      if (b.dead) continue;
      b.ctx = this.unitContext;
      b.update(d, t);
    }
    // recursos
    for (const n of this.resourceNodes.values()) {
      if (n.dead) continue;
      n.update(t);
    }
    // proyectiles
    for (const p of this.projectiles) {
      p.update(d);
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    updateProjectilePools(d);

    this.updateFow();
    this.applyLod();
    this.updatePopulation();

    // misión de campaña: evaluar ANTES de limpiar muertos para que los
    // objetivos detecten entidades recién destruidas (destruir/proteger)
    this.mission?.update(d, t);
    this.tutorial?.update(d);

    // limpia muertos
    this.cleanupDead();

    // Alerta de ataque a la base del jugador
    this.alertTimer -= d;
    if (this.alertTimer <= 0) {
      this.alertTimer = 3;
      this.checkBaseThreat();
    }

    // IA
    this.ai?.update(d, t);

    this.checkVictory();

    this.hud.update(d, t);
  }

  private cleanupDead(): void {
    for (const [id, u] of this.units) {
      if (u.dead) {
        u.removeFromScene();
        this.units.delete(id);
      }
    }
    for (const [id, b] of this.buildings) {
      if (b.dead) {
        b.removeFromScene();
        const h = this.obstacleHandles.get(b.id);
        if (h) {
          this.pathfinder.removeObstacle(h);
          this.obstacleHandles.delete(b.id);
        }
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
  }

  private ai: AI | null = null;
  private alertTimer = 0;
  private alerted = false;

  private checkBaseThreat(): void {
    const center = [...this.buildings.values()].find((b) => b.owner === 0 && b.kind === BuildingKind.CENTRO && !b.dead);
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
      bus.emit('alert', { icono: '🚨', texto: '¡Tu base está bajo ataque!', x: center.pos.x, z: center.pos.z, warn: true });
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
    this.postfx.render(0.016);
  }

  private onResize(): void {
    const ratio = this.pixelRatioOverride ?? Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(ratio);
    this.camera.resize(window.innerWidth, window.innerHeight);
    this.postfx.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getSelectedUnits(): Unit[] {
    return this.selectedUnits.map((id) => this.units.get(id)).filter((u): u is Unit => !!u && !u.dead);
  }

  getSelectedBuilding(): Building | null {
    return this.selectedBuilding !== null ? this.buildings.get(this.selectedBuilding) ?? null : null;
  }

  /** Reemplaza la selección de unidades por los ids dados (solo propias y vivas). */
  selectUnits(ids: number[]): void {
    const valid = ids.filter((id) => {
      const u = this.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.selectedUnits = valid;
    this.selectedBuilding = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [...valid] });
    this.audio.select();
  }

  destroy(): void {
    this.loop.stop();
    this.camera.dispose();
    window.removeEventListener('resize', this.onResizeBound);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.terrain.dispose();
    this.sky.dispose();
    this.water.dispose();
    this.particles.dispose();
    this.markers.dispose();
    this.trees.dispose();
    this.fow.dispose();
    this.postfx.dispose();
    clearModelCaches();
    clearResourceCaches();
    clearTextureCache();
    this.renderer.dispose();
    canvas.remove();
  }
}

function buildModelForGhost(kind: BuildingKind, ctx: BuildContext): THREE.Group {
  const def = BUILDING_DEFS[kind];
  const modelType = Object.values(def.eraModel)[0];
  return buildModel({ type: modelType?.type ?? 'centro_vapor' }, ctx);
}
