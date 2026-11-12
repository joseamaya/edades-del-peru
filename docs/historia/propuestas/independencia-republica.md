# Investigación — Rediseño de la campaña «Independencia y República»

> **Estado: propuesta de investigación.** Sustenta el rediseño de campañas de [`docs/design/campaign-redesign.md`](../../design/campaign-redesign.md). No describe misiones implementadas: cada misión necesita su dossier en [`campanas/`](../campanas/) antes de entrar al juego. Fuentes consultadas en noviembre de 2026.

Formato inspirado en `docs/historia/campanas/independencia.md` y `guerra_del_pacifico.md`.

## Cómo leer este informe

- **Documentado**: está en partes de guerra, memorias de participantes o en la historiografía de consenso.
- **Interpretación**: lectura razonable de los historiadores, no un dato bruto.
- **Debatido**: las fuentes discrepan (cifras, intenciones, autoría de órdenes, episodios célebres).
- Las **cifras** se dan con su fuente tal como aparecen en el artículo o la obra consultada. Cuando la
  referencia es un artículo de Wikipedia, se indica qué autor cita ese artículo. Hay que tratarlas como
  «orden de magnitud» y verificarlas en la fuente original antes de fijarlas en el juego.
- **URL verificadas**: todas las URL de este informe se comprobaron el 12 nov 2026 (respuesta HTTP 200).
  Las obras sin URL se citan sin enlace porque no hallé una copia abierta y legítima. **No hay URL
  inventadas.** Los títulos marcados con *(verificar edición)* son obras reales cuya edición, volumen o
  tomo exactos conviene confirmar en catálogo.

### Fuentes generales (sirven para varios hitos)

**Primarias, con copia digital verificada (archive.org)**

- García Camba, Andrés. *Memorias del general García Camba para la historia de las armas españolas en
  el Perú* (Madrid, 1846). Es la visión realista (Junín, Ayacucho, Callao 1821).
  T. 1: <https://archive.org/details/memoriasdelgener01garc> ·
  T. 2: <https://archive.org/details/memoriasdelgener02garc>
- Miller, John (ed.). *Memoirs of General Miller, in the service of the Republic of Peru* (Londres, 1828;
  hay traducción castellana de 1829). Es la visión patriota (Expedición Libertadora, Intermedios, Junín,
  Ayacucho y montoneras).
  <https://archive.org/details/memoirsofgeneral02milliala> ·
  <https://archive.org/details/bub_gb_5zg1AAAAIAAJ>
- Paz Soldán, Mariano Felipe. *Historia del Perú independiente*.
  Primer período, 1819–1822: <https://archive.org/details/bub_gb_6LICAAAAYAAJ> ·
  1822–1827, t. 1: <https://archive.org/details/historiadelper01pazs> ·
  t. 2: <https://archive.org/details/historiadelper02pazs>
- Mendiburu, Manuel de. *Diccionario histórico-biográfico del Perú*. Sirve para las biografías de
  comandantes. <https://archive.org/details/diccionariohist01mendgoog>
- Markham, Clements R. *The War between Peru and Chile, 1879–1882* (1882). Es una crónica británica
  contemporánea y favorable al Perú. <https://archive.org/details/cu31924021203173>
- Comisión Nacional del Sesquicentenario. *Colección Documental de la Independencia del Perú* (CDIP,
  1971–1976, 86 vols.). Reúne partes, oficios y correspondencia. El Fondo Editorial del Congreso
  publicó una edición digital por el Bicentenario:
  <https://www3.congreso.gob.pe/Docs/FondoEditorial/bicentenario/index.html>. Sus tomos clave son el
  III (*Conspiraciones y rebeliones en el siglo XIX*, que incluye la revolución del Cusco de 1814), el V
  (*Guerrillas y montoneras*, ed. Ella Dunbar Temple) y el VI (*Asuntos militares*) *(verificar
  volumen)*.

**Modernas**

- Basadre, Jorge. *Historia de la República del Perú, 1822–1933* (varias ediciones; la de El Comercio,
  2005, tiene 18 tomos). Es la referencia para los siglos XIX y XX. Sin URL abierta.
- Anna, Timothy E. *The Fall of the Royal Government in Peru* (University of Nebraska Press, 1979). Hay
  edición castellana del IEP (2003).
- O'Phelan Godoy, Scarlett. *La independencia en los Andes. Una historia conectada* (Fondo Editorial
  del Congreso, 2014). Trata 1814 y Pumacahua.
- Bonilla, Heraclio y Spalding, Karen. «La independencia en el Perú: las palabras y los hechos» (IEP,
  1972). Es el origen del debate sobre la «independencia concedida».
- Contreras, Carlos y Cueto, Marcos. *Historia del Perú contemporáneo* (IEP, varias ediciones).
- Manrique, Nelson. *Campesinado y nación. Las guerrillas indígenas en la guerra con Chile* (CIC/Ital
  Perú, 1981; reed. Taurus, 2022). Del mismo autor, *Yawar Mayu. Sociedades terratenientes serranas,
  1879–1910* (IFEA/DESCO, 1988): <https://books.openedition.org/ifea/1818>
- Sater, William F. *Andean Tragedy: Fighting the War of the Pacific, 1879–1884* (University of
  Nebraska Press, 2007).
- Cáceres, Andrés A. Sus memorias se publicaron como *La guerra entre el Perú y Chile, 1879–1883*
  (dictadas a Julio C. Guerrero, Madrid, 1924) y en las recopilaciones tituladas *Memorias del Mariscal
  Andrés A. Cáceres* (Milla Batres, Lima) *(verificar edición)*. Es la fuente primaria de la Breña.
- Wikipedia en español: es útil para orientarse y por su bibliografía; los enlaces aparecen en cada hito.

---

## Hito 1 — La revolución del Cusco (Pumacahua y los hermanos Angulo), 1814–1815

1. **Fecha y lugar**: del 3 ago 1814 (junta de gobierno en el Cusco) al 25 mar 1815 (Ramírez reocupa el
   Cusco). La batalla decisiva fue **Umachiri** (Puno), el **11 mar 1815**. Hubo expediciones a Puno y
   La Paz, a Huamanga y a Arequipa.
2. **Bandos y comandantes**
   - **Junta del Cusco**: **José Angulo** (capitán general), **Vicente y Mariano Angulo**, **José
     Gabriel Béjar**, **Mateo García Pumacahua** (cacique de Chinchero y jefe militar), **Juan Manuel
     Pinelo** y el cura **Ildefonso de las Muñecas** (expedición a La Paz), **Manuel Hurtado de
     Mendoza** (expedición a Huamanga) y el poeta **Mariano Melgar** (auditor de guerra).
   - **Realistas**: el virrey **Abascal**, **Joaquín de la Pezuela** (ejército del Alto Perú), **Juan
     Ramírez Orozco** (vencedor en Umachiri), **Francisco Picoaga**, **Pío Tristán** y **Vicente
     González** (en Huanta).
3. **Qué se sabe**
   - **Documentado**:
     - El conflicto nació entre el cabildo constitucional (Cádiz, 1812) y la Real Audiencia.
     - Las expediciones tomaron Puno (26 ago) y La Paz (24 set 1814). Fueron derrotadas en Achocalla
       (2 nov 1814) y en Matará (27 ene 1815).
     - Pumacahua venció en **La Apacheta** (10 nov 1814) y ocupó Arequipa, donde Picoaga y Moscoso
       fueron capturados y luego ejecutados.
     - Melgar fue fusilado después de Umachiri. Pumacahua fue ejecutado en Sicuani y los Angulo y
       Béjar en el Cusco (abril de 1815).
   - **Cifras**:
     - En Umachiri, la división de Ramírez tenía unos **1200 hombres, 40 caballos y 6 cañones**
       (Eguiguren, 1914, citado en Wikipedia). Los rebeldes, entre **12 000 y 36 000** combatientes,
       «probablemente 20 000» (Cisneros y Lumbreras, 1980), con apenas **600–800 fusiles** y unos 40
       cañones (Durand, 1993; Ortega, 1986).
     - Según el parte realista, Ramírez tuvo 7 muertos de bala, 6 ahogados y 7 heridos; los
       rebeldes, más de 1000 muertos.
   - **Interpretación**: el desequilibrio entre una masa con poco armamento de fuego y una división
     veterana explica Umachiri.
   - **Debatido**: si el movimiento fue **separatista** (un Estado cusqueño aliado de Buenos Aires) o
     **autonomista y constitucionalista** dentro de la monarquía. La pregunta divide a la historiografía:
     O'Phelan subraya su carácter andino y «conectado», mientras otros autores lo leen como precursor
     criollo. También se discute el papel de Pumacahua, que en 1780–81 había combatido **contra** Túpac
     Amaru II.
