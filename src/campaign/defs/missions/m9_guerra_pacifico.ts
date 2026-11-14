import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';

// The authored Arica heightfield: sea to the west, the port terrace at (73, 115) and the
// battery site at (135, 73), with the Chilean camp on the northern approach.
const ARICA_BASE = { x: 73, z: 115 } as const;
const ARICA_MINES = { dx: 92, dz: 104 } as const;
const ARICA_CAMP = { x: 0.78, z: 0.22 } as const;

export const m9GuerraPacifico: MissionDef = {
  id: 'm9_guerra_pacifico',
  commanders: ['bolognesi'],
  title: 'La Defensa de Arica',
  subtitle: 'Arica · 1880',
  history:
    'Tras el combate de Angamos (8 de octubre de 1879), la Guerra del Pacífico continúa en tierra. El 7 de junio de 1880 el ejército chileno asalta Arica: la guarnición de Francisco Bolognesi defiende el puerto hasta la caída de la plaza.\n' +
    'Rechaza el parlamento, mina los accesos y sostén la última línea hasta el asalto final. La historia termina con la caída; el epílogo la cuenta.',
  victory:
    'La defensa de Arica cumple su deber: el asalto se cobra la plaza y Bolognesi y sus defensores quedan como símbolo de la resistencia peruana. La historia documentada sigue su curso.',
  defeat:
    'La plaza de Arica cae antes del asalto final y la defensa se deshace. La guarnición no llega a sostener la última línea.',
  period: HistoricalPeriod.REPUBLIC,
  periodNote: 'La misión se sitúa el 7 de junio de 1880',
  narrator: 'Defensores de Arica',
  playerCiv: CivId.REPUBLIC,
  enemyCiv: CivId.CHILE,
  playerName: 'Defensores de Arica',
  enemyName: 'Ejército de Chile',
  map: { seed: 1879, type: 'coast', size: 192 },
  region: 'south_coast',
  layout: {
    base: { x: ARICA_BASE.x / 192, z: ARICA_BASE.z / 192 },
    enemyBase: ARICA_CAMP,
    terrain: {
      // The port terrace above the Pacific; the Morro itself is outside the
      // playable height range and is not invented as a new mesh.
      flats: [{ name: 'Terraza portuaria de Arica', x: ARICA_BASE.x / 192, z: ARICA_BASE.z / 192, rx: 0.15, rz: 0.12 }],
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
  timeOfDay: 'morning',
  startingEra: Era.REPUBLIC,
  startingResources: { food: 1500, wood: 800, silver: 1500, stone: 1200 },
  start: {
    buildings: [
      { kind: BuildingKind.CENTER, dx: 0, dz: 0, tag: 'cuartel' },
      { kind: BuildingKind.FORTRESS, dx: -10, dz: -6, tag: 'puerto' },
    ],
    units: [
      { kind: UnitKind.WORKER, dx: 4, dz: 6, count: 3 },
      { kind: UnitKind.RIFLEMAN, dx: 6, dz: 2, count: 1, tag: 'bolognesi' },
      { kind: UnitKind.RIFLEMAN, dx: 4, dz: 8, count: 4 },
      { kind: UnitKind.REPUBLICA_DEFENSOR, dx: 2, dz: 6, count: 2 },
      { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 4 },
    ],
  },
  enemy: { active: true, difficulty: 'normal', aggression: 0.35 },
  tutorial: true,
  allowedUnits: [
    UnitKind.WORKER,
    UnitKind.SOLDIER,
    UnitKind.RIFLEMAN,
    UnitKind.REPUBLICA_DEFENSOR,
    UnitKind.SNIPER,
    UnitKind.SCOUT,
  ],
  objectives: [
    { id: 'obj_puerto', kind: 'protect', entityTag: 'puerto', title: 'Protege el fuerte y el puerto de Arica' },
    {
      id: 'a1_parlamento',
      kind: 'wait',
      time: 15,
      title: 'Responde al parlamento: Arica no se rinde',
    },
    {
      id: 'a1_minas',
      kind: 'hold',
      pos: ARICA_MINES,
      radius: 7,
      time: 20,
      minUnits: 2,
      unitKind: UnitKind.WORKER,
      hidden: true,
      title: 'Mina los accesos con los zapadores',
    },
    {
      id: 'bonus_bateria',
      kind: 'inspect',
      heritageIds: ['arica_battery'],
      inspectRadius: 16,
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      optional: true,
      title: 'Reconoce la batería de la terraza',
    },
    {
      id: 'a2_bombardeo',
      kind: 'hold',
      pos: { dx: ARICA_BASE.x, dz: ARICA_BASE.z },
      radius: 26,
      time: 60,
      minUnits: 3,
      hidden: true,
      title: 'Sostén el cuartel durante el bombardeo',
    },
    {
      id: 'a2_bolognesi',
      kind: 'protect',
      entityTag: 'bolognesi',
      hidden: true,
      title: 'Mantén con vida a Bolognesi durante el bombardeo',
    },
    {
      id: 'a3_asalto',
      kind: 'hold',
      pos: { dx: ARICA_BASE.x, dz: ARICA_BASE.z },
      radius: 30,
      time: 120,
      minUnits: 4,
      hidden: true,
      title: 'Sostén la última línea hasta el asalto final',
    },
  ],
  triggers: [
    {
      id: 't_intro',
      condition: { type: 'time', seconds: 6 },
      effects: [
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 8,
          text: '—El parlamentario Salvo exige la rendición. Arica no se rinde: defenderemos la plaza hasta quemar el último cartucho.',
        },
      ],
    },
    {
      id: 't_parlamento',
      condition: { type: 'objective', objectiveId: 'a1_parlamento', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 7,
          text: '—Los zapadores minan los accesos. Que cada hombre sostenga su puesto: la batería y el cuartel son la plaza.',
        },
        { type: 'objective', objectiveId: 'a1_minas', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_acto2',
      condition: { type: 'objective', objectiveId: 'a1_minas', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · 7 de junio de 1880',
          title: 'El bombardeo',
          text: 'Al amanecer, la artillería chilena bate la plaza. Los defensores se aferran al cuartel y a la batería mientras la infantería enemiga se concentra para el asalto.',
        },
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 7,
          text: '—Aguantad el cañoneo. Si el cuartel cede, la plaza entera cede con él.',
        },
        { type: 'objective', objectiveId: 'a2_bombardeo', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a2_bolognesi', state: 'activate' },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { dx: 115, dz: 100 },
          radius: 6,
          target: { dx: ARICA_BASE.x, dz: ARICA_BASE.z },
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [{ kind: UnitKind.REPUBLICA_DEFENSOR, count: 2 }],
          pos: { dx: ARICA_BASE.x + 6, dz: ARICA_BASE.z + 6 },
          radius: 4,
        },
      ],
    },
    {
      id: 't_acto3',
      condition: { type: 'objective', objectiveId: 'a2_bombardeo', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · 7 de junio de 1880',
          title: 'El asalto',
          text: 'La infantería chilena asalta la plaza. Bolognesi arenga a los suyos: la resistencia no cambiará el desenlace, pero sí la memoria de Arica.',
        },
        { type: 'objective', objectiveId: 'a2_bolognesi', state: 'complete' },
        { type: 'objective', objectiveId: 'a3_asalto', state: 'activate', announce: true },
        {
          type: 'dialogue',
          speaker: 'bolognesi',
          duration: 8,
          text: '—Sostened la última línea. Que nadie diga que Arica cayó sin pelear.',
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 5 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.CHILE_INFANTE, count: 1 },
          ],
          pos: { dx: 140, dz: 100 },
          radius: 7,
          target: { dx: ARICA_BASE.x, dz: ARICA_BASE.z },
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 4 },
            { kind: UnitKind.RIFLEMAN, count: 2 },
          ],
          pos: { dx: 95, dz: 60 },
          radius: 6,
          target: { dx: ARICA_BASE.x, dz: ARICA_BASE.z },
        },
        {
          type: 'reinforce',
          owner: 0,
          units: [
            { kind: UnitKind.RIFLEMAN, count: 2 },
            { kind: UnitKind.REPUBLICA_DEFENSOR, count: 2 },
          ],
          pos: { dx: ARICA_BASE.x - 6, dz: ARICA_BASE.z + 4 },
          radius: 4,
        },
      ],
    },
  ],
};
