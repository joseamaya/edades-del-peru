import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../../core/types';
import type { MissionDef } from '../../types';
import {
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_CAVE,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_SHRINE as TAMBOTOCO_HUANACAURE,
  TAMBOTOCO_VILLAGES,
} from '../../../model/defs/tambotocoLayout';
import { TAMBOTOCO_LANDSCAPE } from '../../../model/defs/landscape';

// Los hijos de Tambotoco: the cave, the Huanacaure huaca, the valley and Inticancha.
const TAMBOTOCO_TAMBO_QUIRO = { x: 70, z: 91 } as const;
const TAMBOTOCO_ENEMY = { x: 212, z: 200 } as const;
/** The canal intake (gate) and outlet (optional farm anchor), in world metres. */
const TAMBOTOCO_INTAKE = { x: 158, z: 176 } as const;
export const TAMBOTOCO_OUTLET = { x: 182, z: 194 } as const;
/** The valley sortie starts on the Huanacaure approach, not at the far enemy base. */
export const TAMBOTOCO_WAVE = { x: 142, z: 126 } as const;
/** The defended ring south of the huaca; the wave marches here. */
export const TAMBOTOCO_HOLD = { x: TAMBOTOCO_HUANACAURE.x, z: TAMBOTOCO_HUANACAURE.z + 12 } as const;
/** Ground radius (m) revealed by the narrated Act III/IV camera beats. */
const TAMBOTOCO_CAMERA_REVEAL = 45;

