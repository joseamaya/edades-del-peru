# Auditoría RTS: rendimiento, IA, economía y escalabilidad

> Estado: diagnóstico reproducible + **remediación P0 mínima** y **seguimiento #121** implementados
> (secciones "P0 remediation" y "Seguimiento #121").
> Commit auditado: `7e8224ff3683346a9e728c1dcaad2b808a6ddc05`
> Actualizado tras el merge de #121: `004dcc93e6e7dd73a8dc03ebd9f61140691788ed` (2026-10-21)
> Fecha: 2026-10-20 (auditoría original); 2026-10-21 (actualización)
> Entorno: Linux x64, Intel i7-13700 (24 hilos), Node 22.23.2, Chromium/SwiftShader (sin GPU),
> viewport 1280×800, `?low=1`, niebla activada, seed 777 (escala) y seeds 777–796 (IA).

---

## Executive Summary

El motor **soporta la simulación de 800 unidades en CPU** con un coste medio bajo (≈3,0 ms/paso sin sondas;
≈3,9 ms/paso con sondas), pero **no está sano como RTS**. El diagnóstico siguiente es el **baseline pre-#121**;
la sección "Estado tras #121" resume qué cambió:

1. **La IA no cierra partidas.** En 20 partidas AI-vs-AI (normal vs normal, 1200 s): **1 victoria P0, 3 P1 y
   16 sin terminar (80 %)**. En **15/20 seeds** uno de los bandos **no llegó a producir un solo soldado**.
2. **Hay un bloqueo económico reproducible.** El seed 783, extendido a 2400 s, mantiene **comida = 0 y
   madera = 0 desde t≈240 s**, no construye cuartel y no produce ningún soldado. 9–10 de sus 16 trabajadores quedan
   “ocupados” con path activo pero sin avanzar; se emiten 5.106 órdenes de recolección y solo 66 entregas.
3. **El pathfinding es el principal cuello de botella de CPU en picos.** La media es baja, pero en 800 unidades
   el p99 llega a **15,6 ms** (path) y **16,3 ms** (unidades) en la ventana inicial de 10 s. En estado
   estacionario (3000 pasos, 605 unidades tras combate) baja a **6,1 ms / 8,6 ms**.
4. **La IA gasta poco CPU** (media 0,15 ms/paso, p99 1,9 ms en 800 unidades), pero **genera una tormenta de
   peticiones A***: mediana de 77.242 peticiones y 66.767 fallos (86 %) por partida; el seed 786 llega a
   **353.014 peticiones y 346.425 fallos (98 %)**.
5. **La niebla, el spatial grid, la población, la limpieza y las partículas no son cuello de botella** en las
   escalas medidas (<0,1 ms cada uno). No deben tocarse todavía.
6. **El render no se puede certificar con SwiftShader** (4 FPS, 24.237 draw calls y 18,1 M triángulos a 800).
   Hace falta una pasada con GPU real antes de decidir instancing/materiales compartidos.
7. **No se detectó fuga de memoria.** En 3000 pasos a 800 unidades el heap retenido tras GC fue **−10,3 MB**
   (el bruto recolectado fue 91,9 MB en 50 s). Hay mucha asignación, pero el GC la recupera.

**Conclusión:** la siguiente mejora no es refactorizar `Game.ts` ni implementar LOD/ECS/Web Workers. Es
**arreglar la alcanzabilidad de recursos de la IA y domesticar las peticiones/peores casos de A***. Después,
**la IA debe convertir su economía en ataques que terminen partidas**.

### Estado tras #121

El PR #121 (#120) implementó la parte de menor riesgo de AI-1 y PATH-1: caché de componentes conexas en
`Pathfinder`, consulta O(1) de alcanzabilidad en `AI.chooseResourceNode` y abandono de órdenes económicas
atascadas en `Unit`. La comparación de #121 usa la métrica de `blockedWorkers` corregida (un trabajador
detenido en un nodo conserva su array `path`; ya no se cuenta como bloqueado) y parte del estado posterior a la
remediación P0, no del baseline original de la auditoría:

| Métrica | Baseline #121 | Tras #121 |
|---|---:|---:|
| Partidas decisivas | 7/20 | **8/20** |
| Llamadas A* de `chooseResourceNode` (mediana) | 3.952 | **2.891** (−27 %) |
| Entregas (mediana) | 337 | **389** (+16 %) |
| `pathRequests` (mediana) | 51.067 | 51.822 |
| `pathFailures` (mediana) | 45.964 | 45.885 |
| `blockedWorkersMax` (mediana, métrica corregida) | 2 | 2 |

Esto **reduce** el bloqueo económico y la tormenta de búsquedas de la IA, pero no cierra AI-1/PATH-1: la
mayoría de las peticiones A* provienen de los `setPath` de las unidades, no de `chooseResourceNode`; siguen
sin existir presupuesto/cola por frame, límite de expansiones ni caché de búsquedas fallidas. Las cifras de las
secciones siguientes son el **baseline pre-#121** y se conservan para comparar; cuando una conclusión haya
cambiado, se indica explícitamente.

---

## Current Architecture

### Qué corre por frame

`GameLoop` (`src/core/GameLoop.ts`) ejecuta hasta 8 pasos fijos de **1/60 s** por frame. Todo el mundo se
actualiza dentro de `Game.update` (`src/core/Game.ts:2653`):

| Fase | Sistemas | Frecuencia real |
|---|---|---|
| Visual | `sky`, `water`, `terrain`, `particles`, `debris`, `markers`, `trees`, `wildlife` | 60 Hz |
| Cámara + input | `RTSCamera`, HUD/overlays | 60 Hz |
| Spatial | `rebuildSpatial` (limpia y reasigna buckets) | 60 Hz |
| Entidades | `Unit.update`, `Building.update`, `ResourceNode.update`, `Projectile.update` | 60 Hz |
| FOW + LOD | `updateFow` (reveal + `decay` + `upload`), `applyLod` | 60 Hz |
| Población | `updatePopulation` (recorre unidades y edificios) | 60 Hz |
| Campaña | `Mission.update`, `Tutorial.update` | 60 Hz |
| Limpieza | `cleanupDead` (y `pathfinder.removeObstacle` → `rebuild`) | 60 Hz |
| IA | `AI.update`, con decisiones internas escalonadas | 60 Hz de entrada; decisiones a 0,3–8 s |
| Victoria/HUD | `checkVictory`, `HUD.update` | 60 Hz |

La IA ya está escalonada (`src/game/AI.ts:81`): percepción 0,3 s, economía 0,6 s, edificios 1,2 s, exploración
6 s, ataque 30–60 s, combate/defensa 0,3–0,4 s × reacción, investigación 8 s. **No hace falta bajar su frecuencia
de entrada**: el coste medido es bajo. El problema es lo que hace dentro de esas decisiones.

### Qué necesita realmente 60 Hz

- **Sí:** movimiento, separación, combate, proyectiles, animación de unidades y cámara.
- **Puede ir más lento sin riesgo visual:** FOW (≈0,22 ms), LOD (≈0,004 ms), población (≈0,01 ms), victoria
  (≈0,001 ms), limpieza (≈0,01 ms), HUD/minimapa (≈0,28 ms de media, p99 5,4 ms).
- **Ya va más lento:** decisiones de IA, economía, construcción, investigación y exploración.

No se recomienda cambiar frecuencias todavía: **los costes medidos de FOW/población/limpieza son demasiado
pequeños para justificar el riesgo**. El único candidato claro por picos es el HUD/minimapa.

### Pathfinding

- A* sobre grid de celdas de 2 unidades (`src/game/Pathfinding.ts:100`): 64² en mapas de 128, 96² en 192, 128²
  en 256.
- Reutiliza `gScore`, `cameFrom`, `closed` y un heap binario, pero **rellena la grid completa en cada llamada**
  (`fill(Infinity)`, `fill(-1)`, `fill(0)`, `src/game/Pathfinding.ts:218`).
- `reconstruct()` y `smooth()` **asignan arrays y objetos `{x,z}` por camino**.
- `nearestWalkable()` se usa cuando el origen/destino está bloqueado (hasta radio 12).
- Los repaths son por unidad: 0,5 s (move), 0,6–0,9 s (gather/deliver/build), 0,8 s (attack). No hay throttle
  global ni presupuesto por frame.
- `removeObstacle()` llama a `rebuild()`, que re-rasteriza **todos** los obstáculos.
- **#121:** caché de componentes conexas (`componentAt`, `reachable`, `reachableToNode`) invalidada por
  `revision`; `addObstacle` también la invalida (antes no). `AI.chooseResourceNode` usa la consulta O(1) en
  lugar de A* por candidato. Sigue sin presupuesto, cola ni límite de expansiones.

Medición: A* aleatorio en mapa ≈**0,058–0,075 ms/llamada**, pero en escenario real el **p99 llega a 15,6 ms**
(800 unidades, ventana inicial) y **6,1 ms** en estado estacionario. El microbench de caminos aleatorios
**subestima** el peor caso: los caminos fallidos o largos son los caros. #121 reduce el número de búsquedas
disparadas por la IA, no el coste de una búsqueda individual.

### IA

Fortalezas actuales:

- No hace trampas de recursos; usa `issueOrder`, `Economy` y decisiones con RNG determinista.
- Cadencia escalonada y memoria de percepción (`seenUnits`, TTL 12 s).
- Coste CPU bajo: media 0,15 ms, p99 1,9 ms en 800 unidades sintéticas.

Debilidades medidas:

- `myUnits()`/`myBuildings()`/`soldiers()` **crean arrays filtrados** en cada llamada (`AI.ts:131`), y se llaman
  muchas veces por tick.
- `chooseResourceNode()` (`AI.ts:182`) crea la lista completa de nodos, la ordena por tipo y **antes de #121
  llamaba a A* por cada candidato** hasta encontrar uno alcanzable. En el seed 786: 3.927 llamadas a
  `chooseResourceNode`, 2.907 retornos `null` y **353.014 peticiones A***. Desde #121 usa una consulta O(1) de
  componente conexa, sin falsos negativos respecto a `findApproachPath`.
