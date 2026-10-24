# Authoring tools: Blender and GIMP

Blender and GIMP are **local authoring tools** for scenery and graphics. They are not runtime
dependencies and are never installed in CI. The game consumes their exports through the normal
asset pipelines.

## Versions

| Tool | Version | Purpose |
|---|---|---|
| Blender | 5.2.2 LTS (snap) | 3D scenery, materials, lighting, cameras, GLB and renders |
| GIMP | 3.2.6 (snap) | 2D textures, render retouching, UI art, icons |
| `mcp-for-blender` | latest via `uvx` | Blender MCP bridge (port 9876) |
| `gimp3-mcp` | 0.2.0 | GIMP MCP bridge and plugin (port 9877) |
| `uv` / `uvx` | local | Runs the MCP servers |

The local `opencode.json` is **gitignored** because it contains machine-specific paths. The
tracked reference is [`opencode.authoring.example.json`](./opencode.authoring.example.json).

## Scope: project-scoped, not global

Keep Blender and GIMP in this repository's `opencode.json`. Do **not** add them to the global
`~/.config/opencode/opencode.jsonc`.

- GIMP `call_api` executes Python inside GIMP with the user's permissions; Blender can modify
  scenes and files. These are high-privilege tools and should only be enabled in the authoring
  workspace.
- Global config would load ~80 GIMP tools and the Blender tools in every opencode session.
- Multiple opencode sessions would launch multiple bridge clients; GIMP exposes a single
  service on port 9877.
- The `uvx` package cache, the Blender addon and the GIMP plugin are user-level installs; that
  is separate from the client config. The **client config** stays project-scoped.

Only one GIMP MCP may be installed. Do not install a second bridge such as `gimp-agent-mcp`:
both claim `localhost:9877` and will conflict.

## Source layout

```text
art-src/
  blender/
    scenes/          # .blend sources (Git LFS)
    exports/         # .glb/.fbx exports
    renders/         # 1600x900 PNG renders
    caral/           # renders.json, asset CSV, city export manifest, README
  gimp/
    projects/        # .xcf sources (Git LFS)
    exports/         # PNG/WebP intermediates
```

- `.blend` and `.xcf` are tracked with Git LFS (`.gitattributes`).
- Blender backup files (`*.blend1`, `*.blend2`) and GIMP backups (`*.xcf~`) are ignored.
- The game copies live in `src/assets/cities/` and `src/assets/scenery/`; campaign art lives in
  `public/media/generated/`.

## Git LFS

```bash
git lfs install
git lfs track "*.blend" "*.xcf"
```

The tracked `.gitattributes` already contains the rules. If `git-lfs` is not installed system-wide,
a local binary in `~/.local/bin` works; `git lfs version` must report 3.x.

## Blender MCP

1. Open Blender 5.2.2.
2. Start **N → MCP for Blender → Start MCP Server** (port 9876).
3. Keep safe mode enabled:

```json
"blender": {
  "type": "local",
  "command": ["uvx", "--python", "3.11", "mcp-for-blender"],
  "enabled": true,
  "environment": {
    "BLENDER_HOST": "localhost",
    "BLENDER_PORT": "9876",
    "BLENDER_MCP_SAFE_MODE": "1",
    "DISABLE_TELEMETRY": "true",
    "UV_PYTHON_PREFERENCE": "only-managed"
  }
}
```

Safe mode allows modeling, materials, render, save and import/export, but not arbitrary file
access, network or subprocesses inside Blender. The addon lives in
`~/.config/blender/5.2/scripts/addons/blender_mcp.py`; enable **MCP for Blender** in
Preferences → Add-ons if the sidebar tab is missing.

The MCP server process can run without Blender, but it cannot answer tool calls until Blender
and the addon server are running.

## GIMP MCP

Install the plugin once:

```bash
uvx gimp3-mcp@0.2.0 install-plugin
```

The installer picks the newest GIMP 3.x settings folder. On this machine that is
`~/.config/GIMP/3.2` (the snap also has an older `3.0` profile). Keep only this plugin: a
second bridge (for example `gimp-agent-bridge`) also binds `localhost:9877` and must be
disabled or moved out of `plug-ins/`.

1. Restart GIMP.
2. Start **Tools → MCP → Start MCP Server** (port 9877).
3. Configure the client:

