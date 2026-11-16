import type { Page } from '@playwright/test';

/**
 * Page-side helper shared by the campaign playtests: select a heritage building on the map and press its
 * HUD command, the way a player does.
 *
 * It ships as source because Playwright does not serialize function arguments and both playtests run one
 * long in-page simulation, so the helper has to exist inside that closure. `installHeritageClick` adds it
 * before navigation; the specs call `window.__heritageClick(id, labelSource)`.
 */
const HERITAGE_CLICK_SOURCE = String.raw`
window.__heritageClick = function (id, labelSource) {
  var g = window.game;
  var world = null;
  var proxy = (g.siteDef && g.siteDef.heritageProxies ? g.siteDef.heritageProxies : []).find(function (p) {
    return p.id === id;
  });
  if (proxy) {
    world = { x: proxy.x, y: g.terrain.getHeight(proxy.x, proxy.z) + (proxy.h || 4) * 0.6, z: proxy.z };
  }
  // ?noloop=1 means no frame rendered, so world matrices (and therefore picking) are stale.
  g.scene.updateMatrixWorld(true);
  if (!world) {
    var owner = null;
    g.scene.traverse(function (o) {
      if (!owner && o.userData && o.userData.heritageId === id) owner = o;
    });
    if (owner) {
      // The acequia's id sits on the whole canal group; aim at its gate, not the group origin.
      var target = owner.getObjectByName ? owner.getObjectByName('canal_gate') || owner : owner;
      var box = new window.THREE.Box3().setFromObject(target);
      var c = box.getCenter(new window.THREE.Vector3());
      world = { x: c.x, y: c.y, z: c.z };
    }
  }
  if (!world) throw new Error('no geometry for heritage ' + id);
  // Frame the monument directly: the mission's intro/follow camera would ignore moveTo.
  var groundY = g.terrain.getHeight(world.x, world.z);
  var cam = g.camera.camera;
  cam.position.set(world.x + 0.01, groundY + 36, world.z + 36);
  cam.lookAt(world.x, groundY + 2, world.z);
  cam.updateMatrixWorld();
  var p = new window.THREE.Vector3(world.x, world.y, world.z).project(cam);
  var x = (p.x * 0.5 + 0.5) * window.innerWidth;
  var y = (-p.y * 0.5 + 0.5) * window.innerHeight;
  var canvas = document.querySelector('#render-canvas');
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true }));
  // The click sets the selection; force the command panel to rebuild for it.
  g.hud.bottomKey = '';
  g.hud.renderBottomIfChanged();
  var label = new RegExp(labelSource);
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.ed-command'));
  var button = buttons.find(function (b) {
    return label.test(b.textContent || '');
  });
  if (!button) {
    var labels = buttons
      .map(function (b) {
        return b.textContent;
      })
      .join(' | ');
    throw new Error('no command for ' + id + '; got: ' + labels);
  }
  button.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
};
`;

export interface HeritageClickWindow extends Window {
  __heritageClick: (id: string, labelSource: string) => void;
}

export async function installHeritageClick(page: Page): Promise<void> {
  await page.addInitScript({ content: HERITAGE_CLICK_SOURCE });
}
