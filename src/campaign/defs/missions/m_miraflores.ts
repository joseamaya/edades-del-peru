import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { MIRAFLORES_HEIGHTFIELD } from '../../../model/defs/mirafloresHeightmap';
import type { MissionDef } from '../../types';
import { LIMA_SITE_ORIGIN } from '../../../model/defs/sites';

// Miraflores: Lima, the redoubt line south of the city and the withdrawal road to the sierra.
const MIRAFLORES_LIMA = LIMA_SITE_ORIGIN;
const MIRAFLORES_CAMP = { x: 112, z: 160 } as const;
const MIRAFLORES_ENEMY = { x: 196, z: 236 } as const;
const MIRAFLORES_REDOUBT_1 = { x: 72, z: 190 } as const;
const MIRAFLORES_REDOUBT_2 = { x: 112, z: 190 } as const;
const MIRAFLORES_REDOUBT_3 = { x: 152, z: 190 } as const;
const MIRAFLORES_RETREAT = { x: 230, z: 150 } as const;
// The line's centre (the Miraflores label, flat and road hub) and the San Juan and Chorrillos fields south of it.
const MIRAFLORES_LINE = { x: 112, z: 190 } as const;
const MIRAFLORES_SAN_JUAN = { x: 168, z: 214 } as const;
const MIRAFLORES_CHORRILLOS = { x: 40, z: 236 } as const;
// The camp plus its front rank: the settled camera frames the reservists, not the redoubts 30 m south.
const MIRAFLORES_OPENING = { x: MIRAFLORES_CAMP.x, z: MIRAFLORES_CAMP.z + 3 } as const;

