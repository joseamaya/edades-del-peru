# Fichas de mapa de las campañas

Ficha de cada una de las nueve misiones de **La Senda del Sol**: periodo, civilización, región y los
parámetros visuales que resuelve el sistema de perfiles (`resolveMapProfile` en
`src/model/defs/profiles.ts`). Los rasgos son **abstracciones jugables** de la geografía documentada; la
columna *Arquitectura* es el `ArchStyle` del perfil (ver [`arquitectura.md`](./arquitectura.md)) y *Landmark*
los hitos visuales (`src/model/defs/landmarks.ts`). Datos históricos en
[`campanas/`](./campanas/) y [`mapas.md`](./mapas.md).

| # | Misión | Periodo | Civilización | Región | Mapa | Clima / suelo | Arquitectura | Landmark |
|---|---|---|---|---|---|---|---|---|
| 1 | La Ciudad Sagrada | Arcaico Tardío | Caral-Supe | `central_coast` | costa | árido, valle fértil (`loam`), humedales | adobe (`coastal-adobe`) | Complejo ceremonial de Caral |
| 2 | El Oráculo de Chavín | Horizonte Temprano | Chavín | `andean_valley` | andes | templado-húmedo, quebrada | mampostería (`andean-masonry`) | — |
| 3 | La Frontera de los Valles | Intermedio Temprano | Moche | `north_coast` | costa | muy árido, arena, ríos transversales | adobe con friso (`coastal-adobe`) | Huaca (plataforma ceremonial) |
| 4 | El Horizonte Medio | Horizonte Medio | Wari | `high_andes` | andes | frío, rocoso, andenes | mampostería (`andean-masonry`) | — |
| 5 | Yahuar Pampa | Horizonte Tardío | Inca | `high_andes` | andes | frío, rocoso, andenes | cantería + terrazas (`andean-masonry`) | Ushnu / plaza ceremonial |
| 6 | La Guerra del Norte | Horizonte Tardío | Inca (vs Chimú) | `north_coast` | costa | muy árido, desierto costero | adobe (`coastal-adobe`) | — |
| 7 | La Gran Rebelión | Virreinato | Inca / Realistas | `high_andes` | andes | frío, rocoso | colonial (`colonial`) | — |
| 8 | La Independencia | Independencia | Patriotas | `andean_valley` | andes | templado-húmedo, quebrada | republicana (`republican`) | — |
| 9 | El Caballero de los Mares | República | República del Perú | `south_coast` | costa | desértico, litoral sur | republicana (`republican`) | — |

## Notas

- **Región explícita por misión**: `MissionDef.region` (p. ej. m6 usa `north_coast` aunque el jugador sea el
  Inca, porque el escenario es la costa norte chimú; m9 usa `south_coast`, el litoral del Pacífico sur).
- **Arquitectura por periodo**: tras 1532 la era manda (m7–m9 usan el look colonial/republicano), aunque la
  civilización jugadora sea andina (m7). Ver `docs/historia/arquitectura.md`.
- **Landmarks**: solo en el *slice* Caral/Moche/Inca y **solo si la región del mapa encaja** con el hito (por eso
  m6, en la costa, no coloca el ushnu andino). Ver `docs/historia/arquitectura.md`.
- Los rasgos de clima/vegetación/recursos de cada región están en [`mapas.md`](./mapas.md) y en
  `HistoricalMapProfile`.

## Fuentes

- Dossiers por campaña en [`campanas/`](./campanas/) (Caral, Chavín, Moche–Recuay, Wari–Tiahuanaco,
  Yahuar Pampa, Chimú–Inca, Túpac Amaru, Independencia, Guerra del Pacífico).
- Periodización y geografía: [`periodizacion.md`](./periodizacion.md), [`mapas.md`](./mapas.md) y
  [`fuentes.md`](./fuentes.md).
