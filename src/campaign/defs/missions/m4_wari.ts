import { Era, CivId, HistoricalPeriod, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

const WARI_NODE_A = { ref: 'site' as const, dx: 40, dz: -32 };
const WARI_NODE_B = { ref: 'site' as const, dx: 38, dz: 34 };
const WARI_BONUS_NODE = { ref: 'site' as const, dx: -40, dz: 0 };

export const m4Wari: MissionDef = {
  id: 'm4_wari',
  title: 'El Horizonte Medio',
  subtitle: 'Horizonte Medio · c. 600–1000 d.C.',
  history:
    'Wari, desde Ayacucho, construye el primer imperio andino: ciudades planificadas, caminos y una religión estatal. Al sur, Tiahuanaco domina el altiplano.\n' +
    'No hay una guerra única documentada: tu arma es la red de centros y caminos. Extiéndela y asegura los andenes frente a la influencia rival.',
  victory: 'Wari consolida su esfera de influencia. El Horizonte Medio unifica buena parte de los Andes centrales.',
  defeat: 'La expansión wari se detiene y sus centros provinciales se pierden.',
  period: HistoricalPeriod.MIDDLE_HORIZON,
  tutorial: true,
  playerCiv: CivId.WARI,
  enemyCiv: CivId.TIAHUANACO,
  map: { seed: 800, type: 'andes', size: 192 },
  layout: {
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
      { from: { ref: 'player', dx: 0, dz: 0 }, to: { ref: 'site', dx: 0, dz: 14 }, width: 2.5 },
      { from: { ref: 'site', dx: 0, dz: 14 }, to: WARI_NODE_A, width: 2.5 },
      { from: { ref: 'site', dx: 0, dz: 14 }, to: WARI_NODE_B, width: 2.5 },
      { from: WARI_NODE_A, to: WARI_NODE_B, width: 2 },
    ],
  },
  mapOverrides: {
    terrain: { terraceChance: 0.6, riverCount: 0 },
    climate: { aridity: 0.12, moisture: 0.55, temperature: 0.25 },
    vegetation: { density: 0.5 },
    resources: { tree: 0.55, mine: 0.7, well: 0.5, hunt: 0.35 },
    culturalLandscape: null,
    groundTint: '#a99b78',
  },
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
      radius: 16,
      title: 'Conecta dos centros provinciales en la frontera',
    },
    {
      id: 'obj_frontera',
      kind: 'hold',
      pos: WARI_NODE_A,
      radius: 14,
      time: 60,
      hidden: true,
      requires: 'obj_red',
      title: 'Ocupa el centro fronterizo frente a la esfera de Tiahuanaco',
    },
    {
      id: 'obj_sostener',
      kind: 'survive',
      time: 480,
      title: 'Sostén la esfera wari 8 minutos',
    },
    {
      id: 'bonus_red',
      kind: 'build',
      buildingKind: BuildingKind.MARKET,
      count: 1,
      pos: WARI_BONUS_NODE,
      radius: 16,
      optional: true,
      title: 'Amplía la red con un tercer centro',
    },
  ],
  triggers: [
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
      id: 't_red',
      condition: { type: 'objective', objectiveId: 'obj_red', state: 'completed' },
      effects: [
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
          text: 'En el altiplano, Tiahuanaco difunde el mismo culto del dios de los báculos: dos estados coetáneos que compiten por influencia, no por ejércitos.',
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
