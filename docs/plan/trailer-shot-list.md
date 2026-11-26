# Tráiler de las 20 misiones: lista de tomas (borrador)

**Estado:** propuesta para revisar. Sustituye la plantilla actual de `scripts/trailer_full.mjs`, en la
que 15 de las 20 tomas son el mismo plano: el héroe camina al frente, la cámara gira de la cara al perfil
en 4,7 s, todo en pastizal y al atardecer.

## Principios

1. **Un momento por misión.** Cada toma muestra lo que solo pasa en esa misión: construir, peregrinar,
   chocar, asediar, incendiar, cargar o bombardear. No siempre «el ejército avanza».
2. **Seis tipos de plano, alternados.** Nunca repetir el mismo tipo dos tomas seguidas.
   - **A**: aérea de presentación, un dron que revela el sitio.
   - **B**: batalla, plano medio a la altura del choque.
   - **H**: héroe, primer plano o plano medio.
   - **V**: vida y multitud (procesión, obreros, pueblo).
   - **G**: juego real, con la cámara RTS y la HUD visibles.
   - **D**: detalle (fuego, cañón, bandera).
3. **Una luz por acto.**

   | Acto | Luz |
   | --- | --- |
   | Preincas | Amanecer y mañana, tranquila |
   | Tahuantinsuyo | Tarde dorada, épica |
   | Virreinato | Atardecer y noche con fuego |
   | Independencia | Mañana clara, banderas |
   | República | Mediodía duro y desierto, cierre nocturno |

4. **Ritmo variable.** Los actos tranquilos van con planos de 5 s. La Independencia acelera con cortes de
   3 s y una carga de 6 s.
5. **La arquitectura en cuadro.** Los kits de Blender (Caral, Chavín, Moche/Chimú, Wari/Chanca, Cusco,
   colonial, Independencia, república) son fondo o protagonista. Las marchas se encuadran *junto* a los
   edificios, no lejos de ellos.
6. **Al menos tres planos de juego (G).** Es el tráiler de un RTS: se tiene que ver que se juega.

## Estructura (~100 s)

| Bloque | Duración |
| --- | --- |
| Apertura | 5 s |
| Acto I · Culturas preincas | 20 s |
| Acto II · El Tahuantinsuyo | 16 s |
| Acto III · El Virreinato | 17 s |
| Acto IV · La Independencia | 16 s |
| Acto V · La República | 15 s |
| Montaje de juego + logo | 10 s |

## Tomas

### Apertura (5 s)

| # | Toma | Tipo | Luz | Dur. | Notas |
| --- | --- | --- | --- | --- | --- |
| 0 | Caral al amanecer, el dron sube sobre la Pirámide Mayor y aparece el título | A | amanecer | 5 s | Reutiliza `caral-amanecer` del tráiler épico |

### Acto I · Culturas preincas (luz de mañana, planos largos)

| # | Misión | Momento clave | Tipo | Luz | Dur. | Cómo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Caral | **La ciudad crece**: lapso de las fases del sitio con obreros cargando piedra | G → A | amanecer | 5 s | `setSitePhase` por fases durante la toma; HUD visible los primeros 2 s |
| 2 | Chavín | **La peregrinación**: procesión que entra a la plaza del templo, cámara baja junto al muro | V | mañana con bruma | 5 s | La marcha actual con `vLook`, pero la cámara a ras de suelo y el templo llenando medio cuadro |
| 3 | Moche | **Guerra ritual en la huaca**: choque al pie de la rampa | B | mediodía | 5 s | La toma actual funciona; acercarla a plano medio, desde abajo de la rampa |
| 4 | Wari | **El imperio de caminos**: caravana de llamas y obreros hacia el complejo Wari | A | mañana | 5 s | Recentrar en el kit (143, 119); el sitio se movió y hoy queda lejos |

### Acto II · El Tahuantinsuyo (tarde dorada)

| # | Misión | Momento clave | Tipo | Luz | Dur. | Cómo |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | Tambotoco | **Salen de la cueva**: Ayar Manco emerge de la boca de Tambotoco | H | tarde | 4 s | La cámara dentro de la cueva mirando hacia fuera; cortar antes de que el grupo se disperse |
| 6 | Yahuar Pampa | **El choque**: la línea inca contra la chanca, con la fortaleza chanca detrás | B | tarde dorada | 4 s | Cámara baja detrás de la línea inca; el kit Chanca (180, 97) en cuadro |
| 7 | Guerra del Norte | **Chan Chan cercada**: el dron pasa sobre las murallas y revela el ejército inca fuera | A | tarde | 4 s | Ejército fuera de las murallas; hoy la ruta choca con el kit |
| 8 | Guerra Civil | **Quizquiz**: primer plano y corte a las dos huestes incas | H | atardecer | 4 s | La ruta actual (114, 204) sirve; más cerca y más corto |

### Acto III · El Virreinato (atardecer, noche y fuego)

| # | Misión | Momento clave | Tipo | Luz | Dur. | Cómo |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | Lima 1535 | **La fundación**: se traza la Plaza Mayor y se levanta el cabildo | G | mañana | 5 s | HUD visible con el menú de construcción; fase `ciudad` del kit colonial |
| 10 | Cusco 1536 | **Cusco en llamas**: techos ardiendo de noche, Sacsayhuamán detrás | D → A | noche | 4 s | `timeOfDay` noche y emisores `fire`/`smoke` sobre los techos del kit Cusco |
| 11 | Vilcabamba | **El refugio arde**: Curi Paucar se retira hacia la selva | H | atardecer | 4 s | Fuego en el kit del refugio; el héroe de espaldas a las llamas |
| 12 | Túpac Amaru II | **El pueblo se alza**: multitud en la plaza, Túpac Amaru al frente | V | atardecer | 4 s | Muchos `worker`/milicianos generados en la plaza; cámara a la altura de las cabezas |

