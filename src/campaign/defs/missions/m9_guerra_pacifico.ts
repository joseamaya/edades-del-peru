import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { ARICA_MAP_SIZE, aricaLength, aricaPoint } from '../../../model/defs/aricaSite';

// The authored Arica heightfield: the 192 m composition (sea to the west, the port terrace, the battery
// site and the northern Chilean camp) sampled 4/3 larger on the 256 m map.
const ARICA_BASE_SOURCE = { x: 73, z: 115 } as const;
const ARICA_BASE_WORLD = aricaPoint(ARICA_BASE_SOURCE);
/** A point authored in the former 192 m site frame, as an absolute mission point. */
const aricaWorldPoint = (x: number, z: number) => {
  const p = aricaPoint({ x, z });
  return { dx: p.x, dz: p.z };
};
const ARICA_BASE_ANCHOR = {
  x: ARICA_BASE_WORLD.x / ARICA_MAP_SIZE,
  z: ARICA_BASE_WORLD.z / ARICA_MAP_SIZE,
} as const;
const ARICA_MINES_WORLD = { dx: aricaLength(92), dz: aricaLength(104) } as const;
const ARICA_CAMP_ANCHOR = { x: 0.78, z: 0.22 } as const;
// The battery terrace (`arica_site`) and the Morro headland label, shared by the layout and the cinema map.
const ARICA_SITE_ANCHOR = { x: 0.702, z: 0.38 } as const;
const ARICA_MORRO_ANCHOR = { x: 0.16, z: 0.26 } as const;
/** An anchor (0..1) as a world point on the cinema map. */
const aricaMapPoint = (a: { x: number; z: number }) => ({ x: a.x * ARICA_MAP_SIZE, z: a.z * ARICA_MAP_SIZE });
const ARICA_SITE_WORLD = aricaMapPoint(ARICA_SITE_ANCHOR);
const ARICA_MORRO_WORLD = aricaMapPoint(ARICA_MORRO_ANCHOR);
const ARICA_CAMP_WORLD = aricaMapPoint(ARICA_CAMP_ANCHOR);
// The two lines the mission defends, north of the port terrace toward the Chilean camp. Authored world
// points: anchored on `ref: 'player'` they followed the centre building, and the bombardment that razed
// it silently moved both objectives mid-act. Each line sits outside the other's hold radius, so the
// assault is a line to march to and not the ground the bombardment was already held on.
const ARICA_CUARTEL_LINE = aricaWorldPoint(ARICA_BASE_SOURCE.x, ARICA_BASE_SOURCE.z - 20);
const ARICA_LAST_LINE = aricaWorldPoint(ARICA_BASE_SOURCE.x - 8, ARICA_BASE_SOURCE.z - 32);
// Entry points on the northern approach: the columns crest the ridge instead of appearing on the line
// they must take.
const ARICA_APPROACH_EAST = aricaWorldPoint(ARICA_BASE_SOURCE.x + 30, ARICA_BASE_SOURCE.z - 44);
const ARICA_APPROACH_WEST = aricaWorldPoint(ARICA_BASE_SOURCE.x - 28, ARICA_BASE_SOURCE.z - 46);

