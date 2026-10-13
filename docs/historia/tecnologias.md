# Tecnologías — ventana histórica

Las tecnologías (`src/model/defs/techs.ts`) se limitan por **dos criterios**:

- `minEra`: suelo de nivel tecnológico (se combina con la era del periodo).
- `periods`: **ventana histórica** explícita (autoritativa cuando existe). Si falta, solo aplica `minEra`.

La comprobación vive en `techAvailable(tech, period)` y se aplica de forma central en `Building.queueTech`, en el
panel de investigación del HUD y en la IA. Una tecnología solo existe dentro de su ventana: ni antes (cronología)
ni después/otra cultura (ámbito).

## Ventanas culturales / cronológicas

| Tecnología | Ventana | Motivo |
|---|---|---|
| Telar Andino (`andean_loom`) | Horizonte Temprano → Horizonte Tardío | Tradición textil andina prehispánica (Paracas, Nazca, Wari, Inca). |
| Quipus y Vigías (`quipus_watchers`) | Horizonte Medio → Horizonte Tardío | Registro por quipus de tradición andina (Wari–Inca). |
| Palabra del Amauta (`amauta_words`) | Horizonte Tardío | El *amauta* es un sabio/maestro inca. |
| Chasquis Veloces (`swift_chasquis`) | Horizonte Tardío | Los *chasquis* son los correos del Estado inca. |
| Obrajes y Talleres (`workshops`) | Virreinato → Contemporáneo | Los **obrajes** son talleres textiles coloniales (no existían antes de 1532). |
| Producción en Serie (`mass_production`) | República → Contemporáneo | Producción industrial seriada (posterior a la Independencia). |
| Caballería de Choque (`shock_cavalry`) | Virreinato → Contemporáneo | El caballo llega con la conquista (1532). |
| Defensa Antiaérea / Blindajes Pesados / Cohetería / Ingeniería Blindada / Hidroeléctricas | Contemporáneo | Tecnología del siglo XX. |

Las tecnologías **genéricas** (Canal de Regadío, Arco y Boleadora, Metalurgia de la Plata, Máquinas de Asedio,
Morteros, Cazadores) no declaran ventana: dependen solo de su `minEra`.

## Nota de diseño (conversor)

`amauta_words` desbloquea al `commissar` (unidad de conversión). Al ceñirlo al Horizonte Tardío (inca), los
periodos coloniales y republicanos quedan **sin unidad de conversión**. Se acepta como decisión histórica; si más
adelante se quiere un conversor posterior (p. ej. un *misionero*), se añadirá como contenido aparte con su fuente.

## Fuentes

- Rowe, J. H. (1962) y Lumbreras, L. G.: periodización andina (Horizontes e Intermedios).
- Quipu / chasqui / amauta: Garcilaso de la Vega, *Comentarios reales* (1609); Cieza de León, *Crónica del Perú*.
- Textiles prehispánicos: Tello, J. C. (1929), *Antiguo Perú*; dossier [`civilizaciones/paracas.md`](./civilizaciones/paracas.md).
- Obrajes coloniales y economía virreinal: Basadre, J., *Historia de la República del Perú*.
- Caballo y ganadería colonial: dossier del Virreinato en [`fuentes.md`](./fuentes.md).

Véase el listado completo en [`fuentes.md`](./fuentes.md).
