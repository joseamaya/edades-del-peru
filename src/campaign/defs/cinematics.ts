export interface CinematicBeat {
  kicker?: string;
  title: string;
  text: string;
  /** Seconds before advancing automatically. */
  seconds?: number;
}

/** Short first-visit prologue for the whole saga. */
export const SERIES_INTRO: CinematicBeat[] = [
  {
    kicker: 'HACE CINCO MIL AÑOS',
    title: 'Entre el océano y los Andes',
    text: 'En el valle de Supe, una comunidad levantó plazas, pirámides y canales. Caral es una de las ciudades más antiguas de América.',
    seconds: 6,
  },
  {
    kicker: 'UNA HISTORIA DE LARGA DURACIÓN',
    title: 'El Perú antes del Perú',
    text: 'De los primeros centros ceremoniales a los estados regionales, de los incas al Virreinato y la República: una historia hecha de continuidades y rupturas.',
    seconds: 7,
  },
  {
    kicker: 'LA SENDA DEL SOL',
    title: 'Cuatro campañas',
    text: 'Culturas Preincas, El Tahuantinsuyo, El Virreinato e Independencia y República. La primera comienza en Caral.',
    seconds: 6,
  },
];

/** Prologue for the first released campaign. All facts come from the Caral dossiers. */
export const PREINCA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'VALLE DE SUPE · c. 3000 a.C.',
    title: 'La Ciudad Sagrada',
    text: 'En el Perú nació una de las primeras civilizaciones del mundo y la más antigua de América. Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.',
    seconds: 7,
  },
  {
    kicker: 'UNA ECONOMÍA DEL VALLE Y DEL MAR',
    title: 'El trabajo comunal',
    text: 'La pesca en el litoral y la agricultura irrigada sostuvieron a miles de personas. El excedente y la organización comunal hicieron posible las plazas y los templos.',
    seconds: 7,
  },
  {
    kicker: 'SIN GUERRA DOCUMENTADA',
    title: 'El desafío de sostener la vida',
    text: 'En Caral no hay guerra documentada. Organiza el trabajo, reúne alimentos y observa la Gran Pirámide: la ciudad se sostiene con cooperación.',
    seconds: 7,
  },
];

/** Mission chapter beats. Only released missions need entries for now. */
export const CARAL_BEATS: CinematicBeat[] = [
  {
    kicker: '3000 a.C. · VALLE DE SUPE',
    title: 'La Ciudad Sagrada',
    text: 'La comunidad te espera entre el río y el mar. Prepara los campos, guarda el excedente y sostén a Caral.',
    seconds: 5,
  },
];
