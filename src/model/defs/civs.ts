import { CivId, HistoricalPeriod, Geography, CivEffects } from '../../core/types';

export interface CivDef {
  id: CivId;
  name: string;
  adjective: string;
  /** Team colors for units and banners. */
  colors: { primary: string; secondary: string; accent: string };
  /** Historical periods in which the civilization existed. */
  periods: HistoricalPeriod[];
  /** Base geography (determines the map type). */
  geography: Geography;
  /** Civil bonuses (informational text, shown in the codex). */
  bonuses: string[];
  /** Numeric effects of those bonuses (applied in play). */
  effects?: CivEffects;
  description: string;
}

export const CIVS: CivDef[] = [
  {
    id: CivId.CARAL,
    name: 'Caral-Supe',
    adjective: 'caralino',
    colors: { primary: '#b0885a', secondary: '#d8c8a0', accent: '#8a6a3a' },
    periods: [HistoricalPeriod.ARCHAIC],
    geography: 'coast',
    bonuses: [
      'Canales y humedales: granjas más productivas',
      'Pesca del litoral (Áspero) mejorada',
      'Edificios más resistentes',
    ],
    effects: { gathering: { food: 0.2 } },
    description:
      'La primera ciudad de América. En el valle de Supe, Caral organizó miles de personas con canales, comercio y religión.',
  },
  {
    id: CivId.CHAVIN,
    name: 'Chavín',
    adjective: 'chavín',
    colors: { primary: '#6a6a72', secondary: '#c8c2b4', accent: '#8a7a5a' },
    periods: [HistoricalPeriod.EARLY_HORIZON],
    geography: 'andes',
    bonuses: [
      'Oráculo: mayor línea de visión',
      'Arte y culto de amplia influencia',
      'Peregrinaje: recursos de intercambio',
    ],
    effects: { los: 2 },
    description:
      'Centro ceremonial y oráculo de los Andes. Su arte felínico y su culto influyeron en casi todo el Perú antiguo.',
  },
  {
    id: CivId.PARACAS,
    name: 'Paracas',
    adjective: 'paraqueño',
    colors: { primary: '#8a3a3a', secondary: '#e8d0a0', accent: '#3a6a8a' },
    periods: [HistoricalPeriod.EARLY_HORIZON, HistoricalPeriod.EARLY_INTERMEDIATE],
    geography: 'coast',
    bonuses: ['Textiles funerarios: comercio de lujo', 'Trepanaciones: unidades más resistentes', 'Pesca y marisqueo'],
    effects: { armor: 0.1 },
    description:
      'Maestros textiles de la costa desértica. Sus fardos funerarios y cerámica de Ocucaje marcan el Formativo del sur.',
  },
  {
    id: CivId.CUPISNIQUE,
    name: 'Cupisnique',
    adjective: 'cupisnique',
    colors: { primary: '#9a6a4a', secondary: '#d8c0a0', accent: '#3a5a6a' },
    periods: [HistoricalPeriod.EARLY_HORIZON],
    geography: 'coast',
    bonuses: [
      'Adobe monumental (Huaca de los Reyes): edificios más resistentes',
      'Cerámica ceremonial: economía más eficiente',
      'Pesca y marisqueo: comida +10%',
    ],
    effects: { armor: 0.1, gathering: { food: 0.1 } },
    description:
      'Cultura formativa de la costa norte (c. 1500–1000 a.C.), precursora y coetánea de Chavín, célebre por su arquitectura de adobe y su cerámica.',
  },
  {
    id: CivId.MOCHE,
    name: 'Cultura Moche',
    adjective: 'moche',
    colors: { primary: '#a83a2a', secondary: '#e8d0a0', accent: '#d8a040' },
    periods: [HistoricalPeriod.EARLY_INTERMEDIATE],
    geography: 'coast',
    bonuses: [
      'Cerámica ritual: economía más eficiente',
      'Guerreros moche: infantería +10% de ataque',
      'Huacas de adobe: defensas más baratas',
    ],
    effects: { attack: 0.1, gathering: { silver: 0.1 } },
    description:
      'Señores de la costa norte. Sus huacas, huacos retrato y rituales de sacrificio muestran un poder basado en la ideología.',
  },
  {
    id: CivId.NAZCA,
    name: 'Cultura Nazca',
    adjective: 'nazca',
    colors: { primary: '#b0603a', secondary: '#d8b088', accent: '#3a6a9a' },
    periods: [HistoricalPeriod.EARLY_INTERMEDIATE],
    geography: 'coast',
    bonuses: [
      'Geoglifos: mayor línea de visión',
      'Acueductos (puquios): comida +20%',
      'Textiles: unidades a distancia más baratas',
    ],
    effects: { gathering: { food: 0.2 }, los: 1 },
    description:
      'Los trazos de la pampa. Geoglifos, puquios y cerámica polícroma testimonian su dominio del desierto y del cielo.',
  },
  {
    id: CivId.RECUAY,
    name: 'Cultura Recuay',
    adjective: 'recuay',
    colors: { primary: '#7a6a4a', secondary: '#d8c8a0', accent: '#a85a2a' },
    periods: [HistoricalPeriod.EARLY_INTERMEDIATE],
    geography: 'andes',
    bonuses: [
      'Ganadería de camélidos: población y comida',
      'Escultura lítica: edificios +HP',
      'Fortificaciones de altura',
    ],
    effects: { population: 5, gathering: { food: 0.1 } },
    description:
      'Señores del Callejón de Huaylas. Ganaderos y guerreros de la sierra de Áncash, en conflicto con los Moche.',
  },
  {
    id: CivId.WARI,
    name: 'Imperio Wari',
    adjective: 'wari',
    colors: { primary: '#8a5a2a', secondary: '#d8b06a', accent: '#3a3a3a' },
    periods: [HistoricalPeriod.MIDDLE_HORIZON],
    geography: 'andes',
    bonuses: [
      'Primer imperio andino: más población',
      'Red vial: unidades más veloces',
      'Andenes: granjas más productivas',
    ],
    effects: { population: 10, speed: 0.1, gathering: { food: 0.1 } },
    description:
      'El primer imperio andino, desde Ayacucho. Planificó ciudades, caminos y una religión estatal del dios de los báculos.',
  },
  {
    id: CivId.TIAHUANACO,
    name: 'Tiahuanaco',
    adjective: 'tiahuanacota',
    colors: { primary: '#6a7a8a', secondary: '#c8d0d8', accent: '#c8a040' },
    periods: [HistoricalPeriod.EARLY_INTERMEDIATE, HistoricalPeriod.MIDDLE_HORIZON],
    geography: 'altiplano',
    bonuses: ['Waru-warus: comida +25%', 'Arquitectura megalítica: edificios +HP', 'Chullpas: mejor defensa'],
    effects: { gathering: { food: 0.2 }, armor: 0.1 },
    description:
      'El estado del altiplano del Titicaca. Su arquitectura monumental y su culto irradiaron el sur andino.',
  },
  {
    id: CivId.CHIMU,
    name: 'Reino Chimú',
    adjective: 'chimú',
    colors: { primary: '#1f6f6f', secondary: '#d8c8a0', accent: '#c8a040' },
    periods: [HistoricalPeriod.LATE_INTERMEDIATE],
    geography: 'coast',
    bonuses: ['Orfebrería: plata +20%', 'Chan Chan: viviendas más baratas', 'Canales: agricultura mejorada'],
    effects: { gathering: { silver: 0.2 } },
    description:
      'Los señores de Chan Chan, la ciudad de barro más grande de América, célebres por su orfebrería en oro y plata.',
  },
  {
    id: CivId.CHINCHA,
    name: 'Señorío de Chincha',
    adjective: 'chincha',
    colors: { primary: '#8a7a3a', secondary: '#e0d0a0', accent: '#2a6a6a' },
    periods: [HistoricalPeriod.LATE_INTERMEDIATE],
    geography: 'coast',
    bonuses: ['Comercio marítimo: recursos extra', 'Balsas de totora: unidades navales', 'Mercaderes: oro y plata'],
    effects: { gathering: { silver: 0.1, food: 0.1 }, carry: 5 },
    description:
      'La gran potencia comercial de la costa sur. Sus mercaderes llegaban al Cusco, al Collao y hasta Quito.',
  },
  {
    id: CivId.CHANCA,
    name: 'Confederación Chanca',
    adjective: 'chanca',
    colors: { primary: '#7a3a2a', secondary: '#c8a888', accent: '#d8a040' },
    periods: [HistoricalPeriod.LATE_INTERMEDIATE],
    geography: 'andes',
    bonuses: ['Guerreros de altura: +ataque', 'Fortalezas en cerros: defensa', 'Movilización rápida'],
    effects: { attack: 0.15, speed: 0.05 },
    description: 'La confederación guerrera de Andahuaylas que estuvo a punto de tomar el Cusco en 1438.',
  },
  {
    id: CivId.COLLAS_LUPACA,
    name: 'Señoríos Collas y Lupaca',
    adjective: 'colla',
    colors: { primary: '#5a6a8a', secondary: '#c8d0d8', accent: '#c8a040' },
    periods: [HistoricalPeriod.LATE_INTERMEDIATE],
    geography: 'altiplano',
    bonuses: [
      'Ganadería de camélidos: más población',
      'Puna y quinua: comida +15%',
      'Torres funerarias (chullpas): defensa',
    ],
    effects: { population: 5, gathering: { food: 0.15 } },
    description:
      'Los reinos aimaras del altiplano del Titicaca (c. 1150–1477). Pastores y agricultores de la puna, ricos en rebaños, que resistieron y luego se sometieron al Tahuantinsuyo.',
  },
  {
    id: CivId.HUANCA,
    name: 'Nación Huanca',
    adjective: 'huanca',
    colors: { primary: '#7a5a3a', secondary: '#d8c0a0', accent: '#b04030' },
    periods: [HistoricalPeriod.LATE_INTERMEDIATE],
    geography: 'andes',
    bonuses: [
      'Valle del Mantaro: comida +10% y madera +10%',
      'Confederación de ayllus: movilización rápida',
      'Pastores de altura',
    ],
    effects: { gathering: { food: 0.1, wood: 0.1 }, speed: 0.05 },
    description:
      'Los huanca del valle del Mantaro (Junín), organizados en una confederación de ayllus, en la pugna de la sierra central entre chancas e incas.',
  },
  {
    id: CivId.INCA,
    name: 'Tahuantinsuyo',
    adjective: 'inca',
    colors: { primary: '#c8a040', secondary: '#b03028', accent: '#f0d060' },
    periods: [HistoricalPeriod.LATE_HORIZON],
    geography: 'andes',
    bonuses: [
      'Mampostería imperial: edificios más resistentes',
      'Andenes: granjas más productivas',
      'Chasquis: exploradores más veloces',
    ],
    effects: { gathering: { food: 0.1 }, speed: 0.1 },
    description: 'Los Hijos del Sol. Del Cusco al Qhapaq Ñan, su imperio unió los Andes con piedra, andenes y quipus.',
  },
  {
    id: CivId.REALISTAS,
    name: 'Realistas (España)',
    adjective: 'realista',
    colors: { primary: '#8a2a2a', secondary: '#d8c8a0', accent: '#c8a040' },
    periods: [HistoricalPeriod.VICEROYALTY, HistoricalPeriod.INDEPENDENCE],
    geography: 'andes',
    bonuses: [
      'Ejército virreinal: infantería más resistente',
      'Mita minera: plata +20%',
      'Obrajes: producción acelerada',
    ],
    effects: { armor: 0.1, gathering: { silver: 0.2 }, training: 0.1 },
    description: 'El ejército y la administración del Virreinato del Perú, defensores de la Corona española.',
  },
  {
    id: CivId.PATRIOTAS,
    name: 'Patriotas',
    adjective: 'patriota',
    colors: { primary: '#2a4a8a', secondary: '#e8e0d0', accent: '#c8a040' },
    periods: [HistoricalPeriod.INDEPENDENCE],
    geography: 'andes',
    bonuses: ['Montoneras: unidades ligeras veloces', 'Causa libertadora: moral alta', 'Campaña de la sierra'],
    effects: { speed: 0.15 },
    description: 'Los ejércitos libertadores de San Martín, Bolívar y Sucre que sellaron la independencia en Ayacucho.',
  },
  {
    id: CivId.REPUBLIC,
    name: 'República del Perú',
    adjective: 'peruano',
    colors: { primary: '#b03030', secondary: '#e8e8e8', accent: '#c8a040' },
    periods: [HistoricalPeriod.REPUBLIC, HistoricalPeriod.CONTEMPORARY],
    geography: 'coast',
    bonuses: ['Defensa del puerto: fortificaciones', 'Marina: unidades navales', 'Logística republicana'],
    effects: { armor: 0.1, training: 0.1 },
    description: 'La República del Perú. Del guano y el salitre a la defensa de su litoral en la Guerra del Pacífico.',
  },
  {
    id: CivId.CHILE,
    name: 'Chile',
    adjective: 'chileno',
    colors: { primary: '#1f3a6a', secondary: '#e8e8e8', accent: '#c8302a' },
    periods: [HistoricalPeriod.REPUBLIC],
    geography: 'coast',
    bonuses: ['Escuadra blindada: unidades navales', 'Artillería pesada', 'Fuerzas expedicionarias'],
    effects: { attack: 0.15, speed: 0.05 },
    description: 'La escuadra y el ejército de Chile durante la Guerra del Pacífico (1879–1883).',
  },
];

export function getCiv(id: CivId): CivDef {
  return CIVS.find((c) => c.id === id)!;
}

/** Civilizations available in a period (coetaneous). */
export function civsForPeriod(period: HistoricalPeriod): CivDef[] {
  return CIVS.filter((c) => c.periods.includes(period));
}
