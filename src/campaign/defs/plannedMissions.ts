/**
 * Missions announced in the campaign menu before their scenario exists. They follow the approved
 * redesign in docs/design/campaign-redesign.md; the research behind each one is in
 * docs/historia/propuestas/. A planned mission is never playable: it only shows its place in the
 * chapter. When its scenario ships, its entry here is replaced by a released mission id.
 */
export interface PlannedMission {
  id: string;
  title: string;
  /** Short line under the title: period or date, as the released missions' subtitles. */
  subtitle: string;
  /** One or two sentences: what happened and what the player will do. */
  summary: string;
  /** Myth or chronicle tradition, shown next to the subtitle so legend never reads as fact. */
  label?: 'Leyenda' | 'Tradición';
}

export const PLANNED_MISSIONS: Record<string, PlannedMission> = {
  // El Tahuantinsuyo
  p_inca_tambotoco: {
    id: 'p_inca_tambotoco',
    title: 'Los hijos de Tambotoco',
    subtitle: 'Siglos XII–XIV',
    label: 'Leyenda',
    summary:
      'Los hermanos Ayar salen de Pacaritambo y buscan tierra fértil. En el valle del Cusco viven ya huallas, sauaseray y alcabizas: tendrás que ganarte el valle.',
  },
  p_inca_collao: {
    id: 'p_inca_collao',
    title: 'El señor del Collao',
    subtitle: 'Altiplano · c. 1440–1460',
    summary: 'Pacta con los lupacas de Chucuito y enfrenta a Chuchi Cápac, señor de Hatun Colla.',
  },
  p_inca_cusco: {
    id: 'p_inca_cusco',
    title: 'Cusco renacido',
    subtitle: 'Cusco · c. 1438–1500',
    summary:
      'Reconstruye la capital, levanta Sacsayhuamán y tiende el Qhapaq Ñan con chasquis y mitmas. Una misión de obra y organización.',
  },
  p_inca_tumipampa: {
    id: 'p_inca_tumipampa',
    title: 'Tumipampa',
    subtitle: 'Norte andino · c. 1460–1470',
    summary: 'Túpac Yupanqui avanza contra cañaris y quitus y funda Tumipampa, la segunda capital del norte.',
  },
  p_inca_huarco: {
    id: 'p_inca_huarco',
    title: 'El Huarco',
    subtitle: 'Costa sur · c. 1470–1485',
    summary: 'Chincha acepta la paz; el Huarco resiste años. Un asedio por temporadas desde la «Nueva Cusco».',
  },
  p_inca_pucaras: {
    id: 'p_inca_pucaras',
    title: 'Los cuatro pucarás',
    subtitle: 'Altiplano · c. 1475–1480',
    summary:
      'Los collas se rebelan con Coaquiri y se hacen fuertes en sus pucarás. Recupera el Collao fortaleza a fortaleza.',
  },
  p_inca_yahuarcocha: {
    id: 'p_inca_yahuarcocha',
    title: 'Yahuarcocha',
    subtitle: 'Norte andino · c. 1500–1520',
    summary: 'Huayna Cápac enfrenta a caranquis y cayambes en la frontera norte del Tahuantinsuyo.',
  },
  // El Virreinato
  p_vir_lima: {
    id: 'p_vir_lima',
    title: 'La Ciudad de los Reyes',
    subtitle: 'Lima · 1535–1536',
    summary:
      'Lima se funda junto al Rímac y resiste el cerco del general inca Quizu Yupanqui, con aliados andinos de ambos lados.',
  },
  p_vir_cusco: {
    id: 'p_vir_cusco',
    title: 'Cusco en llamas',
    subtitle: 'Cusco · 1536',
    summary:
      'Manco Inca cerca el Cusco y combate en Sacsayhuamán. El calendario de siembra decide cuánto dura el cerco.',
  },
  p_vir_ollantaytambo: {
    id: 'p_vir_ollantaytambo',
    title: 'Las terrazas de Ollantaytambo',
    subtitle: 'Valle Sagrado · 1537',
    summary: 'Manco defiende Ollantaytambo y se retira a Vilcabamba, donde la resistencia inca continuará.',
  },
  p_vir_salinas: {
    id: 'p_vir_salinas',
    title: 'Nueva Castilla o Nueva Toledo',
    subtitle: 'Cusco · 1538–1542',
    summary:
      'Pizarristas y almagristas se disputan el Cusco en Las Salinas y Chupas. En 1542 nace el Virreinato del Perú.',
  },
  p_vir_gasca: {
    id: 'p_vir_gasca',
    title: 'El Pacificador',
    subtitle: 'Sierra · 1546–1548',
    summary:
      'Pedro de la Gasca enfrenta la rebelión de Gonzalo Pizarro con deserciones, pactos y la batalla de Jaquijahuana.',
  },
  p_vir_vilcabamba: {
    id: 'p_vir_vilcabamba',
    title: 'El último Inca',
    subtitle: 'Vilcabamba · 1572',
    summary: 'La expedición del virrey Toledo entra en Vilcabamba. Túpac Amaru I resiste y busca escapar a la selva.',
  },
  p_vir_callao: {
    id: 'p_vir_callao',
    title: 'El bloqueo del Callao',
    subtitle: 'Callao · 1624',
    summary: 'Una flota neerlandesa bloquea el Callao. Defiende el puerto y la ciudad desde la costa.',
  },
  p_vir_juan_santos: {
    id: 'p_vir_juan_santos',
    title: 'El invencible',
    subtitle: 'Selva central · 1742–1752',
    summary:
      'Juan Santos Atahualpa y los asháninka levantan la selva central contra los fuertes de la frontera virreinal.',
  },
  // La Independencia
  p_ind_pisco: {
    id: 'p_ind_pisco',
    title: 'De Pisco a Pasco',
    subtitle: 'Costa y sierra central · 1820',
    summary: 'La Expedición Libertadora desembarca en Paracas y Arenales recorre la sierra hasta Cerro de Pasco.',
  },
  p_ind_lima: {
    id: 'p_ind_lima',
    title: 'El cerco de Lima',
    subtitle: 'Lima y Callao · 1821',
    summary: 'Las montoneras cercan Lima, San Martín proclama la independencia y el Callao resiste el primer sitio.',
  },
  p_ind_real_felipe: {
    id: 'p_ind_real_felipe',
    title: 'El último bastión',
    subtitle: 'Callao · 1824–1826',
    summary: 'Tras Ayacucho, Rodil se encierra en la fortaleza del Real Felipe. El último sitio de la independencia.',
  },
  // La República
  p_rep_dos_de_mayo: {
    id: 'p_rep_dos_de_mayo',
    title: 'Las baterías del Callao',
    subtitle: 'Callao · 2 de mayo de 1866',
    summary: 'La escuadra española bombardea el Callao y las baterías de la costa responden.',
  },
  p_rep_tarapaca: {
    id: 'p_rep_tarapaca',
    title: 'La quebrada',
    subtitle: 'Tarapacá · 27 de noviembre de 1879',
    summary: 'Tras la guerra en el mar, el ejército peruano resiste en la quebrada de Tarapacá.',
  },
  p_rep_lima: {
    id: 'p_rep_lima',
    title: 'San Juan y Miraflores',
    subtitle: 'Lima · enero de 1881',
    summary: 'Lima se defiende en dos líneas de reductos frente al avance chileno.',
  },
  p_rep_brena: {
    id: 'p_rep_brena',
    title: 'El brujo de los Andes',
    subtitle: 'Sierra central · 1882–1883',
    summary:
      'Andrés A. Cáceres y las montoneras sostienen la Campaña de la Breña, de Pucará y Marcavalle a Huamachuco.',
  },
};

export function getPlannedMission(id: string): PlannedMission | undefined {
  return PLANNED_MISSIONS[id];
}