4. **Fuentes**
   - Primarias: CDIP, t. III (tomo de la revolución de 1814, ed. Horacio Villanueva Urteaga) *(verificar
     volumen)*; los partes de Ramírez, recogidos en Eguiguren, L. A., *Guerra separatista. Rebeliones de
     indios en Sur América. La sublevación de Tupac Amaru. Crónica de Melchor de Paz* (Lima, 1952)
     *(verificar)*.
   - Modernas: O'Phelan, *La independencia en los Andes* (2014); Fisher, John, «The Royalist Regime in
     the Viceroyalty of Peru, 1820–1824» y otros trabajos sobre 1814.
   - Wikipedia: <https://es.wikipedia.org/wiki/Rebeli%C3%B3n_del_Cuzco_de_1814> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Umachiri> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Matar%C3%A1>
5. **Propuesta jugable — «La Junta del Cusco»**
   - **Objetivo**: con el Cusco como base, el jugador lanza dos expediciones y debe asegurar Arequipa
     (La Apacheta) antes de que llegue la división de Ramírez desde el Alto Perú.
   - **Decisiones**: repartir fusiles escasos entre las columnas; elegir qué expedición reforzar (Puno,
     Huamanga o Arequipa); qué hacer con los prisioneros realistas de Arequipa (la historia: ejecución).
   - **Rival**: Ramírez, con poca tropa veterana, artillería y caballería.
   - **Mapa**: `andes` con el altiplano de Puno (río Lalli y el llano de Umachiri) y el Cusco al norte.
   - **Final**: victoria táctica posible en La Apacheta. Umachiri es la «última resistencia»: se gana si
     se resiste X minutos o se salva a los líderes. El epílogo cuenta las ejecuciones y que Melgar
     murió fusilado.
6. **Facciones o unidades que faltan**: «rebeldes cusqueños». Se puede reutilizar a los rebeldes de la
   campaña de Túpac Amaru con una paleta distinta. Unidades: honderos y lanceros indígenas, fusileros
   del Cusco y artillería ligera rústica. Realistas sin cambios (veteranos del Alto Perú).
7. **Riesgos**: bajos. Hay que evitar presentar a la masa indígena como carne de cañón sin voz y no
   simplificar a Pumacahua (ni traidor de 1780 ni héroe sin aristas). Bolivia aparece de forma tangencial
   (expedición a La Paz).

---

## Hito 2 — La Expedición Libertadora: Paracas, Pisco y la primera campaña de Arenales hasta Cerro de Pasco (1820)

1. **Fecha y lugar**
   - La expedición zarpó de Valparaíso el **20 ago 1820** y desembarcó en **Paracas**, cerca de Pisco,
     el **8 set 1820**.
   - La división de **Arenales** salió de Pisco hacia la sierra en octubre de 1820: pasó por Ica,
     Huamanga, Huancayo, Jauja y Tarma.
   - La **batalla de Cerro de Pasco** fue el **6 dic 1820**.
2. **Bandos y comandantes**
   - **Patriotas**: **José de San Martín**; la escuadra de **Thomas Cochrane**; **Juan Antonio Álvarez
     de Arenales**.
   - **Realistas**: el virrey **Pezuela**; el brigadier **Diego O'Reilly**, capturado en Pasco; el
     coronel **Andrés de Santa Cruz**, capturado en Pasco, que luego se pasó al bando patriota.
3. **Qué se sabe**
   - **Documentado**:
     - La expedición reunió **4118 soldados y 296 oficiales**: según el artículo, la cifra de Espejo es
       la más aceptada, aunque otros autores dan más. Hubo **25 naves** (8 de guerra y 17 transportes).
     - En Cerro de Pasco, Arenales tenía **740 infantes, 120 jinetes y 4 cañones**; O'Reilly, **900
       infantes, 160 jinetes y 2 cañones** (infobox del artículo).
     - Bajas realistas en Pasco: 58 muertos, 15 heridos y 343 prisioneros según Mitre; 62, 23 y 422
       según Roca. Bajas patriotas: 4 muertos y 12 heridos (Paz Soldán, Barros Arana).
   - **Interpretación**: Pasco permitió a Arenales reunirse con San Martín en la costa (Huaura). Además,
     la campaña de la sierra **encendió las montoneras** (ver Hito 4).
   - **Debatido**: los efectivos realistas en Pasco, que según algunos autores el gobierno virreinal
     subestimó para explicar la derrota, y el número exacto de la expedición.
4. **Fuentes**
   - Primarias: Miller, *Memoirs*; Paz Soldán, *Historia del Perú independiente, primer período*; el
     diario de Arenales, publicado por su hijo José Arenales: *Memoria histórica sobre las operaciones e
     incidencias de la división libertadora… en su primera campaña a la sierra del Perú en 1820*
     (Buenos Aires, 1832) *(verificar edición)*; García Camba.
   - Modernas: Anna (1979); Basadre; De la Puente Candamo, José Agustín, *La independencia del Perú*
     (Mapfre, 1992).
   - Wikipedia: <https://es.wikipedia.org/wiki/Expedici%C3%B3n_Libertadora_del_Per%C3%BA> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Cerro_de_Pasco>
5. **Propuesta jugable — «De Pisco a Pasco»**
   - **Fase 1**: desembarco en una playa de Paracas con una cabeza de playa limitada. Hay que fundar un
     campamento y reclutar voluntarios locales.
   - **Fase 2**: la columna de Arenales sube a la sierra. Cada pueblo «liberado» (Ica, Huamanga, Jauja)
     da guerrilleros, oro y comida.
   - **Final**: batalla en la pampa de Pasco (nieve y frío) contra O'Reilly. Se gana capturando al jefe
     realista o destruyendo su campamento.
   - **Decisiones**: ¿cuánta tropa dejar en cada pueblo? La historia muestra que las guarniciones
     dispersas eran vulnerables.
   - **Mapa**: mapa doble o grande, con `costa` (Paracas y Pisco) y `andes` (Pasco).
6. **Facciones o unidades que faltan**: patriotas con «Ejército de los Andes» (granaderos a caballo,
   cazadores) y la «escuadra» como decorado. Personaje Arenales. La escuadra no necesita simulación naval
   (el juego no la tiene): basta un barco decorativo o el desembarco por guion.
7. **Riesgos**: es un ejército **chileno-argentino**; conviene nombrarlo «Ejército Libertador» y dar
   crédito a los aportes de Chile y del Río de la Plata sin chovinismo. Riesgo bajo.

---

## Hito 3 — Lima y el Callao, 1821: proclamación y primer sitio del Callao

1. **Fecha y lugar**
   - Cochrane captura la fragata **Esmeralda** en el Callao el **5 nov 1820**.
   - El virrey **La Serna** evacua Lima en **julio de 1821**. San Martín entra en la ciudad y proclama la
     independencia el **28 jul 1821**.
   - El **primer sitio del Callao** va del **13 jul** al **19 set 1821**.
2. **Bandos y comandantes**
   - **Patriotas**: San Martín; **Cochrane** y **Bouchard** (bloqueo naval); **Las Heras** (asalto del 14
     de agosto); Miller.
   - **Realistas**: **José de La Mar** (gobernador de las fortalezas, que luego se pasó al bando
     patriota); **José de Canterac** (expedición de socorro desde la sierra, que llegó el 8 de
     septiembre y luego se retiró).
