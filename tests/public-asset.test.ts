import { describe, expect, it } from 'vitest';
import { DRACO_DECODER_PATH, joinPublicBase, publicAsset } from '../src/util/publicAsset';

describe('public asset paths', () => {
  it('keeps a root base', () => {
    expect(joinPublicBase('/', 'draco/')).toBe('/draco/');
  });

  it('keeps a relative itch.io base', () => {
    expect(joinPublicBase('./', 'media/menu/caral-dawn.webp')).toBe('./media/menu/caral-dawn.webp');
  });

  it('supports a GitHub Pages project base', () => {
    expect(joinPublicBase('/edades-del-peru/', 'draco/')).toBe('/edades-del-peru/draco/');
  });

  it('normalizes a base without a trailing slash and a leading path slash', () => {
    expect(joinPublicBase('/edades-del-peru', '/mods/example.json')).toBe('/edades-del-peru/mods/example.json');
  });

  it('keeps the Draco decoder path relative to the public base', () => {
    expect(publicAsset('draco/')).toBe(`${import.meta.env.BASE_URL}draco/`);
    expect(DRACO_DECODER_PATH.endsWith('/draco/')).toBe(true);
  });
});
