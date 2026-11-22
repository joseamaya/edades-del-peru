import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import { highValleyVegetation } from '../../../model/defs/profiles';
import type { MissionDef } from '../../types';
import { chavinKeepout } from '../../../model/defs/chavinCity';

// The geography of the Mosna valley, shared by the layout, the objectives and the cinema map (map fractions).
const CHAVIN_MAP_SIZE = 256;
/** The pilgrims' camp in the Callejón de Conchucos, where the mission starts. */
const CHAVIN_BASE = { x: 0.3, z: 0.61 } as const;
/** The ceremonial terrace: the Old Temple's forecourt (what `ref: 'site'` resolves to). */
const CHAVIN_SITE_FOCUS = { x: 0.51, z: 0.456 } as const;
/** The Mosna's course across the map, and its ford. */
const CHAVIN_RIVER_Z = 0.2;
const CHAVIN_FORD_X = 0.36;
/** World metres of a map fraction, for the cinema map. */
const world = (p: { x: number; z: number }) => ({ x: p.x * CHAVIN_MAP_SIZE, z: p.z * CHAVIN_MAP_SIZE });
const CHAVIN_BASE_AT = world(CHAVIN_BASE);
const CHAVIN_SITE_AT = world(CHAVIN_SITE_FOCUS);
const CHAVIN_FORD_AT = world({ x: CHAVIN_FORD_X, z: CHAVIN_RIVER_Z });

