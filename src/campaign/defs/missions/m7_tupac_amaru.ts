import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m7TupacAmaru: MissionDef = {
  id: 'm7_tupac_amaru',
  commanders: ['tupac_amaru', 'micaela_bastidas'],
  title: 'La Gran Rebelión',
  subtitle: 'Virreinato · 1780–1781',
  history:
    'José Gabriel Condorcanqui, Túpac Amaru II, se alza contra los abusos del Virreinato: la mita, el reparto y los obrajes. Micaela Bastidas organiza el avituallamiento.\n' +
    'Sostén la rebelión y toma el centro de mando realista.',
  victory: 'El centro realista cae. La rebelión sacude el Virreinato y enciende el camino hacia la independencia.',
  defeat: 'La rebelión se ahoga en sangre. El Virreinato perdura una generación más.',
  period: HistoricalPeriod.VICEROYALTY,
  playerCiv: CivId.INCA,
  enemyCiv: CivId.REALISTAS,
  map: { seed: 1780, type: 'andes', size: 192 },
  layout: {
    base: { x: 0.36, z: 0.62 },
    enemyBase: { x: 0.772, z: 0.38 },
    terrain: {
      flats: [
        { name: 'Valle del Cusco', x: 0.36, z: 0.62, rx: 0.15, rz: 0.12 },
        { name: 'Ruta de Sangarará', x: 0.65, z: 0.38, rx: 0.12, rz: 0.1 },
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
      { kind: UnitKind.CAVALRY, dx: 10, dz: -4, count: 2 },
      { kind: UnitKind.ARTILLERY, dx: 6, dz: 10, count: 2 },
      { kind: UnitKind.RIFLEMAN, dx: 4, dz: -6, tag: 'tupac_amaru', count: 1 },
    ],
  },
  mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
  tutorial: true,
  // 1780: no arcabuceros; the rebel and royalist line use muskets and rifles.
  epilogueImage: 'media/junta/intro-epilogo.webp',
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.SNIPER,
    UnitKind.HUSSAR,
    UnitKind.CAVALRY,
    UnitKind.SCOUT,
    UnitKind.ARTILLERY,
    UnitKind.MORTAR,
    UnitKind.MISSIONARY,
  ],
  objectives: [
    {
      id: 'obj_asaltar',
      kind: 'destroy',
      entityTag: 'centro_realista',
      group: 'victoria',
      title: 'Asalta el Cuzco: toma el centro de mando realista',
    },
    {
      id: 'obj_resistir',
      kind: 'survive',
      time: 600,
      group: 'victoria',
      title: 'Resiste el cerco: sostén el cuartel 10 minutos',
    },
    { id: 'obj_tupac', kind: 'protect', entityTag: 'tupac_amaru', title: 'Mantén con vida a Túpac Amaru II' },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 20 },
      effects: [
        {
          type: 'dialogue',
          text: 'Túpac Amaru II: —El Cuzco está a la vista. Podemos asaltarlo de inmediato o cercarlo hasta quebrarlo. ¡Vos decidís!',
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
      condition: { type: 'time', seconds: 300 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.RIFLEMAN, count: 3 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
          ],
          pos: { ref: 'player', dx: 22, dz: 18 },
          radius: 7,
        },
        { type: 'dialogue', text: '¡Refuerzos realistas desde el Cusco!' },
      ],
    },
  ],
};
