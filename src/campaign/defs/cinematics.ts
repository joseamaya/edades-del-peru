export interface CinematicBeat {
  kicker?: string;
  title: string;
  text: string;
  /** Seconds before advancing automatically. */
  seconds?: number;
  /** Dossier or source used for this beat. */
  source?: string;
}

/** Short first-visit prologue for the whole saga. */
export const SERIES_INTRO: CinematicBeat[] = [
  {
    kicker: 'HACE CINCO MIL AÑOS',
    title: 'Entre el océano y los Andes',
    text: 'En el valle de Supe, una comunidad levantó plazas, pirámides y canales. Caral es una de las ciudades más antiguas de América.',
    seconds: 6,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'UNA HISTORIA DE LARGA DURACIÓN',
    title: 'El Perú antes del Perú',
    text: 'De los primeros centros ceremoniales a los estados regionales, de los incas al Virreinato y la República: una historia hecha de continuidades y rupturas.',
    seconds: 7,
    source: 'docs/historia/periodizacion.md',
  },
  {
    kicker: 'LA SENDA DEL SOL',
    title: 'Cuatro campañas',
    text: 'Culturas Preincas, El Tahuantinsuyo, El Virreinato e Independencia y República. La primera comienza en Caral.',
    seconds: 6,
    source: 'docs/historia/periodizacion.md',
  },
];

/** Prologue for the first released campaign. All facts come from the Caral dossiers. */
export const PREINCA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'VALLE DE SUPE · c. 3000 a.C.',
    title: 'La Ciudad Sagrada',
    text: 'En el Perú nació una de las primeras civilizaciones del mundo y la más antigua de América. Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.',
    seconds: 7,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'UNA ECONOMÍA DEL VALLE Y DEL MAR',
    title: 'El trabajo comunal',
    text: 'La pesca en el litoral y la agricultura irrigada sostuvieron a miles de personas. El excedente y la organización comunal hicieron posible las plazas y los templos.',
    seconds: 7,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'SIN GUERRA DOCUMENTADA',
    title: 'El desafío de sostener la vida',
    text: 'En Caral no hay guerra documentada. Organiza el trabajo, reúne alimentos y observa la Gran Pirámide: la ciudad se sostiene con cooperación.',
    seconds: 7,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'DESPUÉS DE CARAL',
    title: 'Templos, señoríos y horizontes',
    text: 'Chavín articula un culto andino; Moche y Recuay comparten los valles y la sierra; Wari teje una red de centros y caminos. Cuatro escenarios, una misma historia.',
    seconds: 7,
    source: 'docs/historia/periodizacion.md',
  },
];