export const mTambotoco: MissionDef = {
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
    'Inticancha queda fundada y las cuatro canchas ordenan el sitio. La leyenda continúa: el señorío del Cusco crecerá hasta el Tahuantinsuyo.',
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
  mapOverrides: {
    culturalLandscape: TAMBOTOCO_LANDSCAPE,
    // Tambotoco is a highland valley: the andes pack replaces the generic broad/needle trees with
    // molle and pacay, keeps the riverbank willow and shifts the puna mix towards ichu at the E2b budget.
    vegetationKit: 'andes',
    vegetation: {
      density: 0.22,
      groundCover: 0.2,
      groundCoverWeights: { grass: 0.7, ichu: 1.6, pebble: 0.15, gravel: 0.15 },
      variants: { molle: 0.55, pacay: 0.25, sauce: 0.2, broad: 0, needle: 0 },
    },
    resources: { tree: 0.22 },
  },
  layout: {
    labels: [
      { text: 'Pacaritambo', x: 40 / 256, z: 58 / 256, kind: 'region' },
      { text: 'Tambotoco', x: TAMBOTOCO_CAVE.x / 256, z: TAMBOTOCO_CAVE.z / 256, kind: 'settlement' },
      { text: 'Tambo Quiro', x: TAMBOTOCO_TAMBO_QUIRO.x / 256, z: TAMBOTOCO_TAMBO_QUIRO.z / 256, kind: 'region' },
      { text: 'Huanacaure', x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, kind: 'region' },
      { text: 'Valle del Cusco', x: 196 / 256, z: 190 / 256, kind: 'region' },
    ],
    // Close to the cave mouth (blocker z ≈ 50–60): the party reads as just leaving Tambotoco.
    base: { x: 44 / 256, z: 65 / 256 },
    opening: { x: 41 / 256, z: 62 / 256 },
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
      keepout: [
        { x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, rx: 0.08, rz: 0.07 },
        // No trees or props in Inticancha's plaza and cancha plots (one grew in the middle of the plaza).
        { x: TAMBOTOCO_INTICANCHA.x / 256, z: TAMBOTOCO_INTICANCHA.z / 256, rx: 0.075, rz: 0.075 },
      ],
      buildKeepout: [{ x: TAMBOTOCO_HUANACAURE.x / 256, z: TAMBOTOCO_HUANACAURE.z / 256, rx: 0.07, rz: 0.065 }],
    },
    canal: {
      name: 'Acequia de los alcabizas',
      x: TAMBOTOCO_INTAKE.x / 256,
      z: TAMBOTOCO_INTAKE.z / 256,
      width: 1.6,
      path: [
        { x: 152 / 256, z: 160 / 256 },
        { x: 156 / 256, z: 168 / 256 },
        { x: 162 / 256, z: 174 / 256 },
        // The channel skirts Inticancha on its north-east perimeter: it must not cross the plaza ring,
        // the four cancha plots or the west/east fields, and it reaches the outlet along the field edge.
        { x: 174 / 256, z: 166 / 256 },
        { x: 186 / 256, z: 176 / 256 },
        { x: 190 / 256, z: 182 / 256 },
        { x: 188 / 256, z: 186 / 256 },
        { x: 184 / 256, z: 188 / 256 },
        { x: TAMBOTOCO_OUTLET.x / 256, z: TAMBOTOCO_OUTLET.z / 256 },
      ],
      initiallyOpen: false,
      irrigation: true,
      // The farm keepout band is 3.2 m; a 4.5 m reach still gives a legal, irrigated farm on the bank.
      irrigationReach: 4.5,
      heritageId: 'tambotoco_acequia',
      // The gate is active only after t_oleada; the defended intake is the real lock.
      lockedUntilObjective: 'a3_acequia',
      lockedHint: 'La compuerta espera a los alcabizas: primero llega a Huanacaure y resiste su oleada.',
    },
    roads: [
      // The path starts at the cave mouth and passes the Act I exit marker (a1_salida), so «sigue el camino»
      // has a camino to follow: a stony footpath, since worn dirt does not show on the dry cave flat.
      { from: { dx: 42, dz: 61 }, to: { dx: 60, dz: 92 }, width: 5, stonePath: true },
      {
        from: { dx: 60, dz: 92 },
        to: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z },
        width: 5,
        stonePath: true,
      },
      {
        from: { dx: TAMBOTOCO_HUANACAURE.x, dz: TAMBOTOCO_HUANACAURE.z },
        to: { dx: 186, dz: 196 },
        width: 5,
        stonePath: true,
      },
    ],
  },
  timeOfDay: 'morning',
  // 0.5 is noon in Sky; 0.34 is a low mid-morning sun (~31°) from the east. The cave ring, the eaves
  // and the walls cast; the late phases drop flat earth/rock to keep the draw-call cap.
  timeOfDayValue: 0.34,
  startingEra: Era.TAHUANTINSUYO,
  // 256 m / (2.4 m/s × 0.75) ≈ 2:22, the model-mission crossing band.
  unitSpeedScale: 0.75,
  startingResources: { food: 700, wood: 500, silver: 0, stone: 300 },
  start: {
    // The Ayar leave the cave with their people and nothing built: the workers raise the first camp.
    base: false,
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
    BuildingKind.HOUSE,
    BuildingKind.FARM,
    BuildingKind.MILL,
    BuildingKind.SAWMILL,
    // A movement of families, not an army: the ayllu warriors can be raised, but no fortresses,
    // walls or towers; the valley yields to the water, not to a siege.
    BuildingKind.BARRACKS,
  ],
  objectives: [
    {
      id: 'a1_salida',
      kind: 'reach',
      pos: { dx: 60, dz: 92 },
      radius: 9,
      title: 'Sal de Tambotoco y toma el camino',
    },
    {
      id: 'a1_campamento',
      kind: 'build',
      buildingKind: BuildingKind.MILL,
      count: 1,
      hidden: true,
      title: 'Levanta un depósito comunal para el campamento',
    },
    {
      id: 'a1_caza',
      kind: 'gather',
      fromNode: 'hunt',
      count: 60,
      hidden: true,
      title: 'Caza 60 de comida y llévala al depósito para sostener a las familias',
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
      title: 'Sube a Huanacaure y abre la ficha de la huaca',
    },
    {
      id: 'a3_oleada',
      kind: 'hold',
      pos: { dx: TAMBOTOCO_HOLD.x, dz: TAMBOTOCO_HOLD.z },
      radius: 10,
      minUnits: 3,
      time: 60,
      hidden: true,
      title: 'Resiste la oleada en Huanacaure',
    },
    {
      id: 'a3_acequia',
      kind: 'canal_open',
      hidden: true,
      title: 'Desvía el agua de los alcabizas: abre la compuerta de la acequia hacia tus campos',
    },
    {
      id: 'a3_riego',
      kind: 'build',
      buildingKind: BuildingKind.FARM,
      pos: { dx: TAMBOTOCO_OUTLET.x, dz: TAMBOTOCO_OUTLET.z },
      radius: 4,
      count: 1,
      hidden: true,
      optional: true,
      title: 'Riega una chacra junto a la acequia',
    },
    {
      id: 'a3_hualla',
      kind: 'reach',
      pos: { dx: TAMBOTOCO_VILLAGES[0]!.x, dz: TAMBOTOCO_VILLAGES[0]!.z + 12 },
      radius: 10,
      optional: true,
      hidden: true,
      title: 'Visita la aldea hualla y aprovisiónate',
    },
    {
      id: 'a4_inticancha',
      kind: 'build',
      buildingKind: BuildingKind.MILL,
      pos: { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z },
      radius: 16,
      hidden: true,
      title: 'Funda Inticancha: construye su depósito comunal en el sitio marcado',
    },
    {
      id: 'a4_canchas',
      kind: 'network',
      buildingKind: BuildingKind.HOUSE,
      nodes: TAMBOTOCO_CANCHAS,
      // Adjacent plots are 17-24 m apart: 6 m leaves a dead band at the midpoint (the old 9 m could
      // count one house twice) while absorbing a tree, rock or unit offset on the plot.
      radius: 6,
      count: 4,
      hidden: true,
      title: 'Construye cuatro viviendas en las canchas marcadas de Inticancha',
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
          text: '—Salimos de la cueva sin nada más que nuestra gente. Busquemos tierra y agua: donde el valle se abra, fundaremos.',
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
        { type: 'objective', objectiveId: 'a1_campamento', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_campamento',
      condition: { type: 'objective', objectiveId: 'a1_campamento', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Mama Ocllo',
          duration: 8,
          text: '—Ya tenemos dónde guardar lo que traigamos. Que los cazadores salgan: las familias necesitan comer.',
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
          title: 'Ayar Uchu en Huanacaure',
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
        { type: 'site_phase', phase: 'huanacaure' },
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
        // Hold the camera on the wave/ring, not the far valley: the player must see what is coming.
        { type: 'camera', pos: { dx: 130, dz: 128 }, reveal: TAMBOTOCO_CAMERA_REVEAL },
        { type: 'objective', objectiveId: 'a3_oleada', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a3_hualla', state: 'activate', announce: true },
        {
          type: 'wave',
          owner: 1,
          units: [
            { kind: UnitKind.SOLDIER, count: 3 },
            { kind: UnitKind.MUSKETEER, count: 2 },
          ],
          pos: { dx: TAMBOTOCO_WAVE.x, dz: TAMBOTOCO_WAVE.z },
          radius: 8,
          // They come out to meet the party at Huanacaure, as the tutorial says; the truce stops them.
          target: { dx: TAMBOTOCO_HOLD.x, dz: TAMBOTOCO_HOLD.z },
        },
      ],
    },
    {
      // The optional hualla visit pays in stores, not in a new system: the village shares its harvest.
      id: 't_hualla',
      condition: { type: 'objective', objectiveId: 'a3_hualla', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Memoria de los Ayar',
          duration: 7,
          text: 'La partida se aprovisiona en la aldea hualla: comida y madera para el campamento.',
        },
        { type: 'resources', player: 0, amount: { food: 150, wood: 100 } },
      ],
    },
    {
      id: 't_oleada',
      condition: { type: 'objective', objectiveId: 'a3_oleada', state: 'completed' },
      effects: [
        {
          type: 'dialogue',
          speaker: 'Memoria de los Ayar',
          duration: 8,
          text: 'La toma resiste. Los alcabizas ya no pueden cerrar el paso del agua: abre la compuerta y llévala a tus campos.',
        },
        // Point the camera at the intake so the unlocked gate is the next thing the player sees.
        { type: 'camera', pos: { dx: TAMBOTOCO_INTAKE.x, dz: TAMBOTOCO_INTAKE.z }, reveal: TAMBOTOCO_CAMERA_REVEAL },
        { type: 'objective', objectiveId: 'a3_acequia', state: 'activate', announce: true },
      ],
    },
    {
      id: 't_acequia',
      condition: { type: 'objective', objectiveId: 'a3_acequia', state: 'completed' },
      effects: [
        // The documented leverage (Sarmiento): without the water the alcabizas cede their land. The valley
        // ayllus stop fighting, so the foundation is built in peace rather than under a siege.
        { type: 'truce' },
        {
          type: 'dialogue',
          speaker: 'Memoria de los Ayar',
          duration: 8,
          text: 'Sin el agua de la acequia, los alcabizas ceden sus tierras. Los ayllus del valle bajan las armas y vuelven a sus aldeas.',
        },
        {
          type: 'act',
          kicker: 'Acto IV · La fundación',
          title: 'Ayar Auca en Inticancha',
          // The traced plaza and plots, not the founded settlement the epilogue shows.
          image: 'media/tambotoco/intro-traza.webp',
          text: 'Con el agua y la tierra aseguradas, los ayllus fundan Inticancha y ordenan el sitio en cuatro canchas. La leyenda del Cusco empieza aquí.',
        },
        { type: 'site_phase', phase: 'inticancha' },
        {
          type: 'camera',
          pos: { dx: TAMBOTOCO_INTICANCHA.x, dz: TAMBOTOCO_INTICANCHA.z },
          reveal: TAMBOTOCO_CAMERA_REVEAL,
        },
        { type: 'objective', objectiveId: 'a4_inticancha', state: 'activate', announce: true },
        { type: 'objective', objectiveId: 'a3_riego', state: 'activate', announce: true },
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
    {
      // The four canchas stand: only now does Inticancha read as a lived-in settlement.
      id: 't_fundada',
      condition: { type: 'objective', objectiveId: 'a4_canchas', state: 'completed' },
      effects: [{ type: 'site_phase', phase: 'fundada' }],
    },
  ],
};
