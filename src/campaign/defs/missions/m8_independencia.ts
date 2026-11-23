import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import { INDEPENDENCE_MAP_SIZE, independenceLength } from '../../../model/defs/independenceSite';

// The patriot camp (west) and the royalist centre at Ayacucho (east), normalized over the map.
const INDEPENDENCE_CAMP = { x: 0.35, z: 0.63 } as const;
const INDEPENDENCE_ROYALIST = { x: 0.772, z: 0.37 } as const;
// Each royalist column enters from its own side of the field.
const INDEPENDENCE_JUNIN_ENTRY = { ref: 'enemy' as const, dx: 0, dz: 0 };
// Junín is the patriot approach on its own pampa, Ayacucho the royalist field: anchored to the enemy base it
// sat 22 m from Ayacucho and was the same place.
// Far enough from the opening line that no rider starts inside the hold: at 25 m the hold's near edge sat
// 14.6 m from the camp, where the cavalry opens at 13.3 m plus dispersion.
const INDEPENDENCE_JUNIN = { ref: 'player' as const, dx: independenceLength(32), dz: 0 };
const INDEPENDENCE_MARCH = { ref: 'enemy' as const, dx: -independenceLength(45), dz: 0 };
const INDEPENDENCE_AYACUCHO_ENTRY = { ref: 'enemy' as const, dx: 0, dz: -independenceLength(20) };

