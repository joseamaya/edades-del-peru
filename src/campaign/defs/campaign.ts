import { Era, CivId, HistoricalPeriod, UnitKind, BuildingKind } from '../../core/types';
import { MissionDef } from '../types';
import { CARAL_SITE_BUILD_KEEPOUT } from '../../model/defs/sites';

const WARI_NODE_A = { ref: 'site' as const, dx: 40, dz: -32 };
const WARI_NODE_B = { ref: 'site' as const, dx: 38, dz: 34 };
const WARI_BONUS_NODE = { ref: 'site' as const, dx: -40, dz: 0 };

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1_caral',
    title: 'La Ciudad Sagrada',
    subtitle: 'Arcaico Tardío · c. 3000 a.C.',
    history:
      'En el valle de Supe, entre el océano y los Andes, crece una de las primeras ciudades de América. ' +
      'Sus canales, campos de cultivo y plazas se sostienen con trabajo comunal.\n' +
      'No hay guerra documentada: organiza la agricultura, aprovecha el litoral y guarda el excedente para sostener a la comunidad.',
    victory:
      'Caral prospera durante siglos como centro de la civilización andina. Su legado guiará a las culturas del Perú durante milenios.',
    defeat: 'El valle no logra sostener a su comunidad. La primera ciudad de América no llega a consolidarse.',
    period: HistoricalPeriod.ARCHAIC,
    tutorial: true,
    playerCiv: CivId.CARAL,
    enemyCiv: CivId.CARAL,
    map: { seed: 3000, type: 'coast', size: 192 },
    atmosphere: { fogDensity: 0.0032, sunWarmth: 0.9, skyTint: '#cdd3d2' },
    layout: {
      base: { x: 0.315, z: 0.84 },
      site: {
        id: 'caral_site',
        y: 8,
        focus: { x: 0.52, z: 0.277 },
        keepout: [{ x: 0.52, z: 0.45, rx: 0.27, rz: 0.43 }],
        buildKeepout: [...CARAL_SITE_BUILD_KEEPOUT],
      },
      canal: {
        name: 'Canal comunal del valle',
        x: 0.2,
        z: 0.68,
        length: 18,
        yaw: 0.15,
        initiallyOpen: false,
        irrigation: true,
        heritageId: 'caral_canal',
      },
      terrain: {
        river: {
          z: 0.55,
          width: 0.04,
          valleyWidth: 0.16,
          amplitude: 0.012,
          phase: 0.7,
          fords: [{ x: 0.5, width: 0.08 }],
        },
      },
    },
    mapOverrides: {
      terrain: { terraceChance: 0.08, riverCount: 0 },
      climate: { aridity: 0.78, moisture: 0.34 },
      vegetation: { density: 0.06 },
      // Caral has no documented silver extraction or coastal vicuña herds.
      resources: { tree: 0.35, mine: 0, hunt: 0 },
      culturalLandscape: null,
      groundTint: '#b7ab96',
    },
    guaranteedFishing: 3,
    timeOfDay: 'morning',
    startingEra: Era.FORMATIVE,
    startingResources: { food: 250, wood: 120, silver: 150, stone: 80 },
    start: {},
    enemy: { active: false, difficulty: 'easy', aggression: 0 },
    objectives: [
      {
        id: 'obj_agricultura',
        kind: 'build',
        buildingKind: BuildingKind.FARM,
        count: 2,
        title: 'Prepara dos campos de cultivo en el valle',
      },
      {
        id: 'obj_almacenamiento',
        kind: 'build',
        buildingKind: BuildingKind.MILL,
        count: 1,
        hidden: true,
        title: 'Construye un depósito comunal (Troje)',
      },
      {
        id: 'obj_alimento',
        kind: 'gather',
        resource: 'food',
        count: 500,
        hidden: true,
        title: 'Reúne 500 de comida para sostener a la comunidad',
      },
      {
        id: 'obj_complejo',
        kind: 'inspect',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 14,
        heritageIds: ['caral_pyramid_mayor'],
        title: 'Observa la Gran Pirámide y la Plaza Central',
      },
      { id: 'obj_sostener', kind: 'survive', time: 300, title: 'Sostén el asentamiento 5 minutos' },
      {
        id: 'obj_riego',
        kind: 'canal_open',
        optional: true,
        hidden: true,
        title: 'Abre la compuerta del canal comunal',
      },
      {
        id: 'obj_asamblea',
        kind: 'hold',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 18,
        time: 20,
        unitKind: UnitKind.WORKER,
        requires: 'obj_complejo',
        hidden: true,
        optional: true,
        title: 'Convoca una asamblea comunal en la Plaza Central',
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
        title: 'Recorre los seis complejos piramidales de Caral Alto',
      },
    ],
    triggers: [
      {
        id: 't_dial_1',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'El río Supe y el litoral sostienen el valle. Explorad la costa y organizad el trabajo de la comunidad.',
          },
        ],
      },
      {
        id: 't_dial_2',
        condition: { type: 'time', seconds: 150 },
        effects: [
          {
            type: 'dialogue',
            text: 'En Áspero se pesca con redes de algodón; el valle responde con cultivos. La ciudad crece sin guerra documentada.',
          },
        ],
      },
      {
        id: 't_cosecha',
        condition: { type: 'objective', objectiveId: 'obj_agricultura', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'Los campos junto al agua y los canales rinden más. La tierra sostiene a la comunidad.',
          },
          { type: 'objective', objectiveId: 'obj_almacenamiento', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'obj_alimento', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_troje',
        condition: { type: 'objective', objectiveId: 'obj_almacenamiento', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'El depósito guarda el excedente. Con trabajo comunal y reservas se levantan plazas y pirámides.',
          },
          { type: 'objective', objectiveId: 'obj_riego', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_complejo',
        condition: { type: 'objective', objectiveId: 'obj_complejo', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La escala de plazas y pirámides se asocia al excedente y al trabajo comunal; es una interpretación arqueológica, no un registro escrito. La Plaza Central permite convocar una asamblea comunal.',
          },
          { type: 'objective', objectiveId: 'obj_complejos', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_asamblea',
        condition: { type: 'objective', objectiveId: 'obj_asamblea', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La comunidad se reúne en la plaza: el trabajo comunal organiza el valle y sostiene el excedente.',
          },
        ],
      },
      {
        id: 't_abandono',
        condition: { type: 'time', seconds: 240 },
        effects: [
          {
            type: 'dialogue',
            text: 'Los arqueólogos debaten el abandono de Caral: sismos o El Niño, entre otras causas. No hay ejército rival en el registro.',
          },
        ],
      },
    ],
  },
  {
    id: 'm2_chavin',
    title: 'El Oráculo de Chavín',
    subtitle: 'Horizonte Temprano · c. 900–500 a.C.',
    history:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos, es el gran centro ceremonial de los Andes. Peregrinos de lejos traen ofrendas al oráculo.\n' +
      'No hay guerra documentada: tu poder es el prestigio del culto. Entrega ofrendas, recibe peregrinos y sostén el centro ceremonial.',
    victory:
      'La influencia de Chavín se extiende por buena parte de los Andes centrales. Su arte y su culto marcan una época.',
    defeat: 'El oráculo pierde su prestigio y el centro ceremonial declina antes de tiempo.',
    period: HistoricalPeriod.EARLY_HORIZON,
    tutorial: true,
    playerCiv: CivId.CHAVIN,
    enemyCiv: CivId.PARACAS,
    map: { seed: 900, type: 'andes', size: 192 },
    timeOfDay: 'noon',
    // Callejón de Conchucos: cool highland mist around the ceremonial center.
    atmosphere: { fogDensity: 0.0042, skyTint: '#c8d6d0', sunWarmth: 0.9 },
    layout: {
      base: { x: 0.3, z: 0.61 },
      site: {
        id: 'chavin_site',
        y: 4.6,
        focus: { x: 0.51, z: 0.456 },
        keepout: [{ x: 0.51, z: 0.456, rx: 0.19, rz: 0.17 }],
        buildKeepout: [{ x: 0.51, z: 0.456, rx: 0.17, rz: 0.14 }],
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
    startingResources: { food: 300, wood: 450, silver: 300, stone: 100 },
    start: {},
    enemy: { active: false, difficulty: 'easy', aggression: 0 },
    objectives: [
      {
        id: 'obj_ofrendas',
        kind: 'deliver',
        resource: 'silver',
        count: 250,
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 18,
        title: 'Entrega 250 de plata como ofrendas en el templo',
      },
      {
        id: 'obj_peregrinaje',
        kind: 'hold',
        pos: { ref: 'site', dx: 0, dz: 0 },
        radius: 14,
        time: 60,
        unitKind: UnitKind.WORKER,
        hidden: true,
        requires: 'obj_ofrendas',
        title: 'Recibe a los peregrinos en la Plaza Circular',
      },
      {
        id: 'obj_feria',
        kind: 'build',
        buildingKind: BuildingKind.MARKET,
        count: 1,
        pos: { ref: 'site', dx: 0, dz: 34 },
        radius: 16,
        hidden: true,
        requires: 'obj_ofrendas',
        title: 'Abre la feria de peregrinos junto al templo',
      },
      { id: 'obj_sostener', kind: 'survive', time: 420, title: 'Sostén el centro ceremonial 7 minutos' },
      {
        id: 'bonus_ofrenda_mayor',
        kind: 'deliver',
        resource: 'silver',
        count: 400,
        hidden: true,
        requires: 'obj_ofrendas',
        optional: true,
        title: 'Ofrenda mayor: entrega 400 de plata',
      },
    ],
    triggers: [
      {
        id: 't_dial_0',
        condition: { type: 'time', seconds: 20 },
        effects: [
          {
            type: 'dialogue',
            text: 'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos, es el gran centro ceremonial de los Andes. Peregrinos de lejos traen ofrendas al oráculo.',
          },
        ],
      },
      {
        id: 't_dial_1',
        condition: { type: 'time', seconds: 180 },
        effects: [
          {
            type: 'dialogue',
            text: 'Mientras Chavín reúne a los Andes, en la costa sur florece Paracas: culturas coetáneas, sin guerra entre ellas.',
          },
        ],
      },
      {
        id: 't_ofrendas',
        condition: { type: 'objective', objectiveId: 'obj_ofrendas', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'Las ofrendas llegan al Templo del Lanzón. Abre la feria, recibe a los peregrinos y sostén el prestigio del oráculo.',
          },
          { type: 'objective', objectiveId: 'obj_peregrinaje', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'obj_feria', state: 'activate', announce: true },
          { type: 'objective', objectiveId: 'bonus_ofrenda_mayor', state: 'activate', announce: true },
        ],
      },
      {
        id: 't_peregrinaje',
        condition: { type: 'objective', objectiveId: 'obj_peregrinaje', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'El oráculo recibe a los peregrinos: las ofrendas sostienen el templo y su prestigio crece.',
          },
          { type: 'resources', player: 0, amount: { silver: 100, food: 100 } },
        ],
      },
      {
        id: 't_feria',
        condition: { type: 'objective', objectiveId: 'obj_feria', state: 'completed' },
        effects: [
          {
            type: 'dialogue',
            text: 'La feria reúne a peregrinos y artesanos. El intercambio de larga distancia forma parte del prestigio del centro ceremonial.',
          },
        ],
      },
      {
        id: 't_declive',
        condition: { type: 'time', seconds: 300 },
        effects: [
          {
            type: 'dialogue',
            text: 'Los arqueólogos debaten el declive de Chavín hacia 500–200 a.C.; su influencia se fragmenta y da paso a las culturas regionales.',
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
      'Asegurad los valles y sus canales, defended las huacas y sostened el intercambio de élite con la sierra.',
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
          { type: 'dialogue', text: '¡Recuay cruza la quebrada por el norte! ¡Defended la plaza!' },
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
          { type: 'dialogue', text: 'Otra columna baja desde el Callejón de Huaylas. ¡Reforzad el flanco este!' },
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
            text: 'La despensa está corta, pero nuestros caminos no. Reunid suministros y conectad dos centros provinciales.',
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
    id: 'm5_yahuar_pampa',
    commanders: ['cusi_yupanqui', 'anccu_hualloc'],
    title: 'Yahuar Pampa',
    subtitle: 'Cusco · 1438',
    history:
      'La confederación Chanca, al mando de Anccu Hualloc, marcha sobre el Cusco. El inca Viracocha y su heredero huyen; el príncipe Cusi Yupanqui organiza la defensa.\n' +
      'Resistid el asedio y repeled al ejército chanca. De esta batalla nacerá el Tahuantinsuyo.',
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
      'Al mando del auqui Túpac Yupanqui, avanzad por Paramonga y el valle del Santa. Cortad el canal que abastece de agua a Chan Chan: sin agua, la ciudad no puede resistir.',
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
        title: 'Avanzad hasta Paramonga',
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
            text: 'Túpac Yupanqui: —Minchancaman no se someterá. Avanzad por los valles y cortadle el agua a Chan Chan.',
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
            text: 'Túpac Yupanqui: —¡Paramonga ha caído! Avanzad por el valle del Santa hacia Chan Chan.',
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
    id: 'm7_tupac_amaru',
    commanders: ['tupac_amaru', 'micaela_bastidas'],
    title: 'La Gran Rebelión',
    subtitle: 'Virreinato · 1780–1781',
    history:
      'José Gabriel Condorcanqui, Túpac Amaru II, se alza contra los abusos del Virreinato: la mita, el reparto y los obrajes. Micaela Bastidas organiza el avituallamiento.\n' +
      'Sostened la rebelión y tomad el centro de mando realista.',
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
      UnitKind.COMMISSAR,
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
              { kind: UnitKind.SOLDIER, count: 6 },
              { kind: UnitKind.RIFLEMAN, count: 3 },
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
    id: 'm8_independencia',
    commanders: ['san_martin', 'bolivar', 'sucre'],
    title: 'La Independencia',
    subtitle: 'Junín–Ayacucho · 1824',
    history:
      'San Martín proclama la independencia en Lima en 1821. La campaña final se libra en la sierra: la caballería patriota sostiene Junín (6 de agosto de 1824) y, meses después, el ejército de Sucre resiste en Ayacucho (9 de diciembre de 1824).\n' +
      'Sostened Junín, proteged a Sucre y resistid en Ayacucho hasta la rendición realista.',
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
            text: 'General patriota: —La independencia se decide en la sierra. ¡Sostened Junín y proteged a Sucre!',
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
              { kind: UnitKind.CAVALRY, count: 3 },
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
      'Defended el puerto y mantened con vida a Bolognesi hasta que termine el asalto.',
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
        { kind: UnitKind.SOLDIER, dx: 8, dz: 0, count: 4 },
      ],
    },
    mark: [{ tag: 'centro_enemigo', kind: BuildingKind.CENTER, owner: 1 }],
    enemy: { active: true, difficulty: 'hard', aggression: 1.4 },
    tutorial: true,
    // A land defense of the port: no siege train in this scenario.
    allowedUnits: [
      UnitKind.WORKER,
      UnitKind.SOLDIER,
      UnitKind.RIFLEMAN,
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
              { kind: UnitKind.RIFLEMAN, count: 3 },
              { kind: UnitKind.CAVALRY, count: 1 },
            ],
            pos: { ref: 'player', dx: -12, dz: 20 },
            radius: 7,
          },
          { type: 'dialogue', text: '¡Refuerzos chilenos! ¡Sostened la línea!' },
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
