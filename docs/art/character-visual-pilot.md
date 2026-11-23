# Character visual pilot

**Status:** Living · **Date:** 2026-11-23 · **Branch:** `feat/character-visual-pilot` and
`feat/andean-equipment-standard`

The audit and performance numbers below are a **2026-11-23 snapshot**; update them when the rig,
equipment or budgets change.

This pilot raises the field appearance of three representative infantry units to the stylized-realism
standard of [`../design/art-direction.md`](../design/art-direction.md) §4.1. It audits the shared rig,
replaces the primitive period equipment with shaped garments and gear, keeps the proven skeleton and clips,
and measures the result against the project budgets. §8 extends the same standard to the documented Andean
warrior sets and to the late-colonial bicorn.

It is deliberately **not** a library-wide rebuild: a handful of cultures/periods are in scope. The historical
facts and their certainty stay in [`../historia/atuendos.md`](../historia/atuendos.md); this document does not
restate the dossiers.

![Before and after: Inca warrior, 16th-century arquebusier and 1879 fusilier](../media/character-pilot-before-after.webp)

![Idle, attack and death of the three units](../media/character-pilot-animations.webp)

## 1. Audit of the current system

The runtime source of truth is `src/model/defs/modelAssets.ts` and
`src/rendering/modelAssetRegistry.ts`. Every humanoid unit uses one asset, `caral_worker.glb`:

| Item | Measured |
| --- | --- |
| Skeleton | 65 bones, shared by every humanoid variant |
| Clips | 11: idle, walk, walk-carry, gather, build, jab, shoot, sword, throw, death, tree-chop |
| Geometry | 14,367 triangles, 10 materials, 15 meshes |
| File | 2.36 MiB, of which 1.53 MiB are four embedded PNG textures |
| Per-unit cost (bench baseline) | ~9.3k triangles and ~8–9 draw calls including the shadow pass |
| Budget | 40 draws / 40k triangles (bench); art-direction target 25 / 25k for a common unit |
| `dist/` | 27.61 MiB of 28 MiB; first-play payload 1.87 MiB gzip |

The mounted, siege and vehicle rigs are separate GLBs and were not changed; this pilot is infantry-only. The
art-direction camera distances are 28 (close), 54 (default) and max zoom; the captures validate close and
default.

The reusable system is sound: `ModelAssets` (cache, preload, fallback), `RigInstance` (independent skeleton
and mixer, crossfades, grounded feet), the variant table, `consolidateRig`, `limitShadowCasters` and the
`rigClipStateFor` state machine. None of that was replaced.

The real limitations were in the dressing layer:

- The post-1532 uniform added a **cylinder coat** over the body, a **cone** morion, a **box/cylinder** kepi,
  a flat shield and a box-headed macana. No sleeves, breeches, boots, bandolier, cartridge pouches or
  bayonet.
- The Inca soldier had a headband, a rodela and a porra, but no padded helmet, V yoke or sandals.
- The 16th-century Spanish soldier reused the 18th-century Bourbon blue/red abstract coat.
- Body proportions are still the CC0 ~8-head mannequin; the face is texture-only and the eyes are hidden.

## 2. The new-GLB attempt and why the pilot uses runtime equipment

The first implementation authored three new GLBs (`inca_infantry`, `spanish16_infantry`,
`republic1879_infantry`) by loading the finished worker, adding period garments/gear and re-exporting with
`GLTFExporter` + meshopt. The assets loaded and measured 0.55–0.64 MiB each, but **the shared skin broke**:

- At rest the body looked correct.
- As soon as `Idle_Loop` moved a bone, chest vertices were skinned to `y = 2.27–4.10` while the same bones
  stayed at `y = 1.27–1.52`. The body stretched into a pole; the tunic/skirt collapsed onto the head.
- The cause is the worker's meshopt-normalized geometry plus the shared inverse bind matrices. Re-exporting
  the body and adding new skinned meshes does not preserve the bind relationship for every mesh.
- Disabling quantization, rebaking the bind pose to world space and rebuilding the skeleton did not fix it
  within the pilot's budget. The exported skin still disagrees with the animation tracks.

The experiment was removed. The pilot therefore uses the project's existing, proven path: **runtime
bone attachments on the shared worker rig** (`workerAttire.ts`, `uniformAttire.ts`), which keeps the
skeleton, clips, save/replay determinism and fallback intact. This is a deliberate result of the audit, not
a shortcut: **re-exporting the finished worker GLB** is not safe. A source-based build (the
`tambotoco_hero.glb` path) remains viable, but extending it to three new bodies was outside this pilot's
budget.

## 3. The three units

