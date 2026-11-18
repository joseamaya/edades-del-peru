# Tarapacá 1879 — model mission

**Mission:** `m_tarapaca` · **Campaign:** La República · **Period:** Republic (1879) ·
**Status:** implemented, pending art review and a human playtest.

## Historical problem

After the naval campaign, the Peruvian army held Tarapacá without cavalry or artillery. Three Chilean
columns attacked the village and the quebrada in echelon; Pachica sent reinforcements and the Peruvians
captured guns. It was a tactical victory that did not save the province: the army retreated 200 km to
Arica. Sources and certainty: [`docs/historia/campanas/tarapaca.md`](../historia/campanas/tarapaca.md).

## Acts

1. **Hold the village.** Six units hold Tarapacá for 45 s, with no cavalry or artillery in the roster.
2. **Take the heights.** Recover the quebrada heights; the optional Pachica link represents the
   reinforcements from the neighbouring column.
3. **Hold the heights and withdraw.** A 60 s hold receives two captured artillery pieces; the epilogue
   states that the province is lost and the army retreats to Arica.

## Map and site

- 256 m coast transect, painted ground every 2 m, worker crossing ≈2:22.
- `tarapaca_site` reuses the Arica desert composition and heightfield as a **labelled abstraction** of the
  quebrada; no surveyed heightfield exists for Tarapacá in the repo.
- Player village in the south, Chilean columns on the heights, Pachica road to the west.
- Own in-engine captures (`scripts/capture_republica_arc.mjs`), documented in `PROVENANCE.md`.

## Economy and cast

- `REPUBLIC` vs `CHILE`; period-locked Republic.
- No cavalry or artillery at start; captured artillery arrives as a scripted reinforcement.
- Units: workers, republican defenders, riflemen, soldiers, snipers and scouts.
- Cáceres is a protected commander card; no invented likeness.

## Opening and closing

- Three beats: the quebrada, the echelon attack, the tactical victory and retreat.
- Briefing art `media/tarapaca/intro-quebrada.webp`; act cards `intro-alturas` and `intro-retirada`;
  epilogue `intro-epilogo`.

## Tests and evidence

- Data: `tests/campaign.test.ts`, `tests/campaigns.test.ts`, scale/layout/profile guards.
- Completable: `tests/e2e/campaign-completable.spec.ts`.
- Real commands: `tests/e2e/tarapaca.spec.ts` holds the village with move orders.
- Layout: `tests/e2e/hud-layout.spec.ts` and `campaign.spec.ts`.
- Open: human no-cheat playtest and a performance row.
