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
| Quipus y Vigías (`quipus_watchers`) | Horizonte Medio → Horizonte Tardío, Wari e Inca | Registro por quipus de tradición andina (Wari–Inca). |
| Palabra del Amauta (`amauta_words`) | Horizonte Tardío, solo Inca | El *amauta* es un sabio/maestro inca. |
| Chasquis Veloces (`swift_chasquis`) | Horizonte Tardío, solo Inca | Los *chasquis* son los correos del Estado inca; el efecto de capacidad es una abstracción logística, no una afirmación de que transportaran carga. |
| Metalurgia Moche (`moche_metallurgy`) | Intermedio Temprano, solo Moche | Metalurgia y talleres moches; el efecto de ataque es una abstracción de sus armas de metal. |
| Intercambio Interregional (`caral_trade`) | Arcaico Tardío, solo Caral | Intercambio costa-sierra-selva documentado para Caral-Supe. |
| Peregrinaje al Lanzón (`chavin_pilgrimage`) | Horizonte Temprano, solo Chavín | Centro ceremonial y oráculo de Chavín; el efecto económico es una abstracción del peregrinaje. |
| Textiles de Paracas (`paracas_textiles`) | Horizonte Temprano, solo Paracas | Textilería paracas y su intercambio; el efecto de capacidad es una abstracción. |
| Fardos Funerarios (`paracas_funeral`) | Intermedio Temprano, solo Paracas | Fardos funerarios paracas; el efecto de armadura es una abstracción. |
| Orejeras de Pashash (`recuay_gold`) | Intermedio Temprano, solo Recuay | Orfebrería y orejeras de Pashash. |
| Mitimaes (`wari_mitimaes`) | Horizonte Medio, solo Wari | Reasentamientos y red vial wari; el efecto de velocidad es una abstracción logística. |
| Monolitos de Tiahuanaco (`tiahuanaco_monoliths`) | Intermedio Temprano, solo Tiahuanaco | Escultura lítica y monolitos tiahuanacotas; el efecto de armadura es una abstracción. |
| Momia Ancestral (`chanca_mummy`) | Intermedio Tardío, solo Chanca | Los chancas llevaban la momia de sus antepasados al combate; el efecto de ataque es una abstracción. |
| Tumi Ceremonial (`chimu_tumi`) | Intermedio Tardío, solo Chimú | Orfebrería y tumi chimú; el efecto de ataque es una abstracción. |
| Puerta del Sol (`tiahuanaco_gate`) | Horizonte Medio, solo Tiahuanaco | Astronomía y culto tiahuanacota; el efecto de visión es una abstracción. |
| Plazas Fortificadas (`realista_plazas`) | Virreinato → Independencia, solo Realistas | Defensa de las plazas del ejército virreinal; el efecto de armadura es una abstracción. |
| Campaña de la Sierra (`patriota_sierra`) | Independencia, solo Patriotas | Campaña de la sierra y montoneras; el efecto de velocidad es una abstracción. |
| Defensa del Puerto (`republica_puerto`) | República → Contemporáneo, solo República | Defensa portuaria y de Arica (1880); el efecto de armadura es una abstracción. |
| Escuadra Blindada (`chile_escuadra`) | República, solo Chile | Escuadra blindada chilena (Cochrane); el efecto de visión es una abstracción. |

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
- Dragones y uniformes: [`atuendos.md`](./atuendos.md) §3.
- Montoneras y campaña de la sierra: [`civilizaciones/patriotas.md`](./civilizaciones/patriotas.md) e
  [`campanas/independencia.md`](./campanas/independencia.md).
- Defensa de Arica y artillería: [`civilizaciones/republica.md`](./civilizaciones/republica.md),
  [`civilizaciones/chile.md`](./civilizaciones/chile.md) y
  [`campanas/guerra_del_pacifico.md`](./campanas/guerra_del_pacifico.md).

Véase el listado completo en [`fuentes.md`](./fuentes.md).
