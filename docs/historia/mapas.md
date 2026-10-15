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

## Perfiles históricos de mundo (implementación)

La identidad del mapa es **data-driven** (`src/model/defs/profiles.ts`). La geografía se descompone en una
`GeographicRegion` (más fina que el `MapType` jugable): `north_coast`, `central_coast`, `south_coast`,
`andean_valley`, `high_andes`, `altiplano`, `amazon`. Cada región define un `HistoricalMapProfile`
(suelo, terreno, clima con aridez/humedad/temperatura, agua/humedales, vegetación, recursos, atmósfera y
landmark) y se resuelve con `resolveMapProfile({ period, civ, mapType, region? })`. La región manda en la
identidad fina del terreno; el `mapType` es la familia gruesa (coincide con `regionDefaultMap(region)`).
`resolveWorldProfile(...)` devuelve además la arquitectura de la civilización. El landmark solo se asigna
dentro de su propio periodo (una cultura jugada después no arrastra un landmark anacrónico).

La región de cada civilización sigue este dossier (regiones deducidas de la tabla de arriba):

| Región | Civilizaciones |
|---|---|
| `north_coast` | Cupisnique, Moche, Chimú |
| `central_coast` | Caral-Supe |
| `south_coast` | Paracas, Nazca, Chincha |
| `andean_valley` | Chavín, Recuay, Huanca (por defecto de `andes`) |
| `high_andes` | Wari, Chanca, Inca |
| `altiplano` | Tiahuanaco, Collas/Lupaca |
| `amazon` | escenarios de selva |

Los valores son **abstracciones jugables** de los rasgos documentados (no reconstrucciones), y cada perfil cita
su fuente. La semilla + el perfil deben seguir siendo deterministas.

