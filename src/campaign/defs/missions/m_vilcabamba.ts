import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { VILCABAMBA_HEIGHTFIELD, VILCABAMBA_RIVER_PATH } from '../../../model/defs/vilcabambaHeightmap';
import type { MissionDef } from '../../types';

// Vilcabamba 1572: Huayna Pucará, the burning refuge and the escape route to the lower Urubamba.
const VILCABAMBA_FORT = { x: 180, z: 97 } as const;
const VILCABAMBA_TOWN = { x: 150, z: 132 } as const;
const VILCABAMBA_CAMP = { x: 90, z: 166 } as const;
const VILCABAMBA_ENEMY = { x: 198, z: 64 } as const;
const VILCABAMBA_ESCAPE = { x: 54, z: 220 } as const;
// The label sits on the generated centreline (the river meanders), not on a copied constant.
const VILCABAMBA_RIVER = VILCABAMBA_RIVER_PATH.reduce((best, p) =>
  Math.abs(p[1]! - 141) < Math.abs(best[1]! - 141) ? p : best,
);

export const mVilcabamba: MissionDef = {
  id: 'm_vilcabamba',
  commanders: ['tupac_amaru_i', 'curi_paucar'],
  title: 'El último Inca',
  subtitle: 'Vilcabamba · 1572',
  history:
    'En abril de 1572 el virrey Francisco de Toledo declara la guerra a Vilcabamba. La expedición de Martín Hurtado de Arbieto entra en la selva y combate en Huayna Pucará.\n' +
    'Vilcabamba es ocupada e incendiada por la expedición el 24 de junio. Túpac Amaru I huye hacia el bajo Urubamba y es capturado; el epílogo cuenta su ejecución en el Cusco el 24 de septiembre. La misión no cambia el desenlace: se juega la resistencia, la evacuación y la huida de la corte.',
  victory:
    'La corte y parte de los nobles escapan hacia el bajo Urubamba. Vilcabamba queda en ruinas y Túpac Amaru I es capturado; el epílogo cuenta su ejecución y el fin del Estado neoinca.',
  defeat:
    'La defensa de Huayna Pucará se quiebra y la corte no logra salir. La expedición de Toledo ocupa Vilcabamba y captura a Túpac Amaru I.',
  outcome: 'retirada',
  period: HistoricalPeriod.VICEROYALTY,
  periodNote: 'Campaña de Vilcabamba · 1572',
  narrator: 'Vilcabamba',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.REALISTAS,
  playerName: 'Corte de Vilcabamba',
  enemyName: 'Expedición de Toledo',
  region: 'amazon',
  map: { seed: 1572, type: 'jungle', size: 256 },
  layout: {
    labels: [
      { text: 'Vilcabamba', x: VILCABAMBA_TOWN.x / 256, z: VILCABAMBA_TOWN.z / 256, kind: 'settlement' },
      { text: 'Huayna Pucará', x: VILCABAMBA_FORT.x / 256, z: VILCABAMBA_FORT.z / 256, kind: 'region' },
      { text: 'Río Urubamba', x: VILCABAMBA_RIVER[0] / 256, z: VILCABAMBA_RIVER[1] / 256, kind: 'water' },
      { text: 'Bajo Urubamba', x: VILCABAMBA_ESCAPE.x / 256, z: VILCABAMBA_ESCAPE.z / 256, kind: 'region' },
      { text: 'Camino a Cusco', x: 0.78, z: 0.22, kind: 'region' },
    ],
    base: { x: VILCABAMBA_CAMP.x / 256, z: VILCABAMBA_CAMP.z / 256 },
    opening: { x: 0.42, z: 0.6 },
    enemyBase: { x: VILCABAMBA_ENEMY.x / 256, z: VILCABAMBA_ENEMY.z / 256 },
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Valle de Vilcabamba', x: 0.42, z: 0.58, rx: 0.16, rz: 0.13 },
        { name: 'Huayna Pucará', x: VILCABAMBA_FORT.x / 256, z: VILCABAMBA_FORT.z / 256, rx: 0.11, rz: 0.09 },
        { name: 'Bajo Urubamba', x: VILCABAMBA_ESCAPE.x / 256, z: VILCABAMBA_ESCAPE.z / 256, rx: 0.12, rz: 0.1 },
      ],
    },
    site: {
      id: 'vilcabamba_site',
      y: 5,
      heightField: VILCABAMBA_HEIGHTFIELD,
      focus: { x: VILCABAMBA_FORT.x / 256, z: VILCABAMBA_FORT.z / 256 },
      keepout: [{ x: VILCABAMBA_FORT.x / 256, z: VILCABAMBA_FORT.z / 256, rx: 0.075, rz: 0.07 }],
      buildKeepout: [{ x: VILCABAMBA_FORT.x / 256, z: VILCABAMBA_FORT.z / 256, rx: 0.065, rz: 0.06 }],
    },
    roads: [
      {
        from: { dx: VILCABAMBA_CAMP.x, dz: VILCABAMBA_CAMP.z },
        to: { dx: VILCABAMBA_FORT.x, dz: VILCABAMBA_FORT.z },
        width: 3,
      },
      {
        from: { dx: VILCABAMBA_FORT.x, dz: VILCABAMBA_FORT.z },
        to: { dx: VILCABAMBA_ESCAPE.x, dz: VILCABAMBA_ESCAPE.z },
        width: 3,
      },
      {
        from: { dx: VILCABAMBA_FORT.x, dz: VILCABAMBA_FORT.z },
        to: { dx: VILCABAMBA_ENEMY.x, dz: VILCABAMBA_ENEMY.z },
        width: 3,
      },
    ],
    // The cloud-forest walls: visual-only canopy above the walkable band, so the valley reads closed
    // without adding gatherable trees or obstacles to the mission's economy and routes.
    groves: [
      { x: 0.19, z: 0.48, rx: 0.11, rz: 0.34, count: 170, minHeight: 7.5 },
      { x: 0.85, z: 0.44, rx: 0.085, rz: 0.31, count: 150, minHeight: 8.5 },
      { x: 0.5, z: 0.11, rx: 0.3, rz: 0.06, count: 80, minHeight: 7 },
    ],
  },
  mapOverrides: {
    culturalLandscape: null,
    // Cloud-forest floor: the amazon density already saturates the cover budget, so the lever is the
    // mix — more ferns and tall grass among fewer stones (docs/design/geographic-families.md).
    vegetation: { groundCoverWeights: { fern: 2.4, grass: 1.2, pebble: 0.25, gravel: 0.2 } },
    // No resource/economy override: the canopy is the visual-only `groves` above.
  },
  atmosphere: { fogDensity: 0.0036, sunWarmth: 0.9, skyTint: '#b9c6bc' },
  timeOfDay: 'dusk',
  startingEra: Era.VICEROYALTY,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 900, wood: 600, silver: 300, stone: 300 },
  start: {
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 3 },
      // The garrison holds Huayna Pucará: a defensive stance keeps the forty-five second hold from
      // unravelling when an enemy worker crosses the aggro radius and the line chases it downhill.
      { kind: UnitKind.INCA_WARRIOR, dx: 8, dz: 0, count: 10, stance: 'defensivo' },
      { kind: UnitKind.SOLDIER, dx: 12, dz: 2, count: 4, stance: 'defensivo' },
      { kind: UnitKind.SCOUT, dx: 14, dz: 0, count: 1 },
      { kind: UnitKind.INCA_WARRIOR, dx: 6, dz: 0, count: 1, tag: 'curi_paucar', stance: 'defensivo' },
    ],
  },
  enemy: { active: true, difficulty: 'hard', aggression: 1.0 },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/vilcabamba/intro-epilogo.webp',
  intro: [
    {
      kicker: 'VILCABAMBA · 1572',
      title: 'La última corte',
      text: 'El virrey Toledo declara la guerra al Estado neoinca. La expedición de Arbieto entra en la selva; Vilcabamba es el último refugio de la corte.',
      seconds: 9,
      source: 'docs/historia/campanas/vilcabamba.md',
      image: 'media/vilcabamba/intro-corte.webp',
    },
    {
      kicker: 'HUAYNA PUCARÁ · 1572',
      title: 'La defensa',
      text: 'La resistencia se apoya en Huayna Pucará y en los senderos de la selva. La defensa debe ganar tiempo para que la corte abandone Vilcabamba y salga hacia el bajo Urubamba.',
      seconds: 9,
      source: 'docs/historia/campanas/vilcabamba.md',
      image: 'media/vilcabamba/intro-pucara.webp',
    },
    {
      kicker: 'CUSCO · 24 DE SEPTIEMBRE DE 1572',
      title: 'El último Inca',
      text: 'Vilcabamba cae y Túpac Amaru I es capturado en la huida. El epílogo cuenta su ejecución en el Cusco: la resistencia armada termina, pero la memoria del Estado neoinca permanece.',
      seconds: 10,
      source: 'docs/historia/campanas/vilcabamba.md',
      image: 'media/vilcabamba/intro-captura.webp',
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
  buildingNames: { [BuildingKind.FORTRESS]: 'Pucará' },
  objectives: [
    {
      id: 'a1_huayna',
      kind: 'hold',
      pos: { dx: VILCABAMBA_FORT.x, dz: VILCABAMBA_FORT.z },
      radius: 18,
      time: 45,
      minUnits: 5,
      title: 'Defiende Huayna Pucará',
    },
    {
      id: 'a2_evacua',
      kind: 'reach',
      pos: { dx: VILCABAMBA_TOWN.x, dz: VILCABAMBA_TOWN.z },
      radius: 16,
      hidden: true,
      requires: 'a1_huayna',
      title: 'Evacúa Vilcabamba y abre la huida',
    },
    {
      id: 'a2_senderos',
      kind: 'reach',
      pos: { dx: 140, dz: 140 },
      radius: 12,
      optional: true,
      hidden: true,
      title: 'Abre los senderos de la selva',
    },
    {
      id: 'a2_curi',
      kind: 'protect',
      entityTag: 'curi_paucar',
      optional: true,
      title: 'Protege al capitán Curi Paucar',
    },
    {
      id: 'a3_huida',
      kind: 'hold',
      pos: { dx: VILCABAMBA_ESCAPE.x, dz: VILCABAMBA_ESCAPE.z },
      radius: 18,
      time: 20,
      minUnits: 5,
      hidden: true,
      requires: 'a2_evacua',
      title: 'Salva a la corte en el bajo Urubamba',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru I',
          duration: 9,
          text: '—No podemos detener a Toledo en campo abierto. Defendamos Huayna Pucará y salvemos a la corte; la selva es nuestro último aliado.',
        },
      ],
    },
    {
      id: 't_huayna',
      condition: { type: 'objective', objectiveId: 'a1_huayna', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Vilcabamba',
          title: 'La ciudad en llamas',
          image: 'media/vilcabamba/intro-pucara.webp',
          text: 'Huayna Pucará resiste el tiempo suficiente. La corte abandona Vilcabamba antes de que la expedición la ocupe; el camino al bajo Urubamba queda abierto.',
        },
        { type: 'objective', objectiveId: 'a2_evacua', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_senderos', state: 'activate' },
        { type: 'objective', objectiveId: 'a2_curi', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 6 },
            { kind: UnitKind.CAVALRY, count: 2 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { dx: VILCABAMBA_ENEMY.x, dz: VILCABAMBA_ENEMY.z },
          radius: 12,
          target: { dx: VILCABAMBA_FORT.x, dz: VILCABAMBA_FORT.z },
        },
      ],
    },
    {
      id: 't_evacua',
      condition: { type: 'objective', objectiveId: 'a2_evacua', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La huida',
          title: 'El bajo Urubamba',
          image: 'media/vilcabamba/intro-captura.webp',
          text: 'Vilcabamba queda atrás. La corte corre hacia el bajo Urubamba; la resistencia debe sostener la huida el tiempo suficiente para salvar a los suyos.',
        },
        { type: 'objective', objectiveId: 'a3_huida', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          pos: { dx: VILCABAMBA_ENEMY.x, dz: VILCABAMBA_ENEMY.z },
          radius: 12,
          target: { dx: VILCABAMBA_ESCAPE.x, dz: VILCABAMBA_ESCAPE.z },
        },
      ],
    },
    {
      id: 't_huida',
      condition: { type: 'objective', objectiveId: 'a3_huida', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru I',
          duration: 9,
          text: '—Parte de la corte ha escapado. Lo que venga después, la memoria de Vilcabamba no se apaga.',
        },
      ],
    },
  ],
};
