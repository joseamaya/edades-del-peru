# Cómo contribuir

¡Gracias por tu interés en **Edades del Perú**! Este es un RTS de historia peruana
(Caral → presente) hecho con Three.js + Vite + TypeScript. Toda la interfaz, el dominio y
los comentarios están en **español**: mantén ese idioma en el código que añadas.

## Requisitos

- Node.js ≥ 20.19
- Yarn 1 (`yarn --version` → `1.22.x`). Hay `yarn.lock`; **no** generes `package-lock.json`.

## Poner en marcha

```bash
yarn install
yarn dev          # http://localhost:5173
```

La app muestra el **menú principal** por defecto. Para entrar directo a la partida usa `?play=1`.

## Comandos

| Comando | Qué hace |
|---|---|
| `yarn dev` | Servidor de desarrollo (Vite). |
| `yarn build` | Typecheck + build de producción en `dist/`. |
| `yarn typecheck` | Solo `tsc --noEmit`. |
| `yarn lint` | ESLint (debe quedar en **0 warnings**). |
| `yarn format` | Prettier sobre `src/**/*.ts` y `scripts/**/*.mjs`. |
| `yarn test` | Tests unitarios (Vitest). |
| `yarn test:e2e` | Smoke E2E (Playwright). Requiere `npx playwright install chromium`. |
| `yarn shot <nombre>` | Captura a `review/` para revisión visual. |

Antes de abrir un PR, ejecuta al menos:

```bash
yarn typecheck && yarn lint && yarn test && yarn build
```

## Arquitectura (resumen)

```
src/
  core/        Motor: Game (hub), Camera RTS, EventBus, GameLoop, Config, types
  rendering/   Renderer, PostFX, Sky, Water, Terrain, Particles, Biomes, Texturas
  model/       Defs (periodos, civs, unidades, edificios, techs) + modelos paramétricos
  entities/    Unidad, Edificio, Nodo de recurso, Proyectil, Vistas
  campaign/    Motor de misiones + 9 campañas históricas
  game/        Pathfinding A*, Niebla de guerra, IA, Economy
  ui/          HUD completo en español
  audio/       AudioEngine procedural (WebAudio)
  util/        RNG con semilla, ruido, matemáticas, helpers DOM
```

El detalle de subsistemas, controles y "trampas" del código está en [`AGENTS.md`](./AGENTS.md)
y en el [`README.md`](./README.md).

## Historia (no inventar)

- Toda la documentación histórica está en [`docs/historia/`](./docs/historia/).
- **No inventes** nombres, fechas ni batallas. Si un dato no está atestiguado, indícalo.
- Antes de tocar contenido histórico, consulta el dossier correspondiente y **añade la fuente**.
- Atuendos/armas: spec en [`docs/historia/atuendos.md`](./docs/historia/atuendos.md).
  Respeta la cronología: **sin armas de fuego, caballos, vehículos ni motores antes de 1532**, y
  **sin sci-fi** en ninguna era.

## Convenciones de código

- **TypeScript estricto** (`strict`, `noUnusedLocals`, `noUnusedParameters`). Evita `any` nuevos
  cuando exista un tipo; tipa los eventos del `EventBus` en `GameEvents` (`src/core/types.ts`).
- **Sin comentarios** salvo cuando aporten contexto que el código no expresa por sí mismo.
- Sigue el estilo existente: Prettier (comillas simples, 120 columnas, comas finales).
- Reutiliza las utilidades existentes (`src/util/*`) y los defs dirigidos por datos
  (`src/model/defs/*`) en lugar de introducir constantes duplicadas.
- Geometrías/texturas de modelos son **compartidas y cacheadas**: no las dispongas a mano
  (ver "Trampas del código" en `AGENTS.md`).

## Flujo de trabajo

1. Crea una rama descriptiva: `feat/…`, `fix/…`, `docs/…`.
2. Haz commits pequeños y con mensajes claros en imperativo.
3. Asegúrate de que `typecheck`, `lint`, `test` y `build` pasan.
4. Abre un Pull Request explicando **qué** y **por qué**, con capturas si cambia lo visual.

## Reportar problemas

Abre un issue en <https://github.com/joseamaya/edades-del-peru/issues> indicando versión de Node,
sistema operativo, pasos para reproducir y, si aplica, una captura a `review/`.

## Licencia

Al contribuir aceptas que tu aporte se distribuya bajo la licencia [MIT](./LICENSE) del proyecto.
