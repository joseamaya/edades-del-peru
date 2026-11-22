import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { CHANCA_MAP_SIZE, chancaLength } from '../../../model/defs/chancaSite';

// Where the Chanca columns converge: the camp's edge, not the blocked centre of its buildings.
const CHANCA_CAMP_STAND = { ref: 'player' as const, dx: chancaLength(6), dz: chancaLength(4) };
/** The Chanca camp at Cusco (normalized); its centre is tagged `centro_chanca`. */
const CHANCA_CITY = { x: 0.7725, z: 0.38 } as const;

export const m5YahuarPampa: MissionDef = {
  id: 'm5_yahuar_pampa',
  commanders: ['cusi_yupanqui', 'anccu_hualloc'],
  title: 'Yahuar Pampa',
  subtitle: 'Cusco · 1438',
  history:
    'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
    'Resiste el asedio y repele al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
  victory:
    'Cusi Yupanqui vence en Yahuar Pampa y asume el poder como Pachacútec, el que transforma el mundo. Comienza el imperio.',
  defeat: 'El Cusco cae ante los chancas y el imperio no llega a nacer.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  modelMission: true,
  narrator: 'Cusi Yupanqui',
  intro: [
    {
      kicker: 'CUSCO · 1438',
      title: 'La amenaza chanca',
      text: 'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.',
      seconds: 9,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      image: 'media/chanca/intro-cusco.webp',
    },
    {
      kicker: 'YAHUAR PAMPA',
      title: 'La pampa de sangre',
      text: 'Cusi resiste con los cusqueños y sus aliados. La tradición de los pururaucas convierte la defensa en leyenda; el resultado documentado es la victoria cusqueña.',
      seconds: 9,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      image: 'media/chanca/intro-pampa.webp',
    },
    {
      kicker: 'ANDAHUAYLAS',
      title: 'El camino a Pachacútec',
      text: 'Los chancas se rinden y luego se integran como aliados militares. Cusi Yupanqui asume el poder como Pachacútec e inicia la expansión del Tahuantinsuyo.',
      seconds: 10,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      image: 'media/chanca/intro-andahuaylas.webp',
    },
  ],
  epilogueImage: 'media/chanca/intro-epilogo.webp',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.CHANCA,
  region: 'high_andes',
  map: { seed: 1438, type: 'andes', size: CHANCA_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  layout: {
    labels: [
      { text: 'Cusco', x: 0.36, z: 0.62, kind: 'settlement' },
      { text: 'Pampa de Yahuar', x: 0.5, z: 0.5, kind: 'region' },
      { text: 'Camino a Andahuaylas', x: 0.7725, z: 0.38, kind: 'region' },
    ],
    base: { x: 0.36, z: 0.62 },
    enemyBase: { x: CHANCA_CITY.x, z: CHANCA_CITY.z },
    site: {
      id: 'chanca_site',
      y: 5,
      focus: { x: 0.7025, z: 0.38 },
      keepout: [{ x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 }],
      buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
    },
    terrain: {
      flats: [
        { name: 'Pampa de Yahuar', x: 0.36, z: 0.62, rx: 0.15, rz: 0.12 },
        { name: 'Alturas del Cusco', x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  atmosphere: { fogDensity: 0.0012, sunWarmth: 0.94, skyTint: '#c9cdd2' },
  timeOfDay: 'dusk',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 700, wood: 600, silver: 400, stone: 200 },
  start: {
    enemyOpeningUnits: false,
    buildings: [
      { kind: BuildingKind.FORTRESS, dx: -chancaLength(9), dz: -chancaLength(7) },
      { kind: BuildingKind.FORTRESS, dx: chancaLength(9), dz: -chancaLength(7) },
      { kind: BuildingKind.FORTRESS, dx: -chancaLength(9), dz: chancaLength(7) },
      { kind: BuildingKind.FORTRESS, dx: chancaLength(9), dz: chancaLength(7) },
    ],
    units: [
      { kind: UnitKind.RIFLEMAN, dx: -chancaLength(8), dz: chancaLength(8), tag: 'cusi_yupanqui', count: 1 },
      { kind: UnitKind.SOLDIER, dx: -chancaLength(6), dz: chancaLength(10), count: 6 },
      { kind: UnitKind.MUSKETEER, dx: -chancaLength(10), dz: chancaLength(10), count: 2 },
    ],
  },
  mark: [
    { tag: 'cusco', kind: BuildingKind.CENTER, owner: 0 },
    { tag: 'centro_chanca', kind: BuildingKind.CENTER, owner: 1 },
  ],
  // The Chanca host is a marching army: its camp and a scripted city garrison, no peasant economy.
  // A field battle: the garrison opens at the centre and sallies with the columns, and the real-order
  // playtest relies on that pressure, so the host keeps its own attacks.
  enemy: { active: true, difficulty: 'hard', aggression: 1.3, economy: false },
  buildingNames: { [BuildingKind.FORTRESS]: 'Pucará' },
  objectives: [
    { id: 'obj_defend', kind: 'defend', entityTag: 'cusco', time: 480, title: 'Defiende el Cusco 8 minutos' },
    {
      id: 'obj_kill',
      kind: 'destroy',
      entityTag: 'centro_chanca',
      hidden: true,
      requires: 'obj_defend',
      title: 'Contraataca y destruye el campamento chanca',
    },
    { id: 'obj_cusi', kind: 'protect', entityTag: 'cusi_yupanqui', title: 'Mantén con vida a Cusi Yupanqui' },
    {
      id: 'obj_persecucion',
      kind: 'reach',
      pos: { ref: 'site', dx: chancaLength(30), dz: chancaLength(10) },
      radius: chancaLength(10),
      hidden: true,
      requires: 'obj_kill',
      title: 'Persigue a los chancas hacia Andahuaylas',
    },
  ],
  triggers: [
    {
      // The city is not empty: with no peasant economy the Chanca host still mans Cusco. This garrison
      // holds the centre from the opening, so `obj_kill` is a fight and not a walk-in.
      id: 't_guarnicion',
      condition: { type: 'time', seconds: 0.5 },
      effects: [
        {
          type: 'reinforce',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { dx: CHANCA_CITY.x * CHANCA_MAP_SIZE, dz: CHANCA_CITY.z * CHANCA_MAP_SIZE },
          radius: chancaLength(4),
          // `reinforce` defaults to an attack-move on the player's camp; this garrison opens holding its post,
          // but the field battle's own attacks may later call it out with the columns.
          objective: 'position',
        },
      ],
    },
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 15 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · El asedio',
          title: 'La pampa de sangre',
          image: 'media/chanca/intro-cusco.webp',
          text: 'Los chancas creen que huiremos como los nobles. Defiende el Cusco y sostén la pampa antes de pensar en el contraataque.',
        },
        {
          type: 'dialogue',
          text: 'Los chancas creen que huiremos como los nobles. ¡Aquí se defiende el Cusco!',
        },
      ],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 90 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 6 }],
          // The line says «por el norte»: enter from the north instead of materialising south-east.
          spawn: { ref: 'player', dx: chancaLength(34), dz: -chancaLength(20) },
          pos: CHANCA_CAMP_STAND,
          target: CHANCA_CAMP_STAND,
          radius: chancaLength(6),
        },
        { type: 'dialogue', text: '¡Anccu Hualloc cruza la pampa desde su campamento! ¡A las armas!' },
      ],
    },
    {
      id: 't_defend',
      condition: { type: 'objective', objectiveId: 'obj_defend', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · El contraataque',
          title: 'Las alturas chancas',
          image: 'media/chanca/intro-pampa.webp',
          text: 'La pampa resiste. Es el momento de marchar a las alturas y destruir el campamento chanca.',
        },
        {
          type: 'dialogue',
          text: 'La pampa resiste. ¡Marcha a las alturas y destruye el campamento chanca!',
        },
        { type: 'objective', objectiveId: 'obj_kill', state: 'activate' },
      ],
    },
    {
      id: 't_kill',
      condition: { type: 'objective', objectiveId: 'obj_kill', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Andahuaylas',
          title: 'El camino a Pachacútec',
          image: 'media/chanca/intro-andahuaylas.webp',
          text: 'El campamento ha caído. Persigue a los restos chancas hacia Andahuaylas: la victoria se cierra en el camino, y Cusi Yupanqui asumirá el poder como Pachacútec.',
        },
        { type: 'objective', objectiveId: 'obj_persecucion', state: 'activate' },
      ],
    },
    {
      id: 't_wave_2',
      condition: { type: 'time', seconds: 200 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          spawn: { ref: 'player', dx: chancaLength(40), dz: chancaLength(4) },
          pos: CHANCA_CAMP_STAND,
          target: CHANCA_CAMP_STAND,
          radius: chancaLength(6),
        },
      ],
    },
  ],
};
