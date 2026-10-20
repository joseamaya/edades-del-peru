/**
 * Campaign educational content. All text derives from the dossiers in
 * `docs/historia/campanas/*.md` and cites its sources; facts, names and
 * dates are not invented. When adding new missions, add their entry here.
 */

export interface SourceRef {
  text: string;
  url?: string;
}

export interface EducationalMission {
  /** Short scene-setting paragraph for the briefing; the full context stays in the Codex. */
  briefing?: string;
  /** Expanded historical context, for the Codex. */
  context: string;
  /** Verifiable fun fact shown in the briefing. */
  didYouKnow: string;
  /** Brief narrative closure after victory. It must not become an assessment. */
  epilogue?: string;
  sources: SourceRef[];
}

/** Prologue shown when opening the campaign, before the mission list. */
export const PROLOGUE =
  'En el Perú nació una de las primeras civilizaciones del mundo y la más antigua de América. ' +
  'Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.\n' +
  'Después llegaron el oráculo de Chavín; los señores Moche, Nazca y Recuay; los imperios Wari y ' +
  'Tiahuanaco; el Tahuantinsuyo de los incas; el Virreinato; la independencia; y la República.\n' +
  'En esta campaña recorrerás nueve escenarios históricos. Cada uno revive un hecho documentado —sin ' +
  'inventar nombres ni batallas— para comprender cómo se construyó el Perú.';

