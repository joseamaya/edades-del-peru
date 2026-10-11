# EDADES DEL PERÚ — RTS DE HISTORIA PERUANA

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/joseamaya/edades-del-peru/actions/workflows/ci.yml/badge.svg)](https://github.com/joseamaya/edades-del-peru/actions/workflows/ci.yml)

Un estrategia en tiempo real estilo **Age of Empires II** que recorre la historia del Perú, de Caral al presente, construido en **Three.js** con assets 100% procedurales (texturas Canvas, modelos paramétricos, audio WebAudio). Toda la interfaz está en español y el contenido histórico es **verificable** (ver [`docs/historia/`](./docs/historia/)).

El juego es **históricamente exacto** en un punto clave: cada partida se juega en un **periodo histórico**, y solo pueden enfrentarse **civilizaciones coetáneas** (p. ej. Moche con Recuay, Chanca con Inca, nunca Moche con Chimú).

## Cómo ejecutar

Requiere Node.js ≥ 20.19. El gestor de paquetes es **Yarn 1** (hay `yarn.lock`; no hay `package-lock.json`).

```bash
yarn install
yarn dev          # desarrollo (http://localhost:5173)
yarn build        # typecheck + build de producción (dist/)
yarn preview      # servidor del build
yarn typecheck    # tsc --noEmit
yarn lint         # ESLint
yarn test         # tests unitarios (Vitest)
yarn test:e2e     # smoke test E2E (Playwright, requiere `npx playwright install chromium`)
```

Para capturas automáticas del juego (usado en el bucle de revisión visual):

```bash
yarn shot nombre --seed=777 --wait=8000
```

Parámetros de depuración por URL:

- `?play=1` — entra directo a la partida (sin menú); es lo que usan los scripts/E2E
- `?menu=1` / `?menu=0` — fuerza mostrar u ocultar el menú principal
- `?seed=777` — semilla del mapa
- `?fog=0` — desactiva la niebla de guerra
- `?low=1` — calidad baja (SwiftShader/software)
- `?speed=3` — multiplicador de velocidad
- `?era=N` — fuerza el nivel tecnológico N (0-5)
- `?mission=ID` — inicia una misión de campaña (ver tabla abajo)

## Campaña: La Senda del Sol

Nueve escenarios históricos con datos exactos (fecha, lugar, bandos y comandantes reales). Cada dossier está en [`docs/historia/campanas/`](./docs/historia/campanas/).

| # | Misión | Fecha | Enfrentamiento |
|---|---|---|---|
| 1 | La Ciudad Sagrada | c. 3000 a.C. | Caral-Supe (Áspero / rivales del valle) |
| 2 | El Oráculo de Chavín | c. 900–500 a.C. | Chavín vs Paracas |
| 3 | La Frontera de los Valles | c. 300–600 d.C. | Moche vs Recuay |
| 4 | El Horizonte Medio | c. 600–1000 d.C. | Wari vs Tiahuanaco |
| 5 | Yahuar Pampa | 1438 | Cusi Yupanqui (Inca) vs Anccu Hualloc (Chanca) |
| 6 | La Guerra del Norte | c. 1470 | Túpac Yupanqui (Inca) vs Minchancaman (Chimú) |
| 7 | La Gran Rebelión | 1780–1781 | Túpac Amaru II vs Realistas |
| 8 | La Independencia | 1821–1824 | Patriotas (San Martín, Bolívar, Sucre) vs Realistas |
| 9 | El Caballero de los Mares | 1879–1883 | Miguel Grau y Bolognesi (Perú) vs Chile |

Ids de misión: `m1_caral`, `m2_chavin`, `m3_moche_recuay`, `m4_wari`, `m5_yahuar_pampa`, `m6_chimu_inca`, `m7_tupac_amaru`, `m8_independencia`, `m9_guerra_pacifico`.

## Controles

| Acción | Tecla / Ratón |
|---|---|
| Seleccionar | Clic izquierdo / arrastrar caja |
| Seleccionar todas del mismo tipo | Doble clic |
| Todo el ejército | E |
| Mover / ordenar | Botón derecho |
| Atacar-mover | Ctrl + Botón derecho |
| Encolar órdenes / rally point | Shift + Botón derecho |
| Paneo | WASD / flechas / bordes / botón medio |
| Zoom | Rueda · **Q/E** rotar · **F** seguir |
| Última batalla | Espacio · **H** Plaza Mayor |
| Construir andén / vivienda | G / V |
| Pausa | P · **☰** menú |

## Periodos históricos (10)

Partidas **bloqueadas por periodo** (sin modernización anacrónica). Cronología en [`docs/historia/periodizacion.md`](./docs/historia/periodizacion.md).

| Periodo | Fechas | Civilizaciones |
|---|---|---|
| Arcaico Tardío | 3000–1800 a.C. | Caral-Supe |
| Horizonte Temprano | 1200–200 a.C. | Chavín, Paracas |
| Intermedio Temprano | 200 a.C.–600 d.C. | Moche, Nazca, Recuay, Tiahuanaco |
| Horizonte Medio | 600–1000 d.C. | Wari, Tiahuanaco |
| Intermedio Tardío | 1000–1476 d.C. | Chimú, Chincha, Chanca |
| Horizonte Tardío | 1438–1533 d.C. | Inca |
| Virreinato | 1542–1821 | Realistas |
| Independencia | 1821–1824 | Patriotas, Realistas |
| República | 1821–1900 | República del Perú, Chile |
| Contemporáneo | 1900–hoy | República del Perú |

Solo se ofrecen como rivales las civilizaciones **coetáneas** (matriz en [`docs/historia/contemporaneidad.md`](./docs/historia/contemporaneidad.md)).

## Recursos

Comida · Madera · **Plata** (minas) · **Piedra** (canteras). Ciclo clásico: recolectar → entregar en el depósito (Troje/Aserradero/Platería/Cantera) → volver.

## Mapas por geografía

El terreno depende de la geografía de la civilización:

- **`costa`** — litoral desértico, valles y oasis (Caral-Supe, Paracas, Moche, Nazca, Chimú, Chincha, República, Chile).
- **`andes`** — cordillera, quebradas y andenes (Chavín, Recuay, Wari, Chanca, Inca, Realistas, Patriotas).
- **`altiplano`** — meseta del Titicaca (Tiahuanaco).
- **`selva`** — ceja de selva (opcional).

Detalle en [`docs/historia/mapas.md`](./docs/historia/mapas.md).

## Documentación histórica

Los dossiers de civilizaciones y campañas, con fechas, geografía, personajes y fuentes, están en [`docs/historia/`](./docs/historia/). Se evita inventar nombres: donde no hay registro histórico, se indica.

## Arquitectura

```
docs/historia/  Dossiers históricos (periodización, civilizaciones, campañas, fuentes)
src/
  core/        Motor: Game, Camera RTS, EventBus, GameLoop, Config, types (Era = nivel técnico, Periodo = histórico)
  rendering/   Renderer, PostFX, Sky, Water, Terrain (costa/andes/altiplano), Particles, Texturas
  model/       Defs de periodos, civs, unidades, edificios, tecnologías + generador paramétrico de modelos
  entities/    Unidad, Edificio, Nodo de recurso, Proyectil, Vistas
  campaign/    Motor de misiones (objetivos, triggers, oleadas) + 9 campañas históricas
  game/        Pathfinding A*, Niebla de guerra, IA oponente, Economy (asignación de obreros)
  ui/          HUD completo en español (menú por periodo)
  audio/       AudioEngine procedural (WebAudio)
  util/        RNG con semilla, ruido, matemáticas, helpers DOM
```

## Nota histórica

Las fechas y culturas siguen la periodización arqueológica andina (Rowe, Lanning, Lumbreras). El juego es una obra de ficción estratégica: simplifica y abstrae la vida real de estas sociedades, pero **no inventa** nombres, fechas ni batallas. Fuentes en [`docs/historia/fuentes.md`](./docs/historia/fuentes.md).

## Contribuir

¿Quieres colaborar? Lee [`CONTRIBUTING.md`](./CONTRIBUTING.md): requisitos, comandos,
convenciones de código y la regla de oro — **no inventar historia**. Los reportes de bugs e ideas
van a <https://github.com/joseamaya/edades-del-peru/issues>.

## Licencia

Distribuido bajo la licencia **MIT** — ver [`LICENSE`](./LICENSE). Los assets de texturas
generados con IA y su procedencia se documentan en [`PROVENANCE.md`](./PROVENANCE.md).
