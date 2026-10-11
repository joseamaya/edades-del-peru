# AGENTS.md

"Edades del Perú" — RTS estilo Age of Empires II que recorre la historia del Perú (Caral al presente)
en Three.js + Vite + TypeScript. La interfaz y el dominio están en **español**, igual que la mayoría de
identificadores y comentarios. Mantén el código nuevo en español para ser consistente.

## Comandos

Gestor de paquetes: **Yarn 1** (existe `yarn.lock`; no hay `package-lock.json`).

- `yarn dev` — servidor Vite en http://localhost:5173
- `yarn build` — `tsc --noEmit && vite build` (dist/)
- `yarn typecheck` — solo `tsc --noEmit`
- `yarn lint` / `yarn format` — ESLint / Prettier
- `yarn test` — tests unitarios (Vitest); `yarn test:e2e` — smoke Playwright
- `yarn shot <nombre> --seed=777 --wait=8000` — captura a `review/`

No hay `npm test` ni otros scripts fuera de `package.json`. `tsc` es estricto (`strict`, ES2022,
`moduleResolution: bundler`).

## Arquitectura

- Entrada: `index.html` → `src/main.ts` → `src/core/Game.ts` (hub que conecta render, entidades,
  IA/pathfinding/niebla, campaña, HUD y audio).
- **Modelo temporal**: `Era` (0-5) es el **nivel tecnológico** interno (stats/modelos); `Periodo` (0-9,
  en `src/model/defs/periodos.ts`) es el **periodo histórico** de la partida. Las partidas son
  **bloqueadas por periodo** (sin modernización anacrónica): `settings.periodo` fija `startingEra` y
  desactiva el avance de era (HUD e IA).
- Datos dirigidos por defs en `src/model/defs/{periodos,eras,civs,units,buildings,techs}.ts`; los modelos
  se generan proceduralmente en `src/model/ProceduralModel.ts` (sin assets externos).
- **Texturas PBR de terreno (generadas con IA)**: `src/assets/texturas/terreno/{slot}_{diffuse|normal|roughness}.webp`
  (slots `sand/dirt/grass/rock/snow`), cargadas por `src/rendering/Biomes.ts` vía `import.meta.glob`. El
  shader del terreno usa normal+rugosidad+especular cuando existen y **cae al material procedural** si
  faltan (offline). Se generan con `scripts/gen_texturas.py` (Cloudflare Workers AI, credenciales en
  `scripts/.cloudflare.json`, gitignored) + `scripts/post_texturas.py` (teselado/normal/rugosidad). Ver
  `PROVENANCE.md`.
- **Civilizaciones coetáneas**: `civs.ts` da a cada civ `periodos` y `geografia`; `civsDePeriodo(periodo)`
  filtra los rivales válidos. No permitas enfrentar civs sin solapamiento temporal.
- **Mapas por geografía**: `MapType = 'costa' | 'andes' | 'altiplano' | 'selva'` (generación en `Terrain.generate`).
- `src/campaign/defs/campaign.ts` define las 9 campañas históricas; `src/campaign/Mission.ts` evalúa objetivos/triggers.
- **Capa educativa**: `src/campaign/defs/educativo.ts` (prólogo + contexto/«¿Sabías que…?»/fuentes por misión, derivados de
  `docs/historia/`), `src/campaign/Tutorial.ts` (tutorial guiado paso a paso, solo en misiones con `tutorial: true` y
  sujeto a `settings.showHints`) y `src/ui/Codex.ts` (códice que bundlea los `docs/historia/**/*.md` reales vía
  `import.meta.glob(..., { query: '?raw' })`). Cada misión declara `periodo` para resolver fechas/civs coetáneas.
