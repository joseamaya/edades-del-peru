import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { QUIPAIPAN_HEIGHTFIELD } from '../../../model/defs/quipaipanHeightmap';
import type { MissionDef } from '../../types';
import { CUSCO_INCA_MAP_SIZE, cuscoIncaLength } from '../../../model/defs/cuscoIncaSite';

// The army's camp on the Quito road: the relief column cuts it off and marches on it.
const QUIPAIPAN_CAMP = { ref: 'player' as const, dx: 0, dz: 0 };
/** Atahualpa's camp on the Quito road, the Quipaipan pampa and Huáscar's headquarters (normalized). */
const QUIPAIPAN_BASE = { x: 0.35, z: 0.3 } as const;
const QUIPAIPAN_FIELD = { x: 0.65, z: 0.68 } as const;
// East of the Cusco plaza, past its kancha walls: at 0.71 the headquarters stood inside the east house.
const QUIPAIPAN_HQ = { x: 0.75, z: 0.68 } as const;
// Behind the line, on the Quito road: the column that was following the army cuts the camp off.
const QUIPAIPAN_REAR_COLUMN = { ref: 'player' as const, dx: -cuscoIncaLength(26), dz: -cuscoIncaLength(22) };

/** A normalized layout point, or an offset from the camp, in world metres for the cinema map. */
const world = (p: { x: number; z: number }) => ({ x: p.x * CUSCO_INCA_MAP_SIZE, z: p.z * CUSCO_INCA_MAP_SIZE });
const fromCamp = (p: { dx: number; dz: number }) => ({
  x: QUIPAIPAN_BASE.x * CUSCO_INCA_MAP_SIZE + p.dx,
  z: QUIPAIPAN_BASE.z * CUSCO_INCA_MAP_SIZE + p.dz,
});

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
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The march,
  // Huáscar's headquarters and the column that cuts the Quito road are the mission's own points. The intro states
  // the battle, not its outcome: the capture of Huáscar and Cajamarca belong to the act cards and the epilogue.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Cusco–Quito · 1529–1532',
      title: 'La Guerra Civil',
      text: 'Tras la muerte de Huayna Cápac, el Tahuantinsuyo se divide entre Huáscar, en el Cusco, y Atahualpa, en Quito. La guerra civil enfrenta a los dos ejércitos incas por el trono.',
      seconds: 11,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      image: 'media/cusco-inca/cine-cusco.webp',
      motion: 'push',
    },
    {
      kicker: 'Quipaipan · 1532',
      title: 'La batalla',
      text: 'Los generales de Atahualpa bajan por la ruta de Quito hacia Quipaipan, donde Huáscar ha reunido su ejército. A la retaguardia, sus columnas pueden cortar el camino. La pampa es el objetivo; el centro del Cusco, no.',
      seconds: 13,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      map: {
        // From the camp on the Quito road to Huáscar's headquarters beyond the pampa.
        view: { x: 44, z: 40, size: 152 },
        marks: [
          { ...world(QUIPAIPAN_BASE), label: 'Ruta de Quito', side: 'place' },
          { ...world(QUIPAIPAN_FIELD), label: 'Quipaipan', side: 'place' },
          { ...world(QUIPAIPAN_BASE), label: 'Quizquiz', side: 'player', delay: 0.6 },
          { ...world(QUIPAIPAN_HQ), label: 'Huáscar', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Ejército de Atahualpa',
            points: [world(QUIPAIPAN_BASE), world(QUIPAIPAN_FIELD)],
            delay: 1.6,
            draw: 2.8,
          },
          {
            side: 'enemy',
            label: 'Columna del Cusco',
            dashed: true,
            points: [fromCamp(QUIPAIPAN_REAR_COLUMN), fromCamp(QUIPAIPAN_CAMP)],
            delay: 5,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Presenta batalla',
      text: 'Quizquiz manda la vanguardia. Avanza hacia Quipaipan, sostén la pampa con la línea de guerreros y mantén con vida al general: el Cusco no reconocerá a Atahualpa mientras Huáscar resista.',
      seconds: 11,
      source: 'docs/historia/campanas/guerra_civil_inca.md',
      image: 'media/cusco-inca/cine-quipaipan.webp',
      motion: 'pan-right',
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
      { text: 'Quipaipan', x: QUIPAIPAN_FIELD.x, z: QUIPAIPAN_FIELD.z, kind: 'region' },
      { text: 'Ejército de Huáscar', x: QUIPAIPAN_HQ.x, z: QUIPAIPAN_HQ.z, kind: 'region' },
      { text: 'Ruta de Quito', x: QUIPAIPAN_BASE.x, z: QUIPAIPAN_BASE.z, kind: 'region' },
    ],
    base: { x: QUIPAIPAN_BASE.x, z: QUIPAIPAN_BASE.z },
    enemyBase: { x: QUIPAIPAN_HQ.x, z: QUIPAIPAN_HQ.z },
    site: {
      id: 'cusco_inca_site',
      y: 5,
      // Same city, same composition as m_cusco_1536: the bundled GLB is a bare grey ushnu, so both missions
      // hide it and draw the Cusco architecture kit (`model/defs/cuscoCity.ts`).
      hideModel: true,
      heightField: QUIPAIPAN_HEIGHTFIELD,
      focus: { x: QUIPAIPAN_FIELD.x, z: QUIPAIPAN_FIELD.z },
      keepout: [{ x: QUIPAIPAN_FIELD.x, z: QUIPAIPAN_FIELD.z, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: QUIPAIPAN_FIELD.x, z: QUIPAIPAN_FIELD.z, rx: 0.08, rz: 0.07 }],
    },
    terrain: {
      flats: [
        { name: 'Ruta de Quito al Cusco', x: QUIPAIPAN_BASE.x, z: QUIPAIPAN_BASE.z, rx: 0.16, rz: 0.12 },
        { name: 'Pampa de Quipaipan', x: QUIPAIPAN_FIELD.x, z: QUIPAIPAN_FIELD.z, rx: 0.09, rz: 0.08 },
      ],
    },
  },
  mapOverrides: { culturalLandscape: null },
  atmosphere: { fogDensity: 0.001, sunWarmth: 1.0, skyTint: '#c9d2d4' },
  timeOfDay: 'morning',
  startingEra: Era.TAHUANTINSUYO,
  startingResources: { food: 900, wood: 600, silver: 500, stone: 300 },
  start: {
    enemyOpeningUnits: false,
    buildings: [
      { kind: BuildingKind.FORTRESS, dx: -cuscoIncaLength(8), dz: -cuscoIncaLength(6) },
      { kind: BuildingKind.FORTRESS, dx: cuscoIncaLength(8), dz: -cuscoIncaLength(6) },
    ],
    units: [
      { kind: UnitKind.SOLDIER, dx: cuscoIncaLength(8), dz: -cuscoIncaLength(4), count: 1, tag: 'quizquiz' },
      { kind: UnitKind.SOLDIER, dx: cuscoIncaLength(10), dz: cuscoIncaLength(4), count: 12 },
      { kind: UnitKind.INCA_SLINGER, dx: cuscoIncaLength(6), dz: cuscoIncaLength(10), count: 6 },
      { kind: UnitKind.SCOUT, dx: cuscoIncaLength(4), dz: -cuscoIncaLength(8), count: 2 },
      { kind: UnitKind.WORKER, dx: -cuscoIncaLength(4), dz: cuscoIncaLength(8), count: 3 },
    ],
  },
  // Huáscar's field headquarters, not a town: its pressure is the Quipaipan waves and its guard.
  // Huáscar's field command: the guard opens at the headquarters and the AI keeps its strategic offensive,
  // which can pull it toward the player's base after its authored move. The capture is contested while it
  // stands.
  enemy: { active: true, difficulty: 'normal', aggression: 0.6, economy: false },
  // The civil war is fought with Inca melee and slings: no bow, no market and no Amauta conversion.
  allowedUnits: [UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.INCA_WARRIOR, UnitKind.INCA_SLINGER, UnitKind.SCOUT],
  allowedBuildings: [
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.SMELTER,
    BuildingKind.REFINERY,
    BuildingKind.BARRACKS,
    BuildingKind.ARSENAL,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.FORTRESS,
    BuildingKind.INSTITUTE,
  ],
  allowedTechs: ['irrigation_canal', 'andean_loom', 'silver_metallurgy', 'quipus_watchers', 'swift_chasquis'],
  buildingNames: {
    [BuildingKind.FORTRESS]: 'Pucará',
    [BuildingKind.ARSENAL]: 'Casa de armas',
  },
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
      // The capture target is Huáscar's own headquarters: a guard opens at it, so the capture is contested
      // while the guard still stands; the field battle's own offensive may have drawn it out.
      id: 't_guarnicion',
      condition: { type: 'time', seconds: 0.5 },
      effects: [
        {
          type: 'reinforce',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.INCA_SLINGER, count: 3 },
          ],
          pos: { ref: 'enemy', dx: 0, dz: 0 },
          radius: cuscoIncaLength(4),
          // `reinforce` defaults to an attack-move on the player's camp; this garrison opens holding its post,
          // but the AI's strategic offensive can later pull it toward the player's base.
          objective: 'position',
        },
      ],
    },
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
          text: 'Huáscar ha reunido su ejército en Quipaipan. Sostén la pampa con la línea de guerreros y no dejes caer a Quizquiz.',
        },
        {
          type: 'dialogue',
          speaker: 'quizquiz',
          text: '—Huáscar ha reunido su ejército en Quipaipan. ¡Es ahora!',
        },
        { type: 'objective', objectiveId: 'obj_quipaipan', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 8 },
            { kind: UnitKind.INCA_SLINGER, count: 2 },
          ],
          spawn: { ref: 'enemy', dx: -cuscoIncaLength(18), dz: cuscoIncaLength(8) },
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
            { kind: UnitKind.INCA_SLINGER, count: 2 },
          ],
          spawn: QUIPAIPAN_REAR_COLUMN,
          pos: QUIPAIPAN_CAMP,
          target: QUIPAIPAN_CAMP,
          radius: cuscoIncaLength(7),
        },
        { type: 'dialogue', text: '¡Refuerzos de Huáscar cortan el camino de Quito y atacan tu retaguardia!' },
      ],
    },
  ],
};