3. **Qué se sabe**
   - **Documentado**:
     - Patriotas: unos **7000 hombres y 8 buques**. Realistas en el Callao: unos **2000 soldados y
       milicianos y 3 buques** (Wikipedia, con Barros Arana, Paz Soldán y García Camba).
     - En la capitulación, unos 600 soldados regulares pudieron ir a Arequipa y unos 1000 milicianos
       volvieron a sus casas.
     - Canterac pasó junto al Callao sin dar batalla.
   - **Interpretación**: la pinza entre las montoneras alrededor de Lima y el bloqueo de Cochrane causó
     la escasez que, junto con el motín de Aznapuquio (enero de 1821, que depuso a Pezuela), llevó a la
     evacuación de Lima.
   - **Debatido**:
     - La pasividad de San Martín ante Canterac (prudencia o error), muy discutida desde entonces.
     - La «independencia concedida» (Bonilla y Spalding, 1972) frente a la «conseguida»: hay que
       mostrar que el debate existe, no resolverlo.
     - La captura de la Esmeralda: Cochrane la narra en sus propias memorias, con cifras que algunos
       autores consideran infladas.
4. **Fuentes**
   - Primarias: Cochrane, Thomas, *Narrative of Services in the Liberation of Chili, Peru and Brazil*
     (Londres, 1859) *(sin URL verificada)*; García Camba; Miller; *Gaceta del Gobierno de Lima
     Independiente* (CDIP).
   - Modernas: Anna (1979); Basadre; O'Phelan (2014).
   - Wikipedia: <https://es.wikipedia.org/wiki/Primer_sitio_del_Callao> ·
     <https://es.wikipedia.org/wiki/Captura_de_la_fragata_Esmeralda> ·
     <https://es.wikipedia.org/wiki/Independencia_del_Per%C3%BA>
5. **Propuesta jugable — «El cerco de Lima»**
   - **Objetivo**: rendir el Real Felipe por hambre. Se cortan los caminos de abastecimiento con
     montoneras, se mantiene el cerco y se resiste la incursión de socorro de Canterac (oleada grande a
     mitad de la misión).
   - **Decisiones**: dar batalla a Canterac o dejarlo pasar (la historia: dejarlo pasar). Si se lo deja
     pasar, la guarnición capitula antes; si se le da batalla, hay riesgo de perder el ejército.
   - **Final**: la capitulación de La Mar. La proclamación del 28 de julio es una cinemática o un hito
     intermedio (llegar con San Martín a la Plaza Mayor). **No** se convierte en batalla porque no lo fue.
   - **Mapa**: `costa` con Lima, el Callao (fortaleza grande) y los valles de Lurín y Carabayllo.
6. **Facciones o unidades que faltan**: el **Real Felipe** como edificio de asedio (sirve también para
   el Hito 7); las montoneras como unidad patriota barata y rápida.
7. **Riesgos**: muy bajos. Es la oportunidad de enseñar que la independencia no fue una sola batalla.

---

## Hito 4 — Las montoneras y guerrillas patriotas (1820–1824), hito transversal

1. **Fecha y lugar**: de 1820 a 1824, en la sierra central y sur: Huarochirí, Canta, la pampa de Junín,
   La Oroya, Cangallo y los Morochucos de Ayacucho, Ica.
2. **Comandantes atestiguados**: **Ignacio Ninavilca** (cacique de Huarochirí), **Cayetano Quirós** (Ica;
   Miller lo llama el más audaz), **Francisco Vidal** (La Oroya), **Basilio Auqui** (Morochucos),
   **José Félix Aldao**, **Isidoro Villar**, **Francisco de Paula Otero** y **José María Palomo**. En el
   bando realista, **José Carratalá** (represión en Cangallo, 17 dic 1821) y **Ricafort** (saqueo de
   Huancayo).
3. **Qué se sabe**
   - **Documentado**:
     - San Martín ordenó encuadrarlas en «partidas» y «guerrillas» bajo el mando del ejército.
     - Hicieron espionaje, cortaron abastos, cercaron Lima e intervinieron en Junín. En la
       infobox de Wikipedia figuran unos **1500 montoneros** para la campaña de Junín.
     - Cangallo fue arrasada por Carratalá (dic 1821).
   - **Interpretación**: tenían agenda social propia, además de la patriótica (Dunbar Temple; Huerto
     Vizcarra).
   - **Debatido**: su autonomía frente al mando criollo y la frontera entre guerrilla y bandolerismo.
     La documentación de la época las acusa de saqueos.
4. **Fuentes**: CDIP, t. V, *La acción patriótica del pueblo en la emancipación. Guerrillas y
   montoneras* (ed. Ella Dunbar Temple, 1971) *(verificar volumen)*; Miller, *Memoirs*; Vergara Arias,
   Gustavo, *Montoneras y guerrillas en la etapa de la emancipación del Perú (1820–1825)* (1973)
   *(verificar)*.
   Wikipedia: <https://es.wikipedia.org/wiki/Montoneras_del_Per%C3%BA>
5. **Propuesta jugable**: es mejor como **mecánica transversal** que como misión propia. Unidad
   «montonera» (barata, rápida, buena en hostigamiento y emboscada, frágil en campo abierto) y edificio
   «partida» que revela el mapa y cobra peaje a las caravanas enemigas. Si se quiere una misión
   independiente, la mejor es **«Cangallo y los Morochucos» (1821–1822)**: sobrevivir a la columna de
   Carratalá y proteger la población.
6. **Facciones o unidades que faltan**: ya existen las **montoneras** en la caballería patriota, según
   `independencia.md`. Faltan honderos y lanceros indígenas y una mecánica de emboscada.
7. **Riesgos**: la violencia sobre civiles (Cangallo, Huancayo) debe narrarse con sobriedad, sin
   escenificarla.

---

## Hito 5 — Las campañas de Intermedios: Torata y Moquegua (1823)

1. **Fecha y lugar**: Torata (Moquegua), **19 ene 1823**; Moquegua, **21 ene 1823**. Primera campaña de
   Intermedios, con desembarco en Arica e Iquique a fines de 1822. La segunda campaña, de Santa Cruz y
   Gamarra, fue a mediados de 1823 y también fracasó.
2. **Bandos y comandantes**: patriotas al mando de **Rudecindo Alvarado**, con una incursión de caballería
   de **Miller**; realistas al mando de **Gerónimo Valdés**, reforzado en Torata por la caballería de
   **Canterac**.
3. **Qué se sabe**
   - **Documentado**:
     - La expedición reunió unos **4490 hombres**: unos 1700 argentinos, 1390 peruanos y 1200 chilenos,
       con reclutas peruanos que completaban los cuerpos.
     - Volvieron unos **1000 supervivientes**, que se reembarcaron en Ilo.
     - Valdés resistió atrincherado en Torata hasta que llegó Canterac.
   - **Consecuencia documentada**: el **motín de Balconcillo** (26 feb 1823) disolvió la Junta y llevó a
     **Riva-Agüero** a la presidencia, lo que abrió el camino a la llegada de Bolívar.
   - **Interpretación**: el artículo atribuye el fracaso a la lentitud de Alvarado; su parte culpa a la
     indisciplina de algunas unidades.
   - **Debatido**: las bajas exactas, que no tienen cifra consolidada.
4. **Fuentes**
   - Primarias: Miller; García Camba (t. 2); el parte de Alvarado (CDIP, «Asuntos militares»).
   - Modernas: Basadre; Roel, Virgilio, *Los libertadores* (2001); Mitre, *Historia de San Martín*.
   - Wikipedia: <https://es.wikipedia.org/wiki/Primera_campa%C3%B1a_de_Intermedios> ·
     <https://es.wikipedia.org/wiki/Segunda_campa%C3%B1a_de_Intermedios> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Torata> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Moquegua>
5. **Propuesta jugable — «Puertos intermedios»** (misión de **derrota histórica**)
   - **Objetivo**: desembarcar, tomar Moquegua y evitar que Valdés y Canterac se unan. Si se unen, el
     objetivo pasa a **reembarcar a X unidades en Ilo**.
   - **Decisión clave**: la velocidad. Un temporizador marca la llegada de Canterac. El jugador puede
     superar a Alvarado si actúa rápido, pero la «victoria» se mide por la tropa salvada.
   - **Mapa**: valle de Moquegua (costa desértica con un oasis serrano).
