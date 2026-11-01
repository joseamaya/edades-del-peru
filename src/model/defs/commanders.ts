import { CivId } from '../../core/types';

/** Portraits are stylized medallions; `status` describes the *likeness*, not the role. */
export const PORTRAIT_IDS = [
  'cusi_yupanqui',
  'tupac_yupanqui',
  'minchancaman',
  'anccu_hualloc',
  'tupac_amaru',
  'micaela_bastidas',
  'san_martin',
  'bolivar',
  'sucre',
  'grau',
  'bolognesi',
  'atahualpa',
  'huascar',
] as const;

export type PortraitId = (typeof PORTRAIT_IDS)[number];

/**
 * Campaign commanders shown in briefings and dialogue. Portraits are stylized
 * medallions (not attested likenesses): pre-Hispanic figures have no documented
 * face, so they are marked `abstraction`; post-1532 figures are `documented`.
 */
export interface CommanderDef {
  id: PortraitId;
  name: string;
  /** Player-facing role, e.g. "Inca · Cusco". */
  role: string;
  civ: CivId;
  /** `documented` = an attested likeness exists; `abstraction` = stylized. */
  status: 'documented' | 'abstraction';
  source?: string;
}

export const COMMANDERS: Record<PortraitId, CommanderDef> = {
  cusi_yupanqui: {
    id: 'cusi_yupanqui',
    name: 'Cusi Yupanqui',
    role: 'Inca · Cusco',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/yahuar_pampa.md',
  },
  tupac_yupanqui: {
    id: 'tupac_yupanqui',
    name: 'Túpac Yupanqui',
    role: 'Inca · auqui',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/chimu_inca.md',
  },
  minchancaman: {
    id: 'minchancaman',
    name: 'Minchancaman',
    role: 'Chimú · Chan Chan',
    civ: CivId.CHIMU,
    status: 'abstraction',
    source: 'docs/historia/campanas/chimu_inca.md',
  },
  anccu_hualloc: {
    id: 'anccu_hualloc',
    name: 'Anccu Hualloc',
    role: 'Chanca · general',
    civ: CivId.CHANCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/yahuar_pampa.md',
  },
  tupac_amaru: {
    id: 'tupac_amaru',
    name: 'Túpac Amaru II',
    role: 'Rebelión · Cusco',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  micaela_bastidas: {
    id: 'micaela_bastidas',
    name: 'Micaela Bastidas',
    role: 'Rebelión · intendencia',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  san_martin: {
    id: 'san_martin',
    name: 'José de San Martín',
    role: 'Patriotas · Protector',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  bolivar: {
    id: 'bolivar',
    name: 'Simón Bolívar',
    role: 'Patriotas · Libertador',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  sucre: {
    id: 'sucre',
    name: 'Antonio José de Sucre',
    role: 'Patriotas · Ayacucho',
    civ: CivId.PATRIOTAS,
    status: 'documented',
    source: 'docs/historia/campanas/independencia.md',
  },
  grau: {
    id: 'grau',
    name: 'Miguel Grau',
    role: 'Perú · Huáscar',
    civ: CivId.REPUBLIC,
    status: 'documented',
    source: 'docs/historia/campanas/guerra_del_pacifico.md',
  },
  bolognesi: {
    id: 'bolognesi',
    name: 'Francisco Bolognesi',
    role: 'Perú · Arica',
    civ: CivId.REPUBLIC,
    status: 'documented',
    source: 'docs/historia/campanas/guerra_del_pacifico.md',
  },
  atahualpa: {
    id: 'atahualpa',
    name: 'Atahualpa',
    role: 'Inca · Quito',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
  huascar: {
    id: 'huascar',
    name: 'Huáscar',
    role: 'Inca · Cusco',
    civ: CivId.INCA,
    status: 'abstraction',
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
};

/** Normalize a speaker label ("Miguel Grau", "TUPÁC AMARU II") for lookup. */
export function normalizeCommanderName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const BY_NAME = new Map<string, CommanderDef>();
for (const c of Object.values(COMMANDERS)) BY_NAME.set(normalizeCommanderName(c.name), c);

/** Resolve a commander by display name (accent/case insensitive). */
export function commanderFor(name: string): CommanderDef | undefined {
  return BY_NAME.get(normalizeCommanderName(name));
}
