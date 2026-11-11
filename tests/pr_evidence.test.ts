import { describe, it, expect } from 'vitest';
import { SURFACES, classifyPaths, formatEvidence, normalizePath } from '../scripts/pr_evidence_lib.mjs';

const ids = (paths: string[]) => classifyPaths(paths).map((surface: { id: string }) => surface.id);

describe('pr evidence classifier', () => {
  it('routes each domain to its own surface', () => {
    expect(ids(['src/ui/Hud.ts'])).toEqual(['hud']);
    expect(ids(['src/i18n/es.ts'])).toEqual(['hud']);
    expect(ids(['index.html'])).toEqual(['hud']);
    expect(ids(['src/rendering/Terrain.ts'])).toEqual(['world']);
    expect(ids(['tests/visual/baseline.json'])).toEqual(['world']);
    expect(ids(['src/model/defs/units.ts'])).toEqual(['models']);
    expect(ids(['src/assets/models/caral_worker.glb'])).toEqual(['models']);
    expect(ids(['src/campaign/defs/missions.ts'])).toEqual(['campaign']);
    expect(ids(['src/audio/AudioEngine.ts'])).toEqual(['audio']);
    expect(ids(['src/art/manifest.json'])).toEqual(['art']);
    expect(ids(['art-src/blender/scenes/caral.blend'])).toEqual(['art']);
  });

  it('treats the rest of src as runtime and tooling as a build note', () => {
    expect(ids(['src/util/rng.ts'])).toEqual(['runtime']);
    expect(ids(['src/game/ai.ts'])).toEqual(['runtime']);
    expect(ids(['package.json'])).toEqual(['build']);
    expect(ids(['yarn.lock'])).toEqual(['build']);
    expect(ids(['vite.config.ts'])).toEqual(['build']);
    expect(ids(['tsconfig.json', 'playwright.config.ts'])).toEqual(['build']);
  });

  it('reports no visible surface for docs, tests, scripts and CI', () => {
    const docsOnly = [
      'docs/development.md',
      'tests/rng.test.ts',
      'scripts/pr_evidence.mjs',
      '.github/workflows/ci.yml',
    ];
    expect(ids(docsOnly)).toEqual(['none']);
    expect(ids([])).toEqual([]);
  });

  it('keeps a stable surface order regardless of the diff order', () => {
    const shuffled = ['src/campaign/Mission.ts', 'src/ui/Hud.ts', 'src/art/manifest.json'];
    expect(ids(shuffled)).toEqual(['art', 'hud', 'campaign']);
  });

  it('collects the paths of a surface and normalizes separators', () => {
    const [hud] = classifyPaths(['src\\ui\\Hud.ts', './src/i18n/es.ts']);
    expect(hud.id).toBe('hud');
    expect(hud.paths).toEqual(['src/ui/Hud.ts', 'src/i18n/es.ts']);
    expect(normalizePath('.\\src\\ui\\Hud.ts')).toBe('src/ui/Hud.ts');
  });

  it('formats a PR-ready block with one capture list per surface', () => {
    const block = formatEvidence(['src/ui/Hud.ts', 'src/rendering/Sky.ts'], { base: 'origin/main' });
    expect(block).toContain('### Visual evidence');
    expect(block).toContain('Base `origin/main` · 2 files');
    expect(block).toContain('**HUD / player-facing copy** — `src/ui/Hud.ts`');
    expect(block).toContain(`- [ ] \`yarn shot hud-review --url='/?play=1&seed=777' --wait=8000\``);
    expect(block).toContain('**World / rendering** — `src/rendering/Sky.ts`');
    expect(block).toContain('- [ ] `yarn visual:check --only=<scene>`');
    expect(block).toContain('Attach the capture to the PR');
  });

  it('notes a tooling change without asking for a screenshot', () => {
    const block = formatEvidence(['package.json'], { base: 'origin/main' });
    expect(block).toContain('**Build / dependencies** — `package.json`');
    expect(block).toContain('> A new script is not a visual change');
    expect(block).not.toContain('- [ ]');
  });

  it('says so when nothing visible changed', () => {
    const block = formatEvidence(['docs/development.md'], { base: 'origin/main' });
    expect(block).toContain('No visible change against `origin/main`');
    expect(block).not.toContain('- [ ]');
  });

  it('exposes every surface with an id and a label, ending on the fallback', () => {
    for (const surface of SURFACES) {
      expect(surface.id).toBeTruthy();
      expect(surface.label).toBeTruthy();
    }
    expect(SURFACES.at(-1)?.id).toBe('none');
    expect(SURFACES.at(-1)?.matchAll).toBe(true);
  });
});
