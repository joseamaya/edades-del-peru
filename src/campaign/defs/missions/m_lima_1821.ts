import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { LIMA1821_HEIGHTFIELD } from '../../../model/defs/lima1821Heightmap';
import type { MissionDef } from '../../types';
import { LIMA_SITE_ORIGIN } from '../../../model/defs/sites';

// Lima 1821: the patriot camp, the capital, the Callao fortress and the supply roads.
const LIMA_1821_CITY = LIMA_SITE_ORIGIN;
const LIMA_1821_CALLAO = { x: 52, z: 120 } as const;
const LIMA_1821_CAMP = { x: 62, z: 192 } as const;
const LIMA_1821_LURIN = { x: 154, z: 206 } as const;
const LIMA_1821_CARABAYLLO = { x: 96, z: 96 } as const;

export const mLima1821: MissionDef = {
  id: 'm_lima_1821',
  commanders: ['san_martin'],
  title: 'El cerco de Lima',
  subtitle: 'Lima y Callao · 1821',
  history:
    'La Expedición Libertadora desembarca en Paracas en septiembre de 1820. Las montoneras cortan los caminos de Lima, Cochrane bloquea el Callao y el virrey La Serna evacua la capital en julio de 1821.\n' +
    'San Martín entra en Lima y proclama la independencia el 28 de julio. El primer sitio del Callao se extiende hasta septiembre: la guarnición de La Mar capitula, mientras Canterac se acerca desde la sierra y se retira sin dar batalla.',
  victory:
    'Lima proclama la independencia y el primer sitio del Callao termina con la capitulación de La Mar. La guerra no ha terminado: la sierra sigue en manos realistas y la campaña final esperará a Bolívar y Sucre.',
  defeat:
    'El cerco se rompe antes de la proclamación. La capital sigue bajo el virrey y la Expedición Libertadora pierde su base política en la costa.',
  period: HistoricalPeriod.INDEPENDENCE,
  periodNote: 'Campaña de Lima · 1821',
  narrator: 'Campaña de Lima',
  playerCiv: CivId.PATRIOTAS,
  enemyCiv: CivId.REALISTAS,
  playerName: 'Expedición Libertadora',
  enemyName: 'Realistas del Callao',
  region: 'central_coast',
  map: { seed: 1821, type: 'coast', size: 256 },
  layout: {
    labels: [
      { text: 'Mar del Sur', x: 24 / 256, z: 130 / 256, kind: 'water' },
      { text: 'Río Rímac', x: 120 / 256, z: 124 / 256, kind: 'water' },
      { text: 'Lima', x: LIMA_1821_CITY.x / 256, z: LIMA_1821_CITY.z / 256, kind: 'settlement' },
      { text: 'Callao', x: LIMA_1821_CALLAO.x / 256, z: LIMA_1821_CALLAO.z / 256, kind: 'settlement' },
      { text: 'Lurín', x: LIMA_1821_LURIN.x / 256, z: LIMA_1821_LURIN.z / 256, kind: 'region' },
      { text: 'Carabayllo', x: LIMA_1821_CARABAYLLO.x / 256, z: LIMA_1821_CARABAYLLO.z / 256, kind: 'region' },
    ],
    base: { x: LIMA_1821_CAMP.x / 256, z: LIMA_1821_CAMP.z / 256 },
    opening: { x: 82 / 256, z: 174 / 256 },
    enemyBase: { x: LIMA_1821_CALLAO.x / 256, z: LIMA_1821_CALLAO.z / 256 },
    discoveries: [{ heritageId: 'lima_plaza', initial: true }],
    decor: { model: 'patriotas_camp', at: 'player', dx: 7, dz: 4, yaw: 0.4, scale: 0.9 },
    terrain: {
      flats: [
        { name: 'Llano de Lima', x: LIMA_1821_CITY.x / 256, z: LIMA_1821_CITY.z / 256, rx: 0.2, rz: 0.16 },
        { name: 'Callao', x: LIMA_1821_CALLAO.x / 256, z: LIMA_1821_CALLAO.z / 256, rx: 0.12, rz: 0.1 },
        { name: 'Camino de Lurín', x: LIMA_1821_LURIN.x / 256, z: LIMA_1821_LURIN.z / 256, rx: 0.12, rz: 0.1 },
      ],
    },
    site: {
      id: 'lima_site',
      y: 5.6,
      heightField: LIMA1821_HEIGHTFIELD,
      phase: 'ciudad',
      focus: { x: LIMA_1821_CITY.x / 256, z: LIMA_1821_CITY.z / 256 },
      keepout: [{ x: LIMA_1821_CITY.x / 256, z: LIMA_1821_CITY.z / 256, rx: 0.06, rz: 0.05 }],
      buildKeepout: [{ x: LIMA_1821_CITY.x / 256, z: LIMA_1821_CITY.z / 256, rx: 0.04, rz: 0.04 }],
    },
    roads: [
      {
        from: { dx: LIMA_1821_CAMP.x, dz: LIMA_1821_CAMP.z },
        to: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
        width: 3,
      },
      {
        from: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
        to: { dx: LIMA_1821_CALLAO.x, dz: LIMA_1821_CALLAO.z },
        width: 3,
      },
      {
        from: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
        to: { dx: LIMA_1821_LURIN.x, dz: LIMA_1821_LURIN.z },
        width: 3,
      },
      {
        from: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
        to: { dx: LIMA_1821_CARABAYLLO.x, dz: LIMA_1821_CARABAYLLO.z },
        width: 3,
      },
    ],
  },
  atmosphere: { fogDensity: 0.002, sunWarmth: 0.98, skyTint: '#d9d9cf' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1100, wood: 800, silver: 900, stone: 500 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.WORKER, dx: 5, dz: 4, count: 5 },
      { kind: UnitKind.SOLDIER, dx: 9, dz: 0, count: 10 },
      { kind: UnitKind.MUSKETEER, dx: 11, dz: 2, count: 3 },
      { kind: UnitKind.RIFLEMAN, dx: 8, dz: 0, count: 2 },
      { kind: UnitKind.PATRIOTA_MONTONERA, dx: 14, dz: 1, count: 4 },
      { kind: UnitKind.CAVALRY, dx: 14, dz: -2, count: 2 },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 0, count: 1, tag: 'san_martin' },
    ],
  },
  mark: [{ tag: 'callao_realista', kind: BuildingKind.CENTER, owner: 1 }],
  // Callao is a besieged fortress, not a town: its centre and houses stay, its pressure is the relief
  // column from Carabayllo and the capitulation clock.
  enemy: { active: true, difficulty: 'normal', aggression: 0.7, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/lima-1821/intro-epilogo.webp',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (the camp, the Lurín cut, the capital, the Callao and the Carabayllo
  // relief column), so it shows the cerco the player will close. It does not tell the outcome.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Costa peruana · 1820–1821',
      title: 'La Expedición Libertadora',
      text: 'San Martín desembarca en Paracas y extiende la campaña a la sierra. Lima, la capital del virreinato, vive de los caminos que la abastecen y del puerto del Callao.',
      seconds: 10,
      source: 'docs/historia/campanas/lima_1821.md',
      image: 'media/lima-1821/cine-lima.webp',
      motion: 'push',
    },
    {
      kicker: 'Lima · julio de 1821',
      title: 'El cerco',
      text: 'Cochrane bloquea el Callao y las montoneras cortan los caminos que abastecen Lima. El virrey La Serna abandona la capital y se repliega a la sierra; las fortalezas del Callao siguen en manos realistas.',
      seconds: 12,
      source: 'docs/historia/campanas/lima_1821.md',
      map: {
        // The coast between the Callao (x 52) and the Lurín road (x 154), from Carabayllo (z 96) to the camp.
        view: { x: 28, z: 80, size: 144 },
        marks: [
          { x: LIMA_1821_CITY.x + 4, z: LIMA_1821_CITY.z - 8, label: 'Lima', side: 'place' },
          { x: LIMA_1821_LURIN.x, z: LIMA_1821_LURIN.z + 8, label: 'Lurín', side: 'place' },
          { x: LIMA_1821_CARABAYLLO.x + 4, z: LIMA_1821_CARABAYLLO.z - 8, label: 'Carabayllo', side: 'place' },
          { x: LIMA_1821_CALLAO.x, z: LIMA_1821_CALLAO.z - 8, label: 'Callao', side: 'enemy', delay: 0.4 },
          { x: LIMA_1821_CAMP.x, z: LIMA_1821_CAMP.z + 8, label: 'San Martín', side: 'player', delay: 0.8 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Montoneras',
            points: [
              { x: LIMA_1821_CAMP.x, z: LIMA_1821_CAMP.z },
              { x: LIMA_1821_LURIN.x - 6, z: LIMA_1821_LURIN.z },
            ],
            delay: 1.4,
          },
          {
            side: 'player',
            label: 'Expedición',
            points: [
              { x: LIMA_1821_CAMP.x, z: LIMA_1821_CAMP.z },
              { x: LIMA_1821_CITY.x, z: LIMA_1821_CITY.z + 6 },
            ],
            delay: 3.4,
          },
          {
            side: 'player',
            label: 'Sitio',
            dashed: true,
            points: [
              { x: LIMA_1821_CITY.x, z: LIMA_1821_CITY.z },
              { x: LIMA_1821_CALLAO.x + 6, z: LIMA_1821_CALLAO.z + 4 },
            ],
            delay: 5.4,
          },
          {
            side: 'enemy',
            label: 'Socorro realista',
            points: [
              { x: LIMA_1821_CARABAYLLO.x, z: LIMA_1821_CARABAYLLO.z },
              { x: LIMA_1821_CALLAO.x + 4, z: LIMA_1821_CALLAO.z - 4 },
            ],
            delay: 7.2,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Corta el camino de Lurín',
      text: 'San Martín no viene a arrasar Lima. Lleva las montoneras al camino de Lurín y córtalo: cuando la capital sienta el cerco, la Expedición podrá entrar y proclamar la independencia en la Plaza Mayor.',
      seconds: 12,
      source: 'docs/historia/campanas/lima_1821.md',
      image: 'media/lima-1821/cine-lurin.webp',
      motion: 'pan-left',
    },
  ],
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.MUSKETEER,
    UnitKind.RIFLEMAN,
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
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  allowedTechs: [
    'irrigation_canal',
    'rifle_drill',
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
      id: 'a1_cortar',
      kind: 'hold',
      pos: { dx: LIMA_1821_LURIN.x, dz: LIMA_1821_LURIN.z },
      radius: 18,
      time: 30,
      minUnits: 3,
      unitKind: UnitKind.PATRIOTA_MONTONERA,
      title: 'Corta el camino de Lurín con las montoneras',
    },
    {
      id: 'a1_lima',
      kind: 'reach',
      pos: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
      radius: 18,
      hidden: true,
      requires: 'a1_cortar',
      title: 'Entra en Lima con la Expedición Libertadora',
    },
    {
      id: 'a2_plaza',
      kind: 'inspect',
      heritageIds: ['lima_plaza'],
      inspectRadius: 16,
      pos: { dx: LIMA_1821_CITY.x, dz: LIMA_1821_CITY.z },
      radius: 20,
      hidden: true,
      requires: 'a1_lima',
      title: 'Proclama la independencia en la Plaza Mayor',
    },
    {
      id: 'a2_san_martin',
      kind: 'protect',
      entityTag: 'san_martin',
      hidden: true,
      requires: 'a1_lima',
      title: 'Mantén con vida a José de San Martín',
    },
    {
      id: 'a3_sitio',
      kind: 'hold',
      pos: { dx: LIMA_1821_CALLAO.x, dz: LIMA_1821_CALLAO.z },
      radius: 22,
      time: 90,
      minUnits: 6,
      hidden: true,
      requires: 'a2_plaza',
      title: 'Sostén el primer sitio del Callao hasta la capitulación',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'San Martín',
          duration: 9,
          text: '—No venimos a arrasar Lima. Cortemos sus abastos, ganemos la calle y que la independencia sea una decisión de sus vecinos.',
        },
      ],
    },
    {
      id: 't_cortar',
      condition: { type: 'objective', objectiveId: 'a1_cortar', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'San Martín',
          duration: 8,
          text: '—El camino de Lurín está cortado. La capital siente el cerco; avancemos antes de que La Serna reaccione.',
        },
        { type: 'objective', objectiveId: 'a1_lima', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_lima',
      condition: { type: 'objective', objectiveId: 'a1_lima', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Julio de 1821',
          title: 'La proclamación',
          image: 'media/lima-1821/intro-plaza.webp',
          text: 'Lima se ha quedado sin virrey. San Martín entra en la ciudad y convoca a sus vecinos: la independencia se proclama en la Plaza Mayor, no en un campo de batalla.',
        },
        { type: 'objective', objectiveId: 'a2_plaza', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_san_martin', state: 'activate' },
      ],
    },
    {
      id: 't_plaza',
      condition: { type: 'objective', objectiveId: 'a2_plaza', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Agosto–septiembre de 1821',
          title: 'El primer sitio del Callao',
          image: 'media/lima-1821/intro-callao.webp',
          text: 'La independencia está proclamada, pero el Callao sigue en manos realistas. La Mar defiende las fortalezas; Canterac baja de la sierra para socorrerlas y se retira sin dar batalla.',
        },
        { type: 'objective', objectiveId: 'a3_sitio', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.REALISTA_DRAGON, count: 2 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
          ],
          pos: { dx: LIMA_1821_CARABAYLLO.x, dz: LIMA_1821_CARABAYLLO.z },
          radius: 12,
          target: { dx: LIMA_1821_CALLAO.x, dz: LIMA_1821_CALLAO.z },
        },
      ],
    },
    {
      id: 't_sitio',
      condition: { type: 'objective', objectiveId: 'a3_sitio', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'San Martín',
          duration: 9,
          text: '—La Mar ha capitulado. El Callao queda en nuestras manos; la sierra todavía no. La independencia se defenderá en Junín y Ayacucho.',
        },
      ],
    },
  ],
};