6. **Facciones o unidades que faltan**: ninguna nueva (patriotas y realistas).
7. **Riesgos**: bajos. Es útil para dar variedad (retirada y evacuación) y para explicar por qué hizo
   falta Bolívar. Es opcional si la campaña se queda corta de misiones.

---

## Hito 6 — Junín (6 ago 1824) y Ayacucho (9 dic 1824)

*Ya existe en el juego como una sola misión con dos fases. Se proponen como **dos misiones**.*

### 6a. Junín

1. **Fecha y lugar**: **6 ago 1824**, pampa de Junín (meseta de Bombón, unos 4100 m).
2. **Comandantes**: patriotas, **Bolívar**, **Mariano Necochea** (herido y capturado), **Miller**
   (asumió el mando), **Manuel Isidoro Suárez** (Húsares del Perú) y **José Andrés Rázuri**; realistas,
   **Canterac**.
3. **Qué se sabe**
   - **Documentado**:
     - Fue un combate solo de caballería, con arma blanca, de unos **45 minutos**.
     - Bajas patriotas: unas **145–148** entre muertos y heridos (parte oficial). Bajas realistas: unos
       **254** entre muertos y heridos y **80 prisioneros**.
     - Bolívar rebautizó a los Húsares del Perú como **Húsares de Junín**.
     - García Camba reconoce que la caballería realista perdió su prestigio.
     - Miller narra que el frío mató por la noche a muchos heridos de ambos bandos.
   - **Debatido**: la «orden equivocada» que Rázuri transmitió a Suárez es tradición muy repetida, con
     base en testimonios posteriores. Conviene presentarla como «según la tradición».
4. **Fuentes**: Miller; García Camba; Santa Cruz (parte oficial). Wikipedia:
   <https://es.wikipedia.org/wiki/Batalla_de_Jun%C3%ADn>
5. **Propuesta jugable — «La batalla silenciosa»**
   - **Restricción**: solo caballería y lanceros, sin armas de fuego.
   - **Objetivo**: alcanzar a Canterac antes de que se retire hacia Jauja.
   - **Mecánica**: la caballería patriota huye al principio. Un evento en el minuto X («los Húsares del
     Perú cargan por el flanco») habilita una carga decisiva si el jugador conserva el escuadrón de
     reserva oculto.
   - **Mapa**: pampa abierta, el lago Junín y cerros al este.

### 6b. Ayacucho

1. **Fecha y lugar**: **9 dic 1824**, pampa de la Quinua (unos 3400 m), al pie del Condorcunca.
2. **Comandantes**
   - **Patriotas**: **Sucre**, **Gamarra** (jefe de Estado Mayor), **La Mar** (izquierda), **José María
     Córdova** (derecha), **Jacinto Lara** (reserva) y **Miller** (caballería).
   - **Realistas**: el virrey **La Serna** (herido y capturado), **Canterac**, **Valdés**, **Monet**,
     **Villalobos** y **Ferraz**.
3. **Qué se sabe**
   - **Documentado**:
     - Patriotas: **5780** según el parte de Sucre; **6783** según los estados de fuerza.
     - Realistas: entre **6906 y 9310**, con 11–14 cañones.
     - Bajas patriotas: unos **370 muertos y 609 heridos**. Bajas realistas: unos **1800 muertos, 700
       heridos y 2000–3000 prisioneros** (cifras del artículo).
     - Fue seguida por la **Capitulación de Ayacucho**, firmada por Canterac.
   - **Interpretación**: los dos ejércitos estaban formados en su mayoría por americanos. Riva-Agüero lo
     llamó «un combate civil entre dos bandos»; García Camba y Valdés cifran en unos 500 los
     peninsulares realistas.
   - **Debatido**:
     - Las cifras, porque Sucre infló las realistas.
     - Por qué los realistas bajaron del Condorcunca.
     - El abrazo previo entre Monet y Córdova procede de una tradición de Ricardo Palma, sin
       confirmación.
4. **Fuentes**: Sucre, parte de la batalla (CDIP); García Camba; Miller; Anna (1979).
   Wikipedia: <https://es.wikipedia.org/wiki/Batalla_de_Ayacucho> ·
   <https://es.wikipedia.org/wiki/Capitulaci%C3%B3n_de_Ayacucho>
5. **Propuesta jugable — «La Quinua»**
   - El jugador defiende la pampa mientras los realistas descienden en tres columnas.
   - **Decisiones**: cuándo lanzar la división de Córdova, el contraataque histórico; dónde emplear la
     reserva de Lara.
   - **Final**: capturar al virrey herido (objetivo de bonificación) y llegar a la capitulación.
6. **Facciones o unidades que faltan**: Colombia (el ejército grancolombiano de Bolívar y Sucre) aparece
   hoy integrado en «patriotas»; basta añadir variantes visuales (Rifles, Vargas, Voltígeros). Unidad
   **Húsares de Junín** como unidad única.
7. **Riesgos**: el reparto de méritos entre Perú y la Gran Colombia es un tema sensible en
   la historiografía. Conviene un tono neutro de «Ejército Unido Libertador».

---

## Hito 7 — El segundo sitio del Callao: Rodil en el Real Felipe (1824–1826)

1. **Fecha y lugar**: el Callao, desde febrero de 1824 (sublevación de la guarnición patriota que
   entregó la plaza; según otras fuentes, el sitio formal se declaró el 5 dic 1824) hasta la entrega del
   **23 ene 1826** (capitulación del 22 de enero).
2. **Bandos y comandantes**: realistas, el brigadier **José Ramón Rodil**, con el coronel **Isidro
   Alaix**; patriotas, el general **Bartolomé Salom** (tierra), y **Manuel Blanco Encalada** y después
   **John Illingworth** (bloqueo naval).
3. **Qué se sabe**
   - **Documentado**:
     - Guarnición: entre **2000 y 4000** hombres; los informes españoles dan **3003**. Sitiadores:
       unos **3000**, que llegaron a **4700**.
     - Se refugiaron más de **8000** civiles, de los que murieron unos **6000**, sobre todo por
       escorbuto. Entre ellos estaba el expresidente **Torre Tagle** con su familia.
     - Rodil expulsó a civiles para ahorrar víveres y ambos bandos les dispararon en tierra de nadie.
     - Rodil salió con honores y conservó dos banderas.
     - Bolívar habría respondido a Salom «El heroísmo no es digno de castigo» (frase recogida en la
       literatura; tradición).
   - **Debatido**: las fechas de inicio y las cifras de bajas, que son internamente inconsistentes en
     las fuentes.
4. **Fuentes**: García Camba (t. 2); Paz Soldán, *Historia del Perú independiente 1822–1827*; Anna
   (1979). Hay estudios recientes sobre el «orden» dentro del Real Felipe (revistas de la UNMSM y la
   UPCH), sin URL verificada aquí.
   Wikipedia: <https://es.wikipedia.org/wiki/Segundo_sitio_del_Callao> ·
   <https://es.wikipedia.org/wiki/Sublevaci%C3%B3n_del_Callao>
5. **Propuesta jugable — «El último bastión»**. Se recomienda jugarla **desde el bando sitiador**.
   - **Objetivo**: estrechar el cerco (construir baterías y trincheras), mantener el bloqueo (destruir
     los botes de abastecimiento como decorado) y rechazar salidas.
   - **Decisiones**: dejar o no pasar a los civiles expulsados (gestión humanitaria: aceptarlos cuesta
     comida, rechazarlos alarga el asedio y baja la moral).
   - **Final**: la rendición se produce cuando los «víveres» del fuerte llegan a cero. Es una misión
     lenta y de economía.
   - **Alternativa**: jugar **como Rodil** («resiste N minutos»). Es interesante, pero el sufrimiento
     civil la hace delicada.
6. **Facciones o unidades que faltan**: el edificio **Real Felipe** (también en el Hito 3) y baterías de
   asedio.
