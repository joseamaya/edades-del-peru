import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

// The 192 m Andean map compresses Tinta/Tungasuca, the Sangarará road and Cusco. The retreat leaves
// the valley to the south-west, toward Langui.
const TUPAC_MAP_SIZE = 192;
const TUPAC_TUNGASUCA = { dx: 50, dz: 138 } as const;
const TUPAC_SANGARARA = { dx: 105, dz: 80 } as const;
const TUPAC_SIEGE = { dx: 120, dz: 88 } as const;
const TUPAC_TUNGASUCA_ANCHOR = {
  x: TUPAC_TUNGASUCA.dx / TUPAC_MAP_SIZE,
  z: TUPAC_TUNGASUCA.dz / TUPAC_MAP_SIZE,
} as const;
const TUPAC_SANGARARA_ANCHOR = {
  x: TUPAC_SANGARARA.dx / TUPAC_MAP_SIZE,
  z: TUPAC_SANGARARA.dz / TUPAC_MAP_SIZE,
} as const;
const TUPAC_SIEGE_ANCHOR = {
  x: TUPAC_SIEGE.dx / TUPAC_MAP_SIZE,
  z: TUPAC_SIEGE.dz / TUPAC_MAP_SIZE,
} as const;
const ROYALIST_COLUMN = [
  { kind: UnitKind.SOLDIER, count: 3 },
  { kind: UnitKind.RIFLEMAN, count: 1 },
  { kind: UnitKind.REALISTA_DRAGON, count: 1 },
] as const;

