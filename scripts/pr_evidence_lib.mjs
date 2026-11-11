/**
 * Maps a changed path to the visual surface it can affect and the commands that
 * prove the change. Free of I/O and of the browser stack, so `tests/pr_evidence.test.ts`
 * can drive it directly.
 */

// First match wins: surfaces are ordered from the most specific to the fallback,
// so `src/art/` is never mistaken for `src/` and `tests/visual/baseline.json` is
// never mistaken for an ordinary test.
export const SURFACES = [
  {
    id: 'art',
    label: 'Art / provenance',
    prefixes: ['src/art/', 'art-src/'],
    captures: ['yarn art:validate', 'yarn art:review', `yarn shot art-drafts --url='/?play=1&art=all'`],
    note:
      'A new render starts `reviewed: false`: the game shows only reviewed renders and `?art=all` previews drafts. ' +
      'Retouching a render in GIMP means updating the final PNG hash in `src/art/manifest.json`.',
  },
  {
    id: 'hud',
    label: 'HUD / player-facing copy',
    prefixes: ['src/ui/', 'src/i18n/'],
    files: ['index.html'],
    captures: [`yarn shot hud-review --url='/?play=1&seed=777' --wait=8000`, 'yarn test:e2e tests/e2e/<area>.spec.ts'],
    note: 'Player-facing Spanish copy stays in `src/i18n/es.ts` behind `t()`; DOM ids and URL params stay stable.',
  },
  {
    id: 'world',
    label: 'World / rendering',
    prefixes: ['src/rendering/'],
    files: ['tests/visual/baseline.json'],
    captures: ['yarn visual:check --only=<scene>', 'yarn visual:update --only=<scene>', 'yarn shots:periods'],
    note:
      'Scenes live in `scripts/scenes.mjs` (`caral`, `moche`, `inca`, `region_andes`, `landscape_caral`, …); ' +
      '`visual:update` is for an intended change, and a baseline update is itself the evidence.',
  },
  {
    id: 'models',
    label: 'Models / appearance',
    prefixes: ['src/model/', 'src/assets/'],
    captures: [
      'yarn shots:civs',
      'node scripts/shots_evidence.mjs --scene=<scene> --out=review/evidence/<name>',
      'yarn bench --scenario=<scenario> --assert',
    ],
    note:
      'Scenes live in `scripts/shots_evidence.mjs` (`caral-worker`, `rigged-attack`, `chavin-scene`, ' +
      '`fauna-perf`, …); `yarn bench:check` owns the structural budgets.',
  },
  {
    id: 'campaign',
    label: 'Campaign content',
    prefixes: ['src/campaign/'],
    captures: [
      'yarn audit:campaigns                 # → review/audit/',
      'yarn test:e2e tests/e2e/campaign-<name>.spec.ts',
    ],
    note: 'The period fixes the era, only coetaneous civilizations face each other, and history cites `docs/historia/`.',
  },
  {
    id: 'audio',
    label: 'Audio',
    prefixes: ['src/audio/'],
    note: 'No screenshot proves a sound: capture the HUD state that triggers it and say what to listen for.',
  },
  {
    id: 'runtime',
    label: 'Runtime / gameplay',
    prefixes: ['src/'],
    captures: [
      `yarn shot play --url='/?play=1&seed=777' --wait=8000`,
      'yarn test:e2e tests/e2e/<area>.spec.ts',
      'yarn sim                              # AI regression when gameplay moved',
    ],
  },
  {
    id: 'build',
    label: 'Build / dependencies',
    prefixes: ['package.json', 'yarn.lock'],
    files: ['vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tsconfig.json'],
    note:
      'A new script is not a visual change; a dependency or build-output change can be. `yarn shot <name>` ' +
      'on `?play=1` is the cheapest check when it is one.',
  },
  {
    id: 'none',
    label: 'No visible change',
    matchAll: true,
  },
];

const FALLBACK = 'none';

export function normalizePath(path) {
  return String(path).replace(/\\/g, '/').replace(/^\.\//, '');
}

function matchSurface(path) {
  return SURFACES.find((surface) =>
    surface.matchAll
      ? true
      : (surface.prefixes ?? []).some((prefix) => path.startsWith(prefix)) || (surface.files ?? []).includes(path),
  );
}

export function classifyPaths(paths) {
  const order = new Map(SURFACES.map((surface, index) => [surface.id, index]));
  const bySurface = new Map();
  for (const raw of paths) {
    const path = normalizePath(raw);
    if (!path) continue;
    const surface = matchSurface(path);
    const hit = bySurface.get(surface.id) ?? { ...surface, paths: [] };
    hit.paths.push(path);
    bySurface.set(surface.id, hit);
  }
  return [...bySurface.values()].sort((a, b) => order.get(a.id) - order.get(b.id));
}

const countFiles = (n) => `${n} file${n === 1 ? '' : 's'}`;
const formatPaths = (paths) => paths.map((path) => `\`${path}\``).join(', ');

export function formatEvidence(paths, { base = 'origin/main' } = {}) {
  const surfaces = classifyPaths(paths);
  const visible = surfaces.filter((surface) => surface.id !== FALLBACK);
  const lines = ['### Visual evidence', ''];

  if (!visible.length) {
    lines.push(
      `No visible change against \`${base}\` (${countFiles(paths.length)}: docs, tests, scripts or config only).`,
    );
    lines.push('');
    lines.push('Say in the PR what the reviewer should *not* expect to change.');
    return lines.join('\n');
  }

  lines.push(`Base \`${base}\` · ${countFiles(paths.length)}`);
  lines.push('');
  for (const surface of visible) {
    lines.push(`**${surface.label}** — ${formatPaths(surface.paths)}`);
    lines.push('');
    for (const capture of surface.captures ?? []) lines.push(`- [ ] \`${capture}\``);
    if (surface.captures?.length) lines.push('');
    if (surface.note) {
      lines.push(`> ${surface.note}`);
      lines.push('');
    }
  }
  lines.push('Attach the capture to the PR and keep the command that produced it: `review/` is gitignored,');
  lines.push('so a path alone is not evidence.');
  return lines.join('\n');
}
