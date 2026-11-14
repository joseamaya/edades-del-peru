import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m8Independencia: MissionDef = {
  id: 'm8_independencia',
  commanders: ['san_martin', 'bolivar', 'sucre'],
  title: 'La Independencia',
  subtitle: 'Junín–Ayacucho · 1824',
  history:
    'San Martín proclama la independencia en Lima en 1821. La campaña final se libra en la sierra: la caballería patriota sostiene Junín (6 de agosto de 1824) y, meses después, el ejército de Sucre resiste en Ayacucho (9 de diciembre de 1824).\n' +
    'Sostén Junín, protege a Sucre y resiste en Ayacucho hasta la rendición realista.',
  victory: 'La victoria de Ayacucho sella la independencia del Perú y el fin del poder español.',
  defeat: 'La campaña de la sierra se pierde y la independencia queda en suspenso.',
  period: HistoricalPeriod.INDEPENDENCE,
  playerCiv: CivId.PATRIOTAS,
  enemyCiv: CivId.REALISTAS,
  map: { seed: 1824, type: 'andes', size: 192 },
  layout: {
    base: { x: 0.35, z: 0.63 },
    enemyBase: { x: 0.772, z: 0.37 },
    terrain: {
      // Junín and Ayacucho as high pampas connected by the campaign route.
      flats: [
        { name: 'Pampa de Junín', x: 0.35, z: 0.63, rx: 0.16, rz: 0.12 },
        { name: 'Pampa de Ayacucho', x: 0.65, z: 0.37, rx: 0.14, rz: 0.1 },
      ],
    },
    site: {
      id: 'independence_site',
      y: 5,
      focus: { x: 0.702, z: 0.37 },
      keepout: [{ x: 0.702, z: 0.37, rx: 0.075, rz: 0.075 }],
      buildKeepout: [{ x: 0.702, z: 0.37, rx: 0.065, rz: 0.065 }],
    },
  },
  mapOverrides: { culturalLandscape: null },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  startingResources: { food: 1200, wood: 800, silver: 1200, stone: 500 },
  start: {
    units: [
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: -6, count: 1, tag: 'sucre' },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: -6, count: 4 },
      { kind: UnitKind.CAVALRY, dx: 10, dz: -2, count: 3 },
      { kind: UnitKind.PATRIOTA_MONTONERA, dx: 12, dz: -2, count: 2 },
      { kind: UnitKind.ARTILLERY, dx: 4, dz: 8, count: 2 },
    ],
  },
  mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
  tutorial: true,
  objectives: [
    {
      id: 'obj_junin',
      kind: 'hold',
      pos: { ref: 'enemy', dx: -30, dz: 0 },
      radius: 14,
      unitKind: UnitKind.CAVALRY,
      time: 90,
      title: 'Sostén Junín con la caballería patriota',
    },
    {
      id: 'obj_sucre',
      kind: 'protect',
      entityTag: 'sucre',
      title: 'Mantén con vida a Antonio José de Sucre',
    },
    {
      id: 'obj_ayacucho',
      kind: 'hold',
      pos: { ref: 'enemy', dx: 0, dz: 0 },
      radius: 18,
      time: 120,
      hidden: true,
      title: 'Sostén Ayacucho hasta la rendición realista',
    },
    {
      id: 'obj_kill',
      kind: 'destroy',
      entityTag: 'centro_realista',
      optional: true,
      title: 'Toma el mando realista si resiste',
    },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: 'General patriota: —La independencia se decide en la sierra. ¡Sostén Junín y protege a Sucre!',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 55 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 60 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.CAVALRY, count: 2 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
            { kind: UnitKind.SOLDIER, count: 4 },
          ],
          pos: { ref: 'enemy', dx: -30, dz: 0 },
          radius: 7,
          objective: 'position',
        },
        { type: 'dialogue', text: '¡La caballería realista carga en Junín!' },
      ],
    },
    {
      id: 't_junin',
      condition: { type: 'objective', objectiveId: 'obj_junin', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'General patriota: —Junín resiste. Ahora, a Ayacucho: la decisión final está allí.',
        },
        { type: 'objective', objectiveId: 'obj_ayacucho', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.CAVALRY, count: 3 },
          ],
          pos: { ref: 'enemy', dx: 0, dz: 0 },
          radius: 7,
          objective: 'position',
        },
      ],
    },
  ],
};
