import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { CHANCA_MAP_SIZE, chancaLength } from '../../../model/defs/chancaSite';

// Where the Chanca columns converge: the camp's edge, not the blocked centre of its buildings.
const CHANCA_CAMP_STAND = { ref: 'player' as const, dx: chancaLength(6), dz: chancaLength(4) };
/** The Chanca camp at Cusco (normalized); its centre is tagged `centro_chanca`. */
const CHANCA_CITY = { x: 0.7725, z: 0.38 } as const;
/** Cusco and the player's base, the pampa between the armies and the Chanca heights (normalized). */
const CHANCA_CUSCO = { x: 0.36, z: 0.62 } as const;
const CHANCA_PAMPA = { x: 0.5, z: 0.5 } as const;
const CHANCA_HEIGHTS = { x: 0.7025, z: 0.38 } as const;
// The two columns' entries: the first «por el norte», the second from the east, both off the player's base.
const CHANCA_WAVE_NORTH = { ref: 'player' as const, dx: chancaLength(34), dz: -chancaLength(20) };
const CHANCA_WAVE_EAST = { ref: 'player' as const, dx: chancaLength(40), dz: chancaLength(4) };

/** A normalized layout point, or an offset from the player's base, in world metres for the cinema map. */
const world = (p: { x: number; z: number }) => ({ x: p.x * CHANCA_MAP_SIZE, z: p.z * CHANCA_MAP_SIZE });
const fromCusco = (p: { dx: number; dz: number }) => ({
  x: CHANCA_CUSCO.x * CHANCA_MAP_SIZE + p.dx,
  z: CHANCA_CUSCO.z * CHANCA_MAP_SIZE + p.dz,
});

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
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The columns
  // on the map enter where the mission's waves spawn and march on the stand they target. The intro states the
  // siege, not its outcome: the counterattack and Pachacútec belong to the act cards and the epilogue.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Cusco · 1438',
      title: 'La amenaza chanca',
      text: 'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.',
      seconds: 10,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      image: 'media/chanca/cine-cusco.webp',
      motion: 'push',
    },
    {
      kicker: 'Yahuar Pampa',
      title: 'La pampa de sangre',
      text: 'Desde su campamento en las alturas, las columnas chancas cruzan la pampa hacia el Cusco: primero por el norte, luego por el este. Cusi resiste con los cusqueños y sus aliados; de esta defensa nace la tradición de los pururaucas.',
      seconds: 14,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      map: {
        // From the Cusco pucarás to the Chanca camp on the heights.
        view: { x: 66, z: 56, size: 156 },
        marks: [
          { ...world(CHANCA_CUSCO), label: 'Cusco', side: 'place' },
          { ...world(CHANCA_PAMPA), label: 'Pampa de Yahuar', side: 'place' },
          { ...world(CHANCA_HEIGHTS), label: 'Alturas chancas', side: 'place' },
          {
            ...fromCusco({ dx: -chancaLength(8), dz: chancaLength(8) }),
            label: 'Cusi Yupanqui',
            side: 'player',
            delay: 0.6,
          },
          { ...world(CHANCA_CITY), label: 'Anccu Hualloc', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'enemy',
            label: '1.ª columna',
            points: [fromCusco(CHANCA_WAVE_NORTH), fromCusco(CHANCA_CAMP_STAND)],
            delay: 1.8,
          },
          {
            side: 'enemy',
            label: '2.ª columna',
            points: [fromCusco(CHANCA_WAVE_EAST), fromCusco(CHANCA_CAMP_STAND)],
            delay: 4.4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Defiende el Cusco',
      text: 'Cusi Yupanqui manda la defensa desde los pucarás. Sostén el Cusco ocho minutos frente a las columnas chancas y mantén con vida al príncipe: sin él, la defensa se deshace.',
      seconds: 11,
      source: 'docs/historia/campanas/yahuar_pampa.md',
      image: 'media/chanca/cine-defensa.webp',
      motion: 'pan-right',
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
      { text: 'Cusco', x: CHANCA_CUSCO.x, z: CHANCA_CUSCO.z, kind: 'settlement' },
      { text: 'Pampa de Yahuar', x: CHANCA_PAMPA.x, z: CHANCA_PAMPA.z, kind: 'region' },
      { text: 'Camino a Andahuaylas', x: CHANCA_CITY.x, z: CHANCA_CITY.z, kind: 'region' },
    ],
    base: { x: CHANCA_CUSCO.x, z: CHANCA_CUSCO.z },
    enemyBase: { x: CHANCA_CITY.x, z: CHANCA_CITY.z },
    site: {
      id: 'chanca_site',
      y: 5,
      focus: { x: CHANCA_HEIGHTS.x, z: CHANCA_HEIGHTS.z },
      keepout: [{ x: CHANCA_HEIGHTS.x, z: CHANCA_HEIGHTS.z, rx: 0.1, rz: 0.09 }],
      buildKeepout: [{ x: CHANCA_HEIGHTS.x, z: CHANCA_HEIGHTS.z, rx: 0.085, rz: 0.075 }],
    },
    terrain: {
      flats: [
        { name: 'Pampa de Yahuar', x: CHANCA_CUSCO.x, z: CHANCA_CUSCO.z, rx: 0.15, rz: 0.12 },
        { name: 'Alturas del Cusco', x: CHANCA_HEIGHTS.x, z: CHANCA_HEIGHTS.z, rx: 0.1, rz: 0.09 },
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
  // A field battle: the garrison opens at the centre and the host keeps the AI's own attacks, which can
  // pull it and the columns toward the player's base after their authored move.
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
      // The Chanca centre is not empty: with no peasant economy the host still garrisons it. The guard
      // opens on the centre, so `obj_kill` is contested while it stands; the AI's own offensive can pull
      // it away later.
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
          // but the AI's strategic offensive can later pull it toward the player's base.
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
          spawn: CHANCA_WAVE_NORTH,
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
          spawn: CHANCA_WAVE_EAST,
          pos: CHANCA_CAMP_STAND,
          target: CHANCA_CAMP_STAND,
          radius: chancaLength(6),
        },
      ],
    },
  ],
};
