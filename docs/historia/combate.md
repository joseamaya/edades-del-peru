# Combate: clases y counters

Este documento fija el **contrato de diseño** del sistema de counters y evita presentarlo como una
afirmación histórica cuantitativa.

## Qué está documentado

- Antes de 1532 no hay caballos, armas de fuego, vehículos ni motores en el juego
  (`AGENTS.md`, [`periodizacion.md`](./periodizacion.md)); las unidades a distancia usan honda, boleadora,
  arco o cerbatana según el periodo y el atuendo.
- Las sociedades andinas documentadas en [`civilizaciones/`](./civilizaciones/) emplearon lanzas, macanas,
  hondas y arcos; la caballería y la pólvora aparecen con el Virreinato.
- Este proyecto no dispone de doctrinas tácticas cuantitativas comparables; por eso la tabla de counters es
  una **abstracción jugable** del diseño, no una medición histórica. No se presenta como dato documentado.

## Abstracción jugable

- `infantry` (guerrero con lanza/macana): +contra caballería y asedio.
- `ranged` (hondero/arquero/tirador): +contra infantería; el arquero cede contra caballería.
- `cavalry` (jinete/caballería): +contra unidades a distancia y asedio; cede contra infantería.
- `siege` (asedio/artillería/ariete blindado): +contra edificios.
- `worker` y `special` (explorador, conversores) no reciben ni aplican counters militares.

Los valores viven en `src/model/defs/units.ts` (`bonusVs`) y se aplican en `computeDamage`
(`src/game/combat.ts`). Las fuentes generales del proyecto están en [`fuentes.md`](./fuentes.md).

## Fuentes

- [`fuentes.md`](./fuentes.md) — bibliografía general del proyecto.
- [`atuendos.md`](./atuendos.md) — armamento y protección por cultura (honda, arco, lanza, macana).
- [`periodizacion.md`](./periodizacion.md) — corte 1532 para caballos y armas de fuego.
