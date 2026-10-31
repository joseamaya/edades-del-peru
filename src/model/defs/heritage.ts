import type { Resources } from '../../core/types';

export type HeritageBuildingId =
  | 'caral_pyramid_mayor'
  | 'caral_pyramid_central'
  | 'caral_pyramid_quarry'
  | 'caral_pyramid_lesser'
  | 'caral_pyramid_gallery'
  | 'caral_pyramid_huanca'
  | 'caral_anfiteatro'
  | 'caral_canal'
  | 'chavin_plaza_circular'
  | 'chavin_edificio_a'
  | 'chavin_edificio_b'
  | 'chavin_portada'
  | 'chavin_galeria'
  | 'moche_huaca_sol'
  | 'moche_huaca_luna'
  | 'moche_plaza'
  | 'moche_canal'
  | 'wari_templo_d'
  | 'wari_plaza'
  | 'wari_galeria'
  | 'wari_mural'
  | 'chanca_pucara'
  | 'chimu_compound'
  | 'colonial_church'
  | 'independence_chapel';

export type HeritageSector =
  'Caral Alto' | 'Caral Bajo' | 'Chavín' | 'Moche' | 'Wari' | 'Chanca' | 'Chimú' | 'Virreinato' | 'Independencia';

export interface HeritageBuildingDef {
  id: HeritageBuildingId;
  name: string;
  sector: HeritageSector;
  role: string;
  summary: string;
  confidence: string;
  citation: string;
  /** Optional scenario operation exposed by the field card. */
  operation?: 'toggle-canal' | 'assembly' | 'offer' | 'trade';
  /** Resource and amount consumed by an `offer` operation. */
  operationResource?: keyof Resources;
  operationAmount?: number;
  sources: string[];
}

