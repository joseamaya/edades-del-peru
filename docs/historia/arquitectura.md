# Arquitectura, estilos constructivos y emblemas (spec para modelado)

Este documento reúne, con fuentes, la información de **arquitectura y emblemas** que usa
`src/model/ProceduralModel.ts` para diferenciar visualmente a las civilizaciones. Es la **spec operativa**
del sistema de identidad visual (`CivDef.visual` en `src/model/defs/civs.ts`). Donde un dato no está
atestiguado se indica **«no documentado»**; no se inventa (ver `AGENTS.md`).

> Los motivos son **abstracciones legibles** de formas atestiguadas (plataformas, mampostería, frisos),
> no reconstrucciones a escala. La arquitectura sólo se aplica a las **eras prehispánicas** (la era manda:
> una civilización andina jugada en el Virreinato usa arquitectura colonial).

---

## 1. Estilos constructivos

Cada civilización prehispánica usa uno de cuatro estilos andinos; las civilizaciones posteriores a 1532
usan el colonial o el republicano.

| Estilo | Rasgos modelados | Civilizaciones |
|---|---|---|
| `coastal-adobe` | Adobe/molde, **plataformas escalonadas** (huacas), frisos pintados, techos de paja | Caral, Cupisnique, Moche, Nazca, Paracas, Chimú, Chincha |
| `andean-masonry` | **Mampostería de piedra pulida**, nichos trapezoidales, vanos trapezoidales, andenes | Chavín, Wari, Inca |
| `altiplano-stone` | Arquitectura **megalítica**, patio hundido, bloques ciclópeos | Tiahuanaco, Collas y Lupaca |
| `highland-terraced` | **Andenes** con muros de contención de piedra, fortalezas en cerros | Recuay, Chanca, Huanca |
| `colonial` | Adobe/quincha con cubierta de teja, vanos en arco, campanario | Realistas |
| `republican` | Neoclásico y arquitectura portuaria/moderna | Patriotas, República, Chile |

### Fuentes por estilo

- **Costa (adobe, huacas escalonadas).** Dossiers [`moche.md`](./civilizaciones/moche.md),
  [`chimu.md`](./civilizaciones/chimu.md), [`caral.md`](./civilizaciones/caral.md),
  [`nazca.md`](./civilizaciones/nazca.md), [`paracas.md`](./civilizaciones/paracas.md),
  [`chincha.md`](./civilizaciones/chincha.md), [`cupisnique.md`](./civilizaciones/cupisnique.md).
  Chan Chan (UNESCO, Patrimonio de la Humanidad); Huacas del Sol y de la Luna (Moche).
- **Sierra (mampostería, nichos).** Dossiers [`inca.md`](./civilizaciones/inca.md),
  [`chavin.md`](./civilizaciones/chavin.md), [`wari.md`](./civilizaciones/wari.md). Mampostería inca
  pulida (Cusco, Machu Picchu) y el estilo «horizonte» de Chavín.
- **Altiplano (megalítico).** Dossiers [`tiahuanaco.md`](./civilizaciones/tiahuanaco.md),
  [`collas_lupaca.md`](./civilizaciones/collas_lupaca.md). Tiwanaku (UNESCO).
- **Sierra norte/central (andenes).** Dossiers [`recuay.md`](./civilizaciones/recuay.md),
  [`chanca.md`](./civilizaciones/chanca.md), [`huanca.md`](./civilizaciones/huanca.md).
- **Colonial / republicano.** Dossiers [`realistas.md`](./civilizaciones/realistas.md),
  [`patriotas.md`](./civilizaciones/patriotas.md), [`republica.md`](./civilizaciones/republica.md),
  [`chile.md`](./civilizaciones/chile.md).

> Fuentes generales del sistema andino: Moseley, M. E., *The Incas and their Ancestors*; Rowe/Lumbreras
> para la periodización (ver [`fuentes.md`](./fuentes.md) y [`periodizacion.md`](./periodizacion.md)).

---

## 2. Emblemas (estandartes y escudos)

Glifo procedural por civilización, dibujado en el estandarte del edificio. Cada uno abstrae un motivo
atestiguado en el arte de la cultura (no es un logotipo inventado).

| Emblema | Motivo | Civilizaciones |
|---|---|---|
| `sun` | Disco solar (**Inti**) | Inca |
| `feline` | Cabeza de **felino** | Chavín |
| `staff` | **Dios de los báculos** | Wari, Tiahuanaco |
| `fret` | **Greca / ola escalonada** | Moche, Cupisnique |
| `wave` | **Ola / mar** | Caral, Nazca, Chimú, Chincha |
| `condor` | **Cóndor** (ave) | Chanca |
| `geometric` | Rombo / **tocapu** geométrico | Paracas, Recuay, Collas y Lupaca, Huanca |
| `cross` | Cruz | Realistas |
| `sunburst` | Sol radiante | Patriotas |
| `shield` | Escudo | República, Chile |

Fuentes de los motivos: [`atuendos.md`](./atuendos.md) (tocapu, insignias) y los dossieres por
civilización (arte y religión). El **dios de los báculos** (staff god) es el motivo característico de
Wari y Tiahuanaco; el **felino** lo es de Chavín; el **Inti** del Estado inca.

---

## 3. Implementación

- **Datos**: `CivDef.visual = { arch, emblem }` en `src/model/defs/civs.ts`. La identidad material se detalla en
  `src/model/defs/architecture.ts` (`HistoricalArchitectureProfile` + `archProfileFor(civ, period)`): nombra muro
  (`adobe`, `fieldstone`, `cut-stone`, `megalithic`…), cubierta, fundación y ornamentos por civilización (slice:
  Caral, Moche, Inca), sobre el mismo `ArchStyle`. Los landmarks viven en `src/model/defs/landmarks.ts`
  (solo visuales, con fuente y estado `documented|plausible|abstraction`).
- **Aplicación**: `ProceduralModel.ts` construye los edificios prehispánicos con
  `buildAndeanStructure` (plataforma escalonada + muros de adobe/piedra + techo de paja/plano + nichos,
  frisos, escalinatas, torre) según `Builder.style`, y añade el `emblem` en el estandarte
  (`andeanBanner`/`addEmblem`).
- **Regla de era**: `Builder.isAndean` exige `era ≤ TAHUANTINSUYO` **y** un estilo andino; en el
  Virreinato en adelante se usa la arquitectura de la era (colonial/moderna).
- **Verificación**: `tests/model.test.ts` (cobertura de estilos/emblemas) y
  `tests/e2e/civ-visuals.spec.ts` (dos civilizaciones coetáneas construyen modelos distintos). Revisión
  visual manual con `yarn shot`.