export const EDUCATIONAL: Record<string, EducationalMission> = {
  m1_caral: {
    briefing:
      'Valle de Supe, c. 3000 a.C. Entre el mar y los Andes crece una comunidad que organiza canales, ' +
      'andenes y plazas. No hay guerra documentada: el desafío es sostener a su gente y guardar el excedente.',
    context:
      'En el valle de Supe, a 182 km al norte de Lima y a 23 km del litoral, Caral fue la primera ciudad ' +
      'de América. Se formó con una economía pesquero-agraria complementaria —pesca con redes de algodón en ' +
      'Áspero y agricultura en el valle—, canales de riego y una ideología religiosa que cohesionaba a miles ' +
      'de personas. Funcionó casi un milenio (3000–1800 a.C.).',
    didYouKnow:
      'En Caral no hay guerra documentada: la arqueología muestra canales, plazas, pirámides y redes de intercambio.',
    epilogue:
      'La comunidad de Supe sostuvo el valle combinando la pesca del litoral con la agricultura irrigada. ' +
      'Ese excedente y la organización del trabajo hicieron posible las plazas y pirámides. Caral prosperó sin ' +
      'guerra documentada y fue abandonada siglos después por causas que los arqueólogos todavía debaten.',
    sources: [
      { text: 'Shady Solís, R. Caral-Supe y su entorno natural y social en los orígenes de la civilización.' },
      { text: 'Zona Arqueológica Caral (Ministerio de Cultura)', url: 'https://zonacaral.gob.pe/' },
      { text: 'UNESCO: Ciudad Sagrada de Caral-Supe', url: 'https://whc.unesco.org/en/list/1269/' },
    ],
  },
  m2_chavin: {
    context:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos (Áncash), fue el gran centro ceremonial y ' +
      'de peregrinaje de los Andes. Su oráculo atraía ofrendas de lejos y su arte se difundió por buena parte ' +
      'de los Andes centrales. Fue una sociedad teocrática liderada por una casta sacerdotal.',
    didYouKnow:
      'No hay guerra directa documentada entre Chavín y Paracas: su emparejamiento en el juego es de coetaneidad.',
    sources: [
      { text: 'Wikipedia: Cultura chavín', url: 'https://es.wikipedia.org/wiki/Cultura_chav%C3%ADn' },
      { text: 'Wikipedia: Horizonte Temprano', url: 'https://es.wikipedia.org/wiki/Horizonte_Temprano' },
    ],
  },
  m3_moche_recuay: {
    context:
      'Moche dominó los valles de la costa norte (Chicama, Moche, Virú) mientras Recuay señoreaba el Callejón ' +
      'de Huaylas. Fueron coetáneos y mantuvieron interacciones de largo alcance con un componente bélico ' +
      'atestiguado: fortificaciones, intercambio de élite y piezas de filiación moche halladas en la sierra.',
    didYouKnow:
      'No hay una batalla única documentada Moche–Recuay, pero sí evidencia arqueológica de conflicto e intercambio.',
    sources: [
      { text: 'PUCP: interacciones Moche–Recuay (revistas de arqueología).' },
      { text: 'Wikipedia: Cultura moche', url: 'https://es.wikipedia.org/wiki/Cultura_moche' },
    ],
  },
  m4_wari: {
    context:
      'Wari (núcleo en Ayacucho) y Tiahuanaco (altiplano del Titicaca) fueron dos grandes estados ' +
      'suprarregionales coetáneos que difundieron el culto al dios de los báculos. Wari extendió ciudades ' +
      'planificadas y caminos, y aseguró los andenes agrícolas. Ambos colapsan hacia 1000–1100 d.C.',
    didYouKnow:
      'No existe una guerra única documentada Wari–Tiahuanaco: su rivalidad fue de coetaneidad y competencia de influencia.',
    sources: [
      { text: 'Wikipedia: Horizonte Medio', url: 'https://es.wikipedia.org/wiki/Horizonte_Medio' },
      { text: 'Wikipedia: Cultura wari', url: 'https://es.wikipedia.org/wiki/Cultura_wari' },
    ],
  },
  m5_yahuar_pampa: {
    context:
      'En 1438 la confederación Chanca, reunida en Andahuaylas y al mando de Anccu Hualloc, marchó sobre el ' +
      'Cusco. El inca Viracocha y el heredero Inca Urco huyeron; el príncipe Cusi Yupanqui organizó la defensa ' +
      'y venció en Yahuar Pampa, en las proximidades del Cusco. Asumió el poder como Pachacútec e inició la ' +
      'expansión del Tahuantinsuyo.',
    didYouKnow:
      'Según las crónicas, los cusqueños resistieron con aliados y la leyenda de los pururaucas, «soldados de piedra».',
    sources: [
      { text: 'Wikipedia: Cultura chanca', url: 'https://es.wikipedia.org/wiki/Cultura_chanca' },
      { text: 'Betanzos, J. (1551). Suma y narración de los incas.' },
    ],
  },
  m6_chimu_inca: {
    context:
      'Hacia 1470, al mando del auqui Túpac Yupanqui, los incas avanzaron sobre el Reino Chimú de Minchancaman ' +
      'por Paramonga, Huarmey y el valle del Santa. Secaron el canal que abastecía de agua a Chan Chan; la ' +
      'ciudad, en pleno desierto, capituló. Minchancaman fue llevado preso al Cusco y su territorio se repartió ' +
      'en huamanis.',
    didYouKnow: 'El arma decisiva no fue la espada sino el agua: cortar el canal doblegó a Chan Chan.',
    sources: [
      { text: 'Wikipedia: Guerra chimú-inca', url: 'https://es.wikipedia.org/wiki/Guerra_chim%C3%BA-inca' },
      { text: 'Cieza de León, P. y otros cronistas; «Discurso de la Descendencia» (1542).' },
    ],
  },
  m7_tupac_amaru: {
    context:
      'Entre 1780 y 1781, José Gabriel Condorcanqui, Túpac Amaru II, se alzó contra las reformas borbónicas: ' +
      'el reparto de mercancías, la mita minera y los obrajes. Decretó la abolición de la esclavitud y venció ' +
      'en Sangarará. Su esposa Micaela Bastidas tuvo un papel central. Fue capturado y ejecutado en el Cusco en ' +
      '1781; aunque la rebelión fue derrotada, abolió el reparto y los corregimientos y fue un antecedente de la ' +
      'independencia.',
    didYouKnow: 'Túpac Amaru II decretó la abolición de la esclavitud el 16 de noviembre de 1780.',
    sources: [
      { text: "O'Phelan Godoy, S. (2021). La gran rebelión de Túpac Amaru II." },
      {
        text: 'Wikipedia: Rebelión de Túpac Amaru II',
        url: 'https://es.wikipedia.org/wiki/Rebeli%C3%B3n_de_T%C3%BApac_Amaru_II',
      },
    ],
  },
  m8_independencia: {
    context:
      'San Martín proclamó la independencia en Lima el 28 de julio de 1821. La campaña continuó en la sierra ' +
      'con Bolívar y Sucre: la batalla de Junín (6 de agosto de 1824) y la de Ayacucho (9 de diciembre de 1824) ' +
      'sellaron la independencia del Perú y el fin del poder español.',
    didYouKnow:
      'San Martín desembarcó en Paracas en 1820; la victoria militar la completaron Bolívar y Sucre en la sierra.',
    sources: [
      { text: 'Wikipedia: Independencia del Perú', url: 'https://es.wikipedia.org/wiki/Independencia_del_Per%C3%BA' },
      { text: 'Basadre, J. Historia de la República del Perú.' },
    ],
  },
  m9_guerra_pacifico: {
    context:
      'En la Guerra del Pacífico (1879–1883), por el salitre de Antofagasta, el Perú y Bolivia se enfrentaron a ' +
      'Chile. Al mando del monitor Huáscar, el almirante Miguel Grau contuvo con audaces correrías a una escuadra ' +
      'superior. Cayó en el combate de Angamos (8 de octubre de 1879). Francisco Bolognesi murió defendiendo ' +
      'Arica (7 de junio de 1880). Chile obtuvo el dominio del mar.',
    didYouKnow:
      'El monitor Huáscar, con Miguel Grau, libró una guerra de correrías que retrasó a una escuadra muy superior.',
    sources: [
      { text: 'Marina de Guerra del Perú: Combate de Angamos', url: 'https://marina.mil.pe/info/combate-de-angamos/' },
      { text: 'BBC Mundo (2022). Batalla de Angamos.' },
    ],
  },
};

export function getEducational(missionId: string): EducationalMission | undefined {
  return EDUCATIONAL[missionId];
}
