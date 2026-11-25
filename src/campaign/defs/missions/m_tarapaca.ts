import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { TARAPACA_HEIGHTFIELD } from '../../../model/defs/tarapacaHeightmap';
import type { MissionDef } from '../../types';

// Tarapacá: the village in the quebrada, the heights held by the Chilean columns and the Pachica road.
const TARAPACA_VILLAGE = { x: 96, z: 168 } as const;
// The hold anchor is the village centre; the column marches to a walkable point inside the plaza so its
// path (and the melee around it) is not pinned to the decorative house geometry.
const TARAPACA_VILLAGE_EDGE = { x: 106, z: 168 } as const;
const TARAPACA_HEIGHTS = { x: 160, z: 120 } as const;
const TARAPACA_PACHICA = { x: 198, z: 150 } as const;
const TARAPACA_ARICA = { x: 150, z: 36 } as const;
const TARAPACA_ENEMY = { x: 210, z: 64 } as const;
// The three Chilean columns enter from different edges; none starts on the objective.
const TARAPACA_COLUMN_EAST = { x: 142, z: 168 } as const;
const TARAPACA_COLUMN_NORTH = { x: 200, z: 54 } as const;
const TARAPACA_COLUMN_SOUTH = { x: 214, z: 222 } as const;
// Bends of the columns on the cinema map: the arrows follow the valley, and the film and the map agree.
const TARAPACA_ROUTE_NORTH_BEND = { x: 186, z: 88 } as const;
const TARAPACA_ROUTE_SOUTH_BEND = { x: 196, z: 176 } as const;
const TARAPACA_ROUTE_REFUERZO_BEND = { x: 150, z: 186 } as const;

