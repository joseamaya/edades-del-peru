import { test, expect, type Page } from '@playwright/test';
import { isSoftwareRenderer } from '../../src/util/gpu';

interface RendererState {
  name: string;
  cinematic: boolean;
  applied: string;
  pixelRatio: number | null;
  refraction: boolean;
}

async function readState(page: Page, url: string): Promise<RendererState> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  return page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const gl = g.renderer.getContext() as WebGLRenderingContext;
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL: number } | null;
    const raw = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    return {
      name: typeof raw === 'string' ? raw : '',
      cinematic: g.postfx.cinematicEnabled as boolean,
      applied: g.getAppliedQuality() as string,
      pixelRatio: g.pixelRatioOverride as number | null,
      refraction: g.water.refractionEnabled as boolean,
    };
  });
}

test('software renderers start in the safe profile; ?cine=1 overrides', async ({ page }) => {
  const plain = await readState(page, '/?play=1&seed=777&fog=0');
  const software = isSoftwareRenderer(plain.name);
  // on a real GPU the cinematic set stays on; on SwiftShader/llvmpipe it degrades
  expect(plain.cinematic, `renderer=${plain.name}`).toBe(!software);
  if (software) {
    expect(plain.applied).toBe('low');
    expect(plain.pixelRatio).toBe(1);
    expect(plain.refraction).toBe(false);
  }

  const forced = await readState(page, '/?play=1&seed=777&fog=0&cine=1');
  expect(forced.cinematic).toBe(true);
});
