# Mapas por geografía

El terreno de cada partida debe corresponder a la **geografía real** de la civilización o del escenario.
Se definen tres grandes biomas jugables (más un cuarto opcional), con parámetros de generación propios.

## Tipos de mapa

| `mapType` | Geografía | Elementos | Civs de ejemplo |
|---|---|---|---|
| `costa` | Desierto costero + litoral + valles fluviales | océano Pacífico, arena, oasis de valle, ríos transversales, lomas, humedales | Caral-Supe, Paracas, Moche, Nazca, Chimú, Chincha |
| `andes` | Cordillera de los Andes | quebradas, pisos ecológicos, laderas, mesetas, **andenes** (terrazas), nevados | Chavín, Recuay, Wari, Chanca, Huanca, Inca |
| `altiplano` | Meseta del Collao / Titicaca | puna, bofedales, lagunas, **waru-warus** (camellones), chullpas | Tiahuanaco, Collas/Lupaca |
| `selva` (opcional) | Ceja de selva / amazonía | ríos, bosque húmedo, pendientes | escenarios de Chachapoyas o expansión oriental |

## Rasgos geográficos por civilización

- **Caral-Supe**: valle medio-inferior del **río Supe**, 350 msnm, a 23 km del litoral; asentamientos entre
  litoral (**Áspero**) y valles altos. Mapa `costa` con río y humedales.
- **Chavín**: **Chavín de Huántar**, río **Mosna**, 3180 msnm, Callejón de Conchucos. Mapa `andes`.
- **Paracas**: península de **Paracas**, costa desértica de Pisco-Ica; vientos Paracas. Mapa `costa`.
- **Cupisnique**: costa norte (valle de Chicama/Jequetepeque). Mapa `costa`.
- **Moche**: valles **Chicama-Moche-Virú** (La Libertad). Mapa `costa` con **huacas** de adobe.
- **Nazca**: valles de **Nazca/Río Grande**; **pampa** con geoglifos; acueductos (puquios). Mapa `costa` árida.
- **Recuay**: **Callejón de Huaylas**, sierra de Áncash; ganadería. Mapa `andes`.
- **Wari**: **Ayacucho**, sierra centro-sur; andenes y red vial. Mapa `andes`.
- **Tiahuanaco**: **meseta del Titicaca**; camellones. Mapa `altiplano`.
- **Chimú**: **Chan Chan** (Trujillo), desierto costero norte; canal **La Cumbre**. Mapa `costa` con canal.
- **Chincha**: valles de **Chincha** (La Centinela, Tambo de Mora); litoral y comercio marítimo. Mapa `costa`.
- **Chanca**: **Andahuaylas** (Apurímac) y Ayacucho; fortalezas en cerros. Mapa `andes` con alturas.
- **Collas/Lupaca**: altiplano de **Puno** (Hatuncolla). Mapa `altiplano`.
- **Huanca**: valle del **Mantaro** (Junín); sierra central. Mapa `andes`.
- **Inca**: **Cusco**, valle del Urubamba; mampostería y andenes. Mapa `andes` con andenes.

## Parámetros de generación (propuesta)

- `costa`: `waterLevel` alto; llanura costera plana; río principal que desemboca; poca elevación; niebla de
  arena; nodos de **pesca** en el litoral y **algodón**/baya en los valles.
- `andes`: relieve abrupto (FBM + ridged); pendientes fuertes; valles encajonados; **andenes** como
  plataformas planas; ríos de cabecera; nodos de **mina** (metal) y **madera**.
- `altiplano`: meseta alta y relativamente plana; lagos y bofedales; camellones; nodos de **piedra** y
  **ganado** (comida).
- `selva`: ríos anchos, relieve medio, bosque denso.

## Fuentes

- Shady Solís, R. (PEACS): valle de Supe y Áspero.
- UNESCO: [Ciudad Sagrada de Caral-Supe](https://whc.unesco.org/en/list/1269/), [Chan Chan](https://whc.unesco.org/en/list/366/).
- Seguridad alimentaria andina: waru-warus de Tiahuanaco; andenes incas.
