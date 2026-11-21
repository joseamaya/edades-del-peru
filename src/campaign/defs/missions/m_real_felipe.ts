import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { CALLAO_HEIGHTFIELD } from '../../../model/defs/callaoHeightmap';
import type { MissionDef } from '../../types';

// The Callao fortress and the patriot siege camp. Normalized coordinates over the 256 m map.
const REAL_FELIPE = { x: 0.702, z: 0.38 } as const;
const REAL_FELIPE_CAMP = { x: 0.34, z: 0.66 } as const;
const REAL_FELIPE_BATTERY_A = { x: 0.46, z: 0.56 } as const;
const REAL_FELIPE_BATTERY_B = { x: 0.55, z: 0.48 } as const;
// The bay's east shore beside the fortress: the squadron blockades the port in front of the Real Felipe,
// not the open sea 130 m away across the bay.
const REAL_FELIPE_COAST = { x: 0.613, z: 0.4 } as const;

export const mRealFelipe: MissionDef = {
  id: 'm_real_felipe',
  commanders: ['salom', 'rodil'],
  title: 'El último bastión',
  subtitle: 'Callao · 1824–1826',
  history:
    'En febrero de 1824 la guarnición del Callao se sublevó y entregó la plaza a los realistas. José Ramón Rodil asumió el mando del Real Felipe y, tras Ayacucho, se negó a acogerse a la capitulación. El general Bartolomé Salom sitió la fortaleza por tierra y la escuadra patriota la bloqueó por mar.\n' +
    'Miles de civiles se refugiaron en la fortaleza y la escasez de víveres provocó una crisis humanitaria. Rodil resistió hasta enero de 1826, cuando capituló y salió con honores: fue el último bastión español en el Perú.',
  victory:
    'El Real Felipe capitula en enero de 1826. Rodil sale con honores y la guerra de independencia termina en el Perú; la resistencia realista ya no tiene base en el país.',
  defeat:
    'El cerco se rompe y la guarnición de Rodil recibe socorro. El último bastión realista prolonga la guerra y la independencia queda en suspenso.',
  period: HistoricalPeriod.INDEPENDENCE,
  periodNote: 'Segundo sitio del Callao · 1824–1826',
  narrator: 'Sitio del Callao',
  playerCiv: CivId.PATRIOTAS,
  enemyCiv: CivId.REALISTAS,
  playerName: 'Ejército sitiador',
  enemyName: 'Guarnición del Real Felipe',
  region: 'central_coast',
  map: { seed: 1826, type: 'coast', size: 256 },
  layout: {
    labels: [
      { text: 'Mar del Sur', x: 0.12, z: 0.3, kind: 'water' },
      { text: 'Bahía del Callao', x: 0.4, z: 0.34, kind: 'water' },
      { text: 'Callao', x: REAL_FELIPE.x, z: REAL_FELIPE.z, kind: 'settlement' },
      { text: 'Real Felipe', x: REAL_FELIPE.x, z: REAL_FELIPE.z, kind: 'settlement' },
      { text: 'Campamento sitiador', x: REAL_FELIPE_CAMP.x, z: REAL_FELIPE_CAMP.z, kind: 'region' },
      { text: 'Camino de Lima', x: 0.52, z: 0.55, kind: 'region' },
    ],
    base: REAL_FELIPE_CAMP,
    opening: { x: 0.42, z: 0.58 },
    enemyBase: REAL_FELIPE,
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Campamento sitiador', x: REAL_FELIPE_CAMP.x, z: REAL_FELIPE_CAMP.z, rx: 0.16, rz: 0.12 },
        { name: 'Real Felipe', x: REAL_FELIPE.x, z: REAL_FELIPE.z, rx: 0.12, rz: 0.1 },
        { name: 'Boca de la bahía', x: 0.61, z: 0.41, rx: 0.07, rz: 0.07 },
      ],
    },
    site: {
      id: 'real_felipe_site',
      // The Arica battery GLB is not loaded: the mission draws a minimal bastioned trace instead.
      y: 4,
      heightField: CALLAO_HEIGHTFIELD,
      focus: REAL_FELIPE,
      keepout: [{ x: REAL_FELIPE.x, z: REAL_FELIPE.z, rx: 0.075, rz: 0.075 }],
      buildKeepout: [{ x: REAL_FELIPE.x, z: REAL_FELIPE.z, rx: 0.065, rz: 0.065 }],
    },
    siteLandmarks: [{ kind: 'real-felipe', x: REAL_FELIPE.x, z: REAL_FELIPE.z }],
    roads: [
      {
        from: { dx: REAL_FELIPE_CAMP.x * 256, dz: REAL_FELIPE_CAMP.z * 256 },
        to: { dx: REAL_FELIPE.x * 256, dz: REAL_FELIPE.z * 256 },
        width: 3,
      },
    ],
  },
  atmosphere: { fogDensity: 0.0018, sunWarmth: 0.92, skyTint: '#d2d4ce' },
  timeOfDay: 'dusk',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1400, wood: 1000, silver: 1000, stone: 900 },
  start: {
    buildings: [{ kind: BuildingKind.FORTRESS, dx: 6, dz: 8, tag: 'campamento_sitiador' }],
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 6 },
      { kind: UnitKind.SOLDIER, dx: 9, dz: 0, count: 8 },
      { kind: UnitKind.MUSKETEER, dx: 11, dz: 2, count: 2 },
      { kind: UnitKind.RIFLEMAN, dx: 8, dz: 0, count: 4 },
      { kind: UnitKind.PATRIOTA_MONTONERA, dx: 14, dz: 1, count: 2 },
      { kind: UnitKind.CAVALRY, dx: 14, dz: -2, count: 2 },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 3 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 0, count: 1, tag: 'salom' },
    ],
  },
  mark: [{ tag: 'real_felipe', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'normal', aggression: 0.5 },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/real-felipe/intro-epilogo.webp',
  intro: [
    {
      kicker: 'CALLAO · DESPUÉS DE AYACUCHO',
      title: 'El último bastión',
      text: 'La capitulación de Ayacucho no termina la guerra. José Ramón Rodil, ya al mando del Real Felipe, se niega a acogerse a ella y mantiene la fortaleza con los últimos realistas.',
      seconds: 9,
      source: 'docs/historia/campanas/real_felipe.md',
      image: 'media/real-felipe/intro-bastion.webp',
    },
    {
      kicker: 'CALLAO · 1824–1826',
      title: 'El cerco',
      text: 'Bartolomé Salom sitia la fortaleza por tierra y la escuadra patriota la bloquea por mar. Miles de civiles se refugian dentro; la comida y el agua se vuelven el problema central.',
      seconds: 9,
      source: 'docs/historia/campanas/real_felipe.md',
      image: 'media/real-felipe/intro-sitio.webp',
    },
    {
      kicker: 'CALLAO · ENERO DE 1826',
      title: 'El último invierno',
      text: 'Tras más de un año de sitio, los víveres se agotan y las salidas fracasan. Rodil sostiene el Real Felipe con lo que le queda: forzar la capitulación es la última tarea del sitio.',
      seconds: 10,
      source: 'docs/historia/campanas/real_felipe.md',
      image: 'media/real-felipe/intro-epilogo.webp',
    },
  ],
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.MUSKETEER,
    UnitKind.RIFLEMAN,
    UnitKind.PATRIOTA_MONTONERA,
    UnitKind.CAVALRY,
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
  buildingNames: { [BuildingKind.FORTRESS]: 'Fortín' },
  objectives: [
    {
      id: 'a1_baterias',
      kind: 'network',
      buildingKind: BuildingKind.FORTRESS,
      count: 2,
      nodes: [
        { dx: REAL_FELIPE_BATTERY_A.x * 256, dz: REAL_FELIPE_BATTERY_A.z * 256 },
        { dx: REAL_FELIPE_BATTERY_B.x * 256, dz: REAL_FELIPE_BATTERY_B.z * 256 },
      ],
      radius: 14,
      title: 'Levanta dos baterías para estrechar el cerco',
    },
    {
      id: 'a2_bloqueo',
      kind: 'hold',
      pos: { dx: REAL_FELIPE_COAST.x * 256, dz: REAL_FELIPE_COAST.z * 256 },
      radius: 16,
      time: 45,
      minUnits: 2,
      unitKind: UnitKind.ARTILLERY,
      hidden: true,
      requires: 'a1_baterias',
      title: 'Mantén el bloqueo de la costa con la artillería',
    },
    {
      id: 'a3_salidas',
      kind: 'defend',
      entityTag: 'campamento_sitiador',
      time: 60,
      hidden: true,
      requires: 'a2_bloqueo',
      title: 'Rechaza las salidas de Rodil y protege el campamento',
    },
    {
      id: 'a4_capitulacion',
      kind: 'hold',
      pos: { dx: REAL_FELIPE.x * 256, dz: REAL_FELIPE.z * 256 },
      radius: 20,
      time: 90,
      minUnits: 8,
      consume: { resource: 'food', perSecond: 1 },
      hidden: true,
      requires: 'a3_salidas',
      title: 'Fuerza la capitulación del Real Felipe',
    },
    {
      id: 'a4_salom',
      kind: 'protect',
      entityTag: 'salom',
      title: 'Mantén con vida a Bartolomé Salom',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Salom',
          duration: 9,
          text: '—Rodil no va a rendirse por palabras. Cerremos el puerto, levantemos baterías y que el hambre decida lo que la pólvora no decidió en Ayacucho.',
        },
      ],
    },
    {
      id: 't_baterias',
      condition: { type: 'objective', objectiveId: 'a1_baterias', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Salom',
          duration: 8,
          text: '—Las baterías están listas. Ahora cerremos la costa: si entra un bote con víveres, el sitio se alarga meses.',
        },
        { type: 'objective', objectiveId: 'a2_bloqueo', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_bloqueo',
      condition: { type: 'objective', objectiveId: 'a2_bloqueo', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · El cerco',
          title: 'El hambre y las salidas',
          image: 'media/real-felipe/intro-baterias.webp',
          text: 'El bloqueo cierra el puerto. Dentro del Real Felipe se refugian miles de civiles; Rodil intenta salidas para romper el cerco y buscar víveres. La guerra se vuelve una prueba de resistencia.',
        },
        { type: 'objective', objectiveId: 'a3_salidas', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { dx: REAL_FELIPE.x * 256, dz: REAL_FELIPE.z * 256 },
          radius: 10,
          target: { dx: REAL_FELIPE_CAMP.x * 256, dz: REAL_FELIPE_CAMP.z * 256 },
        },
      ],
    },
    {
      id: 't_salidas',
      condition: { type: 'objective', objectiveId: 'a3_salidas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Enero de 1826',
          title: 'Sin víveres',
          image: 'media/real-felipe/intro-epilogo.webp',
          text: 'Las salidas fracasan y los víveres se agotan. Rodil sostiene la plaza con lo que le queda de guarnición: la capitulación es cuestión de días, pero hay que forzarla.',
        },
        { type: 'objective', objectiveId: 'a4_capitulacion', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_capitulacion',
      condition: { type: 'objective', objectiveId: 'a4_capitulacion', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Salom',
          duration: 9,
          text: '—Rodil acepta capitular y sale con honores y dos banderas: el último bastión español en el Perú deja de existir. La independencia no se selló solo en Ayacucho; también se sostuvo aquí, con un sitio largo y sin gloria.',
        },
      ],
    },
  ],
};