export const mTarapaca: MissionDef = {
  id: 'm_tarapaca',
  commanders: ['buendia', 'caceres'],
  title: 'La quebrada',
  subtitle: 'Tarapacá · 27 de noviembre de 1879',
  history:
    'Tras la campaña naval, el ejército peruano se repliega en Tarapacá. El 27 de noviembre de 1879, tres columnas chilenas atacan el pueblo y las alturas de la quebrada de Tarapacá.\n' +
    'La resistencia peruana, sin caballería ni artillería al inicio, recibe refuerzos desde Pachica y captura piezas chilenas. La victoria táctica no cambia el curso de la guerra: la provincia se pierde y el ejército se retira a Arica.',
  victory:
    'La quebrada queda en manos peruanas y se capturan cañones chilenos. La victoria es táctica: la provincia se pierde y la retirada por el desierto lleva al ejército hacia Arica.',
  defeat:
    'Las columnas chilenas toman el pueblo y las alturas. La resistencia se deshace en la quebrada y la retirada hacia Arica se vuelve una huida.',
  period: HistoricalPeriod.REPUBLIC,
  periodNote: 'Campaña de Tarapacá · 1879',
  narrator: 'Defensores de Tarapacá',
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  playerName: 'Ejército del Perú',
  enemyName: 'Ejército de Chile',
  region: 'south_coast',
  map: { seed: 1879, type: 'coast', size: 256 },
  layout: {
    labels: [
      { text: 'Tarapacá', x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256, kind: 'settlement' },
      { text: 'Quebrada de Tarapacá', x: 132 / 256, z: 128 / 256, kind: 'region' },
      { text: 'Alturas de Tarapacá', x: TARAPACA_HEIGHTS.x / 256, z: TARAPACA_HEIGHTS.z / 256, kind: 'region' },
      { text: 'Pachica', x: TARAPACA_PACHICA.x / 256, z: TARAPACA_PACHICA.z / 256, kind: 'settlement' },
      { text: 'Camino a Arica', x: TARAPACA_ARICA.x / 256, z: TARAPACA_ARICA.z / 256, kind: 'region' },
    ],
    // The battle opens in the village itself: there is no generic town and no rear base.
    base: { x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256 },
    opening: { x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256 },
    enemyBase: { x: TARAPACA_ENEMY.x / 256, z: TARAPACA_ENEMY.z / 256 },
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Pueblo de Tarapacá', x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256, rx: 0.14, rz: 0.11 },
        { name: 'Quebrada de Tarapacá', x: 132 / 256, z: 128 / 256, rx: 0.09, rz: 0.07 },
      ],
    },
    site: {
      id: 'tarapaca_site',
      // The village pad is flat at 6.942 m in the mission heightfield; the test pins the pair.
      y: 6.942,
      heightField: TARAPACA_HEIGHTFIELD,
      focus: { x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256 },
      keepout: [
        { x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256, rx: 0.095, rz: 0.075 },
        { x: TARAPACA_PACHICA.x / 256, z: TARAPACA_PACHICA.z / 256, rx: 0.06, rz: 0.05 },
      ],
      buildKeepout: [{ x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256, rx: 0.095, rz: 0.075 }],
    },
    roads: [
      {
        from: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
        to: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
        width: 3,
      },
      {
        from: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
        to: { dx: TARAPACA_PACHICA.x, dz: TARAPACA_PACHICA.z },
        width: 3,
      },
      {
        from: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
        to: { dx: TARAPACA_ARICA.x, dz: TARAPACA_ARICA.z },
        width: 2,
      },
    ],
  },
  // Atacama: ochre ground, no palms and only a trace of scrub. The regional south-coast profile is
  // already arid, but its palette and coastal vegetation still read green from the RTS camera.
  mapOverrides: {
    climate: { aridity: 1, moisture: 0.12, temperature: 0.9 },
    vegetation: {
      density: 0,
      variants: { broad: 0 },
      groundCover: 0,
      groundCoverWeights: { grass: 0, ichu: 0, fern: 0, pebble: 1.6, gravel: 1.2 },
    },
    // A single-day battle needs no harvestable ring and no generic fields: keep the quebrada bare.
    // `scatter: 0` is what actually stops the resource pass (all-zero weights already skip the kinds).
    resources: { tree: 0, mine: 0, well: 0, berry: 0, hunt: 0, fishing: 0, scatter: 0 },
    culturalLandscape: null,
    groundTint: '#d8b07a',
  },
  atmosphere: { fogDensity: 0.0018, sunWarmth: 1.16, skyTint: '#e6d2b0' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  // A battle of one day: the army lives off its train, not a settlement economy.
  startingResources: { food: 0, wood: 0, silver: 0, stone: 0 },
  start: {
    // The army is deployed in the village; neither side raises a base or a generic opening crew.
    playerBase: false,
    enemyBase: false,
    openingUnits: false,
    units: [
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 0, dz: 0, count: 8, stance: 'defensivo' },
      { kind: UnitKind.RIFLEMAN, dx: 3, dz: 2, count: 3, stance: 'defensivo' },
      { kind: UnitKind.SOLDIER, dx: -3, dz: 2, count: 4, stance: 'defensivo' },
      // Cáceres commands from the rear of the village, behind the line: the village hold is the
      // objective, not a race to put the protected commander in front of the first Chilean volley.
      { kind: UnitKind.RIFLEMAN, dx: -2, dz: 22, count: 1, tag: 'caceres', stance: 'defensivo' },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.9, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/tarapaca/intro-epilogo.webp',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // uses the battle's own geometry (the columns' entry points and objectives), so what the player sees
  // here is what the mission will throw at them. It does not tell the outcome: the epilogue does.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Tarapacá · 27 de noviembre de 1879',
      title: 'La quebrada',
      text: 'Tras perder el mar, el ejército peruano se repliega por el desierto hasta Tarapacá. Sin caballería ni artillería, la defensa se apoya en el pueblo y en las alturas de la quebrada.',
      seconds: 11,
      source: 'docs/historia/campanas/tarapaca.md',
      image: 'media/tarapaca/cine-quebrada.webp',
      motion: 'push',
    },
    {
      kicker: 'El plan chileno',
      title: 'Tres columnas',
      text: 'Las columnas chilenas avanzan de forma escalonada: la primera sobre el pueblo, las otras dos sobre las alturas. Desde Pachica pueden llegar refuerzos.',
      seconds: 12,
      source: 'docs/historia/campanas/tarapaca.md',
      map: {
        // The theatre, wide enough to hold the columns' real entry points (the easternmost is at z 222).
        view: { x: 28, z: 16, size: 208 },
        marks: [
          { x: TARAPACA_VILLAGE.x, z: TARAPACA_VILLAGE.z - 9, label: 'Tarapacá', side: 'place' },
          { x: TARAPACA_HEIGHTS.x, z: TARAPACA_HEIGHTS.z - 9, label: 'Alturas', side: 'place' },
          { x: TARAPACA_PACHICA.x + 4, z: TARAPACA_PACHICA.z - 7, label: 'Pachica', side: 'place' },
          { x: TARAPACA_ARICA.x, z: TARAPACA_ARICA.z + 6, label: 'Camino a Arica', side: 'place' },
          { x: TARAPACA_VILLAGE.x - 4, z: TARAPACA_VILLAGE.z + 8, label: 'Perú', side: 'player', delay: 0.6 },
        ],
        routes: [
          {
            side: 'enemy',
            label: '1.ª columna',
            points: [
              { x: TARAPACA_COLUMN_EAST.x, z: TARAPACA_COLUMN_EAST.z },
              { x: TARAPACA_VILLAGE_EDGE.x, z: TARAPACA_VILLAGE_EDGE.z },
            ],
            delay: 1.2,
          },
          {
            side: 'enemy',
            label: '2.ª columna',
            points: [
              { x: TARAPACA_COLUMN_NORTH.x, z: TARAPACA_COLUMN_NORTH.z },
              { x: TARAPACA_ROUTE_NORTH_BEND.x, z: TARAPACA_ROUTE_NORTH_BEND.z },
              { x: TARAPACA_HEIGHTS.x + 6, z: TARAPACA_HEIGHTS.z - 6 },
            ],
            delay: 3,
          },
          {
            side: 'enemy',
            label: '3.ª columna',
            points: [
              { x: TARAPACA_COLUMN_SOUTH.x, z: TARAPACA_COLUMN_SOUTH.z },
              { x: TARAPACA_ROUTE_SOUTH_BEND.x, z: TARAPACA_ROUTE_SOUTH_BEND.z },
              { x: TARAPACA_HEIGHTS.x + 8, z: TARAPACA_HEIGHTS.z + 8 },
            ],
            delay: 4.8,
          },
          {
            side: 'player',
            label: 'Refuerzos',
            dashed: true,
            points: [
              { x: TARAPACA_PACHICA.x, z: TARAPACA_PACHICA.z },
              { x: TARAPACA_ROUTE_REFUERZO_BEND.x, z: TARAPACA_ROUTE_REFUERZO_BEND.z },
              { x: TARAPACA_VILLAGE.x + 8, z: TARAPACA_VILLAGE.z + 6 },
            ],
            delay: 6.4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Sostén el pueblo',
      text: 'Cáceres manda su sector a pie. Aguanta la primera columna en el pueblo y mantén vivo al ejército: la quebrada se defiende con la línea que no se rompe.',
      seconds: 11,
      source: 'docs/historia/campanas/tarapaca.md',
      image: 'media/tarapaca/cine-linea.webp',
      motion: 'pan-right',
    },
  ],
  // The field force is fixed: the opening units and the Pachica/captured-gun reinforcements are scripted.
  allowedUnits: [],
  // No settlement construction and no research: the mission is a single-day battle, not a founding scenario.
  allowedBuildings: [],
  allowedTechs: [],
  buildingNames: { [BuildingKind.FORTRESS]: 'Fortín' },
  unitNames: { [UnitKind.REPUBLICA_DEFENSOR]: 'Defensor de Tarapacá' },
  // He commands from the rear: the mission is lost if he falls, and the assault is no place for him.
  commanderNotes: {
    buendia: 'Mando general · no en el campo',
    caceres: 'Manda desde la retaguardia: no lo lleves al asalto. Si cae, la misión se pierde.',
  },
  commanderRoles: { caceres: 'Perú · Tarapacá' },
  objectives: [
    {
      id: 'a1_pueblo',
      kind: 'hold',
      pos: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
      radius: 20,
      time: 45,
      minUnits: 6,
      title: 'Sostén el pueblo de Tarapacá',
    },
    {
      id: 'a2_alturas',
      kind: 'reach',
      pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
      radius: 20,
      // The heights are held by the second column: arriving is not taking them, the crest must be cleared.
      // A wider clear radius stops a defender from stepping off the crest and letting the objective count.
      clearEnemies: true,
      clearRadius: 30,
      hidden: true,
      requires: 'a1_pueblo',
      title: 'Reconquista las alturas de la quebrada',
    },
    {
      id: 'a2_pachica',
      kind: 'reach',
      pos: { dx: TARAPACA_PACHICA.x, dz: TARAPACA_PACHICA.z },
      radius: 10,
      optional: true,
      hidden: true,
      title: 'Enlaza con la columna de Pachica',
    },
    {
      id: 'a3_resistir',
      kind: 'hold',
      pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
      radius: 22,
      time: 60,
      minUnits: 4,
      hidden: true,
      requires: 'a2_alturas',
      title: 'Sostén las alturas hasta la retirada chilena',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      pos: { dx: TARAPACA_ARICA.x, dz: TARAPACA_ARICA.z },
      radius: 16,
      hidden: true,
      requires: 'a3_resistir',
      title: 'Retira el ejército hacia Arica',
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
      condition: { type: 'time', seconds: 1 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 9,
          text: '—Mi sector no tiene caballería ni cañones. Aguante el pueblo y suba a las alturas: el que domina la quebrada domina el campo.',
        },
      ],
    },
    {
      // The first Chilean column attacks the village, as it did historically. It enters east of the
      // village and marches in; it never materialises on the hold position. The delay gives the
      // player time to read the briefing, see the line and place the squads before contact.
      id: 't_apertura',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
          ],
          spawn: { dx: TARAPACA_COLUMN_EAST.x, dz: TARAPACA_COLUMN_EAST.z },
          pos: { dx: TARAPACA_VILLAGE_EDGE.x, dz: TARAPACA_VILLAGE_EDGE.z },
          radius: 5,
          target: { dx: TARAPACA_VILLAGE_EDGE.x, dz: TARAPACA_VILLAGE_EDGE.z },
        },
      ],
    },
    {
      id: 't_pachica',
      condition: { type: 'objective', objectiveId: 'a2_pachica', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 8,
          text: '—La columna de Pachica ha llegado. Refuerza la línea y aprovecha para recuperar las alturas.',
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.REPUBLICA_DEFENSOR, count: 4 }],
          pos: { dx: TARAPACA_PACHICA.x, dz: TARAPACA_PACHICA.z },
          radius: 8,
        },
      ],
    },
    {
      id: 't_pueblo',
      condition: { type: 'objective', objectiveId: 'a1_pueblo', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Las alturas',
          title: 'Tres columnas',
          image: 'media/tarapaca/intro-alturas.webp',
          text: 'Las columnas chilenas se escalonan en la quebrada. La resistencia peruana debe recuperar las alturas con los refuerzos de Pachica.',
        },
        { type: 'objective', objectiveId: 'a2_alturas', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_pachica', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 6 },
            { kind: UnitKind.RIFLEMAN, count: 1 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          spawn: { dx: TARAPACA_COLUMN_NORTH.x, dz: TARAPACA_COLUMN_NORTH.z },
          pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
          radius: 7,
          target: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
        },
        {
          // The Pachica column reached the field during the battle, not only through the optional link.
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.REPUBLICA_DEFENSOR, count: 4 }],
          pos: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
          radius: 8,
        },
      ],
    },
    {
      id: 't_alturas',
      condition: { type: 'objective', objectiveId: 'a2_alturas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La quebrada',
          title: 'La victoria táctica',
          image: 'media/tarapaca/intro-retirada.webp',
          text: 'Las alturas vuelven a manos peruanas y se capturan cañones chilenos. La victoria no cambia la guerra: hay que sostener la quebrada el tiempo suficiente para retirarse.',
        },
        { type: 'objective', objectiveId: 'a3_resistir', state: 'activate', announce: true },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.ARTILLERY, count: 2 }],
          pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
          radius: 10,
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 6 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.CAVALRY, count: 1 },
            { kind: UnitKind.ARTILLERY, count: 1 },
          ],
          spawn: { dx: TARAPACA_COLUMN_SOUTH.x, dz: TARAPACA_COLUMN_SOUTH.z },
          pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
          radius: 7,
          target: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
        },
      ],
    },
    {
      id: 't_resistir',
      condition: { type: 'objective', objectiveId: 'a3_resistir', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Cáceres',
          duration: 9,
          text: '—La quebrada es nuestra, pero la provincia no. Recojan los cañones y emprendamos la retirada: Arica nos espera.',
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
          text: '—Arica nos espera. La victoria de hoy no salva Tarapacá, pero el ejército sigue en pie.',
        },
      ],
    },
  ],
};
