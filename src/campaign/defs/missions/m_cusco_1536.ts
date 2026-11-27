import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { highValleyVegetation } from '../../../model/defs/profiles';
import { CUSCO1536_HEIGHTFIELD } from '../../../model/defs/cusco1536Heightmap';
import { CUSCO_SITE_POINT, CUSCO_SITE_SACSAY } from '../cuscoSite';
import type { MissionDef } from '../../types';

// Cusco 1536: the Inca camp, Sacsayhuamán, the city and the withdrawal road. Ollantaytambo lies
// north-west of the city (north is -z), down the Sacred Valley.
const CUSCO_1536_CAMP = { x: 77, z: 77 } as const;
const CUSCO_1536_RETREAT = { x: 100, z: 60 } as const;
// The road bends west of Sacsayhuamán instead of crossing its tiered footprint.
const CUSCO_1536_ROAD_BEND = { x: 135, z: 150 } as const;
// The Act II sortie enters from the city outskirts, clear of both the 24 m siege ring and the spread it
// spawns over (40 m > 4√2 + 10, and 40 - 4√2 > 24), then marches on the closing ring.
const CUSCO_1536_SORTIE = { dx: CUSCO_SITE_POINT.x + 40, dz: CUSCO_SITE_POINT.z } as const;

/** Metres east of the plaza anchor where the 1536 royalist headquarters stands. */
const ENEMY_BASE_OFFSET_X = 30;

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
  outcome: 'retirada',
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
      { text: 'Cusco', x: CUSCO_SITE_POINT.x / 256, z: CUSCO_SITE_POINT.z / 256, kind: 'settlement' },
      { text: 'Sacsayhuamán', x: CUSCO_SITE_SACSAY.x / 256, z: CUSCO_SITE_SACSAY.z / 256, kind: 'region' },
      { text: 'Campiña inca', x: 0.35, z: 0.4, kind: 'region' },
      { text: 'Camino a Ollantaytambo', x: CUSCO_1536_RETREAT.x / 256, z: CUSCO_1536_RETREAT.z / 256, kind: 'region' },
    ],
    base: { x: CUSCO_1536_CAMP.x / 256, z: CUSCO_1536_CAMP.z / 256 },
    opening: { x: 0.42, z: 0.42 },
    // The Spaniards hold the city: their headquarters stand on the open ground east of the plaza, outside the
    // kancha walls; on the plaza itself it would sink into the ushnu (cuscoCity.ts).
    // East of the ushnu, clear of its footprint (the kit's blockers cover the plaza centre).
    enemyBase: { x: (CUSCO_SITE_POINT.x + ENEMY_BASE_OFFSET_X) / 256, z: CUSCO_SITE_POINT.z / 256 },
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Campiña del Cusco', x: 0.42, z: 0.45, rx: 0.18, rz: 0.14 },
        { name: 'Sacsayhuamán', x: CUSCO_SITE_SACSAY.x / 256, z: CUSCO_SITE_SACSAY.z / 256, rx: 0.1, rz: 0.08 },
        { name: 'Cusco', x: CUSCO_SITE_POINT.x / 256, z: CUSCO_SITE_POINT.z / 256, rx: 0.1, rz: 0.09 },
      ],
    },
    site: {
      id: 'cusco_inca_site',
      y: 5,
      // The bundled GLB is a bare grey ushnu; this mission draws the plaza, halls and platform.
      hideModel: true,
      heightField: CUSCO1536_HEIGHTFIELD,
      focus: { x: CUSCO_SITE_POINT.x / 256, z: CUSCO_SITE_POINT.z / 256 },
      keepout: [{ x: CUSCO_SITE_POINT.x / 256, z: CUSCO_SITE_POINT.z / 256, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: CUSCO_SITE_POINT.x / 256, z: CUSCO_SITE_POINT.z / 256, rx: 0.08, rz: 0.07 }],
    },
    // The Cusco platform is the ushnu; the plaza and the Sacsayhuamán wall front complete it. Shared with
    // Quipaipán so both missions show the same city instead of one of them keeping the grey placeholder GLB.
    roads: [
      {
        from: { dx: CUSCO_1536_CAMP.x, dz: CUSCO_1536_CAMP.z },
        to: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
        width: 3,
      },
      {
        from: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
        to: { dx: CUSCO_SITE_SACSAY.x, dz: CUSCO_SITE_SACSAY.z },
        width: 3,
      },
      {
        from: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
        to: { dx: CUSCO_1536_ROAD_BEND.x, dz: CUSCO_1536_ROAD_BEND.z },
        width: 3,
      },
      {
        from: { dx: CUSCO_1536_ROAD_BEND.x, dz: CUSCO_1536_ROAD_BEND.z },
        to: { dx: CUSCO_1536_RETREAT.x, dz: CUSCO_1536_RETREAT.z },
        width: 3,
      },
    ],
  },
  mapOverrides: {
    culturalLandscape: null,
    vegetationKit: 'andes',
    vegetation: highValleyVegetation(0.4),
  },
  atmosphere: { fogDensity: 0.001, sunWarmth: 0.98, skyTint: '#c6d0d2' },
  timeOfDay: 'morning',
  startingEra: Era.VICEROYALTY,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 900, wood: 700, silver: 300, stone: 400 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 4 },
      { kind: UnitKind.INCA_WARRIOR, dx: 8, dz: 0, count: 12 },
      { kind: UnitKind.INCA_SLINGER, dx: 10, dz: -2, count: 4 },
      { kind: UnitKind.SOLDIER, dx: 12, dz: 2, count: 6 },
      { kind: UnitKind.SCOUT, dx: 14, dz: 0, count: 1 },
      { kind: UnitKind.INCA_WARRIOR, dx: 6, dz: 0, count: 1, tag: 'manco_inca' },
    ],
  },
  // A besieged city, not a skirmish player: the Spanish sortie is the authored pressure, so the
  // centre and houses stay but no peasant economy runs inside the walls.
  enemy: { active: true, difficulty: 'normal', aggression: 0.8, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/cusco-1536/intro-epilogo.webp',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (Manco's camp, Sacsayhuamán, the plaza and the Spanish sorties), so what
  // the player sees is what the siege will throw at them. It does not tell the outcome: the withdrawal to
  // Ollantaytambo is an Act III card, and the epilogue closes it.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Cusco · 1536',
      title: 'La rebelión',
      text: 'Manco Inca se alza contra los Pizarro y reúne un gran ejército. Los españoles quedan encerrados en la plaza; los combates se extienden a Sacsayhuamán.',
      seconds: 10,
      source: 'docs/historia/campanas/cusco_1536.md',
      image: 'media/cusco-1536/cine-ciudad.webp',
      motion: 'push',
    },
    {
      kicker: 'Sacsayhuamán · mayo–junio',
      title: 'La fortaleza',
      text: 'La lucha por Sacsayhuamán decide el cerco. Los incas ocupan la fortaleza y los españoles salen de la plaza para recuperarla; Juan Pizarro es herido de muerte en el asalto y muere días después.',
      seconds: 12,
      source: 'docs/historia/campanas/cusco_1536.md',
      map: {
        // From Manco's camp to the eastern outskirts the sortie enters from (x 206).
        view: { x: 60, z: 52, size: 160 },
        marks: [
          { x: CUSCO_SITE_POINT.x, z: CUSCO_SITE_POINT.z + 10, label: 'Cusco', side: 'place' },
          { x: CUSCO_SITE_SACSAY.x, z: CUSCO_SITE_SACSAY.z - 9, label: 'Sacsayhuamán', side: 'place' },
          { x: CUSCO_1536_CAMP.x + 4, z: CUSCO_1536_CAMP.z - 8, label: 'Campamento inca', side: 'place' },
          { x: CUSCO_1536_CAMP.x - 2, z: CUSCO_1536_CAMP.z + 8, label: 'Manco Inca', side: 'player', delay: 0.6 },
          { x: CUSCO_SITE_POINT.x + 6, z: CUSCO_SITE_POINT.z - 6, label: 'Pizarros', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Ejército de Manco',
            points: [
              { x: CUSCO_1536_CAMP.x, z: CUSCO_1536_CAMP.z },
              { x: CUSCO_SITE_SACSAY.x - 8, z: CUSCO_SITE_SACSAY.z - 6 },
            ],
            delay: 1.6,
          },
          {
            side: 'enemy',
            label: 'Salidas',
            points: [
              { x: CUSCO_SITE_POINT.x, z: CUSCO_SITE_POINT.z },
              { x: CUSCO_SITE_SACSAY.x + 4, z: CUSCO_SITE_SACSAY.z + 6 },
            ],
            delay: 4,
          },
          {
            side: 'enemy',
            dashed: true,
            points: [
              { x: CUSCO_1536_SORTIE.dx, z: CUSCO_1536_SORTIE.dz },
              { x: CUSCO_SITE_POINT.x + 8, z: CUSCO_SITE_POINT.z },
            ],
            delay: 5.6,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Toma la fortaleza',
      text: 'Manco Inca manda el ejército desde su campamento. Ocupa Sacsayhuamán y resiste las salidas de la plaza; luego el cerco se cierra sobre la ciudad. Si Manco cae, la rebelión pierde a su jefe.',
      seconds: 12,
      source: 'docs/historia/campanas/cusco_1536.md',
      image: 'media/cusco-1536/cine-fortaleza.webp',
      motion: 'pan-left',
    },
  ],
  allowedUnits: [UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.INCA_WARRIOR, UnitKind.INCA_SLINGER, UnitKind.SCOUT],
  allowedBuildings: [
    BuildingKind.CENTER,
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.REFINERY,
    BuildingKind.BARRACKS,
    BuildingKind.ARSENAL,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.INSTITUTE,
  ],
  // The Inca state keeps its own record-keeping and textile techs; no Spanish cavalry, siege or doctrine.
  allowedTechs: ['irrigation_canal', 'andean_loom', 'quipus_watchers'],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Pucará',
    [BuildingKind.ARSENAL]: 'Casa de armas',
  },
  unitNames: { [UnitKind.SOLDIER]: 'Milicia inca' },
  objectives: [
    {
      id: 'a1_sacsay',
      kind: 'hold',
      pos: { dx: CUSCO_SITE_SACSAY.x, dz: CUSCO_SITE_SACSAY.z },
      radius: 18,
      time: 45,
      minUnits: 6,
      title: 'Ocupa Sacsayhuamán durante 45 segundos',
    },
    {
      id: 'a2_cerco',
      kind: 'hold',
      pos: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
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
      // The retreat is Manco's own: any scout reaching the road used to end the mission for him.
      entityTag: 'manco_inca',
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
      id: 't_probe',
      // Act I had no enemy at all until the hold ended: the probe is timed to reach the fortress inside
      // the 45 s hold (the column needs ~20 s from the plaza).
      condition: { type: 'time', seconds: 50 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 2 }],
          spawn: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
          pos: { dx: CUSCO_SITE_SACSAY.x, dz: CUSCO_SITE_SACSAY.z },
          target: { dx: CUSCO_SITE_SACSAY.x, dz: CUSCO_SITE_SACSAY.z },
          radius: 10,
          // The small probe is not a general wave: keep the generic "¡Oleada enemiga!" toast out of it.
          objective: 'position',
        },
        { type: 'dialogue', text: '—Una salida española tantea Sacsayhuamán. Son pocos: que sirvan de aviso.' },
      ],
    },
    {
      id: 't_counter',
      // `activate` is true for a pending goal too, so this fired in the first second. Wait until Sacsayhuamán
      // is actually taken and the counterattack has something to answer.
      condition: { type: 'objective', objectiveId: 'a1_sacsay', state: 'completed' },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 3 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          pos: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
          radius: 12,
          target: { dx: CUSCO_SITE_SACSAY.x, dz: CUSCO_SITE_SACSAY.z },
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
        {
          // Act II was a food-drain timer with no enemy: the plaza sorties against the closing ring.
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 2 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          spawn: CUSCO_1536_SORTIE,
          pos: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
          target: { dx: CUSCO_SITE_POINT.x, dz: CUSCO_SITE_POINT.z },
          radius: 4,
          // A sally, not a general wave: suppress the generic wave toast and announce it as a sortie.
          objective: 'position',
        },
        { type: 'dialogue', text: '—La plaza intenta romper el cerco. ¡Sostened la línea!' },
      ],
    },
    {
      // The optional supply raid pays in food and silver: an optional goal without a reward was dead weight.
      id: 't_suministros',
      condition: { type: 'objective', objectiveId: 'a2_suministros', state: 'completed' },
      effects: [
        { type: 'resources', player: 0, amount: { food: 200, silver: 100 } },
        {
          type: 'dialogue',
          text: 'Los almacenes de la ciudad quedan abiertos: comida y plata para sostener el cerco.',
        },
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