- `src/game/Economy.ts` centraliza la asignación de obreros (usada por el jugador y la IA).
- **UI/inputs en `src/core/Game.ts` y `src/ui/HUD.ts`**: clic izq selecciona / arrastra = box-select
  (rectángulo `#ed-selbox`) · clic der = orden (el **botón derecho ya no panea**; el paneo es por bordes,
  WASD/flechas, rueda central o arrastrando el **minimapa abajo-izquierda**). El minimapa: arrastrar =
  mover viewport, clic der = orden (`Game.commandMoveToWorld`). Rotación de cámara opcional con Q/E
  (`settings.rotateCamera`, off = cámara fija). Grupos de control
  (Ctrl/Alt+1-9 asignar, 1-9 recuperar, Shift+1-9 añadir). Hover con tooltip (`computeHover`) y **cursor
  contextual** (`hoverAction`). Íconos/números de daño (`src/ui/DamageNumbers.ts`), alertas clicables con
  pulso en el minimapa (`pushAlert` + evento `alert`), y marcadores de orden (`src/entities/OrderMarker.ts`).
- **Construcción (estándar RTS)**: colocar un edificio **requiere obreros seleccionados**
  (`Game.startPlacement` avisa si no hay). Construyen esos obreros y solo esos: `commitPlacement` emite
  `issueOrder(BUILD, clear=true)` (la orden **interrumpe** su tarea) y **conserva la selección**. No
  reintroduzcas la auto-asignación de constructores: con todos los obreros recolectando nunca encontraba
  libres y las obras quedaban al 0%. El gate de construcción es `Game.canBuildKind` (era por periodo; la
  **Huaca Sagrada** depende del modo victoria, no de la era, para que la victoria por maravilla sea
  alcanzable en cualquier periodo).
