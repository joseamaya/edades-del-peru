# Atuendos, armamento y tocados (spec para modelado)

Este documento reúne, con fuentes, la información de **vestimenta, armamento, protección y tocados**
necesaria para modelar las unidades del juego. Es la **spec operativa** que usa
`src/model/ProceduralModel.ts` (perfiles de atuendo) y `src/model/defs/units.ts` (qué modelo usa cada
era). Donde un dato no está atestiguado se indica **«no documentado»**; no se inventa.

> Regla (ver `AGENTS.md`): antes de tocar contenido histórico, consultar el dossier y **añadir la
> fuente**. Los dossieres por civilización son históricos/geográficos y en general **no describen
> atuendos**; por eso este documento consolida la evidencia.

---

## 1. General andino (todas las culturas prehispánicas)

> **Nota de representación (piel, pelo y rasgos).** Los dossieres y las fuentes citadas describen prendas,
> armas y tocados, pero **no documentan tonos de piel ni rasgos faciales**. El juego usa una paleta andina
> plausible y oscura (`HUMAN_SKIN` en `src/model/defs/people.ts`) y pelo oscuro para todos los humanoides; es una
> **representación**, no un retrato ni una reconstrucción. No debe leerse como una afirmación racial esencialista.
>
> **Género.** Los dossieres no documentan una división de género del trabajo ni una proporción histórica. El juego
> mezcla personajes femeninos y masculinos al 50% de forma determinista, solo como presentación: no cambia stats,
> movimiento, guardado ni simulación. El atuendo masculino general (túnica/uncu + taparrabos o wrap corto) y los
> conjuntos femeninos son abstracciones plausibles, no reconstrucciones.

- **Arma ofensiva principal: la porra/maza (macana/club)**, de mango de madera y cabeza de madera,
  piedra o metal, con formas de disco, estrella, roseta, cactus o cabeza zoomorfa. Fue el arma más
  usada en el Perú antiguo, en guerra y en ceremonias. — Museo Larco, *Club Heads*.
- **Hondas (huaraca)** y **porras** para los indios de la sierra; el **arco** era secundario en el
  Perú andino (escasez de maderas), usado sobre todo por **auxiliares de la selva** en el ejército
  inca; también **dardos con estólica (atlatl)**. — Métraux, *Weapons* (Handbook of South American
  Indians, BAE Bull. 143), pp. 229–263.
- **Defensa mejor desarrollada que en otras zonas: cascos y armadura acolchada** (real protección
  contra hondas y dardos); **escudos (rodelas)** conocidos. — Métraux, *Weapons*.
- **Prendas base**: **uncu/túnica** masculina tejida en tapiz (algodón + fibra de camélido) con
  abertura central para la cabeza, **sobre un taparrabos**; telas finas (**cumbi**) reservadas a
  élites y rituales; patrones de **tocapu** (motivos geométricos) y **ajedrezado con canesú rojo en V**
  (asociado a jefes militares/mando). — LACMA, *The Andean Uncu*; Dumbarton Oaks, *All T'oqapu Tunic*;
  The Met, *Tunic (Inca)*; NGA *Gold and the Incas*; Museo de América, *Uncu inca*.
- **Tocado regio: llawt'u (llauto)**, banda/turbante de lana de vicuña con la franja frontal
  **maskapaycha**. — Wikipedia, *Llawt'u* (fuente secundaria).
- **Orejeras/orejones**: discos de metal (oro) como insignia de estatus (Moche, Wari, Chimú, Recuay…).

## 2. Por civilización (marcas atestiguadas)

- **Caral-Supe**: algodón (redes, textil). Atuendo militar: **no documentado**.
- **Chavín**: iconografía felínica/antropomorfa. Atuendo: **no documentado**.
- **Paracas**: **textilería fina** y **arte plumario** (plumas). Prendas concretas: **no documentado**.
- **Cupisnique**: arquitectura de adobe y cerámica incisa (formativo de la costa norte). Atuendo: **no
  documentado**.
- **Moche**: guerreros con **cascos cónicos** de metal, **porra (club)** y **túnica con armadura de
  espalda (backflap) trapezoidal**, **orejeras** (orejones), **taparrabos**, **honda** y **estólica
  (atlatl)**; **escudo circular**. — Museo Larco, *Mochica Warrior Clothing* y catálogo; The Met,
  *Ear flare frontal* y *Profile Warrior Ornament*.
- **Nazca**: textilería; **cabezas trofeo** (práctica). Atuendo militar: **no documentado**.
- **Recuay**: sociedades guerreras; **orejeras de oro** (Pashash). Prendas: **no documentado**.
- **Wari**: escultura de **guerrero con orejeras y túnica de combate con "armadura" en pecho y
  espalda unida por hombros** (disco pectoral). — Museo Larco, catálogo ML301403.
