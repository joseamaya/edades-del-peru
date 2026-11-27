import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { highValleyVegetation } from '../../../model/defs/profiles';
import { MANTARO_HEIGHTFIELD } from '../../../model/defs/mantaroHeightmap';
import type { MissionDef } from '../../types';

// La Breña: the Mantaro communities, the ambush passes and the road to Huamachuco/Ayacucho.
const BRENA_CAMP = { x: 0.35, z: 0.63 } as const;
const BRENA_ENEMY = { x: 0.772, z: 0.37 } as const;
const BRENA_COMMUNITY_1 = { x: 0.28, z: 0.46 } as const;
const BRENA_COMMUNITY_2 = { x: 0.46, z: 0.54 } as const;
const BRENA_COMMUNITY_3 = { x: 0.58, z: 0.42 } as const;
const BRENA_PASS = { x: 0.6, z: 0.55 } as const;
// Huamachuco is the town the battle is named after, 44 m west of the Chilean camp: at 0.702 the two
// overlapped and the hold contained the enemy base.
const BRENA_HUAMACHUCO = { x: 0.6, z: 0.37 } as const;
const BRENA_RETREAT = { x: 0.28, z: 0.78 } as const;
const BRENA_CONCEPCION = { x: 0.62, z: 0.5 } as const;
/** An anchor (0..1) as a world point on the 256 m map. */
const brenaWorld = (a: { x: number; z: number }) => ({ x: a.x * 256, z: a.z * 256 });

