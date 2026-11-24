# 0009 · A 40 MB `dist/` budget for the site kits

**Status:** Proposed · **Date:** 2026-11-24 · Amends [0008](./0008-dist-budget-28mb.md)

> Proposed on the project author's instruction (2026-11-24: raise the limit); the 40 MB figure is the agent's
> proposal and the author accepts it in review, per [`README.md`](./README.md) rule 6.

## Context

[0008](./0008-dist-budget-28mb.md) set the `dist/` total to 28 MB for the cinema-intro stills. On 2026-11-24
the Cusco architecture kit (#629) left the build at **27.47 MB**, 0.53 MB of headroom.

The §4.2 standard in [`../design/art-direction.md`](../design/art-direction.md) makes every building a Blender
kit piece with two LODs. A converted site ships **0.5–1.2 MB** of GLBs (Cusco: 760 KB for 7 pieces × 2 LODs;
Caral: 900 KB for 15 pieces) plus its layout data. Seventeen sites are still procedural: the colonial cities
(Lima 1535/1821, Cusco 1814, Miraflores, Túpac Amaru), Arica, Real Felipe and Tarapacá, Independencia and Breña,
the Moche/Wari/Chimú/Chanca sites, Vilcabamba and the rest of Tambotoco. At ~1 MB each the conversion needs
**~12–17 MB**, and 28 MB has room for at most four kits.

The kits are **per-site lazy assets**: `import.meta.glob` exposes their URLs, `ArchitectureCity` fetches the
pieces of the site the match uses, and a match never downloads another site's kit. The total is a hosting and
CI artifact limit, not a first-load cost; the first-play payload stays at 1.9 MB gzip, under its own 600 KB
entry-chunk limit.

Rejected options:

- **Keep 28 MB and cut geometry.** Dropping LOD1 detail or sharing pieces across sites buys ~1–2 MB, not the
  12–17 MB the standard needs, and the kits would degrade to pay for a limit with no player-facing meaning.
- **32 MB.** Room for four more kits, so the ADR would be rewritten before the second half of the list.
- **One global city GLB per era.** Cheaper on files but re-introduces the walk-through-everything problem the
  one-standard layout solves, and it cannot express a site's own documented plan.

## Decision

- The `dist/` total budget is **40 MB** (`scripts/check-dist.mjs`, `TOTAL_LIMIT`).
- The entry chunk budget is unchanged: **< 600 KB gzip**; the first-play payload is still reported separately.
- The added 12 MB is for **Blender architecture kits and their layout data**, up to ~12 kits: every kit records
  its size in the ledger of its `PROVENANCE.md` entry (LOD0 + LOD1 bytes) and in
  `docs/art/character-visual-pilot.md`-style before/after evidence where it replaces procedural geometry.
- New art outside that category still needs its own ledger with offsets, as in 0008.

## Consequences

- Lima 1535/1821, Cusco 1814 and Miraflores can ship one shared colonial kit; Arica, Real Felipe and Tarapacá
  follow without waiting on a second budget change.
- The Pages/itch package grows to at most 40 MB. Players download one site's kit, not the catalogue.
- Every new kit must keep the two-LOD budget (5k/1.5k triangles; 8k/2.4k for a monument) so the byte cost
  stays near 1 MB, not 3.

## Revisit

Revisit when the converted sites approach 40 MB — 12 kits from now — or if the remaining sites need materially
larger kits. At that point the option is LOD streaming or a third LOD, not another silent raise: the ADR should
state which.
