import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

// Cusco 1536: the Inca camp, Sacsayhuamán, the city and the withdrawal road.
const CUSCO_1536_CITY = { x: 166, z: 174 } as const;
const CUSCO_1536_SACSAY = { x: 158, z: 141 } as const;
const CUSCO_1536_CAMP = { x: 77, z: 77 } as const;
const CUSCO_1536_RETREAT = { x: 77, z: 218 } as const;

export const mCusco1536: MissionDef = {
  id: 'm_cusco_1536',
  commanders: ['manco_inca'],
  title: 'Cusco en llamas',
  subtitle: 'Cusco · 1536',
  history:
    'En abril–mayo de 1536 Manco Inca se alza contra los conquistadores y reúne un gran ejército para cercar el Cusco. Los españoles quedan encerrados en dos edificios de la plaza; los combates se extienden a Sacsayhuamán.\n' +
    'El cerco se debilita cuando el ejército debe volver a sembrar y Manco se retira a Ollantaytambo. La ciudad no cae: la misión termina con la retirada, no con una victoria inventada.',
  victory:
    'El ejército inca disputa Sacsayhuamán y obliga a los españoles a pelear por la ciudad. El calendario agrícola fuerza la retirada: Manco no toma el Cusco, pero conserva el ejército y la resistencia continúa en Vilcabamba.',
  defeat:
    'Los contraataques rompen el cerco y Manco cae o es capturado antes de la retirada. La rebelión pierde a su jefe y el Cusco queda en manos de los Pizarro.',
  period: HistoricalPeriod.VICEROYALTY,
  periodNote: 'Rebelión de Manco Inca · 1536',
  narrator: 'Rebelión de Manco Inca',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.HUESTE_INDIANA,
  playerName: 'Ejército de Manco Inca',
  enemyName: 'Hueste de los Pizarro',
  region: 'high_andes',
  map: { seed: 1536, type: 'andes', size: 256 },
  layout: {
    labels: [
      { text: 'Cusco', x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256, kind: 'settlement' },
      { text: 'Sacsayhuamán', x: CUSCO_1536_SACSAY.x / 256, z: CUSCO_1536_SACSAY.z / 256, kind: 'region' },
      { text: 'Campiña inca', x: 0.35, z: 0.4, kind: 'region' },
      { text: 'Camino a Ollantaytambo', x: CUSCO_1536_RETREAT.x / 256, z: CUSCO_1536_RETREAT.z / 256, kind: 'region' },
    ],
    base: { x: CUSCO_1536_CAMP.x / 256, z: CUSCO_1536_CAMP.z / 256 },
    opening: { x: 0.42, z: 0.42 },
    enemyBase: { x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256 },
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Campiña del Cusco', x: 0.42, z: 0.45, rx: 0.18, rz: 0.14 },
        { name: 'Sacsayhuamán', x: CUSCO_1536_SACSAY.x / 256, z: CUSCO_1536_SACSAY.z / 256, rx: 0.1, rz: 0.08 },
        { name: 'Cusco', x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256, rx: 0.1, rz: 0.09 },
      ],
    },
    site: {
      id: 'cusco_inca_site',
      y: 5,
      focus: { x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256 },
      keepout: [{ x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: CUSCO_1536_CITY.x / 256, z: CUSCO_1536_CITY.z / 256, rx: 0.08, rz: 0.07 }],
    },
    roads: [
      {
        from: { dx: CUSCO_1536_CAMP.x, dz: CUSCO_1536_CAMP.z },
        to: { dx: CUSCO_1536_CITY.x, dz: CUSCO_1536_CITY.z },
        width: 3,
      },
      {
        from: { dx: CUSCO_1536_CITY.x, dz: CUSCO_1536_CITY.z },
        to: { dx: CUSCO_1536_SACSAY.x, dz: CUSCO_1536_SACSAY.z },
        width: 3,
      },
      {
        from: { dx: CUSCO_1536_CITY.x, dz: CUSCO_1536_CITY.z },
        to: { dx: CUSCO_1536_RETREAT.x, dz: CUSCO_1536_RETREAT.z },
        width: 3,
      },
    ],
  },
  mapOverrides: {
    culturalLandscape: null,
    vegetationKit: 'andes',
    vegetation: {
      density: 0.4,
      variants: { molle: 0.55, pacay: 0.25, sauce: 0.2, broad: 0, needle: 0 },
    },
  },
  atmosphere: { fogDensity: 0.001, sunWarmth: 0.98, skyTint: '#c6d0d2' },
  timeOfDay: 'morning',
  startingEra: Era.VICEROYALTY,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 900, wood: 700, silver: 300, stone: 400 },
  start: {
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 4 },
      { kind: UnitKind.INCA_WARRIOR, dx: 8, dz: 0, count: 12 },
      { kind: UnitKind.SOLDIER, dx: 12, dz: 2, count: 6 },
      { kind: UnitKind.SCOUT, dx: 14, dz: 0, count: 1 },
      { kind: UnitKind.INCA_WARRIOR, dx: 6, dz: 0, count: 1, tag: 'manco_inca' },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.8 },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/cusco-1536/intro-epilogo.webp',
  intro: [
    {
      kicker: 'CUSCO · 1536',
      title: 'La rebelión',
      text: 'Manco Inca se alza contra los Pizarro y reúne un gran ejército. Los españoles quedan encerrados en la plaza; los combates se extienden a Sacsayhuamán.',
      seconds: 9,
      source: 'docs/historia/campanas/cusco_1536.md',
      image: 'media/cusco-1536/intro-ciudad.webp',
    },
    {
      kicker: 'SACSAYHUAMÁN · MAYO–JUNIO',
      title: 'La fortaleza',
      text: 'La lucha por Sacsayhuamán decide el cerco. Los incas ocupan la fortaleza y los españoles contraatacan para recuperarla; Juan Pizarro muere en el asalto.',
      seconds: 9,
      source: 'docs/historia/campanas/cusco_1536.md',
      image: 'media/cusco-1536/intro-sacsay.webp',
    },
    {
      kicker: 'LA SIEMBRA · 1536',
      title: 'La retirada',
      text: 'El ejército debe volver a sembrar o la economía colapsa. Manco no toma el Cusco: se retira a Ollantaytambo y la resistencia continúa en Vilcabamba.',
      seconds: 10,
      source: 'docs/historia/campanas/cusco_1536.md',
      image: 'media/cusco-1536/intro-retirada.webp',
    },
  ],
  allowedUnits: [UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.INCA_WARRIOR, UnitKind.SCOUT],
  allowedBuildings: [
    BuildingKind.CENTER,
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.BARRACKS,
    BuildingKind.ARSENAL,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  objectives: [
    {
      id: 'a1_sacsay',
      kind: 'hold',
      pos: { dx: CUSCO_1536_SACSAY.x, dz: CUSCO_1536_SACSAY.z },
      radius: 18,
      time: 45,
      minUnits: 6,
      title: 'Ocupa Sacsayhuamán y resiste el contraataque',
    },
    {
      id: 'a2_cerco',
      kind: 'hold',
      pos: { dx: CUSCO_1536_CITY.x, dz: CUSCO_1536_CITY.z },
      radius: 24,
      time: 60,
      minUnits: 6,
      consume: { resource: 'food', perSecond: 6 },
      hidden: true,
      requires: 'a1_sacsay',
      title: 'Sostén el cerco durante la siembra',
    },
    {
      id: 'a2_suministros',
      kind: 'reach',
      pos: { dx: 120, dz: 150 },
      radius: 12,
      optional: true,
      hidden: true,
      title: 'Corta los suministros de la ciudad',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      pos: { dx: CUSCO_1536_RETREAT.x, dz: CUSCO_1536_RETREAT.z },
      radius: 16,
      hidden: true,
      requires: 'a2_cerco',
      title: 'Retira el ejército hacia Ollantaytambo',
    },
    {
      id: 'a3_manco',
      kind: 'protect',
      entityTag: 'manco_inca',
      title: 'Mantén con vida a Manco Inca',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Manco Inca',
          duration: 9,
          text: '—El Cusco es nuestro. Tomemos Sacsayhuamán y cerquemos la plaza; que el hambre y la siembra decidan cuánto resisten.',
        },
      ],
    },
    {
      id: 't_counter',
      condition: { type: 'objective', objectiveId: 'a1_sacsay', state: 'activate' },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 3 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          pos: { dx: CUSCO_1536_CITY.x, dz: CUSCO_1536_CITY.z },
          radius: 12,
          target: { dx: CUSCO_1536_SACSAY.x, dz: CUSCO_1536_SACSAY.z },
        },
      ],
    },
    {
      id: 't_sacsay',
      condition: { type: 'objective', objectiveId: 'a1_sacsay', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · El cerco',
          title: 'La ciudad en llamas',
          image: 'media/cusco-1536/intro-sacsay.webp',
          text: 'Sacsayhuamán está en manos incas. El cerco se cierra sobre la plaza; los españoles contraatacan para romperlo.',
        },
        { type: 'objective', objectiveId: 'a2_cerco', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_suministros', state: 'activate' },
      ],
    },
    {
      id: 't_cerco',
      condition: { type: 'objective', objectiveId: 'a2_cerco', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La siembra',
          title: 'La retirada',
          image: 'media/cusco-1536/intro-retirada.webp',
          text: 'El cerco resiste, pero el ejército debe volver a sembrar. Manco ordena la retirada a Ollantaytambo: la ciudad no cae y la resistencia continúa.',
        },
        { type: 'objective', objectiveId: 'a3_retirada', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_retirada',
      condition: { type: 'objective', objectiveId: 'a3_retirada', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Manco Inca',
          duration: 9,
          text: '—Dejamos el Cusco, pero no la guerra. Ollantaytambo y Vilcabamba nos esperan.',
        },
      ],
    },
  ],
};