| Unit | Unit kinds / variants | Mission used for validation | Why this unit |
| --- | --- | --- | --- |
| **Guerrero inca** | `INCA_WARRIOR` and Inca `SOLDIER` → `inca_soldier_*`; slinger → `inca_ranged_*` | `m_cusco_1536` (12 + Manco Inca), `m_vilcabamba`, allies in `m_lima` | The imperial infantry is the icon of the Tahuantinsuyo and appears in formation. |
| **Arcabucero, 1535–1572** | `MUSKETEER` and `SOLDIER` realistas with the morion → `realistas_soldier_*` / `realistas_ranged_*` | `m_lima` (3 arcabuceros + 8 soldiers; player is the Hueste indiana) | The conquest mission; the firearm and morion are the period signature. |
| **Fusilero / defensor, 1879** | `REPUBLICA_DEFENSOR` and `RIFLEMAN` → `republica_soldier_*` / `republica_ranged_*`; Chile shares the gear | `m_tarapaca` (8 defensores + 3 fusileros + Cáceres) | The War of the Pacific is the third distinct material language: wool, leather, steel and the kepi. |

`INCA_SLINGER` is pinned to the Andean rig, so the slinger also receives the Inca helmet/yoke but keeps
`sling`/`OverhandThrow`. The Ayar and the Killke/ayllu cultures stay on the old shared dressing.

## 4. Historical and visual references

The certainty table distinguishes documentation from reconstruction; no new historical claim is introduced.

| Element | Status | Basis |
| --- | --- | --- |
| Inca uncu, taparrabos, rodela, porra/macana, honda, padded protection | Documented | `atuendos.md` §1–2, §6 (Museo Larco, Métraux, LACMA/Dumbarton Oaks/Met) |
| Inca tocapu/checkerboard and red V yoke | Documented as a garment pattern; the exact layout is an abstraction | `atuendos.md` §1 |
| Inca quilted helmet, V yoke and usuta sandals | Plausible reconstruction | Padded protection is documented; the specific helmet/sandal shape is a game abstraction |
| 1879 Peruvian blue guerrera, kepi, rifle and bayonet | Documented | `atuendos.md` §4 (Guerra del Pacífico uniformology report) |
| 1878–79 Chilean blue coat, kepi, garance trousers | Documented | `atuendos.md` §4 (Chilean uniform decree, 1878) |
| 1535–1572 morion, doublet, breeches, boots, arquebus, sword | **Plausible reconstruction** | The repository has no 16th-century regimental uniform source; the blue/red table entry is 18th-century (Bourbon) |
| Exact regiment, buttons, facings and colours | Not claimed | Deliberately omitted |

Visual references are Age of Empires IV (readability at two camera distances, material honesty) and 0 A.D.
(civilization differentiation by silhouette). Only principles were studied; no model, texture or design was
copied. No external asset was downloaded or added.

## 5. Changes

### Inca (`src/rendering/workerAttire.ts`)

- Quilted cotton helmet (cap plus three bands) for soldiers and slingers.
- Red V yoke on the chest.
- Convex rodela with a stone boss instead of a flat cylinder.
- Slimmer wooden macana with an icosahedral stone head.
- Usuta sandals (sole plus strap) per foot.
- The shared uncu/skirt/wrap keep their existing skinning and are tinted from the civilization palette.

### Spanish and Republican (`src/rendering/uniformAttire.ts`)

- The worker tunic is the coat/doublet; the extra cylinder coat was removed.
- Sleeves and collar cover the short-sleeved body.
- Breeches/trousers and boots/shoes on the leg bones.
- Proper lathe morion with comb; bicorn for the late realistas; kepi with crown, top, visor and band.
- Bandolier with five powder flasks; waist belt, cartridge belt, pouches and sash.
- Musket/rifle with barrel, stock, butt, lock, band and bayonet; sword for the melee role.
- The 1535–1572 Spanish variant uses buff wool and brown breeches instead of the Bourbon blue/red; the
  late realistas keep the blue coat.
- Gear is merged per bone into a few vertex-coloured draws; the static skinned body is consolidated.

### Tooling and tests

- `scripts/bench_character_pilot.mjs` (`yarn bench:characters`) measures the three units in their missions
  and asserts the common-unit ceiling.
- `tests/model-assets.test.ts` now checks the new attachment names (`attire_post_morion`, bicorn, sleeves,
  weapon) instead of the removed cylinder coat.
- The 1535–1572 kit is recorded here as a plausible reconstruction. `atuendos.md` documents the
  18th-century blue/red uniform and the 1879 uniforms; it has no 16th-century regimental source.

No gameplay, balance, combat, save or replay behaviour changed. No new dependency or asset was added.

## 6. Before and after

The contact sheet at the top compares the same three units, missions and camera setup:

