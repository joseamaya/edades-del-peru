import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { QUIPAIPAN_HEIGHTFIELD } from '../../../model/defs/quipaipanHeightmap';
import type { MissionDef } from '../../types';
import { CUSCO_INCA_MAP_SIZE, cuscoIncaLength } from '../../../model/defs/cuscoIncaSite';

export const m6bGuerraCivil: MissionDef = {
  id: 'm6b_guerra_civil',
  commanders: ['atahualpa', 'huascar', 'quizquiz'],
  title: 'La Guerra Civil',
  subtitle: 'Cusco–Quito · 1529–1532',
  history:
    'Tras la muerte de Huayna Cápac, el Tahuantinsuyo se divide entre Huáscar, en el Cusco, y Atahualpa, en Quito. La guerra civil enfrenta a los ejércitos incas por el trono.\n' +
    'Avanza hacia Quipaipan, derrota al ejército de Huáscar y mantén con vida a Quizquiz.',
  victory:
    'El ejército de Atahualpa vence en Quipaipan y captura a Huáscar. La guerra civil deja al Tahuantinsuyo debilitado justo antes de la llegada española.',
  defeat: 'El ejército de Huáscar resiste y el trono del Tahuantinsuyo queda en disputa.',
  period: HistoricalPeriod.LATE_HORIZON,
  tutorial: true,
  modelMission: true,
  narrator: 'Atahualpa',
  intro: [
    {
      kicker: 'CUSCO–QUITO · 1529–1532',
      title: 'La Guerra Civil',
      text: 'Tras la muerte de Huayna Cápac, el Tahuantinsuyo se divide entre Huáscar, en el Cusco, y Atahualpa, en Quito. La guerra civil enfrenta a los dos ejércitos incas por el trono.',
      seconds: 9,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      image: 'media/cusco-inca/intro-guerra.webp',
    },
    {
      kicker: 'QUIPAIPAN · 1532',
      title: 'La batalla',
      text: 'Los generales de Atahualpa derrotan al ejército de Huáscar en Quipaipan. La pampa se sostiene con la línea de guerreros; el centro del Cusco no es el objetivo.',
      seconds: 9,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      image: 'media/cusco-inca/intro-quipaipan.webp',
    },
    {
      kicker: 'LA CAPTURA',
      title: 'El trono y Cajamarca',
      text: 'Huáscar es capturado en Quipaipan. Atahualpa gana la guerra, pero los españoles lo capturan en Cajamarca en 1532: el imperio queda debilitado justo antes de la conquista.',
      seconds: 10,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      image: 'media/cusco-inca/intro-captura.webp',
    },
  ],
  epilogueImage: 'media/cusco-inca/intro-epilogo.webp',
  playerCiv: CivId.INCA,
  enemyCiv: CivId.INCA,
  playerName: 'Ejército de Atahualpa',
  enemyName: 'Ejército de Huáscar',
  playerColor: '#c8a040',
  enemyColor: '#b03028',
  map: { seed: 1532, type: 'andes', size: CUSCO_INCA_MAP_SIZE },
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  region: 'high_andes',
  layout: {
    labels: [
      { text: 'Quipaipan', x: 0.65, z: 0.68, kind: 'region' },
      { text: 'Cusco', x: 0.71, z: 0.68, kind: 'settlement' },
      { text: 'Ruta de Quito', x: 0.35, z: 0.3, kind: 'region' },
    ],
    base: { x: 0.35, z: 0.3 },
    enemyBase: { x: 0.71, z: 0.68 },
    site: {
      id: 'cusco_inca_site',
      y: 5,
      heightField: QUIPAIPAN_HEIGHTFIELD,
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
  atmosphere: { fogDensity: 0.001, sunWarmth: 1.0, skyTint: '#c9d2d4' },
  timeOfDay: 'morning',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 900, wood: 600, silver: 500, stone: 300 },
  start: {
    buildings: [
      { kind: BuildingKind.FORTRESS, dx: -cuscoIncaLength(8), dz: -cuscoIncaLength(6) },
      { kind: BuildingKind.FORTRESS, dx: cuscoIncaLength(8), dz: -cuscoIncaLength(6) },
    ],
    units: [
      { kind: UnitKind.SOLDIER, dx: cuscoIncaLength(8), dz: -cuscoIncaLength(4), count: 1, tag: 'quizquiz' },
      { kind: UnitKind.SOLDIER, dx: cuscoIncaLength(10), dz: cuscoIncaLength(4), count: 12 },
      { kind: UnitKind.MUSKETEER, dx: cuscoIncaLength(6), dz: cuscoIncaLength(10), count: 6 },
      { kind: UnitKind.SCOUT, dx: cuscoIncaLength(4), dz: -cuscoIncaLength(8), count: 2 },
      { kind: UnitKind.WORKER, dx: -cuscoIncaLength(4), dz: cuscoIncaLength(8), count: 3 },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.6 },
  buildingNames: { [BuildingKind.FORTRESS]: 'Pucará' },
  objectives: [
    {
      id: 'obj_avanzar',
      kind: 'reach',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: cuscoIncaLength(18),
      title: 'Avanza hacia Quipaipan y presenta batalla',
    },
    {
      id: 'obj_quipaipan',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: cuscoIncaLength(18),
      time: 90,
      minUnits: 6,
      unitKind: UnitKind.SOLDIER,
      hidden: true,
      requires: 'obj_avanzar',
      title: 'Sostén Quipaipan',
    },
    {
      id: 'obj_captura',
      kind: 'hold',
      // Huáscar's centre, not the pampa marker: the capture is a separate move from the battle line.
      pos: { ref: 'enemy', dx: 0, dz: 0 },
      radius: cuscoIncaLength(8),
      time: 20,
      minUnits: 4,
      hidden: true,
      requires: 'obj_quipaipan',
      title: 'Captura a Huáscar en Quipaipan',
    },
    { id: 'obj_quizquiz', kind: 'protect', entityTag: 'quizquiz', title: 'Mantén con vida a Quizquiz' },
  ],
  triggers: [
    {
      id: 't_acto_i',
      condition: { type: 'time', seconds: 12 },
      effects: [
        {
          type: 'act',
          kicker: 'Acto I · La marcha',
          title: 'Quito contra el Cusco',
          image: 'media/cusco-inca/intro-guerra.webp',
          text: 'El Cusco no reconocerá mi mando mientras Huáscar viva. Avanza a Quipaipan y presenta batalla.',
        },
      ],
    },
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
          type: 'act',
          kicker: 'Acto II · Quipaipan',
          title: 'La pampa',
          image: 'media/cusco-inca/intro-quipaipan.webp',
          text: 'Huáscar ha reunido su ejército en Quipaipan. Sostén la pampa con la línea de guerreros y no dejes caer a Atahualpa.',
        },
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
          radius: cuscoIncaLength(7),
          objective: 'position',
        },
      ],
    },
    {
      id: 't_captura',
      condition: { type: 'objective', objectiveId: 'obj_quipaipan', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · La captura',
          title: 'Huáscar en Quipaipan',
          image: 'media/cusco-inca/intro-captura.webp',
          text: 'El ejército de Huáscar se rompe. Avanza y captura a Huáscar: el centro del Cusco queda intacto.',
        },
        { type: 'objective', objectiveId: 'obj_captura', state: 'activate' },
      ],
    },
    {
      id: 't_victoria',
      condition: { type: 'objective', objectiveId: 'obj_captura', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Huáscar es capturado en Quipaipan. La guerra civil termina, pero Cajamarca espera a Atahualpa.',
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
          pos: { ref: 'player', dx: cuscoIncaLength(20), dz: cuscoIncaLength(16) },
          radius: cuscoIncaLength(7),
        },
        { type: 'dialogue', text: '¡Refuerzos de Huáscar atacan tu retaguardia!' },
      ],
    },
  ],
};
