# Unidades y tecnologías únicas

Regla del proyecto: toda unidad o tecnología única necesita una fuente en `docs/historia/`.
Si no hay base documental suficiente para una unidad, la civ se queda sin unidad única antes que
inventarla; la identidad se cubre con una tecnología. Las variantes únicas reutilizan los modelos y
atuendos ya documentados en [`atuendos.md`](./atuendos.md); no se añade equipo inventado.

## Primera tanda (en curso)

| Civ | Unidad única | Base | Tecnología única | Fuente |
|---|---|---|---|---|
| Cultura Moche | Guerrero Moche | Guerrero (`soldier`) | Metalurgia Moche | [`civilizaciones/moche.md`](./civilizaciones/moche.md), [`atuendos.md`](./atuendos.md) §2 |
| Tahuantinsuyo | Guerrero Inca | Guerrero (`soldier`) | Quipus y Vigías / Palabra del Amauta / Chasquis Veloces | [`civilizaciones/inca.md`](./civilizaciones/inca.md), [`atuendos.md`](./atuendos.md) §5bis |

### Cultura Moche

Los mochica tenían élites guerreras, combates rituales e iconografía de prisioneros y sacrificios; sus
guerreros se representan con casco cónico, porra y túnica con armadura de espalda. El «Guerrero Moche» es
una variante de infantería con más ataque y un bonus contra infantería. «Metalurgia Moche» refuerza la
armadura de las unidades. — [`civilizaciones/moche.md`](./civilizaciones/moche.md),
[`atuendos.md`](./atuendos.md) §2.

### Tahuantinsuyo

El ejército imperial inca reunía infantería, honderos y chasquis; el uncu con canesú rojo y la
mochila/carga son la base visual ya usada por el rig andino. El «Guerrero Inca» es una infantería
resistente y equilibrada. Las tecnologías únicas inca ya existían (Quipus y Vigías, Palabra del Amauta,
Chasquis Veloces); este pase solo añade su fuente y las restringe a la civ inca. —
[`civilizaciones/inca.md`](./civilizaciones/inca.md), [`atuendos.md`](./atuendos.md) §5bis.

## Pendiente de la primera tanda

Caral-Supe, Chavín, Paracas, Recuay, Wari, Tiahuanaco, Chanca y Chimú se incorporarán en las siguientes
entregas de #237. Caral, Chavín, Paracas y Tiahuanaco no tienen una unidad militar concreta documentada:
se evaluarán como tecnología única o hueco documentado, sin inventar unidades.

## Criterios de implementación

- Cada entrada declara `source` (ruta bajo `docs/historia/`) y `minPeriod`.
- Las unidades únicas tienen `baseKind` y `civs`; el modelo/rig se hereda de la base.
- Las tecnologías únicas declaran `civs` y `source`.
- `tests/unique.test.ts` valida fuentes, cronología, ventana de la civ y que el rig resuelva.
