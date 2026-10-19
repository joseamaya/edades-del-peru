import { test, expect, type Page } from '@playwright/test';

interface RendererState {
  name: string;
  cinematic: boolean;
  quality: string;
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
      quality: g.settings.quality as string,
    };
  });
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i;

test('software renderers start in the safe profile; ?cine=1 overrides', async ({ page }) => {
  const plain = await readState(page, '/?play=1&seed=777&fog=0');
  const software = SOFTWARE.test(plain.name);
  // on a real GPU the cinematic set stays on; on SwiftShader/llvmpipe it degrades
  expect(plain.cinematic, `renderer=${plain.name}`).toBe(!software);
  if (software) expect(plain.quality).toBe('low');

  const forced = await readState(page, '/?play=1&seed=777&fog=0&cine=1');
  expect(forced.cinematic).toBe(true);
});
