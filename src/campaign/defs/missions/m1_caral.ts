import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import {
  ASPERO_HERITAGE_PROXY,
  CARAL_MAP_SIZE,
  CARAL_SITE_BUILD_KEEPOUT,
  CARAL_SITE_ORIGIN,
  caralKeepout,
} from '../../../model/defs/sites';
import { CARAL_PLAZA_CENTER } from '../../../model/defs/caralCity';

// The geography of the transect, in world metres: shared by the mission layout, its objectives and the cinema map.
/** Act I base on Áspero's low coastal rise, north of the river mouth. */
const ASPERO_BASE = { x: 42, z: 172 } as const;
/** Opening focus between the base and the Huaca de los Ídolos. */
const ASPERO_OPENING = { x: 42, z: 160 } as const;
/** The communal canal's anchor, on the river's west bank where the lower valley opens to fields. */
const CARAL_CANAL = { x: 52, z: 120 } as const;
/** Intake at the Supe's west bank, then a contour trace past the valley fields (a game abstraction). */
const CARAL_CANAL_PATH = [
  { x: 68.5, z: 118 },
  { x: 62, z: 118.6 },
  { x: 57, z: 119.2 },
  { x: 52, z: 120 },
  { x: 48, z: 121.5 },
  { x: 45, z: 125 },
  { x: 43, z: 130 },
  { x: 41, z: 136 },
  { x: 41.5, z: 145 },
] as const;
/** Act I's valley goal, upriver from the canal. */
const CARAL_VALLEY_REACH = { dx: 36, dz: -10 } as const;
/** The Sacred City's site focus: the Pyramid Mayor's forecourt (what `ref: 'site'` resolves to). */
const CARAL_SITE_FOCUS = { x: 163.84, z: 53.184 } as const;

/** Caral's Act III work turns: a worker holds the site while the communal store feeds the crew. */
const CARAL_WORK_TURN = {
  time: 20,
  // The communal store must stand for the crew to be fed; the food itself comes from the village reserve.
  consume: { resource: 'food', perSecond: 1.5, store: BuildingKind.MILL },
} as const;