export const m9GuerraPacifico: MissionDef = {
  id: 'm9_guerra_pacifico',
  commanders: ['bolognesi'],
  title: 'La Defensa de Arica',
  subtitle: 'Arica · 1880',
  history:
    'Tras el combate de Angamos (8 de octubre de 1879), la Guerra del Pacífico continúa en tierra. La derrota aliada en Tacna (26 de mayo de 1880) deja a Arica aislada; el 7 de junio el ejército chileno asalta la plaza: la guarnición de Francisco Bolognesi defiende el puerto hasta la caída.\n' +
    'Rechaza el parlamento, mina los accesos y sostén la última línea hasta el asalto final. La historia termina con la caída; el epílogo la cuenta.',
  victory:
    'La defensa de Arica cumple su deber: el asalto se cobra la plaza y Bolognesi y sus defensores quedan como símbolo de la resistencia peruana. La historia documentada sigue su curso.',
  defeat:
    'La defensa de Arica se quiebra antes del asalto final. La plaza cae sin que la guarnición llegue a sostener la última línea.',
  outcome: 'resistencia',
  period: HistoricalPeriod.REPUBLIC,
  periodNote: 'La misión se sitúa entre el 5 y el 7 de junio de 1880',
  narrator: 'Defensores de Arica',
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  playerName: 'Defensores de Arica',
  enemyName: 'Ejército de Chile',
  map: { seed: 1879, type: 'coast', size: ARICA_MAP_SIZE },
  region: 'south_coast',
  layout: {
    labels: [
      { text: 'Arica', x: ARICA_BASE_ANCHOR.x, z: ARICA_BASE_ANCHOR.z, kind: 'settlement' },
      // The Morro is the coastal headland that closes the bay: in-world it sat far inland.
      { text: 'Morro de Arica', x: ARICA_MORRO_ANCHOR.x, z: ARICA_MORRO_ANCHOR.z, kind: 'region' },
      { text: 'Campamento chileno', x: ARICA_CAMP_ANCHOR.x, z: ARICA_CAMP_ANCHOR.z, kind: 'region' },
    ],
    base: ARICA_BASE_ANCHOR,
    enemyBase: ARICA_CAMP_ANCHOR,
    terrain: {
      // The port terrace above the Pacific; the Morro itself is outside the
      // playable height range and is not invented as a new mesh.
      flats: [
        { name: 'Terraza portuaria de Arica', x: ARICA_BASE_ANCHOR.x, z: ARICA_BASE_ANCHOR.z, rx: 0.15, rz: 0.12 },
      ],
    },
    site: {
      id: 'arica_site',
      y: 4,
      focus: ARICA_SITE_ANCHOR,
      keepout: [{ x: ARICA_SITE_ANCHOR.x, z: ARICA_SITE_ANCHOR.z, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: ARICA_SITE_ANCHOR.x, z: ARICA_SITE_ANCHOR.z, rx: 0.08, rz: 0.07 }],
    },
  },
  mapOverrides: { culturalLandscape: null, groundTint: '#e6cfa4' },
  atmosphere: { fogDensity: 0.0012, sunWarmth: 1.08, skyTint: '#e6e2d6' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1500, wood: 800, silver: 1500, stone: 1200 },
  start: {
    // The Chilean camp is the staging area of the authored waves, not a settlement: no centre, houses or
    // crew for the enemy seat (the AI keeps its combat micro and defence).
    enemyBase: false,
    buildings: [{ kind: BuildingKind.FORTRESS, dx: -aricaLength(10), dz: -aricaLength(6), tag: 'puerto' }],
    units: [
      { kind: UnitKind.WORKER, dx: aricaLength(4), dz: aricaLength(6), count: 3 },
      {
        kind: UnitKind.RIFLEMAN,
        dx: aricaLength(6),
        dz: aricaLength(2),
        count: 1,
        tag: 'bolognesi',
        stance: 'defensivo',
      },
      // A garrison holds the line: `defensivo` sends it back to the ground it was ordered to hold, not to
      // wherever a pursuit ends.
      { kind: UnitKind.RIFLEMAN, dx: aricaLength(4), dz: aricaLength(8), count: 4, stance: 'defensivo' },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: aricaLength(2), dz: aricaLength(6), count: 2, stance: 'defensivo' },
      { kind: UnitKind.SOLDIER, dx: aricaLength(8), dz: 0, count: 4, stance: 'defensivo' },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.35, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the mission's own geometry (the sappers' mines, the columns' entry points and the two lines they
  // attack), so what the player sees here is what the mission will throw at them. It does not tell the fall
  // of the plaza: the act cards and the epilogue do.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Arica · 5 de junio de 1880',
      title: 'El parlamento',
      text: 'Tras la derrota aliada en Tacna, Arica queda aislada. El parlamento de Juan de la Cruz Salvo exige la rendición de la plaza; Bolognesi consulta a sus jefes y responde que defenderán Arica hasta quemar el último cartucho.',
      seconds: 13,
      source: 'docs/historia/campanas/guerra_del_pacifico.md',
      image: 'media/arica/cine-puerto.webp',
      motion: 'push',
    },
    {
      kicker: 'Arica · 7 de junio de 1880',
      title: 'El bombardeo',
      text: 'Los zapadores de Elmore minan los accesos. La artillería chilena bate la plaza y las columnas bajan desde el norte sobre las líneas del cuartel.',
      seconds: 10,
      source: 'docs/historia/campanas/guerra_del_pacifico.md',
      map: {
        // The theatre from the Morro to the Chilean camp, wide enough to hold both entry points and the port.
        view: { x: 28, z: 30, size: 184 },
        marks: [
          { x: ARICA_BASE_WORLD.x, z: ARICA_BASE_WORLD.z + 8, label: 'Arica', side: 'place' },
          { x: ARICA_SITE_WORLD.x, z: ARICA_SITE_WORLD.z + 8, label: 'Batería', side: 'place' },
          { x: ARICA_MORRO_WORLD.x + 4, z: ARICA_MORRO_WORLD.z, label: 'Morro de Arica', side: 'place' },
          {
            x: ARICA_MINES_WORLD.dx + 6,
            z: ARICA_MINES_WORLD.dz + 6,
            label: 'Minas de los zapadores',
            side: 'place',
            delay: 1.6,
          },
          { x: ARICA_BASE_WORLD.x - 6, z: ARICA_BASE_WORLD.z - 8, label: 'Perú', side: 'player', delay: 0.6 },
          { x: ARICA_CAMP_WORLD.x, z: ARICA_CAMP_WORLD.z, label: 'Chile', side: 'enemy', delay: 0.9 },
        ],
        routes: [
          {
            // The sappers' road to the mines: the mark at its end names it, a second label would crowd it.
            side: 'player',
            dashed: true,
            points: [
              { x: ARICA_BASE_WORLD.x, z: ARICA_BASE_WORLD.z },
              { x: ARICA_MINES_WORLD.dx, z: ARICA_MINES_WORLD.dz },
            ],
            delay: 1,
          },
          {
            side: 'enemy',
            label: '1.ª columna',
            points: [
              { x: ARICA_APPROACH_EAST.dx, z: ARICA_APPROACH_EAST.dz },
              { x: ARICA_CUARTEL_LINE.dx, z: ARICA_CUARTEL_LINE.dz },
            ],
            delay: 3,
          },
          {
            side: 'enemy',
            label: '2.ª columna',
            points: [
              { x: ARICA_APPROACH_WEST.dx, z: ARICA_APPROACH_WEST.dz },
              { x: ARICA_LAST_LINE.dx, z: ARICA_LAST_LINE.dz },
            ],
            delay: 5,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Sostén la plaza',
      text: 'Bolognesi manda la guarnición a pie. Mina los accesos, aguanta el bombardeo en el cuartel y sostén la última línea cuando llegue el asalto: la defensa depende de que la línea no se rompa.',
      seconds: 12,
      source: 'docs/historia/campanas/guerra_del_pacifico.md',
      image: 'media/arica/cine-linea.webp',
      motion: 'pan-left',
    },
  ],
  epilogueImage: 'media/arica/intro-epilogo.webp',
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.REPUBLICA_DEFENSOR,
    UnitKind.SNIPER,
    UnitKind.SCOUT,
  ],
  // The port and fort keep an infantry garrison: no cavalry stable, artillery workshop or academy.
  allowedBuildings: [
    BuildingKind.CENTER,
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.BARRACKS,
    BuildingKind.ARSENAL,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  allowedTechs: ['irrigation_canal', 'bow_and_bolas', 'hunters', 'republica_puerto'],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Fortín',
    [BuildingKind.INSTITUTE]: 'Academia',
    [BuildingKind.BARRACKS]: 'Cuartel',
  },
  unitNames: { [UnitKind.REPUBLICA_DEFENSOR]: 'Defensor de Arica' },
  objectives: [
    {
      id: 'obj_puerto',
      kind: 'protect',
      entityTag: 'puerto',
      title: 'Sostén la defensa del fuerte y el puerto hasta el asalto final',
    },
    {
      id: 'a1_parlamento',
      kind: 'wait',
      time: 15,
      title: 'Acto I · Escucha el parlamento: Arica no se rinde',
    },
    {
      id: 'a1_minas',
      kind: 'hold',
      pos: ARICA_MINES_WORLD,
      radius: aricaLength(7),
      time: 20,
      minUnits: 2,
      unitKind: UnitKind.WORKER,
      consume: { resource: 'food', perSecond: 1 },
      hidden: true,
      title: 'Acto I · Mina los accesos con los zapadores',
    },
    {
      id: 'bonus_bateria',
      kind: 'inspect',
      heritageIds: ['arica_battery'],
      inspectRadius: aricaLength(16),
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: aricaLength(18),
      optional: true,
      title: 'Acto I · Reconoce la batería de la terraza',
    },
    {
      id: 'a2_bombardeo',
      kind: 'hold',
      // On the cuartel's forward line, not on the start position: anchored on the spawn the act completed
      // after 60 s with the player doing nothing.
      pos: ARICA_CUARTEL_LINE,
      radius: aricaLength(10),
      time: 60,
      minUnits: 3,
      hidden: true,
      title: 'Acto II · Sostén el cuartel durante el bombardeo',
    },
    {
      id: 'a2_bolognesi',
      kind: 'protect',
      entityTag: 'bolognesi',
      hidden: true,
      title: 'Acto II · Mantén con vida a Bolognesi durante el bombardeo',
    },
    {
      id: 'a3_asalto',
      kind: 'hold',
      // The last line is a position to take and keep, not the ground the player already stands on.
      pos: ARICA_LAST_LINE,
      radius: aricaLength(12),
      time: 120,
      minUnits: 4,
      hidden: true,
      title: 'Acto III · Sostén la última línea hasta el asalto final',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 8,
          text: '—El parlamentario Salvo exige la rendición. Arica no se rinde: según la tradición, responderemos que defenderemos la plaza hasta quemar el último cartucho.',
        },
      ],
    },
    {
      id: 't_parlamento',
      condition: { type: 'objective', objectiveId: 'a1_parlamento', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 7,
          text: '—Los zapadores minan los accesos. Que cada hombre sostenga su puesto: la batería y el cuartel son la plaza.',
        },
        { type: 'objective', objectiveId: 'a1_minas', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_acto2',
      condition: { type: 'objective', objectiveId: 'a1_minas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · 7 de junio de 1880',
          title: 'El bombardeo',
          text: 'Al amanecer, la artillería chilena bate la plaza. Los defensores se aferran al cuartel y a la batería mientras la infantería enemiga se concentra para el asalto.',
        },
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 7,
          text: '—Aguanten el cañoneo. Si el cuartel cede, la plaza entera cede con él.',
        },
        { type: 'objective', objectiveId: 'a2_bombardeo', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_bolognesi', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          // The bombardment batters the line the garrison holds, not the town behind it.
          spawn: ARICA_APPROACH_EAST,
          pos: ARICA_CUARTEL_LINE,
          radius: aricaLength(6),
          target: ARICA_CUARTEL_LINE,
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.REPUBLICA_DEFENSOR, count: 2 }],
          pos: { dx: ARICA_BASE_WORLD.x + aricaLength(6), dz: ARICA_BASE_WORLD.z + aricaLength(6) },
          radius: aricaLength(4),
        },
      ],
    },
    {
      id: 't_acto3',
      condition: { type: 'objective', objectiveId: 'a2_bombardeo', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · 7 de junio de 1880',
          title: 'El asalto',
          text: 'La infantería chilena asalta la plaza. Bolognesi arenga a los suyos: la resistencia no cambiará el desenlace, pero sí la memoria de Arica.',
        },
        { type: 'objective', objectiveId: 'a2_bolognesi', state: 'complete' },
        { type: 'objective', objectiveId: 'a3_asalto', state: 'activate', announce: true },
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 8,
          text: '—Sostengan la última línea. Que nadie diga que Arica cayó sin pelear.',
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
            { kind: UnitKind.CHILE_INFANTE, count: 1 },
          ],
          spawn: ARICA_APPROACH_EAST,
          pos: ARICA_LAST_LINE,
          radius: aricaLength(7),
          target: ARICA_LAST_LINE,
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 3 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
          ],
          spawn: ARICA_APPROACH_WEST,
          pos: ARICA_LAST_LINE,
          radius: aricaLength(6),
          target: ARICA_LAST_LINE,
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.REPUBLICA_DEFENSOR, count: 2 },
          ],
          pos: { dx: ARICA_BASE_WORLD.x - aricaLength(6), dz: ARICA_BASE_WORLD.z + aricaLength(4) },
          radius: aricaLength(4),
        },
      ],
    },
  ],
};
