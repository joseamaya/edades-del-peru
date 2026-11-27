import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { highValleyVegetation } from '../../../model/defs/profiles';
import type { MissionDef } from '../../types';
import { CUSCO_COLONIAL } from '../../../model/defs/colonialLayout';

// La Junta del Cusco: the Cusco cabildo, the Apacheta pass, Umachiri and the royalist base.
const JUNTA_CUSCO = CUSCO_COLONIAL.center;
// The Junta's base west of the city: the opening army and the cuartel start here.
const JUNTA_BASE = { x: 52, z: 96 } as const;
const JUNTA_APACHETA = { x: 140, z: 168 } as const;
const JUNTA_UMACHIRI = { x: 198, z: 214 } as const;
// The royalist columns enter on the roads and then occupy each point.
// Toward the royalist camp (south-east of both points), not behind the Junta's line.
const JUNTA_APACHETA_ENTRY = { dx: JUNTA_APACHETA.x + 28, dz: JUNTA_APACHETA.z + 24 } as const;
const JUNTA_UMACHIRI_ENTRY = { dx: JUNTA_UMACHIRI.x + 24, dz: JUNTA_UMACHIRI.z + 22 } as const;
const JUNTA_ENEMY = { x: 222, z: 238 } as const;

export const mJuntaCusco: MissionDef = {
  id: 'm_junta_cusco',
  commanders: ['pumacahua', 'melgar', 'ramirez_orozco'],
  title: 'La Junta del Cusco',
  subtitle: 'Cusco–Umachiri · 1814–1815',
  history:
    'En 1814 el Cusco se levanta contra la Real Audiencia: la junta de los hermanos Angulo nombra capitán general a José Angulo y jefe militar a Mateo García Pumacahua, y envía columnas a Puno, La Paz, Huamanga y Arequipa.\n' +
    'La campaña se juega como la Junta la vivió: sostener el Cusco, ganar La Apacheta y resistir en Umachiri el tiempo suficiente para que los líderes no caigan todos. La historia terminó en derrota; el epílogo la cuenta.',
  victory:
    'La resistencia en Umachiri gana el tiempo que la Junta necesita para retirarse del campo. La historia documentada sigue su curso: la rebelión será derrotada, Pumacahua ejecutado en Sicuani y Melgar fusilado.',
  defeat:
    'La Junta se deshace en Umachiri. La represión realista alcanza a sus líderes y el Cusco vuelve al control virreinal.',
  outcome: 'retirada',
  period: HistoricalPeriod.INDEPENDENCE,
  periodNote: 'La misión se sitúa en 1814–1815',
  narrator: 'Junta del Cusco',
  playerCiv: CivId.PATRIOTAS,
  enemyCiv: CivId.REALISTAS,
  playerName: 'Junta del Cusco',
  enemyName: 'Realistas del Alto Perú',
  region: 'high_andes',
  map: { seed: 1814, type: 'andes', size: 256 },
  layout: {
    labels: [
      { text: 'Cusco', x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, kind: 'settlement' },
      { text: 'La Apacheta', x: JUNTA_APACHETA.x / 256, z: JUNTA_APACHETA.z / 256, kind: 'region' },
      { text: 'Umachiri', x: JUNTA_UMACHIRI.x / 256, z: JUNTA_UMACHIRI.z / 256, kind: 'region' },
      { text: 'Río Lalli', x: 178 / 256, z: 200 / 256, kind: 'water' },
      { text: 'Altiplano de Puno', x: 210 / 256, z: 240 / 256, kind: 'region' },
    ],
    base: { x: JUNTA_BASE.x / 256, z: JUNTA_BASE.z / 256 },
    opening: { x: 66 / 256, z: 80 / 256 },
    enemyBase: { x: JUNTA_ENEMY.x / 256, z: JUNTA_ENEMY.z / 256 },
    discoveries: [{ heritageId: 'cusco_cabildo_1814', initial: true }],
    // The Junta's camp at La Apacheta gives the pass a visual anchor and a documented military presence.
    decor: { model: 'patriotas_camp', at: 'player', dx: 72, dz: 70, yaw: 0.6, scale: 0.9 },
    terrain: {
      flats: [
        { name: 'Valle del Cusco', x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.18, rz: 0.16 },
        { name: 'Paso de La Apacheta', x: JUNTA_APACHETA.x / 256, z: JUNTA_APACHETA.z / 256, rx: 0.12, rz: 0.1 },
        { name: 'Llano de Umachiri', x: JUNTA_UMACHIRI.x / 256, z: JUNTA_UMACHIRI.z / 256, rx: 0.16, rz: 0.12 },
      ],
    },
    site: {
      id: 'cusco_junta_site',
      y: 6,
      focus: { x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256 },
      keepout: [{ x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.1, rz: 0.11 }],
      buildKeepout: [{ x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.065, rz: 0.065 }],
    },
    roads: [
      {
        from: { dx: JUNTA_CUSCO.x, dz: JUNTA_CUSCO.z },
        to: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
        width: 3,
      },
      {
        from: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
        to: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
        width: 3,
      },
    ],
  },
  mapOverrides: {
    vegetationKit: 'andes',
    vegetation: highValleyVegetation(0.35),
  },
  atmosphere: { fogDensity: 0.001, sunWarmth: 1.0, skyTint: '#c9d3d5' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 900, wood: 600, silver: 800, stone: 400 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 5 },
      { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 14 },
      { kind: UnitKind.MUSKETEER, dx: 10, dz: 2, count: 3 },
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: -2, count: 2 },
      { kind: UnitKind.PATRIOTA_MONTONERA, dx: 14, dz: 0, count: 3 },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1, tag: 'artilleria_junta' },
      { kind: UnitKind.CAVALRY, dx: 6, dz: 0, count: 1, tag: 'pumacahua' },
      { kind: UnitKind.RIFLEMAN, dx: 7, dz: 0, count: 1, tag: 'melgar' },
    ],
  },
  mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
  // The royalist division is a scripted force: it keeps its centre and houses but no peasant economy,
  // and its offensive is the Apacheta/Umachiri waves.
  enemy: { active: true, difficulty: 'normal', aggression: 0.6, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (the base, the Cabildo, the Apacheta and Umachiri holds and the royalist
  // entry points), so it shows the road the player will march. It does not tell the outcome: the act cards
  // and the epilogue do.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Cusco · 3 de agosto de 1814',
      title: 'La Junta',
      text: 'El cabildo constitucional de Cádiz y la Real Audiencia chocan en el Cusco. Los hermanos Angulo toman el gobierno y nombran capitán general a José Angulo; Mateo García Pumacahua, cacique de Chinchero, dirige la fuerza militar.',
      seconds: 13,
      source: 'docs/historia/campanas/junta_cusco.md',
      image: 'media/junta/cine-cusco.webp',
      motion: 'push',
    },
    {
      kicker: 'Expediciones · 1814–1815',
      title: 'Cuatro columnas',
      text: 'La Junta envía columnas a Puno, La Paz, Huamanga y Arequipa. Desde el Alto Perú baja la división de Ramírez: tropa veterana, con artillería y caballería, frente a miles de hombres mal armados.',
      seconds: 12,
      source: 'docs/historia/campanas/junta_cusco.md',
      map: {
        // From the Junta's base in the north-west to the royalist camp in the south-east corner (z 238).
        view: { x: 36, z: 44, size: 200 },
        marks: [
          { x: JUNTA_CUSCO.x, z: JUNTA_CUSCO.z - 8, label: 'Cusco', side: 'place' },
          { x: JUNTA_APACHETA.x - 6, z: JUNTA_APACHETA.z - 8, label: 'La Apacheta', side: 'place' },
          { x: JUNTA_UMACHIRI.x - 10, z: JUNTA_UMACHIRI.z - 6, label: 'Umachiri', side: 'place' },
          { x: JUNTA_BASE.x, z: JUNTA_BASE.z + 8, label: 'Junta', side: 'player', delay: 0.6 },
          { x: JUNTA_ENEMY.x - 8, z: JUNTA_ENEMY.z - 2, label: 'Ramírez', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Pumacahua',
            points: [
              { x: JUNTA_CUSCO.x, z: JUNTA_CUSCO.z },
              { x: JUNTA_APACHETA.x, z: JUNTA_APACHETA.z },
              { x: JUNTA_UMACHIRI.x, z: JUNTA_UMACHIRI.z },
            ],
            delay: 1.4,
            draw: 3.2,
          },
          {
            side: 'enemy',
            label: 'Vanguardia',
            points: [
              { x: JUNTA_APACHETA_ENTRY.dx, z: JUNTA_APACHETA_ENTRY.dz },
              { x: JUNTA_APACHETA.x + 4, z: JUNTA_APACHETA.z + 4 },
            ],
            delay: 4.6,
          },
          {
            side: 'enemy',
            label: 'División de Ramírez',
            points: [
              { x: JUNTA_UMACHIRI_ENTRY.dx, z: JUNTA_UMACHIRI_ENTRY.dz },
              { x: JUNTA_UMACHIRI.x + 4, z: JUNTA_UMACHIRI.z + 4 },
            ],
            delay: 6.4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Reúne la Junta',
      text: 'Reúne la Junta en el Cabildo y levanta el cuartel. Pumacahua manda la columna: con pocos fusiles, cada hombre cuenta, y si él cae, la Junta se deshace.',
      seconds: 10,
      source: 'docs/historia/campanas/junta_cusco.md',
      image: 'media/junta/cine-apacheta.webp',
      motion: 'pan-right',
    },
  ],
  epilogueImage: 'media/junta/intro-epilogo.webp',
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.MUSKETEER,
    UnitKind.PATRIOTA_MONTONERA,
    UnitKind.CAVALRY,
    UnitKind.HUSSAR,
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
    BuildingKind.SMELTER,
    BuildingKind.REFINERY,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  // The two starting riflemen are the Junta's scarce elite; the trainable line is militia, muskets,
  // montoneras, cavalry and artillery.
  allowedTechs: [
    'irrigation_canal',
    'silver_metallurgy',
    'shock_cavalry',
    'siege_engines',
    'evangelization',
    'patriota_sierra',
  ],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Fortín',
    [BuildingKind.BARRACKS]: 'Cuartel',
  },
  objectives: [
    {
      id: 'a1_cabildo',
      kind: 'inspect',
      heritageIds: ['cusco_cabildo_1814'],
      inspectRadius: 16,
      // The cabildo the colonial kit draws south of the plaza, not the cathedral proxy at the centre.
      pos: { dx: JUNTA_CUSCO.x, dz: JUNTA_CUSCO.z + 18.5 },
      radius: 20,
      title: 'Reúne la Junta en el Cabildo del Cusco',
    },
    {
      id: 'a1_cuartel',
      kind: 'build',
      buildingKind: BuildingKind.BARRACKS,
      count: 1,
      hidden: true,
      title: 'Levanta el cuartel de la Junta',
    },
    {
      id: 'a2_apacheta',
      kind: 'reach',
      pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
      radius: 14,
      hidden: true,
      title: 'Avanza a La Apacheta',
    },
    {
      id: 'a2_batalla',
      kind: 'hold',
      pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
      radius: 18,
      time: 45,
      minUnits: 5,
      hidden: true,
      title: 'Sostén La Apacheta con la columna de Pumacahua',
    },
    {
      id: 'a3_umachiri',
      kind: 'reach',
      pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
      radius: 16,
      hidden: true,
      title: 'Alcanza Umachiri',
    },
    {
      id: 'a3_resistir',
      kind: 'hold',
      pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
      radius: 20,
      time: 90,
      minUnits: 4,
      hidden: true,
      title: 'Resiste en Umachiri el tiempo que la Junta necesita para retirarse',
    },
    {
      id: 'a3_pumacahua',
      kind: 'protect',
      entityTag: 'pumacahua',
      title: 'Mantén con vida a Mateo Pumacahua durante la batalla',
    },
    {
      id: 'a3_melgar',
      kind: 'protect',
      entityTag: 'melgar',
      optional: true,
      hidden: true,
      title: 'Protege a Mariano Melgar',
    },
    {
      id: 'a3_artilleria',
      kind: 'protect',
      entityTag: 'artilleria_junta',
      optional: true,
      hidden: true,
      title: 'Conserva la artillería de la Junta',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pumacahua',
          duration: 9,
          text: '—El Cusco ha hablado. Reunámonos en el Cabildo y levantemos el cuartel: con pocos fusiles, pero con la sierra entera.',
        },
      ],
    },
    {
      id: 't_cabildo',
      condition: { type: 'objective', objectiveId: 'a1_cabildo', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pumacahua',
          duration: 8,
          text: '—La Junta está formada. Organicemos el cuartel y preparemos las columnas antes de que la Audiencia reaccione.',
        },
        { type: 'objective', objectiveId: 'a1_cuartel', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_acto2',
      condition: { type: 'objective', objectiveId: 'a1_cuartel', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · 9–10 de noviembre de 1814',
          title: 'La Apacheta',
          image: 'media/junta/intro-apacheta.webp',
          text: 'La columna de Pumacahua marcha sobre Arequipa. En La Apacheta derrota a la vanguardia de Picoaga; la ciudad se rinde, pero el ejército de Ramírez ya baja del Alto Perú.',
        },
        { type: 'objective', objectiveId: 'a2_apacheta', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_apacheta',
      condition: { type: 'objective', objectiveId: 'a2_apacheta', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pumacahua',
          duration: 8,
          text: '—La Apacheta está a la vista. Sostengan la posición: si la vanguardia realista cruza, la columna se deshace.',
        },
        { type: 'objective', objectiveId: 'a2_batalla', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
          ],
          spawn: JUNTA_APACHETA_ENTRY,
          pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
          radius: 12,
          objective: 'position',
        },
      ],
    },
    {
      id: 't_acto3',
      condition: { type: 'objective', objectiveId: 'a2_batalla', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · 11 de marzo de 1815',
          title: 'Umachiri',
          image: 'media/junta/intro-umachiri.webp',
          text: 'La división de Ramírez, veterana del Alto Perú, alcanza a la Junta en el llano de Umachiri. Los rebeldes son muchos, pero tienen pocos fusiles; la artillería y la caballería realistas deciden el campo.',
        },
        { type: 'objective', objectiveId: 'a3_umachiri', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a3_melgar', state: 'activate' },
        { type: 'objective', objectiveId: 'a3_artilleria', state: 'activate' },
      ],
    },
    {
      id: 't_umachiri',
      condition: { type: 'objective', objectiveId: 'a3_umachiri', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Pumacahua',
          duration: 9,
          text: '—No podemos ganar el campo, pero podemos resistir. Que los líderes salgan con vida; el Cusco necesitará a alguien que recuerde.',
        },
        { type: 'objective', objectiveId: 'a3_resistir', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 7 },
            { kind: UnitKind.RIFLEMAN, count: 3 },
            { kind: UnitKind.REALISTA_DRAGON, count: 2 },
          ],
          spawn: JUNTA_UMACHIRI_ENTRY,
          pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
          radius: 14,
          objective: 'position',
        },
      ],
    },
  ],
};