- **Tiahuanaco**: uso del **arco** representado en textiles (según Métraux). Prendas: **no documentado**.
- **Chimú**: **orfebrería**; **orejeras y máscaras** de metal; **tumi**. Prendas: **no documentado**.
- **Chincha**: comercio; **no documentado** atuendo.
- **Chanca**: **pintura facial** («se pintaban el rostro»). Prendas: **no documentado**.
- **Collas/Lupaca**: señoríos aimaras del altiplano (ganadería, chullpas). Atuendo: **no documentado**.
- **Huanca**: nación del valle del Mantaro. Atuendo: **no documentado**.
- **Inca**: ejército con **chasquis**; **uncu** (ajedrezado + canesú rojo, tocapu) sobre taparrabos,
  tela cumbi; **llawt'u + maskapaycha** para el Sapa Inca; arco solo en auxiliares de selva. —
  LACMA/Dumbarton Oaks/Met/Museo de América; Métraux.

## 3. Colonial (Virreinato, 1532–1821)

- **Tropas españolas (s. XVIII, Borbones)**: uniformes **azul con divisa encarnada** (chupa y casaca),
  botón de plata; **dragones** (caballería) y **fusileros**; armamento de **fusil**, **arcabuz**,
  sable, lanza y pistolas. Milicias de **naturales (indios), pardos y morenos** con uniformes
  distintivos (blanco, etc.). — Sanz García, *Virreinato de Perú: organización militar y uniformidades
  específicas* (INISEG); *Miniaturas Militares* (A. Cànovas).
- **Soldado de cuera** (fronteras): **cuera** (abrigo de pieles sin mangas, hasta 7 capas) como
  protección anti-flecha; chaqueta azul, divisa roja, gorra; armado con **fusil corto, pistolas, arco
  y flechas, espada, lanza y escudo de piel**. — Wikipedia, *Soldado de cuera* (fuente secundaria).

## 4. República / Guerra del Pacífico (s. XIX)

- **Perú (1879)**: infantería con **guerrera/dormán azul** con vivos, botones con escudo peruano;
  **fusil de retrocarga Comblain I (1873)** y **Peabody-Martini (1874)**; **kepí**. Caballería con
  **carabina, lanza y sable**; artillería **Krupp**. — *La Guerra del Pacífico 1879–1884* (gdp1879),
  informe de uniformología (Patricio Greve); *Militaria* — uniforme del Batallón «1.° de Ayacucho».
- **Chile (1878–79)**: de parada: **morrión bajo azul negro** y **levita azul negra** con vivos
  lacres, **pantalón garance**, **medias botas**; de diario: **kepí azul negro**; **fusil belga
  Comblain II (1873)**, **bayoneta sable**. — Decreto de uniforme chileno 1878 (gdp1879);
  *Uniformes de la Guerra del Pacífico II*.

## 5. Perú contemporáneo (s. XX–XXI)

- **Uniforme de campaña moderno** (pixelado/verde), **casco**, **fusil de asalto** y equipo ligero.
  Referencia general de uniformidad militar contemporánea; **sin detalle de fuente específica en los
  dossieres** (marcar como aproximación).

## 5bis. Figuras religiosas (unidades de conversión)

- **Amauta (Inca, Horizonte Tardío)**: sabio/maestro del Tahuantinsuyo (lengua, quipus, ritual). Sin
  atuendo militar: **uncu/túnica** y **sin armas**. — Garcilaso de la Vega, *Comentarios reales* (1609);
  Cieza de León, *Crónica del Perú*.
- **Misionero (Virreinato en adelante)**: religiosos de las órdenes (dominicos, franciscanos, jesuitas)
  en las **doctrinas** y **reducciones** de indios. **Hábito talar** (túnica larga), **cruz/rosario**,
  **sin armas**. — Wikipedia, *Reducciones* / *Extirpación de idolatrías*; Duviols, *La destrucción de
  las religiones andinas*.

---

## 6. Tabla spec de atuendo por era/civ (para el código)

| Era | Prenda | Tocado | Arma principal | Protección | Escudo |
|---|---|---|---|---|---|
| Formativo (Caral/Chavín) | taparrabos + manta simple | cinta de tela | porra/macana de piedra | — | — |
| Estados Regionales (Moche/Nazca/Recuay/Tiahuanaco/Wari) | uncu/túnica con tocapu | casco cónico (metal) o diadema + orejeras | porra + lanza/honda | túnica acolchada, backflap (Moche), disco pectoral (Wari) | rodela |
| Tahuantinsuyo (Inca/Chanca/Chimú/Chincha) | uncu ajedrezado + canesú rojo | llawt'u + maskapaycha (élite), diadema+orejeras | porra + honda (sierra); arco (aux. selva) | casco acolchado | rodela |
| Virreinato (Realistas) | casaca/chupa azul, divisa roja | morrión/bicornio | fusil/arcabuz + sable/lanza | cuera (frontera) | — |
| República (Patriotas/Guerra del Pacífico) | guerrera/dormán azul, pantalón | kepí (chacó en gala) | fusil Comblain/Peabody-Martini + bayoneta | — | — |
| Contemporáneo (Perú) | uniforme de campaña | casco | fusil de asalto | chaleco | — |