export const mBrena: MissionDef = {
  id: 'm_brena',
  commanders: ['caceres'],
  title: 'El brujo de los Andes',
  subtitle: 'Sierra central · 1882–1883',
  history:
    'Tras la caída de Lima, Andrés A. Cáceres organiza la resistencia en la sierra central. La campaña de la Breña combina guerrillas, comunidades campesinas, emboscadas y galgas contra las columnas chilenas.\n' +
    'La resistencia culmina en Huamachuco (10 de julio de 1883): la munición se agota y la batalla se pierde, pero Cáceres escapa a Ayacucho. El Tratado de Ancón cierra la guerra ese mismo año.',
  victory:
    'Cáceres y parte de la fuerza escapan de Huamachuco. La campaña no gana la guerra, pero sostiene la resistencia hasta el Tratado de Ancón y deja una memoria de guerrilla campesina. La represión y los fusilamientos de Huamachuco se recuerdan sin convertirlos en espectáculo.',
  defeat:
    'La red de comunidades se deshace y Cáceres cae antes de la retirada. La resistencia de la Breña termina sin jefe y sin capacidad de prolongar la guerra.',
  outcome: 'retirada',
  period: HistoricalPeriod.REPUBLIC,
  periodNote: 'Campaña de la Breña · 1882–1883',
  narrator: 'Campaña de la Breña',
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  playerName: 'Ejército de la Breña',
  enemyName: 'Ejército de Chile',
  region: 'high_andes',
  map: { seed: 1883, type: 'andes', size: 256 },
  layout: {
    labels: [
      { text: 'Valle del Mantaro', x: BRENA_CAMP.x, z: BRENA_CAMP.z, kind: 'region' },
      { text: 'Pucará', x: BRENA_COMMUNITY_2.x, z: BRENA_COMMUNITY_2.z, kind: 'region' },
      { text: 'Marcavalle', x: BRENA_COMMUNITY_3.x, z: BRENA_COMMUNITY_3.z, kind: 'region' },
      { text: 'Concepción', x: BRENA_CONCEPCION.x, z: BRENA_CONCEPCION.z, kind: 'region' },
      { text: 'Huamachuco', x: BRENA_HUAMACHUCO.x, z: BRENA_HUAMACHUCO.z, kind: 'region' },
      { text: 'Camino a Ayacucho', x: BRENA_RETREAT.x, z: BRENA_RETREAT.z, kind: 'region' },
    ],
    base: BRENA_CAMP,
    opening: { x: 0.42, z: 0.58 },
    enemyBase: BRENA_ENEMY,
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Valle del Mantaro', x: BRENA_CAMP.x, z: BRENA_CAMP.z, rx: 0.16, rz: 0.12 },
        { name: 'Paso de Marcavalle', x: BRENA_COMMUNITY_3.x, z: BRENA_COMMUNITY_3.z, rx: 0.12, rz: 0.1 },
        { name: 'Huamachuco', x: BRENA_HUAMACHUCO.x, z: BRENA_HUAMACHUCO.z, rx: 0.12, rz: 0.1 },
      ],
    },
    site: {
      id: 'brena_site',
      y: 5,
      heightField: MANTARO_HEIGHTFIELD,
      focus: BRENA_HUAMACHUCO,
      keepout: [{ x: BRENA_HUAMACHUCO.x, z: BRENA_HUAMACHUCO.z, rx: 0.075, rz: 0.075 }],
      buildKeepout: [{ x: BRENA_HUAMACHUCO.x, z: BRENA_HUAMACHUCO.z, rx: 0.065, rz: 0.065 }],
    },
    roads: [
      {
        from: { dx: BRENA_CAMP.x * 256, dz: BRENA_CAMP.z * 256 },
        to: { dx: BRENA_COMMUNITY_2.x * 256, dz: BRENA_COMMUNITY_2.z * 256 },
        width: 3,
      },
      {
        from: { dx: BRENA_COMMUNITY_2.x * 256, dz: BRENA_COMMUNITY_2.z * 256 },
        to: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 },
        width: 3,
      },
      {
        from: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 },
        to: { dx: BRENA_HUAMACHUCO.x * 256, dz: BRENA_HUAMACHUCO.z * 256 },
        width: 3,
      },
      {
        from: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 },
        to: { dx: BRENA_RETREAT.x * 256, dz: BRENA_RETREAT.z * 256 },
        width: 3,
      },
    ],
  },
  mapOverrides: {
    vegetationKit: 'andes',
    vegetation: highValleyVegetation(0.4),
  },
  atmosphere: { fogDensity: 0.001, sunWarmth: 0.98, skyTint: '#c8d1d2' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1400, wood: 900, silver: 1000, stone: 700 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 4 },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 8, dz: 0, count: 8 },
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: 2, count: 4 },
      { kind: UnitKind.CAVALRY, dx: 12, dz: -2, count: 3 },
      { kind: UnitKind.HUSSAR, dx: 14, dz: 0, count: 2 },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 0, count: 1, tag: 'caceres' },
    ],
  },
  // The mission's aggression is wired to the AI now; 1.0 keeps the pre-wiring cadence until a dedicated
  // balance pass (0.8 let the AI grow a larger army before committing and broke the real-order playtest).
  // A counter-guerrilla column, not a town: it keeps its camp, its pressure is the authored columns.
  enemy: { active: true, difficulty: 'normal', aggression: 1.0, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/brena/intro-epilogo.webp',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (the camp, the three community nodes, the pass and the Chilean column's
  // camp and target). It states the mission, not its outcome: the escape toward Ayacucho is not shown.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Sierra central · 1882',
      title: 'La Breña',
      text: 'Tras la caída de Lima, Cáceres organiza la resistencia en el valle del Mantaro. Las comunidades campesinas aportan guerrilleros, alimentos y conocimiento del terreno.',
      seconds: 9,
      source: 'docs/historia/campanas/brena.md',
      image: 'media/brena/cine-mantaro.webp',
      motion: 'push',
    },
    {
      kicker: 'Margen del Mantaro · 1882',
      title: 'Galgas y emboscadas',
      text: 'Galgas en los pasos, columnas móviles y las comunidades del Mantaro desgastan a las fuerzas chilenas. Desde el nordeste, una columna chilena baja hacia el paso.',
      seconds: 10,
      source: 'docs/historia/campanas/brena.md',
      map: {
        // The valley from the camp to the Chilean column's camp in the north-east.
        view: { x: 48, z: 60, size: 168 },
        marks: [
          { x: brenaWorld(BRENA_CAMP).x, z: brenaWorld(BRENA_CAMP).z + 8, label: 'Valle del Mantaro', side: 'place' },
          {
            x: brenaWorld(BRENA_COMMUNITY_2).x,
            z: brenaWorld(BRENA_COMMUNITY_2).z + 7,
            label: 'Pucará',
            side: 'place',
          },
          {
            x: brenaWorld(BRENA_COMMUNITY_3).x - 4,
            z: brenaWorld(BRENA_COMMUNITY_3).z - 7,
            label: 'Marcavalle',
            side: 'place',
          },
          {
            x: brenaWorld(BRENA_HUAMACHUCO).x,
            z: brenaWorld(BRENA_HUAMACHUCO).z - 8,
            label: 'Huamachuco',
            side: 'place',
          },
          {
            x: brenaWorld(BRENA_CAMP).x - 6,
            z: brenaWorld(BRENA_CAMP).z - 6,
            label: 'Cáceres',
            side: 'player',
            delay: 0.6,
          },
          { x: brenaWorld(BRENA_ENEMY).x, z: brenaWorld(BRENA_ENEMY).z, label: 'Chile', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Comunidades',
            dashed: true,
            points: [brenaWorld(BRENA_CAMP), brenaWorld(BRENA_COMMUNITY_1)],
            delay: 1.4,
          },
          {
            side: 'player',
            dashed: true,
            points: [brenaWorld(BRENA_CAMP), brenaWorld(BRENA_COMMUNITY_2), brenaWorld(BRENA_COMMUNITY_3)],
            delay: 1.8,
          },
          {
            side: 'enemy',
            label: 'Columna chilena',
            points: [brenaWorld(BRENA_ENEMY), brenaWorld(BRENA_PASS)],
            delay: 4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'La red de la sierra',
      text: 'Cáceres manda la resistencia. Organiza la red de comunidades, embosca a la columna chilena en el paso y mantén con vida a tu jefe: la campaña seguirá hasta Huamachuco.',
      seconds: 11,
      source: 'docs/historia/campanas/brena.md',
      image: 'media/brena/cine-paso.webp',
      motion: 'pan-left',
    },
  ],
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.REPUBLICA_DEFENSOR,
    UnitKind.SNIPER,
    UnitKind.CAVALRY,
    UnitKind.HUSSAR,
    UnitKind.SCOUT,
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
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  allowedTechs: ['irrigation_canal', 'rifle_drill', 'shock_cavalry', 'hunters', 'republica_puerto'],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Fortín',
    [BuildingKind.BARRACKS]: 'Cuartel',
  },
  // The Breña was fought by the Mantaro communities' guerrillas, not by the Arica garrison. The one
  // captured piece is scripted; there is no artillery workshop in the valley.
  unitNames: { [UnitKind.REPUBLICA_DEFENSOR]: 'Guerrillero de la Breña' },
  objectives: [
    {
      id: 'a1_comunidades',
      kind: 'network',
      buildingKind: BuildingKind.HOUSE,
      count: 3,
      nodes: [
        { dx: BRENA_COMMUNITY_1.x * 256, dz: BRENA_COMMUNITY_1.z * 256 },
        { dx: BRENA_COMMUNITY_2.x * 256, dz: BRENA_COMMUNITY_2.z * 256 },
        { dx: BRENA_COMMUNITY_3.x * 256, dz: BRENA_COMMUNITY_3.z * 256 },
      ],
      radius: 14,
      title: 'Organiza la red de comunidades del Mantaro',
    },
    {
      id: 'a2_galgas',
      kind: 'hold',
      pos: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 },
      radius: 18,
      time: 45,
      minUnits: 5,
      hidden: true,
      requires: 'a1_comunidades',
      title: 'Embosca la columna chilena en el paso',
    },
    {
      id: 'a3_huamachuco',
      kind: 'hold',
      pos: { dx: BRENA_HUAMACHUCO.x * 256, dz: BRENA_HUAMACHUCO.z * 256 },
      radius: 20,
      time: 60,
      minUnits: 6,
      hidden: true,
      requires: 'a2_galgas',
      title: 'Sostén Huamachuco hasta agotar la munición',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      entityTag: 'caceres',
      pos: { dx: BRENA_RETREAT.x * 256, dz: BRENA_RETREAT.z * 256 },
      radius: 16,
      hidden: true,
      requires: 'a3_huamachuco',
      title: 'Retira a Cáceres hacia Ayacucho',
    },
    {
      id: 'a3_caceres',
      kind: 'protect',
      entityTag: 'caceres',
      title: 'Mantén con vida a Andrés A. Cáceres',
    },
  ],
  triggers: [
    // The galgas are a prepared rockfall, not a 45 s wait: the first Chilean unit in the pass takes the hit.
    {
      id: 't_galgas',
      condition: { type: 'enemy_in_area', pos: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 }, radius: 20 },
      effects: [
        { type: 'strike', pos: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 }, radius: 20, damage: 60 },
        { type: 'dialogue', text: 'Las galgas caen sobre la columna chilena en el paso.' },
      ],
    },
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 9,
          text: '—No podemos vencer a un ejército en campo abierto. Seamos el terreno: comunidades, pasos y galgas. Que Chile no pueda dormir en la sierra.',
        },
      ],
    },
    {
      id: 't_comunidades',
      condition: { type: 'objective', objectiveId: 'a1_comunidades', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Las galgas',
          title: 'La emboscada',
          image: 'media/brena/intro-galgas.webp',
          text: 'La red de comunidades está en pie. Las columnas chilenas avanzan por los pasos; la resistencia prepara galgas y emboscadas.',
        },
        { type: 'objective', objectiveId: 'a2_galgas', state: 'activate', announce: true },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.REPUBLICA_DEFENSOR, count: 4 }],
          pos: { dx: BRENA_CAMP.x * 256, dz: BRENA_CAMP.z * 256 },
          radius: 12,
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 8 },
            { kind: UnitKind.CAVALRY, count: 2 },
          ],
          pos: { dx: BRENA_ENEMY.x * 256, dz: BRENA_ENEMY.z * 256 },
          radius: 14,
          target: { dx: BRENA_PASS.x * 256, dz: BRENA_PASS.z * 256 },
        },
      ],
    },
    {
      id: 't_galgas',
      condition: { type: 'objective', objectiveId: 'a2_galgas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Huamachuco',
          title: 'La última batalla',
          image: 'media/brena/intro-huamachuco.webp',
          text: 'La campaña se traslada al norte. En Huamachuco la munición se agota; la resistencia debe sostener el campo el tiempo suficiente para retirar a Cáceres.',
        },
        { type: 'objective', objectiveId: 'a3_huamachuco', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 10 },
            { kind: UnitKind.RIFLEMAN, count: 3 },
          ],
          pos: { dx: BRENA_ENEMY.x * 256, dz: BRENA_ENEMY.z * 256 },
          radius: 14,
          target: { dx: BRENA_HUAMACHUCO.x * 256, dz: BRENA_HUAMACHUCO.z * 256 },
        },
      ],
    },
    {
      id: 't_huamachuco',
      condition: { type: 'objective', objectiveId: 'a3_huamachuco', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 9,
          text: '—La batalla está perdida, pero no la campaña. Replieguémonos a Ayacucho; que la resistencia siga viva.',
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
          speaker: 'Cáceres',
          duration: 9,
          text: '—Hemos salvado al ejército y al jefe. La guerra terminará en una mesa, pero la sierra no se rindió.',
        },
      ],
    },
  ],
};
