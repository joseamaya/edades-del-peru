import { test, expect } from '@playwright/test';

test('the Options panel toggles sound, music and hints', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  // driven in-page: Playwright auto-waiting against the animated overlay makes
  // the actionability checks ~6x slower than the plain assertions below
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.hud.showPauseMenu();
    const click = (pattern: RegExp): void => {
      const btn = [...document.querySelectorAll('button')].find((b) => pattern.test(b.textContent ?? ''));
      if (!btn) throw new Error(`button not found: ${pattern}`);
      btn.click();
    };
    click(/Opciones/);
    const toggle = (label: string): HTMLButtonElement => {
      const field = [...document.querySelectorAll('.ed-field')].find(
        (f) => f.querySelector('label')?.textContent === label,
      );
      const btn = field?.querySelector('button');
      if (!btn) throw new Error(`toggle not found: ${label}`);
      return btn as HTMLButtonElement;
    };
    const sound = toggle('Sonido');
    const music = toggle('Música');
    const hints = toggle('Consejos');
    const before = [sound.textContent, music.textContent, hints.textContent];
    sound.click();
    music.click();
    hints.click();
    const after = [sound.textContent, music.textContent, hints.textContent];
    return {
      before,
      after,
      state: {
        sound: g.settings.soundEnabled,
        music: g.settings.musicEnabled,
        hints: g.settings.showHints,
        audio: g.audio.enabled,
      },
    };
  });
  expect(out.before).toEqual(['Activado', 'Activada', 'Activados']);
  expect(out.after).toEqual(['Desactivado', 'Desactivada', 'Desactivados']);
  expect(out.state).toEqual({ sound: false, music: false, hints: false, audio: false });
});

test('the Options panel changes the camera speed preset', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.loop.stop();
    g.hud.showPauseMenu();
    const optionsBtn = [...document.querySelectorAll('button')].find((b) => /Opciones/.test(b.textContent ?? ''));
    if (!optionsBtn) throw new Error('options button not found');
    optionsBtn.click();
    const sel = [...document.querySelectorAll('.ed-field')]
      .find((f) => f.querySelector('label')?.textContent === 'Velocidad de cámara')
      ?.querySelector('select') as HTMLSelectElement | null;
    if (!sel) throw new Error('camera speed select not found');
    const options = [...sel.options].map((o) => o.textContent);
    sel.value = 'fast';
    sel.dispatchEvent(new Event('change'));
    const afterFast = g.settings.cameraSpeed;
    sel.value = 'slow';
    sel.dispatchEvent(new Event('change'));
    return { options, afterFast, afterSlow: g.settings.cameraSpeed };
  });
  expect(out.options).toEqual(['Baja', 'Normal', 'Alta']);
  expect(out.afterFast).toBe('fast');
  expect(out.afterSlow).toBe('slow');
});

test('the period color grade and water refraction follow the cinematic effects toggle', async ({ page }) => {
  // `?noloop=1` boots without rendering: the heavy cinematic pipeline is far too
  // slow under the CI software renderer for a boot-time assertion. The toggle and
  // the refraction gate are exercised in-page instead.
  await page.goto('/?play=1&seed=777&fog=0&noloop=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    const saturation = (): number => g.postfx.colorGradePass.uniforms.saturation.value;
    const read = () => ({
      cinematic: g.postfx.cinematicEnabled as boolean,
      grade: g.postfx.colorGradeEnabled as boolean,
      saturation: saturation(),
      refraction: g.wantsWaterRefraction() as boolean,
    });
    g.postfx.setCinematic(false);
    const off = read();
    g.postfx.setCinematic(true);
    g.setQuality('high');
    const on = read();
    g.setQuality('low');
    const low = read();
    return { off, on, low };
  });

  expect(out.off.cinematic).toBe(false);
  expect(out.off.grade).toBe(false);
  expect(out.off.refraction).toBe(false);

  expect(out.on.cinematic).toBe(true);
  expect(out.on.grade).toBe(true);
  expect(out.on.saturation).not.toBe(1); // a period-specific grade, not the identity
  expect(out.on.refraction).toBe(true);

  // refraction also requires the applied quality != low
  expect(out.low.refraction).toBe(false);
});
