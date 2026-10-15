# Fichas de mapa de las campañas

Ficha de cada una de las nueve misiones de **La Senda del Sol**: periodo, civilización, región y los
parámetros visuales que resuelve el sistema de perfiles (`resolveMapProfile` en
`src/model/defs/profiles.ts`). Los rasgos son **abstracciones jugables** de la geografía documentada; la
columna *Arquitectura* es la que resulta de `archProfileFor(civ, era)` (ver [`arquitectura.md`](./arquitectura.md))
y *Landmark* los hitos visuales (`src/model/defs/landmarks.ts`). Datos históricos en [`campanas/`](./campanas/)
y [`mapas.md`](./mapas.md).

| # | Misión | Periodo | Civilización | Región | Mapa | Clima / suelo | Vegetación | Recursos | Arquitectura | Landmark | Fuente |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | La Ciudad Sagrada | Arcaico Tardío | Caral-Supe | `central_coast` | costa | árido, valle fértil (`loam`), humedales | valle (baja) | agricultura de valle, pesca (Áspero), madera | adobe (`coastal-adobe`) | Complejo ceremonial de Caral | [`campanas/caral.md`](./campanas/caral.md) |
| 2 | El Oráculo de Chavín | Horizonte Temprano | Chavín | `andean_valley` | andes | templado-húmedo, quebrada (`loam`) | media-alta | madera, agricultura, pastoreo | mampostería (`andean-masonry`) | — | [`campanas/chavin.md`](./campanas/chavin.md) |
| 3 | La Frontera de los Valles | Intermedio Temprano | Moche | `north_coast` | costa | muy árido, arena | muy baja | agricultura de valle, plata, pesca | adobe con friso (`coastal-adobe`) | Huaca (plataforma ceremonial) | [`campanas/moche_recuay.md`](./campanas/moche_recuay.md) |
| 4 | El Horizonte Medio | Horizonte Medio | Wari | `high_andes` | andes | frío, rocoso (`rocky`) | media | piedra, agricultura (andenes), madera | mampostería (`andean-masonry`) | — | [`campanas/wari_tiahuanaco.md`](./campanas/wari_tiahuanaco.md) |
| 5 | Yahuar Pampa | Horizonte Tardío | Inca | `high_andes` | andes | frío, rocoso (`rocky`) | media | piedra, agricultura (andenes) | cantería + terrazas (`andean-masonry`) | Ushnu / plaza ceremonial | [`campanas/yahuar_pampa.md`](./campanas/yahuar_pampa.md) |
| 6 | La Guerra del Norte | Horizonte Tardío | Inca (vs Chimú) | `north_coast` | costa | muy árido, desierto costero | muy baja | plata, agricultura de valle | mampostería (`andean-masonry`) | — | [`campanas/chimu_inca.md`](./campanas/chimu_inca.md) |
| 7 | La Gran Rebelión | Virreinato | Inca / Realistas | `high_andes` | andes | frío, rocoso | media | plata (mita), agricultura, obrajes | colonial (`colonial`) | — | [`campanas/tupac_amaru.md`](./campanas/tupac_amaru.md) |
| 8 | La Independencia | Independencia | Patriotas | `andean_valley` | andes | templado-húmedo, quebrada | media | agricultura, ganadería, montoneras | republicana (`republican`) | — | [`campanas/independencia.md`](./campanas/independencia.md) |
| 9 | El Caballero de los Mares | República | República del Perú | `south_coast` | costa | desértico, litoral sur | muy baja | pesca, guano, plata | republicana (`republican`) | — | [`campanas/guerra_del_pacifico.md`](./campanas/guerra_del_pacifico.md) |

## Notas

- **Región**: `MissionDef.region` solo se especifica cuando la geografía del escenario difiere de la del
  jugador (m6 = `north_coast`, el Inca en la costa norte chimú; m9 = `south_coast`); en el resto se deduce de
  la civilización (`regionForCiv`). Ver `docs/historia/mapas.md`.
- **Arquitectura por civilización + era** (no por región): m6 juega con el Inca, así que usa su mampostería
  aunque el terreno sea la costa chimú; tras 1532 manda la era (m7–m9 → colonial/republicano), aunque la
  civilización sea andina (m7). Ver `docs/historia/arquitectura.md`.
- **Landmarks**: solo en el *slice* Caral/Moche/Inca y **solo si la región del mapa encaja** con el hito (m6,
  en la costa, no coloca el ushnu andino). Ver `docs/historia/arquitectura.md`.
- Los valores concretos de clima/vegetación/recursos por región están en `HistoricalMapProfile`
  (`src/model/defs/profiles.ts`).

## Fuentes

- Dossiers por campaña en [`campanas/`](./campanas/) (una por misión, citadas en la tabla).
- Periodización y geografía: [`periodizacion.md`](./periodizacion.md), [`mapas.md`](./mapas.md) y
  [`fuentes.md`](./fuentes.md).
