import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { LIMA_SITE_ORIGIN } from '../../../model/defs/sites';

// La Ciudad de los Reyes: the plaza, the Rímac bridge and Quizu's camp in the hills.
const LIMA_CITY = LIMA_SITE_ORIGIN;
const LIMA_BRIDGE = { x: 120, z: 124 } as const;
const LIMA_ENEMY = { x: 205, z: 70 } as const;
const LIMA_CURACAS = { x: 55, z: 200 } as const;

// The relief column musters outside its camp instead of inside it.
const LIMA_RELIEF_ENTRY = { dx: LIMA_ENEMY.x + 14, dz: LIMA_ENEMY.z } as const;

export const mLima: MissionDef = {
  id: 'm_lima',
  commanders: ['pizarro', 'quizu_yupanqui'],
  title: 'La Ciudad de los Reyes',
  subtitle: 'Lima · 1535–1536',
  history:
    'El 18 de enero de 1535 Francisco Pizarro funda la Ciudad de los Reyes junto al Rímac, sobre señoríos del curacazgo de Lima y con aliados andinos.\n' +
    'En agosto de 1536 el ejército de Quizu Yupanqui, enviado por Manco Inca, baja de los cerros y cerca la ciudad. La caballería y los aliados sostienen el llano; Quizu muere y el cerco se levanta. El Cusco sigue cercado.',
  victory:
    'El cerco de Lima se rompe: Quizu Yupanqui cae y la ciudad queda en pie. La victoria no termina la guerra: el Cusco sigue cercado y la conquista continuará.',
  defeat: 'Lima cae ante el ejército de Quizu. La Ciudad de los Reyes deja de ser la cabeza de la conquista.',
  period: HistoricalPeriod.VICEROYALTY,
  periodNote: 'Conquista · 1535–1536',
  narrator: 'Crónica de la Ciudad de los Reyes',
  playerCiv: CivId.HUESTE_INDIANA,
  enemyCiv: CivId.INCA,
  playerName: 'Hueste indiana',
  enemyName: 'Inca de Quizu Yupanqui',
  region: 'central_coast',
  map: { seed: 1535, type: 'coast', size: 256 },
  layout: {
    labels: [
      { text: 'Mar del Sur', x: 24 / 256, z: 150 / 256, kind: 'water' },
      { text: 'Río Rímac', x: LIMA_BRIDGE.x / 256, z: LIMA_BRIDGE.z / 256, kind: 'water' },
      { text: 'Ciudad de los Reyes', x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, kind: 'settlement' },
      { text: 'Cerros de Quizu', x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256, kind: 'region' },
      { text: 'Curacazgo de Lima', x: LIMA_CURACAS.x / 256, z: LIMA_CURACAS.z / 256, kind: 'region' },
    ],
    base: { x: 70 / 256, z: 170 / 256 },
    opening: { x: 96 / 256, z: 150 / 256 },
    enemyBase: { x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256 },
    discoveries: [{ heritageId: 'lima_plaza' }],
    terrain: {
      flats: [
        { name: 'Llano de Lima', x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.2, rz: 0.16 },
        { name: 'Río Rímac', x: LIMA_BRIDGE.x / 256, z: LIMA_BRIDGE.z / 256, rx: 0.12, rz: 0.08 },
        { name: 'Cerros de Quizu', x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256, rx: 0.16, rz: 0.14 },
      ],
    },
    site: {
      id: 'lima_site',
      y: 5.6,
      focus: { x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256 },
      keepout: [{ x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.06, rz: 0.05 }],
      buildKeepout: [{ x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.04, rz: 0.04 }],
    },
    roads: [
      { from: { dx: 70, dz: 170 }, to: { dx: LIMA_CITY.x, dz: LIMA_CITY.z }, width: 3 },
      { from: { dx: LIMA_CITY.x, dz: LIMA_CITY.z }, to: { dx: LIMA_BRIDGE.x, dz: LIMA_BRIDGE.z }, width: 3 },
      { from: { dx: LIMA_BRIDGE.x, dz: LIMA_BRIDGE.z }, to: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z }, width: 3 },
    ],
  },
  atmosphere: { fogDensity: 0.0022, sunWarmth: 0.95, skyTint: '#d7dcd8' },
  timeOfDay: 'morning',
  startingEra: Era.VICEROYALTY,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 900, wood: 700, silver: 400, stone: 400 },
  start: {
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 5 },
      { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 8 },
      { kind: UnitKind.MUSKETEER, dx: 10, dz: 2, count: 3 },
      { kind: UnitKind.CAVALRY, dx: 12, dz: -2, count: 2 },
      { kind: UnitKind.CAVALRY, dx: 6, dz: 0, count: 1, tag: 'pizarro' },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1 },
      { kind: UnitKind.MISSIONARY, dx: 8, dz: 8, count: 1 },
    ],
  },
  mark: [{ tag: 'campamento_quizu', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'normal', aggression: 0.8 },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/lima/intro-epilogo.webp',
  buildingNames: { [BuildingKind.MARKET]: 'Cabildo y plaza' },
  intro: [
    {
      kicker: 'RÍMAC · 18 DE ENERO DE 1535',
      title: 'La Ciudad de los Reyes',
      text: 'Pizarro funda Lima junto al Rímac, en tierras del curacazgo de Lima. La ciudad se levanta con aliados andinos: sin ellos no hay defensa posible.',
      seconds: 10,
      source: 'docs/historia/campanas/lima.md',
      image: 'media/lima/intro-ciudad.webp',
    },
    {
      kicker: 'AGOSTO DE 1536',
      title: 'El cerco',
      text: 'Manco Inca envía a Quizu Yupanqui contra Lima. Sus columnas destruyen los socorros que Pizarro manda al Cusco y el ejército baja de los cerros.',
      seconds: 9,
      source: 'docs/historia/campanas/lima.md',
      image: 'media/lima/intro-rimac.webp',
    },
    {
      kicker: 'EL LLANO',
      title: 'La defensa',
      text: 'En el llano, la caballería y los aliados andinos rompen el asalto. Quizu muere y el cerco se levanta; el Cusco sigue cercado.',
      seconds: 10,
      source: 'docs/historia/campanas/lima.md',
      image: 'media/lima/intro-cerco.webp',
    },
  ],
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.MUSKETEER,
    UnitKind.CAVALRY,
    UnitKind.ARTILLERY,
    UnitKind.SCOUT,
    UnitKind.MISSIONARY,
  ],
  allowedBuildings: [
    BuildingKind.CENTER,
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.BARRACKS,
    BuildingKind.ARSENAL,
    BuildingKind.STABLE,
    BuildingKind.FACTORY,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  objectives: [
    {
      id: 'a1_traza',
      kind: 'inspect',
      heritageIds: ['lima_plaza'],
      inspectRadius: 16,
      pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
      radius: 20,
      title: 'Traza la Plaza Mayor junto al Rímac',
    },
    {
      id: 'a1_cabildo',
      kind: 'build',
      buildingKind: BuildingKind.MARKET,
      pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
      radius: 24,
      hidden: true,
      title: 'Levanta el cabildo y la plaza',
    },
    {
      id: 'a2_cerco',
      kind: 'hold',
      pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
      radius: 22,
      time: 90,
      minUnits: 6,
      hidden: true,
      title: 'Sostén Lima durante el cerco',
    },
    {
      id: 'a2_curacas',
      kind: 'reach',
      pos: { dx: LIMA_CURACAS.x, dz: LIMA_CURACAS.z },
      radius: 10,
      optional: true,
      hidden: true,
      title: 'Pacta con los curacas del valle',
    },
    {
      id: 'a3_ruptura',
      kind: 'destroy',
      entityTag: 'campamento_quizu',
      hidden: true,
      title: 'Rompe el cerco: toma el campamento de Quizu',
    },
    {
      id: 'a3_pizarro',
      kind: 'protect',
      entityTag: 'pizarro',
      title: 'Mantén con vida a Francisco Pizarro',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pizarro',
          duration: 9,
          text: '—Este valle es la cabeza de la conquista. Tracemos la plaza, levantemos el cabildo y ganémonos a los curacas.',
        },
      ],
    },
    {
      id: 't_traza',
      condition: { type: 'objective', objectiveId: 'a1_traza', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pizarro',
          duration: 8,
          text: '—La traza está hecha. Levantemos el cabildo y la plaza antes de que los cerros se muevan.',
        },
        { type: 'objective', objectiveId: 'a1_cabildo', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_cabildo',
      condition: { type: 'objective', objectiveId: 'a1_cabildo', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Agosto de 1536',
          title: 'El cerco',
          image: 'media/lima/intro-rimac.webp',
          text: 'Las columnas de socorro al Cusco se pierden en la sierra. Quizu Yupanqui baja de los cerros con el ejército de Manco Inca. Lima debe resistir.',
        },
        { type: 'site_phase', phase: 'ciudad' },
        { type: 'objective', objectiveId: 'a2_cerco', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_curacas', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 6 }],
          pos: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z },
          radius: 10,
          // The siege column marches on the city: «Sostén Lima» was an uncontested wait otherwise.
          target: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
        },
      ],
    },
    {
      id: 't_cerco',
      condition: { type: 'objective', objectiveId: 'a2_cerco', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · El llano',
          title: 'La ruptura',
          image: 'media/lima/intro-cerco.webp',
          text: 'El asalto se detiene en el llano. La caballería y los aliados andinos pueden pasar al ataque: el campamento de Quizu está en los cerros.',
        },
        { type: 'objective', objectiveId: 'a3_ruptura', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_curacas',
      condition: { type: 'objective', objectiveId: 'a2_curacas', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pizarro',
          duration: 7,
          text: '—Los curacas del valle se suman. Sin sus hombres, Lima no aguanta el cerco.',
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.SOLDIER, count: 3 }],
          pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
          radius: 10,
          objective: 'position',
        },
      ],
    },
    {
      id: 't_refuerzos',
      condition: { type: 'time', seconds: 300 },
      repeat: true,
      cooldown: 75,
      // Two relief columns, not an endless one: the old trigger added ~36 men over twenty minutes.
      maxFires: 2,
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 3 }],
          spawn: LIMA_RELIEF_ENTRY,
          pos: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z },
          radius: 10,
          objective: 'position',
        },
      ],
    },
  ],
};
