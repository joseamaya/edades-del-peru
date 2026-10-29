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
  | 'chavin_galeria';

export type HeritageSector = 'Caral Alto' | 'Caral Bajo' | 'Chavín';

export interface HeritageBuildingDef {
  id: HeritageBuildingId;
  name: string;
  sector: HeritageSector;
  role: string;
  summary: string;
  confidence: string;
  citation: string;
  /** Optional scenario operation exposed by the field card. */
  operation?: 'toggle-canal' | 'assembly' | 'offer';
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
};

export function getHeritageBuilding(id: string | null | undefined): HeritageBuildingDef | null {
  if (!id) return null;
  return HERITAGE_BUILDINGS[id as HeritageBuildingId] ?? null;
}
