import { test, expect } from '@playwright/test';

test('the Options panel toggles sound, music and hints', async ({ page }) => {
  await page.goto('/?play=1&seed=777&fog=0&low=1');
  await page.waitForFunction(() => (window as unknown as { game?: unknown }).game !== undefined, null, {
    timeout: 30_000,
  });
  const out = await page.evaluate(() => {
    const g = (window as unknown as { game: any }).game;
    g.hud.showPauseMenu();
    [...document.querySelectorAll('button')].find((b) => /Opciones/.test(b.textContent ?? ''))?.click();
    const button = (label: string): HTMLButtonElement | null => {
      const field = [...document.querySelectorAll('.ed-field')].find(
        (f) => f.querySelector('label')?.textContent === label,
      );
      return (field?.querySelector('button') as HTMLButtonElement) ?? null;
    };
    const sound = button('Sonido');
    const music = button('Música');
    const hints = button('Consejos');
    const before = [sound?.textContent, music?.textContent, hints?.textContent];
    sound?.click();
    music?.click();
    hints?.click();
    const after = [sound?.textContent, music?.textContent, hints?.textContent];
    return {
      before,
      after,
      state: { sound: g.settings.soundEnabled, music: g.settings.musicEnabled, hints: g.settings.showHints },
    };
  });
  expect(out.before).toEqual(['Activado', 'Activada', 'Activados']);
  expect(out.after).toEqual(['Desactivado', 'Desactivada', 'Desactivados']);
  expect(out.state).toEqual({ sound: false, music: false, hints: false });
});
