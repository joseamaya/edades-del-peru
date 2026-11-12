# Campaign redesign: Tahuantinsuyo, Virreinato, Independencia and República

Status: **approved design** (decisions taken 2026-11-12), not implemented. Culturas Preincas (m1–m4) is out of scope and stays as it is.

This document reorganises the three later chapters of *La Senda del Sol* around documented, playable
milestones. The historical research behind every mission, with sources and certainty labels, lives in
Spanish in [`docs/historia/propuestas/`](../historia/propuestas/):

- [`tahuantinsuyo.md`](../historia/propuestas/tahuantinsuyo.md): 14 candidate milestones, myth to Quipaipan.
- [`virreinato.md`](../historia/propuestas/virreinato.md): 17 candidate milestones, 1535 to 1815.
- [`independencia-republica.md`](../historia/propuestas/independencia-republica.md): 15 candidate milestones, 1814 to 1883.

A mission only moves from this proposal into `src/campaign/defs/` after its own dossier exists in
`docs/historia/campanas/` and it follows [`model-mission-pattern.md`](./model-mission-pattern.md) and
[`campaign-experiences.md`](./campaign-experiences.md).

## Why

Today the three chapters are thin and uneven: Tahuantinsuyo has three wars (m5, m6, m6b), Virreinato has one
rebellion (m7) and Independencia y República jumps from 1824 to 1880 in two missions (m8, m9). The author's
direction:

- **Tahuantinsuyo is the longest chapter.** It opens with the foundation myth and follows the empire's
  milestones: Pachacútec, the northern and southern expansion, Chimú, the Pacific voyage, the civil war.
- **Virreinato opens with the conquest and the formation of the viceroyalty**, then the conquistadors' civil
  wars, Manco Inca's resistance, and ends with Túpac Amaru.
- **República carries the independence campaigns** and the later defence of the territory.

## Rules carried over

These are not new; they are the project rules applied to a much larger cast.

- **Label myth and tradition.** Every milestone in the research carries `[DOC]`, `[TRAD]`, `[MITO]` or `[DEB]`.
  Supernatural events are playable only inside a mission labelled **Leyenda**; historical missions narrate them
  as «cuentan que…». m5's pururaucas get the same label.
- **No invented wars, people or numbers.** Only attested names. Chronicle army sizes (100 000+) are rhetorical
  and never shown as data.
- **Traditional chronology is labelled as such.** Inca reign dates come from Rowe (1945) via Cabello Balboa;
  radiocarbon dating moves the expansion earlier (Ogburn 2012; Marsh et al. 2017). The UI writes «c.» and
  «según la cronología tradicional».
- **Counterfactuals are explicit.** Where history lost (Cusco 1536, Vilcabamba 1572, 1781, 1815), the
  mission's objective is to resist, delay or escape, or the counterfactual is declared, as m7 already does.
- **Violence by ellipsis.** Massacres (Huarco, Yahuarcocha), executions (Atahualpa, Túpac Amaru I and II,
  Pumacahua) and violence against civilians (Concepción, Chorrillos) are never a rewarded mechanic; they are
  told in the epilogue or the Codex.
- **Indigenous agency.** Cañaris, huancas, chachapoyas and the collaborating Cusco nobility act on their own
  interests; they are not «traitors». Montoneras and the Breña guerrillas have named, documented leaders.
- **Neighbours.** Chile, Bolivia, Ecuador, Colombia and Spain appear without dehumanisation. 20th-century
  border wars (Leticia 1933, Zarumilla 1941) were evaluated and are **not** proposed.

## Proposed structure

Five chapters instead of four: Independencia y República splits in two (decided, see *Decisions*). Mission ids
for new missions are placeholders; existing ids keep their save keys.

### II. El Tahuantinsuyo (c. XII–1532) — 10 missions + optional