/** A mission point on the cinema map. The camp and the royalist centre stand on their layout anchors. */
function onMap(p: { ref: 'player' | 'enemy'; dx: number; dz: number }): { x: number; z: number } {
  const anchor = p.ref === 'player' ? INDEPENDENCE_CAMP : INDEPENDENCE_ROYALIST;
  return { x: anchor.x * INDEPENDENCE_MAP_SIZE + p.dx, z: anchor.z * INDEPENDENCE_MAP_SIZE + p.dz };
}
const MAP_CAMP = onMap({ ref: 'player', dx: 0, dz: 0 });
const MAP_AYACUCHO = onMap({ ref: 'enemy', dx: 0, dz: 0 });
const MAP_JUNIN = onMap(INDEPENDENCE_JUNIN);
const MAP_JUNIN_ENTRY = onMap(INDEPENDENCE_JUNIN_ENTRY);
const MAP_MARCH = onMap(INDEPENDENCE_MARCH);
const MAP_AYACUCHO_ENTRY = onMap(INDEPENDENCE_AYACUCHO_ENTRY);

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
      { text: 'Junín', x: INDEPENDENCE_CAMP.x, z: INDEPENDENCE_CAMP.z, kind: 'settlement' },
      { text: 'Ayacucho', x: 0.702, z: 0.37, kind: 'settlement' },
      { text: 'Pampa de Quinua', x: 0.65, z: 0.37, kind: 'region' },
    ],
    base: INDEPENDENCE_CAMP,
    enemyBase: INDEPENDENCE_ROYALIST,
    terrain: {
      // Junín and Ayacucho as high pampas connected by the campaign route.
      flats: [
        { name: 'Pampa de Junín', x: INDEPENDENCE_CAMP.x, z: INDEPENDENCE_CAMP.z, rx: 0.16, rz: 0.12 },
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
    enemyOpeningUnits: false,
    units: [
      // Junín was a cavalry action with no firearms: Sucre rides with the cavalry and the infantry only joins afterwards.
      {
        kind: UnitKind.CAVALRY,
        dx: independenceLength(6),
        dz: -independenceLength(6),
        count: 1,
        tag: 'sucre',
        stance: 'defensivo',
      },
      {
        kind: UnitKind.CAVALRY,
        dx: independenceLength(10),
        dz: -independenceLength(2),
        count: 5,
        stance: 'defensivo',
      },
    ],
  },
  // The player's roster is the cavalry arm of Junín; the infantry, montoneras and artillery are scripted
  // reinforcements for the march and Ayacucho.
  allowedUnits: [UnitKind.WORKER, UnitKind.CAVALRY, UnitKind.SCOUT],
  // The camp is a cavalry camp: no infantry barracks, arsenal, artillery workshop or academy.
  allowedBuildings: [
    BuildingKind.CENTER,
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    BuildingKind.STABLE,
    BuildingKind.FORTRESS,
    BuildingKind.WALL,
    BuildingKind.GATE,
    BuildingKind.TOWER,
    BuildingKind.MARKET,
  ],
  allowedTechs: ['irrigation_canal', 'shock_cavalry'],
  mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
  // The royalist army is a scripted force: it keeps its centre and houses but no peasant economy, and its
  // pressure is the Junín charge, the Ayacucho garrison and the surrender hold.
  enemy: { active: true, difficulty: 'normal', aggression: 1.0, economy: false, attacks: false },
  tutorial: true,
  modelMission: true,
  narrator: 'Antonio José de Sucre',
  // Played as a letterboxed film: two in-engine stills and a campaign map drawn from this terrain. The map
  // resolves the mission's own points (camp, Junín hold, march, Ayacucho hold and the royalist columns'
  // entries) from the layout anchors, so it shows the two fields the player will fight. It does not tell the
  // outcome: the act cards and the epilogue do.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'Sierra del Perú · 1824',
      title: 'La campaña final',
      text: 'San Martín proclamó la independencia en Lima en 1821, pero la sierra sigue en manos realistas. La campaña final se decide allí, con Bolívar y Sucre al mando de los ejércitos libertadores.',
      seconds: 11,
      source: 'docs/historia/campanas/independencia.md',
      image: 'media/independencia/cine-ayacucho.webp',
      motion: 'push',
    },
    {
      kicker: 'Junín y Ayacucho · 1824',
      title: 'Dos campos',
      text: 'El 6 de agosto, en la pampa de Junín, la caballería patriota de Necochea enfrenta a los dragones realistas: no se dispara un solo tiro. Después, el ejército de Sucre marcha al sur, hacia el campo de Ayacucho.',
      seconds: 13,
      source: 'docs/historia/campanas/independencia.md',
      map: {
        // The transect between the patriot camp (x 90) and the royalist centre (x 198, z 95).
        view: { x: 64, z: 48, size: 152 },
        marks: [
          { x: MAP_JUNIN.x, z: MAP_JUNIN.z + 10, label: 'Junín', side: 'place' },
          { x: MAP_AYACUCHO.x - 4, z: MAP_AYACUCHO.z + 10, label: 'Ayacucho', side: 'place' },
          { x: MAP_CAMP.x, z: MAP_CAMP.z + 9, label: 'Sucre', side: 'player', delay: 0.6 },
          { x: MAP_AYACUCHO.x, z: MAP_AYACUCHO.z - 9, label: 'Realistas', side: 'enemy', delay: 1 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Caballería',
            points: [
              { x: MAP_CAMP.x + 6, z: MAP_CAMP.z },
              { x: MAP_JUNIN.x - 4, z: MAP_JUNIN.z },
            ],
            delay: 1.4,
          },
          {
            side: 'enemy',
            label: 'Carga realista',
            points: [
              { x: MAP_JUNIN_ENTRY.x - 4, z: MAP_JUNIN_ENTRY.z + 4 },
              { x: MAP_JUNIN.x + 6, z: MAP_JUNIN.z - 4 },
            ],
            delay: 3,
          },
          {
            side: 'player',
            label: 'Marcha',
            dashed: true,
            points: [
              { x: MAP_JUNIN.x, z: MAP_JUNIN.z - 6 },
              { x: MAP_MARCH.x, z: MAP_MARCH.z },
              { x: MAP_AYACUCHO.x - 12, z: MAP_AYACUCHO.z },
            ],
            delay: 5,
            draw: 3,
          },
          {
            side: 'enemy',
            label: 'Refuerzo',
            dashed: true,
            points: [
              { x: MAP_AYACUCHO_ENTRY.x, z: MAP_AYACUCHO_ENTRY.z },
              { x: MAP_AYACUCHO.x, z: MAP_AYACUCHO.z - 4 },
            ],
            delay: 7.4,
          },
        ],
      },
    },
    {
      kicker: 'Tu mando',
      title: 'Sostén Junín',
      text: 'La caballería de Necochea sostiene Junín; Sucre manda el ejército que marchará a Ayacucho. Mantén vivo a Sucre: sin él no hay campaña.',
      seconds: 10,
      source: 'docs/historia/campanas/independencia.md',
      image: 'media/independencia/cine-junin.webp',
      motion: 'pan-right',
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
      minUnits: 3,
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
            { kind: UnitKind.CAVALRY, count: 1 },
            { kind: UnitKind.REALISTA_DRAGON, count: 1 },
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
        // Junín was cavalry-only. The infantry, the montoneras and the artillery join the army for Ayacucho.
        {
          type: 'reinforce',
          owner: 0,
          units: [
            { kind: UnitKind.RIFLEMAN, count: 10 },
            { kind: UnitKind.PATRIOTA_MONTONERA, count: 2 },
            { kind: UnitKind.ARTILLERY, count: 2 },
          ],
          pos: { ref: 'player', dx: 0, dz: 0 },
          radius: 10,
        },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 3 },
            { kind: UnitKind.CAVALRY, count: 2 },
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