### Acto IV · La Independencia (mañana clara, ritmo creciente)

| # | Misión | Momento clave | Tipo | Luz | Dur. | Cómo |
| --- | --- | --- | --- | --- | --- | --- |
| 13 | Junta del Cusco | **Pumacahua** a caballo ante la catedral del Cusco colonial | H | mañana | 3 s | La toma actual, con la catedral en cuadro |
| 14 | Cerco de Lima | **Lima a la vista**: el dron revela el ejército de San Martín ante la Plaza Mayor | A | mañana | 3 s | Kit colonial de Lima de fondo |
| 15 | Junín–Ayacucho | **La carga de caballería** (plano estrella): húsares contra dragones realistas | B | mañana | 6 s | Requiere #643 (ya mergeado); volver a poner `realista_dragon`; cámara baja entre el polvo |
| 16 | Real Felipe | **El último bastión**: los cañones del fuerte disparan sobre la bahía | D → A | atardecer | 4 s | `artillery` en los bastiones con `explosion`/`smoke`; el fuerte por fin en cuadro |

### Acto V · La República (mediodía duro, cierre de noche)

| # | Misión | Momento clave | Tipo | Luz | Dur. | Cómo |
| --- | --- | --- | --- | --- | --- | --- |
| 17 | Tarapacá | **Combate en la quebrada**: lucha entre las casas de adobe | B | mediodía | 3 s | Pueblo del kit republicano; polvo |
| 18 | Arica | **«Hasta quemar el último cartucho»**: Bolognesi en la batería frente al mar y retroceso sobre el acantilado | H → A | atardecer | 5 s | Kit de Arica: la batería mira al Pacífico |
| 19 | Miraflores | **Los reductos**: defensa entre las casas, humo de fusilería | B | tarde | 3 s | Kit de Miraflores; `smoke` |
| 20 | Breña | **El Brujo de los Andes**: Cáceres y sus montoneros en la sierra | H | noche/alba | 4 s | Montaña al fondo, luz fría; el último plano de héroe |

### Cierre (10 s)

| # | Toma | Tipo | Dur. |
| --- | --- | --- | --- |
| 21 | Montaje de juego: construir · ordenar el ejército · combatir, con los textos «Construye. Conquista. Resiste.» | G ×3 | 1,5 s cada uno |
| 22 | Caral al atardecer y el logo | A | 5,5 s |

## Lo que el guion necesita y hoy no tiene

- **Fuego y humo sobre edificios:** emisores `fire`/`smoke` ya existentes, anclados a los techos del kit
  (tomas 10, 11, 16, 19).
- **Noche:** `timeOfDay: 'night'` (tomas 10, 20); comprobar que las unidades se lean.
- **Lapso de fases:** cambiar `setSitePhase` durante la toma (toma 1).
- **Planos de juego con HUD:** hoy el guion oculta la HUD siempre (tomas 1, 9, 21).
- **Duraciones por toma:** el montaje (`trailer_full_edit.mjs`) usa 4,5 s fijos por misión; hace falta una
  duración por fila.
- **Títulos de acto:** un rótulo breve al empezar cada acto.
- **Música:** la pista actual es de 98 s con un solo pulso; los cambios de ritmo por acto piden recortar o
  regenerar (`trailer_full_music.py`) con un acento en la carga (toma 15) y en Arica (toma 18).
- **Guion versionado:** `scripts/trailer_full*.mjs` está ignorado por git; sin versionarlo no se puede
  revisar en un PR.

## Para decidir

1. ¿Duración total ~100 s, o un corte corto de ~60 s para redes además del largo?
2. ¿Rótulos por misión (como ahora) o solo por acto, con el nombre del héroe sobreimpreso?
3. ¿Qué tomas de juego (G) quieres? Propuestas: Caral construyendo, Lima fundando y el montaje final.
4. ¿Noche en Cusco 1536 y en Breña, o prefieres evitar la noche por legibilidad?

## Corte de 60 s (implementado)

Once tomas en cinco actos más el montaje de juego, definidas en `scripts/trailer60.json` (orden, duración,
héroe, lugar y etalonaje). La captura, el montaje y la música leen ese mismo archivo.

| Acto | Tomas |
| --- | --- |
| I · Culturas preincas | Caral crece por fases (con HUD) · procesión en Chavín · choque en la huaca Moche |
| II · El Tahuantinsuyo | Choque en Yahuar Pampa ante el pucará chanca · dron sobre Chan Chan |
| III · El Virreinato | Cusco en llamas (noche) · el pueblo alzado con Túpac Amaru II |
| IV · La Independencia | Carga de caballería en Junín · el Real Felipe sobre la bahía |
| V · La República | Bolognesi en la batería de Arica · Cáceres en la Breña |
| Cierre | Construye · Conquista · Resiste (juego con HUD) · logo |

```bash
node scripts/trailer60.mjs --format=16x9 --gpu        # también --format=9x16; --only=a,b; --preview=6
python3 scripts/trailer60_music.py --out=review/trailer60_music.wav
node scripts/trailer60_edit.mjs --format=16x9         # review/trailer60-16x9.mp4
```

La apertura y el cierre reutilizan `review/trailer-epic-<formato>/caral-amanecer` y `final-caral`. El motor
no oscurece la escena de noche (el sol queda alto), así que las tomas con `"grade": "night"` se etalonan en
el montaje; el fuego sigue siendo lo más brillante.
