import { Era, CivId, HistoricalPeriod, BuildingKind } from '../../../core/types';
import { highValleyVegetation } from '../../../model/defs/profiles';
import type { MissionDef } from '../../types';
import { WARI_MAP_SIZE, wariLength } from '../../../model/defs/wariSite';

const WARI_NODE_A = { ref: 'site' as const, dx: wariLength(40), dz: -wariLength(32) };
const WARI_NODE_B = { ref: 'site' as const, dx: wariLength(38), dz: wariLength(34) };
const WARI_BONUS_NODE = { ref: 'site' as const, dx: -wariLength(40), dz: 0 };

export const m4Wari: MissionDef = {
  id: 'm4_wari',
  title: 'El Horizonte Medio',
  subtitle: 'Horizonte Medio · c. 600–1000 d.C.',
  history:
    'Wari, desde Ayacucho, construye el primer estado expansivo de los Andes: ciudades planificadas, caminos y una religión estatal. Al sur, Tiahuanaco domina el altiplano.\n' +
    'No hay una guerra única documentada: tu arma es la red de centros y caminos. Extiéndela y asegura los andenes frente a la influencia rival.',
  victory: 'Wari consolida su esfera de influencia. El Horizonte Medio unifica buena parte de los Andes centrales.',
  defeat: 'La expansión wari se detiene y sus centros provinciales se pierden.',
  period: HistoricalPeriod.MIDDLE_HORIZON,
  tutorial: true,
  modelMission: true,
  narrator: 'Voz de los Andes',
  intro: [
    {
      kicker: 'AYACUCHO · c. 600–1000 d.C.',
      title: 'El Horizonte Medio',
      text: 'Wari construye el primer estado expansivo de los Andes: ciudades planificadas, caminos y una religión estatal. No hay una guerra única documentada: su arma es la red de centros y andenes.',
      seconds: 9,
      source: 'docs/historia/campanas/wari_tiahuanaco.md',
      image: 'media/wari/intro-ayacucho.webp',
    },
    {
      kicker: 'COMPLEJO WARI',
      title: 'La ciudad y el estado',
      text: 'El templo en D, la plaza y las galerías articulan administración, culto y almacenamiento. Extender la red es extender el estado.',
      seconds: 9,
      source: 'docs/historia/campanas/wari_tiahuanaco.md',
      image: 'media/wari/intro-complejo.webp',
    },
    {
      kicker: 'LA FRONTERA ALTA',
      title: 'Dos estados coetáneos',
      text: 'Tiahuanaco comparte el culto del dios de los báculos y compite por influencia; no hay una guerra única documentada. La frontera se mide en presencia, caminos y andenes.',
      seconds: 10,
      source: 'docs/historia/campanas/wari_tiahuanaco.md',
      image: 'media/wari/intro-frontera.webp',
    },
  ],
  epilogueImage: 'media/wari/intro-epilogo.webp',
  playerCiv: CivId.WARI,
  enemyCiv: CivId.TIAHUANACO,
  region: 'high_andes',
  map: { seed: 800, type: 'andes', size: WARI_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  layout: {
    labels: [
      { text: 'Ayacucho', x: 0.3, z: 0.66, kind: 'settlement' },
      { text: 'Complejo Wari', x: 0.56, z: 0.45, kind: 'settlement' },
      { text: 'Frontera alta', x: 0.72, z: 0.35, kind: 'region' },
    ],
    base: { x: 0.3, z: 0.66 },
    site: {
      id: 'wari_site',
      y: 5.0,
      focus: { x: 0.56, z: 0.45 },
      keepout: [{ x: 0.56, z: 0.45, rx: 0.2, rz: 0.17 }],
    },
    terrain: {
      flats: [
        { name: 'Andenes de Ayacucho', x: 0.3, z: 0.66, rx: 0.16, rz: 0.12 },
        { name: 'Complejo Wari', x: 0.56, z: 0.45, rx: 0.2, rz: 0.17 },
        { name: 'Frontera provincial', x: 0.72, z: 0.35, rx: 0.13, rz: 0.1 },
        { name: 'Terraza provincial wari', x: 0.7, z: 0.58, rx: 0.12, rz: 0.09 },
      ],
    },
    roads: [
      { from: { ref: 'player', dx: 0, dz: 0 }, to: { ref: 'site', dx: 0, dz: wariLength(14) }, width: wariLength(2.5) },
      { from: { ref: 'site', dx: 0, dz: wariLength(14) }, to: WARI_NODE_A, width: wariLength(2.5) },
      { from: { ref: 'site', dx: 0, dz: wariLength(14) }, to: WARI_NODE_B, width: wariLength(2.5) },
      { from: WARI_NODE_A, to: WARI_NODE_B, width: wariLength(2) },
    ],
  },
  mapOverrides: {
    terrain: { terraceChance: 0.6, riverCount: 0 },
    climate: { aridity: 0.12, moisture: 0.55, temperature: 0.25 },
    vegetation: highValleyVegetation(0.5),
    resources: { tree: 0.55, mine: 0.7, well: 0.5, hunt: 0.35 },
    culturalLandscape: null,
    groundTint: '#a99b78',
    vegetationKit: 'andes',
  },
  atmosphere: { fogDensity: 0.001, sunWarmth: 1.0, skyTint: '#c9d2d4' },
  timeOfDay: 'noon',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 350, wood: 300, silver: 100, stone: 40 },
  start: {},
  enemy: { active: false, difficulty: 'easy', aggression: 0 },
  // An administrative network with no enemy on the map: the Wari guardian (the briefing's unique unit)
  // can still be raised, but no arsenal, stable, pucará, walls or towers.
  allowedBuildings: [
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.REFINERY,
    BuildingKind.MARKET,
    BuildingKind.BARRACKS,
  ],
  buildingNames: { [BuildingKind.MARKET]: 'Centro administrativo wari' },
  objectives: [
    {
      id: 'obj_suministros',
      kind: 'gather',
      resource: 'food',
      count: 600,
      title: 'Reúne suministros para la expansión (600 de comida)',
    },
    {
      id: 'obj_andenes',
      kind: 'build',
      buildingKind: BuildingKind.FARM,
      count: 2,
      title: 'Acondiciona dos andenes para la red wari',
    },
    {
      id: 'obj_red',
      kind: 'network',
      buildingKind: BuildingKind.MARKET,
      count: 2,
      nodes: [WARI_NODE_A, WARI_NODE_B],
      radius: wariLength(16),
      hidden: true,
      requires: 'obj_andenes',
      title: 'Conecta dos centros provinciales en la frontera',
    },
    {
      id: 'obj_frontera',
      kind: 'hold',
      pos: WARI_NODE_A,
      radius: wariLength(14),
      time: 60,
      hidden: true,
      requires: 'obj_red',
      title: 'Ocupa el centro fronterizo frente a la esfera de Tiahuanaco',
    },
    {
      id: 'obj_sostener',
      kind: 'survive',
      time: 480,
      optional: true,
      title: 'Sostén la esfera wari 8 minutos (opcional)',
    },
    {
      id: 'bonus_red',
      kind: 'build',
      buildingKind: BuildingKind.MARKET,
      count: 1,
      pos: WARI_BONUS_NODE,
      radius: wariLength(16),
      optional: true,
      title: 'Amplía la red con un tercer centro',
    },
  ],
  triggers: [
    {
      id: 't_acto_i',
      condition: { type: 'time', seconds: 12 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · Los andenes',
          title: 'La despensa y la tierra',
          image: 'media/wari/intro-ayacucho.webp',
          text: 'La despensa está corta. Acondiciona andenes y reúne suministros antes de tender la red.',
        },
      ],
    },
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: 'La despensa está corta, pero nuestros caminos no. Reúne suministros y conecta dos centros provinciales.',
        },
      ],
    },
    {
      id: 't_andenes_listos',
      condition: { type: 'objective', objectiveId: 'obj_andenes', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · La red',
          title: 'Los centros provinciales',
          image: 'media/wari/intro-complejo.webp',
          text: 'Los andenes producen. Levanta un centro administrativo wari en dos nodos de la red para articular la esfera; los caminos ya unen el territorio.',
        },
        { type: 'objective', objectiveId: 'obj_red', state: 'activate' },
      ],
    },
    {
      id: 't_red',
      condition: { type: 'objective', objectiveId: 'obj_red', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La frontera',
          title: 'Dos esferas',
          image: 'media/wari/intro-frontera.webp',
          text: 'Los centros están enlazados. Sostén la frontera frente a la influencia de Tiahuanaco: presencia, caminos y andenes, no una guerra inventada.',
        },
        {
          type: 'dialogue',
          text: 'Los centros provinciales están enlazados. La frontera con Tiahuanaco se mide ahora en presencia y caminos.',
        },
        { type: 'objective', objectiveId: 'obj_frontera', state: 'activate' },
      ],
    },
    {
      id: 't_dial_1',
      condition: { type: 'time', seconds: 200 },
      effects: [
        {
          type: 'dialogue',
          text: 'En el altiplano, Tiahuanaco difunde el mismo culto del dios de los báculos: dos estados coetáneos que compiten por influencia, sin una guerra única documentada.',
        },
      ],
    },
    {
      id: 't_frontera',
      condition: { type: 'objective', objectiveId: 'obj_frontera', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'La frontera sostiene la red. Wari articula andenes, almacenes y centros sin una guerra única documentada.',
        },
      ],
    },
    {
      id: 't_declive',
      condition: { type: 'time', seconds: 500 },
      effects: [
        {
          type: 'dialogue',
          text: 'Hacia 1000–1100 d.C. Wari y Tiahuanaco colapsan. El Horizonte Medio deja paso al Intermedio Tardío.',
        },
      ],
    },
  ],
};
