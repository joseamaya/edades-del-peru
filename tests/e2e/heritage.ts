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
      if (roots.length === 0 || (!owner && !g.siteDef?.heritageProxies?.some((p: any) => p.id === id))) {
        throw new Error(`no geometry for heritage ${id}`);
      }
      const proxy = (g.siteDef?.heritageProxies ?? []).find((p: { id: string }) => p.id === id);
      // The acequia's id sits on the whole canal group; aim at its gate, not the group bounds.
      const aim = owner?.getObjectByName?.('canal_gate') ?? owner;
      let box = aim ? new THREE.Box3().setFromObject(aim) : null;
      if (!box || box.isEmpty()) {
        const y = g.terrain.getHeight(proxy.x, proxy.z);
        box = new THREE.Box3(
          new THREE.Vector3(proxy.x - proxy.w / 2, y, proxy.z - proxy.d / 2),
          new THREE.Vector3(proxy.x + proxy.w / 2, y + (proxy.h ?? 4), proxy.z + proxy.d / 2),
        );
      }
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(2, box.getSize(new THREE.Vector3()).length() / 2);

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
      const press = (): boolean => {
        const button = [...document.querySelectorAll<HTMLButtonElement>('.ed-command')].find((b) =>
          label.test(b.textContent ?? ''),
        );
        button?.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        return !!button;
      };

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const cam = g.camera.camera;
      for (const distance of [radius * 2.4, radius * 3.6, radius * 5.4]) {
        const d = Math.max(14, distance);
        for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
          cam.position.set(center.x + Math.sin(angle) * d, center.y + d * 0.85, center.z + Math.cos(angle) * d);
          cam.lookAt(center);
          cam.updateMatrixWorld();
          const units = [...g.units.values()]
            .filter((u: any) => !u.dead && u.pos)
            .map((u: any) => {
              const s = new THREE.Vector3(u.pos.x, u.pos.y + 0.5, u.pos.z).project(cam);
              return { x: (s.x * 0.5 + 0.5) * window.innerWidth, y: (-s.y * 0.5 + 0.5) * window.innerHeight };
            });
          const corners = Array.from({ length: 8 }, (_, i) =>
            new THREE.Vector3(
              i & 1 ? box.max.x : box.min.x,
              i & 2 ? box.max.y : box.min.y,
              i & 4 ? box.max.z : box.min.z,
            ).project(cam),
          );
          const xs = corners.map((p: any) => (p.x * 0.5 + 0.5) * window.innerWidth);
          const ys = corners.map((p: any) => (-p.y * 0.5 + 0.5) * window.innerHeight);
          const minX = Math.max(2, Math.min(...xs));
          const maxX = Math.min(window.innerWidth - 2, Math.max(...xs));
          const minY = Math.max(2, Math.min(...ys));
          const maxY = Math.min(window.innerHeight - 2, Math.max(...ys));
          if (minX >= maxX || minY >= maxY) continue;
          const candidates: { x: number; y: number; clearance: number }[] = [];
          const STEPS = 11;
          for (let ix = 0; ix < STEPS; ix++) {
            for (let iy = 0; iy < STEPS; iy++) {
              const sx = minX + ((ix + 0.5) / STEPS) * (maxX - minX);
              const sy = minY + ((iy + 0.5) / STEPS) * (maxY - minY);
              ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
              raycaster.setFromCamera(ndc, cam);
              const hit = raycaster.intersectObjects(roots, true).some((h: any) => {
                let o: any = h.object;
                while (o && o.userData?.heritageId !== id) o = o.parent;
                return !!o;
              });
              if (!hit) continue;
              let clearance = Infinity;
              for (const u of units) clearance = Math.min(clearance, Math.hypot(u.x - sx, u.y - sy));
              candidates.push({ x: sx, y: sy, clearance });
            }
          }
          // `pickAt` steals any point within 30 px of a unit, so only aim where no unit is that close.
          candidates.sort((a, b) => b.clearance - a.clearance);
          for (const c of candidates.slice(0, 3)) {
            if (c.clearance < 34) break;
            clickAt(c.x, c.y);
            if (press()) return;
          }
        }
      }
      throw new Error(`no «/${labelSource}/» command for ${id}; got: ${commands().join(' | ')}`);
    };
  });
}
