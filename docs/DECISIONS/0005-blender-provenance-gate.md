# 0005 · Blender render provenance gate

**Status:** Accepted · **Date:** 2026-11-14 (records a gate already implemented by the manifest)

## Context

Blender renders are used as mission intro art, epilogue art and documentation captures. Drafts can look
finished, and an unlabelled render can be mistaken for a historical photograph or a reconstruction. GIMP
retouching can also detach a published PNG from the source that produced it.

## Decision

`src/art/manifest.json` is the **source of truth** for authored renders.

- Every new render starts `reviewed: false`.
- The game shows only reviewed renders; `?art=all` previews drafts with a draft badge.
- A render is never presented as a historical photograph. Its `confidence` and caption say what it is.
- `.blend` and `.xcf` sources are tracked with Git LFS.
- When GIMP retouches a render, the final PNG hash in the manifest is updated.
- `yarn art:validate` checks the manifest and assets; `yarn art:review` is the human review gate.

## Consequences

- A render can ship as a draft, but it stays hidden from players until a human approves it.
- The art pipeline has two steps: generate/ingest (`yarn art:blender`) and review (`yarn art:review`).
- The manifest, `PROVENANCE.md` and the mission dossier must agree on source, licence and certainty.
- CI can validate structure and hashes, but it cannot approve art; approval is a recorded human action.
- Deleting or renaming a reviewed record requires updating the manifest and the references that use it.

## Revisit

Revisit if the manifest schema changes, if renders start being generated in CI, or if a new art category needs
a different review path.

## References

- `AGENTS.md` (domain invariants)
- `docs/GDD.md` §6
- `docs/design/blender-art.md`
- `docs/design/authoring-tools.md`
- `PROVENANCE.md`
- `src/art/manifest.json`