export const m2Chavin: MissionDef = {
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
  // Played as a letterboxed film (scripts/capture_cinema.mjs): the temple in the Mosna valley, a map drawn
  // from this mission's own geometry (the pilgrims' camp, the ford and the ceremonial terrace), then the
  // pilgrims at the plaza. There is no documented war, so the map has no enemy. It does not tell the
  // decline: the act cards and the epilogue do.
  introStyle: 'cinema',
  intro: [
    {
      kicker: 'CALLEJÓN DE CONCHUCOS · c. 900 a.C.',
      title: 'Entre el río y las alturas',
      text: 'A 3180 msnm, el río Mosna cruza un valle estrecho entre montañas. Allí, donde se cruzan los caminos de la sierra y la costa, crece un centro ceremonial.',
      seconds: 10,
      source: 'docs/historia/campanas/chavin.md',
      image: 'media/chavin/cine-valle.webp',
      motion: 'push',
    },
    {
      kicker: 'EL ORÁCULO',
      title: 'Peregrinos y ofrendas',
      text: 'El oráculo de Chavín atrae a peregrinos de lejos. Traen plata, conchas y obsidiana; a cambio buscan consejo y participación en un culto que se extiende por los Andes.',
      seconds: 11,
      source: 'docs/historia/civilizaciones/chavin.md',
      map: {
        // The valley between the pilgrims' camp, the Mosna and the ceremonial terrace.
        view: { x: 40, z: 30, size: 144 },
        marks: [
          { x: CHAVIN_SITE_AT.x, z: CHAVIN_SITE_AT.z - 12, label: 'Chavín de Huántar', side: 'place' },
          { x: CHAVIN_SITE_AT.x - 2, z: CHAVIN_RIVER_Z * CHAVIN_MAP_SIZE - 8, label: 'Río Mosna', side: 'place' },
          { x: CHAVIN_BASE_AT.x, z: CHAVIN_BASE_AT.z + 8, label: 'Peregrinos', side: 'player', delay: 0.6 },
        ],
        routes: [
          {
            side: 'player',
            label: 'Al templo',
            points: [
              { x: CHAVIN_BASE_AT.x + 4, z: CHAVIN_BASE_AT.z - 4 },
              { x: CHAVIN_SITE_AT.x - 8, z: CHAVIN_SITE_AT.z + 8 },
            ],
            delay: 1.2,
          },
          {
            side: 'player',
            label: 'Camino del Mosna',
            dashed: true,
            points: [
              { x: CHAVIN_FORD_AT.x, z: CHAVIN_FORD_AT.z },
              { x: CHAVIN_SITE_AT.x - 6, z: CHAVIN_SITE_AT.z - 8 },
            ],
            delay: 3.6,
          },
        ],
      },
    },
    {
      kicker: 'TU PEREGRINACIÓN',
      title: 'Un templo que crece por fases',
      text: 'El Templo Viejo y luego el Templo Nuevo se levantan con trabajo comunal. Llega al centro ceremonial y entrega tus ofrendas: cada ampliación exige piedra, alimentos y prestigio.',
      seconds: 10,
      source: 'docs/historia/campanas/chavin.md',
      image: 'media/chavin/cine-plaza.webp',
      motion: 'pan-left',
    },
  ],
  tutorial: true,
  modelMission: true,
  playerCiv: CivId.CHAVIN,
  enemyCiv: CivId.PARACAS,
  region: 'andean_valley',
  map: { seed: 900, type: 'andes', size: 256 },
  timeOfDay: 'noon',
  // Callejón de Conchucos: cool highland mist around the ceremonial center.
  atmosphere: { fogDensity: 0.0042, skyTint: '#c8d6d0', sunWarmth: 0.9 },
  layout: {
    labels: [
      { text: 'Chavín de Huántar', ...CHAVIN_SITE_FOCUS, kind: 'settlement' },
      { text: 'Callejón de Conchucos', ...CHAVIN_BASE, kind: 'region' },
      { text: 'Río Mosna', x: 0.5, z: CHAVIN_RIVER_Z, kind: 'water' },
    ],
    base: { ...CHAVIN_BASE },
    site: {
      id: 'chavin_site',
      y: 4.6,
      focus: { ...CHAVIN_SITE_FOCUS },
      keepout: [chavinKeepout({ ...CHAVIN_SITE_FOCUS, rx: 0.19, rz: 0.17 })],
      buildKeepout: [chavinKeepout({ ...CHAVIN_SITE_FOCUS, rx: 0.17, rz: 0.14 })],
      // The Old Temple starts as a foundation; acts II and III complete it and raise the New Temple.
      phase: 'old_temple_foundation',
    },
    terrain: {
      // The Mosna valley and the flat ceremonial terrace.
      river: {
        name: 'Valle del Mosna',
        z: CHAVIN_RIVER_Z,
        width: 0.035,
        valleyWidth: 0.13,
        amplitude: 0.008,
        phase: 0.4,
        fords: [{ x: CHAVIN_FORD_X, width: 0.08 }],
      },
      flats: [{ name: 'Terraza ceremonial de Chavín', ...CHAVIN_SITE_FOCUS, rx: 0.2, rz: 0.17 }],
    },
  },
  mapOverrides: {
    terrain: { riverCount: 0, terraceChance: 0.1 },
    climate: { aridity: 0.05, moisture: 0.8, temperature: 0.3 },
    vegetation: highValleyVegetation(0.8),
    resources: { tree: 0.8, mine: 0.6, well: 0.5, hunt: 0.4, berry: 0.6 },
    culturalLandscape: null,
    groundTint: '#b9d29a',
    vegetationKit: 'andes',
  },
  startingEra: Era.REGIONAL_STATES,
  // Same 256 m transect and crossing band as Caral (see caral-model-mission.md §Pacing and map scale).
  unitSpeedScale: 0.75,
  // Chavín has no documented war: dwellings, storehouses, fields and the pilgrimage fair, no army.
  allowedBuildings: [BuildingKind.HOUSE, BuildingKind.MILL, BuildingKind.FARM, BuildingKind.MARKET],
  allowedUnits: [UnitKind.WORKER, UnitKind.SCOUT],
  // Only Early Horizon technologies, and only those its four buildings can host: no war techs, no later
  // Andean engineering, and none of the loom/metallurgy techs that need an institute or a smelter.
  allowedTechs: ['irrigation_canal', 'chavin_pilgrimage'],
  // The fair is the mission's own institution, not a generic market.
  buildingNames: { [BuildingKind.MARKET]: 'Feria de peregrinos' },
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
      // Hidden so it waits for the arrival trigger: a visible goal opens with the mission, and the
      // offering could be handed over before the column reached the ceremonial centre.
      hidden: true,
      requires: 'a1_llegada',
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
      title: 'Acto II · Entrega 120 de piedra para el Templo Viejo',
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
      title: 'Acto IV · Recorre la Plaza, el Templo Viejo, sus galerías, el Templo Nuevo y la Portada',
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
};
