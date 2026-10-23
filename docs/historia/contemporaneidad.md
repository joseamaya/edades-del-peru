# Contemporaneidad y emparejamientos válidos

Para que el juego sea históricamente exacto, una partida solo puede enfrentar **civilizaciones
coetáneas** (que existieron al mismo tiempo). Esta matriz define las ventanas temporales y los
emparejamientos permitidos.

## Ventanas de existencia

| Civilización | Inicio | Fin | Geografía |
|---|---|---|---|
| Caral-Supe | 3000 a.C. | 1800 a.C. | Costa/valle bajo (Supe) |
| Chavín | 1200 a.C. | 200 a.C. | Sierra (Conchucos, Áncash) |
| Paracas | 700 a.C. | 200 d.C. | Costa sur (Pisco-Ica) |
| Cupisnique | 1500 a.C. | 1000 a.C. | Costa norte |
| Moche | 100 d.C. | 800 d.C. | Costa norte (Chicama-Moche-Virú) |
| Nazca | 100 a.C. | 700 d.C. | Costa sur (Nazca-Cahuachi) |
| Recuay | 200 d.C. | 600 d.C. | Sierra norte (Callejón de Huaylas) |
| Wari | 600 d.C. | 1000/1100 d.C. | Sierra centro-sur (Ayacucho) |
| Tiahuanaco | 400 d.C. | 1000/1100 d.C. | Altiplano (Titicaca) |
| Chimú | 1000/1150 d.C. | 1470 d.C. | Costa norte (Chan Chan) |
| Chincha | 1000/1100 d.C. | 1470 d.C. | Costa sur (La Centinela) |
| Chanca | 1200 d.C. | 1438 d.C. | Sierra (Andahuaylas-Apurímac) |
| Collas/Lupaca | 1150 d.C. | 1477 d.C. | Altiplano (Puno) |
| Huanca | ~1000 d.C. | 1460 d.C. | Sierra central (Junín/Mantaro) |
| Inca | 1200/1438 d.C. | 1533 d.C. | Sierra (Cusco) |

## Emparejamientos por periodo

| Periodo | Civs disponibles | Enfrentamientos documentados / plausibles |
|---|---|---|
| P0 Arcaico Tardío | Caral-Supe | (sin guerra documentada; escenario de construcción) |
| P1 Horizonte Temprano | Chavín, Paracas, Cupisnique | Chavín ↔ Paracas (coetáneos; influencia y competencia regional) |
| P2 Intermedio Temprano | Moche, Nazca, Recuay | **Moche ↔ Recuay** (interacción con componente bélico documentado) |
| P3 Horizonte Medio | Wari, Tiahuanaco | **Wari ↔ Tiahuanaco** (coetáneos, esferas Norte/Sur) |
| P4 Intermedio Tardío | Chimú, Chincha, Chanca, Collas/Lupaca, Huanca | Alianzas y guerras: Chanca+Pokras↔Inca (1438, abre P5); **Huanca↔xauxas/yauyos** (rivalidad) y posterior sometimiento por el Inca; Chimú↔Cuismancu; Chimú↔Chincha (rivalidad costera) |
| P5 Horizonte Tardío | Inca | **Inca ↔ Chanca (1438)**, **Inca ↔ Chimú (c. 1470)** |
| P6 Virreinato | Realistas (España), Rebeldes | **Túpac Amaru II ↔ Realistas (1780–1781)** |
| P7 Independencia | Patriotas, Realistas | **San Martín/Bolívar ↔ Realistas (1821–1824)** |
| P8 República | República del Perú, Confederación, Chile | **Guerra del Pacífico (1879–1883)** |

> **Excepción de campaña.** `m5` (1438) y `m6` (c. 1470) enfrentan al Inca con Chanca y Chimú, que
> pertenecen al P4; el roster de escaramuza de P5 sigue siendo solo Inca. El mapeo de modelos usa la era
> técnica, no el roster, para que esos oponentes históricos conserven su rig.

## Reglas de diseño para el menú

1. Se elige **primero el periodo**; el juego solo ofrece civilizaciones de ese periodo.
2. El **rival** se elige entre las civs coetáneas del mismo periodo.
3. Los enfrentamientos **marcados en negrita** corresponden a conflictos atestiguados y son los que se usan
   en campaña.
4. Los demás pares coetáneos se permiten como **escaramuza** (encuentro plausible, no batalla documentada).
5. No se permite emparejar civilizaciones sin solapamiento temporal (p. ej. Moche con Chimú, o Chavín con Inca).

## Notas de precisión

- **Moche** y **Chimú** son **secuenciales** (no coetáneos), aunque ambos sean de la costa norte.
- **Inca** y **Chanca** son coetáneos; su guerra (1438) es el hito fundacional del imperio.
- **Chimú** e **Inca** son coetáneos; su guerra (c. 1470) marca el fin del reino chimú.
- **Chavín** y **Paracas** se solapan (Paracas 700 a.C.–200 d.C.).

## Fuentes

- Wikipedia: [Cultura chanca](https://es.wikipedia.org/wiki/Cultura_chanca), [Guerra chimú-inca](https://es.wikipedia.org/wiki/Guerra_chim%C3%BA-inca), [Intermedio Tardío](https://es.wikipedia.org/wiki/Intermedio_Tard%C3%ADo).
- CIP / PUCP: interacciones **Moche–Recuay** (revistas de arqueología PUCP).
- O'Phelan Godoy, S. (2021). *La gran rebelión de Túpac Amaru II y la temprana independencia del Perú*.
