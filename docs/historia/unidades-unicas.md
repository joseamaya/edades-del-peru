# Unidades y tecnologías únicas

Regla del proyecto: toda unidad o tecnología única necesita una fuente en `docs/historia/`.
Si no hay base documental suficiente para una unidad, la civ se queda sin unidad única antes que
inventarla; la identidad se cubre con una tecnología y el hueco se documenta. Las variantes únicas
reutilizan los modelos y atuendos ya documentados en [`atuendos.md`](./atuendos.md); no se añade equipo
inventado.

## Capítulo I — Culturas Preincas

| Civ | Unidad única | Base | Tecnología única | Fuente |
|---|---|---|---|---|
| Caral-Supe | — (hueco documentado) | — | Trueque Interregional | [`civilizaciones/caral.md`](./civilizaciones/caral.md) |
| Chavín | — (hueco documentado) | — | Peregrinaje al Lanzón | [`civilizaciones/chavin.md`](./civilizaciones/chavin.md) |
| Paracas | — (hueco documentado) | — | Fardos Funerarios | [`civilizaciones/paracas.md`](./civilizaciones/paracas.md) |
| Cultura Moche | Guerrero Moche | Guerrero (`soldier`) | Metalurgia Moche | [`civilizaciones/moche.md`](./civilizaciones/moche.md), [`atuendos.md`](./atuendos.md) §2 |
| Cultura Recuay | Guerrero Recuay | Guerrero (`soldier`) | Orejeras de Pashash | [`civilizaciones/recuay.md`](./civilizaciones/recuay.md), [`atuendos.md`](./atuendos.md) §2 |
| Imperio Wari | Guardián Wari | Guerrero (`soldier`) | Mitimaes | [`civilizaciones/wari.md`](./civilizaciones/wari.md), [`atuendos.md`](./atuendos.md) §2 |
| Tiahuanaco | — (hueco documentado) | — | Puerta del Sol | [`civilizaciones/tiahuanaco.md`](./civilizaciones/tiahuanaco.md) |

### Cultura Moche

Los mochica tenían élites guerreras, combates rituales e iconografía de prisioneros y sacrificios; sus
guerreros se representan con casco cónico, porra y túnica con armadura de espalda. El «Guerrero Moche» es
una variante de infantería con más ataque y un bonus contra infantería. «Metalurgia Moche» refuerza el
ataque de las unidades. — [`civilizaciones/moche.md`](./civilizaciones/moche.md),
[`atuendos.md`](./atuendos.md) §2.

### Cultura Recuay

Sociedades guerreras de la sierra de Áncash, con conflictos limítrofes con los Moche y orejeras de oro de
Pashash. El «Guerrero Recuay» es una infantería resistente con orejeras y escudo; «Orejeras de Pashash»
refuerza la armadura. — [`civilizaciones/recuay.md`](./civilizaciones/recuay.md),
[`atuendos.md`](./atuendos.md) §2.

### Imperio Wari

El primer imperio andino documentó mitimaes (reasentamientos), red vial y el disco pectoral del guerrero.
El «Guardián Wari» es una infantería resistente; «Mitimaes» mejora la velocidad de las unidades. —
[`civilizaciones/wari.md`](./civilizaciones/wari.md), [`atuendos.md`](./atuendos.md) §2.

### Caral-Supe, Chavín, Paracas y Tiahuanaco

No hay una unidad militar concreta documentada para estas civs; se evita inventarla. Caral se apoya en su
trueque interregional y su sociedad estatal sin ejército documentado; Chavín, en el oráculo y el peregrinaje
de su centro ceremonial; Paracas, en sus fardos funerarios y textiles; Tiahuanaco, en el culto y la
astronomía de la Puerta del Sol. — [`civilizaciones/caral.md`](./civilizaciones/caral.md),
[`civilizaciones/chavin.md`](./civilizaciones/chavin.md), [`civilizaciones/paracas.md`](./civilizaciones/paracas.md),
[`civilizaciones/tiahuanaco.md`](./civilizaciones/tiahuanaco.md).

## Capítulo II — Tahuantinsuyo (en curso)

| Civ | Unidad única | Base | Tecnología única | Fuente |
|---|---|---|---|---|
| Confederación Chanca | — (pendiente) | — | — | — |
| Reino Chimú | — (pendiente) | — | — | — |
| Tahuantinsuyo | Guerrero Inca | Guerrero (`soldier`) | Quipus y Vigías / Palabra del Amauta / Chasquis Veloces | [`civilizaciones/inca.md`](./civilizaciones/inca.md), [`atuendos.md`](./atuendos.md) §2 y §6 |

El ejército imperial inca reunía infantería, honderos y chasquis; el uncu con canesú rojo y la mochila/carga
son la base visual ya usada por el rig andino. El «Guerrero Inca» es una infantería resistente y equilibrada.
Las tecnologías únicas inca ya existían; este pase añade su fuente y restringe Palabra del Amauta y Chasquis
Veloces a la civ inca; Quipus y Vigías queda disponible para Wari e Inca, como documenta su ventana
histórica. — [`civilizaciones/inca.md`](./civilizaciones/inca.md), [`atuendos.md`](./atuendos.md) §2 y §6.

## Balance

`yarn sim --seeds=777,778,779,780 --max=900` → 4 empates (cap de 900 s), en línea con el baseline
documentado de escenarios sin resolver. Las estadísticas de las unidades únicas se mantienen por encima de su
base sin doblar la curva (bonus de ataque/HP moderados); no se cambia la condición de victoria. La
verificación de balance de toda la primera tanda se repetirá al cerrar Chanca y Chimú.

## Criterios de implementación

- Cada entrada declara `source` (ruta bajo `docs/historia/`) y `minPeriod`.
- Las unidades únicas tienen `baseKind` y `civs`; el modelo/rig se hereda de la base.
- Las tecnologías únicas declaran `civs`, `unique: true` y `source`.
- `tests/unique.test.ts` valida fuentes, cronología, ventana de la civ y que el rig resuelva.
