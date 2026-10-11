import { CivId, Periodo, Geografia } from '../../core/types';

export interface CivDef {
  id: CivId;
  nombre: string;
  adjetivo: string;
  /** Colores de equipo para unidades y banderas. */
  colors: { primary: string; secondary: string; accent: string };
  /** Periodos históricos en los que existió la civilización. */
  periodos: Periodo[];
  /** Geografía base (determina el tipo de mapa). */
  geografia: Geografia;
  /** Bonificaciones civiles (texto informativo). */
  bonuses: string[];
  descripcion: string;
}

export const CIVS: CivDef[] = [
  {
    id: CivId.CARAL,
    nombre: 'Caral-Supe',
    adjetivo: 'caralino',
    colors: { primary: '#b0885a', secondary: '#d8c8a0', accent: '#8a6a3a' },
    periodos: [Periodo.ARCAICO],
    geografia: 'costa',
    bonuses: ['Canales y humedales: granjas más productivas', 'Pesca del litoral (Áspero) mejorada', 'Edificios más resistentes'],
    descripcion: 'La primera ciudad de América. En el valle de Supe, Caral organizó miles de personas con canales, comercio y religión.',
  },
  {
    id: CivId.CHAVIN,
    nombre: 'Chavín',
    adjetivo: 'chavín',
    colors: { primary: '#6a6a72', secondary: '#c8c2b4', accent: '#8a7a5a' },
    periodos: [Periodo.HORIZONTE_TEMPRANO],
    geografia: 'andes',
    bonuses: ['Oráculo: mayor línea de visión', 'Arte y culto de amplia influencia', 'Peregrinaje: recursos de intercambio'],
    descripcion: 'Centro ceremonial y oráculo de los Andes. Su arte felínico y su culto influyeron en casi todo el Perú antiguo.',
  },
  {
    id: CivId.PARACAS,
    nombre: 'Paracas',
    adjetivo: 'paraqueño',
    colors: { primary: '#8a3a3a', secondary: '#e8d0a0', accent: '#3a6a8a' },
    periodos: [Periodo.HORIZONTE_TEMPRANO, Periodo.INTERMEDIO_TEMPRANO],
    geografia: 'costa',
    bonuses: ['Textiles funerarios: comercio de lujo', 'Trepanaciones: unidades más resistentes', 'Pesca y marisqueo'],
    descripcion: 'Maestros textiles de la costa desértica. Sus fardos funerarios y cerámica de Ocucaje marcan el Formativo del sur.',
  },
  {
    id: CivId.MOCHE,
    nombre: 'Cultura Moche',
    adjetivo: 'moche',
    colors: { primary: '#a83a2a', secondary: '#e8d0a0', accent: '#d8a040' },
    periodos: [Periodo.INTERMEDIO_TEMPRANO],
    geografia: 'costa',
    bonuses: ['Cerámica ritual: economía más eficiente', 'Guerreros moche: infantería +10% de ataque', 'Huacas de adobe: defensas más baratas'],
    descripcion: 'Señores de la costa norte. Sus huacas, huacos retrato y rituales de sacrificio muestran un poder basado en la ideología.',
  },
  {
    id: CivId.NAZCA,
    nombre: 'Cultura Nazca',
    adjetivo: 'nazca',
    colors: { primary: '#b0603a', secondary: '#d8b088', accent: '#3a6a9a' },
    periodos: [Periodo.INTERMEDIO_TEMPRANO],
    geografia: 'costa',
    bonuses: ['Geoglifos: mayor línea de visión', 'Acueductos (puquios): comida +20%', 'Textiles: unidades a distancia más baratas'],
    descripcion: 'Los trazos de la pampa. Geoglifos, puquios y cerámica polícroma testimonian su dominio del desierto y del cielo.',
  },
  {
    id: CivId.RECUAY,
    nombre: 'Cultura Recuay',
    adjetivo: 'recuay',
    colors: { primary: '#7a6a4a', secondary: '#d8c8a0', accent: '#a85a2a' },
    periodos: [Periodo.INTERMEDIO_TEMPRANO],
    geografia: 'andes',
    bonuses: ['Ganadería de camélidos: población y comida', 'Escultura lítica: edificios +HP', 'Fortificaciones de altura'],
    descripcion: 'Señores del Callejón de Huaylas. Ganaderos y guerreros de la sierra de Áncash, en conflicto con los Moche.',
  },
  {
    id: CivId.WARI,
    nombre: 'Imperio Wari',
    adjetivo: 'wari',
    colors: { primary: '#8a5a2a', secondary: '#d8b06a', accent: '#3a3a3a' },
    periodos: [Periodo.HORIZONTE_MEDIO],
    geografia: 'andes',
    bonuses: ['Primer imperio andino: más población', 'Red vial: unidades más veloces', 'Andenes: granjas más productivas'],
    descripcion: 'El primer imperio andino, desde Ayacucho. Planificó ciudades, caminos y una religión estatal del dios de los báculos.',
  },
  {
    id: CivId.TIAHUANACO,
    nombre: 'Tiahuanaco',
    adjetivo: 'tiahuanacota',
    colors: { primary: '#6a7a8a', secondary: '#c8d0d8', accent: '#c8a040' },
    periodos: [Periodo.INTERMEDIO_TEMPRANO, Periodo.HORIZONTE_MEDIO],
    geografia: 'altiplano',
    bonuses: ['Waru-warus: comida +25%', 'Arquitectura megalítica: edificios +HP', 'Chullpas: mejor defensa'],
    descripcion: 'El estado del altiplano del Titicaca. Su arquitectura monumental y su culto irradiaron el sur andino.',
  },
  {
    id: CivId.CHIMU,
    nombre: 'Reino Chimú',
    adjetivo: 'chimú',
    colors: { primary: '#1f6f6f', secondary: '#d8c8a0', accent: '#c8a040' },
    periodos: [Periodo.INTERMEDIO_TARDIO],
    geografia: 'costa',
    bonuses: ['Orfebrería: plata +20%', 'Chan Chan: viviendas más baratas', 'Canales: agricultura mejorada'],
    descripcion: 'Los señores de Chan Chan, la ciudad de barro más grande de América, célebres por su orfebrería en oro y plata.',
  },
  {
    id: CivId.CHINCHA,
    nombre: 'Señorío de Chincha',
    adjetivo: 'chincha',
    colors: { primary: '#8a7a3a', secondary: '#e0d0a0', accent: '#2a6a6a' },
    periodos: [Periodo.INTERMEDIO_TARDIO],
    geografia: 'costa',
    bonuses: ['Comercio marítimo: recursos extra', 'Balsas de totora: unidades navales', 'Mercaderes: oro y plata'],
    descripcion: 'La gran potencia comercial de la costa sur. Sus mercaderes llegaban al Cusco, al Collao y hasta Quito.',
  },
  {
    id: CivId.CHANCA,
    nombre: 'Confederación Chanca',
    adjetivo: 'chanca',
    colors: { primary: '#7a3a2a', secondary: '#c8a888', accent: '#d8a040' },
    periodos: [Periodo.INTERMEDIO_TARDIO],
    geografia: 'andes',
    bonuses: ['Guerreros de altura: +ataque', 'Fortalezas en cerros: defensa', 'Movilización rápida'],
    descripcion: 'La confederación guerrera de Andahuaylas que estuvo a punto de tomar el Cusco en 1438.',
  },
  {
    id: CivId.INCA,
    nombre: 'Tahuantinsuyo',
    adjetivo: 'inca',
    colors: { primary: '#c8a040', secondary: '#b03028', accent: '#f0d060' },
    periodos: [Periodo.HORIZONTE_TARDIO],
    geografia: 'andes',
    bonuses: ['Mampostería imperial: edificios más resistentes', 'Andenes: granjas más productivas', 'Chasquis: exploradores más veloces'],
    descripcion: 'Los Hijos del Sol. Del Cusco al Qhapaq Ñan, su imperio unió los Andes con piedra, andenes y quipus.',
  },
  {
    id: CivId.REALISTAS,
    nombre: 'Realistas (España)',
    adjetivo: 'realista',
    colors: { primary: '#8a2a2a', secondary: '#d8c8a0', accent: '#c8a040' },
    periodos: [Periodo.VIRREINATO, Periodo.INDEPENDENCIA],
    geografia: 'andes',
    bonuses: ['Ejército virreinal: infantería más resistente', 'Mita minera: plata +20%', 'Obrajes: producción acelerada'],
    descripcion: 'El ejército y la administración del Virreinato del Perú, defensores de la Corona española.',
  },
  {
    id: CivId.PATRIOTAS,
    nombre: 'Patriotas',
    adjetivo: 'patriota',
    colors: { primary: '#2a4a8a', secondary: '#e8e0d0', accent: '#c8a040' },
    periodos: [Periodo.INDEPENDENCIA],
    geografia: 'andes',
    bonuses: ['Montoneras: unidades ligeras veloces', 'Causa libertadora: moral alta', 'Campaña de la sierra'],
    descripcion: 'Los ejércitos libertadores de San Martín, Bolívar y Sucre que sellaron la independencia en Ayacucho.',
  },
  {
    id: CivId.REPUBLICA,
    nombre: 'República del Perú',
    adjetivo: 'peruano',
    colors: { primary: '#b03030', secondary: '#e8e8e8', accent: '#c8a040' },
    periodos: [Periodo.REPUBLICA, Periodo.CONTEMPORANEO],
    geografia: 'costa',
    bonuses: ['Defensa del puerto: fortificaciones', 'Marina: unidades navales', 'Logística republicana'],
    descripcion: 'La República del Perú. Del guano y el salitre a la defensa de su litoral en la Guerra del Pacífico.',
  },
  {
    id: CivId.CHILE,
    nombre: 'Chile',
    adjetivo: 'chileno',
    colors: { primary: '#1f3a6a', secondary: '#e8e8e8', accent: '#c8302a' },
    periodos: [Periodo.REPUBLICA],
    geografia: 'costa',
    bonuses: ['Escuadra blindada: unidades navales', 'Artillería pesada', 'Fuerzas expedicionarias'],
    descripcion: 'La escuadra y el ejército de Chile durante la Guerra del Pacífico (1879–1883).',
  },
];

export function getCiv(id: CivId): CivDef {
  return CIVS.find((c) => c.id === id)!;
}

/** Civilizaciones disponibles en un periodo (coetáneas). */
export function civsDePeriodo(periodo: Periodo): CivDef[] {
  return CIVS.filter((c) => c.periodos.includes(periodo));
}
