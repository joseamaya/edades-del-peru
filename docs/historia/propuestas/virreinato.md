# Investigación — rediseño de la campaña «El Virreinato» (1532–1815)

> **Estado: propuesta de investigación.** Sustenta el rediseño de campañas de [`docs/design/campaign-redesign.md`](../../design/campaign-redesign.md). No describe misiones implementadas: cada misión necesita su dossier en [`campanas/`](../campanas/) antes de entrar al juego. Fuentes consultadas en noviembre de 2026.

Documento de trabajo para *Edades del Perú*. Sigue el formato de `docs/historia/campanas/*.md` y amplía cada
hito con la separación **documentado / interpretación / debatido**, fuentes, una propuesta jugable, las
facciones que faltan y los riesgos.

## Notas de método

- **URLs**: todas las que aparecen se comprobaron el 2026-11-12 con una petición HTTP que devolvió 200, y su
  título o resumen corresponde al tema. Sobre todo son artículos de Wikipedia (es/en), que sirven de entrada y
  llevan bibliografía, pero **no sustituyen** a la fuente primaria. Cuando no encontré una URL estable para un
  libro, lo cito sin enlace. **No hay citas textuales inventadas**: las crónicas se citan por obra, no por
  página.
- **Wikipedia con trampas detectadas**: `en.wikipedia.org/wiki/Siege_of_La_Paz` trata de **1847 (México)**, no
  de 1781. `es.wikipedia.org/wiki/Bloqueo_del_Callao` trata de **1880 (guerra del Pacífico)**, no de 1624. No
  usar ninguna de las dos.
- **Cifras**: las de tropas, víctimas y mitayos varían mucho entre fuentes. Cuando aparece una, va marcada
  como aproximada y conviene no ponerla en la interfaz como dato duro.
- **Fronteras**: el Alto Perú (Potosí, La Paz) perteneció al Virreinato del Perú hasta **1776**, cuando pasó al
  del Río de la Plata. El cerco de La Paz (1781) ocurre, por tanto, *fuera* del Virreinato del Perú de su
  momento, aunque dentro del mundo andino virreinal y del ciclo de la Gran Rebelión.

### Fuentes primarias de uso transversal (con ficha de autor verificada)

