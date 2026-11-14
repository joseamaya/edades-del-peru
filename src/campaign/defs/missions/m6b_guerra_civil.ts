import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m6bGuerraCivil: MissionDef = {
  id: 'm6b_guerra_civil',
  commanders: ['atahualpa', 'huascar'],
  title: 'La Guerra Civil',
  subtitle: 'Cusco–Quito · 1529–1532',
  history:
    'Tras la muerte de Huayna Cápac, el Tahuantinsuyo se divide entre Huáscar, en el Cusco, y Atahualpa, en Quito. La guerra civil enfrenta a los ejércitos incas por el trono.\n' +
    'Avanza hacia Quipaipan, derrota al ejército de Huáscar y mantén con vida a Atahualpa.',
  victory:
    'El ejército de Atahualpa vence en Quipaipan y captura a Huáscar. La guerra civil deja al Tahuantinsuyo dividido justo antes de la llegada española.',
  defeat: 'El ejército de Huáscar resiste y el trono del Tahuantinsuyo queda en disputa.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  playerCiv: CivId.INCA,
  enemyCiv: CivId.INCA,
  playerName: 'Ejército de Atahualpa',
  enemyName: 'Huáscar de Cusco',
  playerColor: '#c8a040',
  enemyColor: '#b03028',
  map: { seed: 1532, type: 'andes', size: 192 },
  region: 'high_andes',
  layout: {
    base: { x: 0.35, z: 0.3 },
    enemyBase: { x: 0.71, z: 0.68 },
    site: {
      id: 'cusco_inca_site',
      y: 5,
      focus: { x: 0.65, z: 0.68 },
      keepout: [{ x: 0.65, z: 0.68, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: 0.65, z: 0.68, rx: 0.08, rz: 0.07 }],
    },
    terrain: {
      flats: [
        { name: 'Ruta de Quito al Cusco', x: 0.35, z: 0.3, rx: 0.16, rz: 0.12 },
        { name: 'Pampa de Quipaipan', x: 0.65, z: 0.68, rx: 0.09, rz: 0.08 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  timeOfDay: 'morning',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 900, wood: 600, silver: 500, stone: 300 },
  start: {
    buildings: [
      { kind: BuildingKind.FORTRESS, dx: -8, dz: -6 },
      { kind: BuildingKind.FORTRESS, dx: 8, dz: -6 },
    ],
    units: [
      { kind: UnitKind.SOLDIER, dx: 8, dz: -4, count: 1, tag: 'atahualpa' },
      { kind: UnitKind.SOLDIER, dx: 10, dz: 4, count: 12 },
      { kind: UnitKind.MUSKETEER, dx: 6, dz: 10, count: 6 },
      { kind: UnitKind.SCOUT, dx: 4, dz: -8, count: 2 },
      { kind: UnitKind.WORKER, dx: -4, dz: 8, count: 3 },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.6 },
  objectives: [
    {
      id: 'obj_avanzar',
      kind: 'reach',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      title: 'Avanza hacia Quipaipan y presenta batalla',
    },
    {
      id: 'obj_quipaipan',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      time: 90,
      minUnits: 6,
      unitKind: UnitKind.SOLDIER,
      hidden: true,
      requires: 'obj_avanzar',
      title: 'Sostén Quipaipan y captura a Huáscar',
    },
    { id: 'obj_atahualpa', kind: 'protect', entityTag: 'atahualpa', title: 'Mantén con vida a Atahualpa' },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 15 },
      effects: [
        {
          type: 'dialogue',
          text: 'Atahualpa: —El Cusco no reconocerá mi mando mientras Huáscar viva. ¡Avanza a Quipaipan!',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 55 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_quipaipan',
      condition: { type: 'objective', objectiveId: 'obj_avanzar', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'General de Atahualpa: —Huáscar ha reunido su ejército en Quipaipan. ¡Es ahora!',
        },
        { type: 'objective', objectiveId: 'obj_quipaipan', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 8 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { ref: 'enemy', dx: 0, dz: 0 },
          radius: 7,
          objective: 'position',
        },
      ],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 240 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { ref: 'player', dx: 20, dz: 16 },
          radius: 7,
        },
        { type: 'dialogue', text: '¡Refuerzos de Huáscar atacan tu retaguardia!' },
      ],
    },
  ],
};
