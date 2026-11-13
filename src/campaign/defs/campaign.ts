import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../core/types';
import { MissionDef } from '../types';
import {
  CARAL_MAP_SIZE,
  CARAL_SITE_BUILD_KEEPOUT,
  CARAL_SITE_ORIGIN,
  LIMA_SITE_ORIGIN,
  caralKeepout,
} from '../../model/defs/sites';
import { chavinKeepout } from '../../model/defs/chavinCity';

// La Ciudad de los Reyes: the plaza, the Rímac bridge and Quizu's camp in the hills.
const LIMA_CITY = LIMA_SITE_ORIGIN;
const LIMA_BRIDGE = { x: 120, z: 124 } as const;
const LIMA_ENEMY = { x: 205, z: 70 } as const;
const LIMA_CURACAS = { x: 55, z: 200 } as const;
// La Junta del Cusco: the Cusco cabildo, the Apacheta pass, Umachiri and the royalist base.
const JUNTA_CUSCO = { x: 72, z: 58 } as const;
const JUNTA_APACHETA = { x: 140, z: 168 } as const;
const JUNTA_UMACHIRI = { x: 198, z: 214 } as const;
const JUNTA_ENEMY = { x: 222, z: 238 } as const;
// Los hijos de Tambotoco: the cave, the Huanacaure huaca, the valley and Inticancha.
const TAMBOTOCO_CAVE = { x: 40, z: 52 } as const;
const TAMBOTOCO_TAMBO_QUIRO = { x: 70, z: 91 } as const;
const TAMBOTOCO_HUANACAURE = { x: 120, z: 106 } as const;
const TAMBOTOCO_INTICANCHA = { x: 168, z: 190 } as const;
const TAMBOTOCO_ENEMY = { x: 212, z: 200 } as const;
// Absolute metres (no `ref`): the four cancha nodes around Inticancha.
const TAMBOTOCO_CANCHAS = [
  { dx: TAMBOTOCO_INTICANCHA.x - 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x + 12, dz: TAMBOTOCO_INTICANCHA.z },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z - 12 },
  { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z + 12 },
];
const WARI_NODE_A = { ref: 'site' as const, dx: 40, dz: -32 };
const WARI_NODE_B = { ref: 'site' as const, dx: 38, dz: 34 };
const WARI_BONUS_NODE = { ref: 'site' as const, dx: -40, dz: 0 };

/** Caral's Act III work turns: a worker holds the site while the communal store feeds the crew. */
const CARAL_WORK_TURN = {
  time: 20,
  // The communal store must stand for the crew to be fed; the food itself comes from the village reserve.
  consume: { resource: 'food', perSecond: 1.5, store: BuildingKind.MILL },
} as const;