export const m7TupacAmaru: MissionDef = {
  id: 'm7_tupac_amaru',
  commanders: ['tupac_amaru', 'micaela_bastidas'],
  title: 'La Gran Rebelión',
  subtitle: 'Virreinato · 1780–1781',
  history:
    'José Gabriel Condorcanqui, Túpac Amaru II, se alza contra los abusos del Virreinato: la mita, el reparto y los obrajes. Micaela Bastidas organiza el avituallamiento y la red de apoyo.\n' +
    'Sostén la rebelión, vence en Sangarará y retira el ejército cuando el cerco del Cusco fracase. La historia termina con la captura y la ejecución; el epílogo la cuenta.',
  victory:
    'La rebelión se retira del Cusco: el cerco no toma la ciudad, pero la causa sobrevive. La historia documentada sigue su curso: Túpac Amaru II y Micaela Bastidas serán capturados y ejecutados en 1781.',
  defeat:
    'La rebelión se deshace antes de retirarse. El Virreinato alcanza a sus líderes y la Gran Rebelión se ahoga en sangre.',
  period: HistoricalPeriod.VICEROYALTY,
  periodNote: 'La misión se sitúa en 1780–1781',
  narrator: 'La Gran Rebelión',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.REALISTAS,
  playerName: 'Rebeldes de Túpac Amaru',
  enemyName: 'Realistas del Cusco',
  map: { seed: 1780, type: 'andes', size: TUPAC_MAP_SIZE },
  layout: {
    labels: [
      { text: 'Valle del Cusco', x: 0.36, z: 0.62, kind: 'region' },
      { text: 'Tungasuca', x: TUPAC_TUNGASUCA_ANCHOR.x, z: TUPAC_TUNGASUCA_ANCHOR.z, kind: 'settlement' },
      { text: 'Sangarará', x: TUPAC_SANGARARA_ANCHOR.x, z: TUPAC_SANGARARA_ANCHOR.z, kind: 'region' },
      { text: 'Cusco', x: 0.702, z: 0.38, kind: 'settlement' },
      { text: 'Camino a Langui', x: 0.2, z: 0.78, kind: 'region' },
    ],
    base: { x: 0.36, z: 0.62 },
    departure: { x: 0.2, z: 0.78 },
    enemyBase: { x: 0.772, z: 0.38 },
    discoveries: [{ heritageId: 'colonial_church', initial: true }],
    // Sangarará's church is a typological landmark: the mission's authored site is the Cusco church.
    decor: { model: 'colonial_church', at: 'player', dx: 36, dz: -39, yaw: 0.4, scale: 0.45 },
    terrain: {
      flats: [
        { name: 'Valle del Cusco', x: 0.36, z: 0.62, rx: 0.15, rz: 0.12 },
        { name: 'Ruta de Sangarará', x: TUPAC_SANGARARA_ANCHOR.x, z: TUPAC_SANGARARA_ANCHOR.z, rx: 0.1, rz: 0.09 },
        {
          name: 'Laderas del Cusco',
          x: TUPAC_SIEGE_ANCHOR.x,
          z: TUPAC_SIEGE_ANCHOR.z,
          rx: 0.08,
          rz: 0.07,
        },
      ],
    },
    site: {
      id: 'colonial_site',
      y: 5,
      focus: { x: 0.702, z: 0.38 },
      keepout: [{ x: 0.702, z: 0.38, rx: 0.075, rz: 0.075 }],
      buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.065, rz: 0.065 }],
    },
  },
  timeOfDay: 'dusk',
  startingEra: Era.VICEROYALTY,
  startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
  start: {
    units: [
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: -6, count: 1, tag: 'tupac_amaru' },
      { kind: UnitKind.WORKER, dx: 3, dz: 4, count: 1, tag: 'micaela_bastidas' },
      { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 10 },
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: 2, count: 4 },
      { kind: UnitKind.CAVALRY, dx: 12, dz: -4, count: 2 },
    ],
  },
  // The royalist pressure is scripted (Sangarará, the Cusco sortie and the relief); the city does not
  // run an economy of its own. The rebels had no artillery train and no professional fortifications.
  enemy: { active: false, difficulty: 'normal', aggression: 0 },
  tutorial: true,
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.CAVALRY,
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
    BuildingKind.MARKET,
    BuildingKind.SMELTER,
    BuildingKind.REFINERY,
  ],
  objectives: [
    {
      id: 'a1_cuartel',
      kind: 'build',
      buildingKind: BuildingKind.BARRACKS,
      count: 1,
      title: 'Acto I · Levanta el cuartel de la rebelión',
    },
    {
      id: 'a1_avituallamiento',
      kind: 'hold',
      pos: { ref: 'player', dx: 0, dz: 0 },
      radius: 18,
      time: 20,
      minUnits: 3,
      unitKind: UnitKind.WORKER,
      consume: { resource: 'food', perSecond: 1 },
      title: 'Acto I · Reúne el avituallamiento en el campamento',
    },
    {
      id: 'a1_tungasuca',
      kind: 'reach',
      pos: TUPAC_TUNGASUCA,
      radius: 12,
      hidden: true,
      requires: 'a1_cuartel',
      title: 'Acto I · Alcanza Tungasuca',
    },
    {
      id: 'a2_sangarara',
      kind: 'reach',
      pos: TUPAC_SANGARARA,
      radius: 14,
      hidden: true,
      title: 'Acto II · Marcha a Sangarará',
    },
    {
      id: 'a2_batalla',
      kind: 'hold',
      pos: TUPAC_SANGARARA,
      radius: 18,
      time: 45,
      minUnits: 4,
      hidden: true,
      title: 'Acto II · Sostén Sangarará y que la columna no rompa el cerco',
    },
    {
      id: 'a3_cerco',
      kind: 'reach',
      pos: TUPAC_SIEGE,
      radius: 16,
      hidden: true,
      requires: 'a2_batalla',
      title: 'Acto III · Llega a las laderas del Cusco',
    },
    {
      id: 'a3_sostener',
      kind: 'hold',
      pos: TUPAC_SIEGE,
      radius: 24,
      time: 45,
      minUnits: 3,
      hidden: true,
      title: 'Acto III · Sostén el cerco del Cusco',
    },
    {
      id: 'a3_retirada',
      kind: 'reach',
      pos: { ref: 'departure', dx: 0, dz: 0 },
      radius: 12,
      entityTag: 'tupac_amaru',
      hidden: true,
      title: 'Acto III · Retira a Túpac Amaru cuando llegue el socorro',
    },
    {
      id: 'bonus_micaela',
      kind: 'protect',
      entityTag: 'micaela_bastidas',
      optional: true,
      title: 'Protege a Micaela Bastidas',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Micaela Bastidas',
          duration: 8,
          text: '—Las comunidades responden: hay hombres, caballos y algo de pólvora. Reunamos el avituallamiento antes de marchar.',
        },
      ],
    },
    {
      id: 't_tungasuca',
      condition: { type: 'objective', objectiveId: 'a1_avituallamiento', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Micaela Bastidas',
          duration: 8,
          text: '—El avituallamiento está listo. Marcha a Tungasuca y reúne a los curacas: la rebelión necesita su juramento.',
        },
        { type: 'objective', objectiveId: 'a1_tungasuca', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_acto2',
      condition: { type: 'objective', objectiveId: 'a1_tungasuca', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · 18 de noviembre de 1780',
          title: 'Sangarará',
          text: 'La rebelión ha tomado Tungasuca: el corregidor Arriaga fue capturado y ejecutado. La columna realista se refugia en Sangarará; la rebelión la cerca y la vence, pero el Cusco sigue en pie.',
        },
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru II',
          duration: 8,
          text: '—Sangarará ha caído. Que la noticia corra por la sierra: el Virreinato no es invencible.',
        },
        { type: 'objective', objectiveId: 'a2_sangarara', state: 'activate', announce: true },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.SOLDIER, count: 4 }],
          pos: { ref: 'player', dx: 4, dz: 4 },
          radius: 4,
        },
      ],
    },
    {
      id: 't_sangarara',
      condition: { type: 'objective', objectiveId: 'a2_sangarara', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru II',
          duration: 7,
          text: '—La columna se ha encerrado en el pueblo. Sostened el cerco: si rompen la línea, la victoria no sirve de nada.',
        },
        { type: 'objective', objectiveId: 'a2_batalla', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [...ROYALIST_COLUMN],
          pos: TUPAC_SANGARARA,
          radius: 10,
          objective: 'position',
        },
      ],
    },
    {
      id: 't_acto3',
      condition: { type: 'objective', objectiveId: 'a2_batalla', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Enero de 1781',
          title: 'El cerco del Cusco',
          text: 'La rebelión pone cerco al Cusco. La ciudad resiste y el socorro realista baja de Lima: el cerco fracasará, y con él la oportunidad de tomar la capital.',
        },
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru II',
          duration: 8,
          text: '—El Cusco está cercado, pero no cae. Ocupemos las laderas y cortemos sus salidas: aún podemos quebrarlo por hambre.',
        },
        { type: 'objective', objectiveId: 'a3_cerco', state: 'activate', announce: true },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.SOLDIER, count: 4 }],
          pos: { ref: 'player', dx: -4, dz: 4 },
          radius: 4,
        },
      ],
    },
    {
      id: 't_cerco',
      condition: { type: 'objective', objectiveId: 'a3_cerco', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Micaela Bastidas',
          duration: 7,
          text: '—Las laderas están tomadas. Que nadie baje al valle: el Cusco no debe recibir ni un saco de maíz.',
        },
        { type: 'objective', objectiveId: 'a3_sostener', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [...ROYALIST_COLUMN],
          pos: { dx: 160, dz: 80 },
          radius: 8,
          target: TUPAC_SIEGE,
        },
      ],
    },
    {
      id: 't_socorro',
      condition: { type: 'objective', objectiveId: 'a3_sostener', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · El socorro',
          title: 'El Cusco no cae',
          text: 'La columna de Lima rompe el cerco. La rebelión no puede tomar la ciudad: retirar el ejército y a sus líderes es la única salida.',
        },
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru II',
          duration: 9,
          text: '—El socorro ha llegado. No tomaremos el Cusco hoy: salvemos al ejército y a nuestra gente. ¡Retirada!',
        },
        { type: 'objective', objectiveId: 'a3_retirada', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
          ],
          pos: { dx: 165, dz: 60 },
          radius: 8,
          target: TUPAC_SIEGE,
        },
      ],
    },
    {
      id: 't_final',
      condition: { type: 'objective', objectiveId: 'a3_retirada', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Túpac Amaru II',
          duration: 8,
          text: '—El Cusco no cayó, pero la rebelión sigue viva. Que la memoria de estos días no se pierda.',
        },
      ],
    },
    {
      id: 't_tupac',
      condition: { type: 'entity_dead', entityTag: 'tupac_amaru' },
      effects: [
        {
          type: 'defeat',
          text: 'Túpac Amaru II ha caído. Sin su liderazgo, la rebelión no puede retirarse del Cusco.',
        },
      ],
    },
  ],
};