- `findThreat()` es O(unidades enemigas × anclas) (`AI.ts:574`); `findEnemyWorkerInRange()` recorre todas las
  unidades por soldado (`AI.ts:687`).
- `updatePerception()` recorre todas mis unidades/edificios y **todos** los edificios cada 0,3 s (`AI.ts:626`).
- Un trabajador con orden `GATHER`/`BUILD` que no puede avanzar sigue siendo `isBusy() === true`; desde #121
  abandona la orden tras tres re-ruteos fallidos y la IA puede reasignarlo. La orden deja de re-rutear
  indefinidamente, pero no hay todavía una alerta de UX para el jugador.

### Economía

- `Economy.neededResource()` y `findNearestNode()` recorren todas las unidades/nodos (`src/game/Economy.ts`).
- El flujo es `GATHER → DELIVER → volver`, con `deliverGather` en `src/core/Game.ts:2126`.
- **No hay contador de recursos recolectados** en el juego; la auditoría lo instrumentó con una sonda sobre
  `unitContext.gather`.
- No hay tope de recursos, así que “recursos desperdiciados” no es una métrica válida aquí. Lo que sí se midió
  es **inanición** (comida/madera a 0) y **acumulación desequilibrada** (piedra subiendo mientras comida/madera
  no).

### Combate y proyectiles

- `Unit.updateAttack`/`fireAt` (`src/entities/Unit.ts:782` y `:849`) asignan `Vector3` por disparo y crean malla
  de proyectil por disparo.
- Hay pools para trails/impactos (`updateProjectilePools`), pero no para el proyectil principal.
- No se midió como cuello de botella en las escalas probadas (proyectiles ≈0 en los escenarios de escala; el
  combate de la simulación AI usa principalmente melé).

### Rendering

- **VSM shadows**, materiales PBR por instancia, árboles con `InstancedMesh`, landscape cultural fusionado.
- A 800 unidades (mixed): **15.818 meshes, 14.448 materiales únicos, 3.621 geometrías únicas, 9 instanced
  meshes, 24.237 draw calls, 18,1 M triángulos**.
- `buildModel` clona materiales por instancia (documentado en `docs/development.md:337`). Es la causa principal
  de la ratio materiales/meshes ≈1:1.
- El landscape cumple presupuesto: **8 draw calls** (budget ≤16).
- En SwiftShader el frame es 0,5–2,5 s y el FPS 4. **No es representativo de GPU real.**

### Memoria

- Partículas: pool fijo de 4096, sin crecimiento; `update` recorre el pool completo y `upload` sube los 4
  atributos cuando hay actividad.
- Spatial: `rebuildSpatial` crea buckets/arrays nuevos cada frame; `unitsNear`/`enemiesNear` devuelven arrays
  nuevos.
- Paths: arrays/objetos nuevos por camino; `fireAt` asigna `Vector3`; `Particles.emit` asigna `THREE.Color`.
- **No hay fuga demostrada:** en 3000 pasos a 800 unidades el heap retenido tras GC fue **−10,3 MB**; el bruto
  fue +91,9 MB en 50 s (basura recolectada). Hay churn, pero el GC lo recupera.
- Geometrías/materiales: los conteos de escena son altos por el clonado por instancia, no por duplicación no
  intencional de assets compartidos.

---

## Benchmark methodology

### Herramientas

Se reutilizaron y extendieron las herramientas existentes:

- `scripts/bench.mjs` — escala, escenarios `soldiers` / `mixed` / `mixed-ai`, percentiles, memoria, draw calls,
  escena. Escribe JSON en `review/`.
- `scripts/sim.mjs` — AI-vs-AI determinista, seeds, timeline, economía, primeros soldados/ataques, pérdidas,
  pathfinding. Escribe JSON en `review/`.
- `scripts/perf-probes.mjs` — **nuevo**: envuelve métodos en runtime (sin tocar `src/`) y mide secciones
  (`units`, `ai`, `pathfinding`, `fow`, `hud`, etc.), contadores exactos y conteos.
- `scripts/lib.mjs` — se añadió soporte para `--js-flags=--expose-gc`.

### Escenarios de escala

```bash
yarn bench --units=50,100,200,400,800 --scenario=mixed --seed=777 --steps=600 --runs=3 --gc=1 --fog=1 \
  --out=review/bench-systems.json

yarn bench --units=50,100,200,400,800 --scenario=mixed-ai --seed=777 --steps=600 --runs=2 --gc=1 --fog=1 \
  --out=review/bench-ai-stress.json

yarn bench --units=50,100,200,400,800 --scenario=soldiers --seed=777 --steps=600 --runs=2 --gc=1 --fog=1 \
  --out=review/bench-soldiers.json

yarn bench --units=800 --scenario=mixed --seed=777 --steps=3000 --runs=1 --profile=1 --gc=1 \
  --out=review/bench-800-long.json

# control de sobrecoste de las sondas
yarn bench --units=800 --scenario=mixed --seed=777 --steps=600 --runs=3 --profile=0 --gc=0 \
  --out=review/bench-noprofile-800.json
```

`mixed` incluye bases iniciales, trabajadores, soldados, scouts, órdenes `GATHER`, un cuartel por bando y
órdenes `ATTACK` enfrentadas. `mixed-ai` mantiene ambas IA activas y fija `populationCap=0` para que la
producción no cambie el conteo a mitad de medición (la IA sigue ejecutando todos sus bucles de decisión).
`soldiers` es el control histórico (solo soldados).

### Escenario de IA

```bash
yarn sim --seeds=777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796 \
  --max=1200 --metrics=1 --sample=5 --out=review/ai-bench-20-all.json

# confirmación de bloqueo persistente
yarn sim --seeds=783 --max=2400 --metrics=1 --sample=10 --out=review/ai-seed783-2400.json
```

- Paso fijo 1/60 s, `?noloop=1`, `fog=0`, `low=1`.
- Ambos asientos con IA `normal`.
- Muestreo cada 5 s: unidades, trabajadores, militares, idle, bloqueados, paths activos, combatientes,
  edificios, recursos.
- `stuck` = unidad con **path activo** que se movió <0,5 unidades en 5 s (no cuenta unidades atacando o
  recolectando quietas). `blockedWorkers` = subconjunto de trabajadores.

### Percentiles y memoria

- Percentiles sobre pasos fijos (`n=600` en escala; `n=720` por seed en IA con `sampleEvery=5`).
- Memoria: `performance.memory` en Chromium, con `forceGc()` antes/después; se reporta heap retenido y bruto.
- **Sobrecoste de sondas:** a 800 unidades, 3,91 ms/paso con sondas vs **3,00 ms/paso sin sondas** (medianas de
  3 corridas), ≈+0,9 ms/paso (~30 %). A 200 unidades la diferencia está dentro del ruido. Los totales absolutos
  a 800 están inflados; las proporciones entre secciones siguen siendo válidas.

### Limitaciones

- **SwiftShader no representa una GPU real.** FPS, frame time y `renderMs` son señales relativas; los draw calls
  y triángulos sí son accionables.
- La muestra de frames a 400/800 es de 2–3 frames (cada frame tarda 1,5–2,5 s en software). p95/p99 de frame no
  son robustos.
- `performance.memory` es específico de Chromium y cuantizado; no sustituye a un heap snapshot.
- El microbench A* aleatorio subestima el peor caso; se reporta junto al p99 real.
- El espejo AI-vs-AI es propenso a tablas y sesgo de asiento; se usa como señal de calidad, no como ranking de
  dificultad.
- Las sondas envuelven métodos privados en runtime; están aisladas en `scripts/` y no cambian comportamiento,
  pero dependen de los nombres de método del commit auditado.

---

## Results

### Escala — escenario `mixed` (sin IA), mediana de 3 corridas

| Units | FPS* | Frame ms (avg/p95)* | Sim ms p50/p95/p99 | Path ms p50/p95/p99 | Heap tras GC (Δ retenido) | Draw calls | Triángulos | Units/Wk/Mil | Paths activos | Path req/fail |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 4 | 503/762 | 0,40 / 3,40 / 5,80 | 0,00 / 2,60 / 2,80 | 59,2 MB (Δ4,4) | 1.681 | 1,61 M | 60/26/29 | 47 | 375/51 |
| 100 | 4 | 607/901 | 0,60 / 4,40 / 6,00 | 0,00 / 3,00 / 3,50 | 71,7 MB (Δ15,0) | 3.212 | 2,71 M | 109/46/57 | 92 | 748/60 |
| 200 | 4 | 725/1.084 | 0,70 / 3,00 / 5,60 | 0,00 / 1,50 / 2,30 | 77,4 MB (Δ15,2) | 6.159 | 4,77 M | 210/84/115 | 177 | 1.503/37 |
| 400 | 4 | 786/1.490 | 1,20 / 5,30 / 6,60 | 0,00 / 0,10 / 5,80 | 105,5 MB (Δ32,2) | 12.258 | 9,28 M | 409/159/230 | 345 | 2.982/47 |
| 800 | 4 | 1.273/2.345 | 3,40 / 7,00 / **18,50** | 0,00 / 0,10 / **15,60** | 134,1 MB (Δ38,7) | 24.237 | 18,09 M | 808/312/459 | 698 | 5.917/152 |

\* FPS/frame en SwiftShader: **no representativos de GPU**. La muestra de frame a 800 es de 2 frames.

`renderMs` del pase directo (sin postproceso, `renderer.info` válido): **43,9 ms a 50** y **206,6 ms a 800**
en `mixed`; **234,1 ms a 800** en `mixed-ai`. Son 2–4 frames por muestra: úsese solo como señal relativa de
coste de render en software.

**Estado estacionario a 800 (3000 pasos, 605 unidades tras combate):**