export const HERITAGE_BUILDINGS: Record<HeritageBuildingId, HeritageBuildingDef> = {
  caral_pyramid_mayor: {
    id: 'caral_pyramid_mayor',
    name: 'Gran Pirámide y Plaza Central',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial principal',
    summary:
      'La Gran Pirámide y la Plaza Central articulan el sector ceremonial del Caral Alto. La reconstrucción combina la planta documentada con remates y techos inferidos. La plaza permite convocar una asamblea comunal como abstracción jugable.',
    confidence: 'documentado en planta; remates inferidos',
    citation: 'Dossier de Caral · UNESCO / Zona Arqueológica Caral',
    operation: 'assembly',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_pyramid_central: {
    id: 'caral_pyramid_central',
    name: 'Pirámide Central',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial',
    summary:
      'Una de las seis pirámides del Caral Alto. El volumen y la jerarquía siguen la planta publicada; los detalles de los remates son una lectura plausible.',
    confidence: 'plausible',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_pyramid_quarry: {
    id: 'caral_pyramid_quarry',
    name: 'Pirámide de la Cantera',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial y cantera',
    summary:
      'La pirámide asociada al sector de la cantera. Su posición y escala relativa se conservan dentro del conjunto ceremonial.',
    confidence: 'plausible',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_pyramid_lesser: {
    id: 'caral_pyramid_lesser',
    name: 'Pirámide Menor',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial',
    summary:
      'La menor de las pirámides del Caral Alto. La ficha separa la huella documentada de la reconstrucción de sus plataformas y remates.',
    confidence: 'plausible',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_pyramid_gallery: {
    id: 'caral_pyramid_gallery',
    name: 'Pirámide de la Galería',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial',
    summary:
      'La pirámide de la Galería forma parte del conjunto de Caral Alto. La reconstrucción mantiene su relación con la Plaza Central y las plazas de acceso.',
    confidence: 'plausible',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_pyramid_huanca: {
    id: 'caral_pyramid_huanca',
    name: 'Pirámide de la Huanca',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial',
    summary:
      'La pirámide se asocia a la Plaza de la Huanca y su monolito. La función exacta de ambos no se conserva en un texto contemporáneo.',
    confidence: 'plausible',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  caral_canal: {
    id: 'caral_canal',
    name: 'Canal comunal del valle',
    sector: 'Caral Bajo',
    role: 'Infraestructura agrícola',
    summary:
      'Los canales de riego llevaban agua del valle a los campos. Abrir la compuerta aumenta el rendimiento de los andenes cercanos; es una abstracción jugable del riego documentado.',
    confidence: 'documentado; trazado y compuerta abstraídos',
    citation: 'Dossier de Caral · Zona Arqueológica Caral',
    operation: 'toggle-canal',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/campanas/caral.md'],
  },
  caral_anfiteatro: {
    id: 'caral_anfiteatro',
    name: 'Templo del Anfiteatro, Altar Redondo y Templo de la Banqueta',
    sector: 'Caral Bajo',
    role: 'Conjunto ritual y plaza circular',
    summary:
      'El conjunto reúne el Templo del Anfiteatro, el Altar Redondo y el Templo de la Banqueta. La plaza circular es una de las estructuras rituales documentadas de Caral Bajo.',
    confidence: 'documentado en planta; graderíos simplificados',
    citation: 'Dossier de Caral · UNESCO / Zona Arqueológica Caral',
    sources: ['docs/historia/civilizaciones/caral.md', 'docs/historia/arquitectura.md'],
  },
  chavin_plaza_circular: {
    id: 'chavin_plaza_circular',
    name: 'Plaza Circular Hundida',
    sector: 'Chavín',
    role: 'Plaza ritual y atrio',
    summary:
      'La Plaza Circular Hundida y el atrio del Lanzón forman el núcleo del conjunto tradicionalmente llamado Templo Antiguo. El pavimento, las gradas y las escalinatas organizan un acceso ritual; la reconstrucción no inventa techos no conservados.',
    confidence: 'documentado en planta; remates inferidos',
    citation: 'Dossier de Chavín · UNESCO 330 / Ministerio de Cultura',
    sources: ['docs/historia/civilizaciones/chavin.md', 'docs/historia/campanas/chavin.md'],
  },
  chavin_edificio_a: {
    id: 'chavin_edificio_a',
    name: 'Edificio A · Pirámide Mayor',
    sector: 'Chavín',
    role: 'Templo y terraza monumental',
    summary:
      'El Edificio A, tradicionalmente “Templo Nuevo” o “Castillo”, se organiza en terrazas y mira al este. La Portada de las Falcónidas marca su fachada principal; la secuencia cronológica del conjunto sigue en revisión.',
    confidence: 'documentado; alturas y cubiertas inferidas',
    citation: 'Dossier de Chavín · Plan de Manejo 2020',
    sources: ['docs/historia/civilizaciones/chavin.md', 'docs/historia/campanas/chavin.md'],
  },
  chavin_edificio_b: {
    id: 'chavin_edificio_b',
    name: 'Edificio B · Templo del Lanzón',
    sector: 'Chavín',
    role: 'Galería y santuario interior',
    summary:
      'El Edificio B alberga la Galería del Lanzón. El Lanzón es una reconstrucción propia y simplificada, no la malla escaneada de CyArk; su escala y posición siguen las fuentes publicadas. Entrega aquí las ofrendas para sostener el culto.',
    confidence: 'planta documentada; escultura y cubierta interpretadas',
    citation: 'Dossier de Chavín · Rick et al. 1998 / UNESCO 330',
    operation: 'offer',
    operationResource: 'silver',
    operationAmount: 50,
    sources: ['docs/historia/civilizaciones/chavin.md', 'docs/historia/campanas/chavin.md'],
  },
  chavin_portada: {
    id: 'chavin_portada',
    name: 'Portada de las Falcónidas',
    sector: 'Chavín',
    role: 'Fachada ritual del Edificio A',
    summary:
      'La portada reúne dos columnas circulares, jambas trilíticas y un friso partido. Las tallas de esta reconstrucción son una lectura geométrica, no una reproducción iconográfica exacta; el dintel se omite por falta de evidencia.',
    confidence: 'documentado en escala; relieves interpretativos',
    citation: 'Dossier de Chavín · Plan de Manejo 2020',
    sources: ['docs/historia/civilizaciones/chavin.md', 'docs/historia/campanas/chavin.md'],
  },
  chavin_galeria: {
    id: 'chavin_galeria',
    name: 'Galería y ventilación',
    sector: 'Chavín',
    role: 'Red interna ceremonial',
    summary:
      'El conjunto conserva una red de galerías, ductos y drenajes. El juego modela una secuencia representativa, no las 22 galerías completas; el recorrido es una abstracción didáctica de un espacio documentado.',
    confidence: 'documentado; secuencia representativa',
    citation: 'Dossier de Chavín · UNESCO 330',
    sources: ['docs/historia/civilizaciones/chavin.md', 'docs/historia/campanas/chavin.md'],
  },
  moche_huaca_sol: {
    id: 'moche_huaca_sol',
    name: 'Huaca del Sol',
    sector: 'Moche',
    role: 'Plataforma monumental y poder político',
    summary:
      'La Huaca del Sol es la mayor plataforma escalonada de adobe de los Huacas de Moche. La reconstrucción representa su volumen y sus terrazas; la altura original y los frisos son lecturas plausibles, no un levantamiento.',
    confidence: 'planta y volumen documentados; remates inferidos',
    citation: 'Dossier de Moche · Huacas del Sol y de la Luna',
    sources: ['docs/historia/civilizaciones/moche.md', 'docs/historia/campanas/moche_recuay.md'],
  },
  moche_huaca_luna: {
    id: 'moche_huaca_luna',
    name: 'Huaca de la Luna',
    sector: 'Moche',
    role: 'Centro ceremonial y intercambio de élite',
    summary:
      'La Huaca de la Luna articula plazas, terrazas y recintos ceremoniales. El intercambio de élite con la sierra está atestiguado por objetos y contactos; la operación de intercambio es una abstracción jugable, no un mercado documentado.',
    confidence: 'planta documentada; secuencia ritual interpretada',
    citation: 'Dossier de Moche · Huacas del Sol y de la Luna / PUCP',
    operation: 'trade',
    operationResource: 'silver',
    operationAmount: 50,
    sources: ['docs/historia/civilizaciones/moche.md', 'docs/historia/campanas/moche_recuay.md'],
  },
  moche_plaza: {
    id: 'moche_plaza',
    name: 'Plaza entre las huacas',
    sector: 'Moche',
    role: 'Espacio público y ceremonial',
    summary:
      'La plaza abierta entre las dos huacas organiza el acceso y la vida pública del conjunto. El juego la usa como punto de reunión y de defensa; su trazado es una síntesis legible del espacio documentado.',
    confidence: 'documentado en planta; mobiliario omitido',
    citation: 'Dossier de Moche · Huacas del Sol y de la Luna',
    sources: ['docs/historia/civilizaciones/moche.md', 'docs/historia/arquitectura.md'],
  },
  wari_templo_d: {
    id: 'wari_templo_d',
    name: 'Templo en D',
    sector: 'Wari',
    role: 'Arquitectura ceremonial wari',
    summary:
      'Los templos en D son una forma diagnóstica de Wari: un recinto ceremonial con muro curvo y acceso recto. La reconstrucción sintetiza el volumen documentado; no reproduce un edificio específico del complejo.',
    confidence: 'forma documentada; planta específica interpretada',
    citation: 'Dossier de Wari · Ministerio de Cultura / Ochatoma y Cabrera',
    sources: ['docs/historia/civilizaciones/wari.md', 'docs/historia/campanas/wari_tiahuanaco.md'],
  },
  wari_plaza: {
    id: 'wari_plaza',
    name: 'Plaza y patios',
    sector: 'Wari',
    role: 'Espacio público y administración',
    summary:
      'El complejo Wari combina plazas, patios y galerías dentro de recintos amurallados. La plaza del juego representa esa organización pública y administrativa; el trazado completo sigue en discusión.',
    confidence: 'documentado; trazado representativo',
    citation: 'Dossier de Wari · Ministerio de Cultura',
    sources: ['docs/historia/civilizaciones/wari.md', 'docs/historia/campanas/wari_tiahuanaco.md'],
  },
  wari_galeria: {
    id: 'wari_galeria',
    name: 'Galerías y almacenes',
    sector: 'Wari',
    role: 'Administración y almacenamiento',
    summary:
      'Las galerías y recintos de almacenamiento articulaban la producción y la administración wari. El juego modela una secuencia representativa, no el inventario completo del complejo.',
    confidence: 'documentado; secuencia representativa',
    citation: 'Dossier de Wari · Isbell / Ministerio de Cultura',
    sources: ['docs/historia/civilizaciones/wari.md', 'docs/historia/arquitectura.md'],
  },
  wari_mural: {
    id: 'wari_mural',
    name: 'Muro con revoque y pintura',
    sector: 'Wari',
    role: 'Identidad material y mural',
    summary:
      'Los muros wari conservaron revoques y pintura blanca y roja. El juego usa esas bandas como abstracción material; no reconstruye un mural figurado específico.',
    confidence: 'revoque documentado; motivos interpretados',
    citation: 'Dossier de Wari · Metropolitan Museum / Ministerio de Cultura',
    sources: ['docs/historia/civilizaciones/wari.md', 'docs/historia/arquitectura.md'],
  },
  moche_canal: {
    id: 'moche_canal',
    name: 'Canal de riego del valle',
    sector: 'Moche',
    role: 'Agua y agricultura de valle',
    summary:
      'Los canales moche llevaban agua del valle a los campos y sostenían la producción agrícola. La compuerta es una abstracción jugable del control del agua; no se reconstruye un canal específico.',
    confidence: 'abstracción jugable sobre práctica documentada',
    citation: 'Dossier de Moche · Cultura moche',
    operation: 'toggle-canal',
    sources: ['docs/historia/civilizaciones/moche.md', 'docs/historia/campanas/moche_recuay.md'],
  },
  chanca_pucara: {
    id: 'chanca_pucara',
    name: 'Pucará chanca',
    sector: 'Chanca',
    role: 'Altura fortificada y campamento',
    summary:
      'La campaña chanca se apoya en alturas y posiciones fortificadas. El pucará de Yahuar Pampa es una reconstrucción volumétrica de esa práctica defensiva; no se conserva una planta exacta de este campamento.',
    confidence: 'práctica documentada; planta y remates plausibles',
    citation: 'Dossier de Yahuar Pampa · Betanzos / Pachacuti Yamqui',
    sources: ['docs/historia/campanas/yahuar_pampa.md', 'docs/historia/arquitectura.md'],
  },
  chimu_compound: {
    id: 'chimu_compound',
    name: 'Conjunto chimú y Chan Chan',
    sector: 'Chimú',
    role: 'Centro político y residencia real',
    summary:
      'Chan Chan fue la capital del Reino Chimú, con conjuntos amurallados, audiencias y depósitos. La reconstrucción representa un conjunto adobe genérico de esa tradición; no reproduce una ciudadela real.',
    confidence: 'tradición documentada; planta y remates plausibles',
    citation: 'Dossier de la Guerra chimú-inca · fuentes coloniales y arqueología',
    sources: ['docs/historia/campanas/chimu_inca.md', 'docs/historia/arquitectura.md'],
  },
  colonial_church: {
    id: 'colonial_church',
    name: 'Templo y plaza colonial',
    sector: 'Virreinato',
    role: 'Centro urbano y símbolo del orden colonial',
    summary:
      'La iglesia y la plaza articulan el orden urbano colonial del Cusco. La reconstrucción representa una iglesia de nave, torre y atrio; no reproduce un templo específico ni inventa su planta.',
    confidence: 'tipología documentada; planta y remates plausibles',
    citation: 'Dossier de Túpac Amaru II · arquitectura colonial',
    sources: ['docs/historia/campanas/tupac_amaru.md', 'docs/historia/arquitectura.md'],
  },
  independence_chapel: {
    id: 'independence_chapel',
    name: 'Capilla y campamento patriota',
    sector: 'Independencia',
    role: 'Puesto de mando y campamento de campaña',
    summary:
      'La campaña de la sierra combinó columnas, campamentos y puestos de mando. La capilla y el campamento son una abstracción de ese paisaje militar; no representan una iglesia específica de Junín o Ayacucho.',
    confidence: 'contexto documentado; planta y remates plausibles',
    citation: 'Dossier de la Independencia · Basadre',
    sources: ['docs/historia/campanas/independencia.md', 'docs/historia/arquitectura.md'],
  },
};

export function getHeritageBuilding(id: string | null | undefined): HeritageBuildingDef | null {
  if (!id) return null;
  return HERITAGE_BUILDINGS[id as HeritageBuildingId] ?? null;
}
