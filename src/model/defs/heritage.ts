export type HeritageBuildingId =
  | 'caral_pyramid_mayor'
  | 'caral_pyramid_central'
  | 'caral_pyramid_quarry'
  | 'caral_pyramid_lesser'
  | 'caral_pyramid_gallery'
  | 'caral_pyramid_huanca'
  | 'caral_anfiteatro'
  | 'caral_canal';

export type HeritageSector = 'Caral Alto' | 'Caral Bajo';

export interface HeritageBuildingDef {
  id: HeritageBuildingId;
  name: string;
  sector: HeritageSector;
  role: string;
  summary: string;
  confidence: string;
  citation: string;
  /** Optional scenario operation exposed by the field card. */
  operation?: 'toggle-canal';
  sources: string[];
}

export const HERITAGE_BUILDINGS: Record<HeritageBuildingId, HeritageBuildingDef> = {
  caral_pyramid_mayor: {
    id: 'caral_pyramid_mayor',
    name: 'Gran Pirámide y Plaza Central',
    sector: 'Caral Alto',
    role: 'Complejo ceremonial principal',
    summary:
      'La Gran Pirámide y la Plaza Central articulan el sector ceremonial del Caral Alto. La reconstrucción combina la planta documentada con remates y techos inferidos.',
    confidence: 'documentado en planta; remates inferidos',
    citation: 'Dossier de Caral · UNESCO / Zona Arqueológica Caral',
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
};

export function getHeritageBuilding(id: string | null | undefined): HeritageBuildingDef | null {
  if (!id) return null;
  return HERITAGE_BUILDINGS[id as HeritageBuildingId] ?? null;
}
