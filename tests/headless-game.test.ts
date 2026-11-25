import { describe, expect, it } from 'vitest';
import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { BuildingKind } from '../src/core/types';
import { bus } from '../src/core/EventBus';
import { CUSCO_CITY_PLAZA } from '../src/model/defs/cuscoCity';
import { headlessMission } from './headless';

describe('headless Game', () => {
  it('runs an AI-vs-AI match without DOM or renderer', () => {
    setAutoStart(false);
    const game = new Game(
      { ...DEFAULT_SETTINGS, mapSize: 128, fogOfWar: false, cinematic: false, showHints: false, soundEnabled: false },
      null,
      null,
      false,
      true,
    );
    game.ais.length = 0;
    game.addAI(0, 'normal');
    game.addAI(1, 'normal');
    for (let i = 0; i < 600; i++) game.update(1 / 60, i / 60);
    expect(game.stepCount).toBe(600);
    expect(game.units.size).toBeGreaterThan(0);
    expect(game.buildings.size).toBeGreaterThan(0);
    const alerts: string[] = [];
    const onAlert = (payload: { text: string }): void => {
      alerts.push(payload.text);
    };
    bus.on('alert', onAlert);
    const center = [...game.buildings.values()].find((building) => building.owner === 0 && building.kind === 'center');
    expect(center).toBeDefined();
    game.lastBaseAlert = -10_000;
    game.resolveDamage(0, center!.id, 1, { owner: 0 }, 'heavy');
    expect(alerts.length).toBeGreaterThan(0);
    bus.off('alert', onAlert);
    game.destroy();
    setAutoStart(true);
  });
});

describe('authored-site construction', () => {
  it('reserves the colonial kit footprints but opens Lima’s plaza apron', () => {
    const game = headlessMission('m_lima');
    try {
      // The east apron is outside the plaza-core keepout and clear of the portal/casona blockers.
      expect(game.canPlace(103, 150, 4)).toBe(true);
      // Inside the east casona: the authored footprint must reject the building.
      expect(game.canPlace(108, 160, 4)).toBe(false);
    } finally {
      game.destroy();
      setAutoStart(true);
    }
  });
});

/** Headless Caral match: the authored valley, its river and its fords. */
function caralGame(): Game {
  setAutoStart(false);
  const game = new Game(
    {
      ...DEFAULT_SETTINGS,
      missionId: 'm1_caral',
      fogOfWar: false,
      cinematic: false,
      showHints: false,
      soundEnabled: false,
    },
    null,
    null,
    false,
    true,
  );
  game.ais.length = 0;
  return game;
}

describe('drought grove', () => {
  it('dries only the riparian trees and leaves them standing', () => {
    const game = caralGame();
    const make = (id: number, x: number, z: number): { dry: boolean } => {
      const view = {
        dry: false,
        setDry(): void {
          this.dry = true;
        },
      };
      game.resourceNodes.set(id, {
        id,
        kind: 'tree',
        dead: false,
        depleted: false,
        pos: { x, y: 0, z },
        nodeView: view,
      } as never);
      return view;
    };
    const river = make(1, 70, 64);
    const desert = make(2, 230, 20);
    game.dryRiparianGrove();
    expect(river.dry, 'the grove along the Supe dies').toBe(true);
    expect(desert.dry, 'the desert keeps its trees').toBe(false);
    game.resourceNodes.clear();
    game.destroy();
    setAutoStart(true);
  });
});

describe('drought on standing fields', () => {
  it('dries the harvest down and replanting does not refill it', () => {
    setAutoStart(false);
    const game = new Game(
      { ...DEFAULT_SETTINGS, mapSize: 128, fogOfWar: false, cinematic: false, showHints: false, soundEnabled: false },
      null,
      null,
      false,
      true,
    );
    game.ais.length = 0;
    const farm = game.spawnScriptedBuilding(BuildingKind.FARM, 0, 64, 64);
    const before = farm.foodAmount;
    expect(before).toBeGreaterThan(0);

    game.startEnvironmentalEvent('drought');
    for (let i = 0; i < 45; i++) game.updateEnvironment(1);
    expect(game.environment.drought).toBe(1);
    expect(farm.foodAmount).toBeLessThan(before);
    expect(farm.foodAmount).toBeCloseTo(before * 0.5, -1);

    // A field sown during the drought yields less than the one it replaces, never a full irrigated crop.
    const dry = farm.foodAmount;
    farm.foodAmount = 0;
    game.players[0].resources.wood = 100;
    expect(game.replantFarm(farm.id)).toBe(true);
    expect(farm.foodAmount).toBeGreaterThan(0);
    // The dried yield (the ramp rounds at each step), never the full irrigated harvest.
    expect(farm.foodAmount).toBeLessThan(dry * 1.05);
    expect(farm.foodAmount).toBeLessThan(before);
    expect(farm.foodAmount).toBeLessThan(before);
    // The rescale is ratio-based: applying it again (the load path does) does not dry the field twice.
    const once = farm.foodAmount;
    game.refreshFarmYields();
    expect(farm.foodAmount).toBe(once);

    game.destroy();
    setAutoStart(true);
  });
});

