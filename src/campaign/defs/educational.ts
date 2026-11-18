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
  /** Narrative closure after victory. It must not become an assessment. */
  epilogue: string;
  sources: SourceRef[];
}

/** High-level saga prologue retained for the Codex and legacy callers. */
export const PROLOGUE =
  'En el Perú nació una de las primeras civilizaciones del mundo y una de las más antiguas de América. ' +
  'Hace cinco mil años, en el valle de Supe, se levantó Caral, con sus pirámides, plazas y canales.\n' +
  'La Senda del Sol recorre esa historia en cinco campañas: Culturas Preincas, El Tahuantinsuyo, ' +
  'El Virreinato, La Independencia y La República. Cada escenario revive un hecho documentado —sin inventar ' +
  'nombres ni batallas— para comprender cómo se construyó el Perú.';

export const EDUCATIONAL: Record<string, EducationalMission> = {
  m1_caral: {
    briefing:
      'Valle de Supe, c. 3000–1800 a.C. Empiezas como pescadores en Áspero, subes al valle a sembrar algodón, ' +
      'levantas la Pirámide Mayor por fases y vives la sequía que cerró la ciudad. No hay guerra documentada.',
    context:
      'En el valle de Supe, a 182 km al norte de Lima y a 23 km del litoral, Caral fue una de las ciudades ' +
      'más antiguas de América. Se formó con una economía pesquero-agraria complementaria —pesca con redes de algodón en ' +
      'Áspero y agricultura en el valle—, canales de riego y una ideología religiosa que cohesionaba a una ' +
      'población estimada en miles de personas. Funcionó casi un milenio (3000–1800 a.C.).',
    didYouKnow:
      'En Caral se halló en 2005 un conjunto de cuerdas de algodón enrolladas en varillas, descrito como un posible quipu, mucho anterior al Tahuantinsuyo.',
    epilogue:
      'La comunidad de Supe sostuvo el valle combinando la pesca del litoral con la agricultura irrigada. ' +
      'Ese excedente y la organización del trabajo hicieron posible las plazas y pirámides. Hacia 1800 a.C., ' +
      'una crisis climática llevó a sellar los edificios y a trasladarse hacia la costa, a lugares como Vichama; ' +
      'las causas exactas aún se debaten.',
    sources: [
      { text: 'Shady Solís, R. Caral-Supe y su entorno natural y social en los orígenes de la civilización.' },
      { text: 'Zona Arqueológica Caral (Ministerio de Cultura)', url: 'https://zonacaral.gob.pe/' },
      { text: 'UNESCO: Ciudad Sagrada de Caral-Supe', url: 'https://whc.unesco.org/en/list/1269/' },
    ],
  },
  m2_chavin: {
    briefing:
      'Chavín de Huántar, c. 900–200 a.C. El templo y su oráculo atraen peregrinos y ofrendas de buena parte de los Andes. Acompaña el crecimiento del Templo Viejo y del Templo Nuevo, recibe peregrinos, abre la feria y sostén el prestigio del centro ceremonial hasta su declive documentado.',
    context:
      'Chavín de Huántar, a 3180 msnm en el Callejón de Conchucos (Áncash), fue el gran centro ceremonial y ' +
      'de peregrinaje de los Andes. Su oráculo atraía ofrendas de lejos y su arte se difundió por buena parte ' +
      'de los Andes centrales. Fue una sociedad teocrática liderada por una casta sacerdotal; no se conocen ' +
      'nombres de gobernantes.',
    didYouKnow:
      'No hay guerra directa documentada entre Chavín y Paracas: su emparejamiento en el juego es de coetaneidad. La cronología de las fases del templo sigue siendo debatida por los arqueólogos.',
    epilogue:
      'Chavín declinó hacia 500–200 a.C.; su influencia artística y religiosa se fragmentó y dio paso a las ' +
      'culturas regionales del Intermedio Temprano. El centro ceremonial dejó de ser el eje del poder andino.',
    sources: [
      { text: 'UNESCO: Chavín (Archaeological Site)', url: 'https://whc.unesco.org/en/list/330/' },
      { text: 'Ministerio de Cultura: Plan de Manejo 2020 de Chavín.' },
      { text: 'Rick, J. W. et al. (1998). La arquitectura del complejo ceremonial de Chavín de Huántar.' },
      {
        text: 'Rick, J. W. et al. (2009). La cronología de Chavín de Huántar y sus implicancias para el Periodo Formativo.',
      },
      { text: 'Burger, R. (1995). Chavín and the Origins of Andean Civilization.' },
    ],
  },
  m3_moche_recuay: {
    briefing:
      'Valles de Moche y Chicama, c. 300–600 d.C. El agua del canal sostiene los campos y el prestigio ' +
      'del valle. No hay una batalla única documentada: defiende el valle sin inventar un rey ni una guerra. ' +
      'Cada bando alista su unidad única: el Guerrero Moche y el Guerrero Recuay.',
    context:
      'Moche dominó los valles de la costa norte (Chicama, Moche, Virú) mientras Recuay señoreaba el Callejón ' +
      'de Huaylas. Fueron coetáneos y mantuvieron interacciones de largo alcance con un componente bélico ' +
      'atestiguado: fortificaciones, intercambio de élite y piezas de filiación moche halladas en la sierra.',
    didYouKnow:
      'No hay una batalla única documentada Moche–Recuay, pero sí evidencia arqueológica de conflicto y contactos de largo alcance.',
    epilogue:
      'Moche dominó la costa norte durante el Intermedio Temprano y se fragmentó hacia el 800 d.C. La ' +
      'interacción con Recuay combinó conflicto, intercambio de élite y circulación de objetos entre costa y sierra.',
    sources: [
      { text: 'PUCP: interacciones Moche–Recuay (revistas de arqueología).' },
      { text: 'Wikipedia: Cultura moche', url: 'https://es.wikipedia.org/wiki/Cultura_moche' },
    ],
  },
  m4_wari: {
    briefing:
      'Andes centrales, c. 600–1000 d.C. Wari teje una red de centros provinciales, caminos y andenes; ' +
      'Tiahuanaco compite por la misma esfera de influencia sin una guerra única documentada. Conecta dos ' +
      'centros provinciales y sostén la esfera wari. Wari alista al Guardián Wari como unidad única.',
    context:
      'Wari (núcleo en Ayacucho) y Tiahuanaco (altiplano del Titicaca) fueron dos grandes estados ' +
      'suprarregionales coetáneos que difundieron el culto al dios de los báculos. Wari extendió ciudades ' +
      'planificadas y caminos, y aseguró los andenes agrícolas. Ambos colapsan hacia 1000–1100 d.C.',
    didYouKnow:
      'No existe una guerra única documentada Wari–Tiahuanaco: su rivalidad fue de coetaneidad y competencia de influencia.',
    epilogue:
      'Wari y Tiahuanaco colapsaron hacia 1000–1100 d.C. El Horizonte Medio dio paso al Intermedio Tardío; ' +
      'la red de centros y andenes fue una forma de expansión e influencia, no una guerra única documentada.',
    sources: [
      { text: 'Wikipedia: Horizonte Medio', url: 'https://es.wikipedia.org/wiki/Horizonte_Medio' },
      { text: 'Wikipedia: Cultura wari', url: 'https://es.wikipedia.org/wiki/Cultura_wari' },
    ],
  },
  m_tambotoco: {
    briefing:
      'Pacaritambo, tiempo de la leyenda. Ocho hermanos salen de la cueva de Tambotoco en busca de tierra. ' +
      'En el valle del Cusco ya viven huallas, sauaseray y alcabizas; el agua decide quién se queda.',
    context:
      'La tradición recogida por Sarmiento (1572), Cieza y Betanzos (1551) cuenta la salida de los ocho hermanos ' +
      'de Tambotoco y su peregrinación hasta el valle del Cusco. Ayar Cachi es sepultado por engaño, Ayar Uchu se ' +
      'convierte en piedra en Huanacaure y Ayar Auca da nombre al sitio. Los recién llegados toman tierras de los ' +
      'sauaseray, quitan el agua a los alcabizas y fundan Inticancha. La arqueología sitúa una ocupación Killke en ' +
      'el valle c. 1000–1400, anterior al imperio; el relato no tiene fecha histórica. Garcilaso (1609) da otra ' +
      'versión, la de Manco Cápac y Mama Ocllo saliendo del Titicaca.',
    didYouKnow:
      'Sarmiento de Gamboa escribió su crónica por encargo del virrey Toledo para demostrar la «tiranía» de los incas: su versión de la fundación es hostil y debe leerse con ese contexto.',
    epilogue:
      'Inticancha quedó fundada y el sitio se ordenó en cuatro canchas. La historia no puede fechar la ' +
      'peregrinación: es leyenda. Sarmiento la cuenta como una toma violenta de tierras y agua; Garcilaso, ' +
      'como una misión civilizadora desde el Titicaca. El juego muestra la versión de Sarmiento y advierte ' +
      'en el Códice que no es la única ni una crónica neutral.',
    sources: [
      {
        text: 'Sarmiento de Gamboa, P. Historia de los Incas (1572), caps. IX–XIV',
        url: 'https://www.gutenberg.org/ebooks/20218',
      },
      {
        text: 'Cieza de León, P. El señorío de los Incas, caps. VI–VIII',
        url: 'https://www.gutenberg.org/ebooks/48785',
      },
      { text: 'Betanzos, J. de. Suma y narración de los incas (1551)' },
      { text: 'Bauer, B. y Covey, R. A. (2002). Processes of State Formation in the Inca Heartland.' },
    ],
  },
  m5_yahuar_pampa: {
    briefing:
      'Cusco, 1438. La confederación chanca avanza sobre la ciudad. Cusi Yupanqui organiza la defensa: ' +
      'sostén el Cusco, protege al príncipe y rechaza al ejército chanca. El Guerrero Inca y el Guerrero ' +
      'Chanca son las unidades únicas de cada bando.',
    context:
      'En 1438 la confederación Chanca, reunida en Andahuaylas y al mando de Anccu Hualloc, marchó sobre el ' +
      'Cusco. El inca Viracocha y el heredero Inca Urco huyeron; el príncipe Cusi Yupanqui organizó la defensa ' +
      'y venció en Yahuar Pampa, en las proximidades del Cusco. Asumió el poder como Pachacútec e inició la ' +
      'expansión del Tahuantinsuyo.',
    didYouKnow:
      'Según las crónicas, los cusqueños resistieron con aliados y la leyenda de los pururaucas, «soldados de piedra».',
    epilogue:
      'Los chancas se rindieron y luego se integraron como aliados militares del Tahuantinsuyo. Cusi Yupanqui ' +
      'asumió el poder como Pachacútec e inició la expansión incaica desde el Cusco.',
    sources: [
      { text: 'Wikipedia: Cultura chanca', url: 'https://es.wikipedia.org/wiki/Cultura_chanca' },
      { text: 'Betanzos, J. (1551). Suma y narración de los incas.' },
    ],
  },
  m6_chimu_inca: {
    briefing:
      'Costa norte, c. 1470. Túpac Yupanqui avanza sobre el Reino Chimú. Llega a Paramonga y corta el ' +
      'canal que abastece Chan Chan: el agua decide la campaña. El Guerrero Inca y el Fixi Chimú son las ' +
      'unidades únicas de cada bando.',
    context:
      'Hacia 1470, al mando del auqui Túpac Yupanqui, los incas avanzaron sobre el Reino Chimú de Minchancaman ' +
      'por Paramonga, Huarmey y el valle del Santa. Secaron el canal que abastecía de agua a Chan Chan; la ' +
      'ciudad, en pleno desierto, capituló. Minchancaman fue llevado preso al Cusco y su territorio se repartió ' +
      'en huamanis.',
    didYouKnow: 'El arma decisiva no fue la espada sino el agua: cortar el canal doblegó a Chan Chan.',
    epilogue:
      'Chan Chan capituló; Minchancaman fue llevado preso al Cusco y el territorio chimú se repartió en ' +
      'huamanis. Querrotumi se sublevó en 1475 y fue vencido. La costa norte quedó integrada al Tahuantinsuyo.',
    sources: [
      { text: 'Wikipedia: Guerra chimú-inca', url: 'https://es.wikipedia.org/wiki/Guerra_chim%C3%BA-inca' },
      { text: 'Cieza de León, P. y otros cronistas; «Discurso de la Descendencia» (1542).' },
    ],
  },
  m6b_guerra_civil: {
    briefing:
      'Sierra andina, 1529–1532. Tras la muerte de Huayna Cápac, Huáscar y Atahualpa se disputan el trono. ' +
      'Avanza con el ejército de Atahualpa hacia Quipaipan, derrota a Huáscar y mantén con vida a Atahualpa. Ambos ' +
      'ejércitos alistan al Guerrero Inca.',
    context:
      'La guerra civil inca enfrentó a los partidarios de Huáscar, en el Cusco, con los de Atahualpa, en Quito. ' +
      'Las campañas de Chillopampa, Mullihambato y Chimborazo precedieron a Quipaipan (1532), donde el ejército ' +
      'de Atahualpa venció y capturó a Huáscar. La división facilitó la conquista española, que comenzó con la ' +
      'captura de Atahualpa en Cajamarca ese mismo año.',
    didYouKnow:
      'La guerra civil terminó con la captura de Huáscar, pero Atahualpa fue capturado por los españoles en Cajamarca en 1532.',
    epilogue:
      'Atahualpa ganó la guerra civil, pero el Tahuantinsuyo quedó dividido y debilitado. Poco después, los ' +
      'españoles capturaron a Atahualpa en Cajamarca. La guerra civil no fue una guerra contra España: fue una ' +
      'disputa dinástica inca.',
    sources: [
      { text: 'Wikipedia: Guerra civil incaica', url: 'https://es.wikipedia.org/wiki/Guerra_civil_incaica' },
      { text: 'Betanzos, J. (1551). Suma y narración de los incas.' },
      { text: 'Cieza de León, P. Crónica del Perú.' },
    ],
  },
  m_lima: {
    briefing:
      'Lima, 1535–1536. Pizarro funda la Ciudad de los Reyes junto al Rímac, en tierras del curacazgo de Lima. ' +
      'En 1536 el ejército de Quizu Yupanqui baja de los cerros para destruirla.',
    context:
      'Pizarro fundó Lima el 18 de enero de 1535, con aliados andinos y sobre un valle ya habitado. En agosto de ' +
      '1536, Manco Inca envió a Quizu Yupanqui contra la ciudad; sus columnas destruyeron los socorros que Pizarro ' +
      'mandaba al Cusco. El asalto fracasó en el llano, terreno favorable a la caballería, y Quizu murió. La ' +
      'victoria no terminó la guerra: el Cusco seguía cercado. Las cifras del ejército inca son discutidas.',
    didYouKnow:
      'Lima no se fundó en un valle vacío: ocupó tierras del curacazgo de Lima y se sostuvo con aliados andinos, un punto que las crónicas tienden a minimizar.',
    epilogue:
      'El cerco de Lima se rompió y Quizu Yupanqui murió, pero la guerra siguió: el Cusco continuaba cercado y la ' +
      'conquista no estaba decidida. La misión permite romper el cerco, no cambiar el resto de la campaña.',
    sources: [
      { text: 'Pedro Pizarro. Relación del descubrimiento y conquista de los reinos del Perú (1571).' },
      { text: 'Zárate, A. de. Historia del descubrimiento y conquista del Perú (1555).' },
      { text: 'Hemming, J. The Conquest of the Incas (1970).' },
      { text: 'Wikipedia: Cerco de Lima', url: 'https://es.wikipedia.org/wiki/Cerco_de_Lima' },
    ],
  },
  m7_tupac_amaru: {
    briefing:
      'Sur andino, 1780. Túpac Amaru II se alza contra el reparto, la mita y los obrajes del Virreinato. ' +
      'Micaela Bastidas sostiene el avituallamiento. La campaña se juega como la rebelión la vivió: Sangarará ' +
      'se gana, pero el cerco del Cusco fracasa y hay que retirarse. El epílogo cuenta la captura y la ejecución.',
    context:
      'Entre 1780 y 1781, José Gabriel Condorcanqui, Túpac Amaru II, se alzó contra las reformas borbónicas: ' +
      'el reparto de mercancías, la mita minera y los obrajes. Capturó y ejecutó al corregidor Arriaga, decretó ' +
      'la abolición de la esclavitud y venció en Sangarará (18 de noviembre de 1780). El cerco del Cusco, en ' +
      'enero de 1781, no tomó la ciudad; el socorro realista y la derrota de Checacupe/Combapata llevaron a la ' +
      'captura en Langui. Túpac Amaru y Micaela Bastidas fueron ejecutados en el Cusco el 18 de mayo de 1781; ' +
      'Diego Cristóbal Túpac Amaru mantuvo la rebelión hasta 1783. Se abolieron el reparto y los corregimientos.',
    didYouKnow:
      'Túpac Amaru II decretó la abolición de la esclavitud el 16 de noviembre de 1780. Mateo Pumacahua, que ' +
      'combatió contra él en 1780, encabezaría la rebelión del Cusco en 1814.',
    epilogue:
      'Sangarará fue una victoria, pero el cerco del Cusco fracasó. Túpac Amaru II y Micaela Bastidas fueron ' +
      'capturados y ejecutados en el Cusco el 18 de mayo de 1781; la rebelión continuó hasta 1783. El Virreinato ' +
      'abolió el reparto y los corregimientos, y la Gran Rebelión quedó como antecedente central de la independencia.',
    sources: [
      { text: "O'Phelan Godoy, S. (2021). La gran rebelión de Túpac Amaru II y la temprana independencia del Perú." },
      { text: 'Serulnikov, S. (2010). Revolution in the Andes: The Age of Túpac Amaru.' },
      {
        text: 'Wikipedia: Rebelión de Túpac Amaru II',
        url: 'https://es.wikipedia.org/wiki/Rebeli%C3%B3n_de_T%C3%BApac_Amaru_II',
      },
    ],
  },
  m_junta_cusco: {
    briefing:
      'Cusco, 1814. El cabildo constitucional y la Real Audiencia chocan; los hermanos Angulo forman una junta y ' +
      'Pumacahua la dirige militarmente. La rebelión se extiende al altiplano y termina en Umachiri (1815).',
    context:
      'La revolución del Cusco de 1814 nació del conflicto entre el cabildo constitucional de Cádiz y la Real ' +
      'Audiencia. La Junta, presidida por José Angulo y con Mateo García Pumacahua como jefe militar, envió ' +
      'expediciones a Puno, La Paz, Huamanga y Arequipa. Pumacahua venció en La Apacheta (10 de noviembre de 1814) ' +
      'y ocupó Arequipa, pero la división de Juan Ramírez Orozco, veterana del Alto Perú, derrotó a los rebeldes ' +
      'en Umachiri (11 de marzo de 1815). La historiografía debate si el movimiento fue separatista o autonomista ' +
      'dentro de la monarquía; sus líderes fueron ejecutados y Mariano Melgar, fusilado.',
    didYouKnow:
      'Pumacahua había combatido contra Túpac Amaru II en 1780–1781; en 1814 encabezó la mayor rebelión del sur andino desde entonces.',
    epilogue:
      'Umachiri fue una derrota. La división de Ramírez dispersó a la Junta; Pumacahua fue ejecutado en Sicuani y ' +
      'los hermanos Angulo y Béjar en el Cusco, y Melgar fue fusilado. La campaña permite resistir el tiempo ' +
      'suficiente para retirar a los líderes, pero no cambia el desenlace documentado: el virreinato recuperó el Cusco. ' +
      'La rebelión dejó una memoria que la independencia de 1821 recogería.',
    sources: [
      {
        text: 'Wikipedia: Rebelión del Cuzco de 1814',
        url: 'https://es.wikipedia.org/wiki/Rebeli%C3%B3n_del_Cuzco_de_1814',
      },
      { text: 'Wikipedia: Batalla de Umachiri', url: 'https://es.wikipedia.org/wiki/Batalla_de_Umachiri' },
      { text: "O'Phelan Godoy, S. La independencia en los Andes (2014)." },
      { text: 'Basadre, J. Historia de la República del Perú.' },
    ],
  },
  m_lima_1821: {
    briefing:
      'Lima, 1821. La Expedición Libertadora desembarca en la costa, las montoneras cortan los abastos y Cochrane ' +
      'bloquea el Callao. La Serna evacua la capital y San Martín proclama la independencia el 28 de julio.',
    context:
      'La independencia del Perú no se decidió en una sola batalla. Entre 1820 y 1821, la Expedición Libertadora de ' +
      'San Martín combinó desembarcos, montoneras, bloqueo naval y presión política. El virrey La Serna abandonó Lima ' +
      'en julio de 1821 y San Martín proclamó la independencia el 28 de julio. El primer sitio del Callao se extendió ' +
      'hasta septiembre, cuando la guarnición de José de La Mar capituló. La guerra continuó en la sierra hasta Junín ' +
      'y Ayacucho, en 1824.',
    didYouKnow:
      'La independencia proclamada en Lima no puso fin a la guerra: el Callao y la sierra siguieron en manos realistas ' +
      'durante años.',
    epilogue:
      'Lima proclama la independencia y el Callao capitula en septiembre de 1821. La capital cambia de bando, pero la ' +
      'guerra continúa en la sierra. La historia recuerda el debate entre una independencia «concedida» y una ' +
      '«conseguida»: la campaña de 1821 muestra que ambas cosas se mezclaron.',
    sources: [
      { text: 'Dossier: Lima y el Callao, 1821', url: 'docs/historia/campanas/lima_1821.md' },
      { text: 'Basadre, Historia de la República del Perú' },
      { text: "O'Phelan, La independencia del Perú" },
    ],
  },
  m8_independencia: {
    briefing:
      'Sierra del Perú, 1824. Tras la proclamación de Lima, la campaña final se decide en dos encuentros: ' +
      'Junín (6 de agosto) y Ayacucho (9 de diciembre), donde el ejército de Sucre sella la independencia.',
    context:
      'San Martín proclamó la independencia en Lima el 28 de julio de 1821. La campaña continuó en la sierra ' +
      'con Bolívar y Sucre: la batalla de Junín (6 de agosto de 1824) y la de Ayacucho (9 de diciembre de 1824) ' +
      'sellaron la independencia del Perú y el fin del poder español.',
    didYouKnow:
      'San Martín desembarcó en Paracas en 1820; la victoria militar la completaron Bolívar y Sucre en la sierra.',
    epilogue:
      'La victoria de Ayacucho puso fin al poder español en el Perú. La campaña del juego representa sus dos ' +
      'encuentros como posiciones que deben sostenerse, no como una batalla única.',
    sources: [
      { text: 'Wikipedia: Independencia del Perú', url: 'https://es.wikipedia.org/wiki/Independencia_del_Per%C3%BA' },
      { text: 'Basadre, J. Historia de la República del Perú.' },
    ],
  },
  m_real_felipe: {
    briefing:
      'Callao, 1824–1826. Después de Ayacucho, José Ramón Rodil se encierra en el Real Felipe. El general Salom lo ' +
      'sitía por tierra y la escuadra patriota bloquea el puerto. La fortaleza capitula en enero de 1826.',
    context:
      'El segundo sitio del Callao fue el último episodio de la guerra de independencia en el Perú. Rodil resistió ' +
      'con una guarnición de entre dos mil y cuatro mil hombres y miles de civiles refugiados. El hambre y el ' +
      'escorbuto causaron una crisis humanitaria: se estima que murieron unos seis mil civiles. Rodil expulsó a ' +
      'parte de la población y la capitulación se firmó en enero de 1826; salió con honores y conservó dos banderas.',
    didYouKnow: 'El último bastión español en el Perú no cayó en una batalla, sino por un sitio de más de un año.',
    epilogue:
      'El Real Felipe capitula en enero de 1826. La guerra de independencia termina en el Perú, pero el costo civil ' +
      'del sitio es parte de la historia: miles de personas refugiadas murieron por hambre y enfermedad. La ' +
      'resistencia de Rodil y el sufrimiento del Callao se recuerdan sin convertirlos en una gesta épica.',
    sources: [
      { text: 'Dossier: El último bastión', url: 'docs/historia/campanas/real_felipe.md' },
      { text: 'García Camba, Memorias para la historia de las armas españolas en el Perú' },
      { text: 'Paz Soldán, Historia del Perú independiente' },
    ],
  },
  m9_guerra_pacifico: {
    briefing:
      'Arica, 7 de junio de 1880. Tras Angamos, la Guerra del Pacífico continúa en tierra. La guarnición ' +
      'peruana, al mando de Francisco Bolognesi, defiende el puerto del asalto chileno; la plaza cae ese día.',
    context:
      'En la Guerra del Pacífico (1879–1883), por el salitre de Antofagasta, el Perú y Bolivia se enfrentaron a ' +
      'Chile. Al mando del monitor Huáscar, el almirante Miguel Grau contuvo con audaces correrías a una escuadra ' +
      'superior hasta caer en Angamos (8 de octubre de 1879). En Arica, el parlamento de Juan de la Cruz Salvo ' +
      'exigió la rendición el 5 de junio de 1880; Bolognesi y sus jefes la rechazaron. El ingeniero Teodoro ' +
      'Elmore minó los accesos y la guarnición defendió la batería y el cuartel. El asalto chileno del 7 de ' +
      'junio tomó la plaza: Bolognesi murió en la defensa y el monitor Manco Cápac fue inutilizado.',
    didYouKnow:
      'La frase «hasta quemar el último cartucho» la recoge Vicuña Mackenna (1881); el ingeniero Teodoro Elmore ' +
      'minó los accesos a la plaza antes del asalto.',
    epilogue:
      'La plaza cayó el 7 de junio de 1880. Bolognesi murió en el asalto, junto a Juan Guillermo More y Alfonso ' +
      'Ugarte, y el Manco Cápac fue inutilizado para que no lo capturaran. La defensa quedó como símbolo de la ' +
      'resistencia peruana; la guerra continuó hasta 1883.',
    sources: [
      { text: 'Sater, W. (2007). Andean Tragedy: Fighting the War of the Pacific, 1879–1884.' },
      { text: 'Vicuña Mackenna, B. (1881). Historia de la campaña de Tacna y Arica.' },
      {
        text: 'Wikipedia: Batalla de Arica',
        url: 'https://es.wikipedia.org/wiki/Batalla_de_Arica',
      },
      { text: 'Marina de Guerra del Perú: Combate de Angamos', url: 'https://marina.mil.pe/info/combate-de-angamos/' },
    ],
  },
};

export function getEducational(missionId: string): EducationalMission | undefined {
  return EDUCATIONAL[missionId];
}
