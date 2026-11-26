# 0010 — Layer-31 merge sources stay in the shadow-coverage count

**Status:** Proposed (agent) · **Date:** 2026-11-26

## Context

`consolidateRig` merges a rig's flat parts and leaves the originals in the tree on layer 31, visible and
inspectable (attire tints and tests read their materials). `limitShadowCasters` keeps the largest casters
until they cover 60 % of the rig's visible triangles and turns the rest off. Its traversal does not filter by
layer, so those sources count toward the denominator even though the shadow camera draws only layer 0.

## Decision

Leave the traversal unfiltered. The 60 % is a budget that happens to be conservative on the current rigs, not
a measurement of what casts: counting the sources keeps fewer shadow casters than the same rule over drawn
meshes.

## Rejected options

Measured on 2026-11-26 with `node scripts/bench.mjs --scenario=mounted|siege --units=12` on build `e8558218`
(baseline: mounted 9.0 draws / 15,313 triangles, siege 13.0 / 6,066 per unit):

- **Filter `mesh.layers.isEnabled(0)` and keep the rule.** Mounted drops to 8.0 / 13,131 because the merged
  horse stops casting and loses its shadow. Siege is unchanged.
- **Filter plus one caster per skeleton and 60 % of the remaining casters.** Mounted rises to 10.0 / 15,393
  and siege to 19.0 / 7,116 — heavier in both.

## Consequences

- The rule is cheap and stable, but its nominal 60 % does not mean 60 % of the drawn silhouette. A future
  shadow pass must re-tune it with captures, not just flip the filter.
- `src/rendering/shadowCasters.ts` and `docs/development.md` point here.

## Revisit when

The shadow pipeline changes (CSM, contact shadows, shadow LODs) or a rig's silhouette looks under-covered;
then re-measure worker, cavalry, siege, vehicle and fauna rigs with captures.
