import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

export const m9GuerraPacifico: MissionDef = {
  id: 'm9_guerra_pacifico',
  commanders: ['bolognesi'],
  title: 'La Defensa de Arica',
  subtitle: 'Arica · 1880',
  history:
    'Tras el combate de Angamos (8 de octubre de 1879), la Guerra del Pacífico continúa en tierra. En Arica, la guarnición peruana al mando de Francisco Bolognesi resiste el asalto chileno del 7 de junio de 1880.\n' +
    'Defiende el puerto y mantén con vida a Bolognesi hasta que termine el asalto.',
  victory: 'La defensa de Arica resiste el asalto y se convierte en símbolo de la resistencia peruana.',
  defeat: 'Arica cae ante el asalto chileno. La resistencia se pierde y el puerto queda en manos enemigas.',
  period: HistoricalPeriod.REPUBLIC,
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  map: { seed: 1879, type: 'coast', size: 192 },
  region: 'south_coast',
  layout: {
    base: { x: 0.38, z: 0.6 },
    terrain: {
      // The port terrace above the Pacific; the Morro itself is outside the
      // playable height range and is not invented as a new mesh.
      flats: [{ name: 'Terraza portuaria de Arica', x: 0.38, z: 0.6, rx: 0.15, rz: 0.12 }],
    },
    site: {
      id: 'arica_site',
      y: 4,
      focus: { x: 0.702, z: 0.38 },
      keepout: [{ x: 0.702, z: 0.38, rx: 0.09, rz: 0.08 }],
      buildKeepout: [{ x: 0.702, z: 0.38, rx: 0.08, rz: 0.07 }],
    },
  },
  mapOverrides: { culturalLandscape: null },
  timeOfDay: 'dusk',
  startingEra: Era.REPUBLIC,
  startingResources: { food: 1500, wood: 800, silver: 1500, stone: 1200 },
  start: {
    buildings: [{ kind: BuildingKind.FORTRESS, dx: -10, dz: -6, tag: 'puerto' }],
    units: [
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 2, count: 1, tag: 'bolognesi' },
      { kind: UnitKind.RIFLEMAN, dx: 4, dz: 8, count: 4 },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 2, dz: 6, count: 2 },
      { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 4 },
    ],
  },
  mark: [{ tag: 'centro_enemigo', kind: BuildingKind.CENTER, owner: 1 }],
  enemy: { active: true, difficulty: 'hard', aggression: 1.4 },
  tutorial: true,
  // A land defense of the port: no siege train in this scenario.
  epilogueImage: 'media/junta/intro-epilogo.webp',
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.REPUBLICA_DEFENSOR,
    UnitKind.SNIPER,
    UnitKind.HUSSAR,
    UnitKind.CAVALRY,
    UnitKind.SCOUT,
  ],
  objectives: [
    { id: 'obj_puerto', kind: 'protect', entityTag: 'puerto', title: 'Protege el puerto de Arica' },
    {
      id: 'obj_bolognesi',
      kind: 'protect',
      entityTag: 'bolognesi',
      title: 'Mantén con vida a Francisco Bolognesi',
    },
    { id: 'obj_resistir', kind: 'survive', time: 600, title: 'Resiste el asalto hasta la noche' },
    {
      id: 'obj_kill',
      kind: 'destroy',
      entityTag: 'centro_enemigo',
      optional: true,
      title: 'Golpea el mando chileno',
    },
  ],
  triggers: [
    {
      id: 't_dial_0',
      condition: { type: 'time', seconds: 15 },
      effects: [
        {
          type: 'dialogue',
          text: 'Francisco Bolognesi: —Arica no se rinde. ¡A vuestros puestos!',
        },
      ],
    },
    {
      id: 't_cam_1',
      condition: { type: 'time', seconds: 45 },
      effects: [{ type: 'camera', pos: { ref: 'enemy', dx: 0, dz: 0 } }],
    },
    {
      id: 't_wave_1',
      condition: { type: 'time', seconds: 180 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { ref: 'player', dx: 16, dz: 16 },
          radius: 6,
        },
        { type: 'dialogue', text: '¡El asalto chileno se acerca al puerto!' },
      ],
    },
    {
      id: 't_wave_2',
      condition: { type: 'time', seconds: 360 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.CHILE_INFANTE, count: 1 },
            { kind: UnitKind.CAVALRY, count: 1 },
          ],
          pos: { ref: 'player', dx: -12, dz: 20 },
          radius: 7,
        },
        { type: 'dialogue', text: '¡Refuerzos chilenos! ¡Sostén la línea!' },
      ],
    },
    {
      id: 't_wave_3',
      condition: { type: 'time', seconds: 540 },
      effects: [
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 6 },
            { kind: UnitKind.RIFLEMAN, count: 4 },
          ],
          pos: { ref: 'player', dx: 20, dz: -10 },
          radius: 6,
        },
        { type: 'dialogue', text: '¡Último asalto! ¡Arica resiste!' },
      ],
    },
  ],
};
