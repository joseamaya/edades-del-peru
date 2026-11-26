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
 * `pickAt` favours any unit within 30 px of the cursor, so an army parked on the monument steals a click
 * aimed at its centre. The helper samples the monument's silhouette, keeps only the points whose raycast
 * hits its geometry, and clicks the one farthest from every unit on screen, retrying other framings.
 *
 * Keep the body self-contained: Playwright serializes it and runs it in the page, so it must not reference
 * imports or module constants (only `window`, `document` and browser globals).
 */
export async function installHeritageClick(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as HeritageClickWindow).__heritageClick = (id, labelSource) => {
      const g = (window as unknown as { game: any }).game;
      const THREE = (window as unknown as { THREE: any }).THREE;
      const canvas = document.querySelector('#render-canvas') as HTMLCanvasElement;
      // `InputController.UNIT_PICK_PX`; page code cannot import it.
      const UNIT_PICK_PX = 30;
      // A little over the tolerance, so `pickAt` cannot prefer a unit over the monument.
      const CLEARANCE_PX = UNIT_PICK_PX + 4;
      const GRID = 11;
      // Camera offsets by monument radius, from close to wide, and four quadrants around it. A closer
      // camera spreads the monument more pixels from the units standing at its base.
      const FRAMINGS = [1.8, 2.6, 3.6];
      const QUADRANTS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];

      // `?noloop=1` means no frame rendered, so world matrices (and therefore picking) are stale.
      g.scene.updateMatrixWorld(true);
      if (!g.heritageStanding(id)) throw new Error(`heritage ${id} is not standing yet`);
      // The same roots `pickHeritage` raycasts against.
      const roots: any[] = [g.landmark, g.canalGroup].filter(Boolean);
      let owner: any = null;
      for (const root of roots) {
        root.traverse((o: any) => {
          if (!owner && o.userData?.heritageId === id) owner = o;
        });
      }
      if (!owner) throw new Error(`no pickable geometry for heritage ${id}`);
      // The acequia's id sits on the whole canal group; aim at its gate, not the group bounds.
      const aim = owner.getObjectByName?.('canal_gate') ?? owner;
      const box = new THREE.Box3().setFromObject(aim);
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(2, box.getSize(new THREE.Vector3()).length() / 2);

      const toScreen = (v: any): { x: number; y: number } => ({
        x: (v.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      });
      const label = new RegExp(labelSource);
      const commands = (): string[] =>
        [...document.querySelectorAll<HTMLButtonElement>('.ed-command')].map((b) => b.textContent ?? '');
      const clickAt = (sx: number, sy: number): void => {
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: sx, clientY: sy, button: 0, bubbles: true }));
        // The click sets the selection; force the command panel to rebuild for it.
        g.hud.bottomKey = '';
        g.hud.renderBottomIfChanged();
      };
      // Only press the command when the click selected this monument: every heritage panel shows «Visitar».
      const press = (): boolean => {
        if (g.getSelectedHeritage()?.id !== id) return false;
        const button = [...document.querySelectorAll<HTMLButtonElement>('.ed-command')].find(
          (b) => !b.disabled && label.test(b.textContent ?? ''),
        );
        button?.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        return !!button;
      };

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const cam = g.camera.camera;
      let sampled = 0;
      let clicks = 0;
      for (const factor of FRAMINGS) {
        const offset = Math.max(12, radius * factor);
        for (const angle of QUADRANTS) {
          cam.position.set(
            center.x + Math.sin(angle) * offset,
            center.y + offset * 0.85,
            center.z + Math.cos(angle) * offset,
          );
          cam.lookAt(center);
          cam.updateMatrixWorld();
          const units = [...g.units.values()]
            .filter((u: any) => !u.dead && u.pos)
            .map((u: any) => toScreen(new THREE.Vector3(u.pos.x, u.pos.y + 0.5, u.pos.z).project(cam)));
          const corners = Array.from({ length: 8 }, (_, i) =>
            toScreen(
              new THREE.Vector3(
                i & 1 ? box.max.x : box.min.x,
                i & 2 ? box.max.y : box.min.y,
                i & 4 ? box.max.z : box.min.z,
              ).project(cam),
            ),
          );
          const minX = Math.max(2, Math.min(...corners.map((p) => p.x)));
          const maxX = Math.min(window.innerWidth - 2, Math.max(...corners.map((p) => p.x)));
          const minY = Math.max(2, Math.min(...corners.map((p) => p.y)));
          const maxY = Math.min(window.innerHeight - 2, Math.max(...corners.map((p) => p.y)));
          if (minX >= maxX || minY >= maxY) continue;
          const candidates: { x: number; y: number; clearance: number }[] = [];
          for (let ix = 0; ix < GRID; ix++) {
            for (let iy = 0; iy < GRID; iy++) {
              const sx = minX + ((ix + 0.5) / GRID) * (maxX - minX);
              const sy = minY + ((iy + 0.5) / GRID) * (maxY - minY);
              ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
              raycaster.setFromCamera(ndc, cam);
              const hitsOwn = raycaster.intersectObjects(roots, true).some((h: any) => {
                let o: any = h.object;
                while (o && o.userData?.heritageId !== id) o = o.parent;
                return !!o;
              });
              if (!hitsOwn) continue;
              sampled++;
              let clearance = Infinity;
              for (const u of units) clearance = Math.min(clearance, Math.hypot(u.x - sx, u.y - sy));
              candidates.push({ x: sx, y: sy, clearance });
            }
          }
          candidates.sort((a, b) => b.clearance - a.clearance);
          for (const c of candidates.slice(0, 2)) {
            if (c.clearance < CLEARANCE_PX) break;
            clicks++;
            clickAt(c.x, c.y);
            if (press()) return;
          }
        }
      }
      if (sampled === 0) throw new Error(`no visible point of heritage ${id}; is it hidden or unloaded?`);
      throw new Error(
        `no «/${labelSource}/» command for ${id} after ${clicks} click(s); selected ` +
          `${g.getSelectedHeritage()?.id ?? 'nothing'}; got: ${commands().join(' | ')}`,
      );
    };
  });
}