7. **Riesgos**: las muertes civiles masivas. Hay que mencionarlas en el epílogo, sin mecánicas que
   «premien» la crueldad.

---

## Hito 8 — La Confederación Perú-Boliviana: Yanacocha (1835), Socabaya (1836) y Yungay (1839)

1. **Fecha y lugar**: **Yanacocha** (Cusco), **13 ago 1835**; **Uchumayo** (4 feb 1836) y **Socabaya**
   (Alto de la Luna, Arequipa), **7 feb 1836**; **Yungay** (Áncash), **20 ene 1839**.
2. **Bandos y comandantes**
   - **Ejército Unido o Confederado**: **Andrés de Santa Cruz**, **Otto Philipp Braun** (decisivo en
     Socabaya), **José Ballivián** (vencido en Uchumayo), **José Miguel de Velasco** y Miller (en
     Socabaya, cortando la retirada).
   - **Peruanos anticonfederados**: **Agustín Gamarra** (Yanacocha) y **Felipe Santiago Salaverry**
     (Socabaya; fusilado en Arequipa el 18 feb 1836).
   - **Ejército Restaurador** (1838–39): **Manuel Bulnes** (Chile), con **Ramón Castilla** y Gamarra
     entre los emigrados peruanos.
3. **Qué se sabe**
   - **Documentado**:
     - **Yanacocha**: Santa Cruz tenía unos **5000**; Gamarra, entre **2600 y 4000**, más
       **6000–8000 auxiliares indígenas** (Dellepiane, 1941; Basadre). Bajas: confederados 192
       muertos; peruanos 408 muertos y 915 prisioneros (Velasco, 1837).
     - **Socabaya**: confederados 2500 más 600 de reserva; Salaverry 1900 y 6 cañones.
     - **Yungay**: confederados entre **4052 y 6100**; restauradores entre **5267 y 5302** (unos 4300
       chilenos y entre 800 y 1000 peruanos). Basadre da los muertos restauradores (215 soldados y 14
       jefes y oficiales, según la cifra oficial). La Confederación se disolvió.
   - **Interpretación**: fue a la vez una **guerra civil peruana** y una **guerra internacional**, con
     Chile y la Argentina de Rosas contra Santa Cruz.
   - **Debatido**: Santa Cruz, como unificador andino o como invasor, y la legitimidad de la
     Restauración apoyada por Chile. La historiografía peruana, la boliviana y la chilena difieren.
4. **Fuentes**: Basadre, t. 1–2; Sotomayor Valdés, Ramón, *Historia de Chile bajo el gobierno del
   general D. Joaquín Prieto* (visión chilena); Santa Cruz, Andrés, *Manifiesto* y correspondencia
   *(sin URL)*; Mendiburu.
   Wikipedia: <https://es.wikipedia.org/wiki/Confederaci%C3%B3n_Per%C3%BA-Boliviana> ·
   <https://es.wikipedia.org/wiki/Guerra_contra_la_Confederaci%C3%B3n_Per%C3%BA-Boliviana> ·
   <https://es.wikipedia.org/wiki/Batalla_de_Yanacocha> ·
   <https://es.wikipedia.org/wiki/Batalla_de_Uchumayo> ·
   <https://es.wikipedia.org/wiki/Batalla_de_Socabaya> ·
   <https://es.wikipedia.org/wiki/Batalla_de_Yungay>
5. **Propuesta jugable — «Socabaya»**, la mejor de las tres
   - **Escenario**: el jugador es **Salaverry**. Vence en Uchumayo (primer objetivo) y luego debe cruzar
     el río y aguantar en Socabaya.
   - **Final**: derrota histórica, con la opción de un «final alternativo» etiquetado como tal.
   - **Otra opción**: Yungay, con Castilla en el cerro Pan de Azúcar. Pero implica jugar a favor de un
     ejército mayoritariamente chileno contra peruanos y bolivianos, y es tonalmente complejo.
   - **Recomendación**: si entra en la campaña, que sea **una** misión sobre la Confederación, contada
     como guerra civil, con el jugador del lado peruano en Socabaya o con Santa Cruz en Yanacocha.
6. **Facciones o unidades que faltan**: el «Ejército Confederado» (peruanos y bolivianos) y
   restauradores peruanos. Se pueden derivar de «república» con estandartes distintos. No hace falta
   una facción boliviana completa.
7. **Riesgos**: **medio**. Hay sensibilidad boliviana (Santa Cruz es héroe nacional en Bolivia) y
   chilena (Yungay es efeméride militar en Chile). Hay que evitar presentar a Bolivia o a Chile como
   «enemigo» simple.

---

## Hito 9 — El combate del Dos de Mayo, Callao (1866)

1. **Fecha y lugar**: **2 may 1866**, en el puerto del Callao, durante la guerra hispano-sudamericana.
   Perú estaba aliado con Chile, Ecuador y Bolivia.
2. **Bandos y comandantes**: España, el almirante **Casto Méndez Núñez**, herido. Perú, el jefe supremo
   **Mariano Ignacio Prado**, el ministro de Guerra **José Gálvez**, muerto en la explosión de la
   **Torre de la Merced**, y **Lizardo Montero** (unidades navales).
3. **Qué se sabe**
   - **Documentado**:
     - La escuadra española la formaban la fragata blindada *Numancia*, las fragatas *Blanca*,
       *Resolución*, *Berenguela*, *Villa de Madrid* y *Almansa* y la corbeta *Vencedora*.
     - Peruanos: la Torre de la Merced, la Torre Junín, el Fuerte Santa Rosa, el Fuerte Ayacucho y
       otras baterías, más los monitores *Loa* y *Victoria*.
     - España tenía entre **245 y 252 cañones**; Perú unos **69**.
     - Bajas españolas oficiales: **43 muertos y 83 heridos**. Las peruanas son inciertas: la mayoría
       de las relaciones dan entre **180 y 350**.
   - **Debatido**: el resultado. **Ambos bandos se atribuyen la victoria**: España porque no perdió
     buques, Perú porque la escuadra se retiró.
4. **Fuentes**
   - Primarias: el parte de Méndez Núñez y los partes peruanos, en la prensa de la época y en el *Diario
     de Sesiones*.
   - Modernas: Basadre, t. 4–5; Novak, Fabián, *Las relaciones entre el Perú y España (1821–2000)*
     (PUCP, 2001) *(verificar)*.
   - Wikipedia: <https://es.wikipedia.org/wiki/Combate_del_Callao> ·
     <https://es.wikipedia.org/wiki/Guerra_hispano-sudamericana> ·
     <https://es.wikipedia.org/wiki/Combate_de_Abtao>
5. **Propuesta jugable — «Las baterías del Callao»**
   - **Escenario**: defensa costera **sin simulación naval**. Los buques españoles son «estructuras
     móviles» que siguen rutas fijas en el mar y bombardean. El jugador construye y repara baterías,
     reparte la pólvora y evacúa la población.
   - **Evento histórico**: estalla la Torre de la Merced (el jugador pierde una batería y un
     «comandante»).
   - **Final**: se resiste hasta la retirada de la escuadra (unas 5 horas reales, que se comprimen en el
     juego). Final «indeciso» y sin humillar a España.
6. **Facciones o unidades que faltan**: «Escuadra del Pacífico» (España, 1866). Se puede reutilizar el
   arte realista con uniformes de mitad de siglo, o hacer que sean solo barcos-enemigo. Para el Perú:
   baterías costeras (cañones Armstrong y Blakely).
7. **Riesgos**: bajos. El conflicto lleva siglo y medio cerrado (tratado de paz de 1879) y la relación
   actual es buena. Hay que reconocer el resultado disputado.

---

## Hito 10 — La campaña naval de 1879: Iquique y Punta Gruesa (21 may) y Angamos (8 oct)

1. **Fecha y lugar**: rada de Iquique y Punta Gruesa, **21 may 1879**; Punta Angamos (Mejillones),
   **8 oct 1879**.