> **Abstracción de juego (Chavín/Paracas).** No hay prendas concretas documentadas para estas culturas (§2).
> El código usa la túnica compartida, el wrap/skirt, una cinta y una manta simple como base de presentación;
> Paracas reutiliza esa abstracción en Horizonte Temprano e Intermedio Temprano (no se postula un atuendo
> distinto para este último). La honda de la variante a distancia es un arma andina general
> (Métraux, *Weapons*), no una atribución específica a Chavín o Paracas.

> **Implementación riggeada (m4–m6).** Wari añade el disco pectoral; Tiahuanaco, el casco cónico; Chanca,
> la pintura facial; Chimú e Inca, orejeras de metal; e Inca, el canesú rojo. La túnica/wrap, el escudo, la
> macana y la honda son la abstracción compartida. Chanca y Chimú incluyen Horizonte Tardío para ser coetáneos
> de los incas en `m5`/`m6`; no se postula un atuendo distinto para ese periodo.

### Textiles por civilización (implementación)

El código (`CIV_TEXTILE` en `src/model/ProceduralModel.ts`) usa una textura de **uncu** por civilización: un patrón
que **abstrae motivos atestiguados del arte/textilería** de esa cultura (tocapu y ajedrezado con canesú rojo inca,
geometría wari/nazca/paracas, greca moche, felino chavín, felino/plumas chimú), **no** una reconstrucción de una
prenda concreta. Donde la prenda específica **no está documentada** (§2), el patrón es una **abstracción** —la misma
convención que los emblemas de `arquitectura.md` §2—; no se inventan prendas ni se presentan como reconstrucción
histórica. Las civilizaciones sin tradición textil/iconográfica registrada usan el textil andino genérico (`textile`).
Referencias de dominio público solo para Inca/Wari/Nazca (`PROVENANCE.md`); el resto de slots son prompt-only.
Los motivos concretos corresponden a los textiles de las secciones 1 y 2.

---

## 7. Fuentes

- Museo Larco — *Club Heads*: https://www.museolarco.org/en/exhibition/permanent-exhibition/online-exhibition/ritual-warfare-and-music/club-heads/
- Museo Larco — *Mochica Warrior Clothing*: https://www.museolarco.org/en/exhibition/permanent-exhibition/online-exhibition/ritual-warfare-and-music/mochica-warrior-clothing/
- Museo Larco — Catálogo (guerrero Wari ML301403; orejera Moche ML100849; guerrero Moche Lee ML301403).
- The Met — *Ear flare frontal* (Moche): https://www.metmuseum.org/art/collection/search/309425
- The Met — *Profile Warrior Ornament* (Moche): https://www.metmuseum.org/art/collection/search/315148
- The Met — *Tunic* (Inca): https://www.metmuseum.org/art/collection/search/751901
- Métraux, A. — *Weapons*, Handbook of South American Indians, BAE Bull. 143, vol. 5, pp. 229–263.
- LACMA — *The Andean Uncu*: https://www.lacma.org/andean-uncu
- Dumbarton Oaks — *All T'oqapu Tunic*: https://museum.doaks.org/objects-1/info/23071
- Museo de América — *Uncu inca*: https://www.cultura.gob.es/museodeamerica/en/coleccion/america-prehispanica/uncu-inca.html
- Wikipedia — *Llawt'u* (tocado inca; fuente secundaria).
- Sanz García, J. — *Virreinato de Perú: organización militar y uniformidades específicas* (INISEG).
- Cànovas, A. — *Miniaturas Militares* (Virreinato del Perú): http://miniaturasmilitaresalfonscanovas.blogspot.com/2011/10/el-virreinato-del-peru-y-la-capitania.html
- Wikipedia — *Soldado de cuera* (fuente secundaria).
- *Uniformes de la Guerra del Pacífico II* (armamento: Comblain, Peabody-Martini, Krupp).
- Saona, J. — *La Guerra del Pacífico 1879–1884* (gdp1879): uniforme chileno (decreto 1878), soldado peruano.
- Garcilaso de la Vega, I. (1609) — *Comentarios reales de los incas*; Cieza de León, P. — *Crónica del Perú* (amauta).
- Wikipedia — *Reducciones*, *Extirpación de idolatrías* (fuente secundaria); Duviols, P. — *La destrucción de las religiones andinas* (misioneros).