export const m1Caral: MissionDef = {
  id: 'm1_caral',
  title: 'La Ciudad Sagrada',
  subtitle: 'Arcaico Tardío · c. 3000–1800 a.C.',
  history:
    'En Áspero, junto al mar, pescadores de anchoveta tejen sus redes con algodón que no crece en la playa. Río arriba, el valle de Supe guarda agua y tierra fértil.\n' +
    'Vive cuatro momentos de una de las ciudades más antiguas de América: el pueblo pesquero, los campos del valle, la construcción de la Ciudad Sagrada y la sequía que llevó a su abandono. No hay guerra documentada.',
  victory:
    'La comunidad sella la Pirámide Mayor y parte hacia la costa. En Vichama, los relieves de barro se interpretan como memoria de la crisis.',
  defeat:
    'El valle no logra sostener a su comunidad. Una de las ciudades más antiguas de América no llega a consolidarse.',
  period: HistoricalPeriod.ARCHAIC,
  tutorial: true,
  modelMission: true,
  // No rulers of Caral are known by name: an anonymous voice of the community tells the story.
  narrator: 'Voz del valle',
  // Saves written before the site phase was persisted restore the latest completed act.
  legacyPhases: [
    { objectiveId: 'a3_shicras', phase: 'fill' },
    { objectiveId: 'a3_muros', phase: 'finished' },
    { objectiveId: 'a3_fuego', phase: 'in_use' },
  ],
  // In-engine recreations (scripts/capture_caral_intro.mjs), never historical photographs.
  epilogueImage: 'media/caral/intro-partida.webp',
  // Played as a letterboxed film (scripts/capture_cinema.mjs): Áspero at dawn, a map of the transect drawn
  // from this mission's own geometry (the base, the canal, the valley goal and the site), then the crew at
  // the Pyramid Mayor. There is no documented war, so the map has no enemy: only the way up the valley and
  // the water. It does not tell the drought or the departure: the act cards and the epilogue do.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'VALLE DE SUPE · c. 3000 a.C.',
      title: 'Gente del mar',
      text: 'En Áspero, donde el río Supe llega al océano, los pescadores sacan anchoveta con redes de algodón y flotadores de mate. Pero el algodón y los mates no crecen en la playa.',
      seconds: 11,
      source: 'docs/historia/campanas/caral.md',
      image: 'media/caral/cine-aspero.webp',
      motion: 'push',
    },
    {
      kicker: 'RÍO ARRIBA',
      title: 'El valle',
      text: 'Tierra adentro, el río corre entre sauces y huarangos. Con canales, el valle puede dar algodón, mates, zapallos y frijoles: lo que la costa necesita. Más arriba, sobre una terraza del desierto, se levantará Caral.',
      seconds: 12,
      source: 'docs/historia/campanas/caral.md',
      map: {
        // The transect from the beach at Áspero to the Sacred City on its terrace.
        view: { x: 16, z: 28, size: 168 },
        marks: [
          { x: ASPERO_HERITAGE_PROXY.x, z: ASPERO_HERITAGE_PROXY.z - 10, label: 'Áspero', side: 'place' },
          {
            x: CARAL_CANAL.x + CARAL_VALLEY_REACH.dx,
            z: CARAL_CANAL.z + CARAL_VALLEY_REACH.dz - 6,
            label: 'Valle de Supe',
            side: 'place',
          },
          { x: CARAL_SITE_FOCUS.x, z: CARAL_SITE_FOCUS.z - 10, label: 'Caral', side: 'place' },
          { x: ASPERO_BASE.x + 2, z: ASPERO_BASE.z + 8, label: 'Comunidad', side: 'player', delay: 0.6 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Río arriba',
            points: [
              { x: ASPERO_OPENING.x, z: ASPERO_OPENING.z },
              CARAL_CANAL_PATH[CARAL_CANAL_PATH.length - 1],
              { x: CARAL_CANAL.x, z: CARAL_CANAL.z },
              { x: CARAL_CANAL.x + CARAL_VALLEY_REACH.dx, z: CARAL_CANAL.z + CARAL_VALLEY_REACH.dz },
            ],
            delay: 1.2,
          },
          {
            side: 'player',
            label: 'Canal',
            dashed: true,
            points: [...CARAL_CANAL_PATH],
            delay: 3.6,
            draw: 1.8,
          },
          {
            side: 'player',
            dashed: true,
            points: [
              { x: CARAL_CANAL.x + CARAL_VALLEY_REACH.dx, z: CARAL_CANAL.z + CARAL_VALLEY_REACH.dz },
              { x: CARAL_SITE_FOCUS.x, z: CARAL_SITE_FOCUS.z + 6 },
            ],
            delay: 5.6,
          },
        ],
      },
    },
    {
      kicker: 'TU COMUNIDAD',
      title: 'Una ciudad hecha por todos',
      text: 'No se conocen los nombres de sus autoridades: la ciudad la levantó el trabajo organizado de generaciones. Pesca, abre el canal, guarda excedente y levanta la Pirámide Mayor, plataforma sobre plataforma.',
      seconds: 11,
      source: 'docs/historia/campanas/caral.md',
      image: 'media/caral/cine-obra.webp',
      motion: 'pan-right',
    },
  ],
  playerCiv: CivId.CARAL,
  enemyCiv: CivId.CARAL,
  // A compressed west-to-east transect of the Supe valley (scripts/build_caral_heightmap.py).
  region: 'central_coast',
  map: { seed: 3000, type: 'coast', size: CARAL_MAP_SIZE },
  // Light coastal haze: denser fog washed the green valley out from the RTS camera.
  atmosphere: { fogDensity: 0.0015, sunWarmth: 0.9, skyTint: '#cdd3d2' },
  layout: {
    // Geography of the west-to-east transect (docs/historia/campanas/caral.md, mapas.md):
    // the Supe runs south past Caral, then west through the wetlands to the Pacific. The sea
    // strip is too narrow for a readable label, so only the river, valley and settlements are named.
    labels: [
      { text: 'Río Supe', x: 70 / CARAL_MAP_SIZE, z: 100 / CARAL_MAP_SIZE, kind: 'water' },
      { text: 'Valle de Supe', x: 104 / CARAL_MAP_SIZE, z: 138 / CARAL_MAP_SIZE, kind: 'region' },
      { text: 'Áspero', x: 44 / CARAL_MAP_SIZE, z: 160 / CARAL_MAP_SIZE, kind: 'settlement' },
      {
        text: 'Caral',
        x: CARAL_SITE_ORIGIN.x / CARAL_MAP_SIZE,
        z: CARAL_SITE_ORIGIN.z / CARAL_MAP_SIZE,
        kind: 'settlement',
      },
    ],
    // Act I starts at Áspero, on its low coastal rise north of the river mouth. The opening
    // focus sits between the base and the Huaca de los Ídolos so its summit reads from the start.
    base: { x: ASPERO_BASE.x / CARAL_MAP_SIZE, z: ASPERO_BASE.z / CARAL_MAP_SIZE },
    opening: { x: ASPERO_OPENING.x / CARAL_MAP_SIZE, z: ASPERO_OPENING.z / CARAL_MAP_SIZE },
    // Anchoveta shoals off Áspero (sea, west) only: the Supe is dry most of the year, so the game
    // has no permanent river banks (docs/historia/campanas/caral.md). Sea anchors sit north of the
    // base so the opening camera shows them above the minimap (issue 378).
    fishing: [
      { x: 16.5 / CARAL_MAP_SIZE, z: 166.5 / CARAL_MAP_SIZE },
      { x: 15.5 / CARAL_MAP_SIZE, z: 162.5 / CARAL_MAP_SIZE },
      { x: 18.5 / CARAL_MAP_SIZE, z: 173.5 / CARAL_MAP_SIZE },
    ],
    // Act IV departure marker on the open beach south of the anchoveta banks; fishing placement
    // keeps this clear so fishers working the shoals cannot satisfy the hold by presence alone.
    departure: { x: 26 / CARAL_MAP_SIZE, z: 190 / CARAL_MAP_SIZE },
    discoveries: [
      { heritageId: 'aspero_huaca_idolos', initial: true },
      // Act III reveals the city with the camera (wide enough for the label and the whole upper half);
      // walking there early still rewards the scout.
      { heritageId: 'caral_pyramid_mayor', radius: 55 },
    ],
    site: {
      id: 'caral_site',
      y: 8,
      focus: { x: CARAL_SITE_FOCUS.x / CARAL_MAP_SIZE, z: CARAL_SITE_FOCUS.z / CARAL_MAP_SIZE },
      keepout: [caralKeepout({ x: 0.52, z: 0.45, rx: 0.27, rz: 0.43 })],
      buildKeepout: [...CARAL_SITE_BUILD_KEEPOUT],
      // The Pyramid Mayor starts as its earliest platform; act III builds the later phases.
      phase: 'foundation',
    },
    canal: {
      name: 'Canal comunal del valle',
      // On the river's west bank, where the lower valley opens to fields.
      x: CARAL_CANAL.x / CARAL_MAP_SIZE,
      z: CARAL_CANAL.z / CARAL_MAP_SIZE,
      length: 18,
      // Intake at the Supe's west bank, then a contour trace past the valley fields. The exact
      // trace is a game abstraction; the sources document irrigation canals without a mapped line.
      path: CARAL_CANAL_PATH.map((p) => ({ x: p.x / CARAL_MAP_SIZE, z: p.z / CARAL_MAP_SIZE })),
      width: 1.8,
      initiallyOpen: false,
      irrigation: true,
      heritageId: 'caral_canal',
      // The gate answers once the fields are ready; before that it would complete the goal on sight.
      lockedUntilObjective: 'a2_canal',
    },
  },
  mapOverrides: {
    terrain: { terraceChance: 0.08, riverCount: 0 },
    climate: { aridity: 0.78, moisture: 0.34 },
    // Only the kit-backed species: molle and pacay have no Blender tree kit and read as a different
    // art style. The pacae shrub is the food node instead (docs/historia/campanas/caral.md).
    vegetation: { density: 0.06, variants: { algarrobo: 0.7, sauce: 0.3, molle: 0, pacay: 0 } },
    berryShrub: 'pacae',
    quarryStyle: 'granodiorite',
    // Caral has no documented silver extraction or coastal vicuña herds.
    // The 256 m transect keeps the former tree count: groves on the floodplain, none on beach or marsh,
    // and the scattered quarries stay at the former 192 m map's count.
    resources: { tree: 0.12, mine: 0, hunt: 0, scatter: 0.56 },
    culturalLandscape: null,
    groundTint: '#b7ab96',
  },
  guaranteedFishing: 8,
  timeOfDay: 'morning',
  startingEra: Era.FORMATIVE,
  // Three quarters of the skirmish speed: the 256 m transect still reads as travel without the walk dragging
  // (see caral-model-mission.md §Pacing and map scale).
  unitSpeedScale: 0.75,
  // Silver has no role in Caral; stone for the monuments comes from the hills.
  startingResources: { food: 150, wood: 150, silver: 0, stone: 0 },
  start: {},
  enemy: { active: false, difficulty: 'easy', aggression: 0 },
  // Caral-Supe: no metallurgy, no documented war and no permanent market (fairs were temporary), so the
  // player builds dwellings, storehouses and fields, and trains workers and scouts only.
  allowedBuildings: [BuildingKind.HOUSE, BuildingKind.MILL, BuildingKind.FARM],
  allowedUnits: [UnitKind.WORKER, UnitKind.SCOUT],
  // The canal gate is the irrigation mechanic; the generic «Canal de Regadío» tech would duplicate it.
  allowedTechs: ['cotton_nets', 'caral_shicras', 'caral_trade'],
  // «Troje» is a highland-storage word and «Plaza Mayor» a colonial urban term; Caral's fields were
  // chacras in the irrigated valley and its store a communal deposit.
  buildingNames: {
    [BuildingKind.CENTER]: 'Recinto comunal',
    [BuildingKind.MILL]: 'Depósito comunal',
  },
  buildingIcons: {
    [BuildingKind.CENTER]: '🏘️',
    [BuildingKind.FARM]: '🌱',
  },
  objectives: [
    // --- Act I: Áspero, the fishing village ---
    {
      id: 'a1_pesca',
      kind: 'gather',
      resource: 'food',
      fromNode: 'fishing',
      count: 300,
      title: 'Acto I · Reúne 300 de comida pescando en el litoral de Áspero',
    },
    {
      id: 'a1_valle',
      kind: 'reach',
      pos: { ref: 'canal', ...CARAL_VALLEY_REACH },
      radius: 12,
      hidden: true,
      title: 'Acto I · Remonta el río Supe hasta el valle',
    },
    {
      id: 'a1_huaca',
      kind: 'inspect',
      heritageIds: ['aspero_huaca_idolos'],
      optional: true,
      title: 'Acto I · Visita la Huaca de los Ídolos de Áspero',
    },
    // --- Act II: the Supe valley ---
    {
      id: 'a2_campos',
      kind: 'build',
      buildingKind: BuildingKind.FARM,
      count: 2,
      pos: { ref: 'canal', dx: 0, dz: 0 },
      radius: 28,
      hidden: true,
      title: 'Acto II · Prepara dos campos de algodón y zapallo junto al canal',
    },
    {
      id: 'a2_canal',
      kind: 'canal_open',
      hidden: true,
      title: 'Acto II · Abre la compuerta del canal comunal',
    },
    {
      id: 'a2_troje',
      kind: 'build',
      buildingKind: BuildingKind.MILL,
      count: 1,
      hidden: true,
      title: 'Acto II · Construye un depósito comunal',
    },
    {
      id: 'a2_redes',
      kind: 'research',
      tech: 'cotton_nets',
      hidden: true,
      title: 'Acto II · Teje redes de algodón en el depósito comunal para los pescadores de Áspero',
    },
    {
      id: 'a2_excedente',
      kind: 'gather',
      resource: 'food',
      count: 500,
      hidden: true,
      title: 'Acto II · Guarda un excedente de 500 de comida',
    },
    // --- Act III: building the Sacred City ---
    {
      id: 'a3_shicras',
      kind: 'deliver',
      resource: 'wood',
      count: 120,
      step: 50,
      heritageId: 'caral_pyramid_mayor',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 20,
      hidden: true,
      title: 'Acto III · Entrega 120 de madera para las shicras de la Pirámide Mayor',
    },
    {
      id: 'a3_obra_relleno',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      ...CARAL_WORK_TURN,
      unitKind: UnitKind.WORKER,
      requires: 'a3_shicras',
      afterPhase: 'fill',
      hidden: true,
      title: 'Acto III · Rellena la plataforma con shicras (el depósito comunal alimenta a la cuadrilla)',
    },
    {
      id: 'a3_muros',
      kind: 'deliver',
      resource: 'stone',
      count: 120,
      step: 50,
      heritageId: 'caral_pyramid_mayor',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 20,
      hidden: true,
      title: 'Acto III · Entrega 120 de piedra para los muros de contención',
    },
    {
      id: 'a3_obra_muros',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      ...CARAL_WORK_TURN,
      unitKind: UnitKind.WORKER,
      requires: 'a3_muros',
      afterPhase: 'finished',
      hidden: true,
      title: 'Acto III · Levanta los muros de contención (el depósito comunal alimenta a la cuadrilla)',
    },
    {
      id: 'a3_fuego',
      kind: 'hold',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 18,
      time: 20,
      unitKind: UnitKind.WORKER,
      hidden: true,
      title: 'Acto III · Reúne a la comunidad junto a la Pirámide Mayor para la ofrenda del fuego',
    },
    {
      id: 'obj_complejos',
      kind: 'inspect',
      heritageIds: [
        'caral_pyramid_mayor',
        'caral_pyramid_central',
        'caral_pyramid_quarry',
        'caral_pyramid_lesser',
        'caral_pyramid_gallery',
        'caral_pyramid_huanca',
      ],
      optional: true,
      hidden: true,
      // The pyramids only stand once the walls are finished, and the visit is a walk through them,
      // not a click from the beach.
      requires: 'a3_obra_muros',
      inspectRadius: 8,
      title: 'Acto III · Recorre los seis complejos piramidales de Caral Alto',
    },
    {
      id: 'obj_asamblea',
      kind: 'hold',
      // The plaza's authored world point. `ref: 'site'` resolves to the intro camera focus (the Mayor's
      // forecourt), which is what put the assembly marker on the pyramid's stair.
      pos: { dx: CARAL_PLAZA_CENTER.x, dz: CARAL_PLAZA_CENTER.z },
      radius: 18,
      time: 20,
      unitKind: UnitKind.WORKER,
      requires: 'a2_excedente',
      hidden: true,
      optional: true,
      // Announced with Act III (listed in the panel and called from the pyramid card), but the
      // assembly only starts when the player calls it.
      awaitsCall: true,
      title: 'Acto III · Convoca una asamblea comunal en la Plaza Central',
    },
    {
      id: 'a3_prosperidad',
      kind: 'wait',
      time: 20,
      hidden: true,
      title: 'Acto III · La ciudad en uso: feria, peregrinos y fuego sagrado',
    },
    // --- Act IV: the drought ---
    {
      id: 'a4_sellar',
      kind: 'deliver',
      resource: 'stone',
      count: 100,
      step: 50,
      heritageId: 'caral_pyramid_mayor',
      pos: { ref: 'site', dx: 0, dz: 0 },
      radius: 20,
      hidden: true,
      title: 'Acto IV · Sella la Pirámide Mayor bajo piedra',
    },
    {
      id: 'a4_partida',
      kind: 'hold',
      // A dedicated beach marker south of the fishing banks: the fishers working the anchoveta
      // shoals must not complete the departure on their own.
      pos: { ref: 'departure', dx: 0, dz: 0 },
      radius: 10,
      time: 15,
      minUnits: 3,
      unitKind: UnitKind.WORKER,
      hidden: true,
      title: 'Acto IV · Reúne a la comunidad (3 obreros) en la playa para partir hacia Vichama',
    },
  ],
  triggers: [
    {
      id: 't_a1_inicio',
      condition: { type: 'time', seconds: 4 },
      effects: [
        {
          type: 'dialogue',
          text: 'Somos gente del mar. La anchoveta nos alimenta, pero las redes se gastan: el algodón y los mates crecen en el valle, río arriba.',
          duration: 8,
        },
      ],
    },
    {
      id: 't_a1_pesca',
      condition: { type: 'objective', objectiveId: 'a1_pesca', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Hay pescado de sobra. Que un explorador remonte el río Supe y busque tierra fértil en el valle para el algodón.',
        },
        { type: 'objective', objectiveId: 'a1_valle', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a2_acto',
      condition: { type: 'objective', objectiveId: 'a1_valle', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto II · Generaciones después',
          title: 'El valle de Supe',
          image: 'media/caral/intro-valle.webp',
          text: 'Río arriba, el bosque de sauces y huarangos bordea un río que corre pocos meses al año. Con canales, el valle da algodón, mates, zapallos y frijoles; el pescado sube desde la costa y el algodón baja hacia las redes.',
        },
        { type: 'objective', objectiveId: 'a2_campos', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a2_campos',
      condition: { type: 'objective', objectiveId: 'a2_campos', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Los campos esperan el agua. Abre la compuerta del canal: la tierra húmeda rinde más.',
        },
        { type: 'objective', objectiveId: 'a2_canal', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a2_canal',
      condition: { type: 'objective', objectiveId: 'a2_canal', state: 'completed' },
      effects: [
        // Summer flood: the Supe rises with the sierra rains (the drought reverses it in act IV). The lomas
        // green with winter fog separately; the visual event tints both as a shorthand.
        { type: 'environment', event: 'wet_season' },
        {
          type: 'dialogue',
          text: 'La crecida del Supe cubre la vega y el agua corre por el canal; ahora hace falta un depósito comunal para guardar lo que sobra.',
        },
        { type: 'objective', objectiveId: 'a2_troje', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a2_troje',
      condition: { type: 'objective', objectiveId: 'a2_troje', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'El algodón del valle baja a la costa; con él, Áspero teje sus redes. El pescado sube a cambio.',
        },
        { type: 'objective', objectiveId: 'a2_redes', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a2_redes',
      condition: { type: 'objective', objectiveId: 'a2_redes', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Redes nuevas, más pesca; más pesca, más brazos para el valle. Con excedente, la comunidad puede dedicar brazos a obras que duran generaciones.',
        },
        { type: 'objective', objectiveId: 'a2_excedente', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_acto',
      condition: { type: 'objective', objectiveId: 'a2_excedente', state: 'completed' },
      effects: [
        {
          type: 'act',
          kicker: 'Acto III · c. 2600 a.C.',
          title: 'La Ciudad Sagrada',
          image: 'media/caral/intro-obra.webp',
          text: 'Sobre la terraza desértica, a salvo de las crecidas, el pueblo levanta la Pirámide Mayor por fases. Las shicras —bolsas de fibra llenas de piedras— rellenan cada plataforma.',
        },
        {
          type: 'dialogue',
          text: 'Mientras se levanta la Pirámide Mayor, la comunidad ya puede reunirse en la Plaza Central: convoca la asamblea desde la ficha de la pirámide.',
        },
        { type: 'camera', pos: { ref: 'site', dx: 0, dz: 0 } },
        // The camera opens on the city: clear its fog with the discovery animation, not a black screen.
        { type: 'reveal', heritageId: 'caral_pyramid_mayor' },
        { type: 'objective', objectiveId: 'a3_shicras', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_shicras',
      condition: { type: 'objective', objectiveId: 'a3_shicras', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Las shicras están listas. Reúne a la cuadrilla en la pirámide: la obra consume el excedente del depósito comunal.',
        },
        { type: 'objective', objectiveId: 'a3_obra_relleno', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_obra_relleno',
      condition: { type: 'objective', objectiveId: 'a3_obra_relleno', state: 'completed' },
      effects: [
        { type: 'ritual', pos: { ref: 'site', dx: 0, dz: 0 } },
        { type: 'site_phase', phase: 'fill' },
        {
          type: 'dialogue',
          text: 'Bajo la nueva plataforma, la comunidad entierra las ofrendas quemadas antes de levantar la siguiente. Faltan los muros de piedra que la contienen.',
        },
        { type: 'objective', objectiveId: 'a3_muros', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_muros',
      condition: { type: 'objective', objectiveId: 'a3_muros', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'La piedra está lista. Otra vez el depósito comunal debe sostener a la cuadrilla mientras se levantan los muros.',
        },
        { type: 'objective', objectiveId: 'a3_obra_muros', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_obra_muros',
      condition: { type: 'objective', objectiveId: 'a3_obra_muros', state: 'completed' },
      effects: [
        { type: 'ritual', pos: { ref: 'site', dx: 0, dz: 0 } },
        { type: 'site_phase', phase: 'finished' },
        {
          type: 'dialogue',
          text: 'La pirámide está enlucida y pintada. Antes de usarla, la comunidad se reúne a quemar ofrendas en el fuego sagrado.',
        },
        { type: 'objective', objectiveId: 'a3_fuego', state: 'activate', announce: true },
        // All six complexes stand now, so the tour can be announced with something to visit.
        { type: 'objective', objectiveId: 'obj_complejos', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a3_feria',
      condition: { type: 'objective', objectiveId: 'a3_fuego', state: 'completed' },
      effects: [
        // The city lives before it dies: the fair, the pilgrims, the sacred fire and the painted
        // Mayor exist from this phase, not from the drought that closes it.
        { type: 'site_phase', phase: 'in_use' },
        {
          type: 'dialogue',
          text: 'La ciudad está en uso; se abren las tiendas de la feria, llegan peregrinos de los valles y el fuego sagrado arde en la cima.',
        },
        { type: 'objective', objectiveId: 'a3_prosperidad', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a4_acto',
      condition: { type: 'objective', objectiveId: 'a3_prosperidad', state: 'completed' },
      effects: [
        { type: 'environment', event: 'drought' },
        {
          type: 'act',
          kicker: 'Acto IV · c. 1800 a.C.',
          title: 'La sequía',
          image: 'media/caral/intro-sequia.webp',
          text: 'Tras siglos de vida, el río falla y la arena avanza sobre los campos. La comunidad decide cerrar su ciudad: entierra sus pirámides bajo piedra y parte hacia la costa.',
        },
        { type: 'objective', objectiveId: 'a4_sellar', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a4_sellar',
      condition: { type: 'objective', objectiveId: 'a4_sellar', state: 'completed' },
      effects: [
        // Buried under stone: the fire, the smoke and the fair go out with the phase.
        { type: 'site_phase', phase: 'sealed' },
        {
          type: 'dialogue',
          text: 'La pirámide queda sellada bajo piedra y arena, como un último acto de cuidado. Reúne a la gente en la playa.',
        },
        { type: 'objective', objectiveId: 'a4_partida', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_a1_huaca',
      condition: { type: 'objective', objectiveId: 'a1_huaca', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Nuestros abuelos levantaron esta huaca por fases: antes de cada nueva plataforma enterraron ofrendas de arcilla bajo el piso.',
        },
      ],
    },
    {
      id: 't_complejos',
      condition: { type: 'objective', objectiveId: 'obj_complejos', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          text: 'Seis complejos piramidales. La escala se asocia al excedente y al trabajo comunal; es una interpretación arqueológica, no un registro escrito.',
        },
      ],
    },
  ],
};