| Métrica | Valor |
|---|---:|
| Sim total mean / p95 / p99 / max | 2,50 / 4,00 / 8,60 / 20,60 ms |
| Units mean / p99 / max | 1,20 / 6,40 / 19,30 ms |
| Pathfinding mean / p99 / max | 0,19 / 6,10 / 16,50 ms |
| HUD mean / p99 / max | 0,27 / 5,80 / 7,30 ms |
| FOW mean | 0,17 ms |
| Heap retenido tras GC | **−10,3 MB** (bruto +91,9 MB en 50 s) |
| Path requests / failures | 29.011 / 1.246 (4,3 %) |

### Escala con IA (`mixed-ai`), mediana de 2 corridas

| Units | Sim p50/p95/p99 | AI p50/p95/p99 | Path p50/p95/p99 | Heap tras GC (Δ) | Draw calls | Path req/fail |
|---:|---:|---:|---:|---:|---:|---:|
| 50 | 0,50 / 4,50 / 6,50 | 0,00 / 0,10 / 0,20 | 0,00 / 1,50 / 1,70 | 77,4 MB (Δ23,5) | 1.998 | 400/27 |
| 100 | 0,70 / 5,30 / 6,70 | 0,00 / 0,10 / 0,40 | 0,00 / 3,00 / 3,40 | 67,3 MB (Δ10,6) | 3.498 | 784/55 |
| 200 | 1,10 / 4,80 / 7,50 | 0,00 / 0,20 / 0,50 | 0,00 / 1,30 / 2,90 | 93,1 MB (Δ30,8) | 6.434 | 1.558/30 |
| 400 | 1,70 / 5,70 / 9,00 | 0,00 / 0,30 / 0,90 | 0,00 / 0,10 / 5,00 | 120,1 MB (Δ46,7) | 12.416 | 3.485/264 |
| 800 | 4,70 / 10,40 / **22,90** | 0,00 / 0,70 / **1,90** | 0,00 / 0,20 / **15,50** | 147,4 MB (Δ51,9) | 24.400 | 7.473/**1.536** |

La IA añade ≈0,15 ms/paso de media y p99 1,9 ms. **No es el coste dominante**; sí lo es la pathfinding que
provoca.

### Desglose a 800 unidades (`mixed`, 600 pasos)

| Sección | Mean (ms) | p95 | p99 | Max |
|---|---:|---:|---:|---:|
| **Total** | **3,90** | 7,00 | **18,50** | 21,80 |
| Unidades | 2,03 | 2,80 | **16,30** | 19,50 |
| Pathfinding | 0,53 | 0,10 | **15,60** | 18,00 |
| HUD | 0,28 | 1,00 | **5,40** | 5,90 |
| FOW | 0,22 | 0,30 | 0,40 | 0,50 |
| Partículas | 0,09 | 0,20 | 0,20 | 0,30 |
| Spatial | 0,07 | 0,20 | 0,20 | 0,20 |
| Cámara | 0,01 | 0,10 | 0,10 | 0,10 |
| Edificios | 0,01 | 0,10 | 0,10 | 0,10 |
| Recursos | 0,01 | 0,10 | 0,10 | 0,10 |
| Población | 0,01 | 0,10 | 0,10 | 0,10 |
| Limpieza | 0,01 | 0,10 | 0,10 | 0,90 |

`pathfinding` y `units` se solapan: A* se ejecuta dentro de `Unit.update`/IA. El pico de unidades **es** el pico
de pathfinding.

### Control `soldiers` (sin economía/combate)

| Units | Sim p50/p95/p99 | Heap tras GC | Draw calls |
|---:|---:|---:|---:|
| 50 | 0,40 / 2,10 / 5,70 | 56,7 MB | 2.115 |
| 100 | 0,60 / 1,90 / 6,30 | 74,8 MB | 3.876 |
| 200 | 0,90 / 2,30 / 6,50 | 83,4 MB | 7.298 |
| 400 | 1,10 / 2,20 / 6,10 | 118,8 MB | 13.979 |
| 800 | 2,20 / 3,70 / 7,20 | 128,0 MB | 27.383 |

Comparación a 800: `soldiers` 2,43 ms/paso vs `mixed` 3,90 ms/paso. **Economía + combate + pathfinding añaden
≈1,5 ms/paso de media y, sobre todo, elevan el p99 de 7,2 a 18,5 ms.**

### Microbenchmarks

| Escala | A* ms/llamada (aleatorio) | `enemiesNear` µs/llamada | `pickAt` ms/llamada |
|---:|---:|---:|---:|
| 50 | 0,058 | 1,0 | 0,05 |
| 100 | 0,058 | 1,0 | 0,06 |
| 200 | 0,058 | 1,0 | 0,08 |
| 400 | 0,058 | 1,0 | 0,15 |
| 800 | 0,058–0,075 | 1,0 | **0,32** |

`pickAt` es O(N) y crece con las unidades; `enemiesNear` usa el spatial grid y se mantiene plano.

### Auditoría de escena a 800 (`mixed`)

| Métrica | Valor |
|---|---:|
| Meshes | 15.818 |
| InstancedMesh | 9 |
| Points | 2 |
| Grupos | 6.915 |
| Geometrías únicas | 3.621 |
| Materiales únicos | **14.448** |
| Usos de geometría | 15.818 |
| Usos de material | 15.818 |
| Duplicados top (geometría) | 1.618, 404, 313, 313, 249, 249 |
| Duplicados top (material) | 819, 147, 144, 84, 42, 40 |

**Lectura:** hay ≈1 material por mesh. El coste de memoria/render viene del clonado por instancia, no de
assets sin cachear. Los árboles sí están instanciados.

---

## AI Results

### 20 seeds, normal vs normal, cap 1200 s

| Seed | Winner | Duration | First Soldier (P0/P1) | First Attack (P0/P1) | Workers/Military total | Buildings | Gathered P0/P1 | Path req/fail |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 777 | — | 1200 | 338 / 285 | 341 / 285 | 13 / 24 | 15 | 3392 / 2093 | 12.050 / 2.423 |
| 778 | — | 1200 | 263 / 351 | 264 / 351 | 17 / 33 | 23 | 2405 / 2557 | 75.690 / 63.881 |
| 779 | — | 1200 | 1060 / 511 | 1060 / 511 | 14 / 6 | 10 | 1461 / 1377 | 213.079 / 199.406 |
| 780 | — | 1200 | 983 / — | — / — | 11 / 3 | 6 | 1582 / 998 | 285.287 / 267.825 |
| 781 | — | 1200 | — / 279 | — / 279 | 15 / 6 | 10 | 818 / 2741 | 94.660 / 83.410 |
| 782 | — | 1200 | 819 / — | 819 / — | 9 / 11 | 11 | 2422 / 665 | 40.236 / 24.106 |
| 783 | — | 1200 | — / — | — / — | 8 / **0** | 3 | **430 / 0** | 25.520 / 8.456 |
| 784 | — | 1200 | — / 325 | — / 339 | 11 / 5 | 18 | 1228 / 2465 | 78.794 / 69.653 |
| 785 | — | 1200 | 344 / 505 | 344 / 505 | 12 / 5 | 14 | 1914 / 2130 | 16.255 / 1.420 |
| 786 | — | 1200 | — / 380 | — / 380 | 9 / 7 | 7 | 1002 / 1879 | **353.014 / 346.425** |
| 787 | **1** | 839 | — / 259 | — / 259 | 14 / 11 | 10 | 881 / 1824 | 12.422 / 262 |
| 788 | — | 1200 | — / 893 | — / 894 | 11 / 4 | 6 | 637 / 1970 | 205.213 / 146.789 |
| 789 | — | 1200 | — / 271 | — / 271 | 12 / 5 | 6 | 2001 / 1410 | 167.931 / 145.785 |
| 790 | **1** | 977 | — / 283 | — / 304 | 12 / 11 | 15 | 780 / 1811 | 13.258 / 206 |
| 791 | — | 1200 | 818 / 332 | 818 / 335 | 15 / 11 | 13 | 2472 / 1265 | 21.813 / 8.334 |
| 792 | **1** | 882 | — / 385 | — / 385 | 22 / 12 | 9 | 1589 / 1572 | 60.090 / 53.109 |
| 793 | **0** | 975 | 256 / — | 643 / — | 12 / 9 | 8 | 1804 / 1163 | 154.051 / 138.478 |
| 794 | — | 1200 | 311 / 286 | 313 / 291 | 12 / 30 | 18 | 3450 / 2863 | 198.912 / 181.380 |
| 795 | — | 1200 | — / 385 | — / 625 | 12 / 11 | 11 | 843 / 2793 | 67.066 / 55.966 |
| 796 | — | 1200 | 705 / — | 1061 / — | 9 / 9 | 9 | 2262 / 10 | 117.922 / 94.826 |

`—` = no produjo soldado / no lanzó ataque dentro del cap.

`Workers/Military total` cuenta unidades creadas por `unitSpawn` en ambos bandos (no incluye los trabajadores
iniciales). `Buildings` cuenta edificios nuevos (excluye la base inicial). `Gathered` es el total recolectado por
cada bando en los 1200 s.

### Agregados

| Métrica | Valor |
|---|---:|
| Victorias P0 / P1 / sin terminar | **1 / 3 / 16** |
| Partidas decisivas | 4/20 (20 %) |
| Duración mediana | 1200 s (cap) |
| P0 sin soldado | **10/20** |
| P1 sin soldado | **5/20** |
| P0 sin ataque | **11/20** |
| P1 sin ataque | 5/20 |
| Primer soldado (mediana, cuando existe) | P0 **524 s**, P1 **332 s** |
| Primer ataque (mediana, cuando existe) | P0 **643 s**, P1 **339 s** |
| Primer cuartel (mediana) | **240 s** |
| Trabajadores creados (mediana, ambos bandos) | 12 |
| Militares creados (mediana, ambos bandos) | 9 |
| Edificios creados (mediana) | 10 |
| Recursos recolectados P0/P1 (mediana) | **1.585 / 1.818** en 1200 s |
| Path requests / failures (mediana) | **77.242 / 66.767 (86 %)** |
| `chooseResourceNull` (mediana) | **1.114** |
| `blockedWorkers` máx (mediana) | **13** |
| Idle workers máx (mediana) | 4 |
| Bajas de unidades P0/P1 (total 20 seeds) | 116 / 45 |
| Bajas de edificios P0/P1 | 37 / 17 |
| AI mean / p99 (mediana por seed) | 0,004 / 0,10 ms |
| AI max (peor seed) | 10,7 ms |
| Sim total p99 (mediana por seed) | 0,8 ms; max 170 ms (arranque) |

### Hallazgos de comportamiento

- **Las partidas decisivas son unilaterales.** En 787, 790, 792 y 793 el ganador **no perdió ninguna unidad**;
  el perdedor no había formado ejército o perdió todos sus edificios. No son victorias por calidad táctica,
  sino por fallo económico del rival.
- **Seed 783 es un bloqueo permanente.** A 2400 s: P0 sigue con **comida 0 y madera 0**, 16 trabajadores,
  9–10 con path activo sin avanzar, 5.106 órdenes `GATHER`, solo 66 entregas, 53.077 peticiones A* y 17.494
  fallos. Nunca construye cuartel ni produce soldado. P1 tampoco produce soldado. La partida no termina.
- **Seed 786 es la peor tormenta de pathfinding:** 353.014 peticiones, 346.425 fallos, 2.907
  `chooseResourceNull`, P0 con madera 0 durante toda la partida.
- **No es solo lentitud:** la IA toma decisiones, pero no puede ejecutar el flujo económico porque los
  trabajadores no llegan a los nodos. El síntoma “trabajador busy pero atascado” explica por qué
  `manageWorkers` no los reasigna.

---

## P0 remediation (implemented after the audit)

Después del diagnóstico se implementó un fix **mínimo** para el bloqueo económico, sin reescribir la generación
de mapas ni el sistema de pathfinding:

| Archivo | Cambio |
|---|---|
| `src/game/Pathfinding.ts` | `findApproachPath` (punto de apoyo dentro del rango de recolección), `componentSizeAt`, `revision` |
| `src/entities/Unit.ts` | `HARVEST_RANGE`/`HARVEST_STAND_RANGE`; fallback de aproximación **sólo** cuando el path normal y el paso directo fallan |
| `src/game/AI.ts` | `chooseResourceNode` valida con `findApproachPath`; caché de nodos inalcanzables por revisión de grid; presupuesto de 6 sondas por tick |
| `src/core/Game.ts` | expone `findApproachPath` en `UnitContext` |
| tests | `tests/pathfinding.test.ts`, seed 783 en `tests/e2e/ai.spec.ts`, guardia de recursos ambientales |

No se cambió la generación de bases ni el balance: un intento de reubicar recursos/base se revirtió porque
rompía tests existentes de apertura de la IA.

### Antes / después (20 seeds, normal vs normal, 1200 s)

| Métrica | Baseline | Después P0 |
|---|---:|---:|
| Partidas decisivas | **4/20** (P0 1, P1 3) | **8/20** (P0 3, P1 5) |
| Sin terminar | 16/20 | 12/20 |
| P0 sin soldado | 10/20 | **4/20** |
| P1 sin soldado | 5/20 | **9/20** |
| Primer soldado mediana P0/P1 | 524 s / 332 s | **342 s / 374 s** |
| Primer ataque mediana P0/P1 | 643 s / 339 s | **403 s / 376 s** |
| Path requests mediana | 77.242 | **56.644** (−27 %) |
| Path failures mediana | 66.767 (86 %) | **52.039 (92 %)** |
| `blockedWorkersMax` mediana | 13 | 13 |
| Seed 783 | sin soldado | P0 soldado 592 s; P1 sin soldado; sin terminar |
| Seed 793 | ambos sin soldado | P0 soldado 293 s; P1 sin soldado; sin terminar |
| Seed 777 | P0 sin soldado, P1 285 s | P0 364 s, P1 268 s |

**Lectura honesta:** el bloqueo extremo (seed 783, 793) se mitigó y las partidas decisivas se duplicaron, pero
**P0 no está cerrado**:

- 4/20 seeds siguen con P0 sin soldado y 9/20 con P1 sin soldado.
- Los fallos de pathfinding siguen siendo ~92 % de las peticiones (aunque hay 27 % menos peticiones absolutas).
- `blockedWorkersMax` no cambió (13): la detección de trabajadores bloqueados no forma parte del fix mínimo.
- Persisten nodos iniciales inalcanzables (los logs de `resource-reachability` los muestran); la IA los evita y
  busca otros, pero a veces no hay madera suficiente para el cuartel.

### Verificación

- `yarn verify:fast` (typecheck + lint + format + unit + build): OK.
- E2E dirigidos: 36/36 (economía, movement-safety, AI completo, skirmish, resource-reachability).
- `tests/pathfinding.test.ts`: 18/18.
- Nuevo test AI seed 783 (600 s simulados): OK.

### Seguimiento #121

El PR #121 (#120) añadió la caché de componentes, la consulta O(1) de alcanzabilidad y el abandono de órdenes
económicas atascadas. La tabla de la sección "Estado tras #121" resume el resultado. La lectura honesta es:

- El bloqueo extremo se reduce y las entregas suben, pero **AI-1 no está cerrado**: sigue habiendo seeds con
  un bando sin soldado y la economía depende de que exista un nodo alternativo alcanzable.
- **PATH-1 tampoco está cerrado**: `pathRequests` no baja porque la mayoría vienen de los `setPath` de las
  unidades; faltan presupuesto/cola por frame, límite de expansiones y caché de búsquedas fallidas.
- `blockedWorkersMax` ya era ~2 con la métrica corregida; el 13 de la auditoría era en gran parte un artefacto
  de medición (unidades detenidas en un nodo conservaban el array `path`). El give-up de #121 es una red de
  seguridad que rara vez dispara en AI-vs-AI.
- La UX de trabajador bloqueado (UX-1) está resuelta: alerta con motivo, selección al hacer clic y
  deduplicación (ver UX-1).

**Siguiente trabajo P0/P1:** presupuesto/cola de pathfinding, límite de expansiones y caché de búsquedas
fallidas (PATH-1); reubicación/validación de recursos iniciales cuando no exista alternativa alcanzable;
compromiso de ataque de la IA (AI-2).

## Bottlenecks

### 🔴 Crítico

1. **Bloqueo económico de la IA por alcanzabilidad de recursos (mitigado parcialmente en #121).**
   - Evidencia baseline: seed 783 a 2400 s (comida/madera 0, sin cuartel/soldado); 10/20 seeds con P0 sin
     soldado; 5/20 con P1 sin soldado; `blockedWorkers` máx mediana 13 (métrica después corregida a ~2).
   - Tras #121: 8/20 partidas decisivas, llamadas A* de `chooseResourceNode` −27 %, entregas +16 %. Sigue
     habiendo seeds con un bando sin soldado y nodos sin alternativa alcanzable.
   - Archivos: `src/game/AI.ts:182` (`chooseResourceNode`), `:147` (`manageWorkers`),
     `src/entities/Unit.ts:885` (`updateGather`), `src/game/Economy.ts`.
   - Impacto: la partida no arranca económicamente; no hay ejército; no hay victoria.

2. **Tormenta de peticiones A* y fallos de ruta (mitigado parcialmente en #121).**
   - Evidencia baseline: mediana 77.242 peticiones / 66.767 fallos (86 %); seed 786 353.014 / 346.425 (98 %);
     `mixed-ai` 800: 1.536 fallos de 7.473 (20,6 %).
   - Tras #121: menos búsquedas desde `chooseResourceNode`, pero `pathRequests` totales no bajan porque
     dominan los `setPath` de las unidades. Faltan presupuesto/cola, límite de expansiones y caché de fallos.
   - Archivos: `src/game/Pathfinding.ts:185`, `src/game/AI.ts:229`, `src/entities/Unit.ts:742`/`:809`.
   - Impacto: bloquea trabajadores, dispara picos de CPU y hace que la IA tome decisiones sobre rutas que
     luego fallan.

3. **La IA no convierte economía en victoria (estancamiento).**
   - Evidencia baseline: 16/20 partidas sin terminar; primer ataque P0 643 s (cuando ocurre); 11/20 seeds sin
     ataque P0; las 4 victorias fueron unilaterales. Tras #121: 8/20 decisivas, 12/20 sin terminar.
   - Archivos: `src/game/AI.ts:451` (`microCombat`), `:718` (`launchAttack`), `:735` (`findAttackTarget`).
   - Impacto: no se cumple el bucle RTS “economía → ejército → ataque → victoria”. Es el P1 principal que queda.

### 🟠 Importante

4. **Peores casos de A* (spikes).**
   - Evidencia: path p99 **15,6 ms** y units p99 **16,3 ms** a 800 en la ventana inicial; estado estacionario
     6,1/8,6 ms; max 20,6 ms. El microbench aleatorio (0,058 ms) subestima el peor caso.
   - Archivos: `src/game/Pathfinding.ts:218` (fills completos), `:292` (`reconstruct`), `:308` (`smooth`).
   - Impacto: hitches por encima del presupuesto de 16,6 ms en el arranque de escenarios grandes.

5. **Pico periódico del HUD/minimapa.**
   - Evidencia: HUD p99 **5,4 ms** (mixed) y **6,3 ms** (mixed-ai) a 800; media 0,28–0,35 ms; redibujo cada
     0,15 s.
   - Archivos: `src/ui/HUD.ts:1781`, `renderMinimap`, `renderBottomIfChanged`.
   - Impacto: hitches periódicos incluso cuando la simulación va sobrada.

6. **Escalado de render y materiales por instancia.**
   - Evidencia: 24.237 draw calls, 18,1 M triángulos, 14.448 materiales únicos a 800; SwiftShader 4 FPS.
   - Archivos: `src/model/ProceduralModel.ts` (`buildModel`/clone), `src/entities/EntityView.ts`,
     `src/core/Game.ts` (creación de unidades/edificios).
   - Impacto: riesgo de GPU y memoria; **pendiente de validación con GPU real**.

### 🟡 Moderado

7. **Picking O(N) en hover.**
   - Evidencia: `pickAt` 0,318 ms/llamada a 800 vs 0,05 ms a 50.
   - Archivos: `src/core/Game.ts:1436`.
   - Impacto: latencia de hover/selección en partidas grandes; no afecta al paso de simulación.

8. **Churn de asignaciones (sin fuga).**
   - Evidencia: bruto +91,9 MB en 50 s a 605 unidades; retenido tras GC **−10,3 MB**. No hay fuga, pero hay
     mucha basura.
   - Archivos: `Game.rebuildSpatial`, `unitsNear`/`enemiesNear`, `Unit.fireAt`, `Particles.emit`,
     `Pathfinding.reconstruct/smooth`.
   - Impacto: posible GC en partidas largas; no demostrado como hitch en esta auditoría.

9. **Sobrecoste de las sondas (metodológico).**
   - Evidencia: 3,91 vs 3,00 ms/paso a 800 (~30 %); a 200 dentro del ruido.
   - Impacto: solo afecta a la medición; no al juego.

### 🟢 Correcto

- **FOW**: 0,22–0,28 ms a 800; `decay`/`upload` no son cuello de botella.
- **Spatial grid**: 0,07 ms a 800; reconstrucción por frame aceptable.
- **Población/limpieza/victoria/edificios/recursos**: ≤0,02 ms cada uno.
- **Partículas**: 0,09 ms de media a 800; pool fijo de 4096 sin crecimiento.
- **Cadencia de IA**: media 0,15 ms, p99 1,9 ms; el escalonado funciona.
- **Árboles instanciados**: 9 `InstancedMesh`; correcto.
- **Landscape cultural**: 8 draw calls, presupuesto ≤16; correcto.
- **Pathfinder**: reutiliza arrays tipados y heap; la estructura no es el problema, lo es el volumen/peor caso.
- **Modelos fusionados por material**: reducen draw calls frente al baseline histórico (~34/unidad siguen
  siendo muchos, pero el enfoque es correcto).

---

## Recommended optimizations

Ordenadas por impacto, riesgo y complejidad. **No implementar todavía.**

| # | Optimización | Impacto | Riesgo | Complejidad | Evidencia |
|---:|---|---|---|---|---|
| 1 | Caché de alcanzabilidad por nodo/base + detección y reasignación de trabajadores bloqueados | Muy alto | Medio | Media | seed 783, 10/20 P0 sin soldado, `blockedWorkers` 13 |
| 2 | Presupuesto/cola de pathfinding por frame + límite de expansiones A* + caché de rutas a nodos estáticos | Muy alto | Medio | Media-alta | 86–98 % de fallos, p99 15,6 ms |
| 3 | IA de compromiso de ataque: atacar en grupo, objetivo alcanzable, detección de ejército atascado | Alto | Medio-alto | Alta | 16/20 tablas, primer ataque 643 s P0 |
| 4 | Throttle/skip del minimapa y escrituras DOM del HUD | Medio | Bajo | Baja | HUD p99 5,4–6,3 ms |
| 5 | Validación en GPU real y, después, instancing/materiales compartidos con copy-on-write | Alto en GPU | Alto | Alta | 24k draws, 14.448 materiales |
| 6 | Índice espacial para picking o throttle de hover | Medio-bajo | Bajo | Media | `pickAt` 0,32 ms a 800 |
| 7 | Reducir asignaciones (arrays reutilizables, pools de paths/vectores/colores) | Medio | Bajo-medio | Media | bruto 91,9 MB/50 s |
| 8 | Gate de rendimiento en CI/nightly con los JSON de `bench`/`sim` | Medio | Bajo | Baja | no existe job de rendimiento |

**No hacer todavía:** ECS, Web Workers, Simulation LOD, reescritura de `Game.ts`, reemplazo de A*, rebalanceo
económico, cambios de rendering sin GPU.

---

## Things NOT to change yet

Estas partes **funcionan correctamente** en las mediciones y no justifican refactor:

1. **`Game.update`/`Game.ts` completo.** La simulación media es 3,0 ms/paso sin sondas y 3,9 ms con sondas a
   800; el problema son picos localizados de pathfinding, no la estructura monolítica.
2. **ECS / Web Workers / Simulation LOD.** No hay evidencia de que el coste medio lo requiera. Introducirlos
   ahora añadiría riesgo y complejidad sin resolver el bloqueo económico.
3. **FOW.** ≈0,22 ms a 800; `decay`/`upload` completos no son un problema medido.
4. **Spatial grid.** ≈0,07 ms; reconstruir por frame es aceptable a estas escalas.
5. **Población, limpieza, victoria, edificios, recursos.** ≤0,02 ms cada uno.
6. **Sistema de partículas.** Pool fijo y ≈0,09 ms; no necesita rediseño.
7. **Cadencia de la IA.** El escalonado funciona; el coste de `AI.update` es bajo. El problema es
   `chooseResourceNode`/pathfinding y la falta de compromiso de ataque, no la frecuencia.
8. **Estructuras del pathfinder.** Los arrays tipados y el heap reutilizado están bien; no reemplazar A* antes
   de medir el efecto de cachear/limitar peticiones.
9. **Balance económico.** No tocar tasas ni costes hasta arreglar alcanzabilidad; el problema es que los
   trabajadores no llegan, no que recolecten poco por segundo.
10. **Rendering.** No cambiar materiales/instancing sin una pasada en GPU real; SwiftShader no permite concluir.

---

## Proposed issues

> Esta es la lista propuesta basada en problemas medidos. AI-1, PATH-1 y ARCH-1 se atendieron **parcialmente**
> en #120/#121; el resto sigue como backlog. No se presenta ninguna propuesta como ya resuelta si solo se
> mitigó.

### PERF

#### PERF-1 — Gate de rendimiento en CI/nightly
- **Problema:** no hay job que ejecute `bench`/`sim` ni compare umbrales; las regresiones pasan desapercibidas.
- **Evidencia:** CI actual solo corre typecheck/lint/format/test/build y E2E; `bench`/`sim` no están en
  `.github/workflows/`.
- **Archivos:** `.github/workflows/ci.yml`, `scripts/bench.mjs`, `scripts/sim.mjs`, `scripts/perf-probes.mjs`.
- **Impacto:** regresiones de CPU/IA/economía no detectadas.
- **Solución:** job nightly que ejecute 50/200/800 + 10 seeds y publique `review/*.json`; comparar p99 y
  métricas AI contra baseline.
- **Aceptación:** artifact nightly con JSON; alerta si sim p99 +20 %, path failures +20 % o partidas decisivas
  −20 %.
- **Tests:** ejecución del workflow; validación del JSON.

#### PERF-2 — Pico periódico del HUD/minimapa
- **Problema:** `HUD.update` redibuja el minimapa cada 0,15 s y escribe DOM cada frame; p99 5,4–6,3 ms a 800.
- **Evidencia:** `hud` p99 5,4 ms (mixed) y 6,3 ms (mixed-ai); media 0,28–0,35 ms.
- **Archivos:** `src/ui/HUD.ts:1781`, `renderMinimap`, `renderBottomIfChanged`.
- **Impacto:** hitches periódicos visibles incluso con sim <8 ms.
- **Solución:** throttle a 0,25–0,5 s, saltar si no cambió el estado, evitar `querySelector` por frame y
  reutilizar nodos.
- **Aceptación:** `hud` p99 <1 ms a 800; sin regresión visual/E2E.
- **Tests:** `tests/e2e/hud-labels.spec.ts`, `hud-identity.spec.ts`, `visual:check`, bench.

#### PERF-3 — Escalado de draw calls/materiales por instancia
- **Problema:** 24.237 draw calls, 18,1 M triángulos y 14.448 materiales únicos a 800; ≈1 material por mesh.
- **Evidencia:** auditoría de escena a 800; top material duplicates 819/147/144; `buildModel` clona materiales.
- **Archivos:** `src/model/ProceduralModel.ts`, `src/entities/EntityView.ts`, `src/core/Game.ts`.
- **Impacto:** riesgo de GPU/memoria; en SwiftShader 4 FPS (no concluyente).
- **Solución:** primero medir en GPU real; después instancing/LOD y materiales compartidos con copy-on-write
  para los casos que no necesitan tinte por instancia.
- **Aceptación:** validación GPU a 200/400/800; reducción de draw calls ≥40 % sin cambiar el look.
- **Tests:** `tests/visual/baseline.json`, `visual:check`, `bench`, `renderer.spec.ts`.

#### PERF-4 — Picking O(N) en hover
- **Problema:** `pickAt` recorre proxies y cuesta 0,318 ms/llamada a 800.
- **Evidencia:** microbench 0,05 ms (50) → 0,32 ms (800).
- **Archivos:** `src/core/Game.ts:1436`.
- **Impacto:** latencia de hover/selección; no afecta a la simulación.
- **Solución:** índice espacial de proxies o throttle de hover a 20–30 Hz.
- **Aceptación:** `pickAt` <0,1 ms a 800; selección E2E sin regresión.
- **Tests:** `tests/e2e/picking.spec.ts`, `input.spec.ts`, `selection-panel.spec.ts`.

#### PERF-5 — Churn de asignaciones / GC
- **Problema:** +91,9 MB brutos en 50 s a 605 unidades; retenido tras GC −10,3 MB (no hay fuga, pero hay
  mucha basura).
- **Evidencia:** `bench-800-long.json`; arrays nuevos en `unitsNear`/`enemiesNear`, `rebuildSpatial`, paths,
  `fireAt`, `Particles.emit`.
- **Archivos:** `src/core/Game.ts:2069`/`:2088`/`:2111`, `src/entities/Unit.ts:849`,
  `src/game/Pathfinding.ts:292`.
- **Impacto:** posible GC en partidas largas; no demostrado como hitch.
- **Solución:** arrays reutilizables con buffers por frame, pools de `Vector3`/`Color` y de paths.
- **Aceptación:** bruto <30 MB/50 s a 600 unidades; sin pausas GC >4 ms.
- **Tests:** bench de memoria, perfil de GC.

### AI

#### AI-1 — Bloqueo económico por recursos inalcanzables (P0) — **mitigado parcialmente en #121**
- **Problema:** la IA asigna trabajadores a nodos que no puede alcanzar; el trabajador queda “busy” con path
  activo, no avanza y no se reasigna.
- **Estado:** #121 añadió caché de alcanzabilidad O(1) y abandono de órdenes atascadas. No cierra la issue:
  sigue habiendo seeds con un bando sin soldado y recursos sin alternativa alcanzable.
- **Evidencia:** seed 783 a 2400 s: comida/madera 0 desde t≈240 s, 9–10 trabajadores bloqueados, 5.106 GATHER,
  66 entregas, sin cuartel/soldado. 10/20 seeds P0 sin soldado; 5/20 P1 sin soldado.
- **Archivos:** `src/game/AI.ts:147` (`manageWorkers`), `:182` (`chooseResourceNode`), `:229` (A* por
  candidato); `src/entities/Unit.ts:885` (`updateGather`); `src/game/Economy.ts`.
- **Impacto:** bloquea la economía y el ejército; impide terminar partidas.
- **Solución:** caché de alcanzabilidad por nodo/base, marcar nodos inalcanzables, no llamar A* por candidato;
  detectar trabajadores con path activo sin progreso y reasignar; timeout de recolección.
- **Aceptación:** 20/20 seeds con primer soldado <300 s; `blockedWorkersMax` <10 % de trabajadores; ≥80 % de
  partidas terminadas <1200 s.
- **Tests:** `yarn sim` 20 seeds; `tests/e2e/resource-reachability.spec.ts`; nuevo test de trabajador bloqueado.

#### AI-2 — Estancamiento y falta de ataque coordinado
- **Problema:** la IA acumula economía/ejército pero no lo convierte en victoria; 16/20 tablas.
- **Evidencia:** primer ataque P0 643 s (cuando existe), 11/20 seeds sin ataque P0, 16/20 sin terminar; las 4
  victorias fueron unilaterales.
- **Archivos:** `src/game/AI.ts:451` (`microCombat`), `:718` (`launchAttack`), `:735` (`findAttackTarget`).
- **Impacto:** la partida no progresa; el jugador no recibe presión.
- **Solución:** ataque en grupo, objetivo alcanzable, defensa mínima en base, detección de ejército atascado y
  re-target; medir contra `ScriptedPlayer`.
- **Aceptación:** ≥70 % de partidas decisivas <1200 s; primer ataque <300 s en ≥80 % seeds; ejército llega a
  la base enemiga.
- **Tests:** `yarn sim` (mirror y `--player=scripted`), `tests/e2e/ai.spec.ts`, `skirmish-winnable.spec.ts`.

### ECONOMY

#### ECO-1 — Inanición de comida/madera y reparto desequilibrado
- **Problema:** con trabajadores “ocupados”, la IA puede quedarse sin comida/madera mientras acumula piedra.
- **Evidencia:** seed 783: comida/madera 0, piedra 540, 66 entregas en 2400 s; seed 786: P0 madera 0 toda la
  partida; mediana recolectada P0 1.585 en 1200 s.
- **Archivos:** `src/game/AI.ts:182`, `src/game/Economy.ts:13`/`:52`, `src/entities/Unit.ts:885`.
- **Impacto:** sin madera no hay cuartel; sin comida no hay trabajadores/soldados.
- **Solución:** reservar madera para cuartel, priorizar el recurso en 0, asignar varios trabajadores al recurso
  crítico y verificar dropsite/alcanzabilidad.
- **Aceptación:** ningún recurso crítico a 0 durante >60 s con trabajadores disponibles; cuartel <240 s; primer
  soldado <300 s.
- **Tests:** sim 20 seeds; `tests/e2e/economy.spec.ts`; resource reachability.

### PATH

#### PATH-1 — Tormenta de peticiones A* y fallos (P0) — **mitigado parcialmente en #121**
- **Problema:** la IA y las unidades emiten muchas más peticiones de las necesarias; la mayoría falla.
- **Estado:** #121 eliminó el A* por candidato en `chooseResourceNode`; las peticiones totales no bajan porque
  dominan los `setPath` de las unidades. Faltan presupuesto/cola, límite de expansiones y caché de fallos.
- **Evidencia:** mediana baseline 77.242/66.767 (86 %); seed 786 353.014/346.425 (98 %); mixed-ai 800
  1.536/7.473 (20,6 %).
- **Archivos:** `src/game/Pathfinding.ts:185`, `src/game/AI.ts:229`, `src/entities/Unit.ts:742`/`:809`.
- **Impacto:** bloquea trabajadores y causa picos de CPU.
- **Solución:** presupuesto por frame, cola de peticiones, caché de rutas a nodos estáticos, límite de
  expansiones, no repetir búsquedas fallidas en el mismo tick.
- **Aceptación:** fallos <10 % en 20 seeds; peticiones −50 %; p99 path <8 ms a 800.
- **Tests:** `tests/pathfinding.test.ts`, `yarn sim` counters, `movement-safety.spec.ts`.

#### PATH-2 — Peores casos de A* (spikes)
- **Problema:** el coste medio es bajo, pero hay búsquedas de 15–18 ms.
- **Evidencia:** path p99 15,6 ms y units p99 16,3 ms a 800; max 20,6 ms; microbench aleatorio 0,058 ms.
- **Archivos:** `src/game/Pathfinding.ts:218` (fills), `:292`, `:308`.
- **Impacto:** hitches por encima de 16,6 ms en el arranque de escenarios grandes.
- **Solución:** generación incremental en vez de `fill` completo, límite de nodos expandidos, búsqueda
  bidireccional o jerárquica si hace falta, presupuesto de tiempo.
- **Aceptación:** path p99 <4 ms a 800; ningún paso >16,6 ms; sin regresión de rutas.
- **Tests:** bench 800, `pathfinding.test.ts`, `movement-safety.spec.ts`.

### UX

#### UX-1 — Feedback de trabajadores bloqueados / recursos inalcanzables — **resuelto**
- **Problema:** el jugador ve trabajadores “ocupados” que no producen; no hay señal clara de bloqueo.
- **Evidencia:** seed 783, 9–10 trabajadores con path activo sin avanzar; no había alerta de trabajador bloqueado.
- **Solución:** `Unit` emite una alerta por orden con `unitId`, `reason` y `order` para `no-route`, `stuck` y
  `no-dropsite`; el HUD la muestra con el motivo y, al hacer clic, selecciona y enfoca al trabajador. Se
  deduplica por unidad/motivo durante seis segundos.
- **Aceptación:** alerta visible en <5 s de bloqueo; sin spam.
- **Tests:** `tests/e2e/blocked-workers.spec.ts` (give-up, alerta única + selección, motivo de recurso inaccesible).
- **Evidencia:** [`blocked-worker-alert.webp`](../media/blocked-worker-alert.webp) (alerta real, trabajador seleccionado).

### ARCH

#### ARCH-1 — Servicio de alcanzabilidad/caché de rutas — **parcialmente implementado en #121**
- **Problema:** la alcanzabilidad se calcula repetidamente con A* en varios sistemas (IA, trabajadores,
  edificios).
- **Estado:** #121 añadió componentes conexas e invalidación por `revision`; `chooseResourceNode` ya no llama
  A* por candidato. Queda extenderlo a trabajadores/edificios y cachear búsquedas fallidas.
- **Evidencia:** 353k peticiones en seed 786; antes de #121 `chooseResourceNode` llamaba A* por candidato.
- **Archivos:** `src/game/Pathfinding.ts`, `src/game/AI.ts`, `src/game/Economy.ts`.
- **Impacto:** coste y duplicación; raíz de PATH-1/AI-1.
- **Solución:** componente/caché por región y por nodo, invalidado al añadir/quitar obstáculos; consulta O(1)
  para “¿es alcanzable desde esta base?”.
- **Aceptación:** una sola validación por nodo/base hasta que cambie el grid; peticiones A* −50 %.
- **Tests:** unit tests de caché + invalidación; sim counters.

#### ARCH-2 — Presupuestos de simulación y perfilador opt-in
- **Problema:** no hay presupuesto por sistema ni un medidor permanente; las regresiones se detectan tarde.
- **Evidencia:** esta auditoría necesitó una capa externa de sondas; no había métricas por sistema.
- **Archivos:** `scripts/perf-probes.mjs`, `scripts/bench.mjs`, `scripts/sim.mjs`.
- **Impacto:** dificulta mantener el rendimiento.
- **Solución:** mantener el perfilador opt-in y añadir presupuestos (pathfinding, HUD) al gate nightly.
- **Aceptación:** JSON con percentiles por sistema; alertas por presupuesto.
- **Tests:** CI nightly.

---

## Prioridad final

| Prioridad | Área | Problema | Evidencia | Impacto | Esfuerzo |
|---|---|---|---|---|---|
| **P0 (mitigado)** | AI/ECONOMY | Bloqueo económico por recursos inalcanzables | Baseline 10/20 P0 sin soldado → **4/20** tras P0; seed 783 soldado 592 s | Bloquea partidas | Medio |
| **P0 (mitigado)** | PATH | Tormenta de A* y fallos de ruta | 77k→57k requests; fallos 86 %→92 %; seed 786 353k/346k | Sigue bloqueando parte de la economía | Medio |
| **P1** | AI | Estancamiento: 12/20 tablas tras P0; ejército no ataca | Primer ataque P0 403 s; 4/20 P0 sin soldado | Calidad RTS | Alto |
| **P1** | PERF | Peores casos de A* | Path p99 15,6 ms; units p99 16,3 ms a 800 | Hitches | Medio |
| **P1** | PERF/UX | Pico del HUD/minimapa | HUD p99 5,4–6,3 ms a 800 | Hitches periódicos | Bajo |
| **P1** | PERF | Draw calls/materiales por instancia | 24.237 draws, 14.448 materiales a 800 | Riesgo GPU (pendiente GPU real) | Alto |
| **P2** | PERF/UX | Picking O(N) en hover | 0,318 ms/llamada a 800 | Latencia de selección | Bajo-medio |
| **P2** | PERF | Churn de asignaciones/GC | +91,9 MB brutos/50 s; retenido −10,3 MB | Riesgo de GC | Medio |
| **P2** | ARCH | Falta gate de rendimiento en CI | No hay job de bench/sim | Regresiones silenciosas | Bajo |
| **P3** | ARCH | Micro-optimizar FOW/spatial/población | 0,22/0,07/0,01 ms | Ninguno ahora | Alto (no hacer) |

**Estado tras #121:** los dos P0 se redujeron pero no se cerraron (8/20 partidas decisivas; siguen habiendo
seeds con un bando sin soldado; `pathRequests` totales no bajan). El siguiente paso es el presupuesto/cola de
pathfinding y la caché de búsquedas fallidas (PATH-1), la reubicación/validación de recursos iniciales cuando
no exista alternativa alcanzable, el compromiso de ataque (AI-2).
No hay P0 de rendering ni de memoria: el render no se puede juzgar sin GPU y la memoria no muestra fuga.

---

## Criterio de éxito — respuestas con datos

### 1. ¿Cuántas unidades soporta actualmente el juego?

- **50/100/200:** sí, con margen. Sim p99 5,6–6,0 ms (IA incluida 6,5–6,7 ms).
- **400:** sí, con vigilancia. Sim p99 6,6 ms (mixed) y 9,0 ms (mixed-ai); path p99 5,8 ms.
- **800:** **condicional**. Media 3,9 ms con sondas / 3,0 ms sin sondas; p99 18,5 ms en la ventana inicial de
  10 s y 8,6 ms en estado estacionario con 605 unidades. La CPU aguanta la media, pero los picos superan el
  presupuesto de 16,6 ms. El render (24k draws / 18 M triángulos) no está certificado sin GPU.

### 2. ¿Cuál es el principal cuello de botella?

**Pathfinding en sus peores casos**, combinado con la **asignación de trabajadores a recursos inalcanzables**.
La media de simulación es baja; el problema es que unas pocas búsquedas caras (15–18 ms) y una lluvia de
peticiones fallidas bloquean la economía y producen hitches.

### 3. ¿Pathfinding sigue siendo un problema?

**Sí, aunque menos en la IA.** No por el coste medio del A* (0,058 ms en mapa aleatorio), sino por:
- p99 de 15,6 ms a 800 (baseline; #121 no cambia el coste de una búsqueda individual);
- peticiones totales altas; #121 eliminó el A* por candidato de `chooseResourceNode`, pero dominan los
  `setPath` de las unidades;
- faltan presupuesto/cola por frame, límite de expansiones y caché de búsquedas fallidas.

### 4. ¿La IA escala correctamente?

**En CPU sí; en calidad todavía no.** `AI.update` cuesta 0,15 ms de media y p99 1,9 ms a 800. Tras #121:
- 12/20 partidas no terminan (16/20 en la auditoría original; 12/20 ya tras la remediación P0);
- siguen habiendo seeds con un bando sin soldado;
- el primer ataque P0 ocurre a 403 s tras la remediación P0 (643 s en la auditoría original);
- las victorias siguen siendo unilaterales, no por buena táctica.

### 5. ¿La economía presenta bloqueos?

**Sí, aunque #121 mitigó el caso extremo.** Baseline: seed 783 a 2400 s con comida/madera 0, sin cuartel, sin
soldado, 9–10 trabajadores bloqueados, 5.106 órdenes GATHER y 66 entregas; seed 786 con P0 madera 0 y 346k
fallos. Tras #121 las entregas suben (+16 %) y las búsquedas de `chooseResourceNode` bajan (−27 %), pero no hay
garantía de que exista un nodo alternativo alcanzable. No es un problema de tasas de recolección; es un problema
de **llegar al nodo y reasignar cuando no se llega**.

### 6. ¿Qué ocurre con 100/200/400/800 unidades?

| Unidades | Veredicto | Evidencia |
|---:|---|---|
| 50 | OK | Sim p99 5,8 ms; 1.681 draws |
| 100 | OK | Sim p99 6,0 ms; 3.212 draws |
| 200 | OK | Sim p99 5,6 ms (mixed) / 7,5 ms (IA); 6.159 draws |
| 400 | OK con vigilancia | Sim p99 6,6 ms (mixed) / 9,0 ms (IA); path p99 5,8 ms; 12.258 draws |
| 800 | Condicional | Media 3,9 ms; p99 18,5 ms inicial / 8,6 ms estacionario; 24.237 draws; render no certificado |

### 7. ¿Cuál debería ser la siguiente mejora?

1. **PATH-1 (resto):** presupuesto/cola por frame, límite de expansiones y caché de búsquedas fallidas.
2. **AI-1 (resto):** recursos iniciales sin alternativa alcanzable y reasignación cuando no hay nodo válido.
3. **AI-2:** compromiso de ataque coordinado para cerrar partidas.
4. **PERF-2:** throttle del HUD/minimapa (bajo riesgo, elimina un pico de 5–6 ms).
5. **PERF-3:** medir en GPU real y, solo después, instancing/materiales compartidos.

### 8. ¿Qué NO debería tocarse todavía?

`Game.ts`/`Game.update`, ECS, Web Workers, Simulation LOD, FOW, spatial grid, población/limpieza/victoria,
partículas, cadencia de IA, estructuras del pathfinder, balance económico y rendering sin GPU. Todo ello está
medido como **no problemático** o **no concluyente**, y cambiarlo ahora añadiría riesgo sin resolver el bloqueo
real.

---

## Rigged models, fauna and LOD (#118)

Esta sección mide el coste de los modelos riggeados y la fauna antes de ampliar la migración. El escenario
`rigs` parte de una población limpia y spawnea N trabajadores Caral; `fauna` hace lo mismo con N llamas
(4/8/12/16, cap 16); `mixed-rigs` combina N trabajadores, N/2 soldados y 8 llamas. Todos usan seed 777,
1280×800, `?low=1`, niebla y el pase de sombras VSM. Los draw calls/triángulos incluyen **main + shadow**, por
eso se comparan antes/después con el mismo criterio.

```bash
yarn bench --scenario=rigs --units=0,4,12,24,48 --steps=600 --runs=3 --profile=1 \
  --out=review/bench-rigs.json
yarn bench --scenario=fauna --animals=0,4,8,12,16 --steps=600 --runs=3 --profile=1 \
  --out=review/bench-fauna.json
yarn bench --scenario=mixed-rigs --units=12,24,48 --animals=8 --steps=600 --runs=2 --profile=1 \
  --out=review/bench-mixed-rigs.json
yarn bench:check   # --assert sobre los tres escenarios
```

La línea base se midió en `main` con el mismo arreglo del cap de fauna aplicado de forma temporal: el bug
descrito abajo impedía spawnear 12/16 animales y habría hecho incomparable la tabla. El cambio de cap forma
parte de #118.

### Fauna: antes / después

| Animales | Draws escena | Draws fauna | Draws/animal | Tris/animal |
|---:|---:|---:|---:|---:|
| 0 | 126 → 126 | 0 → 0 | — | — |
| 4 | 182 → 134 | 56 → 8 | **14 → 2** | 4.120 → 4.120 |
| 8 | 238 → 142 | 112 → 16 | **14 → 2** | 4.120 → 4.120 |
| 12 | 294 → 150 | 168 → 24 | **14 → 2** | 4.120 → 4.120 |
| 16 | 350 → 158 | 224 → 32 | **14 → 2** | 4.120 → 4.120 |

La alpaca tenía **7 primitivas/materiales** (7 `SkinnedMesh`); cada una se dibuja en main y en shadow. Se
horneó el color plano de cada material en colores por vértice y se fusionaron en **1 `SkinnedMesh`**. El
triángulo count no cambia y no hay texturas en el asset, así que la pérdida visual es nula (ver evidencia).
El ahorro es de **12 draw calls por animal**; a 16 animales son **192 draw calls menos** en la escena.

### Trabajadores: baseline para #116

| Trabajadores | Draws/trabajador | Tris/trabajador | `rigs` p95 |
|---:|---:|---:|---:|
| 4 | 32,5 | 28.977 | 0,10 ms |
| 12 | 32,0 | 29.104 | 0,30 ms |
| 24 | 31,7 | 29.189 | 0,50 ms |
| 48 | 31,6 | 29.210 | 1,20 ms |

El trabajador de esta tabla era el maniquí vestido del piloto (#108/#112); #118 **no** lo cambia. Estos
números fijaron el presupuesto que el modelo final de #116 debía respetar o justificar. Los tris incluyen el
pase de sombras; el cuerpo base son ~13,7k tris y el resto es vestuario/anclajes. La medición final está en
[Final Caral worker (#116)](#final-caral-worker-116).

### Escenario mixto

| Unidades | Draws escena | Draws rigs | Sim p95 |
|---:|---:|---:|---:|
| 12 + 8 animales | 862 → 766 | 498 → 402 | 5,0 → 4,5 ms |
| 24 + 8 animales | 1.496 → 1.400 | 874 → 778 | 5,5 → 4,8 ms |
| 48 + 8 animales | 2.702 → 2.606 | 1.626 → 1.530 | 4,0 → 6,5 ms |

Cada fila ahorra exactamente **96 draws** (8 animales × 12). La simulación no mejora de forma demostrable:
la diferencia de p95 está dentro del ruido entre corridas; el objetivo de #118 es reducir coste evitable, no
vender una mejora de CPU. La CPU de `RigInstance.update` (`rigs`) se mantiene en **0,2–1,9 ms p95** en las
escalas medidas.

### LOD, compresión e instancing: decisión con datos

- **LOD/actualización remota:** no se añade. El mixer cuesta 1,2 ms p95 con 48 trabajadores, 0,2 ms con 16
  llamas y 1,9 ms en el mixto de 48+8; el cuello de botella medido son los draw calls de primitivas, no la CPU
  de animación. Introducir LOD ahora añadiría complejidad sin resolver el coste observado.
- **Instancing convencional:** no aplica a `SkinnedMesh` con esqueletos independientes; no se usa.
- **Draco/KTX2:** no se añaden. La alpaca no tiene texturas y el coste de geometría no es el problema; el
  maniquí y el modelo final sí tienen materiales/texturas y se medirán en #116.
- **Materiales compartidos:** ya se comparten geometría/material/texturas entre instancias; el problema era el
  número de primitivas por asset, resuelto con la consolidación.

### Bug de cap de fauna

`Wildlife.spawn` recalculaba `MAX_ANIMALS - this.animals.length` en cada iteración del bucle. Como la longitud
crecía dentro del bucle, el límite se cerraba a la mitad: partiendo de cero solo añadía **8** animales aunque
`MAX_ANIMALS = 16`. Se congeló el límite antes del bucle y se añadió un test (`tests/fauna-assets.test.ts`)
que exige 12 y luego 16. Es un cambio visual (más fauna), no de simulación.

### Presupuestos verificables

`yarn bench:check` ejecuta los tres escenarios con `--assert` y falla si:

- un trabajador supera **40 draw calls** o **40.000 tris** (main + shadow);
- un animal supera **4 draw calls** o **5.000 tris**;
- una entidad riggeada cae al modelo procedural sin avisar;
- el p95 del escenario mixto supera **16,6 ms** (un frame a 60 Hz).

Los presupuestos son estructurales y no dependen de la GPU. No se impone un FPS: SwiftShader no representa
hardware real y el propio bench lo marca como `software`.

### Evidencia

Misma escena, seed, resolución, cámara y pasos fijos; izquierda antes, derecha después:

- [`fauna-rig-perf-before-after.webp`](../media/fauna-rig-perf-before-after.webp) — acercamiento.
- [`fauna-rig-perf-rts-before-after.webp`](../media/fauna-rig-perf-rts-before-after.webp) — cámara RTS.

Las capturas se generan con `node scripts/shots_evidence.mjs --scene=fauna-perf --out=…` desde el worktree
limpio y desde la rama; el resultado es visualmente idéntico y solo cambian los draw calls.

### Límites

- Sin validación en GPU hardware: los draw calls/triángulos son accionables, el FPS no.
- Los conteos incluyen el pase de sombras VSM; el pase principal es aproximadamente la mitad.
- El trabajador medido en #118 era el maniquí del piloto; #116 repite la medición con el asset final y la
  documenta abajo.
- Los presupuestos se fijan con la escena de bench (1280×800, `?low=1`); una escena con más materiales o
  sombras puede requerir revisarlos, pero no relajarlos silenciosamente.

## Final Caral worker (#116)

El asset final sustituye el maniquí por una composición CC0 (cuerpo, cara y pelo de Quaternius Universal Base
Characters + clips UAL1/UAL2) con túnica, falda y faja de algodón autoradas por el proyecto. Los accesorios
(cinta, carga y bastón) siguen siendo mallas runtime sobre huesos. La ficha completa, fuentes y hashes están en
[`PROVENANCE.md`](../../PROVENANCE.md); el GLB se regenera con
`yarn models:build`.

| Trabajadores | Draws/trabajador | Tris/trabajador | `rigs` p95 |
|---:|---:|---:|---:|
| 4 | 22,0 | 36.449 | 0,10 ms |
| 12 | 22,3 | 36.544 | 0,60 ms |
| 24 | 22,5 | 36.592 | 0,80 ms |
| 48 | 22,8 | 36.675 | 1,80 ms |

El modelo **entra en el presupuesto** de 40 draws / 40.000 tris (main + shadow) con ~22-23 draws y ~36,4-36,7k
tris visibles en la mezcla femenina/masculina (solo un cuerpo/atuendo por instancia). Frente al maniquí baja
**~10 draw calls por trabajador** (32 → 22) y sube tris, porque ahora hay
cuerpo, pelo y ropa con texturas en vez de un placeholder. Para no recortar geometría visible solo se excluyen del
pase VSM los ojos, demasiado pequeños para proyectar una sombra legible (`Eyes`): en VSM un objeto con
`receiveShadow` también se dibuja en el shadow map, así que hay que apagar ambos flags. La túnica, la falda y la
faja conservan sombra y recepción. La medición se repite con:

```bash
yarn bench --scenario=rigs --units=4,12,24,48 --runs=2 --steps=600 --assert \
  --out=review/bench-rigs-caral.json
```

### Evidencia

Misma misión (`m1_caral`), seed `777`, 1600×900, UI oculta, `fog=0`, briefing iniciado y pasos fijos; izquierda
antes (modelo procedural en `3b98be0`, padre de #124), derecha después (asset final):

- [`caral-worker-final-before-after.webp`](../media/caral-worker-final-before-after.webp) — acercamiento idle.
- [`caral-worker-final-rts-before-after.webp`](../media/caral-worker-final-rts-before-after.webp) — cámara RTS
  con base, recursos y otros trabajadores para comprobar escala.
- [`caral-worker-tasks-before-after.webp`](../media/caral-worker-tasks-before-after.webp) — idle, caminar,
  recolectar, construir y transportar, dirigidas por órdenes reales.
- [`caral-worker-attack.webp`](../media/caral-worker-attack.webp) y
  [`caral-worker-attack-rts.webp`](../media/caral-worker-attack-rts.webp) — ataque con la herramienta, cerca y
  RTS, contra un edificio enemigo.

Procedimiento reproducible:

1. Crear el worktree baseline `3b98be0` y enlazar `node_modules`; copiar `scripts/shots_evidence.mjs` para que
   ambos lados usen exactamente la misma captura.
2. Capturar `caral-worker`, `caral-worker-rts`, `caral-worker-tasks` y `rigged-attack` desde el baseline y desde la rama final.
   El script espera `game:ready` y un frame renderizado, inicia el briefing, fija `fog=0`, `seed=777`, cámara,
   yaw, zoom y pasos; el loop se detiene antes de la captura.
3. Componer los pares con
   `python3 scripts/compare_evidence.py --before … --after … --out docs/media/…`.
4. Verificar que las tareas se distinguen sin leer la UI y que no hay clipping de túnica, falda, faja, manto,
   herramienta ni carga.

Las imágenes anteriores se descartaron: el lado “después” se capturó con la niebla de guerra activa y antes de
iniciar el briefing, por lo que el terreno quedaba sin iluminación y la partida estaba pausada; además no había
vista de caminar ni de transporte. La comparación nueva solo cambia el modelo/presentación del trabajador.

### Límites del modelo final

- La túnica de manga corta, la falda y la faja son una **abstracción plausible**: `docs/historia/atuendos.md`
  documenta algodón para Caral-Supe, pero no las prendas concretas. No hay metal ni calzado.
- Las cejas de tarjetas de pelo del asset original (~1,5k tris) se sustituyeron por dos tiras low-poly (~24 tris)
  ancladas al hueso `Head`, para mantener la lectura del rostro sin duplicar su coste en el pase de sombras.
- El pelo y la cara vienen del cuerpo CC0; no son un retrato. El modelo mide ~1,79 m y se normaliza a la escala
  estilizada del juego.
- El pase de sombras VSM dibuja también receptores; por eso el presupuesto se mide con main + shadow y la
  exclusión de micro-mallas es deliberada, no un atajo silencioso.
- Sin validación en GPU hardware: los draws/tris son estructurales; el FPS de SwiftShader no es una meta.

## Reproducción

```bash
# Escala (sin IA y con IA)
yarn bench --units=50,100,200,400,800 --scenario=mixed --seed=777 --steps=600 --runs=3 --gc=1 \
  --out=review/bench-systems.json
yarn bench --units=50,100,200,400,800 --scenario=mixed-ai --seed=777 --steps=600 --runs=2 --gc=1 \
  --out=review/bench-ai-stress.json

# Control y estado estacionario
yarn bench --units=50,100,200,400,800 --scenario=soldiers --seed=777 --steps=600 --runs=2 --gc=1 \
  --out=review/bench-soldiers.json
yarn bench --units=800 --scenario=mixed --seed=777 --steps=3000 --runs=1 --profile=1 --gc=1 \
  --out=review/bench-800-long.json

# IA (20 seeds)
yarn sim --seeds=777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796 \
  --max=1200 --metrics=1 --sample=5 --out=review/ai-bench-20-all.json

# Seguimiento #121 (misma lista de seeds, para comparar con el baseline)
yarn sim --seeds=777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796 \
  --max=1200 --metrics=1 --sample=5 --out=review/ai-bench-20-after121.json

# Confirmación del bloqueo persistente
yarn sim --seeds=783 --max=2400 --metrics=1 --sample=10 --out=review/ai-seed783-2400.json
```

Los JSON crudos quedan en `review/` (gitignored). El diagnóstico original no modificó `src/`; la remediación
P0 y el seguimiento #121 cambian únicamente alcanzabilidad, abandono de órdenes atascadas y la métrica de
`blockedWorkers` (`Pathfinding`, `Unit`, `AI`, `scripts/sim.mjs`), y se documentan arriba.
