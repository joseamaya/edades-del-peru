import type { Page } from '@playwright/test';
import type { HeritageBuildingId } from '../../src/model/defs/heritage';

export interface HeritageClickWindow extends Window {
  __heritageClick: (id: HeritageBuildingId, labelSource: string) => void;
}

/**
 * Page-side helper shared by the campaign playtests: select a heritage building on the map and press its
 * HUD command, the way a player does. It has to live on `window` because both playtests run one long
 * in-page simulation and cannot call a Node module from inside it.
 *
 * Keep the body self-contained: Playwright serializes it and runs it in the page, so it must not reference
 * imports or module constants (only `window`, `document` and browser globals).
 */
export async function installHeritageClick(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as HeritageClickWindow).__heritageClick = (id, labelSource) => {
      const g = (window as unknown as { game: any }).game;
      const THREE = (window as unknown as { THREE: any }).THREE;
      let world: { x: number; y: number; z: number } | null = null;
      const proxy = (g.siteDef?.heritageProxies ?? []).find((p: { id: string }) => p.id === id);
      if (proxy) {
        world = { x: proxy.x, y: g.terrain.getHeight(proxy.x, proxy.z) + (proxy.h ?? 4) * 0.6, z: proxy.z };
      }
      // `?noloop=1` means no frame rendered, so world matrices (and therefore picking) are stale.
      g.scene.updateMatrixWorld(true);
      if (!world) {
        let owner: any = null;
        g.scene.traverse((o: any) => {
          if (!owner && o.userData?.heritageId === id) owner = o;
        });
        if (owner) {
          // The acequia's id sits on the whole canal group; aim at its gate, not the group origin.
          const target = owner.getObjectByName?.('canal_gate') ?? owner;
          const box = new THREE.Box3().setFromObject(target);
          const c = box.getCenter(new THREE.Vector3());
          world = { x: c.x, y: c.y, z: c.z };
        }
      }
      if (!world) throw new Error(`no geometry for heritage ${id}`);
      // Frame the monument directly: the mission's intro/follow camera would ignore `moveTo`.
      const groundY = g.terrain.getHeight(world.x, world.z);
      const cam = g.camera.camera;
      cam.position.set(world.x + 0.01, groundY + 36, world.z + 36);
      cam.lookAt(world.x, groundY + 2, world.z);
      cam.updateMatrixWorld();
      const p = new THREE.Vector3(world.x, world.y, world.z).project(cam);
      const x = (p.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
      const canvas = document.querySelector('#render-canvas') as HTMLCanvasElement;
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true }));
      // The click sets the selection; force the command panel to rebuild for it.
      g.hud.bottomKey = '';
      g.hud.renderBottomIfChanged();
      const label = new RegExp(labelSource);
      const button = [...document.querySelectorAll<HTMLButtonElement>('.ed-command')].find((b) =>
        label.test(b.textContent ?? ''),
      );
      if (!button) {
        const labels = [...document.querySelectorAll('.ed-command')].map((b) => b.textContent).join(' | ');
        throw new Error(`no «/${labelSource}/» command for ${id}; got: ${labels}`);
      }
      button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    };
  });
}
