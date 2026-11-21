import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { INDEPENDENCE_MAP_SIZE, independenceLength } from '../../../model/defs/independenceSite';

// Each royalist column enters from its own side of the field.
const INDEPENDENCE_JUNIN_ENTRY = { ref: 'enemy' as const, dx: 0, dz: 0 };
// Junín is the approach and Ayacucho the final field: at 30 m they were the same place.
const INDEPENDENCE_JUNIN = { ref: 'enemy' as const, dx: -independenceLength(90), dz: 0 };
const INDEPENDENCE_MARCH = { ref: 'enemy' as const, dx: -independenceLength(45), dz: 0 };
const INDEPENDENCE_AYACUCHO_ENTRY = { ref: 'enemy' as const, dx: 0, dz: -independenceLength(20) };

export const m8Independencia: MissionDef = {
  id: 'm8_independencia',
  commanders: ['sucre'],
  title: 'La Independencia',
  subtitle: 'Junín–Ayacucho · 1824',
  history:
    'San Martín proclama la independencia en Lima en 1821. La campaña final se libra en la sierra: la caballería patriota sostiene Junín (6 de agosto de 1824) y, meses después, el ejército de Sucre resiste en Ayacucho (9 de diciembre de 1824).\n' +
    'Sostén Junín, protege a Sucre y resiste en Ayacucho hasta la rendición realista.',
  victory:
    'La victoria de Ayacucho sella la independencia del Perú; el último bastión realista resistirá en el Callao hasta 1826.',
  defeat: 'La campaña de la sierra se pierde y la independencia queda en suspenso.',
  period: HistoricalPeriod.INDEPENDENCE,
  playerCiv: CivId.PATRIOTAS,
  enemyCiv: CivId.REALISTAS,
  map: { seed: 1824, type: 'andes', size: INDEPENDENCE_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  layout: {
    labels: [
      { text: 'Junín', x: 0.35, z: 0.63, kind: 'settlement' },
      { text: 'Ayacucho', x: 0.702, z: 0.37, kind: 'settlement' },
      { text: 'Pampa de Quinua', x: 0.65, z: 0.37, kind: 'region' },
    ],
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
  region: 'high_andes',
  mapOverrides: { culturalLandscape: null },
  atmosphere: { fogDensity: 0.001, sunWarmth: 1.0, skyTint: '#c9d2d4' },
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  startingResources: { food: 1200, wood: 800, silver: 1200, stone: 500 },
  start: {
    units: [
      { kind: UnitKind.RIFLEMAN, dx: independenceLength(6), dz: -independenceLength(6), count: 1, tag: 'sucre' },
      { kind: UnitKind.RIFLEMAN, dx: independenceLength(6), dz: -independenceLength(6), count: 10 },
      { kind: UnitKind.CAVALRY, dx: independenceLength(10), dz: -independenceLength(2), count: 5 },
      { kind: UnitKind.PATRIOTA_MONTONERA, dx: independenceLength(12), dz: -independenceLength(2), count: 2 },
      { kind: UnitKind.ARTILLERY, dx: independenceLength(4), dz: independenceLength(8), count: 2 },
    ],
  },
  mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'normal', aggression: 1.0 },
  tutorial: true,
  modelMission: true,
  narrator: 'Antonio José de Sucre',
  intro: [
    {
      kicker: 'LIMA · 28 DE JULIO DE 1821',
      title: 'La independencia',
      text: 'San Martín proclama la independencia en Lima. La campaña final se decide en la sierra, con Bolívar y Sucre al mando de los ejércitos libertadores.',
      seconds: 9,
      source: 'docs/historia/campanas/independencia.md',
      image: 'media/independencia/intro-lima.webp',
    },
    {
      kicker: 'JUNÍN · 6 DE AGOSTO DE 1824',
      title: 'La caballería',
      text: 'En la pampa de Junín, la caballería patriota —con montoneras— sostiene el choque contra los dragones realistas. La campaña sigue hacia el sur.',
      seconds: 9,
      source: 'docs/historia/campanas/independencia.md',
      image: 'media/independencia/intro-junin.webp',
    },
    {
      kicker: 'AYACUCHO · 9 DE DICIEMBRE DE 1824',
      title: 'La rendición realista',
      text: 'El ejército de Sucre resiste en Ayacucho hasta la rendición realista. La victoria sella la independencia; el Callao resistirá hasta 1826.',
      seconds: 10,
      source: 'docs/historia/campanas/independencia.md',
      image: 'media/independencia/intro-ayacucho.webp',
    },
  ],
  epilogueImage: 'media/independencia/intro-epilogo.webp',
  buildingNames: { [BuildingKind.FORTRESS]: 'Fortín', [BuildingKind.INSTITUTE]: 'Academia' },
  objectives: [
    {
      id: 'obj_junin',
      kind: 'hold',
      pos: INDEPENDENCE_JUNIN,
      radius: independenceLength(14),
      unitKind: UnitKind.CAVALRY,
      time: 90,
      title: 'Sostén Junín con la caballería patriota',
    },
    {
      id: 'obj_marcha',
      kind: 'reach',
      // West of the royalist centre, on walkable pampa: the chapel footprint blocks its own centre.
      pos: INDEPENDENCE_MARCH,
      radius: independenceLength(8),
      hidden: true,
      requires: 'obj_junin',
      title: 'Marcha a Ayacucho con el ejército patriota',
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
      radius: independenceLength(18),
      time: 90,
      hidden: true,
      requires: 'obj_marcha',
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
      id: 't_acto_i',
      condition: { type: 'time', seconds: 12 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · Junín',
          title: 'La caballería patriota',
          image: 'media/independencia/intro-junin.webp',
          text: 'La independencia se decide en la sierra. Sostén Junín con la caballería y protege a Sucre.',
        },
      ],
    },
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: '—La independencia se decide en la sierra. Sostén Junín con la caballería: sin ella no hay ejército.',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 55 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_marcha',
      condition: { type: 'objective', objectiveId: 'obj_marcha', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · Ayacucho',
          title: 'La rendición realista',
          image: 'media/independencia/intro-ayacucho.webp',
          text: 'El ejército de Sucre ocupa Ayacucho. Sostén el campo hasta la rendición realista; Sucre debe seguir con vida.',
        },
        { type: 'objective', objectiveId: 'obj_ayacucho', state: 'activate' },
      ],
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
          spawn: INDEPENDENCE_JUNIN_ENTRY,
          // The charge defends the Junín hold: sharing its constant is what keeps the two in step.
          pos: INDEPENDENCE_JUNIN,
          radius: independenceLength(7),
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
          type: 'act',
          kicker: 'Acto II · La marcha',
          title: 'Hacia Ayacucho',
          image: 'media/independencia/intro-marcha.webp',
          text: 'Junín resiste. Marcha al sur con el ejército patriota: la decisión final espera en Ayacucho.',
        },
        {
          type: 'dialogue',
          text: '—Junín resiste. Ahora, a Ayacucho: la decisión final está allí.',
        },
        { type: 'objective', objectiveId: 'obj_marcha', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.CAVALRY, count: 3 },
          ],
          spawn: INDEPENDENCE_AYACUCHO_ENTRY,
          pos: { ref: 'enemy', dx: 0, dz: 0 },
          radius: independenceLength(7),
          objective: 'position',
        },
      ],
    },
  ],
};
