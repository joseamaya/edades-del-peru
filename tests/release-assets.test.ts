import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n';

const root = process.cwd();

describe('release assets', () => {
  it('ships the same MIT licence at the build root', () => {
    const rootLicence = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
    const publicLicence = fs.readFileSync(path.join(root, 'public/LICENSE'), 'utf8');
    expect(publicLicence).toBe(rootLicence);
  });

  it('keeps the required CC BY attribution in the shipped file', () => {
    const attribution = fs.readFileSync(path.join(root, 'public/ATTRIBUTION.md'), 'utf8');
    expect(attribution).toContain('Ciudades Sagradas, José Amaya, CC BY 4.0');
    expect(attribution).toContain('Quaternius');
    expect(attribution).toContain('MIT License');
    expect(attribution).toContain('three.js');
    expect(attribution).toContain('Apache-2.0');
  });

  it('keeps the CC BY attribution on the in-game credits panel', () => {
    expect(t('hud.menu.credits.body')).toContain('CC BY 4.0');
    expect(t('hud.menu.credits.body')).toContain('Quaternius');
  });
});
