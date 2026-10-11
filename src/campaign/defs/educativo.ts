/**
 * Contenido educativo de la campaña. Todo el texto deriva de los dossiers de
 * `docs/historia/campanas/*.md` y cita sus fuentes; no se inventan hechos,
 * nombres ni fechas. Al añadir misiones nuevas, añade aquí su entrada.
 */

export interface FuenteHist {
  texto: string;
  url?: string;
}

export interface EducativoMision {
  /** Contexto histórico ampliado, para el briefing previo a la misión. */
  contexto: string;
  /** Dato curioso y verificable que se muestra en el briefing. */
  sabiasQue: string;
  fuentes: FuenteHist[];
}

/** Prólogo que se muestra al abrir la campaña, antes de la lista de misiones. */
export const PROLOGO =
  'En el Perú nació una de las primeras civilizaciones del mundo y la más antigua de América. ' +
  'Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.\n' +
  'Después llegaron el oráculo de Chavín; los señores Moche, Nazca y Recuay; los imperios Wari y ' +
  'Tiahuanaco; el Tahuantinsuyo de los incas; el Virreinato; la independencia; y la República.\n' +
  'En esta campaña recorrerás nueve escenarios históricos. Cada uno revive un hecho documentado —sin ' +
  'inventar nombres ni batallas— para comprender cómo se construyó el Perú.';

