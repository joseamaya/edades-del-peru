# Tecnologías — ventana histórica

Las tecnologías (`src/model/defs/techs.ts`) se limitan por una **ventana histórica**:

- `minPeriod`: periodo más antiguo en que la tecnología es plausible (suelo).
- `maxPeriod`: periodo más reciente (inclusive); si falta, aplica desde `minPeriod` en adelante.

La comprobación vive en `techAvailable(tech, period)` y se aplica de forma central en `Building.queueTech`, en el
panel de investigación del HUD y en la IA. Una tecnología solo existe dentro de su ventana: ni antes (cronología)
ni después/otra cultura (ámbito).

## Ventanas con techo (`maxPeriod`)

| Tecnología | Ventana | Motivo |
|---|---|---|
| Telar Andino (`andean_loom`) | Horizonte Temprano → Horizonte Tardío | Tradición textil andina prehispánica (Paracas, Nazca, Wari, Inca). |
| Quipus y Vigías (`quipus_watchers`) | Horizonte Medio → Horizonte Tardío | Registro por quipus de tradición andina (Wari–Inca). |
| Palabra del Amauta (`amauta_words`) | Horizonte Tardío | El *amauta* es un sabio/maestro inca. |
| Chasquis Veloces (`swift_chasquis`) | Horizonte Tardío | Los *chasquis* son los correos del Estado inca. |

## Suelo por cronología (`minPeriod`)

| Tecnología | Desde | Motivo |
|---|---|---|
| Canal de Regadío (`irrigation_canal`) | Arcaico Tardío | Riego y canales (Caral). |
| Arco y Boleadora (`bow_and_bolas`) | Horizonte Temprano | Armamento de caza/guerra prehispánico. |
| Metalurgia de la Plata (`silver_metallurgy`) | Horizonte Temprano | Metalurgia andina de la plata. |
| Caballería de Choque (`shock_cavalry`) | Virreinato | El caballo llega con la conquista (1532). |
| Máquinas de Asedio (`siege_engines`), Morteros (`siege_mortars`) | Virreinato | Asedio y pólvora tras 1532. |
| Obrajes y Talleres (`workshops`) | Virreinato | Los **obrajes** son talleres textiles coloniales (no existían antes de 1532). |
| Cazadores (`hunters`) | Virreinato | Cazadores de largo alcance con pólvora. |
| Evangelización (`evangelization`) | Virreinato | Doctrinas y misiones: desbloquea al **Misionero** (conversor colonial). |
| Producción en Serie (`mass_production`) | República | Producción industrial seriada (posterior a la Independencia). |
| Defensa Antiaérea, Blindajes Pesados, Cohetería, Ingeniería Blindada, Hidroeléctricas | Contemporáneo | Tecnología del siglo XX. |

## Nota de diseño (conversores)

La conversión de unidades la dan dos unidades culturalmente acotadas: el **Amauta** (`amauta_words`, inca,
Horizonte Tardío) y el **Misionero** (`evangelization`, colonial/republicano, Virreinato en adelante). Así cada
época con acceso a un conversor lo tiene con la figura histórica que le corresponde.

## Fuentes

- Rowe, J. H. (1962) y Lumbreras, L. G.: periodización andina (Horizontes e Intermedios).
- Quipu / chasqui / amauta: Garcilaso de la Vega, *Comentarios reales* (1609); Cieza de León, *Crónica del Perú*.
- Textiles prehispánicos: Tello, J. C. (1929), *Antiguo Perú*; dossier [`civilizaciones/paracas.md`](./civilizaciones/paracas.md).
- Obrajes coloniales: Wikipedia, [Obraje](https://es.wikipedia.org/wiki/Obraje); Assadourian, C. S., *El sistema de la economía colonial* (1982).
- Caballo y ganadería colonial: dossier del Virreinato en [`fuentes.md`](./fuentes.md).

Véase el listado completo en [`fuentes.md`](./fuentes.md).