export const MISSIONS: MissionDef[] = [
  {
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
    intro: [
      {
        kicker: 'VALLE DE SUPE · c. 3000 a.C.',
        title: 'Gente del mar',
        text: 'En Áspero, donde el río Supe llega al océano, los pescadores sacan anchoveta con redes de algodón y flotadores de mate. Pero el algodón y los mates no crecen en la playa.',
        seconds: 9,
        source: 'docs/historia/campanas/caral.md',
        image: 'media/caral/intro-aspero.webp',
      },
      {
        kicker: 'RÍO ARRIBA',
        title: 'El valle',
        text: 'Tierra adentro, el río corre entre sauces y huarangos. Con canales, el valle puede dar algodón, mates, zapallos y frijoles: lo que la costa necesita.',
        seconds: 9,
        source: 'docs/historia/campanas/caral.md',
        image: 'media/caral/intro-valle.webp',
      },
      {
        kicker: 'GENERACIONES',
        title: 'Una ciudad hecha por todos',
        text: 'De ese intercambio nacerá, sobre una terraza del desierto, una de las ciudades más antiguas de América. No se conocen los nombres de sus autoridades; la levantó el trabajo organizado de generaciones, plataforma sobre plataforma.',
        seconds: 10,
        source: 'docs/historia/campanas/caral.md',
        image: 'media/caral/intro-ciudad.webp',
      },
    ],
    playerCiv: CivId.CARAL,
    enemyCiv: CivId.CARAL,
    // A compressed west-to-east transect of the Supe valley (scripts/build_caral_heightmap.py).
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
      base: { x: 42 / CARAL_MAP_SIZE, z: 172 / CARAL_MAP_SIZE },
      opening: { x: 42 / CARAL_MAP_SIZE, z: 160 / CARAL_MAP_SIZE },
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
        focus: { x: 163.84 / CARAL_MAP_SIZE, z: 53.184 / CARAL_MAP_SIZE },
        keepout: [caralKeepout({ x: 0.52, z: 0.45, rx: 0.27, rz: 0.43 })],
        buildKeepout: [...CARAL_SITE_BUILD_KEEPOUT],
        // The Pyramid Mayor starts as its earliest platform; act III builds the later phases.
        phase: 'foundation',
      },
      canal: {
        name: 'Canal comunal del valle',
        // On the river's west bank, where the lower valley opens to fields.
        x: 52 / CARAL_MAP_SIZE,
        z: 120 / CARAL_MAP_SIZE,
        length: 18,
        // Intake at the Supe's west bank, then a contour trace past the valley fields. The exact
        // trace is a game abstraction; the sources document irrigation canals without a mapped line.
        path: [
          { x: 68.5 / CARAL_MAP_SIZE, z: 118 / CARAL_MAP_SIZE },
          { x: 62 / CARAL_MAP_SIZE, z: 118.6 / CARAL_MAP_SIZE },
          { x: 57 / CARAL_MAP_SIZE, z: 119.2 / CARAL_MAP_SIZE },
          { x: 52 / CARAL_MAP_SIZE, z: 120 / CARAL_MAP_SIZE },
          { x: 48 / CARAL_MAP_SIZE, z: 121.5 / CARAL_MAP_SIZE },
          { x: 45 / CARAL_MAP_SIZE, z: 125 / CARAL_MAP_SIZE },
          { x: 43 / CARAL_MAP_SIZE, z: 130 / CARAL_MAP_SIZE },
          { x: 41 / CARAL_MAP_SIZE, z: 136 / CARAL_MAP_SIZE },
          { x: 41.5 / CARAL_MAP_SIZE, z: 145 / CARAL_MAP_SIZE },
        ],
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
        pos: { ref: 'canal', dx: 36, dz: -10 },
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
        title: 'Acto III · Entrega 150 de madera para las shicras de la Pirámide Mayor',
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
        title: 'Acto III · Entrega 150 de piedra para los muros de contención',
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
        title: 'Acto III · Reúne a la comunidad en la Plaza para la ofrenda del fuego',
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
        title: 'Recorre los seis complejos piramidales de Caral Alto',
      },
      {
        id: 'obj_asamblea',
        kind: 'hold',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 18,
        time: 20,
        unitKind: UnitKind.WORKER,
        requires: 'a2_excedente',
        hidden: true,
        optional: true,
        // Announced with Act III (listed in the panel and called from the pyramid card), but the
        // assembly only starts when the player calls it.
        awaitsCall: true,
        title: 'Convoca una asamblea comunal (abstracción jugable) en la Plaza Central',
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
            text: 'El algodón del valle baja a la costa: con él, Áspero teje sus redes. El pescado sube a cambio.',
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
            text: 'Con la ciudad en pie, la comunidad puede reunirse en la Plaza Central: convoca la asamblea desde la ficha de la Pirámide Mayor.',
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
            text: 'La ciudad está en uso: se abren las tiendas de la feria, llegan peregrinos de los valles y el fuego sagrado arde en la cima.',
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
            text: 'Seis complejos piramidales: la escala se asocia al excedente y al trabajo comunal; es una interpretación arqueológica, no un registro escrito.',
          },
        ],
      },
    ],
  },
  {
    id: 'm2_chavin',
    title: 'El Oráculo de Chavín',
    subtitle: 'Horizonte Temprano · c. 900–200 a.C.',
    periodNote: 'La misión se sitúa c. 900–200 a.C.',
    history:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos, es el gran centro ceremonial de los Andes. Peregrinos de lejos traen ofrendas al oráculo; con ellas se construye y se sostiene el templo.\n' +
      'No hay guerra documentada: tu poder es el prestigio del culto. Acompaña el crecimiento del Templo Viejo y del Templo Nuevo, recibe peregrinos y sostén el centro hasta el declive que las fuentes describen.',
    victory:
      'La influencia de Chavín se extendió por buena parte de los Andes centrales. Hacia 500–200 a.C. su prestigio se fragmentó y el centro ceremonial dejó de ser el eje del poder andino.',
    defeat: 'El oráculo pierde su prestigio y el centro ceremonial declina antes de tiempo.',
    period: HistoricalPeriod.EARLY_HORIZON,
    narrator: 'Voz de los peregrinos',
    epilogueImage: 'media/chavin/intro-declive.webp',
    intro: [
      {
        kicker: 'CALLEJÓN DE CONCHUCOS · c. 900 a.C.',
        title: 'Entre el río y las alturas',
        text: 'A 3180 msnm, el río Mosna cruza un valle estrecho entre montañas. Allí, donde se cruzan los caminos de la sierra y la costa, crece un centro ceremonial.',
        seconds: 9,
        source: 'docs/historia/campanas/chavin.md',
        image: 'media/chavin/intro-valle.webp',
      },
      {
        kicker: 'EL ORÁCULO',
        title: 'Peregrinos y ofrendas',
        text: 'El oráculo de Chavín atrae a peregrinos de lejos. Traen plata, conchas y obsidiana; a cambio buscan consejo y participación en un culto que se extiende por los Andes.',
        seconds: 9,
        source: 'docs/historia/civilizaciones/chavin.md',
        image: 'media/chavin/intro-templo.webp',
      },
      {
        kicker: 'GENERACIONES',
        title: 'Un templo que crece por fases',
        text: 'El Templo Viejo y luego el Templo Nuevo se levantan con trabajo comunal. Cada ampliación exige piedra, alimentos y prestigio: el centro ceremonial es una obra de generaciones.',
        seconds: 10,
        source: 'docs/historia/campanas/chavin.md',
        image: 'media/chavin/intro-peregrinos.webp',
      },
    ],
    tutorial: true,
    modelMission: true,
    playerCiv: CivId.CHAVIN,
    enemyCiv: CivId.PARACAS,
    map: { seed: 900, type: 'andes', size: 256 },
    timeOfDay: 'noon',
    // Callejón de Conchucos: cool highland mist around the ceremonial center.
    atmosphere: { fogDensity: 0.0042, skyTint: '#c8d6d0', sunWarmth: 0.9 },
    layout: {
      base: { x: 0.3, z: 0.61 },
      site: {
        id: 'chavin_site',
        y: 4.6,
        focus: { x: 0.51, z: 0.456 },
        keepout: [chavinKeepout({ x: 0.51, z: 0.456, rx: 0.19, rz: 0.17 })],
        buildKeepout: [chavinKeepout({ x: 0.51, z: 0.456, rx: 0.17, rz: 0.14 })],
        // The Old Temple starts as a foundation; acts II and III complete it and raise the New Temple.
        phase: 'old_temple_foundation',
      },
      terrain: {
        // The Mosna valley and the flat ceremonial terrace.
        river: {
          name: 'Valle del Mosna',
          z: 0.2,
          width: 0.035,
          valleyWidth: 0.13,
          amplitude: 0.008,
          phase: 0.4,
          fords: [{ x: 0.36, width: 0.08 }],
        },
        flats: [{ name: 'Terraza ceremonial de Chavín', x: 0.51, z: 0.456, rx: 0.2, rz: 0.17 }],
      },
    },
    mapOverrides: {
      terrain: { riverCount: 0, terraceChance: 0.1 },
      climate: { aridity: 0.05, moisture: 0.8, temperature: 0.3 },
      vegetation: { density: 0.8 },
      resources: { tree: 0.8, mine: 0.6, well: 0.5, hunt: 0.4, berry: 0.6 },
      culturalLandscape: null,
      groundTint: '#b9d29a',
    },
    startingEra: Era.REGIONAL_STATES,
    // Same 256 m transect and crossing band as Caral (see caral-model-mission.md §Pacing and map scale).
    unitSpeedScale: 0.75,
    // Chavín has no documented war: dwellings, storehouses, fields and the pilgrimage fair, no army.
    allowedBuildings: [BuildingKind.HOUSE, BuildingKind.MILL, BuildingKind.FARM, BuildingKind.MARKET],
    allowedUnits: [UnitKind.WORKER, UnitKind.SCOUT],
    // Only Early Horizon technologies: no war techs and no later Andean engineering.
    allowedTechs: ['irrigation_canal', 'andean_loom', 'silver_metallurgy', 'chavin_pilgrimage'],
    startingResources: { food: 300, wood: 450, silver: 300, stone: 100 },
    start: {},
    enemy: { active: false, difficulty: 'easy', aggression: 0 },
    objectives: [
      {
        id: 'a1_llegada',
        kind: 'reach',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 16,
        title: 'Acto I · Llega al centro ceremonial de Chavín',
      },
      {
        id: 'a1_ofrenda',
        kind: 'deliver',
        resource: 'silver',
        count: 100,
        step: 50,
        heritageId: 'chavin_edificio_b',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 20,
        title: 'Acto I · Entrega 100 de plata como ofrenda en el Edificio B',
      },
      {
        id: 'a1_plaza',
        kind: 'inspect',
        heritageIds: ['chavin_plaza_circular'],
        optional: true,
        hidden: true,
        title: 'Acto I · Visita la Plaza Circular Hundida',
      },
      {
        id: 'a2_templo',
        kind: 'deliver',
        resource: 'stone',
        count: 120,
        step: 50,
        heritageId: 'chavin_edificio_b',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 20,
        hidden: true,
        requires: 'a1_ofrenda',
        title: 'Acto II · Entrega 150 de piedra para el Templo Viejo',
      },
      {
        id: 'a2_peregrinaje',
        kind: 'hold',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 14,
        time: 60,
        unitKind: UnitKind.WORKER,
        hidden: true,
        requires: 'a2_templo',
        title: 'Acto II · Recibe a los peregrinos en la Plaza Circular',
      },
      {
        id: 'a2_feria',
        kind: 'build',
        buildingKind: BuildingKind.MARKET,
        count: 1,
        pos: { ref: 'site', dx: 0, dz: 34 },
        radius: 16,
        hidden: true,
        requires: 'a1_ofrenda',
        title: 'Acto II · Abre la feria de peregrinos junto al templo',
      },
      {
        id: 'a2_galeria',
        kind: 'inspect',
        heritageIds: ['chavin_galeria'],
        optional: true,
        hidden: true,
        requires: 'a2_templo',
        title: 'Acto II · Recorre la galería y sus ductos de ventilación',
      },
      {
        id: 'a3_templo',
        kind: 'deliver',
        resource: 'stone',
        count: 200,
        step: 50,
        heritageId: 'chavin_edificio_a',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 22,
        hidden: true,
        requires: 'a2_peregrinaje',
        title: 'Acto III · Entrega 200 de piedra para el Templo Nuevo',
      },
      {
        id: 'a3_intercambio',
        kind: 'research',
        tech: 'chavin_pilgrimage',
        hidden: true,
        requires: 'a2_feria',
        title: 'Acto III · Investiga el Peregrinaje al Lanzón',
      },
      {
        id: 'a3_peregrinaje',
        kind: 'hold',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 14,
        time: 90,
        unitKind: UnitKind.WORKER,
        hidden: true,
        requires: 'a3_templo',
        title: 'Acto III · Recibe la gran peregrinación en la Plaza Circular',
      },
      {
        id: 'bonus_ofrenda_mayor',
        kind: 'deliver',
        resource: 'silver',
        count: 400,
        step: 50,
        heritageId: 'chavin_edificio_b',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 20,
        hidden: true,
        requires: 'a1_ofrenda',
        optional: true,
        title: 'Ofrenda mayor: entrega 400 de plata en el Edificio B',
      },
      {
        id: 'a3_portada',
        kind: 'inspect',
        heritageIds: ['chavin_portada'],
        optional: true,
        hidden: true,
        requires: 'a3_templo',
        title: 'Acto III · Contempla la Portada de las Falcónidas',
      },
      {
        id: 'a4_registro',
        kind: 'inspect',
        heritageIds: [
          'chavin_plaza_circular',
          'chavin_edificio_b',
          'chavin_edificio_a',
          'chavin_portada',
          'chavin_galeria',
        ],
        hidden: true,
        requires: 'a3_peregrinaje',
        title: 'Acto IV · Recorre la Plaza, el Templo Viejo, el Templo Nuevo y la Portada',
      },
    ],
    triggers: [
      {
        id: 't_a1_inicio',
        condition: { type: 'time', seconds: 4 },
        effects: [
          {
            type: 'dialogue',
            text: 'Somos peregrinos del oráculo. Traemos ofrendas de lejos: plata, conchas y obsidiana. El templo nos recibe y nosotros lo sostenemos.',
            duration: 9,
          },
        ],
      },
      {
        id: 't_a1_llegada',
        condition: { type: 'objective', objectiveId: 'a1_llegada', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La Plaza Circular y el Edificio B forman el Templo Viejo. Acércate con un obrero y entrega la primera ofrenda en el Edificio B.',
          },
          { type: 'objective', objectiveId: 'a1_ofrenda', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a1_plaza', state: 'activate', announce: false },
        ],
      },
      {
        id: 't_a1_ofrenda',
        condition: { type: 'objective', objectiveId: 'a1_ofrenda', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto II · Generaciones después',
            title: 'El Templo Viejo',
            image: 'media/chavin/intro-templo.webp',
            text: 'El Templo Viejo crece por etapas: plataformas, galerías y la cámara del Lanzón. La piedra y el trabajo comunal levantan sus muros; la feria reúne a los peregrinos.',
          },
          { type: 'objective', objectiveId: 'a2_templo', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a2_feria', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a2_galeria', state: 'activate', announce: false },
          { type: 'objective', objectiveId: 'bonus_ofrenda_mayor', state: 'activate', announce: false },
        ],
      },
      {
        id: 't_a2_templo',
        condition: { type: 'objective', objectiveId: 'a2_templo', state: 'completed' },
        effects: [
          { type: 'site_phase', phase: 'old_temple' },
          {
            type: 'dialogue',
            text: 'El Templo Viejo está terminado. Recibe a los peregrinos en la Plaza Circular para que el oráculo mantenga su prestigio.',
          },
          { type: 'objective', objectiveId: 'a2_peregrinaje', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_a2_feria',
        condition: { type: 'objective', objectiveId: 'a2_feria', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La feria reúne a peregrinos y artesanos. El intercambio de larga distancia forma parte del prestigio del centro ceremonial.',
          },
        ],
      },
      {
        id: 't_a2_peregrinaje',
        condition: { type: 'objective', objectiveId: 'a2_peregrinaje', state: 'completed' },
        effects: [
          { type: 'resources', player: 0, amount: { silver: 100, food: 100 } },
          {
            type: 'act',
            kicker: 'Acto III · c. 500 a.C.',
            title: 'El Templo Nuevo',
            image: 'media/chavin/intro-nuevo.webp',
            text: 'Con el prestigio del oráculo, la comunidad amplía el centro ceremonial: el Templo Nuevo, la Portada de las Falcónidas y nuevas plazas. La influencia de Chavín se extiende por los Andes.',
          },
          { type: 'site_phase', phase: 'new_temple_foundation' },
          { type: 'objective', objectiveId: 'a3_templo', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a3_intercambio', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a3_portada', state: 'activate', announce: false },
        ],
      },
      {
        id: 't_a3_templo',
        condition: { type: 'objective', objectiveId: 'a3_templo', state: 'completed' },
        effects: [
          { type: 'site_phase', phase: 'new_temple' },
          {
            type: 'dialogue',
            text: 'El Templo Nuevo y su Portada miran al este. Atrae una gran peregrinación para que el prestigio de Chavín llegue a todo el horizonte.',
          },
          { type: 'objective', objectiveId: 'a3_peregrinaje', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_a3_peregrinaje',
        condition: { type: 'objective', objectiveId: 'a3_peregrinaje', state: 'completed' },
        effects: [
          { type: 'site_phase', phase: 'apogee' },
          {
            type: 'act',
            kicker: 'Acto IV · c. 500–200 a.C.',
            title: 'El último peregrinaje',
            image: 'media/chavin/intro-declive.webp',
            text: 'La influencia de Chavín empieza a fragmentarse. Los peregrinos siguen llegando, pero los centros regionales crecen. Recorre el centro ceremonial y sus testimonios: el epílogo retoma el declive documentado.',
          },
          { type: 'objective', objectiveId: 'a4_registro', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_a1_plaza',
        condition: { type: 'objective', objectiveId: 'a1_plaza', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La Plaza Circular Hundida organiza el acceso ritual al Templo Viejo. Su pavimento y sus gradas son parte de la planta documentada.',
          },
        ],
      },
      {
        id: 't_a2_galeria',
        condition: { type: 'objective', objectiveId: 'a2_galeria', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'Las galerías, ductos y drenajes recorren el interior del templo. El juego modela una secuencia representativa, no las 22 galerías completas.',
          },
        ],
      },
      {
        id: 't_a3_portada',
        condition: { type: 'objective', objectiveId: 'a3_portada', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La Portada de las Falcónidas reúne columnas, jambas y un friso partido. Las tallas del juego son una lectura geométrica, no una reproducción exacta.',
          },
        ],
      },
      {
        id: 't_declive',
        condition: { type: 'time', seconds: 360 },
        effects: [
          {
            type: 'dialogue',
            text: 'Los arqueólogos debaten la cronología de Chavín: la construcción monumental y su declive no tienen fechas cerradas. La secuencia del juego es una síntesis divulgativa.',
          },
        ],
      },
    ],
  },
  {
    id: 'm3_moche_recuay',
    title: 'La Frontera de los Valles',
    subtitle: 'Intermedio Temprano · c. 300–600 d.C.',
    history:
      'Los señores de Moche dominan los valles de Chicama, Moche y Virú. Desde el Callejón de Huaylas, los Recuay presionan la frontera.\n' +
      'Asegura los valles y sus canales, defiende las huacas y sostén el intercambio de élite con la sierra.',
    victory:
      'Moche impone su dominio sobre la costa norte. Sus huacas y su cerámica marcan el apogeo del Intermedio Temprano.',
    defeat: 'Los valles caen ante las incursiones de la sierra y el poder moche se desmorona.',
    period: HistoricalPeriod.EARLY_INTERMEDIATE,
    tutorial: true,
    playerCiv: CivId.MOCHE,
    enemyCiv: CivId.RECUAY,
    map: { seed: 400, type: 'coast', size: 192 },
    layout: {
      base: { x: 0.3, z: 0.66 },
      site: {
        id: 'moche_site',
        y: 6,
        focus: { x: 0.62, z: 0.38 },
        keepout: [{ x: 0.62, z: 0.38, rx: 0.2, rz: 0.17 }],
      },
      canal: {
        name: 'Canal del valle de Moche',
        x: 0.45,
        z: 0.56,
        length: 36,
        yaw: 0.08,
        initiallyOpen: false,
        irrigation: true,
        heritageId: 'moche_canal',
      },
      terrain: {
        flats: [
          { name: 'Valles de Moche y Chicama', x: 0.3, z: 0.66, rx: 0.18, rz: 0.14 },
          { name: 'Huacas de Moche', x: 0.62, z: 0.38, rx: 0.2, rz: 0.17 },
          { name: 'Callejón de Huaylas', x: 0.72, z: 0.3, rx: 0.1, rz: 0.08 },
        ],
      },
      decor: { model: 'recuay_pashash', at: 'enemy', dx: 10, dz: 0, scale: 1.05 },
    },
    mapOverrides: {
      terrain: { terraceChance: 0.08, riverCount: 0 },
      climate: { aridity: 0.78, moisture: 0.24 },
      vegetation: { density: 0.24 },
      resources: { tree: 0.45, mine: 0.8, well: 0.35, hunt: 0.25 },
      culturalLandscape: null,
      groundTint: '#c9a66b',
    },
    timeOfDay: 'dusk',
    startingEra: Era.REGIONAL_STATES,
    startingResources: { food: 700, wood: 600, silver: 300, stone: 200 },
    start: {
      units: [
        { kind: UnitKind.SOLDIER, dx: 12, dz: 4, count: 6 },
        { kind: UnitKind.MUSKETEER, dx: 10, dz: 10, count: 4 },
        { kind: UnitKind.SCOUT, dx: 8, dz: 8, count: 1 },
      ],
    },
    mark: [],
    enemy: { active: true, difficulty: 'normal', aggression: 1 },
    objectives: [
      {
        id: 'obj_canal',
        kind: 'canal_open',
        title: 'Abre la compuerta del canal de Moche',
      },
      {
        id: 'obj_huacas',
        kind: 'hold',
        pos: { ref: 'site', dx: 4, dz: 8 },
        radius: 18,
        time: 90,
        hidden: true,
        requires: 'obj_canal',
        title: 'Sostén la plaza de las huacas 90 segundos',
      },
      {
        id: 'obj_intercambio',
        kind: 'deliver',
        resource: 'silver',
        count: 250,
        hidden: true,
        requires: 'obj_huacas',
        title: 'Intercambia 250 de plata en la Huaca de la Luna',
      },
      {
        id: 'bonus_intercambio',
        kind: 'deliver',
        resource: 'silver',
        count: 400,
        optional: true,
        hidden: true,
        requires: 'obj_huacas',
        title: 'Intercambio de élite: completa 400 de plata',
      },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 10 },
        effects: [
          {
            type: 'dialogue',
            text: 'Señor de Moche: —El agua del canal sostiene los campos y las huacas. ¡Nadie entra al valle sin nuestro permiso!',
          },
        ],
      },
      {
        id: 't_canal',
        condition: { type: 'objective', objectiveId: 'obj_canal', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La compuerta está abierta. Los andenes recuperan agua; ahora asegura la plaza entre las huacas.',
          },
          { type: 'objective', objectiveId: 'obj_huacas', state: 'activate' },
        ],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 80 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 5 }],
            pos: { ref: 'site', dx: -20, dz: -26 },
            radius: 6,
          },
          { type: 'dialogue', text: '¡Recuay cruza la quebrada por el norte! ¡Defiende la plaza!' },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 200 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 4 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { ref: 'site', dx: 22, dz: -24 },
            radius: 6,
          },
          { type: 'dialogue', text: 'Otra columna baja desde el Callejón de Huaylas. ¡Refuerza el flanco este!' },
        ],
      },
      {
        id: 't_huacas',
        condition: { type: 'objective', objectiveId: 'obj_huacas', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La plaza resiste. El intercambio de élite con la sierra puede continuar en la Huaca de la Luna.',
          },
          { type: 'objective', objectiveId: 'obj_intercambio', state: 'activate' },
          { type: 'objective', objectiveId: 'bonus_intercambio', state: 'activate' },
        ],
      },
      {
        id: 't_wave_3',
        condition: { type: 'time', seconds: 360 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { ref: 'site', dx: 0, dz: -30 },
            radius: 6,
          },
        ],
      },
      {
        id: 't_declive',
        condition: { type: 'time', seconds: 480 },
        effects: [
          {
            type: 'dialogue',
            text: 'Hacia el 800 d.C. el poder moche se fragmenta. Sus valles y huacas quedan como memoria de un Intermedio Temprano excepcional.',
          },
        ],
      },
    ],
  },
  {
    id: 'm4_wari',
    title: 'El Horizonte Medio',
    subtitle: 'Horizonte Medio · c. 600–1000 d.C.',
    history:
      'Wari, desde Ayacucho, construye el primer imperio andino: ciudades planificadas, caminos y una religión estatal. Al sur, Tiahuanaco domina el altiplano.\n' +
      'No hay una guerra única documentada: tu arma es la red de centros y caminos. Extiéndela y asegura los andenes frente a la influencia rival.',
    victory: 'Wari consolida su esfera de influencia. El Horizonte Medio unifica buena parte de los Andes centrales.',
    defeat: 'La expansión wari se detiene y sus centros provinciales se pierden.',
    period: HistoricalPeriod.MIDDLE_HORIZON,
    tutorial: true,
    playerCiv: CivId.WARI,
    enemyCiv: CivId.TIAHUANACO,
    map: { seed: 800, type: 'andes', size: 192 },
    layout: {
      base: { x: 0.3, z: 0.66 },
      site: {
        id: 'wari_site',
        y: 5.0,
        focus: { x: 0.56, z: 0.45 },
        keepout: [{ x: 0.56, z: 0.45, rx: 0.2, rz: 0.17 }],
      },
      terrain: {
        flats: [
          { name: 'Andenes de Ayacucho', x: 0.3, z: 0.66, rx: 0.16, rz: 0.12 },
          { name: 'Complejo Wari', x: 0.56, z: 0.45, rx: 0.2, rz: 0.17 },
          { name: 'Frontera provincial', x: 0.72, z: 0.35, rx: 0.13, rz: 0.1 },
          { name: 'Terraza provincial wari', x: 0.7, z: 0.58, rx: 0.12, rz: 0.09 },
        ],
      },
      roads: [
        { from: { ref: 'player', dx: 0, dz: 0 }, to: { ref: 'site', dx: 0, dz: 14 }, width: 2.5 },
        { from: { ref: 'site', dx: 0, dz: 14 }, to: WARI_NODE_A, width: 2.5 },
        { from: { ref: 'site', dx: 0, dz: 14 }, to: WARI_NODE_B, width: 2.5 },
        { from: WARI_NODE_A, to: WARI_NODE_B, width: 2 },
      ],
    },
    mapOverrides: {
      terrain: { terraceChance: 0.6, riverCount: 0 },
      climate: { aridity: 0.12, moisture: 0.55, temperature: 0.25 },
      vegetation: { density: 0.5 },
      resources: { tree: 0.55, mine: 0.7, well: 0.5, hunt: 0.35 },
      culturalLandscape: null,
      groundTint: '#a99b78',
    },
    timeOfDay: 'noon',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 350, wood: 300, silver: 100, stone: 40 },
    start: {},
    enemy: { active: false, difficulty: 'easy', aggression: 0 },
    objectives: [
      {
        id: 'obj_suministros',
        kind: 'gather',
        resource: 'food',
        count: 600,
        title: 'Reúne suministros para la expansión (600 de comida)',
      },
      {
        id: 'obj_andenes',
        kind: 'build',
        buildingKind: BuildingKind.FARM,
        count: 2,
        title: 'Acondiciona dos andenes para la red wari',
      },
      {
        id: 'obj_red',
        kind: 'network',
        buildingKind: BuildingKind.MARKET,
        count: 2,
        nodes: [WARI_NODE_A, WARI_NODE_B],
        radius: 16,
        title: 'Conecta dos centros provinciales en la frontera',
      },
      {
        id: 'obj_frontera',
        kind: 'hold',
        pos: WARI_NODE_A,
        radius: 14,
        time: 60,
        hidden: true,
        requires: 'obj_red',
        title: 'Sostén la frontera frente a Tiahuanaco',
      },
      {
        id: 'obj_sostener',
        kind: 'survive',
        time: 480,
        title: 'Sostén la esfera wari 8 minutos',
      },
      {
        id: 'bonus_red',
        kind: 'build',
        buildingKind: BuildingKind.MARKET,
        count: 1,
        pos: WARI_BONUS_NODE,
        radius: 16,
        optional: true,
        title: 'Amplía la red con un tercer centro',
      },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'La despensa está corta, pero nuestros caminos no. Reúne suministros y conecta dos centros provinciales.',
          },
        ],
      },
      {
        id: 't_red',
        condition: { type: 'objective', objectiveId: 'obj_red', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'Los centros provinciales están enlazados. La frontera con Tiahuanaco se mide ahora en presencia y caminos.',
          },
          { type: 'objective', objectiveId: 'obj_frontera', state: 'activate' },
        ],
      },
      {
        id: 't_dial_1',
        condition: { type: 'time', seconds: 200 },
        effects: [
          {
            type: 'dialogue',
            text: 'En el altiplano, Tiahuanaco difunde el mismo culto del dios de los báculos: dos estados coetáneos que compiten por influencia, no por ejércitos.',
          },
        ],
      },
      {
        id: 't_frontera',
        condition: { type: 'objective', objectiveId: 'obj_frontera', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La frontera sostiene la red. Wari articula andenes, almacenes y centros sin una guerra única documentada.',
          },
        ],
      },
      {
        id: 't_declive',
        condition: { type: 'time', seconds: 500 },
        effects: [
          {
            type: 'dialogue',
            text: 'Hacia 1000–1100 d.C. Wari y Tiahuanaco colapsan. El Horizonte Medio deja paso al Intermedio Tardío.',
          },
        ],
      },
    ],
  },
  {
    id: 'm_tambotoco',
    commanders: [
      'manco_capac',
      'ayar_auca',
      'ayar_cachi',
      'ayar_uchu',
      'mama_huaco',
      'mama_ocllo',
      'mama_ipacura',
      'mama_raua',
    ],
    title: 'Los hijos de Tambotoco',
    subtitle: 'Pacaritambo–Cusco · Leyenda',
    history:
      'La tradición recogida por Sarmiento, Cieza y Betanzos cuenta que ocho hermanos salieron de la cueva de Tambotoco, en Pacaritambo. En el camino Ayar Cachi fue sepultado por engaño, Ayar Uchu se convirtió en piedra en Huanacaure y Ayar Auca dio nombre al sitio del Cusco.\n' +
      'En el valle ya vivían huallas, sauaseray y alcabizas. Los recién llegados tomaron tierras, quitaron el agua a los alcabizas y fundaron Inticancha. La misión lo cuenta como Leyenda: el Códice señala que Sarmiento escribió para desacreditar a los incas y que Garcilaso da otra versión.',
    victory:
      'Inticancha queda fundada y las cuatro canchas ordenan el sitio. La leyenda continúa: el señorío del Cusco crecerá hasta el Tahuantinsuyo. El epílogo distingue la tradición de Sarmiento de la versión de Garcilaso y no las presenta como historia comprobada.',
    defeat:
      'Los ayllus del valle rechazan a los recién llegados. Sin tierras ni agua, la peregrinación no funda Inticancha y la leyenda se pierde en la sierra.',
    period: HistoricalPeriod.LATE_INTERMEDIATE,
    periodNote: 'Leyenda · ss. XII–XIV',
    narrator: 'Memoria de los Ayar',
    playerCiv: CivId.INCA_KILLKE,
    enemyCiv: CivId.AYLLUS,
    playerName: 'Ayllus de Ayar',
    enemyName: 'Ayllus del valle',
    map: { seed: 1200, type: 'andes', size: 256 },
    layout: {
      labels: [
        { text: 'Pacaritambo', x: 40 / 256, z: 58 / 256, kind: 'region' },
        { text: 'Tambotoco', x: TAMBOTOCO_CAVE.x / 256, z: TAMBOTOCO_CAVE.z / 256, kind: 'settlement' },
        { text: 'Tambo Quiro', x: TAMBOTOCO_TAMBO_QUIRO.x / 256, z: TAMBOTOCO_TAMBO_QUIRO.z / 256, kind: 'region' },
        { text: 'Huanacaure', x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, kind: 'region' },
        { text: 'Valle del Cusco', x: 196 / 256, z: 190 / 256, kind: 'region' },
      ],
      base: { x: 44 / 256, z: 62 / 256 },
      opening: { x: 62 / 256, z: 84 / 256 },
      enemyBase: { x: TAMBOTOCO_ENEMY.x / 256, z: TAMBOTOCO_ENEMY.z / 256 },
      discoveries: [{ heritageId: 'tambotoco_huanacaure' }],
      terrain: {
        flats: [
          { name: 'Tambotoco', x: 44 / 256, z: 70 / 256, rx: 0.1, rz: 0.1 },
          { name: 'Huanacaure', x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, rx: 0.1, rz: 0.09 },
          { name: 'Valle del Cusco', x: 186 / 256, z: 196 / 256, rx: 0.2, rz: 0.15 },
        ],
      },
      site: {
        id: 'tambotoco_site',
        y: 12.4,
        focus: { x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256 },
        keepout: [{ x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, rx: 0.08, rz: 0.07 }],
        buildKeepout: [{ x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, rx: 0.07, rz: 0.065 }],
      },
      canal: {
        name: 'Acequia de los alcabizas',
        x: 158 / 256,
        z: 176 / 256,
        width: 1.6,
        path: [
          { x: 152 / 256, z: 160 / 256 },
          { x: 156 / 256, z: 168 / 256 },
          { x: 162 / 256, z: 178 / 256 },
          { x: 172 / 256, z: 188 / 256 },
          { x: 182 / 256, z: 194 / 256 },
        ],
        initiallyOpen: false,
        irrigation: true,
        heritageId: 'tambotoco_acequia',
        lockedUntilObjective: 'a3_acequia',
      },
      roads: [
        { from: { dx: 44, dz: 84 }, to: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z }, width: 3 },
        { from: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z }, to: { dx: 186, dz: 196 }, width: 3 },
      ],
    },
    timeOfDay: 'morning',
    startingEra: Era.TAHUANTINSUYO,
    // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
    unitSpeedScale: 0.75,
    startingResources: { food: 700, wood: 500, silver: 0, stone: 300 },
    start: {
      units: [
        { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 2 },
        { kind: UnitKind.WORKER, dx: 3, dz: 5, count: 1, tag: 'mama_ocllo' },
        { kind: UnitKind.WORKER, dx: 5, dz: 5, count: 1, tag: 'mama_ipacura' },
        { kind: UnitKind.WORKER, dx: 5, dz: 3, count: 1, tag: 'mama_raua' },
        { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 3 },
        { kind: UnitKind.SOLDIER, dx: 9, dz: 1, count: 1, tag: 'manco_capac' },
        { kind: UnitKind.SOLDIER, dx: 6, dz: -2, count: 1, tag: 'mama_huaco' },
        { kind: UnitKind.SOLDIER, dx: 10, dz: -3, count: 1, tag: 'ayar_cachi' },
        { kind: UnitKind.SOLDIER, dx: 9, dz: 3, count: 1, tag: 'ayar_uchu' },
        { kind: UnitKind.MUSKETEER, dx: 11, dz: 3, count: 2 },
        { kind: UnitKind.SCOUT, dx: 13, dz: -1, count: 1, tag: 'ayar_auca' },
      ],
    },
    enemy: { active: true, difficulty: 'normal', aggression: 0.7 },
    tutorial: true,
    modelMission: true,
    intro: [
      {
        kicker: 'PACARITAMBO · TIEMPO DE LA LEYENDA',
        title: 'La cueva de Tambotoco',
        text: 'Ocho hermanos salen de la cueva de Tambotoco: Manco, Auca, Cachi y Uchu, con Mama Ocllo, Mama Huaco, Mama Ipacura y Mama Raua. Buscan tierra fértil. La tradición no tiene fecha; el relato se cuenta como leyenda.',
        seconds: 10,
        source: 'docs/historia/campanas/tambotoco.md',
        image: 'media/tambotoco/intro-cueva.webp',
      },
      {
        kicker: 'HUANACAURE',
        title: 'La huaca',
        text: 'En el cerro de Huanacaure, Ayar Uchu se convierte en piedra y queda como huaca de la peregrinación. El episodio pertenece al mito; el juego lo escenifica sin presentarlo como un hecho comprobado.',
        seconds: 9,
        source: 'docs/historia/campanas/tambotoco.md',
        image: 'media/tambotoco/intro-huanacaure.webp',
      },
      {
        kicker: 'VALLE DEL CUSCO',
        title: 'Inticancha',
        text: 'El valle ya está habitado por huallas, sauaseray y alcabizas. Los recién llegados necesitan tierras y agua: la tradición cuenta que quitaron el agua a los alcabizas para forzar la cesión.',
        seconds: 10,
        source: 'docs/historia/campanas/tambotoco.md',
        image: 'media/tambotoco/intro-valle.webp',
      },
    ],
    epilogueImage: 'media/tambotoco/intro-epilogo.webp',
    buildingNames: { [BuildingKind.MILL]: 'Depósito comunal' },
    allowedUnits: [UnitKind.WORKER, UnitKind.SOLDIER, UnitKind.MUSKETEER, UnitKind.SCOUT],
    allowedBuildings: [
      BuildingKind.CENTER,
      BuildingKind.HOUSE,
      BuildingKind.FARM,
      BuildingKind.MILL,
      BuildingKind.SAWMILL,
      BuildingKind.BARRACKS,
      BuildingKind.FORTRESS,
      BuildingKind.WALL,
      BuildingKind.GATE,
      BuildingKind.TOWER,
    ],
    objectives: [
      {
        id: 'a1_salida',
        kind: 'reach',
        pos: { dx: 60, dz: 92 },
        radius: 9,
        title: 'Sal de Tambotoco y toma el camino al valle',
      },
      {
        id: 'a1_caza',
        kind: 'gather',
        fromNode: 'hunt',
        count: 120,
        hidden: true,
        title: 'Consigue 120 de comida cazando',
      },
      {
        id: 'a1_manco',
        kind: 'protect',
        entityTag: 'manco_capac',
        optional: true,
        title: 'Mantén con vida a Ayar Manco',
      },
      {
        id: 'a2_huanacaure',
        kind: 'inspect',
        heritageIds: ['tambotoco_huanacaure'],
        inspectRadius: 14,
        pos: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z },
        radius: 18,
        hidden: true,
        title: 'Llega a la huaca de Huanacaure',
      },
      {
        id: 'a3_acequia',
        kind: 'canal_open',
        hidden: true,
        title: 'Abre la acequia de los alcabizas',
      },
      {
        id: 'a3_hualla',
        kind: 'reach',
        pos: { dx: 160, dz: 180 },
        radius: 10,
        optional: true,
        hidden: true,
        title: 'Visita la aldea hualla',
      },
      {
        id: 'a4_inticancha',
        kind: 'build',
        buildingKind: BuildingKind.MILL,
        pos: { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z },
        radius: 16,
        hidden: true,
        title: 'Funda Inticancha con su depósito comunal',
      },
      {
        id: 'a4_canchas',
        kind: 'network',
        buildingKind: BuildingKind.HOUSE,
        nodes: TAMBOTOCO_CANCHAS,
        radius: 9,
        count: 4,
        hidden: true,
        title: 'Ordena las cuatro canchas alrededor de Inticancha',
      },
    ],
    triggers: [
      {
        id: 't_intro',
        condition: { type: 'time', seconds: 6 },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Mama Huaco',
            duration: 9,
            text: '—La cueva nos queda atrás. Busquemos tierra y agua: donde el valle se abra, fundaremos.',
          },
        ],
      },
      {
        id: 't_salida',
        condition: { type: 'objective', objectiveId: 'a1_salida', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Memoria de los Ayar',
            duration: 8,
            text: 'Ayar Cachi queda atrás, sepultado por engaño en Tambo Quiro; su memoria será una huaca. La peregrinación sigue.',
          },
          {
            type: 'memory',
            tag: 'ayar_cachi',
            pos: { dx: TAMBOTOCO_TAMBO_QUIRO.x, dz: TAMBOTOCO_TAMBO_QUIRO.z },
            label: 'Huaca de Ayar Cachi',
          },
          { type: 'objective', objectiveId: 'a1_caza', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_caza',
        condition: { type: 'objective', objectiveId: 'a1_caza', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto II · La peregrinación',
            title: 'Huanacaure',
            image: 'media/tambotoco/intro-huanacaure.webp',
            text: 'El camino sube al cerro de Huanacaure. La tradición cuenta que allí Ayar Uchu se convierte en piedra y queda como huaca: el lugar marca el paso de la peregrinación al valle.',
          },
          { type: 'objective', objectiveId: 'a2_huanacaure', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_huanacaure',
        condition: { type: 'objective', objectiveId: 'a2_huanacaure', state: 'completed' },
        effects: [
          {
            type: 'memory',
            tag: 'ayar_uchu',
            pos: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z + 7 },
            label: 'Huaca de Ayar Uchu',
          },
          {
            type: 'dialogue',
            speaker: 'Memoria de los Ayar',
            duration: 8,
            text: 'Ayar Uchu se ha vuelto piedra en Huanacaure. La huaca queda a la vista y el camino sigue al valle.',
          },
          {
            type: 'act',
            kicker: 'Acto III · El valle',
            title: 'El agua de los alcabizas',
            image: 'media/tambotoco/intro-valle.webp',
            text: 'El valle del Cusco ya tiene ayllus: huallas, sauaseray y alcabizas. La tradición cuenta que los recién llegados quitaron el agua a los alcabizas para obligarlos a ceder tierras. El agua es la palanca.',
          },
          { type: 'camera', pos: { dx: 170, dz: 186 } },
          { type: 'objective', objectiveId: 'a3_acequia', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a3_hualla', state: 'activate', announce: true },
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 3 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { dx: TAMBOTOCO_ENEMY.x, dz: TAMBOTOCO_ENEMY.z },
            radius: 10,
            objective: 'position',
          },
        ],
      },
      {
        id: 't_acequia',
        condition: { type: 'objective', objectiveId: 'a3_acequia', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto IV · La fundación',
            title: 'Inticancha',
            image: 'media/tambotoco/intro-epilogo.webp',
            text: 'Con el agua y la tierra aseguradas, los ayllus fundan Inticancha y ordenan el sitio en cuatro canchas. La leyenda del Cusco empieza aquí.',
          },
          { type: 'camera', pos: { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z } },
          { type: 'objective', objectiveId: 'a4_inticancha', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_inticancha',
        condition: { type: 'objective', objectiveId: 'a4_inticancha', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Memoria de los Ayar',
            duration: 8,
            text: 'Ayar Auca se convierte en piedra en el sitio y le da nombre. Inticancha se ordena en cuatro canchas: el valle ya tiene un centro.',
          },
          {
            type: 'memory',
            tag: 'ayar_auca',
            pos: { dx: TAMBOTOCO_INTICANCHA.x + 6, dz: TAMBOTOCO_INTICANCHA.z + 6 },
            label: 'Piedra de Ayar Auca',
          },
          { type: 'objective', objectiveId: 'a4_canchas', state: 'activate', announce: true },
        ],
      },
    ],
  },
  {
    id: 'm5_yahuar_pampa',
    commanders: ['cusi_yupanqui', 'anccu_hualloc'],
    title: 'Yahuar Pampa',
    subtitle: 'Cusco · 1438',
    history:
      'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
      'Resiste el asedio y repele al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
    victory:
      'Cusi Yupanqui vence en Yahuar Pampa y asume el poder como Pachacútec, el que transforma el mundo. Comienza el imperio.',
    defeat: 'El Cusco cae ante los chancas y el imperio no llega a nacer.',
    period: HistoricalPeriod.LATE_HORIZON,
    tutorial: true,
    playerCiv: CivId.INCA,
    enemyCiv: CivId.CHANCA,
    map: { seed: 1438, type: 'andes', size: 160 },
    layout: {
      base: { x: 0.36, z: 0.62 },
      enemyBase: { x: 0.7725, z: 0.38 },
      site: {
        id: 'chanca_site',
        y: 5,
        focus: { x: 0.7025, z: 0.38 },
        keepout: [{ x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 }],
        buildKeepout: [{ x: 0.7025, z: 0.38, rx: 0.085, rz: 0.075 }],
      },
      terrain: {
        flats: [
          { name: 'Pampa de Yahuar', x: 0.36, z: 0.62, rx: 0.15, rz: 0.12 },
          { name: 'Alturas del Cusco', x: 0.7025, z: 0.38, rx: 0.1, rz: 0.09 },
        ],
      },
    },
    mapOverrides: { culturalLandscape: null },
    timeOfDay: 'dusk',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 700, wood: 600, silver: 400, stone: 200 },
    start: {
      buildings: [
        { kind: BuildingKind.FORTRESS, dx: -9, dz: -7 },
        { kind: BuildingKind.FORTRESS, dx: 9, dz: -7 },
        { kind: BuildingKind.FORTRESS, dx: -9, dz: 7 },
        { kind: BuildingKind.FORTRESS, dx: 9, dz: 7 },
      ],
      units: [
        { kind: UnitKind.RIFLEMAN, dx: -8, dz: 8, tag: 'cusi_yupanqui', count: 1 },
        { kind: UnitKind.SOLDIER, dx: -6, dz: 10, count: 6 },
        { kind: UnitKind.MUSKETEER, dx: -10, dz: 10, count: 2 },
      ],
    },
    mark: [
      { tag: 'cusco', kind: BuildingKind.CENTER, owner: 0 },
      { tag: 'centro_chanca', kind: BuildingKind.CENTER, owner: 1 },
    ],
    enemy: { active: true, difficulty: 'hard', aggression: 1.3 },
    objectives: [
      { id: 'obj_defend', kind: 'defend', entityTag: 'cusco', time: 480, title: 'Defiende el Cusco 8 minutos' },
      { id: 'obj_kill', kind: 'destroy', entityTag: 'centro_chanca', title: 'Destruye el campamento chanca' },
      { id: 'obj_cusi', kind: 'protect', entityTag: 'cusi_yupanqui', title: 'Mantén con vida a Cusi Yupanqui' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 15 },
        effects: [
          {
            type: 'dialogue',
            text: 'Cusi Yupanqui: —Los chancas creen que huiremos como los nobles. ¡Aquí se defiende el Cusco!',
          },
        ],
      },
      {
        id: 't_wave_1',
        condition: { type: 'time', seconds: 90 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { ref: 'player', dx: 28, dz: 12 },
            radius: 6,
          },
          { type: 'dialogue', text: '¡Anccu Hualloc ataca por el norte! ¡A las armas!' },
        ],
      },
      {
        id: 't_wave_2',
        condition: { type: 'time', seconds: 200 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 5 },
              { kind: UnitKind.MUSKETEER, count: 2 },
            ],
            pos: { ref: 'player', dx: -12, dz: 28 },
            radius: 6,
          },
        ],
      },
    ],
  },
  {
    id: 'm6_chimu_inca',
    commanders: ['tupac_yupanqui', 'minchancaman'],
    title: 'La Guerra del Norte',
    subtitle: 'Costa norte · c. 1470',
    history:
      'El Tahuantinsuyo ya domina el Collao, Cajamarca y la costa sur. Solo falta el poderoso Reino Chimú de Minchancaman.\n' +
      'Al mando del auqui Túpac Yupanqui, avanza por Paramonga y el valle del Santa. Corta el canal que abastece de agua a Chan Chan: sin agua, la ciudad no puede resistir.',
    victory:
      'El canal está cortado y Chan Chan capitula. Minchancaman es llevado al Cusco y el Tahuantinsuyo se extiende por la costa norte.',
    defeat: 'La resistencia chimú detiene al ejército inca y la costa norte permanece libre.',
    period: HistoricalPeriod.LATE_HORIZON,
    tutorial: true,
    playerCiv: CivId.INCA,
    enemyCiv: CivId.CHIMU,
    map: { seed: 1470, type: 'coast', size: 192 },
    region: 'north_coast',
    layout: {
      base: { x: 0.35, z: 0.62 },
      enemyBase: { x: 0.814, z: 0.339 },
      site: {
        id: 'chimu_site',
        y: 5,
        focus: { x: 0.744, z: 0.339 },
        keepout: [{ x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 }],
        buildKeepout: [{ x: 0.744, z: 0.339, rx: 0.075, rz: 0.065 }],
      },
      canal: { name: 'Canal de Chan Chan', x: 0.5, z: 0.5, length: 28, yaw: 0.2, initiallyOpen: true },
      terrain: {
        flats: [
          { name: 'Canal de Chan Chan', x: 0.5, z: 0.5, rx: 0.14, rz: 0.09 },
          { name: 'Costa de Chan Chan', x: 0.744, z: 0.339, rx: 0.085, rz: 0.075 },
        ],
      },
    },
    mapOverrides: { culturalLandscape: null },
    timeOfDay: 'dusk',
    startingEra: Era.TAHUANTINSUYO,
    startingResources: { food: 1000, wood: 700, silver: 900, stone: 400 },
    start: {
      units: [
        { kind: UnitKind.RIFLEMAN, dx: 10, dz: -4, count: 1, tag: 'tupac_yupanqui' },
        { kind: UnitKind.RIFLEMAN, dx: 12, dz: -8, count: 1 },
        { kind: UnitKind.MUSKETEER, dx: 6, dz: 10, count: 2 },
        { kind: UnitKind.RIFLEMAN, dx: 4, dz: -6, count: 4 },
      ],
    },
    mark: [{ tag: 'chan_chan', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.2 },
    objectives: [
      {
        id: 'obj_avanzar',
        kind: 'reach',
        entityTag: 'tupac_yupanqui',
        pos: { ref: 'enemy', dx: -18, dz: 0 },
        radius: 8,
        title: 'Avanza hasta Paramonga',
      },
      {
        id: 'obj_canal',
        kind: 'reach',
        entityTag: 'tupac_yupanqui',
        pos: { ref: 'canal', dx: 0, dz: 0 },
        radius: 8,
        hidden: true,
        title: 'Corta el canal que abastece Chan Chan',
      },
      {
        id: 'obj_comandante',
        kind: 'protect',
        entityTag: 'tupac_yupanqui',
        title: 'Mantén con vida a Túpac Yupanqui',
      },
      {
        id: 'obj_kill',
        kind: 'destroy',
        entityTag: 'chan_chan',
        optional: true,
        title: 'Toma Chan Chan si resiste',
      },
      { id: 'obj_hold', kind: 'survive', time: 600, optional: true, title: 'Mantén el campamento 10 minutos' },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanza por los valles y córtale el agua a Chan Chan.',
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
        condition: { type: 'time', seconds: 260 },
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 6 },
              { kind: UnitKind.MUSKETEER, count: 3 },
            ],
            pos: { ref: 'player', dx: 20, dz: 20 },
            radius: 7,
          },
          { type: 'dialogue', text: '¡Querrotumi contraataca desde Paramonga!' },
        ],
      },
      {
        id: 't_paramonga',
        condition: { type: 'unit_near', entityTag: 'tupac_yupanqui', pos: { ref: 'enemy', dx: -18, dz: 0 }, radius: 8 },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Yupanqui: —¡Paramonga ha caído! Avanza por el valle del Santa hacia Chan Chan.',
          },
          { type: 'objective', objectiveId: 'obj_canal', state: 'activate' },
        ],
      },
      {
        id: 't_canal',
        condition: { type: 'objective', objectiveId: 'obj_canal', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'Túpac Yupanqui: —El canal está cortado. Chan Chan, sin agua, no puede resistir.',
          },
          { type: 'victory' },
        ],
      },
    ],
  },
  {
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
    mark: [{ tag: 'huascar', kind: BuildingKind.CENTER, owner: 1 }],
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
        kind: 'destroy',
        entityTag: 'huascar',
        hidden: true,
        requires: 'obj_avanzar',
        title: 'Derrota al ejército de Huáscar',
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
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
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
  },
  {
    id: 'm_lima',
    commanders: ['pizarro', 'quizu_yupanqui'],
    title: 'La Ciudad de los Reyes',
    subtitle: 'Lima · 1535–1536',
    history:
      'El 18 de enero de 1535 Francisco Pizarro funda la Ciudad de los Reyes junto al Rímac, sobre señoríos del curacazgo de Lima y con aliados andinos.\n' +
      'En agosto de 1536 el ejército de Quizu Yupanqui, enviado por Manco Inca, baja de los cerros y cerca la ciudad. La caballería y los aliados sostienen el llano; Quizu muere y el cerco se levanta. El Cusco sigue cercado.',
    victory:
      'El cerco de Lima se rompe: Quizu Yupanqui cae y la ciudad queda en pie. La victoria no termina la guerra: el Cusco sigue cercado y la conquista continuará.',
    defeat: 'Lima cae ante el ejército de Quizu. La Ciudad de los Reyes deja de ser la cabeza de la conquista.',
    period: HistoricalPeriod.VICEROYALTY,
    periodNote: 'Conquista · 1535–1536',
    narrator: 'Crónica de la Ciudad de los Reyes',
    playerCiv: CivId.HUESTE_INDIANA,
    enemyCiv: CivId.INCA,
    playerName: 'Hueste indiana',
    enemyName: 'Inca de Quizu Yupanqui',
    map: { seed: 1535, type: 'coast', size: 256 },
    layout: {
      labels: [
        { text: 'Mar del Sur', x: 24 / 256, z: 150 / 256, kind: 'water' },
        { text: 'Río Rímac', x: LIMA_BRIDGE.x / 256, z: LIMA_BRIDGE.z / 256, kind: 'water' },
        { text: 'Ciudad de los Reyes', x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, kind: 'settlement' },
        { text: 'Cerros de Quizu', x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256, kind: 'region' },
        { text: 'Curacazgo de Lima', x: LIMA_CURACAS.x / 256, z: LIMA_CURACAS.z / 256, kind: 'region' },
      ],
      base: { x: 70 / 256, z: 170 / 256 },
      opening: { x: 96 / 256, z: 150 / 256 },
      enemyBase: { x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256 },
      discoveries: [{ heritageId: 'lima_plaza' }],
      terrain: {
        flats: [
          { name: 'Llano de Lima', x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.2, rz: 0.16 },
          { name: 'Río Rímac', x: LIMA_BRIDGE.x / 256, z: LIMA_BRIDGE.z / 256, rx: 0.12, rz: 0.08 },
          { name: 'Cerros de Quizu', x: LIMA_ENEMY.x / 256, z: LIMA_ENEMY.z / 256, rx: 0.16, rz: 0.14 },
        ],
      },
      site: {
        id: 'lima_site',
        y: 5.6,
        focus: { x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256 },
        keepout: [{ x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.06, rz: 0.05 }],
        buildKeepout: [{ x: LIMA_CITY.x / 256, z: LIMA_CITY.z / 256, rx: 0.04, rz: 0.04 }],
      },
      roads: [
        { from: { dx: 70, dz: 170 }, to: { dx: LIMA_CITY.x, dz: LIMA_CITY.z }, width: 3 },
        { from: { dx: LIMA_CITY.x, dz: LIMA_CITY.z }, to: { dx: LIMA_BRIDGE.x, dz: LIMA_BRIDGE.z }, width: 3 },
        { from: { dx: LIMA_BRIDGE.x, dz: LIMA_BRIDGE.z }, to: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z }, width: 3 },
      ],
    },
    timeOfDay: 'morning',
    startingEra: Era.VICEROYALTY,
    // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
    unitSpeedScale: 0.75,
    startingResources: { food: 900, wood: 700, silver: 400, stone: 400 },
    start: {
      units: [
        { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 5 },
        { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 8 },
        { kind: UnitKind.MUSKETEER, dx: 10, dz: 2, count: 3 },
        { kind: UnitKind.CAVALRY, dx: 12, dz: -2, count: 2 },
        { kind: UnitKind.CAVALRY, dx: 6, dz: 0, count: 1, tag: 'pizarro' },
        { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1 },
        { kind: UnitKind.MISSIONARY, dx: 8, dz: 8, count: 1 },
      ],
    },
    mark: [{ tag: 'campamento_quizu', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'normal', aggression: 0.8 },
    tutorial: true,
    modelMission: true,
    epilogueImage: 'media/lima/intro-epilogo.webp',
    buildingNames: { [BuildingKind.MARKET]: 'Cabildo y plaza' },
    intro: [
      {
        kicker: 'RÍMAC · 18 DE ENERO DE 1535',
        title: 'La Ciudad de los Reyes',
        text: 'Pizarro funda Lima junto al Rímac, en tierras del curacazgo de Lima. La ciudad se levanta con aliados andinos: sin ellos no hay defensa posible.',
        seconds: 10,
        source: 'docs/historia/campanas/lima.md',
        image: 'media/lima/intro-ciudad.webp',
      },
      {
        kicker: 'AGOSTO DE 1536',
        title: 'El cerco',
        text: 'Manco Inca envía a Quizu Yupanqui contra Lima. Sus columnas destruyen los socorros que Pizarro manda al Cusco y el ejército baja de los cerros.',
        seconds: 9,
        source: 'docs/historia/campanas/lima.md',
        image: 'media/lima/intro-rimac.webp',
      },
      {
        kicker: 'EL LLANO',
        title: 'La defensa',
        text: 'En el llano, la caballería y los aliados andinos rompen el asalto. Quizu muere y el cerco se levanta; el Cusco sigue cercado.',
        seconds: 10,
        source: 'docs/historia/campanas/lima.md',
        image: 'media/lima/intro-cerco.webp',
      },
    ],
    allowedUnits: [
      UnitKind.WORKER,
      UnitKind.SOLDIER,
      UnitKind.MUSKETEER,
      UnitKind.CAVALRY,
      UnitKind.ARTILLERY,
      UnitKind.SCOUT,
      UnitKind.MISSIONARY,
    ],
    allowedBuildings: [
      BuildingKind.CENTER,
      BuildingKind.HOUSE,
      BuildingKind.FARM,
      BuildingKind.MILL,
      BuildingKind.SAWMILL,
      BuildingKind.BARRACKS,
      BuildingKind.ARSENAL,
      BuildingKind.STABLE,
      BuildingKind.FACTORY,
      BuildingKind.FORTRESS,
      BuildingKind.WALL,
      BuildingKind.GATE,
      BuildingKind.TOWER,
      BuildingKind.MARKET,
    ],
    objectives: [
      {
        id: 'a1_traza',
        kind: 'inspect',
        heritageIds: ['lima_plaza'],
        inspectRadius: 16,
        pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
        radius: 20,
        title: 'Traza la Plaza Mayor junto al Rímac',
      },
      {
        id: 'a1_cabildo',
        kind: 'build',
        buildingKind: BuildingKind.MARKET,
        pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
        radius: 24,
        hidden: true,
        title: 'Levanta el cabildo y la plaza',
      },
      {
        id: 'a2_cerco',
        kind: 'hold',
        pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
        radius: 22,
        time: 90,
        minUnits: 6,
        hidden: true,
        title: 'Sostén Lima durante el cerco',
      },
      {
        id: 'a2_curacas',
        kind: 'reach',
        pos: { dx: LIMA_CURACAS.x, dz: LIMA_CURACAS.z },
        radius: 10,
        optional: true,
        hidden: true,
        title: 'Pacta con los curacas del valle',
      },
      {
        id: 'a3_ruptura',
        kind: 'destroy',
        entityTag: 'campamento_quizu',
        hidden: true,
        title: 'Rompe el cerco: toma el campamento de Quizu',
      },
      {
        id: 'a3_pizarro',
        kind: 'protect',
        entityTag: 'pizarro',
        title: 'Mantén con vida a Francisco Pizarro',
      },
    ],
    triggers: [
      {
        id: 't_intro',
        condition: { type: 'time', seconds: 6 },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pizarro',
            duration: 9,
            text: '—Este valle es la cabeza de la conquista. Tracemos la plaza, levantemos el cabildo y ganémonos a los curacas.',
          },
        ],
      },
      {
        id: 't_traza',
        condition: { type: 'objective', objectiveId: 'a1_traza', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pizarro',
            duration: 8,
            text: '—La traza está hecha. Levantemos el cabildo y la plaza antes de que los cerros se muevan.',
          },
          { type: 'objective', objectiveId: 'a1_cabildo', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_cabildo',
        condition: { type: 'objective', objectiveId: 'a1_cabildo', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto II · Agosto de 1536',
            title: 'El cerco',
            image: 'media/lima/intro-rimac.webp',
            text: 'Las columnas de socorro al Cusco se pierden en la sierra. Quizu Yupanqui baja de los cerros con el ejército de Manco Inca. Lima debe resistir.',
          },
          { type: 'objective', objectiveId: 'a2_cerco', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a2_curacas', state: 'activate', announce: true },
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 6 }],
            pos: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z },
            radius: 10,
            objective: 'position',
          },
        ],
      },
      {
        id: 't_cerco',
        condition: { type: 'objective', objectiveId: 'a2_cerco', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto III · El llano',
            title: 'La ruptura',
            image: 'media/lima/intro-cerco.webp',
            text: 'El asalto se detiene en el llano. La caballería y los aliados andinos pueden pasar al ataque: el campamento de Quizu está en los cerros.',
          },
          { type: 'objective', objectiveId: 'a3_ruptura', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_curacas',
        condition: { type: 'objective', objectiveId: 'a2_curacas', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pizarro',
            duration: 7,
            text: '—Los curacas del valle se suman. Sin sus hombres, Lima no aguanta el cerco.',
          },
          {
            type: 'reinforce',
            owner: 0,
            units: [{ kind: UnitKind.SOLDIER, count: 3 }],
            pos: { dx: LIMA_CITY.x, dz: LIMA_CITY.z },
            radius: 10,
            objective: 'position',
          },
        ],
      },
      {
        id: 't_refuerzos',
        condition: { type: 'time', seconds: 300 },
        repeat: true,
        cooldown: 75,
        effects: [
          {
            type: 'wave',
            owner: 1,
            units: [{ kind: UnitKind.SOLDIER, count: 3 }],
            pos: { dx: LIMA_ENEMY.x, dz: LIMA_ENEMY.z },
            radius: 10,
            objective: 'position',
          },
        ],
      },
    ],
  },
  {
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
  },
  {
    id: 'm_junta_cusco',
    commanders: ['pumacahua', 'melgar', 'ramirez_orozco'],
    title: 'La Junta del Cusco',
    subtitle: 'Cusco–Umachiri · 1814–1815',
    history:
      'En 1814 el Cusco se levanta contra la Real Audiencia: la junta de los hermanos Angulo nombra capitán general a José Angulo y jefe militar a Mateo García Pumacahua, y envía columnas a Puno, La Paz, Huamanga y Arequipa.\n' +
      'La campaña se juega como la Junta la vivió: sostener el Cusco, ganar La Apacheta y resistir en Umachiri el tiempo suficiente para que los líderes no caigan todos. La historia terminó en derrota; el epílogo la cuenta.',
    victory:
      'La resistencia en Umachiri gana el tiempo que la Junta necesita para retirarse del campo. La historia documentada sigue su curso: la rebelión será derrotada, Pumacahua ejecutado en Sicuani y Melgar fusilado.',
    defeat:
      'La Junta se deshace en Umachiri. La represión realista alcanza a sus líderes y el Cusco vuelve al control virreinal.',
    period: HistoricalPeriod.INDEPENDENCE,
    periodNote: 'La misión se sitúa en 1814–1815',
    narrator: 'Junta del Cusco',
    playerCiv: CivId.PATRIOTAS,
    enemyCiv: CivId.REALISTAS,
    playerName: 'Junta del Cusco',
    enemyName: 'Realistas del Alto Perú',
    map: { seed: 1814, type: 'andes', size: 256 },
    layout: {
      labels: [
        { text: 'Cusco', x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, kind: 'settlement' },
        { text: 'La Apacheta', x: JUNTA_APACHETA.x / 256, z: JUNTA_APACHETA.z / 256, kind: 'region' },
        { text: 'Umachiri', x: JUNTA_UMACHIRI.x / 256, z: JUNTA_UMACHIRI.z / 256, kind: 'region' },
        { text: 'Río Lalli', x: 178 / 256, z: 200 / 256, kind: 'water' },
        { text: 'Altiplano de Puno', x: 210 / 256, z: 240 / 256, kind: 'region' },
      ],
      base: { x: 52 / 256, z: 96 / 256 },
      opening: { x: 66 / 256, z: 80 / 256 },
      enemyBase: { x: JUNTA_ENEMY.x / 256, z: JUNTA_ENEMY.z / 256 },
      discoveries: [{ heritageId: 'colonial_church', initial: true }],
      // The Junta's camp at La Apacheta gives the pass a visual anchor and a documented military presence.
      decor: { model: 'patriotas_camp', at: 'player', dx: 72, dz: 70, yaw: 0.6, scale: 0.9 },
      terrain: {
        flats: [
          { name: 'Valle del Cusco', x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.18, rz: 0.16 },
          { name: 'Paso de La Apacheta', x: JUNTA_APACHETA.x / 256, z: JUNTA_APACHETA.z / 256, rx: 0.12, rz: 0.1 },
          { name: 'Llano de Umachiri', x: JUNTA_UMACHIRI.x / 256, z: JUNTA_UMACHIRI.z / 256, rx: 0.16, rz: 0.12 },
        ],
      },
      site: {
        id: 'cusco_junta_site',
        y: 6,
        focus: { x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256 },
        keepout: [{ x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.08, rz: 0.07 }],
        buildKeepout: [{ x: JUNTA_CUSCO.x / 256, z: JUNTA_CUSCO.z / 256, rx: 0.065, rz: 0.065 }],
      },
      roads: [
        {
          from: { dx: JUNTA_CUSCO.x, dz: JUNTA_CUSCO.z },
          to: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
          width: 3,
        },
        {
          from: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
          to: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
          width: 3,
        },
      ],
    },
    timeOfDay: 'morning',
    startingEra: Era.REPUBLIC,
    // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
    unitSpeedScale: 0.75,
    startingResources: { food: 900, wood: 600, silver: 800, stone: 400 },
    start: {
      units: [
        { kind: UnitKind.WORKER, dx: 4, dz: 4, count: 5 },
        { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 14 },
        { kind: UnitKind.MUSKETEER, dx: 10, dz: 2, count: 3 },
        { kind: UnitKind.RIFLEMAN, dx: 10, dz: -2, count: 2 },
        { kind: UnitKind.PATRIOTA_MONTONERA, dx: 14, dz: 0, count: 3 },
        { kind: UnitKind.ARTILLERY, dx: 6, dz: 8, count: 1, tag: 'artilleria_junta' },
        { kind: UnitKind.CAVALRY, dx: 6, dz: 0, count: 1, tag: 'pumacahua' },
        { kind: UnitKind.RIFLEMAN, dx: 7, dz: 0, count: 1, tag: 'melgar' },
      ],
    },
    mark: [{ tag: 'centro_realista', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'normal', aggression: 0.6 },
    tutorial: true,
    modelMission: true,
    intro: [
      {
        kicker: 'CUSCO · 3 DE AGOSTO DE 1814',
        title: 'La Junta',
        text: 'El cabildo constitucional de Cádiz y la Real Audiencia chocan en el Cusco. Los hermanos Angulo toman el gobierno y nombran capitán general a José Angulo; Mateo García Pumacahua, cacique de Chinchero, dirige la fuerza militar.',
        seconds: 9,
        source: 'docs/historia/campanas/junta_cusco.md',
        image: 'media/junta/intro-cabildo.webp',
      },
      {
        kicker: 'EXPEDICIONES · 1814',
        title: 'Cuatro columnas',
        text: 'La Junta envía columnas a Puno, La Paz, Huamanga y Arequipa. Con pocos fusiles y mucha gente, la causa se juega en la sierra y en el altiplano.',
        seconds: 9,
        source: 'docs/historia/campanas/junta_cusco.md',
        image: 'media/junta/intro-apacheta.webp',
      },
      {
        kicker: 'UMACHIRI · 11 DE MARZO DE 1815',
        title: 'La última resistencia',
        text: 'La división de Ramírez baja del Alto Perú. En Umachiri, la Junta presenta batalla con miles de hombres mal armados frente a una tropa veterana con artillería y caballería.',
        seconds: 10,
        source: 'docs/historia/campanas/junta_cusco.md',
        image: 'media/junta/intro-umachiri.webp',
      },
    ],
    epilogueImage: 'media/junta/intro-epilogo.webp',
    allowedUnits: [
      UnitKind.WORKER,
      UnitKind.SOLDIER,
      UnitKind.MUSKETEER,
      UnitKind.PATRIOTA_MONTONERA,
      UnitKind.CAVALRY,
      UnitKind.HUSSAR,
      UnitKind.ARTILLERY,
      UnitKind.SCOUT,
      UnitKind.MISSIONARY,
    ],
    allowedBuildings: [
      BuildingKind.CENTER,
      BuildingKind.HOUSE,
      BuildingKind.FARM,
      BuildingKind.MILL,
      BuildingKind.SAWMILL,
      BuildingKind.BARRACKS,
      BuildingKind.ARSENAL,
      BuildingKind.STABLE,
      BuildingKind.FACTORY,
      BuildingKind.FORTRESS,
      BuildingKind.SMELTER,
      BuildingKind.REFINERY,
      BuildingKind.WALL,
      BuildingKind.GATE,
      BuildingKind.TOWER,
      BuildingKind.MARKET,
    ],
    objectives: [
      {
        id: 'a1_cabildo',
        kind: 'inspect',
        heritageIds: ['colonial_church'],
        inspectRadius: 16,
        pos: { dx: JUNTA_CUSCO.x, dz: JUNTA_CUSCO.z },
        radius: 20,
        title: 'Reúne la Junta en el Cabildo del Cusco',
      },
      {
        id: 'a1_cuartel',
        kind: 'build',
        buildingKind: BuildingKind.BARRACKS,
        count: 1,
        hidden: true,
        title: 'Levanta el cuartel de la Junta',
      },
      {
        id: 'a2_apacheta',
        kind: 'reach',
        pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
        radius: 14,
        hidden: true,
        title: 'Avanza a La Apacheta',
      },
      {
        id: 'a2_batalla',
        kind: 'hold',
        pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
        radius: 18,
        time: 45,
        minUnits: 5,
        hidden: true,
        title: 'Sostén La Apacheta con la columna de Pumacahua',
      },
      {
        id: 'a3_umachiri',
        kind: 'reach',
        pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
        radius: 16,
        hidden: true,
        title: 'Alcanza Umachiri',
      },
      {
        id: 'a3_resistir',
        kind: 'hold',
        pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
        radius: 20,
        time: 90,
        minUnits: 4,
        hidden: true,
        title: 'Resiste en Umachiri el tiempo que la Junta necesita para retirarse',
      },
      {
        id: 'a3_pumacahua',
        kind: 'protect',
        entityTag: 'pumacahua',
        title: 'Mantén con vida a Mateo Pumacahua durante la batalla',
      },
      {
        id: 'a3_melgar',
        kind: 'protect',
        entityTag: 'melgar',
        optional: true,
        hidden: true,
        title: 'Protege a Mariano Melgar',
      },
      {
        id: 'a3_artilleria',
        kind: 'protect',
        entityTag: 'artilleria_junta',
        optional: true,
        hidden: true,
        title: 'Conserva la artillería de la Junta',
      },
    ],
    triggers: [
      {
        id: 't_intro',
        condition: { type: 'time', seconds: 6 },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pumacahua',
            duration: 9,
            text: '—El Cusco ha hablado. Reunámonos en el Cabildo y levantemos el cuartel: con pocos fusiles, pero con la sierra entera.',
          },
        ],
      },
      {
        id: 't_cabildo',
        condition: { type: 'objective', objectiveId: 'a1_cabildo', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pumacahua',
            duration: 8,
            text: '—La Junta está formada. Organicemos el cuartel y preparemos las columnas antes de que la Audiencia reaccione.',
          },
          { type: 'objective', objectiveId: 'a1_cuartel', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_acto2',
        condition: { type: 'objective', objectiveId: 'a1_cuartel', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto II · 10 de noviembre de 1814',
            title: 'La Apacheta',
            image: 'media/junta/intro-apacheta.webp',
            text: 'La columna de Pumacahua marcha sobre Arequipa. En La Apacheta derrota a la vanguardia de Picoaga; la ciudad se rinde, pero el ejército de Ramírez ya baja del Alto Perú.',
          },
          { type: 'objective', objectiveId: 'a2_apacheta', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_apacheta',
        condition: { type: 'objective', objectiveId: 'a2_apacheta', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pumacahua',
            duration: 8,
            text: '—La Apacheta está a la vista. Sostened la posición: si la vanguardia realista cruza, la columna se deshace.',
          },
          { type: 'objective', objectiveId: 'a2_batalla', state: 'activate', announce: true },
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 4 },
              { kind: UnitKind.RIFLEMAN, count: 1 },
              { kind: UnitKind.REALISTA_DRAGON, count: 1 },
            ],
            pos: { dx: JUNTA_APACHETA.x, dz: JUNTA_APACHETA.z },
            radius: 12,
            objective: 'position',
          },
        ],
      },
      {
        id: 't_acto3',
        condition: { type: 'objective', objectiveId: 'a2_batalla', state: 'completed' },
        effects: [
          {
            type: 'act',
            kicker: 'Acto III · 11 de marzo de 1815',
            title: 'Umachiri',
            image: 'media/junta/intro-umachiri.webp',
            text: 'La división de Ramírez, veterana del Alto Perú, alcanza a la Junta en el llano de Umachiri. Los rebeldes son muchos, pero tienen pocos fusiles; la artillería y la caballería realistas deciden el campo.',
          },
          { type: 'objective', objectiveId: 'a3_umachiri', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'a3_melgar', state: 'activate' },
          { type: 'objective', objectiveId: 'a3_artilleria', state: 'activate' },
        ],
      },
      {
        id: 't_umachiri',
        condition: { type: 'objective', objectiveId: 'a3_umachiri', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            speaker: 'Pumacahua',
            duration: 9,
            text: '—No podemos ganar el campo, pero podemos resistir. Que los líderes salgan con vida; el Cusco necesitará a alguien que recuerde.',
          },
          { type: 'objective', objectiveId: 'a3_resistir', state: 'activate', announce: true },
          {
            type: 'wave',
            owner: 1,
            units: [
              { kind: UnitKind.SOLDIER, count: 4 },
              { kind: UnitKind.RIFLEMAN, count: 1 },
              { kind: UnitKind.REALISTA_DRAGON, count: 1 },
            ],
            pos: { dx: JUNTA_UMACHIRI.x, dz: JUNTA_UMACHIRI.z },
            radius: 14,
            objective: 'position',
          },
        ],
      },
    ],
  },
  {
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
  },
  {
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
  },
];

export function getMission(id: string): MissionDef | undefined {
  return MISSIONS.find((m) => m.id === id);
}