| # | Mission | Date | Player vs rival | Type | Certainty | Status |
|---|---|---|---|---|---|---|
| 1 | **Los hijos de Tambotoco**: the Ayar brothers' exodus from Pacaritambo and the taking of the Cusco valley (huallas, sauaseray, alcabizas) | mythic, s. XII–XIV | Ayar ayllus vs valley ayllus | exodus + local conquest, water as leverage | MITO/TRAD — labelled **Leyenda** | new |
| 2 | **Yahuar Pampa** | 1438 | Cusi Yupanqui vs Chanca | defence | TRAD/DOC | **m5** |
| 3 | **El señor del Collao**: pact with the Lupaca (Cari) and fall of Hatun Colla (Chuchi Cápac) | c. 1440–1460 | Inca vs Colla | diplomacy + assault | TRAD | new |
| 4 | **Cusco renacido**: rebuilding the capital, Sacsayhuamán, Qhapaq Ñan, chasquis and mitmas | 1438–c. 1500 | — | economy / construction (Caral-like) | DOC/TRAD | new |
| 5 | **Chan Chan** | c. 1470 | Túpac Yupanqui vs Minchancaman | siege by water | TRAD | **m6** |
| 6 | **Tumipampa**: cañaris and quitus, founding of the second capital | c. 1460–1470 | Inca vs Cañari-Quitu | open battle + foundation | TRAD/DOC | new |
| 7 | **El Huarco**: peace with Chincha, three-to-four-year seasonal siege with the «Nueva Cusco» | c. 1470–1485 | Inca vs Huarco | diplomacy + seasonal siege | TRAD/DOC | new |
| 8 | **Los cuatro pucarás**: the Colla rebellion of Coaquiri in the altiplano | c. 1475–1480 | Inca vs Colla | multiple siege | TRAD | new |
| 9 | **Yahuarcocha**: Huayna Cápac against caranquis and cayambes | c. 1500–1520 | Inca vs Caranqui-Cayambe | siege by manoeuvre | TRAD/DOC | new |
| 10 | **Quipaipan** | 1529–1532 | Atahualpa vs Huáscar | advance | DOC | **m6b** |

Prologue (decided): Manco Cápac y Mama Ocllo, Garcilaso's Titicaca version, narrated before mission 1.

Optional / unlockable: Tocay Cápac and the ayarmarcas, Huancas and Anco Ayllo's flight, Chachapoyas
(Piajajalca), **the Pacific voyage to Avachumbi and Ninachumbi** (`[DEB]`, labelled tradition), the Antisuyo
entry, Cuzcotuyo against the chiriguanos, **the Maule frontier** against the promaucaes (`[DEB]`: chronicles
say c. 1480–1490, archaeology c. 1400). Epilogue: Cajamarca as a cinematic, not a mission.

Notes for existing missions:

- **m6:** per Sarmiento (cap. XXXVIII) the first clash with the Chimú is led by **Cápac Yupanqui**,
  Pachacútec's brother, later executed; the conquest itself is Túpac Yupanqui's northern campaign (cap. XLIV).
  The m6 dossier should mention the earlier clash.
- **m5:** label the pururaucas as tradition.

### III. El Virreinato (1532–1781) — 9 missions + optional

Prologue: **Cajamarca (1532)** as a narrated cinematic, the same text that closes Tahuantinsuyo seen from the
other side. It is not playable: a few hours' ambush and massacre gives no honest RTS decision from either side.