export const mMiraflores: MissionDef = {
  id: 'm_miraflores',
  commanders: ['caceres'],
  title: 'Los reductos',
  subtitle: 'San Juan y Miraflores · 1881',
  history:
    'En enero de 1881 el ejército chileno avanza sobre Lima. Tras San Juan y Chorrillos, la defensa se organiza en una línea de reductos en Miraflores, con reservistas limeños y tropas de Cáceres.\n' +
    'La defensa de Lima dura dos jornadas; la línea de Miraflores resiste una de ellas. La misión no pide ganar la guerra: pide sostener los reductos el tiempo necesario para retirar a Cáceres y continuar la resistencia en la sierra.',
  victory:
    'Los reductos resisten lo suficiente para retirar a Cáceres y parte de la fuerza. Lima cae y la guerra continúa en la sierra: la resistencia de la Breña empieza en esta retirada.',
  defeat:
    'La línea se rompe antes de la retirada. Cáceres cae o es capturado y la resistencia de la sierra pierde a su jefe.',
  outcome: 'retirada',
  period: HistoricalPeriod.REPUBLIC,
  periodNote: 'Defensa de Lima · enero de 1881',
  narrator: 'Defensores de Lima',
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  playerName: 'Ejército del Perú',
  enemyName: 'Ejército de Chile',
  region: 'central_coast',
  map: { seed: 1881, type: 'coast', size: 256 },
  layout: {
    labels: [
      { text: 'Lima', x: MIRAFLORES_LIMA.x / 256, z: MIRAFLORES_LIMA.z / 256, kind: 'settlement' },
      { text: 'Miraflores', x: MIRAFLORES_LINE.x / 256, z: MIRAFLORES_LINE.z / 256, kind: 'region' },
      { text: 'San Juan', x: MIRAFLORES_SAN_JUAN.x / 256, z: MIRAFLORES_SAN_JUAN.z / 256, kind: 'region' },
      { text: 'Chorrillos', x: MIRAFLORES_CHORRILLOS.x / 256, z: MIRAFLORES_CHORRILLOS.z / 256, kind: 'region' },
      { text: 'Camino a la sierra', x: MIRAFLORES_RETREAT.x / 256, z: MIRAFLORES_RETREAT.z / 256, kind: 'region' },
    ],
    base: { x: MIRAFLORES_CAMP.x / 256, z: MIRAFLORES_CAMP.z / 256 },
    // The camp and its front rank, not the redoubts 30 m south.
    opening: { x: MIRAFLORES_OPENING.x / 256, z: MIRAFLORES_OPENING.z / 256 },
    enemyBase: { x: MIRAFLORES_ENEMY.x / 256, z: MIRAFLORES_ENEMY.z / 256 },
    // The redoubts are the player's forts at the objective nodes (reductos 1-3); the old Arica
    // battery decor has been removed because it was a coastal battery from another battle.
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Lima', x: MIRAFLORES_LIMA.x / 256, z: MIRAFLORES_LIMA.z / 256, rx: 0.18, rz: 0.14 },
        { name: 'Línea de Miraflores', x: MIRAFLORES_LINE.x / 256, z: MIRAFLORES_LINE.z / 256, rx: 0.22, rz: 0.06 },
        { name: 'San Juan', x: MIRAFLORES_SAN_JUAN.x / 256, z: MIRAFLORES_SAN_JUAN.z / 256, rx: 0.12, rz: 0.08 },
      ],
    },
    site: {
      id: 'miraflores_site',
      y: 5.6,
      heightField: MIRAFLORES_HEIGHTFIELD,
      phase: 'ciudad',
      // The site camera frames the redoubt line; the Lima colonial kit stays as the city backdrop north.
      focus: { x: MIRAFLORES_REDOUBT_2.x / 256, z: MIRAFLORES_REDOUBT_2.z / 256 },
      keepout: [
        { x: MIRAFLORES_LIMA.x / 256, z: MIRAFLORES_LIMA.z / 256, rx: 0.06, rz: 0.05 },
        // Clear of resources around the camp so no grove grows over the opening frame.
        { x: MIRAFLORES_CAMP.x / 256, z: MIRAFLORES_CAMP.z / 256, rx: 0.09, rz: 0.08 },
      ],
      buildKeepout: [{ x: MIRAFLORES_LIMA.x / 256, z: MIRAFLORES_LIMA.z / 256, rx: 0.04, rz: 0.04 }],
    },
    roads: [
      {
        from: { dx: MIRAFLORES_LIMA.x, dz: MIRAFLORES_LIMA.z },
        to: { dx: MIRAFLORES_LINE.x, dz: MIRAFLORES_LINE.z },
        width: 3,
      },
      {
        from: { dx: MIRAFLORES_LINE.x, dz: MIRAFLORES_LINE.z },
        to: { dx: MIRAFLORES_RETREAT.x, dz: MIRAFLORES_RETREAT.z },
        width: 3,
      },
      {
        from: { dx: MIRAFLORES_LINE.x, dz: MIRAFLORES_LINE.z },
        to: { dx: MIRAFLORES_ENEMY.x, dz: MIRAFLORES_ENEMY.z },
        width: 3,
      },
    ],
  },
  atmosphere: { fogDensity: 0.0018, sunWarmth: 1.02, skyTint: '#deddd2' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1300, wood: 900, silver: 900, stone: 900 },
  start: {
    enemyOpeningUnits: false,
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 4 },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 8, dz: 0, count: 10 },
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: 2, count: 3 },
      { kind: UnitKind.CAVALRY, dx: 12, dz: -2, count: 2 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 0, count: 1, tag: 'caceres' },
    ],
  },
  // A Chilean field army, not a settlement: its camp stays, its pressure is the authored redoubt waves.
  enemy: { active: true, difficulty: 'normal', aggression: 0.8, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/miraflores/intro-epilogo.webp',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (Lima, the camp, the three redoubt nodes and the Chilean column's camp and
  // target). It states the mission, not its outcome: the withdrawal to the sierra and the optional fourth
  // redoubt are not shown; the act cards and the epilogue tell them.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Lima · enero de 1881',
      title: 'La defensa de Lima',
      text: 'Tras San Juan y Chorrillos, la defensa se organiza en Miraflores. Una línea de reductos cruza el sur de Lima; muchos defensores son reservistas de la ciudad.',
      seconds: 10,
      source: 'docs/historia/campanas/miraflores.md',
      image: 'media/miraflores/cine-lima.webp',
      motion: 'push',
    },
    {
      kicker: 'Miraflores · 15 de enero de 1881',
      title: 'Los reductos',
      text: 'La línea de Miraflores contará con diez reductos; los primeros tres deben quedar en pie antes del ataque. El ejército chileno avanza desde San Juan sobre el centro de la línea.',
      seconds: 11,
      source: 'docs/historia/campanas/miraflores.md',
      map: {
        // South Lima from the city to Chorrillos and the Chilean camp beyond San Juan, down to the map's edge.
        view: { x: 28, z: 76, size: 180 },
        marks: [
          { x: MIRAFLORES_LIMA.x, z: MIRAFLORES_LIMA.z - 8, label: 'Lima', side: 'place' },
          { x: MIRAFLORES_SAN_JUAN.x, z: MIRAFLORES_SAN_JUAN.z - 8, label: 'San Juan', side: 'place' },
          { x: MIRAFLORES_CHORRILLOS.x + 6, z: MIRAFLORES_CHORRILLOS.z - 6, label: 'Chorrillos', side: 'place' },
          { x: MIRAFLORES_CAMP.x, z: MIRAFLORES_CAMP.z - 6, label: 'Perú', side: 'player', delay: 0.6 },
          { x: MIRAFLORES_REDOUBT_1.x, z: MIRAFLORES_REDOUBT_1.z, label: 'Reducto 1', side: 'player', delay: 1.2 },
          { x: MIRAFLORES_REDOUBT_2.x, z: MIRAFLORES_REDOUBT_2.z, label: 'Reducto 2', side: 'player', delay: 1.6 },
          { x: MIRAFLORES_REDOUBT_3.x, z: MIRAFLORES_REDOUBT_3.z, label: 'Reducto 3', side: 'player', delay: 2 },
          { x: MIRAFLORES_ENEMY.x, z: MIRAFLORES_ENEMY.z + 6, label: 'Chile', side: 'enemy', delay: 2.6 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Reservistas',
            dashed: true,
            points: [
              { x: MIRAFLORES_LIMA.x, z: MIRAFLORES_LIMA.z },
              { x: MIRAFLORES_CAMP.x, z: MIRAFLORES_CAMP.z },
              { x: MIRAFLORES_LINE.x, z: MIRAFLORES_LINE.z - 6 },
            ],
            delay: 0.8,
          },
          {
            side: 'enemy',
            label: 'Ejército de Chile',
            points: [
              { x: MIRAFLORES_ENEMY.x, z: MIRAFLORES_ENEMY.z },
              { x: MIRAFLORES_SAN_JUAN.x, z: MIRAFLORES_SAN_JUAN.z },
              { x: MIRAFLORES_REDOUBT_2.x + 8, z: MIRAFLORES_REDOUBT_2.z + 6 },
            ],
            delay: 3.4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Sostén la línea',
      text: 'Cáceres manda el sector derecho. Levanta los reductos, sostén la línea con los reservistas y mantén con vida a Cáceres: la línea debe resistir el asalto.',
      seconds: 10,
      source: 'docs/historia/campanas/miraflores.md',
      image: 'media/miraflores/cine-linea.webp',
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
    UnitKind.ARTILLERY,
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
    // The redoubt line historically had guns; the workshop is what lets the player replace them.
    BuildingKind.FACTORY,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  allowedTechs: ['irrigation_canal', 'rifle_drill', 'shock_cavalry', 'siege_engines', 'hunters', 'republica_puerto'],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Reducto',
    [BuildingKind.BARRACKS]: 'Cuartel',
  },
  // The Miraflores line was held by limeño reservists, not by the Arica garrison.
  unitNames: { [UnitKind.REPUBLICA_DEFENSOR]: 'Reservista de Miraflores' },
  objectives: [
    {
      id: 'a1_reductos',
      kind: 'network',
      buildingKind: BuildingKind.FORTRESS,
      count: 3,
      nodes: [
        { dx: MIRAFLORES_REDOUBT_1.x, dz: MIRAFLORES_REDOUBT_1.z },
        { dx: MIRAFLORES_REDOUBT_2.x, dz: MIRAFLORES_REDOUBT_2.z },
        { dx: MIRAFLORES_REDOUBT_3.x, dz: MIRAFLORES_REDOUBT_3.z },
      ],
      radius: 14,
      title: 'Levanta los reductos 1, 2 y 3',
    },
    {
      id: 'a1_cuarto',
      kind: 'build',
      buildingKind: BuildingKind.FORTRESS,
      pos: { dx: 192, dz: 190 },
      radius: 14,
      optional: true,
      title: 'Levanta un cuarto reducto si te queda piedra',
    },
    {
      id: 'a2_linea',
      kind: 'hold',
      pos: { dx: MIRAFLORES_REDOUBT_2.x, dz: MIRAFLORES_REDOUBT_2.z },
      radius: 28,
      time: 90,
      // Eight was brittle against the reservist army: the line's core is six, and the Chilean battery
      // one-shots it, so the column is infantry and riflemen (same lesson as Huamachuco/Arica).
      minUnits: 6,
      hidden: true,
      requires: 'a1_reductos',
      title: 'Sostén la línea de Miraflores',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      // The withdrawal is Cáceres' own: any scout reaching the road used to end the mission for him.
      entityTag: 'caceres',
      pos: { dx: MIRAFLORES_RETREAT.x, dz: MIRAFLORES_RETREAT.z },
      radius: 16,
      hidden: true,
      requires: 'a2_linea',
      title: 'Retira a Cáceres hacia la sierra',
    },
    {
      id: 'a3_caceres',
      kind: 'protect',
      entityTag: 'caceres',
      title: 'Mantén con vida a Andrés A. Cáceres',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 9,
          text: '—No defendemos una muralla, defendemos tiempo. Levanten los reductos y sostengan la línea; cuando Lima caiga, la sierra nos espera.',
        },
      ],
    },
    {
      id: 't_reductos',
      condition: { type: 'objective', objectiveId: 'a1_reductos', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Miraflores',
          title: 'La línea de fuego',
          image: 'media/miraflores/intro-reductos.webp',
          text: 'Los reductos están listos. La infantería chilena avanza sobre la línea; los reservistas y el sector derecho de Cáceres deben sostenerla.',
        },
        { type: 'objective', objectiveId: 'a2_linea', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 6 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { dx: MIRAFLORES_ENEMY.x, dz: MIRAFLORES_ENEMY.z },
          radius: 14,
          target: { dx: MIRAFLORES_REDOUBT_2.x, dz: MIRAFLORES_REDOUBT_2.z },
        },
      ],
    },
    {
      id: 't_linea',
      condition: { type: 'objective', objectiveId: 'a2_linea', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La retirada',
          title: 'Lima cae',
          image: 'media/miraflores/intro-retirada.webp',
          text: 'La línea resiste, pero Lima está perdida. Cáceres organiza la retirada a la sierra: la guerra continúa lejos de la capital.',
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
          text: '—Lima queda atrás. La resistencia sigue en la sierra; que nadie confunda la caída de la capital con el fin de la guerra.',
        },
      ],
    },
  ],
};
