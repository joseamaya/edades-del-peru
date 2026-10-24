# GIMP 2D sources

Editable GIMP projects for textures, render retouching, UI art and icons.

- `projects/`: `.xcf` sources (Git LFS).
- `exports/`: PNG/WebP intermediates.
- Final campaign renders go to `art-src/blender/renders/` so `yarn art:blender` ingests them.
- Final textures go to `src/assets/textures/`; the reproducible batch path remains
  `scripts/gen_textures.py` + `scripts/post_textures.py`.

GIMP is an authoring tool, not a runtime or CI dependency. See
[`docs/design/authoring-tools.md`](../../docs/design/authoring-tools.md) for the MCP setup and
the `gimp-game-graphics` skill for the workflow.