| Unit | Before | After |
| --- | --- | --- |
| Inca | Headband, flat shield, box-headed club, bare feet | Padded helmet, red V yoke, convex rodela, stone macana, sandals |
| Spanish 1535–1572 | Blue cylinder coat, cone morion, bare feet | Buff coat with sleeves, breeches, boots, lathe morion, sash, bandolier, arquebus |
| Republican 1879 | Blue cylinder coat, plain kepi, bare feet | Blue coat with sleeves, kepi with visor, gaiters, cartridge belt, rifle and bayonet |

Committed captures: [`character-pilot-before-after.webp`](../media/character-pilot-before-after.webp),
[`character-pilot-lineup.webp`](../media/character-pilot-lineup.webp),
[`character-pilot-inca.webp`](../media/character-pilot-inca.webp),
[`character-pilot-spanish.webp`](../media/character-pilot-spanish.webp) and
[`character-pilot-republic.webp`](../media/character-pilot-republic.webp). The local full-resolution PNGs are
in `review/pilot/` and `review/pilot-before/` (gitignored). The captures use the mission opening with HUD
hidden, `low=1`, `fog=0`, fixed noon light, seed from the mission, a close three-quarter camera and the
unit's `idle` clip. `node scripts/capture_character_pilot.mjs --out=review/pilot` reproduces the set; run the
same script from an `origin/main` worktree with `--out=review/pilot-before` for the before set. At the default
height 54 the unit reads as a small silhouette and colour block; the equipment is a close/cinematic read.
The attack column uses the shared `Sword_Regular_A`/`Pistol_Shoot`/`OverhandThrow` clips and the death
column uses `Death01`; the firearm attack is the shared one-handed pistol clip, not a two-handed musket
aim, and `run`/hit reactions are still missing.

## 7. Tests and performance

| Gate | Result |
| --- | --- |
| `yarn typecheck` | pass |
| `yarn lint` | pass, 0 warnings |
| `yarn format:check` | pass |
| `yarn test` | 129 files, 1,089 tests, pass |
| `yarn build` | pass |
| `yarn dist:check` | 27.61 MiB / 28 MiB; first play 1.87 MiB gzip; loader 2 KB gzip |
| `yarn bench:characters` | Inca 15 / 10.7k; Spanish 22 / 14.2k; Republican 20 / 11.7k; Moche 12 / 9.4k; Wari 13 / 10.1k; Chimú 10 / 9.1k; late realista 22 / 12.7k (draws / triangles) |

The measurement is the isolated unit cost (main + shadow pass) in its mission or skirmish, using the same
shown/hidden delta as the rig bench. The old primitive gear measured ~8–9 draws for the shared worker;
the new gear stays at or below the 25-draw common-unit target and 9.1–14.2k triangles, below the 25k
common-unit target. A 12-unit formation measures 168 / 264 / 246 / 144 / 156 / 120 / 264 draws and
0.13–0.14 ms/frame of mixer work for the twelve units; the Spanish and late-realista formations stay under
the 280-draw scene cap. The Spanish and the late realista are at 22 draws, so a third accessory per bone
should be merged into an existing draw.

**LOD, instancing and memory.** The rig has no LOD or instancing: every unit owns a skeleton and mixer, while
geometry, materials and clips are shared by the asset cache. The pilot adds no game asset or texture, so GPU
memory and the 28 MiB `dist` budget are unchanged. A future LOD would need a non-skinned or impostor path,
not another skinned mesh.

## 8. Extension: Andean warriors and the late realistas

The same runtime standard was then applied to the remaining documented pre-Hispanic warrior sets and to the
late-colonial bicorn. Only elements the dossier already describes were shaped; cultures whose dossier says
«no documentado» keep the shared base and gain no invented garment.

![Before and after: Moche, Wari, Chimú and the late realista](../media/character-standard-andean.webp)

| Culture / unit | Documented element | Runtime change | Certainty |
| --- | --- | --- | --- |
| **Moche** (`moche_soldier_*`) | conical metal helmet, trapezoidal backflap, ear spools, circular shield, star/rosette club heads | cone with a brow rim and a top knob; trapezoid back plate; flared ear spools; domed rodela with a boss; six-point star head | shape documented; the backflap material is a leather-brown abstraction |
| **Wari** (`wari_soldier_*`) | chest and back armour joined by the shoulders, pectoral disc, ear spools | domed chest disc with a rim and central boss, matching back plate and two shoulder straps, all outside the tunic | documented; the plate is modelled as a metal disc |
| **Chimú / Recuay** (`chimu_*`, `recuay_*`) | metal ear spools (Chimú also masks/tumi) | flared ear spools; the shared rodela and star macana | spools documented; **no garment is claimed** and the masks/tumi stay unmodelled, as the dossier already notes |
| **Chanca** (`chanca_*`) | face paint | unchanged | documented |
| **Late realistas / patriotas** (1780–1826) | bicorn | lens brim with upswept corners and a low crown, replacing the box brim + cylinder that read as a top hat | documented headwear; the exact crown is an abstraction |

