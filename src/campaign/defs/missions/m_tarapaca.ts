import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

// Tarapacá: the village in the quebrada, the heights held by the Chilean columns and the Pachica road.
const TARAPACA_VILLAGE = { x: 96, z: 168 } as const;
const TARAPACA_HEIGHTS = { x: 160, z: 120 } as const;
const TARAPACA_SITE = { x: 176, z: 96 } as const;
const TARAPACA_PACHICA = { x: 62, z: 196 } as const;
const TARAPACA_BASE = { x: 72, z: 200 } as const;
const TARAPACA_ENEMY = { x: 200, z: 72 } as const;

export const mTarapaca: MissionDef = {
  id: 'm_tarapaca',
  commanders: ['buendia', 'caceres'],
  title: 'La quebrada',
  subtitle: 'Tarapacá · 27 de noviembre de 1879',
  history:
    'Tras la campaña naval, el ejército peruano se repliega en Tarapacá. El 27 de noviembre de 1879, tres columnas chilenas atacan el pueblo y las alturas de la quebrada de San Lorenzo.\n' +
    'La resistencia peruana, sin caballería ni artillería al inicio, recibe refuerzos desde Pachica y captura piezas chilenas. La victoria táctica no cambia el curso de la guerra: la provincia se pierde y el ejército se retira a Arica.',
  victory:
    'La quebrada queda en manos peruanas y se capturan cañones chilenos. La victoria es táctica: la provincia se pierde y la retirada de 200 km por el desierto lleva al ejército hacia Arica.',
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
      { text: 'Quebrada de San Lorenzo', x: 132 / 256, z: 128 / 256, kind: 'region' },
      { text: 'Alturas de Tarapacá', x: TARAPACA_HEIGHTS.x / 256, z: TARAPACA_HEIGHTS.z / 256, kind: 'region' },
      { text: 'Pachica', x: TARAPACA_PACHICA.x / 256, z: TARAPACA_PACHICA.z / 256, kind: 'region' },
      { text: 'Camino a Arica', x: 196 / 256, z: 196 / 256, kind: 'region' },
    ],
    base: { x: TARAPACA_BASE.x / 256, z: TARAPACA_BASE.z / 256 },
    opening: { x: 100 / 256, z: 190 / 256 },
    enemyBase: { x: TARAPACA_ENEMY.x / 256, z: TARAPACA_ENEMY.z / 256 },
    discoveries: [],
    terrain: {
      flats: [
        { name: 'Pueblo de Tarapacá', x: TARAPACA_VILLAGE.x / 256, z: TARAPACA_VILLAGE.z / 256, rx: 0.14, rz: 0.11 },
        { name: 'Quebrada de San Lorenzo', x: 132 / 256, z: 128 / 256, rx: 0.12, rz: 0.1 },
        { name: 'Alturas', x: TARAPACA_HEIGHTS.x / 256, z: TARAPACA_HEIGHTS.z / 256, rx: 0.12, rz: 0.1 },
      ],
    },
    site: {
      id: 'tarapaca_site',
      y: 4,
      focus: { x: TARAPACA_SITE.x / 256, z: TARAPACA_SITE.z / 256 },
      keepout: [{ x: TARAPACA_SITE.x / 256, z: TARAPACA_SITE.z / 256, rx: 0.08, rz: 0.07 }],
      buildKeepout: [{ x: TARAPACA_SITE.x / 256, z: TARAPACA_SITE.z / 256, rx: 0.07, rz: 0.06 }],
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
    ],
  },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 1200, wood: 700, silver: 700, stone: 500 },
  start: {
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 5 },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 8, dz: 0, count: 8 },
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: 2, count: 3 },
      { kind: UnitKind.SOLDIER, dx: 12, dz: -2, count: 4 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 0, count: 1, tag: 'caceres' },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.9 },
  tutorial: true,
  modelMission: true,
  epilogueImage: 'media/tarapaca/intro-epilogo.webp',
  intro: [
    {
      kicker: 'TARAPACÁ · 27 DE NOVIEMBRE DE 1879',
      title: 'La quebrada',
      text: 'Tras la campaña naval, el ejército peruano se repliega en Tarapacá. Sin caballería ni artillería, la defensa se apoya en el pueblo y en las alturas de la quebrada.',
      seconds: 9,
      source: 'docs/historia/campanas/tarapaca.md',
      image: 'media/tarapaca/intro-quebrada.webp',
    },
    {
      kicker: 'TRES COLUMNAS · 27 DE NOVIEMBRE',
      title: 'El ataque escalonado',
      text: 'Las columnas chilenas llegan de forma escalonada y toman las alturas. La resistencia peruana recibe refuerzos desde Pachica y pelea por recuperar el terreno.',
      seconds: 9,
      source: 'docs/historia/campanas/tarapaca.md',
      image: 'media/tarapaca/intro-alturas.webp',
    },
    {
      kicker: 'VICTORIA TÁCTICA · 1879',
      title: 'La retirada',
      text: 'El Perú captura cañones y conserva el campo, pero la provincia se pierde. El ejército inicia una retirada de 200 km por el desierto hacia Arica.',
      seconds: 10,
      source: 'docs/historia/campanas/tarapaca.md',
      image: 'media/tarapaca/intro-retirada.webp',
    },
  ],
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.REPUBLICA_DEFENSOR,
    UnitKind.SNIPER,
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
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
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
      radius: 18,
      hidden: true,
      requires: 'a1_pueblo',
      title: 'Reconquista las alturas de la quebrada',
    },
    {
      id: 'a2_pachica',
      kind: 'reach',
      pos: { dx: TARAPACA_PACHICA.x, dz: TARAPACA_PACHICA.z },
      radius: 12,
      optional: true,
      hidden: true,
      title: 'Enlaza con la columna de Pachica',
    },
    {
      id: 'a3_resistir',
      kind: 'hold',
      pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
      radius: 20,
      time: 60,
      minUnits: 5,
      hidden: true,
      requires: 'a2_alturas',
      title: 'Sostén las alturas hasta la retirada chilena',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      pos: { dx: 220, dz: 220 },
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
      condition: { type: 'time', seconds: 6 },
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
          pos: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
          radius: 10,
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
          text: 'Las columnas chilenas se escalonan en la quebrada. La resistencia peruana debe recuperar las alturas antes de que lleguen los refuerzos de Pachica.',
        },
        { type: 'objective', objectiveId: 'a2_alturas', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_pachica', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CHILE_INFANTE, count: 6 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
          radius: 12,
          target: { dx: TARAPACA_VILLAGE.x, dz: TARAPACA_VILLAGE.z },
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
            { kind: UnitKind.CHILE_INFANTE, count: 8 },
            { kind: UnitKind.CAVALRY, count: 2 },
          ],
          pos: { dx: TARAPACA_HEIGHTS.x, dz: TARAPACA_HEIGHTS.z },
          radius: 14,
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