| # | Mission | Date | Player vs rival | Type | Status |
|---|---|---|---|---|---|
| 1 | **La Ciudad de los Reyes**: founding Lima and Quizu Yupanqui's siege | 1535–1536 | Pizarro and Andean allies vs Inca | build + defend | new |
| 2 | **Cusco en llamas**: the siege of Cusco and Sacsayhuamán | 1536 | Manco Inca vs the Pizarros and Cañari allies | siege; the farming calendar breaks the siege | new |
| 3 | **Las terrazas de Ollantaytambo** and the withdrawal to Vilcabamba | 1537 | Manco vs Hernando Pizarro, Orgóñez | defend + escape | new |
| 4 | **Nueva Castilla o Nueva Toledo**: Las Salinas, Chupas as second act; epilogue, the Viceroyalty (20 Nov 1542) | 1538 / 1542 | pizarristas vs almagristas | open battle | new |
| 5 | **El Pacificador**: La Gasca against Gonzalo Pizarro, Iñaquito to Jaquijahuana | 1546–1548 | La Gasca vs Gonzalo, Carvajal | desertion and diplomacy + battle | new |
| 6 | **El último Inca**: Vilcabamba and Túpac Amaru I | 1572 | Túpac Amaru I vs Toledo | resist + escape | new |
| 7 | **El bloqueo del Callao**: the Nassau fleet (L'Hermite), Drake 1579 prologue, the Lima wall (1684) epilogue | 1624 | Viceroyalty vs Dutch fleet | coastal defence | new — needs water/ships |
| 8 | **El invencible**: Juan Santos Atahualpa in the central selva | 1742–1752 | Asháninka and Juan Santos vs frontier forts | siege, ambush, resistance | new — needs selva biome |
| 9 | **La Gran Rebelión**: Túpac Amaru II | 1780–1781 | rebels vs royalists | as today (declared counterfactual) | **m7** |

Optional, by priority: **Después del mar** (1746 earthquake and tsunami, Real Felipe, Huarochirí 1750) as a
10th mission between 7 and 8; Túpac Katari's siege of La Paz (1781) after m7; Hernández Girón (1554); a mita
and reducciones economy mission. Taki Onqoy had no war: narrative interlude only. Vilcaconga/Quizquiz (1533)
can bridge the two chapters as an optional mission.

Perspective alternates: Hispanic in 1, 4, 5, 7; Indigenous in 2, 3, 6, 8, 9. If the chapter must be shorter,
merge 2+3 and 4+5 into six missions.

### IV. La Independencia (1814–1826) — 7 missions

| # | Mission | Date | Player vs rival | Type | Status |
|---|---|---|---|---|---|
| 1 | **La Junta del Cusco**: Pumacahua and the Angulo brothers, La Apacheta and Umachiri | 1814–1815 | Cusco rebels vs royalists | rebellion; history lost | new |
| 2 | **De Pisco a Pasco**: landing at Paracas, Arenales's sierra campaign | Sep–Dec 1820 | San Martín, Arenales vs royalists | landing + raid | new |
| 3 | **El cerco de Lima**: montoneras, proclamation (28 Jul) and the first siege of Callao | Jul–Sep 1821 | patriots and montoneras vs royalists | siege + guerrilla | new |
| 4 | **Intermedios**: Torata and Moquegua (optional) | Jan 1823 | patriots vs Valdés, Canterac | fighting withdrawal | new (optional) |
| 5 | **Junín** | 6 Aug 1824 | Bolívar vs Canterac | cavalry battle | from **m8** |
| 6 | **Ayacucho** | 9 Dec 1824 | Sucre vs La Serna | decisive battle | from **m8** |
| 7 | **El último bastión**: Rodil in the Real Felipe | 1824–23 Jan 1826 | patriots vs Rodil | long siege | new |

The montoneras are a cross-mission mechanic (ambush, rolling stones), not a mission of their own. Pumacahua
opens this chapter rather than closing Virreinato: 1814 belongs to the cycle of the juntas and Cádiz
(O'Phelan); the irony that he fought *against* Túpac Amaru in 1780 is the hook, and m7's epilogue can
announce it.

### V. La República (1836–1883) — 6 missions

| # | Mission | Date | Player vs rival | Type | Status |
|---|---|---|---|---|---|
| 1 | **Socabaya**: the Peru-Bolivian Confederation (optional) | 1836 | Santa Cruz vs Salaverry | open battle | new (optional) |
| 2 | **Las baterías del Callao**: Dos de Mayo | 2 May 1866 | Callao batteries vs Spanish squadron | coastal defence | new — ships as scripted structures |
| 3 | **La quebrada**: Tarapacá, after a narrated naval interlude (Iquique, Punta Gruesa, Angamos) | 27 Nov 1879 | Peru vs Chile | ambush in the ravine | new |
| 4 | **La defensa de Arica** | 7 Jun 1880 | Bolognesi vs Chile | defence | **m9**, refocused on land |
| 5 | **San Juan y Miraflores** | 13–15 Jan 1881 | Peru vs Chile | defence lines and redoubts | new |
| 6 | **El brujo de los Andes**: the Breña, Pucará and Marcavalle to Huamachuco | 1882–1883 | Cáceres and montoneras vs Chile | guerrilla campaign | new |

Andrés A. Cáceres (Tarapacá, Miraflores, the Breña) is the thread of the chapter. The naval war is an
interlude because the game has no ships; m9's current naval framing (Huáscar, Grau) moves into it.

## Factions and assets

Existing factions cover a large part: Inca, Chanca, Chimú, Chincha, Collas-Lupaca, Huanca, Realistas,
Patriotas, República, Chile. New ones, by the mission that first needs them:

| Faction / unit | First mission | Minimal solution |
|---|---|---|
| Ayllus del valle del Cusco (huallas, sauaseray, alcabizas) | Tahuantinsuyo 1 | minor village faction, no professional army |
| Cañari-Quitu-Caranqui | Tahuantinsuyo 6, 9 | one faction for the north |
| Promaucae | Maule (optional) | only if the optional Maule mission is built |
| Hueste indiana (pizarrista, almagrista, gonzalista variants) | Virreinato 1 | one faction; variants as colours and heroes |
| Realistas of the 16th century (Vaca de Castro, La Gasca, Toledo) | Virreinato 4 | early-era `realistas`, no flintlocks or dragoons |
| Andean allies (cañaris, chachapoyas) | Virreinato 1–3 | reuse `huanca`, add a Cañari unit |
| Incas of Vilcabamba | Virreinato 2, 3, 6 | `inca` with captured horses and arms, Anti archers |
| Foreign fleets (Dutch 1624, Spanish 1866) | Virreinato 7, República 2 | ships as scripted structures on a fixed route |
| Asháninka | Virreinato 8 | new; needs a selva biome |
| Guerrilla / montonera unit | Independencia 3, República 6 | one shared unit with ambush |
| Coastal fortification set (Real Felipe, batteries, redoubts) | Independencia 3, 7; República 2, 4, 5 | reusable buildings |
| Afro-Peruvian units | Virreinato (Girón, 18th-century militias) | unit, not faction |

Engine gaps that gate missions: **water and ships** (Virreinato 7, República 2, the Pacific voyage), **selva biome**
(Virreinato 8, Antisuyo and Chachapoyas optionals), **seasonal calendar** (Virreinato 2, Tahuantinsuyo 7).

## Rollout

The chapters cannot all be rebuilt at once, and every mission has to reach Caral's quality bar. Proposed
order, one mission at a time through the model-mission pattern:

1. **Fix the existing missions' facts**: m6 (Cápac Yupanqui), m5 (pururaucas as tradition), m8 split into
   Junín and Ayacucho, m9 refocused on land with the naval interlude.
2. **Tahuantinsuyo 1, «Los hijos de Tambotoco»**: it opens the longest chapter and fixes the Leyenda label
   and framing for the whole game.
3. **Tahuantinsuyo 4, «Cusco renacido»**: an economy mission that reuses Caral's construction phases.
4. **Virreinato 1–3** (Lima, Cusco, Ollantaytambo): one arc, one new faction (hueste indiana).
5. **Independencia 1–3**, then the rest by chapter.
6. **Engine work in parallel**: navigable water and ships, then the selva biome. Virreinato 7, Virreinato 8,
   República 2 and the Pacific voyage wait for them.

## Decisions

All five were taken by the author on 2026-11-12.

1. ~~Split Independencia y República~~ **Decided: two chapters**, La Independencia (1814–1826) and La
   República (1836–1883). Each has its own arc and enemy logic; the save key of the current `independencia`
   chapter stays with La Independencia, and La República gets a new id.
2. ~~Foundation myth~~ **Decided: Pacaritambo + prologue.** Mission 1 follows the Ayar brothers from
   Pacaritambo (Betanzos 1551, Cieza, Sarmiento 1572), labelled **Leyenda**. Garcilaso's Manco Cápac and
   Mama Ocllo from the Titicaca (1609) is an optional narrated prologue before it, with a Codex card that
   names who wrote each version and why.
3. ~~Mission 8 of Tahuantinsuyo~~ **Decided: the four pucarás** (Collao, inside Peru, reuses Collas-Lupaca).
   The Maule moves to the optional missions.
4. ~~The Pacific voyage~~ **Decided: optional mission**, labelled **Tradición** (`[DEB]`). It tells the
   voyage as Sarmiento and Cabello Balboa recorded it, with the islands of Avachumbi and Ninachumbi left
   unidentified and the debate in its Codex card. It needs balsa rafts and open sea, so it depends on the
   water and ships decision below.
5. ~~Engine scope~~ **Decided: build both.** Navigable water with ships (Dutch fleet 1624, Spanish squadron
   1866, the balsa rafts of the Pacific voyage) and a selva biome (Juan Santos Atahualpa; Chachapoyas and the
   Antisuyo as optionals). Each is its own engine work item, landed and benchmarked before the first mission
   that needs it; until then those missions stay unbuilt rather than faked on land.
