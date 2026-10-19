import { test, expect, type Page } from '@playwright/test';
import { isSoftwareRenderer } from '../../src/util/gpu';

interface RendererState {
  name: string;
  cinematic: boolean;
  applied: string;
  pixelRatio: number | null;
  wantedRefraction: boolean;
  appliedRefraction: boolean;
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
    const wantedRefraction = g.shouldRenderWaterRefraction() as boolean;
    g.syncWaterRefraction(); // apply the gate without rendering a frame
    return {
      name: typeof raw === 'string' ? raw : '',
      cinematic: g.postfx.cinematicEnabled as boolean,
      applied: g.getAppliedQuality() as string,
      pixelRatio: g.pixelRatioOverride as number | null,
      wantedRefraction,
      appliedRefraction: g.water.refractionEnabled as boolean,
    };
  });
}

test('software renderers start in the safe profile; ?cine=1 overrides', async ({ page }) => {
  // `?noloop=1` avoids rendering the heavy cinematic pipeline on the software runner
  const plain = await readState(page, '/?play=1&seed=777&fog=0&noloop=1');
  const software = isSoftwareRenderer(plain.name);
  // on a real GPU the cinematic set stays on; on SwiftShader/llvmpipe it degrades
  expect(plain.cinematic, `renderer=${plain.name}`).toBe(!software);
  if (software) {
    expect(plain.applied).toBe('low');
    expect(plain.pixelRatio).toBe(1);
    expect(plain.wantedRefraction).toBe(false);
    expect(plain.appliedRefraction).toBe(false);
  }

  const forced = await readState(page, '/?play=1&seed=777&fog=0&cine=1&noloop=1');
  expect(forced.cinematic).toBe(true);
  expect(forced.wantedRefraction).toBe(true);
  expect(forced.appliedRefraction).toBe(true);
});