export const EDUCATIVO: Record<string, EducativoMision> = {
  m1_caral: {
    contexto:
      'En el valle de Supe, a 182 km al norte de Lima y a 23 km del litoral, Caral fue la primera ciudad ' +
      'de América. Se formó con una economía pesquero-agraria complementaria —pesca con redes de algodón en ' +
      'Áspero y agricultura en el valle—, canales de riego y una ideología religiosa que cohesionaba a miles ' +
      'de personas. Funcionó casi un milenio (3000–1800 a.C.).',
    sabiasQue: 'En Caral no hay guerra documentada: su poder se basó en la construcción, el comercio y la religión.',
    fuentes: [
      { texto: 'Shady Solís, R. Caral-Supe y su entorno natural y social en los orígenes de la civilización.' },
      { texto: 'UNESCO: Ciudad Sagrada de Caral-Supe', url: 'https://whc.unesco.org/en/list/1269/' },
    ],
  },
  m2_chavin: {
    contexto:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos (Áncash), fue el gran centro ceremonial y ' +
      'de peregrinaje de los Andes. Su oráculo atraía ofrendas de lejos y su arte se difundió por buena parte ' +
      'de los Andes centrales. Fue una sociedad teocrática liderada por una casta sacerdotal.',
    sabiasQue: 'No hay guerra directa documentada entre Chavín y Paracas: su emparejamiento en el juego es de coetaneidad.',
    fuentes: [
      { texto: 'Wikipedia: Cultura chavín', url: 'https://es.wikipedia.org/wiki/Cultura_chav%C3%ADn' },
      { texto: 'Wikipedia: Horizonte Temprano', url: 'https://es.wikipedia.org/wiki/Horizonte_Temprano' },
    ],
  },
  m3_moche_recuay: {
    contexto:
      'Moche dominó los valles de la costa norte (Chicama, Moche, Virú) mientras Recuay señoreaba el Callejón ' +
      'de Huaylas. Fueron coetáneos y mantuvieron interacciones de largo alcance con un componente bélico ' +
      'atestiguado: fortificaciones, intercambio de élite y piezas de filiación moche halladas en la sierra.',
    sabiasQue: 'No hay una batalla única documentada Moche–Recuay, pero sí evidencia arqueológica de conflicto e intercambio.',
    fuentes: [
      { texto: 'PUCP: interacciones Moche–Recuay (revistas de arqueología).' },
      { texto: 'Wikipedia: Cultura moche', url: 'https://es.wikipedia.org/wiki/Cultura_moche' },
    ],
  },
  m4_wari: {
    contexto:
      'Wari (núcleo en Ayacucho) y Tiahuanaco (altiplano del Titicaca) fueron dos grandes estados ' +
      'suprarregionales coetáneos que difundieron el culto al dios de los báculos. Wari extendió ciudades ' +
      'planificadas y caminos, y aseguró los andenes agrícolas. Ambos colapsan hacia 1000–1100 d.C.',
    sabiasQue: 'No existe una guerra única documentada Wari–Tiahuanaco: su rivalidad fue de coetaneidad y competencia de influencia.',
    fuentes: [
      { texto: 'Wikipedia: Horizonte Medio', url: 'https://es.wikipedia.org/wiki/Horizonte_Medio' },
      { texto: 'Wikipedia: Cultura wari', url: 'https://es.wikipedia.org/wiki/Cultura_wari' },
    ],
  },
  m5_yahuar_pampa: {
    contexto:
      'En 1438 la confederación Chanca, reunida en Andahuaylas y al mando de Anccu Hualloc, marchó sobre el ' +
      'Cusco. El inca Viracocha y el heredero Inca Urco huyeron; el príncipe Cusi Yupanqui organizó la defensa ' +
      'y venció en Yahuar Pampa, en las proximidades del Cusco. Asumió el poder como Pachacútec e inició la ' +
      'expansión del Tahuantinsuyo.',
    sabiasQue: 'Según las crónicas, los cusqueños resistieron con aliados y la leyenda de los pururaucas, «soldados de piedra».',
    fuentes: [
      { texto: 'Wikipedia: Cultura chanca', url: 'https://es.wikipedia.org/wiki/Cultura_chanca' },
      { texto: 'Betanzos, J. (1551). Suma y narración de los incas.' },
    ],
  },
  m6_chimu_inca: {
    contexto:
      'Hacia 1470, al mando del auqui Túpac Yupanqui, los incas avanzaron sobre el Reino Chimú de Minchancaman ' +
      'por Paramonga, Huarmey y el valle del Santa. Secaron el canal que abastecía de agua a Chan Chan; la ' +
      'ciudad, en pleno desierto, capituló. Minchancaman fue llevado preso al Cusco y su territorio se repartió ' +
      'en huamanis.',
    sabiasQue: 'El arma decisiva no fue la espada sino el agua: cortar el canal doblegó a Chan Chan.',
    fuentes: [
      { texto: 'Wikipedia: Guerra chimú-inca', url: 'https://es.wikipedia.org/wiki/Guerra_chim%C3%BA-inca' },
      { texto: 'Cieza de León, P. y otros cronistas; «Discurso de la Descendencia» (1542).' },
    ],
  },
  m7_tupac_amaru: {
    contexto:
      'Entre 1780 y 1781, José Gabriel Condorcanqui, Túpac Amaru II, se alzó contra las reformas borbónicas: ' +
      'el reparto de mercancías, la mita minera y los obrajes. Decretó la abolición de la esclavitud y venció ' +
      'en Sangarará. Su esposa Micaela Bastidas tuvo un papel central. Fue capturado y ejecutado en el Cusco en ' +
      '1781; aunque la rebelión fue derrotada, abolió el reparto y los corregimientos y fue un antecedente de la ' +
      'independencia.',
    sabiasQue: 'Túpac Amaru II decretó la abolición de la esclavitud el 16 de noviembre de 1780.',
    fuentes: [
      { texto: "O'Phelan Godoy, S. (2021). La gran rebelión de Túpac Amaru II." },
      { texto: 'Wikipedia: Rebelión de Túpac Amaru II', url: 'https://es.wikipedia.org/wiki/Rebeli%C3%B3n_de_T%C3%BApac_Amaru_II' },
    ],
  },
  m8_independencia: {
    contexto:
      'San Martín proclamó la independencia en Lima el 28 de julio de 1821. La campaña continuó en la sierra ' +
      'con Bolívar y Sucre: la batalla de Junín (6 de agosto de 1824) y la de Ayacucho (9 de diciembre de 1824) ' +
      'sellaron la independencia del Perú y el fin del poder español.',
    sabiasQue: 'San Martín desembarcó en Paracas en 1820; la victoria militar la completaron Bolívar y Sucre en la sierra.',
    fuentes: [
      { texto: 'Wikipedia: Independencia del Perú', url: 'https://es.wikipedia.org/wiki/Independencia_del_Per%C3%BA' },
      { texto: 'Basadre, J. Historia de la República del Perú.' },
    ],
  },
  m9_guerra_pacifico: {
    contexto:
      'En la Guerra del Pacífico (1879–1883), por el salitre de Antofagasta, el Perú y Bolivia se enfrentaron a ' +
      'Chile. Al mando del monitor Huáscar, el almirante Miguel Grau contuvo con audaces correrías a una escuadra ' +
      'superior. Cayó en el combate de Angamos (8 de octubre de 1879). Francisco Bolognesi murió defendiendo ' +
      'Arica (7 de junio de 1880). Chile obtuvo el dominio del mar.',
    sabiasQue: 'El monitor Huáscar, con Miguel Grau, libró una guerra de correrías que retrasó a una escuadra muy superior.',
    fuentes: [
      { texto: 'Marina de Guerra del Perú: Combate de Angamos', url: 'https://marina.mil.pe/info/combate-de-angamos/' },
      { texto: 'BBC Mundo (2022). Batalla de Angamos.' },
    ],
  },
};

export function getEducativo(missionId: string): EducativoMision | undefined {
  return EDUCATIVO[missionId];
}