```json
"gimp": {
  "type": "local",
  "command": ["uvx", "gimp3-mcp@0.2.0"],
  "enabled": true
}
```

`gimp3-mcp` exposes 80 tools, including `check_server`, `get_state_snapshot`, layer and
selection tools, drawing, text, filters and export. `call_api` executes Python inside GIMP;
treat the port as full access to the GIMP process.

## Skills

The local Blender skills come from `roble3/cc-blender-skill`:

```bash
npx skills add roble3/cc-blender-skill -y
```

The pack installs 30 skills. Use `text-to-blender` as the orchestrator, then
`blender-pro-workflow`, `blender-modeling`, `blender-materials`, `blender-lighting`,
`blender-cameras`, `blender-rendering` and `blender-export` for the core chain. The generic recipes use legacy MCP tool names; map them to OpenCode:

| Legacy recipe name | OpenCode tool |
|---|---|
| `mcp__blender__execute_blender_code` | `blender_execute_blender_code` |
| `mcp__blender__get_scene_info` | `blender_get_scene_info` |
| `mcp__blender__get_viewport_screenshot` | `blender_look` |

Two project-specific skills live in `.agents/skills/` (local, gitignored):

- `blender-game-assets`: units, origin, LODs, materials, export and handoff.
- `gimp-game-graphics`: non-destructive 2D work, colour rules, paths and provenance.

## Asset contract

- One root empty per asset/LOD; origin at the footprint centre, ground level.
- Y-up at export; +Z is the front.
- Use metres in Blender and a documented game scale.
- LOD0 ≤ 5k tris per building; LOD1 ≤ 1.5k; kit ≤ 25k tris, ≤ 8 materials, ≤ 12 draw calls.
- Principled BSDF only; no procedural shaders in GLB.
- Single-sided by default; double-sided only for thatch, cloth and thin planes.
- Static scenery has no animations or skins.
- Record id, LOD, scale, size, tris, materials, bytes, pivot, orientation, collision,
  confidence and sources in the CSV.
- New renders are `reviewed: false` until human review.

## Workflow

1. Author in Blender with the MCP and skills.
2. Export LOD0/LOD1 GLB and 1600×900 renders.
3. Retouch textures/renders in GIMP if needed; keep the `.xcf` source.
4. Put the `.blend`/`.xcf` in LFS and the exports/renders in `art-src`.
5. Update the manifest and run `yarn art:blender`.
6. Copy game GLBs to `src/assets/...` and integrate through `StaticModel`.
7. Run `yarn art:validate`, the relevant tests and `yarn verify:fast`.
8. Preview with `?city=caral` or the scenery debug route and capture the RTS view.

## Security

- Bind both bridges to localhost only; never expose 9876/9877.
- Keep Blender safe mode enabled.
- Start GIMP's MCP server only while authoring and stop it afterwards.
- Do not run untrusted `call_api` code.
- Keep backups and save the `.blend`/`.xcf` before destructive operations.
- Keep credentials and private absolute paths out of exported metadata and committed docs.

## Troubleshooting

- **Blender MCP cannot connect**: open Blender and start the addon server; check port 9876.
- **GIMP MCP cannot connect**: confirm GIMP 3.2.6 is open and **Tools → MCP → Start MCP
  Server** is running; check port 9877.
- **GIMP crashes at startup**: remove any second bridge (`gimp-agent-mcp` /
  `gimp-agent-bridge`). It auto-launches GIMP and competes for port 9877. Test with
  `GIMP3_DIRECTORY=/tmp/gimp-clean gimp`; if that opens, the main profile or the second
  plugin was the cause.
- **Plugin not listed**: rerun `uvx gimp3-mcp@0.2.0 install-plugin`, confirm the plugin is under
  `~/.config/GIMP/3.2/plug-ins/gimp-mcp-plugin/`, restart GIMP.
- **`uvx` not found by the client**: use the absolute path from `which uvx`.
- **GLB looks white**: check `baseColorFactor` in the source material; `MAT-Sand_Desert` is a
  known case.
- **GIMP plugin on Linux/snap fails**: fall back to `abelduarte/gimp-mcp` (Unix socket) or GIMP
  batch CLI; keep `gimp3-mcp` for interactive work.

## CI

Do not add Blender, GIMP or the MCP servers to CI. CI only runs the ingestion, tests and build.
