# Comercio y caravanas

Este dossier documenta la base histórica de la **Caravana de llamas** y del **Mercado** como
abstracciones jugables. No afirma la existencia de un mercado con esa forma arquitectónica en todas
las épocas; separa la evidencia (ganadería, redes de intercambio y caminos) de la mecánica del juego.

## Evidencia

- **Camélidos y redes de intercambio (Recuay).** La economía recuay combinaba ganadería de alpacas y
  llamas con intercambio de larga distancia hacia la costa norte; hay vasijas de estilo costero en
  contextos de la sierra. Fuente: [`civilizaciones/recuay.md`](./civilizaciones/recuay.md).
- **Ganadería y caminos (Inca).** El Tahuantinsuyo articuló ganadería, andenes, depósitos (`qollqa`) y
  el **Qhapaq Ñan**, una red vial de ~40 000 km con tambos y chasquis. Fuente:
  [`civilizaciones/inca.md`](./civilizaciones/inca.md).
- **Intercambio de larga distancia (Chincha).** Las fuentes coloniales describen mercaderes chincha que
  llegaban al Cuzco, Collao y Quito, con trueque y balsas de totora (Rostworowski). Fuente:
  [`civilizaciones/chincha.md`](./civilizaciones/chincha.md).

## Abstracción en el juego

- La **Caravana de llamas** representa el transporte de bienes por rutas terrestres andinas. Usa el
  modelo de camélido alpaca como sustituto visual documentado en `src/model/defs/wildlife.ts`.
- El ingreso de plata crece con la distancia entre mercados para premiar rutas largas y expuestas; es
  una decisión de diseño, no una tarifa histórica.
- El **Mercado** compra y vende recursos con precios que se mueven por oferta y demanda. Es una
  abstracción económica; no se presenta como una institución documentada en todas las civilizaciones.
- No se modela una recua de mulas posterior a 1532: la unidad mantiene la caravana andina como
  abstracción y evita atribuir una innovación colonial sin una fuente específica en este dossier.

## Fuentes

- [`fuentes.md`](./fuentes.md), en especial Rostworowski, *Historia del Tahuantinsuyu*.
- Dossiers citados: Recuay, Inca y Chincha.
