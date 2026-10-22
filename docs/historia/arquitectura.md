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
  `src/model/defs/architecture.ts` (`HistoricalArchitectureProfile` + `archProfileFor(civ, era)`): nombra muro
  (`adobe`, `fieldstone`, `cut-stone`, `megalithic`…), cubierta, fundación, ornamentos y `monumentalTiers` por
  civilización (override por civ: Caral, Chavín, Cupisnique, Paracas, Moche, Nazca, Wari, Tiahuanaco, Chimú,
  Chincha, Chanca, Collas/Lupaca, Inca; el resto usa los valores del estilo), sobre el mismo `ArchStyle`. Se
  indexa por `Era` (coincide con la caché del modelo y con `Builder.isAndean`); tras 1532 la era manda
  (colonial/republicano). Los landmarks viven en `src/model/defs/landmarks.ts` y se adjuntan desde el perfil de
  mapa (solo visuales, con fuente y estado `documented|plausible|abstraction`); su landmark solo se aplica dentro
  de su propio periodo (`landmarkForCiv(civ, period)`), de modo que una cultura jugada más tarde (p. ej. el Inca en
  el Virreinato) adopta la arquitectura de la era y no arrastra un landmark anacrónico. El landmark del mapa se
  coloca de forma determinista como modelo decorativo (`Game.spawnLandmark` → `buildLandmarkModel`): Caral
  (plataforma + plaza circular hundida), Chavín (templo de piedra con cabezas clavas), Cupisnique (huaca de adobe
  con frisos), Paracas (necrópolis con fardos), Moche (huaca escalonada con friso y rampa), Nazca (geoglifo y
  líneas), Wari (complejo amurallado), Tiahuanaco (plataforma megalítica + Puerta del Sol + patio hundido), Chimú
  (ciudadela de adobe), Chincha (complejo de La Centinela), Chanca (pucará de altura), Collas/Lupaca (chullpas),
  Huanca (centro de ayllu), Recuay (centro fortificado con estelas), Inca (ushnu de piedra), colonial (iglesia con
  campanario), Patriotas (campamento), República (fortificación portuaria) y Chile (apostadero naval con blindado).
- **Aplicación**: `ProceduralModel.ts` construye los edificios con el perfil del `BuildContext`
  (`ctx.arch`): `buildAndeanStructure` elige el muro/textura (`arch.wall`), la fundación
  (`arch.foundation`: plataforma escalonada, terraza, plinto), la cubierta (`arch.roof`) y los ornamentos
  (`arch.ornament`: nichos, frisos, bloques ciclópeos, textiles), y usa `arch.monumentalTiers` para la altura
  de los edificios monumentales (huacas moche más altas que las plataformas Caral). Los constructores
  colonial/republicano toman el material de fachada de `arch.wall` (`facadeTex`). El `emblem` sigue en el
  estandarte (`andeanBanner`/`addEmblem`).
- **Silueta por civilización**: `HistoricalArchitectureProfile.silhouette` nombra un motivo atestiguado
  (plaza circular, cabezas clavas, rampa, recinto funerario, montículo bajo, estelas, recinto amurallado,
  patio hundido, ciudadela, pucará, chullpa, andenes, ushnu) que `addCivSilhouette` añade al **centro**
  (y a la **fortaleza** cuando el motivo es defensivo). Así dos civilizaciones coetáneas con el mismo
  `ArchStyle` (p. ej. Chanca y Huanca) difieren en forma, no solo en color; los motivos son abstracciones
  de las formas documentadas en §1.
- **Regla de era**: `Builder.isAndean` exige `era ≤ TAHUANTINSUYO` **y** un estilo andino; en el
  Virreinato en adelante se usa la arquitectura de la era (colonial/moderna).
- **Maravilla (`WONDER`, «Huaca Sagrada»)**: se modela como una **huaca andina escalonada** genérica
  (plataformas, santuario superior y cabezas clavas como **motivo andino abstracto**, no exclusivo de
  Chavín). El WONDER es construible en **cualquier era** en modo maravilla, así que su modelo es
  era-agnóstico (no cambia con la era).
- **Chavín y el Lanzón**: el hito `chavin_temple` modela el templo en U, la plaza circular hundida y las
  cabezas clavas como formas atestiguadas. El **Lanzón** se insinúa dentro de la **Galería del Lanzón**, en
  una cámara interior del Templo Viejo; **no** se modela como monolito exento en el patio. Su silueta,
  proporciones y visibilidad desde la cámara son una abstracción legible para RTS, no una reconstrucción.
  Fuente: [`chavin.md`](./civilizaciones/chavin.md), Rick et al. (1998).
- **Verificación**: `tests/model.test.ts` (cobertura de estilos/emblemas) y
  `tests/e2e/civ-visuals.spec.ts` (dos civilizaciones coetáneas construyen modelos distintos). Revisión
  visual manual con `yarn shot`.
