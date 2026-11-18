export interface CinematicBeat {
  kicker?: string;
  title: string;
  text: string;
  /** Seconds before advancing automatically. */
  seconds?: number;
  /** Dossier or source used for this beat. */
  source?: string;
  /** Optional backdrop for this beat (public asset path, e.g. 'media/caral/intro-aspero.webp'). */
  image?: string;
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
    title: 'Cinco campañas',
    text: 'Culturas Preincas, El Tahuantinsuyo, El Virreinato, La Independencia y La República. La primera comienza en Caral.',
    seconds: 6,
    source: 'docs/historia/periodizacion.md',
  },
];

/** Prologue for the first released campaign. All facts come from the Caral dossiers. */
export const PREINCA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'VALLE DE SUPE · c. 3000 a.C.',
    title: 'La Ciudad Sagrada',
    text: 'En el Perú nació una de las primeras civilizaciones del mundo y una de las más antiguas de América. Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.',
    seconds: 7,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'UNA ECONOMÍA DEL VALLE Y DEL MAR',
    title: 'El trabajo comunal',
    text: 'La pesca en el litoral y la agricultura irrigada sostuvieron a una población estimada en miles de personas. El excedente y la organización comunal hicieron posible las plazas y los templos.',
    seconds: 7,
    source: 'docs/historia/campanas/caral.md',
  },
  {
    kicker: 'SIN GUERRA DOCUMENTADA',
    title: 'El desafío de sostener la vida',
    text: 'En Caral no hay guerra documentada. Organiza el trabajo, reúne alimentos y levanta la Pirámide Mayor: la ciudad se sostiene con cooperación.',
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

/** Prologue for the second released campaign, El Tahuantinsuyo. */
export const INCA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'PACARITAMBO · LEYENDA',
    title: 'Los hijos del Sol',
    text: 'Según la tradición, los hermanos Ayar salieron de Pacaritambo y tomaron el valle del Cusco. Las crónicas nombran a los huallas, sauaseray y alcabizas; la arqueología del valle muestra una ocupación Killke anterior al imperio.',
    seconds: 8,
    source: 'docs/historia/campanas/tambotoco.md',
  },
  {
    kicker: 'CUSCO · 1438',
    title: 'El imperio que nace',
    text: 'La confederación chanca marcha sobre el Cusco. Cusi Yupanqui organiza la defensa y vence en Yahuar Pampa; asume el poder como Pachacútec.',
    seconds: 7,
    source: 'docs/historia/campanas/yahuar_pampa.md',
  },
  {
    kicker: 'COSTA NORTE · c. 1470',
    title: 'El agua como arma',
    text: 'Túpac Yupanqui avanza sobre el Reino Chimú. El canal que abastece Chan Chan se convierte en el objetivo decisivo: sin agua, la ciudad no resiste.',
    seconds: 7,
    source: 'docs/historia/campanas/chimu_inca.md',
  },
  {
    kicker: 'CUSCO–QUITO · 1529–1532',
    title: 'La guerra civil',
    text: 'Tras la muerte de Huayna Cápac, Huáscar y Atahualpa se disputan el trono. La guerra civil enfrenta a los ejércitos incas y deja al Tahuantinsuyo dividido antes de la llegada española.',
    seconds: 7,
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
  {
    kicker: 'LEYENDA, DEFENSA, EXPANSIÓN Y GUERRA CIVIL',
    title: 'Cuatro capítulos, un imperio',
    text: 'La fundación legendaria, la defensa frente a los chancas, la guerra del norte y la guerra civil muestran cómo el Tahuantinsuyo se formó, se expandió y se dividió antes de la llegada europea.',
    seconds: 7,
    source: 'docs/historia/periodizacion.md',
  },
];

