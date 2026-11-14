# 0007 · Local authoring tools, not CI dependencies

**Status:** Accepted · **Date:** 2026-11-14

## Context

Blender and GIMP produce the authored 3D and 2D art. Their MCP bridges execute code with the user's
permissions and can modify scenes and files. Installing them in CI would add heavy, interactive, privileged
tools to a build that must stay reproducible.

## Decision

Blender and GIMP are **local authoring tools**, never CI dependencies.

- MCP client configuration is project-scoped in the repository's gitignored `opencode.json`. The tracked
  reference is `docs/design/opencode.authoring.example.json`.
- Do not add Blender or GIMP to the global opencode config.
- Only one GIMP MCP (`gimp3-mcp`, port 9877) may be installed; a second bridge conflicts on the port.
- Versions are pinned in `docs/design/authoring-tools.md` (Blender 5.2.2, GIMP 3.2.6).
- The game consumes the committed exports (GLB, WebP, manifest), not the live authoring session.

## Consequences

- CI can build, test and validate the committed assets, but it cannot open Blender or GIMP.
- A change to an authored asset must include the exported file and the manifest/provenance update; the source
  remains in Git LFS.
- Agents can use Blender/GIMP only in an authoring workspace where the MCP servers are running.
- The build stays fast and reproducible, and privileged tools are not exposed to every session.

## Revisit

Revisit if a headless, reproducible Blender step is added to CI (for example a render or export check). That
step would need pinned binaries and a new decision; it would not turn the interactive MCP into a CI service.

## References

- `docs/design/authoring-tools.md`
- `docs/design/blender-art.md`
- `AGENTS.md` (Authoring tools)
- `docs/design/opencode.authoring.example.json`
