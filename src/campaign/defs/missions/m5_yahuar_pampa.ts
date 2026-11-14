import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m5YahuarPampa: MissionDef = {
  id: 'm5_yahuar_pampa',
  commanders: ['cusi_yupanqui', 'anccu_hualloc'],
  title: 'Yahuar Pampa',
  subtitle: 'Cusco · 1438',
  history:
    'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
    'Resiste el asedio y repele al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
  victory:
    'Cusi Yupanqui vence en Yahuar Pampa y asume el poder como Pachacútec, el que transforma el mundo. Comienza el imperio.',
  defeat: 'El Cusco cae ante los chancas y el imperio no llega a nacer.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  playerCiv: CivId.INCA,
  enemyCiv: CivId.CHANCA,
  map: { seed: 1438, type: 'andes', size: 160 },
  layout: {
    base: { x: 0.36, z: 0.62 },
    enemyBase: { x: 0.7725, z: 0.38 },
    site: {
      id: 'chanca_site',
      y: 5,
      focus: { x: 0.7025, z: 0.38 },
      keepout: [{ x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 }],
      buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
    },
    terrain: {
      flats: [
        { name: 'Pampa de Yahuar', x: 0.36, z: 0.62, rx: 0.15, rz: 0.12 },
        { name: 'Alturas del Cusco', x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  timeOfDay: 'dusk',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 700, wood: 600, silver: 400, stone: 200 },
  start: {
    buildings: [
      { kind: BuildingKind.FORTRESS, dx: -9, dz: -7 },
      { kind: BuildingKind.FORTRESS, dx: 9, dz: -7 },
      { kind: BuildingKind.FORTRESS, dx: -9, dz: 7 },
      { kind: BuildingKind.FORTRESS, dx: 9, dz: 7 },
    ],
    units: [
      { kind: UnitKind.RIFLEMAN, dx: -8, dz: 8, tag: 'cusi_yupanqui', count: 1 },
      { kind: UnitKind.SOLDIER, dx: -6, dz: 10, count: 6 },
      { kind: UnitKind.MUSKETEER, dx: -10, dz: 10, count: 2 },
    ],
  },
  mark: [
    { tag: 'cusco', kind: BuildingKind.CENTER, owner: 0 },
    { tag: 'centro_chanca', kind: BuildingKind.CENTER, owner: 1 },
  ],
  enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
  objectives: [
    { id: 'obj_defend', kind: 'defend', entityTag: 'cusco', time: 480, title: 'Defiende el Cusco 8 minutos' },
    { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_chanca', title: 'Destruye el campamento chanca' },
    { id: 'obj_cusi', kind: 'protect', entityTag: 'cusi_yupanqui', title: 'Mantén con vida a Cusi Yupanqui' },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 15 },
      effects: [
        {
          type: 'dialogue',
          text: 'Cusi Yupanqui: —Los chancas creen que huiremos como los nobles. ¡Aquí se defiende el Cusco!',
        },
      ],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 90 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [{ kind: UnitKind.SOLDIER, count: 6 }],
          pos: { ref: 'player', dx: 28, dz: 12 },
          radius: 6,
        },
        { type: 'dialogue', text: '¡Anccu Hualloc ataca por el norte! ¡A las armas!' },
      ],
    },
    {
      id: 't_wave_2',
      condition: { type: 'time', seconds: 200 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { ref: 'player', dx: -12, dz: 28 },
          radius: 6,
        },
      ],
    },
  ],
};