/** Prologue for the third released campaign, El Virreinato. */
export const VIRREINATO_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'CAJAMARCA · 1532',
    title: 'El Inca capturado',
    text: 'Tras la victoria de Atahualpa en la guerra civil, Francisco Pizarro llega a Cajamarca. La captura del Inca abre la conquista del Tahuantinsuyo y el fin de la guerra entre Huáscar y Atahualpa.',
    seconds: 8,
    source: 'docs/historia/campanas/guerra_civil_inca.md',
  },
  {
    kicker: 'LIMA · 1535–1536',
    title: 'La Ciudad de los Reyes',
    text: 'Francisco Pizarro funda Lima junto al Rímac. Al año siguiente, Quizu Yupanqui y los señores andinos cercan la ciudad; la defensa depende de los aliados andinos.',
    seconds: 8,
    source: 'docs/historia/campanas/lima.md',
  },
  {
    kicker: 'CUSCO · 1536',
    title: 'El cerco del Cusco',
    text: 'Manco Inca se alza contra los conquistadores y cerca el Cusco. La guerra se decide en Sacsayhuamán y en los campos de cultivo que sostienen a la ciudad.',
    seconds: 8,
    source: 'docs/historia/propuestas/virreinato.md',
  },
  {
    kicker: 'VILCABAMBA · 1572',
    title: 'El último Inca',
    text: 'La resistencia inca sobrevive en Vilcabamba. En 1572 la expedición del virrey Toledo entra en la selva y captura a Túpac Amaru I; la resistencia armada termina.',
    seconds: 8,
    source: 'docs/historia/propuestas/virreinato.md',
  },
  {
    kicker: 'SUR ANDINO · 1780',
    title: 'La Gran Rebelión',
    text: 'Las reformas borbónicas recargan el reparto de mercancías, la mita minera y los obrajes. José Gabriel Condorcanqui, Túpac Amaru II, se alza en Tinta contra los abusos del Virreinato.',
    seconds: 7,
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  {
    kicker: 'SANGARARÁ · NOVIEMBRE DE 1780',
    title: 'Una rebelión que se extiende',
    text: 'Túpac Amaru II vence en Sangarará y decreta la abolición de la esclavitud. Micaela Bastidas organiza el avituallamiento y la red de apoyo de la rebelión.',
    seconds: 7,
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
  {
    kicker: 'CUSCO · 1781',
    title: 'Derrota y legado',
    text: 'El asedio al Cusco fracasa. Túpac Amaru II es capturado y ejecutado, pero la rebelión fuerza la abolición del reparto y de los corregimientos y queda como antecedente de la independencia.',
    seconds: 8,
    source: 'docs/historia/campanas/tupac_amaru.md',
  },
];

/** Prologue for the fourth released campaign, La Independencia. */
export const INDEPENDENCIA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'CUSCO · 1814',
    title: 'La Junta del Cusco',
    text: 'En agosto de 1814 el Cusco forma una junta. Mateo Pumacahua, que había combatido contra Túpac Amaru en 1780, se une a los hermanos Angulo. La rebelión cae en Umachiri en marzo de 1815.',
    seconds: 8,
    source: 'docs/historia/propuestas/independencia-republica.md',
  },
  {
    kicker: 'LIMA · 28 DE JULIO DE 1821',
    title: 'La independencia proclamada',
    text: 'San Martín proclama la independencia del Perú en Lima. La guerra no termina allí: la campaña final se libra en la sierra, con Bolívar y Sucre al mando de los ejércitos patriotas.',
    seconds: 7,
    source: 'docs/historia/campanas/independencia.md',
  },
  {
    kicker: 'SIERRA DEL PERÚ · 1824',
    title: 'Junín y Ayacucho',
    text: 'La caballería patriota sostiene Junín el 6 de agosto de 1824. El 9 de diciembre, el ejército de Sucre resiste en Ayacucho y sella la independencia del Perú.',
    seconds: 8,
    source: 'docs/historia/campanas/independencia.md',
  },
  {
    kicker: 'CALLAO · 1824–1826',
    title: 'El último bastión',
    text: 'La capitulación de Ayacucho no termina la guerra. En el Callao, los últimos realistas resisten en el Real Felipe hasta enero de 1826, cuando capitula el último bastión español en el Perú.',
    seconds: 8,
    source: 'docs/historia/propuestas/independencia-republica.md',
  },
];

export const REPUBLICA_PROLOGUE: CinematicBeat[] = [
  {
    kicker: 'ARICA · 7 DE JUNIO DE 1880',
    title: 'La defensa del puerto',
    text: 'En la Guerra del Pacífico, la guarnición peruana de Arica resiste el asalto chileno. Francisco Bolognesi muere en la defensa; la plaza cae, pero su resistencia queda como símbolo.',
    seconds: 8,
    source: 'docs/historia/campanas/guerra_del_pacifico.md',
  },
  {
    kicker: 'TARAPACÁ · 27 DE NOVIEMBRE DE 1879',
    title: 'La quebrada',
    text: 'Unos meses antes, en la quebrada de Tarapacá, el ejército peruano había obtenido una victoria que no cambió el curso de la guerra. La campaña continuaba en el sur.',
    seconds: 8,
    source: 'docs/historia/propuestas/independencia-republica.md',
  },
  {
    kicker: 'LIMA · ENERO DE 1881',
    title: 'San Juan y Miraflores',
    text: 'El ejército chileno avanza sobre Lima. Las líneas de San Juan y Miraflores resisten en dos jornadas; la ciudad cae y la guerra continúa en la sierra.',
    seconds: 8,
    source: 'docs/historia/propuestas/independencia-republica.md',
  },
  {
    kicker: 'SIERRA CENTRAL · 1882–1883',
    title: 'La Breña',
    text: 'En la sierra central, la resistencia se organiza en montoneras y columnas móviles. Andrés A. Cáceres sostiene una campaña de desgaste hasta Huamachuco, en 1883.',
    seconds: 8,
    source: 'docs/historia/propuestas/independencia-republica.md',
  },
];
