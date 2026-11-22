import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { CHIMU_MAP_SIZE, chimuLength } from '../../../model/defs/chimuSite';

// The counterattack's entry, on the Paramonga side of the Inca camp.
// East of the Chan Chan canal, on the Paramonga side: the old point straddled the acequia bed.
const CHIMU_COUNTER_ENTRY = { dx: 150, dz: 110 } as const;
// Paramonga is its own coastal point on the advance (world metres): as an offset from the enemy base the
// objective sat inside the Chimú capital.
const CHIMU_PARAMONGA_WORLD = { dx: 150, dz: 80 } as const;

export const m6ChimuInca: MissionDef = {
  id: 'm6_chimu_inca',
  commanders: ['tupac_yupanqui', 'minchancaman'],
  title: 'La Guerra del Norte',
  subtitle: 'Costa norte · c. 1470',
  history:
    'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman.\n' +
    'Al mando del auqui Túpac Yupanqui, avanza por Paramonga y el valle del Santa. Corta el canal que abastece de agua a Chan Chan: sin agua, la ciudad no puede resistir.',
  victory:
    'El canal está cortado y Chan Chan capitula. Minchancaman es llevado al Cusco y el Tahuantinsuyo se extiende por la costa norte.',
  defeat: 'La resistencia chimú detiene al ejército inca y la costa norte permanece libre.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  modelMission: true,
  narrator: 'Túpac Yupanqui',
  intro: [
    {
      kicker: 'COSTA NORTE · c. 1470',
      title: 'La Guerra del Norte',
      text: 'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman, con su capital en Chan Chan.',
      seconds: 9,
      source: 'docs/historia/campanas/chimu_inca.md',
      image: 'media/chimu/intro-costa.webp',
    },
    {
      kicker: 'PARAMONGA',
      title: 'El primer choque',
      text: 'La vanguardia inca choca en Paramonga y recibe refuerzos de los curacas. El camino sigue por Huarmey y el valle del Santa hacia el corazón chimú.',
      seconds: 9,
      source: 'docs/historia/campanas/chimu_inca.md',
      image: 'media/chimu/intro-paramonga.webp',
    },
    {
      kicker: 'EL CANAL DE CHAN CHAN',
      title: 'El agua como poder',
      text: 'Túpac Yupanqui seca el canal que abastece Chan Chan. La ciudad, en el desierto, capitula; Minchancaman es llevado al Cusco.',
      seconds: 10,
      source: 'docs/historia/campanas/chimu_inca.md',
      image: 'media/chimu/intro-canal.webp',
    },
  ],
  epilogueImage: 'media/chimu/intro-epilogo.webp',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.CHIMU,
  map: { seed: 1470, type: 'coast', size: CHIMU_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  region: 'north_coast',
  layout: {
    labels: [
      { text: 'Chan Chan', x: 0.744, z: 0.339, kind: 'settlement' },
      {
        text: 'Paramonga',
        x: CHIMU_PARAMONGA_WORLD.dx / CHIMU_MAP_SIZE,
        z: CHIMU_PARAMONGA_WORLD.dz / CHIMU_MAP_SIZE,
        kind: 'region',
      },
      { text: 'Canal de Chan Chan', x: 0.5, z: 0.5, kind: 'water' },
    ],
    base: { x: 0.35, z: 0.62 },
    enemyBase: { x: 0.814, z: 0.339 },
    site: {
      id: 'chimu_site',
      y: 5,
      focus: { x: 0.744, z: 0.339 },
      keepout: [{ x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 }],
      buildKeepout: [{ x: 0.744, z: 0.339, rx: 0.075, rz: 0.065 }],
    },
    // The gate answers once Paramonga falls: closing it is the mission's own mechanic.
    canal: {
      name: 'Canal de Chan Chan',
      x: 0.5,
      z: 0.5,
      length: chimuLength(28),
      yaw: 0.2,
      initiallyOpen: true,
      heritageId: 'chimu_canal',
      lockedUntilObjective: 'obj_canal',
      lockedHint: 'Primero avanza hasta Paramonga y alcanza el canal de Chan Chan.',
    },
    terrain: {
      flats: [
        { name: 'Canal de Chan Chan', x: 0.5, z: 0.5, rx: 0.14, rz: 0.09 },
        { name: 'Costa de Chan Chan', x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  atmosphere: { fogDensity: 0.0016, sunWarmth: 1.04, skyTint: '#e2d8c6' },
  timeOfDay: 'dusk',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.RIFLEMAN, dx: chimuLength(10), dz: -chimuLength(4), count: 1, tag: 'tupac_yupanqui' },
      { kind: UnitKind.RIFLEMAN, dx: chimuLength(12), dz: -chimuLength(8), count: 1 },
      { kind: UnitKind.MUSKETEER, dx: chimuLength(6), dz: chimuLength(10), count: 2 },
      { kind: UnitKind.RIFLEMAN, dx: chimuLength(4), dz: -chimuLength(6), count: 4 },
    ],
  },
  mark: [{ tag: 'chan_chan', kind: BuildingKind.CENTER, owner: 1 }],
  // Chan Chan keeps its centre and houses (a capital, not a camp), but it does not play the skirmish
  // economy: its defence is the authored counterattack from Paramonga.
  enemy: { active: true, difficulty: 'hard', aggression: 1.2, economy: false, attacks: false },
  buildingNames: { [BuildingKind.FORTRESS]: 'Pucará' },
  objectives: [
    {
      id: 'obj_avanzar',
      kind: 'reach',
      entityTag: 'tupac_yupanqui',
      pos: CHIMU_PARAMONGA_WORLD,
      radius: chimuLength(8),
      title: 'Avanza hasta Paramonga',
    },
    {
      id: 'obj_canal',
      kind: 'canal_closed',
      // The straight canal's gate sits at one end (18.67 m from its centre): the crew may close it from there.
      pos: { ref: 'canal', dx: 0, dz: 0 },
      radius: chimuLength(16),
      hidden: true,
      title: 'Corta el agua de Chan Chan: cierra la compuerta',
    },
    {
      id: 'obj_comandante',
      kind: 'protect',
      entityTag: 'tupac_yupanqui',
      title: 'Mantén con vida a Túpac Yupanqui',
    },
    {
      id: 'obj_rendicion',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: chimuLength(18),
      time: 30,
      minUnits: 4,
      hidden: true,
      requires: 'obj_canal',
      title: 'Recibe la capitulación de Chan Chan',
    },
    {
      id: 'obj_kill',
      kind: 'destroy',
      entityTag: 'chan_chan',
      optional: true,
      title: 'Toma Chan Chan si resiste',
    },
    { id: 'obj_hold', kind: 'survive', time: 600, optional: true, title: 'Mantén el campamento 10 minutos' },
  ],
  triggers: [
    {
      // A token watch stands in the city, ~31 m from the surrender anchor: the capital is not empty, and
      // the optional "take Chan Chan if it resists" is a fight without breaking the 24 m surrender circle.
      id: 't_guarnicion',
      condition: { type: 'time', seconds: 0.5 },
      effects: [
        {
          type: 'reinforce',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 2 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { ref: 'site', dx: chimuLength(22), dz: chimuLength(8) },
          radius: chimuLength(2),
          objective: 'position',
        },
      ],
    },
    {
      id: 't_acto_i',
      condition: { type: 'time', seconds: 12 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · Paramonga',
          title: 'La avanzada del norte',
          image: 'media/chimu/intro-paramonga.webp',
          text: 'Minchancaman no se someterá. Avanza por los valles hasta Paramonga; el camino a Chan Chan empieza en la costa.',
        },
      ],
    },
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanza por los valles y córtale el agua a Chan Chan.',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 60 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 260 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 6 },
            { kind: UnitKind.MUSKETEER, count: 3 },
          ],
          spawn: CHIMU_COUNTER_ENTRY,
          pos: { ref: 'player', dx: 0, dz: 0 },
          radius: chimuLength(7),
        },
        { type: 'dialogue', text: '¡Querrotumi contraataca desde Paramonga!' },
      ],
    },
    {
      id: 't_paramonga',
      condition: {
        type: 'unit_near',
        entityTag: 'tupac_yupanqui',
        pos: CHIMU_PARAMONGA_WORLD,
        radius: chimuLength(8),
      },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · El canal',
          title: 'El agua de Chan Chan',
          image: 'media/chimu/intro-canal.webp',
          text: 'Paramonga ha caído. El canal de Chan Chan está adelante: cierra su compuerta y la ciudad se quedará sin agua.',
        },
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —¡Paramonga ha caído! El canal de Chan Chan está adelante: cierra su compuerta y la ciudad se quedará sin agua.',
        },
        { type: 'objective', objectiveId: 'obj_canal', state: 'activate' },
      ],
    },
    {
      id: 't_canal',
      condition: { type: 'objective', objectiveId: 'obj_canal', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La capitulación',
          title: 'Chan Chan se rinde',
          image: 'media/chimu/intro-rendicion.webp',
          text: 'El canal está cortado. Marcha a Chan Chan y recibe la capitulación de Minchancaman; la ciudad no resiste sin agua.',
        },
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —El canal está cortado. Chan Chan, sin agua, no puede resistir. ¡A la ciudad!',
        },
        { type: 'objective', objectiveId: 'obj_rendicion', state: 'activate' },
      ],
    },
    {
      id: 't_rendicion',
      condition: { type: 'objective', objectiveId: 'obj_rendicion', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Minchancaman capitula. Chan Chan se rinde y el norte queda integrado al Tahuantinsuyo.',
        },
      ],
    },
  ],
};