describe('seasonal water', () => {
  it('keeps the sea level while the Supe follows the drought', () => {
    const game = caralGame();
    const sea = game.mapProfile.water.level;
    expect(game.waterSurfaceAt(10, 128), 'the Pacific starts at sea level').toBe(sea);
    game.startEnvironmentalEvent('drought');
    for (let i = 0; i < 45; i++) game.updateEnvironment(1);
    expect(game.environment.drought).toBe(1);
    expect(game.waterSurfaceAt(10, 128), 'the Pacific does not follow the Supe').toBe(sea);
    expect(game.waterSurfaceAt(70, 128), 'the river does drop').toBeLessThan(sea);
    game.destroy();
    setAutoStart(true);
  });
});

/** Headless Tambotoco match: the authored valley, its stream and the dry ford bar. */
function tambotocoGame(): Game {
  setAutoStart(false);
  const game = new Game(
    {
      ...DEFAULT_SETTINGS,
      missionId: 'm_tambotoco',
      fogOfWar: false,
      cinematic: false,
      showHints: false,
      soundEnabled: false,
    },
    null,
    null,
    false,
    true,
  );
  game.ais.length = 0;
  return game;
}

describe('Tambotoco stream ford', () => {
  it('crosses on the dry bar and keeps the deep channel impassable', () => {
    const game = tambotocoGame();
    expect(game.isFordAt(153.5, 190), 'the bar is inside the authored ford').toBe(true);
    expect(game.terrain.isWater(153.5, 190), 'the bar is dry').toBe(false);
    expect(game.pathfinder.isWalkable(153.5, 190), 'the bar is crossable').toBe(true);
    // The wide dry bar reaches the field edge; the deep channel south of it stays water.
    expect(game.isFordAt(153.5, 198), 'the authored 10 m band is kept').toBe(true);
    expect(game.isFordAt(153.5, 205)).toBe(false);
    expect(game.pathfinder.isWalkable(153.5, 205), 'deep water is not').toBe(false);
    const route = game.pathfinder.pathfind(148, 190, 160, 190);
    expect(route.length, 'a route crosses the stream on the bar').toBeGreaterThan(0);
    game.destroy();
    setAutoStart(true);
  });
});

describe('Supe fords', () => {
  it('keeps the river continuous and walkable at the crossings', () => {
    const game = caralGame();
    // The bar sits under the waterline (so the river reads as continuous) but the pathfinder wades it.
    expect(game.isFordAt(70, 64)).toBe(true);
    expect(game.terrain.isWater(70, 64)).toBe(true);
    expect(game.pathfinder.isWalkable(70, 64), 'the ford is crossable').toBe(true);
    // Off the ford the channel is open water and stays impassable.
    expect(game.isFordAt(70, 54)).toBe(false);
    expect(game.pathfinder.isWalkable(70, 54), 'deep water is not').toBe(false);
    // Bank to bank: the route the units take crosses the ford instead of stopping at the water.
    const route = game.pathfinder.pathfind(55, 64, 85, 64);
    expect(route.length, 'a route exists across the Supe').toBeGreaterThan(0);
    expect(
      route.some((point) => Math.abs(point.z - 64) <= 4.5),
      'it crosses on the ford',
    ).toBe(true);
    game.destroy();
    setAutoStart(true);
  });
});

describe('headless authored-site collision', () => {
  it('blocks Cusco’s ushnu without a renderer', () => {
    setAutoStart(false);
    const game = new Game(
      {
        ...DEFAULT_SETTINGS,
        missionId: 'm_cusco_1536',
        fogOfWar: false,
        cinematic: false,
        showHints: false,
        soundEnabled: false,
      },
      null,
      null,
      false,
      true,
    );
    // The ushnu is the layout's centred piece at the plaza anchor; the plaza floor around it stays open.
    expect(game.pathfinder.isWalkable(CUSCO_CITY_PLAZA.x, CUSCO_CITY_PLAZA.z)).toBe(false);
    expect(game.pathfinder.isWalkable(CUSCO_CITY_PLAZA.x + 25, CUSCO_CITY_PLAZA.z + 25)).toBe(true);
    game.destroy();
    setAutoStart(true);
  });

  it('blocks Lima’s cathedral without a renderer and keeps the plaza walkable', () => {
    setAutoStart(false);
    const game = new Game(
      {
        ...DEFAULT_SETTINGS,
        missionId: 'm_lima_1821',
        fogOfWar: false,
        cinematic: false,
        showHints: false,
        soundEnabled: false,
      },
      null,
      null,
      false,
      true,
    );
    const site = game.siteDef!;
    // The cathedral sits 19.5 m north of the plaza anchor; the plaza itself stays open around the fountain.
    expect(game.pathfinder.isWalkable(site.anchor.x, site.anchor.z - 19.5)).toBe(false);
    expect(game.pathfinder.isWalkable(site.anchor.x + 4, site.anchor.z + 4)).toBe(true);
    game.destroy();
    setAutoStart(true);
  });
});