- **Referencia externa**: [VOIDSTRIKE](https://github.com/braedonsaunders/voidstrike) (MIT) se usa solo como
  inspiración de técnicas (números de daño, instancing, culling); no se vende ni copia código suyo.
- Importa addons de Three como `three/addons/...` (no `three/examples/jsm/...`).
- Persistencia en `localStorage`: `peru-settings` y `peru-campaign`.

## Historia (no inventar)

- Toda la documentación histórica (periodización, civilizaciones, campañas, fuentes) está en `docs/historia/`.
- **No inventes** nombres, fechas ni batallas. Si un dato no está atestiguado, indícalo. Antes de tocar
  contenido histórico, consulta el dossier correspondiente y añade la fuente.
- **Atuendos/armas/tocados**: spec en `docs/historia/atuendos.md` (con fuentes). Al mapear modelos en
  `src/model/defs/units.ts` (`eraModel`) respeta la cronología: **sin armas de fuego, caballos,
  vehículos ni motores antes de 1532**, y **sin sci‑fi** en ninguna era. Caballos/arcabuces desde
  VIRREINATO, blindados y AA desde CONTEMPORÁNEO.

## Depuración / automatización

- `src/main.ts` expone `window.game` (y `window.THREE`) para consola y scripts.
- La app muestra el **menú principal por defecto**; entra directo a la partida con `?play=1` o cualquier
  param de depuración. `resetGame()` recarga con `?play=1`.
- Params URL: `?play=1`, `?menu=0/1`, `?seed=`, `?fog=0`, `?low=1`, `?speed=`, `?era=N`, `?mission=ID`.
- `scripts/lib.mjs` compartido (`launchChromium`, `withViteServer`, `readPng`, `classify`). Los scripts
  lanzan Vite en un puerto libre y Chromium con SwiftShader; usan `CHROME_PATH` o `chromium.executablePath()`.
  Ejecuta capturas con `?low=1`.
- `review/` contiene PNG/JSON generados (ignorados por git); no los edites a mano.

## Trampas del código (aprendidas a golpes)

- **Geometrías y texturas de modelos son compartidas/cacheadas** (`sharedGeo`, `bakedGeoCache`,
  `texCloneCache` en `ProceduralModel.ts`). `disposeModel()` solo libera materiales; **no** dispongas
  geometrías/texturas a mano ni las reutilices mutando `repeat`. Para limpiar todo usa `clearModelCaches()`.
- **`UnitContext` es una única instancia compartida** creada en el constructor (`Game.unitContext`).
  No lo reconstruyas por entidad/frame.
- **El hash espacial de unidades se reconstruye una vez por frame** (`Game.rebuildSpatial`). Si mueves
  unidades después de ese punto, `unitsNear`/`enemiesNear` pueden quedar desfasados.
- **La velocidad de juego se aplica solo en `GameLoop`** (paso fijo). No vuelvas a multiplicar `dt` por
  `speed` en `Game.update`.
- `ResourceNode.subtract()` es idempotente y los nodos agotados se eliminan; no decrementes `amount` a mano.
- **Picking del suelo**: `Game.screenToWorld` debe refinar contra el heightfield (`Terrain.getHeight`) por
  iteración de punto fijo (partiendo del plano `y=0`); si solo se usa el plano, el marcador de orden y el
  fantasma de colocación aparecen **desplazados** en terreno elevado (el error crece con la inclinación).
- **El plano de agua debe alinearse con el terreno**: el terreno ocupa `0..size` (no centrado en origen),
  así que `Water.mesh.position` va en `(size/2, waterLevel, size/2)`; el shader descarta el agua sobre tierra
  (`discard` usando el heightmap). No cambies esto sin revisar la inundación del mapa.
- **Cámara por defecto `zoom ≈ 34`** (no 62): a 62 las unidades quedan diminutas e imposibles de seleccionar.
- **Look clásico por defecto**: sin niebla atmosférica (`scene.fog = null`), sin SSAO/bloom/viñeta →
  nítido y saturado (estilo RTS clásico). `settings.cinematic` (toggle en Opciones) reactiva el set vía
  `PostFX.setCinematic`. Tono `NeutralToneMapping` + `exposure 1.0`. No reactives la niebla ni subas la
  exposición sin revisar que las construcciones no se vean lavadas.
- **El shader del terreno muestrea el shadow map en formato VSM a mano** (`Terrain.ts`): no cambies
  `renderer.shadowMap.type` ni el `customProgramCacheKey`, o se rompen las sombras del terreno.
- **El terreno debe tener las caras hacia arriba**: en `Terrain.buildMesh` los índices van `(a,c,b)` y
  `(b,c,d)` (no `(a,b,c)`). Si se invierte el winding, las caras miran hacia abajo: el backface culling
  oculta el terreno y se ve el domo del cielo como si fuera el suelo. Comprueba con un `Raycaster` en
  vertical que impacte el terreno.
- **La niebla de guerra se integra en el shader del terreno** (`Terrain.setFow` + `Fow.texture`), no como
  malla aparte: así queda pegada al relieve. `Fow` solo mantiene la rejilla y la textura.
- **Opacidad de construcción** (`Building.setConstructionOpacity`): al atenuar hay que guardar las
  referencias de los materiales que eran opacos y restaurarlos a `transparent=false, opacity=1` al
  terminar. Un guard del tipo `if (mat.transparent === false)` hace que la restauración sea un no-op y
  deja **todos** los edificios semitransparentes para siempre. No toques ventanas/vidrio/brillo (ya
  transparentes por diseño).
- **Cursor contextual** (`Game.hoverAction` + `HUD.setCursor`): el icono es un emoji que se dibuja en un
  div (`#ed-cursor`) y **oculta el cursor nativo**. No devuelvas `'➡️'` para mover (siempre apunta igual);
  devuelve `null` y deja que el marcador de destino (`OrderMarkers`) señale el punto.
- **Árboles por instancing** (`src/rendering/TreeInstances.ts`): `InstancedMesh` de tronco + copas por
  variante; el picking se hace por `instanceId` (`TreeInstances.raycast` → `pickResource`), la visibilidad
  por `ResourceNode.setVisibleEx` (niebla+LOD) y la caída al talar por `startFall`. Si añades un árbol sin
  registrar en el gestor, no se verá.
- `Game.destroy()` + `clearModelCaches()` + `clearResourceCaches()` + `clearTextureCache()` liberan la
  partida; llama a `destroy()` si recreas el juego sin recargar la página.

## Estado del repo

- No es un repositorio git; `.gitignore` está preparado para cuando se inicialice.
- El README describe subsistemas y controles; consúltalo antes de tocar gameplay.