| Autor / obra | Cubre | Ficha |
|---|---|---|
| Pedro Cieza de León, *Crónica del Perú* (partes I–IV; la IV, *Guerras civiles del Perú*: Salinas, Chupas, Quito) | conquista y guerras civiles hasta c. 1547 | [es.wikipedia](https://es.wikipedia.org/wiki/Pedro_Cieza_de_Le%C3%B3n) |
| Agustín de Zárate, *Historia del descubrimiento y conquista del Perú* (1555) | conquista hasta La Gasca | [es.wikipedia](https://es.wikipedia.org/wiki/Agust%C3%ADn_de_Z%C3%A1rate) |
| Pedro Gutiérrez de Santa Clara, *Quinquenarios* o *Historia de las guerras civiles del Perú* | 1544–1548 (Gonzalo Pizarro) | [es.wikipedia](https://es.wikipedia.org/wiki/Pedro_Guti%C3%A9rrez_de_Santa_Clara) |
| Diego Fernández «el Palentino», *Primera y segunda parte de la Historia del Perú* (1571) | Gonzalo Pizarro y **Hernández Girón** | [es.wikipedia](https://es.wikipedia.org/wiki/Diego_Fern%C3%A1ndez_de_Palencia) |
| Pedro Pizarro, *Relación del descubrimiento y conquista de los reinos del Perú* (1571) | Cajamarca, cerco del Cusco, Ollantaytambo (testigo) | [es.wikipedia](https://es.wikipedia.org/wiki/Pedro_Pizarro) |
| Diego de Trujillo, *Relación del descubrimiento del reino del Perú* (1571) | Cajamarca (testigo) | [es.wikipedia](https://es.wikipedia.org/wiki/Diego_de_Trujillo) |
| Juan de Betanzos, *Suma y narración de los incas* (1551) | visión cusqueña panaca de Atahualpa | [es.wikipedia](https://es.wikipedia.org/wiki/Juan_de_Betanzos) |
| Titu Cusi Yupanqui, *Instrucción al licenciado Lope García de Castro* (1570) | Manco Inca y Vilcabamba, desde dentro | [es.wikipedia](https://es.wikipedia.org/wiki/Titu_Cusi_Yupanqui) · [repositorio PUCP (edición)](https://repositorio.pucp.edu.pe/index/handle/123456789/181709) |
| Inca Garcilaso de la Vega, *Historia general del Perú* (1617) | guerras civiles (su padre desertó en Jaquijahuana), Vilcabamba; obra tardía y apologética | — |

### Modernas de uso transversal

- John Hemming, *The Conquest of the Incas* (1970); en español, *La conquista de los incas* (FCE). Es la
  síntesis de referencia para 1532–1572.
- James Lockhart, *The Men of Cajamarca* (1972) y *Spanish Peru, 1532–1560* (1968), sobre la hueste y sus
  redes.
- José Antonio del Busto Duthurburu, biografías de Pizarro y *Diccionario histórico-biográfico de los
  conquistadores del Perú*.
- Kim MacQuarrie, *The Last Days of the Incas* (2007): divulgación sólida sobre Manco y Vilcabamba.
- Steve J. Stern, *Peru's Indian Peoples and the Challenge of Spanish Conquest: Huamanga to 1640* (1982).
- Scarlett O'Phelan Godoy, *Un siglo de rebeliones anticoloniales: Perú y Bolivia 1700–1783* (1988).
- Charles F. Walker, *The Tupac Amaru Rebellion* (2014) y *Shaky Colonialism* (2008,
  [Duke UP](https://www.dukeupress.edu/shaky-colonialism)).
- Sinclair Thomson, *We Alone Will Rule: Native Andean Politics in the Age of Insurgency* (2002).
- Sergio Serulnikov, *Subverting Colonial Authority* (2003) y *Revolución en los Andes* (2010).
- Stefano Varese, *La sal de los cerros* (1968), sobre los asháninka y Juan Santos.
- Ana María Lorandi, *Ni ley, ni rey, ni hombre virtuoso* (2002), sobre la crisis del Perú del siglo XVI y
  las guerras civiles.
- Peter Bakewell, *Miners of the Red Mountain* (1984), sobre la mita de Potosí.
- Guillermo Lohmann Villena, *Las minas de Huancavelica en los siglos XVI y XVII* (1949) y *Las defensas
  militares de Lima y Callao* (1964).
- Karen Spalding, *Huarochirí: An Andean Society under Inca and Spanish Rule* (1984).

---

## 1. El Cerco de Lima (10–26 de agosto de 1536) y la fundación de la Ciudad de los Reyes (1535)

1. **Fecha y lugar**: fundación de Lima el **18 de enero de 1535**; cerco del **10 al 26 de agosto de 1536**,
   en el valle del Rímac.
2. **Bandos y personajes**:
   - **Inca**: el ejército de **Manco Inca**, al mando de su general **Quizu (Quizo) Yupanqui**.
   - **Hispano-indígena**: **Francisco Pizarro**, con aliados andinos. Las fuentes mencionan contingentes
     enviados por señores de la costa y la sierra central, y el apoyo de curacas como los huancas.
3. **Qué se sabe**:
   - *Documentado*:
     - Antes del cerco, Quizu destruyó varias columnas de socorro que Pizarro enviaba al Cusco por la sierra
       central.
     - Su ataque sobre Lima fracasó en el llano, terreno favorable a la caballería, y él murió en el
       combate. El objetivo era impedir los refuerzos al Cusco.
   - *Interpretación*:
     - El peso de los aliados indígenas en la defensa. Hemming y la historiografía reciente lo subrayan
       frente a las crónicas, que lo minimizan.
   - *Debatido*:
     - Las cifras del ejército inca.
     - Si Quizu cayó en el primer asalto o en un combate posterior.
4. **Fuentes**:
   - *Primarias*: Pedro Pizarro y Zárate; las cartas de Pizarro pidiendo socorro a otras gobernaciones.
   - *Modernas*: Hemming, cap. «The Great Rebellion».
   - *URLs*:
     [Sitio de Lima](https://es.wikipedia.org/wiki/Cerco_de_Lima) ·
     [Fundación de Lima](https://es.wikipedia.org/wiki/Fundaci%C3%B3n_de_Lima) ·
     [Conquista del Perú](https://es.wikipedia.org/wiki/Conquista_del_Per%C3%BA).
5. **Propuesta jugable — «La Ciudad de los Reyes»**:
   - *Fase 1, construcción*: trazar la cuadrícula, la plaza, el cabildo y la iglesia junto al Rímac, y fijar
     la alianza con curacas locales mediante una economía de reciprocidad.
   - *Fase 2, defensa*: las columnas de socorro hacia el Cusco desaparecen (eventos) y llega el ejército de
     Quizu desde los cerros. Hay que resistir N minutos o romper el asalto en campo abierto.
   - *Decisiones*: cuánto guardar en la ciudad y cuánto enviar al Cusco. Si se envía de más, el socorro se
     pierde en las quebradas, como ocurrió.
   - *Rival*: Inca (Manco/Quizu).
   - *Mapa*: costa, valle y cerros.
   - *Final*: Quizu cae y se levanta el cerco. Epílogo: el Cusco sigue cercado.
6. **Facciones**:
   - Ya existen: Inca, para el ejército de Manco.
   - Faltan:
     - **Hueste indiana / conquistadores**: jinetes, rodeleros, ballesteros y arcabuceros escasos.
     - **Aliados andinos** como unidades auxiliares; se puede reutilizar `huanca`.
7. **Riesgos**:
   - No presentar la fundación como «civilización frente a barbarie». El valle ya estaba poblado: Lima se
     funda sobre señoríos del curacazgo de Lima/Rímac y cerca de Pachacamac.
   - Dar agencia a los aliados indígenas: sin ellos no hay defensa.

## 2. El cerco del Cusco y Sacsayhuamán (mayo de 1536 – inicios de 1537)

1. **Fecha y lugar**:
   - La rebelión estalla en **abril–mayo de 1536**.
   - Los combates de **Sacsayhuamán** son en mayo–junio de 1536.
   - El cerco se debilita hacia la siembra y Manco se retira a Ollantaytambo.
   - Lugar: el Cusco y la fortaleza de Sacsayhuamán.
2. **Bandos y personajes**:
   - **Inca**: **Manco Inca**; el sumo sacerdote **Villac Umu**.
   - **Españoles y aliados**: **Hernando**, **Juan** y **Gonzalo Pizarro**, con unos 190 españoles (cifra
     aproximada de las crónicas) y auxiliares **cañaris** y **chachapoyas**; también nobles incas
     colaboracionistas, como **Paullu Inca**, que estaba con Almagro en Chile.
3. **Qué se sabe**:
   - *Documentado*:
     - Manco huyó del Cusco y reunió un gran ejército.
     - El incendio de los techos de la ciudad con proyectiles encendidos.
     - Los españoles, encerrados en dos edificios de la plaza, contraatacaron para tomar Sacsayhuamán.
     - **Juan Pizarro** murió de una pedrada en la cabeza durante el asalto.
     - Manco no logró tomar la ciudad.
   - *Interpretación*:
     - El episodio del capitán orejón que se arrojó de la torre antes que rendirse, al que la tradición
       llama **Cahuide** o Titu Cusi Huallpa. Procede sobre todo de Garcilaso y de relatos tardíos.
     - La «aparición» de Santiago y la Virgen (Sunturhuasi) es hagiografía colonial.
   - *Debatido*:
     - El tamaño del ejército inca: las crónicas dan cifras de cien mil o más, inverosímiles.
     - El peso de la logística agrícola en la retirada.
4. **Fuentes**:
   - *Primarias*: **Titu Cusi Yupanqui 1570** (visión de Vilcabamba), **Pedro Pizarro** (testigo) y la
     *Relación del sitio del Cuzco* (anónima, atribuida a Diego de Silva o Vicente de Valverde; la
     atribución está debatida).
   - *Modernas*: Hemming; MacQuarrie; Juan José Vega, *Manco Inca, el gran rebelde*.
   - *URLs*:
     [Batalla de Sacsayhuamán](https://es.wikipedia.org/wiki/Batalla_de_Sacsayhuam%C3%A1n) ·
     [Siege of Cusco](https://en.wikipedia.org/wiki/Siege_of_Cusco) ·
     [Manco Inca](https://es.wikipedia.org/wiki/Manco_Inca).
5. **Propuesta jugable — «Cusco en llamas»** (se juega como **Manco**):
   - *Objetivo*: cercar el Cusco, cortar los suministros, ocupar Sacsayhuamán y resistir el contraataque.
   - *Decisiones*:
     - Asaltar ya o esperar a que el hambre rinda a los sitiados.
     - El calendario agrícola: si el ejército no vuelve a sembrar, la economía colapsa. Es un mecanismo
       documentado y muy de RTS.
   - *Rival*: hueste de los Pizarro con aliados cañaris.
   - *Final*: «victoria parcial» histórica. Se resiste el contraataque en Sacsayhuamán y se retira el
     ejército sin perder a Manco. El juego no permite tomar la ciudad, o permite un final alternativo
     marcado como contrafactual.
6. **Facciones**:
   - Ya existen: **Inca**.
   - Faltan: «**Resistencia inca**» con la variante de 1536. Aún no tiene caballos; puede usar boleadoras,
     galgas (piedras rodantes) y hondas.
   - Enemigo: hueste indiana con auxiliares cañaris.
7. **Riesgos**:
   - La violencia es bidireccional.
   - Evitar el tono de «milagro de Santiago».
   - Los cañaris eran aliados de los españoles por su propia historia con los incas: mostrarlos como actores,
     no como traidores.

## 3. Ollantaytambo y la retirada a Vilcabamba (enero – julio de 1537)

1. **Fecha y lugar**: **enero de 1537** (fecha de es.wikipedia; algunos autores la sitúan a fines de 1536), en
   Ollantaytambo, en el valle del Urubamba. Le siguen el saqueo de **Vitcos** por Orgóñez (**julio de 1537**)
   y la huida a Vilcabamba.
2. **Bandos y personajes**:
   - **Manco Inca**.
   - **Hernando Pizarro**, con unos 70 jinetes y auxiliares (cifra aproximada).
   - En la fase de Vitcos, **Rodrigo Orgóñez**, capitán de Almagro.
3. **Qué se sabe**:
   - *Documentado*:
     - Los españoles atacaron las terrazas fortificadas y fueron rechazados.
     - Los incas **inundaron el llano desviando canales**, lo que neutralizó la caballería.
     - Manco usó al menos un **caballo capturado** y prisioneros españoles.
     - En Vitcos, Orgóñez capturó a parte de la corte, incluido el niño **Titu Cusi**; Manco escapó.
   - *Interpretación*: Ollantaytambo como «la única gran victoria inca de campo».
   - *Debatido*: la fecha exacta y las cifras.
4. **Fuentes**:
   - *Primarias*: Pedro Pizarro (testigo de la inundación); Titu Cusi 1570 (Vitcos).
   - *Modernas*: Hemming; Protzen, *Inca Architecture and Construction at Ollantaytambo* (1993), para el
     sitio.
   - *URLs*:
     [Batalla de Ollantaytambo (es)](https://es.wikipedia.org/wiki/Batalla_de_Ollantaytambo) ·
     [(en)](https://en.wikipedia.org/wiki/Battle_of_Ollantaytambo) ·
     [Incas de Vilcabamba](https://es.wikipedia.org/wiki/Incas_de_Vilcabamba).
5. **Propuesta jugable — «Las terrazas de Ollantaytambo»** (Manco):
   - *Fase 1, defensa en altura*: hondas, galgas y terrazas, con una **mecánica de compuertas** que inunda
     el llano y ralentiza a la caballería.
   - *Fase 2, escape*: llega el ejército de Almagro (Orgóñez) y hay que escoltar a Manco y a la corte hasta
     la ceja de selva antes de que lo corten. Perder al heredero tiene consecuencias narrativas, porque así
     ocurrió con Titu Cusi.
   - *Final*: Manco llega a Vilcabamba. Se funda el estado neoinca.
6. **Facciones**: Resistencia inca; pizarristas en la fase 1 y almagristas en la fase 2. Muestra que «los
   españoles» no son un bloque único.
7. **Riesgos**: bajos. Es un hito de orgullo para el público peruano, pero no conviene convertirlo en épica
   nacionalista anacrónica.

## 4. Las Salinas (6 de abril de 1538) — pizarristas contra almagristas

1. **Fecha y lugar**: **6 de abril de 1538**, en la pampa de Las Salinas, al sur del Cusco.
2. **Bandos y personajes**:
   - **Pizarristas**: **Hernando** y **Gonzalo Pizarro**.
   - **Almagristas**: **Diego de Almagro**, enfermo y de lejos; manda **Rodrigo Orgóñez**, que muere en el
     campo.
   - Antecedente: **batalla de Abancay** (12 de julio de 1537). Almagro derrota a **Alonso de Alvarado** y
     ocupa el Cusco, que creía de su gobernación de Nueva Toledo.
3. **Qué se sabe**:
   - *Documentado*:
     - Victoria pizarrista.
     - Almagro es procesado y **ejecutado en el Cusco (julio de 1538)**.
     - Los indígenas observaron la batalla desde los cerros (testimonio de las crónicas).
   - *Interpretación*: el origen del rencor que lleva al asesinato de Francisco Pizarro (26 de junio de 1541).
   - *Debatido*: si los arcabuceros pizarristas usaron munición encadenada.
4. **Fuentes**:
   - *Primarias*: Cieza, *Guerra de las Salinas*; Zárate; Pedro Pizarro.
   - *Modernas*: Lockhart; Del Busto; Lorandi.
   - *URLs*:
     [Batalla de las Salinas](https://es.wikipedia.org/wiki/Batalla_de_las_Salinas) ·
     [Batalla de Abancay](https://es.wikipedia.org/wiki/Batalla_de_Abancay) ·
     [Diego de Almagro](https://es.wikipedia.org/wiki/Diego_de_Almagro) ·
     [Guerra civil entre los conquistadores](https://es.wikipedia.org/wiki/Guerra_civil_entre_los_conquistadores_del_Per%C3%BA).
5. **Propuesta jugable — «Nueva Castilla o Nueva Toledo»**:
   - Primera misión **entre conquistadores**. El jugador lleva a los pizarristas, la versión documentada.
   - *Fase 1*: reunir hombres y caballos en Lima y avanzar hacia el Cusco. Mecánica de *reclutamiento*: las
     lealtades se compran con promesas de encomienda.
   - *Fase 2*: batalla campal en Las Salinas con terreno pantanoso.
   - *Rival*: almagristas.
   - *Final*: entrada al Cusco.
   - Variante: jugar Abancay como almagrista en una primera misión corta.
6. **Facciones**: **Pizarristas y almagristas**. Pueden ser la misma civilización «Hueste indiana» con
   colores, héroes y bonus distintos; por ejemplo, almagristas con mejores «veteranos de Chile» y
   pizarristas con mejor oro y artillería.
7. **Riesgos**:
   - Es la misión más «limpia» en términos de violencia colonial: españoles contra españoles.
   - Recordar que los dos bandos llevaban auxiliares indígenas y que la guerra tuvo un coste andino
     (saqueos, cargadores).

## 5. Chupas (16 de septiembre de 1542) y la creación del Virreinato

1. **Fecha y lugar**: **16 de septiembre de 1542**, en Chupas, cerca de Huamanga (Ayacucho). La **real cédula
   del 20 de noviembre de 1542**, con las Leyes Nuevas, crea el Virreinato del Perú.
2. **Bandos y personajes**:
   - **Realistas**: el gobernador **Cristóbal Vaca de Castro**, con **Francisco de Carvajal** como sargento
     mayor y **Alonso de Alvarado**.
   - **Almagristas**: **Diego de Almagro el Mozo**; el artillero **Pedro de Candia**, al que Almagro mató
     durante la batalla acusándolo de traición.
3. **Qué se sabe**:
   - *Documentado*:
     - Los almagristas asesinaron a Pizarro en Lima en 1541.
     - Almagro el Mozo fue derrotado en Chupas y ejecutado en el Cusco en 1542.
     - Se considera una de las batallas más sangrientas de las guerras civiles.
   - *Debatido*: las cifras de muertos y la culpa de Candia.
4. **Fuentes**:
   - *Primarias*: Cieza, *Guerra de Chupas*; Zárate.
   - *URLs*:
     [Batalla de Chupas](https://es.wikipedia.org/wiki/Batalla_de_Chupas) ·
     [Diego de Almagro el Mozo](https://es.wikipedia.org/wiki/Diego_de_Almagro_el_Mozo) ·
     [Virreinato del Perú](https://es.wikipedia.org/wiki/Virreinato_del_Per%C3%BA).
5. **Propuesta jugable — «El Rey en el Perú»**: el jugador es Vaca de Castro.
   - *Objetivo*: reunir las guarniciones leales, que están dispersas, y elegir el terreno.
   - *Mecánica de artillería*: los cañones almagristas son peligrosos y existe la posibilidad de que se
     «saboteen» como evento, apoyado en el caso Candia.
   - *Final*: la batalla; el epílogo narra la creación del Virreinato y las Leyes Nuevas.
   - **Nota**: Las Salinas y Chupas pueden fundirse en **una sola misión de dos actos** si la campaña debe
     quedarse en 8–9 misiones.
6. **Facciones**: realistas tempranos (Corona), que pueden reusar `realistas` con una era «siglo XVI» y sin
   dragones ni fusiles; almagristas.
7. **Riesgos**: bajos.

## 6. La rebelión de Gonzalo Pizarro (1544–1548): Iñaquito, Huarina y Jaquijahuana

1. **Fechas y lugares**:

   | Batalla | Fecha | Lugar | Resultado |
   |---|---|---|---|
   | Iñaquito | 18 de enero de 1546 | junto a Quito | muere el virrey **Blasco Núñez Vela** |
   | Huarina | 20 de octubre de 1547 | orilla del Titicaca | Gonzalo derrota a **Diego Centeno** |
   | Jaquijahuana | 9 de abril de 1548 | cerca del Cusco | el ejército de Gonzalo se desbanda ante **Pedro de la Gasca** |

2. **Bandos y personajes**:
   - **Gonzalo Pizarro**, con **Francisco de Carvajal**, «el Demonio de los Andes», como maestre de campo.
   - Los leales: **Núñez Vela**, **Centeno** y **La Gasca**, con **Pedro de Valdivia** a su lado en
     Jaquijahuana.
3. **Qué se sabe**:
   - *Documentado*:
     - La rebelión de los encomenderos contra las **Leyes Nuevas**.
     - En Huarina, los arcabuceros de Carvajal deciden la batalla.
     - En Jaquijahuana hay **deserción masiva** hacia La Gasca, incluido Garcilaso de la Vega padre, con
       apenas combate.
     - Gonzalo y Carvajal son ejecutados el **10 de abril de 1548**.
   - *Interpretación*:
     - Si Gonzalo aspiró a coronarse rey del Perú. Hubo propuestas en su entorno, sobre todo de Carvajal.
     - El papel de La Gasca como negociador más que como general.
   - *Debatido*: las cifras y si Huarina fue «la mayor batalla» de las guerras civiles.
4. **Fuentes**:
   - *Primarias*: **Gutiérrez de Santa Clara**, **Fernández el Palentino**, Zárate, Garcilaso (*Historia
     General*, libro V) y la correspondencia de La Gasca.
   - *Modernas*: Lockhart; Hemming; Lorandi.
   - *URLs*:
     [Gonzalo Pizarro](https://es.wikipedia.org/wiki/Gonzalo_Pizarro) ·
     [Batalla de Iñaquito](https://es.wikipedia.org/wiki/Batalla_de_I%C3%B1aquito) ·
     [Batalla de Huarina](https://es.wikipedia.org/wiki/Batalla_de_Huarina) ·
     [Batalla de Jaquijahuana](https://es.wikipedia.org/wiki/Batalla_de_Jaquijahuana) ·
     [Pedro de la Gasca](https://es.wikipedia.org/wiki/Pedro_de_la_Gasca) ·
     [Blasco Núñez Vela](https://es.wikipedia.org/wiki/Blasco_N%C3%BA%C3%B1ez_Vela).
5. **Propuesta jugable — «El Pacificador»**, jugando a **La Gasca**:
   - Llega sin ejército y debe **ganar lealtades**. La mecánica de *deserción* convierte unidades enemigas
     mediante el «perdón real» en las cercanías de un estandarte o un clérigo.
   - Huarina es la derrota de Centeno (evento) y obliga a reconstruir.
   - En Jaquijahuana se gana si la moral enemiga cae a cero antes del combate.
   - Es una misión **distinta** de las de exterminio, y documentada.
   - Alternativa: jugar a Gonzalo en Huarina (victoria táctica) como misión corta.
6. **Facciones**: gonzalistas (hueste indiana tardía con muchos arcabuces) y realistas del siglo XVI.
7. **Riesgos**:
   - La rebelión defendía la **encomienda**, es decir, el derecho a explotar mano de obra indígena. No
     convertir a Gonzalo en héroe de la libertad. Que el texto lo diga claro.

## 7. Francisco Hernández Girón (noviembre de 1553 – diciembre de 1554)

1. **Fecha y lugar**:
   - Levantamiento en el **Cusco**, en noviembre de 1553.
   - **Chuquinga** (21 de mayo de 1554), en Apurímac/Ayacucho.
   - **Pucará** (octubre de 1554), en el altiplano de Puno.
   - Ejecución en Lima, en diciembre de 1554.
2. **Bandos y personajes**:
   - **Girón**.
   - Los leales: el mariscal **Alonso de Alvarado**, derrotado en Chuquinga, y el ejército de la **Real
     Audiencia** de Lima, con **Pablo de Meneses** entre los jefes y la Audiencia sin virrey.
3. **Qué se sabe**:
   - *Documentado*:
     - Es la última gran rebelión de encomenderos.
     - Girón **armó y liberó a esclavos africanos** para su ejército. Lo recoge el Palentino; es un dato
       relevante y poco conocido.
     - Fue derrotado en Pucará, capturado y ejecutado.
   - *Debatido*: las cifras y el grado de «liberación» real de los esclavizados.
4. **Fuentes**:
   - *Primarias*: **Fernández el Palentino** (segunda parte, dedicada casi entera a Girón); Garcilaso.
   - *Modernas*: Lockhart; Del Busto.
   - *URLs*:
     [Francisco Hernández Girón (es)](https://es.wikipedia.org/wiki/Francisco_Hern%C3%A1ndez_Gir%C3%B3n) ·
     [(en)](https://en.wikipedia.org/wiki/Francisco_Hern%C3%A1ndez_Gir%C3%B3n).
   - *Atención*: `en.wikipedia/Battle_of_Pucará` es la de **1882**.
5. **Propuesta jugable — «Chuquinga»**:
   - Se juega como Girón: emboscar a Alvarado en un desfiladero con tropas inferiores. Luego, una fase de
     «perseguido» por el altiplano.
   - Final histórico: derrota.
   - Se recomienda como **misión opcional o bonus**. Es buena tácticamente, pero repite el tema de la misión
     6.
6. **Facciones**: rebeldes encomenderos y tropas afrodescendientes armadas, con unidad propia y nombre
   documental, sin estereotipos.
7. **Riesgos**:
   - La representación de los afrodescendientes en el Perú colonial. Es un tema ausente del juego y valioso,
     pero hay que tratarlo con cuidado: eran soldados reclutados por un rebelde que usaba su liberación como
     instrumento.

## 8. La caída de Vilcabamba y Túpac Amaru I (abril – septiembre de 1572)

1. **Fecha y lugar**:
   - Guerra declarada por el virrey **Francisco de Toledo** en **abril de 1572**.
   - Combates en **Huayna Pucará**, en el valle del Vilcabamba.
   - Ocupación de **Vilcabamba**, encontrada incendiada, el **24 de junio de 1572**.
   - Ejecución de **Túpac Amaru I** en la plaza del Cusco el **24 de septiembre de 1572**.
2. **Bandos y personajes**:
   - **Neoincas**: **Túpac Amaru I**; sus capitanes, como Curi Paucar.
   - **Virreinato**: **Toledo**; el general **Martín Hurtado de Arbieto**; el capitán **Martín García Óñez de
     Loyola**, que captura al Inca; aliados **cañaris** y nobles incas del Cusco.
   - Antecedentes: muerte de **Titu Cusi** (1571) y asesinato del enviado **Atilano de Anaya**.
3. **Qué se sabe**:
   - *Documentado*:
     - La expedición y la captura del Inca en la selva cuando huía hacia el bajo Urubamba.
     - El juicio sumario y la ejecución, pese a las súplicas del clero y de vecinos del Cusco.
   - *Interpretación*:
     - El discurso final de Túpac Amaru en el cadalso. Procede de **Baltasar de Ocampo** (1610), autor
       tardío.
     - Toledo actuó por razón de Estado para cerrar el «problema» neoinca antes de las reducciones.
   - *Debatido*:
     - La legalidad del proceso; Felipe II llegó a reprochar a Toledo según una tradición discutida.
     - La ubicación de Vilcabamba la Vieja: hoy se acepta **Espíritu Pampa**; Bingham creyó que era Machu
       Picchu.
4. **Fuentes**:
   - *Primarias*: **Titu Cusi Yupanqui 1570** (contexto previo), **Baltasar de Ocampo**, Martín de Murúa y
     la correspondencia de Toledo (Archivo General de Indias).
   - *Modernas*: Hemming (caps. finales); Vincent Lee, *Forgotten Vilcabamba* (2000), para la arqueología;
     Edmundo Guillén Guillén, *La guerra de reconquista inka* (1994).
   - *URLs*:
     [Túpac Amaru I](https://es.wikipedia.org/wiki/T%C3%BApac_Amaru_I) ·
     [Incas de Vilcabamba](https://es.wikipedia.org/wiki/Incas_de_Vilcabamba) ·
     [Neo-Inca State](https://en.wikipedia.org/wiki/Neo-Inca_State) ·
     [Francisco de Toledo](https://es.wikipedia.org/wiki/Francisco_de_Toledo) ·
     [Diego de Castro Titu Cusi Yupanqui](https://es.wikipedia.org/wiki/Diego_de_Castro_Titu_Cusi_Yupanqui).
5. **Propuesta jugable — «El último Inca de Vilcabamba»**. Se juega como **Túpac Amaru I** y es una misión de
   **resistencia y escape**:
   - Defender el fuerte de Huayna Pucará con galgas y emboscadas en el sendero de selva.
   - Evacuar Vilcabamba quemándola, que es la «tierra quemada» documentada.
   - Huir hacia el bajo Urubamba con la corte.
   - *Final*: histórico, con la captura (cinemática sobria). Final alternativo: «resistir hasta el
     temporal» sin éxito real, marcado como imposible. Es preferible el final fijo, con puntuación por
     cuántos se salvan.
   - Alternativa: jugar a Toledo/Arbieto (contrainsurgencia en selva). Es menos recomendable por el tono.
6. **Facciones**:
   - **Incas de Vilcabamba**: arqueros antis, aliados de la selva como los manaríes; caballos y arcabuces
     capturados, pocos.
   - **Virreinato toledano**: realistas del siglo XVI con aliados cañaris.
7. **Riesgos**:
   - Una ejecución pública: dejarla fuera de pantalla.
   - Es un cierre traumático; puede pesar demasiado como misión intermedia si no se cuida.

## 9. Taki Onqoy (c. 1564–1572)

1. **Fecha y lugar**: c. **1564** (denuncia del clérigo **Luis de Olivera**) hasta c. 1572, en Huamanga
   (Ayacucho), con extensión a Huancavelica, Lucanas, Soras y el Cusco.
2. **Personajes**:
   - Predicadores andinos: **Juan Chocne** es el mejor documentado; también mujeres que tomaban nombres de
     santas.
   - El visitador **Cristóbal de Albornoz**, que hizo la «extirpación» de 1569–1571.
3. **Qué se sabe**:
   - *Documentado*: un movimiento religioso que anunciaba el regreso de las **huacas** para derrotar al dios
     cristiano y a los españoles, con danza y trance («enfermedad del canto»), y que fue reprimido.
   - *Interpretación*:
     - Stern y Millones lo leen como crisis social tras la conquista.
     - Wachtel lo incluye en la «visión de los vencidos».
     - Se discute la posible conexión con Vilcabamba.
   - *Debatido*: **mucho**. Estenssoro Fuchs y otros sostienen que su magnitud fue construida en parte por
     las *informaciones de servicios* de Albornoz (1570, 1577, 1584), que buscaba méritos.
4. **Fuentes**:
   - *Primarias*: informaciones de Albornoz, editadas por Millones en *El retorno de las huacas* (1990);
     Cristóbal de Molina, *Relación de las fábulas y ritos*.
   - *Modernas*: Stern (1982); Juan Carlos Estenssoro, *Del paganismo a la santidad* (2003).
   - *URLs*:
     [Taki Onqoy (es)](https://es.wikipedia.org/wiki/Taki_Onqoy) ·
     [(en)](https://en.wikipedia.org/wiki/Taki_Unquy) ·
     [Cristóbal de Albornoz](https://es.wikipedia.org/wiki/Crist%C3%B3bal_de_Albornoz).
5. **Propuesta jugable**: **no recomiendo una misión RTS**. No hubo guerra y un objetivo militar sería
   inventado. Opciones:
   - un **interludio narrativo** o evento de la campaña, por ejemplo una mecánica de «fe» que reduce la
     productividad de las reducciones;
   - una misión no bélica de **resistencia cultural** que consista en ocultar las huacas de la visita de
     Albornoz. Funciona como misión de sigilo, pero exige mucho cuidado.
6. **Facciones**: ninguna nueva.
7. **Riesgos**: altos. Es religión indígena viva; el historiográfico está en disputa y conviene evitar
   «magia» de juego que la folclorice.

## 10. Reducciones toledanas y mita de Potosí y Huancavelica (1570–1575 en adelante)

1. **Fecha y lugar**:
   - Visita general de **Toledo**: 1570–1575.
   - **Mita de Potosí**: organizada en **1573**, con el método de **amalgama con mercurio** introducido hacia
     1572–1574.
   - **Huancavelica**: mina de mercurio de **Santa Bárbara**, en explotación desde **1564**; la Corona se la
     reserva en 1570–1573.
2. **Personajes**:
   - **Toledo**; **Amador de Cabrera**, descubridor de Huancavelica.
   - Los **curacas**, responsables de entregar los contingentes de mitayos.
3. **Qué se sabe**:
   - *Documentado*:
     - Concentración forzosa de la población en pueblos de traza española (reducciones).
     - Turnos obligatorios de trabajo minero.
     - Muy alta mortalidad en Huancavelica por mercurio y polvo.
   - *Interpretación*: la mita como continuación o perversión de la *mit'a* inca.
   - *Debatido*: las cifras anuales de mitayos (del orden de **13 000** en Potosí, según Bakewell; tómese como
     aproximado) y el efecto demográfico real frente a las epidemias.
4. **Fuentes**:
   - *Primarias*: ordenanzas de Toledo (AGI); Guamán Poma, *Nueva corónica y buen gobierno* (c. 1615), con
     dibujos de la mita.
   - *Modernas*: Bakewell (1984); Lohmann Villena (1949); Jeffrey Cole, *The Potosí Mita* (1985); Kendall
     Brown, *A History of Mining in Latin America* (2012).
   - *URLs*:
     [Reducciones de indios](https://es.wikipedia.org/wiki/Reducciones_de_indios) ·
     [Mita minera](https://es.wikipedia.org/wiki/Mita_minera) ·
     [Mit'a (en)](https://en.wikipedia.org/wiki/Mit%27a) ·
     [Cerro Rico de Potosí](https://es.wikipedia.org/wiki/Cerro_Rico_de_Potos%C3%AD) ·
     [Mina de Santa Bárbara (Huancavelica)](https://es.wikipedia.org/wiki/Mina_Santa_Barbara).
5. **Propuesta jugable**: el **peligro moral** es que el jugador «optimice» trabajo forzado. Dos alternativas:
   - **Jugar al curaca** (genérico, sin nombre inventado): cumplir la cuota de mitayos sin que la comunidad
     colapse. Hay que equilibrar la chacra, la plata para pagar «indios de faltriquera» (exención en dinero,
     documentada), la mortalidad y el litigio ante la Audiencia. Es una misión económica sin enemigo, con
     *derrota* si la población cae bajo un umbral.
   - **Tutorial económico sombrío** como Toledo, con contadores visibles de muertes. Se desaconseja.
   - Recomendación: no es una misión central; sirve como **misión económica opcional** o como mecánica
     transversal de la campaña.
6. **Facciones**: ninguna bélica; el «ayllu andino colonial» como facción económica.
7. **Riesgos**: altos. No banalizar ni presentar la mita como «recurso eficiente», y no ignorar que Potosí
   (hoy Bolivia) era Virreinato del Perú en 1573.

## 11. Corsarios en el Mar del Sur: Drake (1579) y la flota de Nassau ante el Callao (1624)

1. **Fecha y lugar**:
   - **Drake** en el Callao, en **febrero de 1579**. Entra al puerto de noche, corta amarras y sale tras el
     galeón *Nuestra Señora de la Concepción* («Cacafuego»), que captura frente a la costa de Ecuador el
     1 de marzo de 1579.
   - **Cavendish** (1587) saquea e incendia **Paita** y pasa por Puná. No atacó el Callao.
   - **Richard Hawkins**, capturado en **1594** por **Beltrán de Castro** en la bahía de Atacames/San Mateo.
   - **Flota de Nassau**, al mando de **Jacques L'Hermite**: bloqueo del Callao de **mayo a agosto de 1624**.
2. **Bandos y personajes**:
   - **Ingleses**: Drake. Del lado virreinal, el virrey Toledo y **Pedro Sarmiento de Gamboa**, que salió en
     su persecución.
   - **Neerlandeses (1624)**:
     - **L'Hermite**, que muere a bordo el 2 de junio de 1624.
     - **Hugo Schapenham**, que le sucede.
   - **Virreinato (1624)**: el virrey **marqués de Guadalcázar**.
3. **Qué se sabe**:
   - *Documentado (1624)*:
     - Una flota de unos 11 buques (aproximado) bloquea el puerto e incendia naves fondeadas.
     - Los intentos de desembarco son rechazados por la artillería y las milicias.
     - Después hay incursiones en Guayaquil.
     - Consecuencia directa: la **muralla del Callao** (1640) y, a largo plazo, la defensa de Lima.
   - *Interpretación*: el plan neerlandés de levantar a indígenas y esclavizados contra España, mencionado
     en algunas obras. Verificar en Bradley antes de usarlo.
   - *Debatido*: el número de buques quemados.
4. **Fuentes**:
   - *Primarias*: *Journael vande Nassausche vloot* (1626); relaciones del virrey (AGI); para Drake, *The
     World Encompassed* (1628) y las declaraciones españolas.
   - *Modernas*: Peter Bradley, *The Lure of Peru: Maritime Intrusion into the South Sea, 1598–1701* (1989);
     Kris Lane, *Pillaging the Empire* (1998); Lohmann Villena, *Las defensas militares de Lima y Callao*.
   - *URLs*:
     [Jacques L'Hermite (es)](https://es.wikipedia.org/wiki/Jacques_L%27Hermite) ·
     [(en)](https://en.wikipedia.org/wiki/Jacques_l%27Hermite) ·
     [Francis Drake](https://es.wikipedia.org/wiki/Francis_Drake) ·
     [Drake's circumnavigation](https://en.wikipedia.org/wiki/Francis_Drake%27s_circumnavigation) ·
     [Thomas Cavendish](https://es.wikipedia.org/wiki/Thomas_Cavendish).
5. **Propuesta jugable — «El bloqueo del Callao (1624)»**:
   - *Defensa costera*: torres, baterías y lanchas cañoneras; hay que proteger los barcos fondeados de los
     brulotes.
   - Repeler desembarcos nocturnos y sostener el abastecimiento de Lima por tierra durante tres meses de
     bloqueo.
   - *Mecánica*: la moral neerlandesa cae al morir L'Hermite, que es un evento documentado.
   - *Final*: la flota se retira. Epílogo: se ordena la muralla del Callao.
   - Drake 1579 sirve como **prólogo corto**: el Callao sin defensas y los barcos sin amarras. Explica por qué
     se fortifica.
6. **Facciones**: **corsarios y armadas extranjeras** (inglesa y neerlandesa), con unidades navales: brulote,
   galeón, chalupa de desembarco. El juego **necesita agua y navegación**: comprobar si el motor lo soporta.
7. **Riesgos**: bajos. Cuidado con la épica de «defensa de la patria» anacrónica, porque se defendía el puerto
   de la plata del rey.

## 12. La muralla de Lima (1684–1687)

1. **Fecha y lugar**: **1684–1687**, en Lima, bajo el virrey **Melchor de Navarra y Rocafull, duque de la
   Palata**.
2. **Contexto**: los **bucaneros** en el Pacífico en la década de 1680. La muralla nunca fue asaltada.
3. **Qué se sabe**:
   - *Documentado*: unos 11–12 km, con decenas de baluartes y varias puertas (cifras aproximadas). Fue
     demolida en 1871 y quedan restos en el baluarte Santa Lucía.
   - *Debatido*: la utilidad militar real.
4. **Fuentes**:
   - *Modernas*: Lohmann Villena, *Las defensas militares*; Juan Bromley y José Barbagelata, *Evolución
     urbana de Lima* (1945).
   - *URLs*:
     [Muralla de Lima](https://es.wikipedia.org/wiki/Muralla_de_Lima) ·
     [Melchor de Navarra y Rocafull](https://es.wikipedia.org/wiki/Melchor_de_Navarra_y_Rocafull).
5. **Propuesta jugable**: es una misión de **construcción pura** contra reloj: amurallar Lima con presupuesto
   del cabildo y del consulado mientras llegan rumores de bucaneros. Como no hubo ataque, no se debe inventar
   un asedio. Mejor:
   - fusionarla como **epílogo o segunda fase** de la misión 11;
   - o hacer un modo «construye antes del tiempo y supera una inspección o simulacro».
6. **Facciones**: ninguna nueva.
7. **Riesgos**: bajos. Riesgo de inventar: **no** poner un ataque pirata a Lima.

## 13. El terremoto y tsunami de Lima y el Callao (28 de octubre de 1746) y el Real Felipe

1. **Fecha y lugar**: **28 de octubre de 1746**, de noche, en Lima y el Callao. La fortaleza del **Real
   Felipe** se empieza en **1747** y se termina en **1774**, bajo el virrey Amat.
2. **Personajes**:
   - El virrey **José Antonio Manso de Velasco**, luego conde de Superunda.
   - El cosmógrafo **Louis Godin**, autor del diseño del Real Felipe.
   - **Manuel de Amat y Junyent**, que lo termina.
   - La Iglesia y el cabildo.
3. **Qué se sabe**:
   - *Documentado*:
     - El tsunami destruyó casi por completo el Callao; las cifras aproximadas y debatidas dan unos pocos
       centenares de supervivientes de varios miles.
     - Hubo grandes daños en Lima.
     - Manso de Velasco dirigió la reconstrucción con choques con la Iglesia y la élite, por ejemplo sobre la
       altura de los edificios.
   - *Interpretación*: Walker vincula la crisis al **proyecto borbónico** y a la **conspiración indígena de
     Lima de 1750**; O'Phelan vincula el terremoto y la conspiración.
   - *Debatido*: las cifras de muertos.
4. **Fuentes**:
   - *Primarias*: relaciones impresas del terremoto (Lima, 1746–1748); la *Relación de gobierno* de Manso.
   - *Modernas*:
     - Walker, *Shaky Colonialism* (2008), [Duke UP](https://www.dukeupress.edu/shaky-colonialism).
     - O'Phelan Godoy, «El terremoto de 1746 y la gestación de la conspiración de Lima de 1750», *Revista del
       Instituto Riva-Agüero* (2022),
       [revistas PUCP](https://revistas.pucp.edu.pe/index.php/revistaira/article/view/26036).
   - *URLs*:
     [Terremoto de Lima de 1746](https://es.wikipedia.org/wiki/Terremoto_de_Lima_de_1746) ·
     [(en)](https://en.wikipedia.org/wiki/1746_Lima%E2%80%93Callao_earthquake) ·
     [Fortaleza del Real Felipe](https://es.wikipedia.org/wiki/Fortaleza_del_Real_Felipe) ·
     [Manso de Velasco](https://es.wikipedia.org/wiki/Jos%C3%A9_Antonio_Manso_de_Velasco) ·
     [Manuel de Amat](https://es.wikipedia.org/wiki/Manuel_de_Amat_y_Junyent).
5. **Propuesta jugable — «Después del mar»**. Misión **de supervivencia y reconstrucción sin enemigo militar**:
   - Rescatar supervivientes.
   - Restablecer el agua y el pan; controlar el saqueo de los restos, que está documentado.
   - Reconstruir Lima con criterios antisísmicos (quincha frente a adobe alto).
   - Trazar el Real Felipe en un nuevo emplazamiento.
   - *Decisiones*: priorizar iglesias o casas; ceder o no ante el arzobispado.
   - *Final*: se coloca la primera piedra del Real Felipe.
   - Es una misión **original en el género** y totalmente documentada.
6. **Facciones**: ninguna nueva; usa realistas del siglo XVIII.
7. **Riesgos**: una catástrofe con muchas víctimas. Evitar el espectáculo; tono sobrio; no poner un contador
   de muertos como puntuación.

## 14. La rebelión de Juan Santos Atahualpa (1742–1752), en la selva central

1. **Fecha y lugar**: estalla en **mayo–junio de 1742** en el **Gran Pajonal**, en la selva central (actuales
   Junín y Pasco). Los focos son Quimirí, Chanchamayo, Monobamba y Andamarca.
2. **Bandos y personajes**:
   - **Juan Santos Atahualpa**, que se proclamó descendiente o heredero de Atahualpa. Le siguen
     **asháninka**, **yanesha (amuesha)**, piros y otros pueblos amazónicos, además de serranos.
   - Del lado virreinal, las misiones franciscanas de Ocopa y los gobernadores de frontera.
3. **Qué se sabe**:
   - *Documentado*:
     - Los españoles y las misiones fueron expulsados de la selva central.
     - Los rebeldes tomaron el **fuerte de Quimirí** (1743).
     - Las expediciones punitivas fracasaron, entre ellas la de **José de Llamas** en 1750.
     - En **1752** ocupó brevemente **Andamarca**, en la sierra, y se retiró.
     - **Nunca fue capturado** y desaparece de las fuentes en la década de 1750.
   - *Interpretación*: el mesianismo andino-amazónico y la relación con el «incarrí».
   - *Debatido*: su origen (¿cusqueño?, ¿educado por jesuitas?, el supuesto viaje a España o África), su
     muerte y el grado de liderazgo asháninka propio frente al del caudillo.
4. **Fuentes**:
   - *Primarias*: fray José Amich, *Compendio histórico de los trabajos… en las montañas de los Andes*
     (1771); documentos de Ocopa.
   - *Modernas*: **Varese**, *La sal de los cerros* (1968); Francisco Loayza, *Juan Santos, el invencible*
     (1942, documentos); Mario Castro Arenas, *La rebelión de Juan Santos* (1973); Zarzar; O'Phelan, *Un
     siglo de rebeliones*.
   - *URLs*:
     [Rebelión de Juan Santos Atahualpa](https://es.wikipedia.org/wiki/Rebeli%C3%B3n_de_Juan_Santos_Atahualpa) ·
     [Juan Santos Atahualpa (es)](https://es.wikipedia.org/wiki/Juan_Santos_Atahualpa) ·
     [(en)](https://en.wikipedia.org/wiki/Juan_Santos_Atahualpa).
5. **Propuesta jugable — «El invencible»**, jugando a Juan Santos o a la alianza asháninka:
   - *Fase 1*: tomar Quimirí (asedio de un fuerte de frontera).
   - *Fase 2*: guerra de **emboscadas** en selva contra columnas de Llamas.
   - *Fase 3*: la incursión a Andamarca y la **retirada**, que es lo que pasó.
   - *Final*: no ser derrotado. Es una victoria por resistencia, con una condición documentada y rara: el
     rebelde que gana.
   - *Mapa*: nuevo bioma **selva central / ceja de selva**.
6. **Facciones**: **asháninka / pueblos de la selva central**, una facción nueva con arqueros, guerra de
   bosque, canoas y una economía de yuca y sal (el Cerro de la Sal es clave, por eso el título de Varese).
   Enemigo: realistas de frontera con misioneros.
7. **Riesgos**:
   - Los asháninka son un **pueblo vivo**, con historia reciente de violencia en el conflicto armado interno.
     Consultar o revisar con fuentes asháninka si es posible.
   - Evitar «salvaje» y estereotipos visuales; atuendos documentados (cushma).
   - No tratar a Juan Santos como un «inca» de la sierra que «guía» a amazónicos pasivos.

## 15. Huarochirí y la conspiración de Lima (1750)

1. **Fecha y lugar**: **junio–julio de 1750**, en Lima y en la provincia de **Huarochirí**, en la sierra de
   Lima.
2. **Personajes**:
   - Los conspiradores indígenas de Lima, denunciados mediante una confesión.
   - En Huarochirí, el líder llamado en la literatura **Francisco Inca**. Verificar el nombre completo en
     Spalding antes de usarlo en pantalla.
   - **Sebastián Franco de Melo**, que dirige la represión y escribe un diario.
   - El virrey **Manso de Velasco**.
3. **Qué se sabe**:
   - *Documentado*:
     - Se planeaba un ataque nocturno al palacio virreinal y enlazar con Juan Santos.
     - Descubierta la conspiración, varios conspiradores fueron ejecutados en Lima.
     - En Huarochirí, los rebeldes mataron en pocos días a buena parte de los españoles residentes.
     - La revuelta duró unos dos meses y fue sofocada.
   - *Interpretación*: el vínculo con el terremoto (O'Phelan, Walker).
   - *Debatido*: la coordinación real con Juan Santos.
4. **Fuentes**:
   - *Primaria*: *El diario histórico de Sebastián Franco de Melo: el levantamiento de Huarochirí de 1750*,
     estudio y transcripción de **Karen Spalding** (Lima, CEPEC, 2012).
   - *Modernas*: Spalding, *Huarochirí* (1984); O'Phelan (2022, URL arriba).
   - *URL*: [reseña de *Huarochirí* (Southern Affairs)](https://southernaffairs.org/1984/11/11/karen-spalding-huarochiri/).
   - No hay artículo de Wikipedia específico verificado.
5. **Propuesta jugable**: se recomienda como **acto 2 de la misión 13** («Después del mar») o como misión
   corta jugada desde el lado rebelde: tomar los pueblos de la provincia y cortar el camino Lima–Jauja antes
   de que llegue la columna de Melo. Final: derrota histórica.
6. **Facciones**: rebeldes andinos del siglo XVIII; reutilizan la facción de los rebeldes de Túpac Amaru II.
7. **Riesgos**: la base documental es más fina; no extrapolar nombres.

## 16. La rebelión de Túpac Katari y el cerco de La Paz (13 de marzo – octubre de 1781)

1. **Fecha y lugar**:
   - Primer cerco de La Paz: desde el **13 de marzo de 1781** hasta el socorro de **Ignacio Flores**, a fines
     de junio o inicios de julio.
   - Segundo cerco: **agosto–octubre de 1781**.
   - Unos **184 días** en total. Las cifras varían; es la que da la literatura derivada de Thomson.
   - Lugar: La Paz y **El Alto**, en el Alto Perú, que desde 1776 formaba parte del **Virreinato del Río de la
     Plata**.
2. **Bandos y personajes**:
   - **Rebeldes**:
     - **Julián Apaza, «Túpac Katari»**.
     - **Bartolina Sisa**, su esposa, capturada en 1781 y ejecutada en 1782.
     - **Gregoria Apaza**, su hermana.
     - En el segundo cerco, **Andrés Túpac Amaru**, sobrino de Túpac Amaru II, que inunda **Sorata**.
   - **Realistas**:
     - El comandante de La Paz, **Sebastián de Segurola**.
     - Ignacio Flores.
     - **José de Reseguín**, que levanta el segundo cerco en octubre.
3. **Qué se sabe**:
   - *Documentado*:
     - El cerco con hambre extrema en la ciudad.
     - La captura de Katari tras una traición.
     - Su ejecución por **descuartizamiento** en noviembre de 1781 (13 o 15 de noviembre según la fuente).
   - *Interpretación*: el proyecto político aimara autónomo («solo nosotros gobernaremos», según la lectura
     de Thomson) frente al liderazgo cusqueño.
   - *Debatido*: las cifras y el número de víctimas civiles.
4. **Fuentes**:
   - *Primarias*: diario de **Segurola** y diario de **Francisco Tadeo Diez de Medina** (ambos publicados).
   - *Modernas*: **Thomson** (2002); **Serulnikov** (2010); María Eugenia del Valle de Siles, *Historia de la
     rebelión de Túpac Catari* (1990).
   - *URLs*:
     [Túpac Katari (es)](https://es.wikipedia.org/wiki/T%C3%BApac_Katari) ·
     [(en)](https://en.wikipedia.org/wiki/T%C3%BApac_Katari) ·
     [Bartolina Sisa](https://es.wikipedia.org/wiki/Bartolina_Sisa).
5. **Propuesta jugable — «El cerco de Chuquiago»**, jugando a Katari y Bartolina Sisa:
   - Cercar La Paz desde El Alto: cortar el agua y los víveres y rechazar salidas.
   - Resistir la columna de Flores. Bartolina Sisa es una heroína con su propio campamento, lo que está
     documentado.
   - En la segunda fase llega Andrés Túpac Amaru: se presa el río para inundar, como en Sorata.
   - *Final*: el socorro de Reseguín, con una derrota histórica.
   - Alternativa: jugarla como **continuación** directa de la misión de Túpac Amaru II.
6. **Facciones**: **rebeldes aimaras**; se puede derivar de `collas_lupaca` en su versión colonial.
7. **Riesgos**:
   - El sufrimiento de los civiles sitiados (hambre).
   - La ejecución por descuartizamiento, que debe quedar fuera de pantalla.
   - Katari y Bartolina son **símbolos políticos vivos en Bolivia**: respeto y precisión.
   - Geografía: está fuera del Perú actual; justificarlo como el ciclo de la Gran Rebelión.

## 17. La rebelión del Cusco de 1814 (Pumacahua y los Angulo), de agosto de 1814 a marzo de 1815

1. **Fecha y lugar**:
   - Junta del Cusco: **3 de agosto de 1814**.
   - Expediciones a **La Paz**, **Huamanga** y **Arequipa**, con la batalla de la **Apacheta** en noviembre de
     1814.
   - Derrota en **Umachiri** (Puno) el **11 de marzo de 1815**.
2. **Bandos y personajes**:
   - **Rebeldes**:
     - Los hermanos **José**, **Vicente** y **Mariano Angulo**.
     - El brigadier **Mateo Pumacahua**, curaca de Chinchero. Había **combatido contra Túpac Amaru II** en
       1780.
     - El poeta **Mariano Melgar**, fusilado tras Umachiri.
   - **Realistas**: el general **Juan Ramírez Orozco**; el virrey **José Fernando de Abascal**.
3. **Qué se sabe**:
   - *Documentado*:
     - La junta del Cusco, nacida del conflicto constitucional (Cádiz 1812).
     - Las expediciones y la derrota.
     - Pumacahua fue ejecutado en Sicuani en marzo de 1815.
   - *Interpretación*: «primera revolución independentista peruana» frente a «guerra de criollos y curacas»
     (O'Phelan, Fisher).
   - *Debatido*: su carácter separatista y el proyecto político (república frente a monarquía incaica).
4. **Fuentes**:
   - *Primarias*: proclamas de la junta; *Memoria de gobierno* de Abascal.
   - *Modernas*: John Fisher, *Bourbon Peru, 1750–1824* (2003); O'Phelan; David Cahill y Scarlett O'Phelan
     sobre Pumacahua.
   - *URLs*:
     [Rebelión del Cusco de 1814](https://es.wikipedia.org/wiki/Rebeli%C3%B3n_del_Cuzco_de_1814) ·
     [(en)](https://en.wikipedia.org/wiki/Cuzco_Rebellion_of_1814) ·
     [Mateo Pumacahua](https://es.wikipedia.org/wiki/Mateo_Pumacahua) ·
     [Batalla de Umachiri](https://es.wikipedia.org/wiki/Batalla_de_Umachiri).
5. **Propuesta jugable — «La junta del Cusco»**, jugando a Pumacahua:
   - Elegir el orden de las expediciones (La Paz, Huamanga o Arequipa), que dispersan las fuerzas, como
     ocurrió.
   - Tomar Arequipa y retroceder ante Ramírez.
   - *Final*: derrota en Umachiri y epílogo hacia 1821.
   - Encaja como **puente** hacia la campaña 8, «Independencia», o como su **misión 0**.
6. **Facciones**: **patriotas tempranos**, que reutilizan `patriotas` con milicias andinas; realistas.
7. **Riesgos**:
   - La ambigüedad de Pumacahua, que reprimió en 1780 y se rebeló en 1814. Es una buena oportunidad
     narrativa; no simplificarlo.

---

## Hitos de la lista del autor

Estos hitos no se desarrollan con ficha propia porque ya están en la petición, pero sirven de referencia:

- **Cajamarca, 16 de noviembre de 1532**:
  - [Batalla de Cajamarca](https://es.wikipedia.org/wiki/Batalla_de_Cajamarca).
  - Testigos: Pedro Pizarro, Diego de Trujillo, Francisco de Xerez y Miguel de Estete.
  - Para el lado inca, Betanzos y Titu Cusi.
  - Moderna: Lockhart, *The Men of Cajamarca*.
- **Vilcaconga, 1533** (Manco aún no rebelde; el general atahualpista Quizquiz contra Hernando de Soto):
  [Batalla de Vilcaconga](https://es.wikipedia.org/wiki/Batalla_de_Vilcaconga). Encaja como transición.

---

## Facciones y unidades que faltan (resumen)

| Facción | Usos | Base posible |
|---|---|---|
| **Hueste indiana** (conquistadores), con variantes **pizarrista / almagrista / gonzalista / gironista** | 1, 4, 5, 6, 7 | nueva; las variantes como colores, héroes y bonus |
| **Realistas del siglo XVI** (Corona temprana: Vaca de Castro, La Gasca, Toledo) | 5, 6, 8 | `realistas` con era temprana (sin dragones ni fusil de chispa) |
| **Aliados andinos** (cañaris, chachapoyas, huancas) | 1, 2, 3, 8 | reutilizar `huanca` y añadir unidad cañari |
| **Resistencia inca / Incas de Vilcabamba** | 2, 3, 8 | `inca` con galgas, armas y caballos capturados y arqueros antis |
| **Corsarios y armadas extranjeras** (inglesa, neerlandesa) | 11 | nueva, naval; depende del soporte de agua del motor |
| **Asháninka y pueblos de la selva central** | 14 | nueva; necesita bioma de selva |
| **Rebeldes andinos del siglo XVIII** | 15, Túpac Amaru II, 16 | la facción rebelde existente; variante aimara desde `collas_lupaca` |
| **Tropas afrodescendientes** | 7 (y milicias de pardos y morenos del siglo XVIII) | unidad, no facción |
| **Patriotas tempranos / Junta del Cusco** | 17 | `patriotas` |

---

## Orden recomendado (9 misiones)

| # | Misión | Fecha | Jugador vs rival | Tipo |
|---|---|---|---|---|
| 1 | **La Ciudad de los Reyes**: fundación de Lima y cerco de Quizu Yupanqui | 1535–1536 | pizarristas y aliados andinos vs Inca | construir y defender |
| 2 | **Cusco en llamas**: cerco del Cusco y Sacsayhuamán | 1536 | Manco Inca vs Pizarros | asediar y resistir |
| 3 | **Las terrazas de Ollantaytambo** y la retirada a Vilcabamba | 1537 | Manco vs Hernando Pizarro y Orgóñez | defender y escapar |
| 4 | **Nueva Castilla o Nueva Toledo**: Las Salinas, con Chupas como segundo acto | 1538 / 1542 | pizarristas vs almagristas; Vaca de Castro vs Almagro el Mozo | batalla campal. Epílogo: el Virreinato (1542) |
| 5 | **El Pacificador**: Gonzalo Pizarro, de Iñaquito a Jaquijahuana | 1546–1548 | La Gasca vs Gonzalo y Carvajal | deserción y diplomacia más batalla |
| 6 | **El último Inca**: Vilcabamba y Túpac Amaru I | 1572 | Túpac Amaru I vs Toledo | resistencia y escape |
| 7 | **El bloqueo del Callao**: Nassau y L'Hermite, con prólogo de Drake 1579 y epílogo de la muralla | 1624 (1579, 1684) | Virreinato vs corsarios | defensa costera |
| 8 | **El invencible**: Juan Santos Atahualpa | 1742–1752 | asháninka y Juan Santos vs frontera virreinal | asedio, emboscada y resistencia |
| 9 | **La Gran Rebelión**: Túpac Amaru II, la misión existente | 1780–1781 | rebeldes vs realistas | se mantiene |

**Opcionales y bonus**, por prioridad:

- (a) **Después del mar**: terremoto de 1746, Real Felipe y Huarochirí 1750. Es la mejor candidata para ser
  la décima misión, entre la 7 y la 8, porque es original y está documentada.
- (b) **El cerco de Chuquiago**: Túpac Katari, 1781, como continuación de la 9.
- (c) **Chuquinga**: Hernández Girón, 1554.
- (d) **La Junta del Cusco**: Pumacahua, 1814–1815. Mejor como misión 0 de «Independencia».
- (e) Mita y reducciones: misión económica opcional.
- (f) Taki Onqoy: solo como interludio narrativo.

**Lógica del orden**:

- Alterna perspectivas: la hispana en 1, 4, 5 y 7, y la indígena en 2, 3, 6, 8 y 9.
- Alterna tipos de misión, para no encadenar dos batallas campales.
- Cubre los cuatro bloques que pide el autor: conquista y fundación, guerras civiles, Manco y Vilcabamba, y
  Túpac Amaru.
- Mete al menos un hito de los siglos XVII y XVIII que no es rebelión (7).
- Si hay que recortar a 6 misiones, el orden sería **1, 2+3 fusionadas, 4+5 fusionadas, 6, 8 y 9**.

## Frontera con la campaña inca: ¿Huáscar–Atahualpa y Cajamarca?

**Recomendación**:

- **Quipaipan (1532) cierra la campaña inca.** Ya está así en `guerra_civil_inca.md`.
- **Cajamarca no es misión jugable de ninguna de las dos.** Es el **epílogo cinemático** de la campaña inca
  y el **prólogo narrativo** del Virreinato, con el mismo texto visto desde dos lados.

**Razones**:

1. *Histórica*: la guerra Huáscar–Atahualpa es un conflicto interno inca, y su lógica (sucesión, panacas,
   ejércitos de Quito frente al Cusco) pertenece a la campaña inca. Cajamarca es el punto de bisagra.
2. *Jugable*: Cajamarca fue una **emboscada de pocas horas** contra un séquito mayormente desarmado, seguida de
   una masacre. No da para una misión RTS honesta:
   - Si se juega como Pizarro, se gamifica una masacre.
   - Si se juega como Atahualpa, no hay decisión posible sin contrafactual.
3. *Narrativa*: la campaña del Virreinato gana si arranca en **1535–1536**, con la fundación de Lima y la
   reacción de Manco. Arranca con una pregunta abierta y no con un hecho consumado.
4. *Puente*: si se quiere una misión de transición jugable, la **campaña de Quizquiz** (Vilcaconga, 1533) puede
   ir como misión final opcional de la campaña inca. El ejército atahualpista sigue luchando tras la muerte de
   Atahualpa, lo que muestra que «la conquista» no terminó en Cajamarca.

## Riesgos y sensibilidades transversales

- **Tono de la conquista**: evitar la épica de «hazaña» y el «encuentro de dos mundos» edulcorado. Los textos
  de misión deben mencionar las epidemias, los aliados indígenas (sin ellos la conquista es inexplicable) y la
  violencia.
- **Agencia indígena**: hay que mostrar a cañaris, huancas, chachapoyas y a la nobleza cusqueña
  colaboracionista como actores con intereses propios, no como «traidores».
- **Ejecuciones**: las de Atahualpa, Túpac Amaru I, Gonzalo Pizarro, Túpac Amaru II, Katari y Pumacahua deben
  quedar fuera de pantalla, con texto sobrio.
- **Trabajo forzado (mita, encomienda)**: el diseño no debe recompensar la explotación como estrategia óptima.
- **Pueblos vivos**: asháninka, aimaras y quechuas. Revisión con fuentes propias. Ojo a la iconografía
  política contemporánea, como la wiphala y Katari en Bolivia.
- **Afrodescendientes**: hoy no aparecen en el juego. Girón (1554) y las milicias del siglo XVIII son
  oportunidades documentadas.
- **Contrafactuales**: si el juego permite «ganar» donde la historia perdió (Cusco 1536, Vilcabamba 1572,
  1781), hay que marcarlo explícitamente como alternativo, en coherencia con la regla del proyecto de no
  inventar guerras.
