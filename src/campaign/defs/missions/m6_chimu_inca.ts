import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m6ChimuInca: MissionDef = {
  id: 'm6_chimu_inca',
  commanders: ['tupac_yupanqui', 'minchancaman'],
  title: 'La Guerra del Norte',
  subtitle: 'Costa norte · c. 1470',
  history:
    'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman.\n' +
    'Al mando del auqui Túpac Yupanqui, avanza por Paramonga y el valle del Santa. Corta el canal que abastece de agua a Chan Chan: sin agua, la ciudad no puede resistir.',
  victory:
    'El canal está cortado y Chan Chan capitula. Minchancaman es llevado al Cusco y el Tahuantinsuyo se extiende por la costa norte.',
  defeat: 'La resistencia chimú detiene al ejército inca y la costa norte permanece libre.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  playerCiv: CivId.INCA,
  enemyCiv: CivId.CHIMU,
  map: { seed: 1470, type: 'coast', size: 192 },
  region: 'north_coast',
  layout: {
    base: { x: 0.35, z: 0.62 },
    enemyBase: { x: 0.814, z: 0.339 },
    site: {
      id: 'chimu_site',
      y: 5,
      focus: { x: 0.744, z: 0.339 },
      keepout: [{ x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 }],
      buildKeepout: [{ x: 0.744, z: 0.339, rx: 0.075, rz: 0.065 }],
    },
    // The gate answers once the army has reached the valley: closing it is the mission's own mechanic.
    canal: {
      name: 'Canal de Chan Chan',
      x: 0.5,
      z: 0.5,
      length: 28,
      yaw: 0.2,
      initiallyOpen: true,
      heritageId: 'chimu_canal',
      lockedUntilObjective: 'obj_canal',
      lockedHint: 'Primero avanza hasta Paramonga y alcanza el canal de Chan Chan.',
    },
    terrain: {
      flats: [
        { name: 'Canal de Chan Chan', x: 0.5, z: 0.5, rx: 0.14, rz: 0.09 },
        { name: 'Costa de Chan Chan', x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  timeOfDay: 'dusk',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
  start: {
    units: [
      { kind: UnitKind.RIFLEMAN, dx: 10, dz: -4, count: 1, tag: 'tupac_yupanqui' },
      { kind: UnitKind.RIFLEMAN, dx: 12, dz: -8, count: 1 },
      { kind: UnitKind.MUSKETEER, dx: 6, dz: 10, count: 2 },
      { kind: UnitKind.RIFLEMAN, dx: 4, dz: -6, count: 4 },
    ],
  },
  mark: [{ tag: 'chan_chan', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'hard', aggression: 1.2 },
  objectives: [
    {
      id: 'obj_avanzar',
      kind: 'reach',
      entityTag: 'tupac_yupanqui',
      pos: { ref: 'enemy', dx: -18, dz: 0 },
      radius: 8,
      title: 'Avanza hasta Paramonga',
    },
    {
      id: 'obj_canal',
      kind: 'canal_closed',
      hidden: true,
      title: 'Corta el agua de Chan Chan: cierra la compuerta',
    },
    {
      id: 'obj_comandante',
      kind: 'protect',
      entityTag: 'tupac_yupanqui',
      title: 'Mantén con vida a Túpac Yupanqui',
    },
    {
      id: 'obj_kill',
      kind: 'destroy',
      entityTag: 'chan_chan',
      optional: true,
      title: 'Toma Chan Chan si resiste',
    },
    { id: 'obj_hold', kind: 'survive', time: 600, optional: true, title: 'Mantén el campamento 10 minutos' },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanza por los valles y córtale el agua a Chan Chan.',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 60 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 260 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 6 },
            { kind: UnitKind.MUSKETEER, count: 3 },
          ],
          pos: { ref: 'player', dx: 20, dz: 20 },
          radius: 7,
        },
        { type: 'dialogue', text: '¡Querrotumi contraataca desde Paramonga!' },
      ],
    },
    {
      id: 't_paramonga',
      condition: { type: 'unit_near', entityTag: 'tupac_yupanqui', pos: { ref: 'enemy', dx: -18, dz: 0 }, radius: 8 },
      effects: [
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —¡Paramonga ha caído! El canal de Chan Chan está adelante: cierra su compuerta y la ciudad se quedará sin agua.',
        },
        { type: 'objective', objectiveId: 'obj_canal', state: 'activate' },
      ],
    },
    {
      id: 't_canal',
      condition: { type: 'objective', objectiveId: 'obj_canal', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Túpac Yupanqui: —El canal está cortado. Chan Chan, sin agua, no puede resistir.',
        },
        { type: 'victory' },
      ],
    },
  ],
};