The Moche backflap material is not documented; painting it leather-brown makes the plate read against the red
tunic. The dossier documents the trapezoidal shape, not the material, so this is a presentation choice.

### Costs and testing

Per-unit cost (main + shadow, `yarn bench:characters`): Moche 12 draws / 9,441 triangles; Wari 13 / 10,101;
Chimú 10 / 9,109; late realista 22 / 12,674. All are inside the 25-draw / 25k common-unit ceiling; the Moche,
Wari and Chimú gear also got cheaper than the previous version because the ear spools, the shield boss and the
Wari straps are merged per bone (the earlier build was 14 / 16 / 12).

`tests/model-assets.test.ts` now covers the shaped bicorn (wider than deep) and the Moche trapezoid (wider at
the bottom); the existing Moche/Wari/Chimú E2E specs keep asserting the documented gear names.
`scripts/bench_character_pilot.mjs` and `scripts/capture_character_pilot.mjs` cover the seven units.

## 9. Pending issues

1. **Body proportions and face.** The shared CC0 body is still ~8 heads and texture-faced. The pilot improves
   clothing and equipment, not anatomy. The art direction asks for 6.5–7 heads and a stronger head/hand
   read; that requires a body pass, not another accessory.
2. **Bind-matrix-safe GLB export.** Re-exporting the finished worker GLB remains blocked by the shared-skeleton
   problem in §2. A future body replacement should start from the original Quaternius sources (the
   `tambotoco_hero.glb` path) or prove that its export preserves the inverse bind matrices and tracks.
3. **Per-role animation.** `run` and a hit reaction are still missing from the shared worker; the recent
   `Pistol_Shoot` covers the firearm attack, but it is a one-handed pistol clip rather than a two-handed
   musket/rifle aim. `Death01` is registered and `playDeath` freezes it; the death column is in the contact
   sheet above. Adding `Jog_Fwd_Loop`/`Hit_Chest` would require rebuilding the worker GLB and wiring a
   presentation-only reaction.
4. **Rigid cloth at joints.** Sleeves and breeches are rigid bone attachments; deep poses can show a crease
   at the elbow/knee. At the RTS camera it is not visible; a skinned garment needs the bind-safe path.
5. **Shared dressers.** `dressUniform` serves every post-colonial variant and `dressCaralWorker` every Andean
   one. The shaped gear now reaches the Moche, Wari, Recuay, Chimú, late realistas and patriotas, but the
   m7 rebels, the modern roles and the remaining Andean cultures (Tiahuanaco, Nazca, Chincha, Collas,
   Huanca, Killke) still need their own review; the pilot's captures cover seven units, not every variant.
   Where the dossier says «no documentado», the shared base stays and no garment is invented.
6. **Draw-call headroom.** The Spanish and the late realista are at 22 draws. A third accessory per bone
   should be merged into an existing gear draw, not added as a new mesh.

## 10. Recommendation

**The runtime equipment standard is worth keeping and extending, but it is not yet a complete character
standard.**

- The standard now covers seven units (Inca, 16th-century Spanish, 1879 Republican/Chilean, Moche, Wari,
  Chimú/Recuay and the late realista) with documented, shaped gear, the proven rig and every gate green.
  Extend the rest of the infantry culture by culture with the `yarn bench:characters` ceiling, and stop
  wherever the dossier says «no documentado» instead of inventing a garment.
- The next real quality step is the body: proportions (~8 heads today, 6.5–7 asked), hands and face. Until
  that pass lands the result reads as a well-equipped mannequin, and no amount of gear will change it.
- Keep the shared `caral_worker` body and clips for now. A new body must come with a bind-safe GLB export
  and a before/after that proves the animation did not stretch.
- The 28 MiB budget is untouched because the gear is runtime geometry; that is the strongest argument for the
  runtime path until the export problem is solved.
- If a future pass adds headwear or a cuirass to the remaining cultures, merge it into an existing bone draw
  first: the Spanish and the late realista are already at 22 of the 25 available draws.

## See also

[`../design/art-direction.md`](../design/art-direction.md) §4.1 ·
[`../design/characters.md`](../design/characters.md) ·
[`../historia/atuendos.md`](../historia/atuendos.md) ·
[`../design/visual-language.md`](../design/visual-language.md) ·
[`../design/asset-pipeline.md`](../design/asset-pipeline.md)
