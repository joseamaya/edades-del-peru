import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { MOCHE_MAP_SIZE, mocheLength } from '../../../model/defs/mocheSite';

// Recuay's camp, its label and its terrain pad sit on the same anchor so they cannot drift apart.
const MOCHE_ENEMY_ANCHOR = { x: 0.78, z: 0.28 } as const;
// The plaza the columns must reach: the same point the huacas hold defends.
const MOCHE_PLAZA = { ref: 'site' as const, dx: mocheLength(4), dz: mocheLength(8) };

export const m3MocheRecuay: MissionDef = {
  id: 'm3_moche_recuay',
  title: 'La Frontera de los Valles',
  subtitle: 'Intermedio Temprano · c. 300–800 d.C.',
  history:
    'Los señores de Moche dominan los valles de Chicama, Moche y Virú. Desde la sierra recuay, los Recuay presionan la frontera.\n' +
    'Asegura los valles y sus canales, defiende las huacas y sostén el intercambio de élite con la sierra.',
  victory:
    'Moche impone su dominio sobre la costa norte. Sus huacas y su cerámica marcan el apogeo del Intermedio Temprano.',
  defeat: 'Los valles caen ante las incursiones de la sierra y el poder moche se desmorona.',
  period: HistoricalPeriod.EARLY_INTERMEDIATE,
  tutorial: true,
  modelMission: true,
  narrator: 'Voz de los valles moche',
  intro: [
    {
      kicker: 'VALLE DE MOCHE · c. 300–800 d.C.',
      title: 'La Frontera de los Valles',
      text: 'Los señores de Moche dominan los valles de Chicama, Moche y Virú. El agua de los canales sostiene los campos, las huacas y el poder del valle.',
      seconds: 9,
      source: 'docs/historia/campanas/moche_recuay.md',
      image: 'media/moche/intro-valle.webp',
    },
    {
      kicker: 'HUACAS DEL SOL Y DE LA LUNA',
      title: 'El centro del valle',
      text: 'Las huacas reúnen la plaza, los templos y el intercambio. Sostener la plaza es sostener el orden del valle frente a la sierra.',
      seconds: 9,
      source: 'docs/historia/campanas/moche_recuay.md',
      image: 'media/moche/intro-huacas.webp',
    },
    {
      kicker: 'CALLEJÓN DE HUAYLAS',
      title: 'La presión recuay',
      text: 'Desde la sierra, los Recuay presionan la frontera. La guerra no es una batalla única: es defender los valles y mantener abierto el intercambio de élite.',
      seconds: 10,
      source: 'docs/historia/campanas/moche_recuay.md',
      image: 'media/moche/intro-sierra.webp',
    },
  ],
  epilogueImage: 'media/moche/intro-epilogo.webp',
  playerCiv: CivId.MOCHE,
  enemyCiv: CivId.RECUAY,
  region: 'north_coast',
  map: { seed: 400, type: 'coast', size: MOCHE_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  layout: {
    labels: [
      { text: 'Valle de Moche', x: 0.3, z: 0.66, kind: 'settlement' },
      { text: 'Huacas del Sol y de la Luna', x: 0.62, z: 0.38, kind: 'region' },
      { text: 'Sierra recuay', x: MOCHE_ENEMY_ANCHOR.x, z: MOCHE_ENEMY_ANCHOR.z, kind: 'region' },
    ],
    base: { x: 0.3, z: 0.66 },
    // Recuay sits in its own sierra, under the authored label; without this the AI camp landed at random
    // and could appear next to the huacas.
    enemyBase: { x: MOCHE_ENEMY_ANCHOR.x, z: MOCHE_ENEMY_ANCHOR.z },
    site: {
      id: 'moche_site',
      y: 6,
      focus: { x: 0.62, z: 0.38 },
      keepout: [{ x: 0.62, z: 0.38, rx: 0.2, rz: 0.17 }],
    },
    canal: {
      name: 'Canal del valle de Moche',
      x: 0.45,
      z: 0.56,
      length: mocheLength(36),
      yaw: 0.08,
      initiallyOpen: false,
      irrigation: true,
      heritageId: 'moche_canal',
    },
    terrain: {
      flats: [
        { name: 'Valles de Moche y Chicama', x: 0.3, z: 0.66, rx: 0.18, rz: 0.14 },
        { name: 'Huacas de Moche', x: 0.62, z: 0.38, rx: 0.2, rz: 0.17 },
        { name: 'Sierra recuay', x: MOCHE_ENEMY_ANCHOR.x, z: MOCHE_ENEMY_ANCHOR.z, rx: 0.1, rz: 0.08 },
      ],
    },
    decor: { model: 'recuay_pashash', at: 'enemy', dx: mocheLength(10), dz: 0, scale: 1.05 },
  },
  mapOverrides: {
    terrain: { terraceChance: 0.08, riverCount: 0 },
    climate: { aridity: 0.78, moisture: 0.24 },
    vegetation: { density: 0.24 },
    resources: { tree: 0.45, mine: 0.8, well: 0.35, hunt: 0.25 },
    culturalLandscape: null,
    groundTint: '#c9a66b',
  },
  atmosphere: { fogDensity: 0.0018, sunWarmth: 1.05, skyTint: '#e2d8c6' },
  timeOfDay: 'dusk',
  startingEra: Era.REGIONAL_STATES,
  startingResources: { food: 700, wood: 600, silver: 300, stone: 200 },
  start: {
    // `UnitKind.MUSKETEER` is the legacy id of the basic ranged slot: in this era it renders as a
    // hondero with a sling, not a firearm.
    units: [
      { kind: UnitKind.SOLDIER, dx: mocheLength(12), dz: mocheLength(4), count: 6 },
      { kind: UnitKind.MUSKETEER, dx: mocheLength(10), dz: mocheLength(10), count: 4 },
      { kind: UnitKind.SCOUT, dx: mocheLength(8), dz: mocheLength(8), count: 1 },
    ],
  },
  mark: [],
  enemy: { active: true, difficulty: 'normal', aggression: 1 },
  buildingNames: { [BuildingKind.INSTITUTE]: 'Casa de los ancestros' },
  objectives: [
    {
      id: 'obj_canal',
      kind: 'canal_open',
      title: 'Abre la compuerta del canal de Moche',
    },
    {
      id: 'obj_huacas',
      kind: 'hold',
      pos: MOCHE_PLAZA,
      radius: mocheLength(18),
      time: 90,
      hidden: true,
      requires: 'obj_canal',
      title: 'Sostén la plaza de las huacas 90 segundos',
    },
    {
      id: 'obj_intercambio',
      kind: 'deliver',
      heritageId: 'moche_huaca_luna',
      pos: { ref: 'site', dx: mocheLength(13.5), dz: -mocheLength(2) },
      resource: 'silver',
      count: 250,
      hidden: true,
      requires: 'obj_huacas',
      title: 'Intercambia 250 de plata en la Huaca de la Luna',
    },
    {
      id: 'bonus_intercambio',
      kind: 'deliver',
      resource: 'silver',
      count: 400,
      optional: true,
      hidden: true,
      requires: 'obj_huacas',
      title: 'Intercambio de élite: completa 400 de plata',
    },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 10 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · El valle',
          title: 'El agua del valle',
          image: 'media/moche/intro-valle.webp',
          text: 'El canal alimenta los campos y las huacas. Ábrelo antes de que la sierra ponga a prueba la frontera.',
        },
        {
          type: 'dialogue',
          text: 'El agua del canal sostiene los campos y las huacas. ¡Nadie entra al valle sin nuestro permiso!',
        },
      ],
    },
    {
      id: 't_canal',
      condition: { type: 'objective', objectiveId: 'obj_canal', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · La frontera',
          title: 'Las huacas',
          image: 'media/moche/intro-huacas.webp',
          text: 'El agua corre. Ahora la plaza entre las huacas debe resistir las incursiones que bajan de la sierra.',
        },
        {
          type: 'dialogue',
          text: 'La compuerta está abierta. Los andenes recuperan agua; ahora asegura la plaza entre las huacas.',
        },
        // The first column answers the opened canal: the old timer shouted «defiende la plaza» while the
        // mission was still about the water.
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 5 }],
          spawn: { ref: 'site', dx: -mocheLength(20), dz: -mocheLength(26) },
          pos: MOCHE_PLAZA,
          radius: mocheLength(6),
        },
        { type: 'dialogue', text: '¡Recuay cruza la quebrada por el norte! Asegura la plaza entre las huacas.' },
        { type: 'objective', objectiveId: 'obj_huacas', state: 'activate' },
      ],
    },
    {
      id: 't_huacas',
      condition: { type: 'objective', objectiveId: 'obj_huacas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · El intercambio',
          title: 'El intercambio con la sierra',
          image: 'media/moche/intro-sierra.webp',
          text: 'La plaza resiste. El intercambio de élite con la sierra se cierra en la Huaca de la Luna: plata y cerámica por prestigio y alianzas.',
        },
        {
          type: 'dialogue',
          text: 'La plaza resiste. El intercambio de élite con la sierra puede continuar en la Huaca de la Luna.',
        },
        { type: 'objective', objectiveId: 'obj_intercambio', state: 'activate' },
        { type: 'objective', objectiveId: 'bonus_intercambio', state: 'activate' },
        // The escalation arrives with the act that opens it, not on a clock the player cannot influence.
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          spawn: { ref: 'site', dx: mocheLength(22), dz: -mocheLength(24) },
          pos: MOCHE_PLAZA,
          radius: mocheLength(6),
        },
        { type: 'dialogue', text: 'Otra columna baja desde la sierra recuay. ¡Refuerza el flanco este!' },
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 6 }],
          spawn: { ref: 'site', dx: 0, dz: -mocheLength(30) },
          pos: MOCHE_PLAZA,
          radius: mocheLength(6),
        },
      ],
    },
    {
      id: 't_declive',
      condition: { type: 'time', seconds: 480 },
      effects: [
        {
          type: 'dialogue',
          text: 'Hacia el 800 d.C. el poder moche se fragmenta. Sus valles y huacas quedan como memoria de un Intermedio Temprano excepcional.',
        },
      ],
    },
  ],
};