2. **Comandantes**
   - **Perú**: **Miguel Grau** (monitor *Huáscar*) y **Juan Guillermo More** (fragata *Independencia*).
   - **Chile**: **Arturo Prat** (corbeta *Esmeralda*, muerto al abordar el *Huáscar*), **Carlos Condell**
     (goleta *Covadonga*), **Galvarino Riveros** y **Juan José Latorre** (Angamos).
3. **Qué se sabe**
   - **Documentado**:
     - El *Huáscar* hundió a la *Esmeralda* a espolonazos. En Punta Gruesa, la *Independencia* encalló
       persiguiendo a la *Covadonga* y se perdió: 5 muertos, 23 heridos y 64 desaparecidos peruanos;
       3 muertos y 5 heridos chilenos.
     - En Angamos murió Grau y Chile capturó el *Huáscar*.
     - Grau recogió náufragos chilenos en Iquique y escribió a la viuda de Prat: la carta se conserva y
       se publica.
   - **Interpretación**: la pérdida de la *Independencia* decidió el dominio del mar.
4. **Fuentes**: los partes de Grau y Condell; Markham (1882); Sater (2007).
   Marina de Guerra del Perú, página citada en `guerra_del_pacifico.md`
   (<https://marina.mil.pe/info/combate-de-angamos/>): el servidor devolvió 406 a la petición
   automática, así que conviene verificarla en un navegador.
   Wikipedia: <https://es.wikipedia.org/wiki/Combate_naval_de_Iquique> ·
   <https://es.wikipedia.org/wiki/Combate_de_Punta_Gruesa> ·
   <https://es.wikipedia.org/wiki/Combate_naval_de_Angamos>
5. **Propuesta jugable**: **no recomendada como misión RTS**, porque el motor no simula barcos
   (`guerra_del_pacifico.md` ya lo dice). Se recomienda como **interludio narrativo** entre misiones: un
   mapa con la ruta del *Huáscar* y las cartas de Grau. Si algún día hay unidades navales, una misión
   «correrías del Huáscar» (hostigar transportes y escapar de los blindados) encajaría con la economía
   de un RTS.
6. **Facciones o unidades que faltan**: unidades navales (no existen).
7. **Riesgos**: medio. Prat y Grau son héroes nacionales en sus respectivos países. El gesto de
   caballerosidad de Grau es el tono correcto.

---

## Hito 11 — La batalla de Tarapacá (27 nov 1879)

1. **Fecha y lugar**: **27 nov 1879**, en la quebrada de San Lorenzo de Tarapacá.
2. **Comandantes**
   - **Perú**: el general **Juan Buendía**, con **Belisario Suárez** (Estado Mayor) y los coroneles
     **Andrés A. Cáceres**, **Francisco Bolognesi**, **José Miguel Ríos** (herido de muerte), Bedoya y
     Dávila. Con ellos combatió la columna boliviana **Loa**.
   - **Chile**: el coronel **Luis Arteaga**, **José Francisco Vergara** y el teniente coronel
     **Eleuterio Ramírez** (muerto).
3. **Qué se sabe**
   - **Documentado**:
     - Perú tenía unos **4486** hombres (3046 en Tarapacá y 1440 en Pachica), sin caballería ni
       artillería; Chile, unos **2281**, con 4 cañones Krupp y 2 obuses.
     - Fue una victoria táctica peruana: Perú capturó cañones, pero luego se retiró a Arica y la
       provincia se perdió.
     - En el Perú se conmemora como Día de la Infantería.
   - **Debatido**: las bajas. Las cifras del artículo son contradictorias entre la infobox y el texto
     (Basadre, Encina, Bulnes). También se discuten los abusos contra heridos denunciados por el bando
     peruano.
4. **Fuentes**: Cáceres, *Memorias*; Markham (1882); Sater (2007); Basadre.
   Wikipedia: <https://es.wikipedia.org/wiki/Batalla_de_Tarapac%C3%A1>
5. **Propuesta jugable — «La quebrada»**
   - **Escenario**: el jugador defiende el pueblo de Tarapacá, en el fondo de la quebrada, y debe
     reconquistar las alturas tomadas por tres columnas chilenas que llegan de forma escalonada.
   - **Recursos**: sin caballería ni artillería al principio. Se capturan cañones como premio.
   - **Final**: victoria táctica. El epílogo cuenta la retirada de 200 km por el desierto hacia Arica.
     Engancha de forma natural con la **misión de Arica** existente.
6. **Facciones o unidades que faltan**: «república» y «chile» ya existen. Se puede añadir el batallón
   boliviano (Loa) como unidad aliada y el personaje Cáceres (reaparece en la Breña).
7. **Riesgos**: medio-bajo, con tono militar y sin exaltar los abusos.

---

## Hito 12 — La defensa de Arica (7 jun 1880), misión existente

1. **Fecha y lugar**: **7 jun 1880**, el Morro de Arica.
2. **Comandantes**: Perú, **Francisco Bolognesi**, **Juan Guillermo More** (baterías del Morro, muerto
   en la batalla) y **Alfonso Ugarte**; Chile, **Pedro Lagos**, con un plan atribuido a **Manuel
   Baquedano**.
3. **Qué se sabe**
   - **Documentado**:
     - Perú tenía unos **1858** hombres y el monitor *Manco Cápac* (Sater, 2007); Chile, entre **5300 y
       6500** (Ekdahl; Dellepiane).
     - Bajas peruanas: entre **700 y 900** muertos y unos **1300** prisioneros. Bajas chilenas: unos
       **120** muertos y 354 heridos.
     - Bolognesi respondió al parlamentario **Juan de la Cruz Salvo** el 5 de junio, tras consultar a
       sus jefes. La frase «hasta quemar el último cartucho» la recoge **Vicuña Mackenna** (1881).
     - El ingeniero **Teodoro Elmore** minó los accesos.
   - **Debatido**: la muerte de Ugarte (el salto a caballo desde el Morro es tradición sin
     confirmación documental sólida) y el trato a los prisioneros.
4. **Fuentes**: Vicuña Mackenna, Benjamín, *Historia de la campaña de Tacna y Arica* (1881) *(sin URL
   verificada)*; Sater (2007).
   Wikipedia: <https://es.wikipedia.org/wiki/Batalla_de_Arica>
5. **Propuesta jugable**: se mantiene la misión actual. Se puede añadir una fase previa de preparación
   (minar los accesos con Elmore y fortificar los fuertes del Este y de la Ciudadela) y la decisión de la
   respuesta a Salvo (cinemática).
6. **Facciones o unidades que faltan**: el *Manco Cápac* como estructura-batería y el «zapador» de
   minas.
7. **Riesgos**: medio. Hay que sostener el tono de «defensa heroica» sin demonizar al asaltante y sin
   escenificar el despeñamiento como hecho probado.

---

## Hito 13 — La defensa de Lima: San Juan y Chorrillos (13 ene 1881) y Miraflores (15 ene 1881)

1. **Fecha y lugar**: San Juan y Chorrillos, **13 ene 1881**; Miraflores, **15 ene 1881**; ocupación de
   Lima, 17 ene 1881.
2. **Comandantes**
   - **Perú**: **Nicolás de Piérola**, con **Miguel Iglesias**, **Belisario Suárez**, **Justo Pastor
     Dávila** y **Andrés A. Cáceres** (cuerpo IV en San Juan; sector derecho en Miraflores).
   - **Chile**: **Manuel Baquedano**, con **Patricio Lynch**, **Emilio Sotomayor**, **Pedro Lagos** y
     **Arístides Martínez**.
3. **Qué se sabe**
   - **Documentado**:
     - En **San Juan**, Perú tenía entre **20 000 y 22 000** hombres (Encina); Chile, unos **23 129**
       (Márquez). Bajas chilenas: **797 muertos y 2522 heridos** (Wilson). Las peruanas, mucho mayores
       e inciertas.
     - Chorrillos y Barranco fueron saqueados e incendiados.
     - En **Miraflores** hubo una línea de **diez reductos** a lo largo de unos 12 km. Solo combatieron
       en serio el sector de Cáceres y el centro. Muchos soldados eran **reservistas** limeños.
     - Bajas chilenas oficiales en Miraflores: **502 muertos y 1622 heridos** (citado por Basadre).
   - **Debatido**: quién rompió el armisticio en Miraflores (cada bando culpa al otro) y la conducción
     de Piérola.
4. **Fuentes**: Cáceres, *Memorias*; Markham (1882); Sater (2007); Basadre.
   Wikipedia: <https://es.wikipedia.org/wiki/Batalla_de_San_Juan_y_Chorrillos> ·
   <https://es.wikipedia.org/wiki/Batalla_de_Miraflores>
5. **Propuesta jugable — «Los reductos»**: centrada en **Miraflores**.
   - **Escenario**: el jugador, como Cáceres, defiende los reductos 1 a 3 con reservistas (unidad débil
     pero numerosa).
   - **Final**: resistir y **organizar la retirada a la sierra**, para enganchar con la Breña.
   - **Por qué Miraflores**: San Juan es una derrota a gran escala difícil de hacer divertida.
6. **Facciones o unidades que faltan**: «reservistas» (milicia urbana), reductos como edificio y
   ametralladoras como estructura defensiva.
7. **Riesgos**: medio-alto. El saqueo de Chorrillos y la ocupación de Lima son heridas memoriales. Se
   narran con sobriedad en el epílogo, sin mostrarlos.

---

## Hito 14 — La Campaña de la Breña (1881–1883): Pucará, Marcavalle, Concepción y Huamachuco

1. **Fecha y lugar**: sierra central (valle del Mantaro, Junín) y norte (Huamachuco, La Libertad).
   - Pucará: **5 feb 1882**.
   - Ofensiva de julio de 1882: **Marcavalle y Pucará** el **9 jul**, **Concepción** el **9 y 10 jul** y
     San Juan Cruz el 16 jul.
   - **Huamachuco**: **10 jul 1883**.
   - Tratado de Ancón: 20 oct 1883.
2. **Comandantes**
   - **Perú**: **Andrés A. Cáceres**, con **Isaac Recavarren**, **Leoncio Prado** (fusilado tras
     Huamachuco), **Juan Gastó**, **Ambrosio Salazar** (guerrillero, en Concepción), **Máximo Tafur** y
     **Gregorio Albarracín**. Del otro lado de la política peruana está **Miguel Iglesias** (Grito de
     Montán, 31 ago 1882).
   - **Chile**: **Ambrosio Letelier** (1881), **Estanislao del Canto** (1882), **Ignacio Carrera Pinto**
     (muerto en Concepción), **Alejandro Gorostiaga** (Huamachuco) y **Patricio Lynch** (jefe de la
     ocupación).
3. **Qué se sabe**
   - **Documentado**:
     - La estrategia de Cáceres fue de guerrillas: emboscadas, **galgas** (piedras rodadas), ataques
       en tres columnas en julio de 1882 y apoyo campesino e indígena.
     - **Concepción**: murió toda la guarnición chilena, **77 soldados** de la 4.ª compañía del
       *Chacabuco* (Mellafe y González). Del lado peruano había unos 300 soldados y 1500 guerrilleros
       (según Ahumada). Del Canto incendió el pueblo y ejecutó a vecinos (correspondencia en *El Eco de
       Junín*).
     - **Huamachuco**: unos **1440–1880** peruanos frente a unos **1736** chilenos. Bajas peruanas:
       entre **800 y 900** muertos o ejecutados. Bajas chilenas: **68 muertos y 96 heridos** (cirujano
       Vargas Clark). Por orden de Lynch se fusiló a prisioneros y heridos, entre ellos Leoncio Prado.
   - **Interpretación**: Manrique sostiene que las guerrillas campesinas tuvieron agenda propia (contra
     hacendados colaboracionistas) y que fueron reprimidas después por el propio Cáceres (1884).
   - **Debatido**:
     - El grado de «nacionalismo» campesino. Manrique, Mallon y Bonilla discuten si el campesinado
       luchaba por la nación o por intereses locales.
     - La profanación de cadáveres en Concepción, que cada historiografía narra de forma distinta.
4. **Fuentes**
   - Primarias: Cáceres, *La guerra entre el Perú y Chile* (memorias, 1924) *(verificar edición)*; los
     partes de Del Canto y Gorostiaga; Ahumada Moreno, Pascual, *Guerra del Pacífico: recopilación
     completa de todos los documentos oficiales…* (Valparaíso, 1884–1891) *(sin URL verificada)*.
   - Modernas: Manrique, *Campesinado y nación* (1981/2022) y *Yawar Mayu* (1988):
     <https://books.openedition.org/ifea/1818>; Mallon, Florencia, *The Defense of Community in Peru's
     Central Highlands* (Princeton, 1983); Sater (2007); Pereyra Plasencia, Hugo, *Andrés A. Cáceres y
     la campaña de la Breña* *(verificar título)*.
   - Wikipedia: <https://es.wikipedia.org/wiki/Campa%C3%B1a_de_la_Bre%C3%B1a> ·
     <https://es.wikipedia.org/wiki/Combate_de_Pucar%C3%A1> ·
     <https://es.wikipedia.org/wiki/Combate_de_Marcavalle> ·
     <https://es.wikipedia.org/wiki/Combate_de_Concepci%C3%B3n> ·
     <https://es.wikipedia.org/wiki/Batalla_de_Huamachuco>
5. **Propuesta jugable — «El brujo de los Andes»**, la mejor candidata RTS de la República
   - **Fase 1, Marcavalle y Pucará**: con galgas y emboscadas en el valle del Mantaro, hostigar la
     retirada de Del Canto. El objetivo es infligir bajas sin perder a Cáceres.
   - **Decisiones**: la **red de comunidades**. Cada comunidad aliada da guerrilleros y alimentos, pero
     si Chile la ocupa hay represalias, así que hay que protegerla. También se decide si atacar o no
     Tarma (la historia: no).
   - **Fase 2, Huamachuco** (epílogo jugable o misión aparte): la última batalla campal. El jugador
     puede «ganar» el día, pero la munición se agota, como ocurrió. El objetivo realista es **salvar a
     Cáceres** (retirada a Ayacucho).
   - **Mapa**: `andes` con el valle del Mantaro, cerros con galgas y puentes.
   - **Concepción**: conviene **no** jugarla como misión de aniquilación de una guarnición. Si aparece,
     debe ser como evento de contexto.
6. **Facciones o unidades que faltan**: **guerrilla indígena o comuneros** (honderos, galgas como
   habilidad o trampa), «Ejército de la Breña» (tropa regular escasa) y caballería chilena
   (Cazadores). La facción «chile» ya existe.
7. **Riesgos**: **alto en violencia** (profanación de cadáveres, fusilamientos, incendio de pueblos por
   ambos bandos). Hay que narrar sin mostrar, dar voz al campesinado (no solo a Cáceres) y evitar el
   tono revanchista contra Chile.

---

## Hito 15 (siglo XX, evaluado) — Leticia y Güepí (1932–1933); Zarumilla (1941)

### Güepí, 26–28 mar 1933

- **Bandos**: Colombia, el coronel **Roberto D. Rico Díaz**; Perú, el capitán **José Víctor Tenorio**.
  Más de 1000 colombianos frente a 185 peruanos.
- **Resultado**: victoria colombiana. La guarnición fue devuelta tras el acuerdo de Ginebra (23 may
  1933). El conflicto se cerró con el Protocolo de Río de Janeiro de 1934.
- **Wikipedia**: <https://es.wikipedia.org/wiki/Combate_de_G%C3%BCep%C3%AD> ·
  <https://es.wikipedia.org/wiki/Guerra_colombo-peruana>
- **Juicio**: **no recomendado**. Es una derrota peruana menor; la ocupación de Leticia (1932) la iniciaron civiles y militares loretanos, el gobierno de
  Sánchez Cerro la respaldó después y el Perú terminó devolviendo Leticia en 1934. Es difícil de
  presentar sin tomar partido.

### Zarumilla, 23–31 jul 1941

- **Bandos**: Perú, **Eloy G. Ureta** y **Manuel Odría**. El teniente aviador **José Quiñones** murió en
  Quebrada Seca y es héroe nacional. Hubo un salto de paracaidistas en Puerto Bolívar (31 jul), señalado
  como el primero de una fuerza aerotransportada en América.
- **Resultado**: victoria peruana y ocupación de El Oro, seguida del Protocolo de Río de Janeiro (1942).
- **Debatido**: quién disparó primero (5 jul 1941), un hecho con versiones opuestas en cada país.
- **Wikipedia**: <https://es.wikipedia.org/wiki/Batalla_de_Zarumilla> ·
  <https://es.wikipedia.org/wiki/Guerra_peruano-ecuatoriana>
- **Juicio**: **jugable pero sensible**. Hubo conflictos posteriores (1981 y Cenepa en 1995) y la paz de
  Brasilia (1998) es reciente. Hay civiles ecuatorianos en zona ocupada y el tema está vivo en la
  memoria de ambos países. **Recomendación**: excluirlo de la campaña principal. Si se quiere un hito del
  siglo XX, un epílogo **no bélico** (por ejemplo, el cierre de la frontera con la paz de 1998) sería
  más seguro que una misión de combate.

---

## Facciones y unidades: resumen de lo que falta

| Necesidad | Hitos | Solución mínima |
|---|---|---|
| Rebeldes cusqueños 1814 (honderos, fusileros escasos) | 1 | Reutilizar los rebeldes de Túpac Amaru con otro estandarte |
| Montonera o guerrilla (patriota 1820–24 e indígena 1881–83) | 2–4, 14 | Unidad compartida «guerrilla» con habilidad de emboscada o galgas |
| Real Felipe y baterías costeras (edificios) | 3, 7, 9, 12 | Un set de fortificación costera reutilizable |
| Variantes grancolombianas y Húsares de Junín | 6 | Pieles y unidad única dentro de «patriotas» |
| Ejército Confederado o Restaurador (1835–39) | 8 | Derivar de «república» con dos estandartes; Chile con uniformes de 1838 |
| España 1866 (escuadra) | 9 | Barcos como estructuras móviles con ruta fija; sin infantería |
| Aliados bolivianos (Loa, Colorados) | 11, 12 | Unidad aliada opcional |
| Reservistas, reductos, ametralladoras | 13 | Milicia urbana y edificio reducto |
| Unidades navales | 10 | No se recomienda crearlas: interludio narrativo |

## Orden recomendado

### Opción A: una sola campaña de 10 misiones

1. **La Junta del Cusco**: La Apacheta y Umachiri (1814–1815).
2. **De Pisco a Pasco**: desembarco y campaña de Arenales (sep–dic 1820).
3. **El cerco de Lima**: montoneras, proclamación y primer sitio del Callao (jul–sep 1821).
4. **Junín** (6 ago 1824).
5. **Ayacucho** (9 dic 1824).
6. **El último bastión**: sitio del Real Felipe (1824–1826).
7. **Las baterías del Callao**: Dos de Mayo (1866).
8. **La quebrada**: Tarapacá (27 nov 1879). Antes va un interludio narrativo naval (Iquique y Angamos).
9. **La defensa de Arica** (7 jun 1880): misión existente, ampliada.
10. **El brujo de los Andes**: la Breña, con Marcavalle y Pucará y luego Huamachuco (1882–1883).

**Opcionales o reemplazos**:

- Intermedios (1823), entre las misiones 3 y 4, como misión de retirada.
- Socabaya o la Confederación (1836), entre las misiones 6 y 7.
- Miraflores (1881), entre las misiones 9 y 10.

### Opción B (recomendada): dividir en dos campañas

**Independencia (1814–1826)**, unas 6–7 misiones, con un arco cerrado que va de la rebelión andina al
último bastión:

1. Cusco, 1814.
2. Pisco y Pasco, 1820.
3. Lima y el Callao, 1821.
4. Intermedios, 1823 (opcional).
5. Junín.
6. Ayacucho.
7. El Real Felipe.

**República (1835–1883)**, unas 5–6 misiones:

1. Socabaya, 1836 (opcional).
2. Dos de Mayo, 1866.
3. Tarapacá, 1879.
4. Arica, 1880.
5. Miraflores, 1881.
6. La Breña, 1882–1883.

## Nota: ¿dividir la campaña?

**Sí, conviene dividirla.**

- **Tono y facciones**: la Independencia enfrenta a patriotas y realistas (dos facciones ya
  existentes, un enemigo coherente). La República cambia de enemigo en cada hito (Confederación, España,
  Chile). Mezcladas, el jugador salta de 1826 a 1866 y el arco narrativo se rompe.
- **Volumen**: la Independencia sola da para 6–7 misiones sólidas y documentadas. La República, para
  5–6.
- **Hilo narrativo**: la República puede apoyarse en un personaje transversal, **Cáceres** (Tarapacá,
  Miraflores y la Breña), y en el tema de la defensa del territorio y la nación. La Independencia lo
  tiene en el paso de los ejércitos libertadores al protagonismo peruano (montoneras y Húsares de
  Junín).
- **Encaje con el juego**: el periodo P7 (Independencia) y el P8 (República) ya están separados en los
  dossieres de facciones.
- **Si no se divide**: la misión del Dos de Mayo (1866) sirve de bisagra natural, porque enfrenta a
  España en un escenario republicano y enlaza los dos bloques.

## Nota: ¿dónde va Pumacahua?

**Recomendación: como misión inicial de la campaña de la Independencia, no al final del Virreinato.**

- **Cronología y contexto**: 1814–15 pertenece al ciclo de las juntas, de la Constitución de Cádiz y de
  las guerras del Alto Perú, que es el mismo proceso que desemboca en 1820–24. La historiografía actual
  (O'Phelan, *La independencia en los Andes*) lo trata como parte de la independencia, no como coda del
  ciclo de 1780.
- **Narrativa**: abre la campaña con una derrota andina y peruana («la independencia que no llegó desde
  el Cusco»). Eso da sentido a la llegada de ejércitos externos en 1820 y al debate sobre la
  «independencia concedida».
- **Puente con Túpac Amaru**: Pumacahua combatió **contra** Túpac Amaru en 1780 y encabezó la rebelión
  de 1814. Esa ironía es un gran gancho para la primera escena de la nueva campaña, y la campaña
  virreinal (Túpac Amaru) puede terminar con un epílogo que lo anuncie.
- **Matiz**: si la campaña de la Independencia ya resulta larga, Pumacahua puede ser una misión prólogo
  corta (solo La Apacheta y Umachiri). En cualquier caso, debe ir **antes** del desembarco de 1820.

## Riesgos transversales y tono

- **Chile**: es el enemigo de cuatro misiones de la República. Hay que mostrar heroísmo peruano sin
  deshumanizar al adversario. Ejemplos a seguir: el gesto de Grau con Prat y la frase atribuida a
  Bolívar sobre Rodil. Los epílogos deben mencionar abusos de ambos lados cuando están documentados
  (Concepción, Huamachuco, Chorrillos).
- **Bolivia**: aliada en 1879 y protagonista de la Confederación. Santa Cruz no debe ser el «villano».
- **Colombia, Ecuador y Venezuela (Gran Colombia)**: hay que dar crédito justo en Junín y Ayacucho. Los
  conflictos del siglo XX quedan fuera.
- **España**: realistas en su mayoría americanos (Ayacucho fue en buena parte un enfrentamiento entre
  americanos). El Dos de Mayo tiene un resultado disputado.
- **Población indígena y campesina**: no presentarla como masa anónima. Nombrar a los líderes
  documentados (Ninavilca, Auqui, Salazar…) y reconocer que sus agendas eran propias (Manrique,
  Mallon, Dunbar Temple).
- **Violencia contra civiles** (Cangallo, Huancayo, el Real Felipe, Chorrillos, Concepción): siempre
  en el epílogo o en un texto sobrio, nunca como mecánica premiada.
- **Tradiciones no confirmadas** (la orden de Rázuri, el abrazo de Monet y Córdova, el salto de Ugarte):
  presentarlas como «según la tradición».
