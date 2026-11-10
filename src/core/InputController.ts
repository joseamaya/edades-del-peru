import * as THREE from 'three';
import { BuildingKind, OrderKind, UnitKind, type OrderTarget } from '../core/types';
import { Unit } from '../entities/Unit';
import { Building } from '../entities/Building';
import { ResourceNode } from '../entities/ResourceNode';
import { bus } from './EventBus';
import { BUILDING_DEFS, getBuildingStats } from '../model/defs/buildings';
import { RESOURCE_INFO } from './Config';
import { isConverter, unitDisplayDescription, unitDisplayIcon, unitDisplayName } from '../model/defs/units';
import { getHeritageBuilding, type HeritageBuildingDef } from '../model/defs/heritage';
import { buildModel, disposeModel, type BuildContext } from '../model/ProceduralModel';
import { insideTerrainRect } from '../model/defs/terrainLayout';
import { isTypingTarget } from '../util/dom';

import { keyFor, type HotkeyAction } from './hotkeys';
import { MarkerKind } from '../entities/OrderMarker';
import { t } from '../i18n';

/** Click radius of a fishing ground: its outer ring of ripples (ResourceNodeView.buildFish). */
const FISHING_PICK_RADIUS = 2.6;

/**
 * DOM input, picking, placement and keyboard shortcuts. It drives the same
 * command layer as the HUD; the Game reference is a transitional host while the
 * remaining controllers are extracted.
 */
const NODE_INFO: Record<ResourceNode['kind'], { name: string; icon: string }> = {
  tree: { name: 'Árbol', icon: '🌳' },
  mine: { name: 'Mina', icon: '⛏️' },
  well: { name: 'Cantera', icon: '🪨' },
  hunt: { name: 'Caza', icon: '🦌' },
  fishing: { name: 'Banco de peces', icon: '🐟' },
  berry: { name: 'Arbusto', icon: '🫐' },
};

const WALL_SEGMENT_SPACING = 2;

type PickResult = { resource: ResourceNode | null; unit?: Unit; building?: Building; heritage?: HeritageBuildingDef };

export class InputController {
  private selectionStart: THREE.Vector2 | null = null;
  private mouse = new THREE.Vector2();
  readonly mouseScreen = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  placingBuilding: { kind: BuildingKind; valid: boolean; ghost: THREE.Group } | null = null;
  private shiftQueue = false;

  constructor(private readonly game: any) {}

  init(): void {
    const canvas = this.game.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    // Track the pointer everywhere (including over pointer-events:auto HUD controls) so the
    // camera's UI guard and edge scrolling always use the real position.
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  // --- input ---

  screenToWorld(sx: number, sy: number): THREE.Vector3 | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.game.camera.camera);
    const ray = this.raycaster.ray;
    const hit = new THREE.Vector3();
    // first shot: plane y=0 (lower bound of the terrain)
    if (!ray.intersectPlane(this.groundPlane, hit)) return null;
    const dir = ray.direction;
    if (Math.abs(dir.y) < 1e-4) return hit;
    // refined against the heightfield: fixed point sampling the real height
    const size = this.game.settings.mapSize;
    const p = new THREE.Vector3();
    let t = ray.origin.distanceTo(hit);
    for (let i = 0; i < 5; i++) {
      ray.at(t, p);
      const hx = Math.min(Math.max(p.x, 0), size);
      const hz = Math.min(Math.max(p.z, 0), size);
      const h = this.game.terrain.getHeight(hx, hz);
      const nt = (h - ray.origin.y) / dir.y;
      if (!Number.isFinite(nt) || nt <= 0) break;
      t = nt;
    }
    ray.at(t, p);
    p.y = this.game.terrain.getHeight(Math.min(Math.max(p.x, 0), size), Math.min(Math.max(p.z, 0), size));
    return p;
  }

  /**
   * True if the pointer is over a HUD control. `#ui-root` is `pointer-events:none`
   * and only real controls set `auto`, so `elementFromPoint` returning anything but
   * the canvas means a control is under the cursor (0 A.D.-style edge guard).
   */
  isPointerOverUi(): boolean {
    return this.game.hud.isPointerOverUi(this.mouseScreen.x, this.mouseScreen.y);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.game.gameEnded) return;
    if (this.placingBuilding) {
      if (e.button === 0) {
        const wp = this.screenToWorld(e.clientX, e.clientY);
        if (wp) {
          // Walls are placed by dragging a line; other buildings commit on click.
          if (this.placingBuilding.kind === BuildingKind.WALL) {
            this.wallDragStart = { x: wp.x, z: wp.z };
            return;
          }
          // recompute with the real click point (do not trust the mousemove state)
          const foot = getBuildingStats(this.placingBuilding.kind, this.game.players[0].era).size;
          if (this.game.canPlace(wp.x, wp.z, foot)) this.commitPlacement(wp.x, wp.z);
          else this.updatePlacementGhost(wp.x, wp.z);
        }
      } else if (e.button === 2) {
        this.cancelPlacement();
      }
      return;
    }
    if (e.button === 0) {
      this.leftDown = true;
      this.leftMoved = false;
      this.selectionStart = new THREE.Vector2(e.clientX, e.clientY);
      this.shiftQueue = e.shiftKey;
      this.ctrlQueue = e.ctrlKey || e.altKey;
    } else if (e.button === 2) {
      this.rightDown = true;
    }
  };

  private ctrlQueue = false;
  private leftDown = false;
  private leftMoved = false;
  private rightDown = false;

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 && this.wallDragStart && this.placingBuilding?.kind === BuildingKind.WALL) {
      const start = this.wallDragStart;
      this.wallDragStart = null;
      const end = this.screenToWorld(e.clientX, e.clientY);
      if (end) this.commitWallLine(start, { x: end.x, z: end.z });
      return;
    }
    if (e.button === 0 && this.leftDown) {
      this.leftDown = false;
      this.game.hud?.hideSelectionBox();
      if (this.selectionStart) {
        if (!this.leftMoved) {
          this.selectAt(this.selectionStart.x, this.selectionStart.y);
          // double click: select all units of the same type
          const now = performance.now();
          if (now - this.lastClickTime < 320 && this.game.selectedUnits.length === 1) {
            const u = this.game.units.get(this.game.selectedUnits[0]);
            if (u && u.owner === 0) {
              const sameType = [...this.game.units.values()].filter(
                (x) => x.owner === 0 && x.kind === u.kind && !x.dead,
              );
              this.game.selectedUnits = sameType.map((x) => x.id);
              this.refreshSelectionVisuals();
              bus.emit('unit:selected', { ids: [...this.game.selectedUnits] });
            }
          }
          this.lastClickTime = now;
        } else {
          this.boxSelect(this.selectionStart, new THREE.Vector2(e.clientX, e.clientY));
        }
        this.selectionStart = null;
      }
    } else if (e.button === 2 && this.rightDown) {
      this.rightDown = false;
      this.issueContextOrder(e.clientX, e.clientY);
    }
  };
  private lastClickTime = 0;
  private hoverRaf = 0;
  private pendingHover = new THREE.Vector2();

  private onWindowMouseMove = (e: MouseEvent): void => {
    this.mouseScreen.set(e.clientX, e.clientY);
    this.game.camera.updateMouse(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const wp = this.screenToWorld(e.clientX, e.clientY);
    if (wp) {
      this.mouse.set(wp.x, wp.z);
      if (this.placingBuilding) {
        this.updatePlacementGhost(wp.x, wp.z);
      }
    }
    // left-button drag = selection rectangle
    if (this.leftDown && this.selectionStart) {
      const dx = e.clientX - this.selectionStart.x;
      const dy = e.clientY - this.selectionStart.y;
      if (!this.leftMoved && Math.abs(dx) + Math.abs(dy) > 4) this.leftMoved = true;
      if (this.leftMoved)
        this.game.hud?.showSelectionBox(this.selectionStart.x, this.selectionStart.y, e.clientX, e.clientY);
    }
    // cursor + hover tooltip: one pick per frame, shared by the tooltip and the action icon
    if (!this.game.gameEnded && !this.placingBuilding) {
      this.pendingHover.set(e.clientX, e.clientY);
      if (this.hoverRaf === 0) this.hoverRaf = requestAnimationFrame(this.flushHover);
    }
  };

  private flushHover = (): void => {
    this.hoverRaf = 0;
    if (this.game.gameEnded || this.placingBuilding) return;
    const { x, y } = this.pendingHover;
    const picked = this.pickScene(x, y);
    const info = this.computeHover(picked);
    const hasSel = this.game.selectedUnits.length > 0 || this.game.selectedBuilding !== null;
    const icon = hasSel ? this.hoverAction(picked) : null;
    this.game.renderer.domElement.style.cursor = icon ? 'none' : info ? 'pointer' : 'default';
    this.game.hud?.setHover(info, x, y);
    this.game.hud?.setCursor(icon, x, y);
  };

  /** Everything under the cursor, resolved once and reused by the tooltip and the action icon. */
  private pickScene(sx: number, sy: number): PickResult {
    const resource = this.pickResource(sx, sy);
    if (resource) return { resource };
    const entity = this.pickAt(sx, sy);
    if (entity.unit || entity.building) return { resource: null, ...entity };
    return { resource: null, ...entity, heritage: this.pickHeritage(sx, sy) ?? undefined };
  }

  private pickHeritage(sx: number, sy: number): HeritageBuildingDef | null {
    const roots = [this.game.landmark, this.game.canalGroup].filter((root): root is THREE.Group => !!root);
    if (roots.length === 0) return null;
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.game.camera.camera);
    const hits = roots.flatMap((root) => this.raycaster.intersectObject(root, true));
    hits.sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.heritageId) object = object.parent;
      const def = getHeritageBuilding(object?.userData.heritageId as string | undefined);
      // Monuments still to be built have no volume yet: their pick proxies must not answer clicks.
      if (def && this.game.heritageStanding(def.id)) return def;
    }
    return null;
  }

  /** Whether the current selection includes at least one living worker. */
  private hasSelectedWorker(): boolean {
    return this.game.selectedUnits.some((id: number) => {
      const u = this.game.units.get(id);
      return !!u && !u.dead && u.kind === UnitKind.WORKER;
    });
  }

  /** Contextual action icon according to what is under the cursor and the selection. */
  private hoverAction(picked: PickResult): string | null {
    if (this.placingBuilding) return '🚧';
    if (picked.resource) {
      if (this.game.selectedUnits.length === 0) return null;
      return this.hasSelectedWorker() ? '⛏️' : '🚫';
    }
    if (picked.unit) {
      if (picked.unit.owner === 0) return null;
      const converter = this.game.selectedUnits
        .map((id: number) => this.game.units.get(id))
        .find((u: Unit | undefined): u is Unit => !!u && !u.dead && isConverter(u.kind));
      return converter ? unitDisplayIcon(converter.kind, converter.era) : '⚔️';
    }
    if (picked.building) return picked.building.owner !== 0 ? '⚔️' : '🏰';
    if (picked.heritage) return '🔎';
    return null;
  }

  /** Information about the entity or resource under the cursor (for the tooltip). */
  private computeHover(picked: PickResult): { icon: string; title: string; detalle: string } | null {
    if (picked.resource) {
      const node = picked.resource;
      const ni = NODE_INFO[node.kind];
      const cannotGather = this.game.selectedUnits.length > 0 && !this.hasSelectedWorker();
      return {
        icon: ni.icon,
        title: ni.name,
        detalle:
          `${Math.ceil(node.amount)} ${RESOURCE_INFO[node.resource].name}` +
          (cannotGather ? ` · ${t('hud.toast.noGather')}` : ''),
      };
    }
    if (picked.unit) {
      const own = picked.unit.owner === 0 ? 'Tú' : (this.game.players[picked.unit.owner]?.name ?? 'Enemigo');
      return {
        icon: unitDisplayIcon(picked.unit.kind, picked.unit.era),
        title: unitDisplayName(picked.unit.kind, this.game.players[picked.unit.owner]?.civ, picked.unit.era),
        detalle: `${own} · HP ${Math.ceil(picked.unit.hp)}/${Math.ceil(picked.unit.maxHp)} · ${unitDisplayDescription(
          picked.unit.kind,
          this.game.players[picked.unit.owner]?.civ,
          picked.unit.era,
        )}`,
      };
    }
    if (picked.building) {
      const own = picked.building.owner === 0 ? 'Tú' : (this.game.players[picked.building.owner]?.name ?? 'Enemigo');
      const state = picked.building.constructionComplete
        ? ''
        : ` · Construyendo ${Math.floor(picked.building.buildRatio * 100)}%`;
      return {
        icon: this.game.buildingIcon(picked.building.kind),
        title: this.game.buildingName(picked.building.kind),
        detalle: `${own} · HP ${Math.ceil(picked.building.hp)}/${Math.ceil(picked.building.maxHp)}${state}`,
      };
    }
    if (picked.heritage) {
      return {
        icon: '🏛️',
        title: picked.heritage.name,
        detalle: `${picked.heritage.sector} · ${picked.heritage.role}`,
      };
    }
    return null;
  }

  /** Project a world point to screen coordinates. */
  private projectToScreen(x: number, y: number, z: number): { x: number; y: number } {
    const v = this.tmpProject.set(x, y, z).project(this.game.camera.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
  }
  private tmpProject = new THREE.Vector3();
  private static readonly UNIT_PICK_PX = 30;
  private static readonly BUILDING_PICK_PX = 24;

  /**
   * Tolerant picking: exact raycast first and, if it fails, the entity closest
   * to the cursor on screen (fixes clicking on small/moving units).
   */
  pickAt(sx: number, sy: number): { unit?: Unit; building?: Building } {
    const direct = this.pickEntity(sx, sy);
    if (direct.unit) return direct;

    // closest unit on screen (tolerance for small units or behind buildings)
    let bestUnit: Unit | undefined;
    let bestUnitD = InputController.UNIT_PICK_PX;
    for (const u of this.game.units.values()) {
      if (u.dead) continue;
      const s = this.projectToScreen(u.pos.x, u.pos.y + 0.5, u.pos.z);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestUnitD) {
        bestUnitD = d;
        bestUnit = u;
      }
    }
    if (bestUnit) {
      if (direct.building) {
        const bs = this.projectToScreen(direct.building.pos.x, direct.building.pos.y + 1.3, direct.building.pos.z);
        const bd = Math.hypot(bs.x - sx, bs.y - sy);
        return bestUnitD <= bd ? { unit: bestUnit } : direct;
      }
      return { unit: bestUnit };
    }
    if (direct.building) return direct;

    // closest building on screen
    let bestBuilding: Building | undefined;
    let bestBuildingD = InputController.BUILDING_PICK_PX;
    for (const b of this.game.buildings.values()) {
      if (b.dead) continue;
      const s = this.projectToScreen(b.pos.x, b.pos.y + 1.3, b.pos.z);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestBuildingD) {
        bestBuildingD = d;
        bestBuilding = b;
      }
    }
    return bestBuilding ? { building: bestBuilding } : {};
  }

  pickEntity(sx: number, sy: number): { unit?: Unit; building?: Building } {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.game.camera.camera);
    const proxies: THREE.Object3D[] = [];
    for (const u of this.game.units.values()) if (!u.dead && u.view) proxies.push(u.view.pickProxy);
    for (const b of this.game.buildings.values()) if (!b.dead && b.view) proxies.push(b.view.pickProxy);
    const hits = this.raycaster.intersectObjects(proxies, false);
    for (const h of hits) {
      const e = h.object.userData.owner;
      if (e instanceof Unit) return { unit: e };
      if (e instanceof Building) return { building: e };
    }
    return {};
  }

  private selectAt(sx: number, sy: number): void {
    const picked = this.pickAt(sx, sy);
    if (picked.building && !this.shiftQueue) {
      this.game.selectedUnits = [];
      this.game.selectedBuilding = picked.building.id;
      this.game.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [] });
      this.game.audio.select();
      return;
    }
    if (picked.unit) {
      if (this.shiftQueue) {
        if (!this.game.selectedUnits.includes(picked.unit.id)) this.game.selectedUnits.push(picked.unit.id);
      } else {
        this.game.selectedUnits = [picked.unit.id];
      }
      this.game.selectedBuilding = null;
      this.game.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.game.selectedUnits] });
      this.game.audio.select();
      return;
    }
    if (!this.shiftQueue) {
      const heritage = this.pickHeritage(sx, sy);
      if (heritage) {
        this.game.selectedUnits = [];
        this.game.selectedBuilding = null;
        this.game.selectedHeritage = heritage.id;
        this.refreshSelectionVisuals();
        bus.emit('unit:selected', { ids: [] });
        this.game.audio.select();
        return;
      }
      this.game.selectedUnits = [];
      this.game.selectedBuilding = null;
      this.game.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [] });
      this.game.audio.select();
    }
  }

  private boxSelect(a: THREE.Vector2, b: THREE.Vector2): void {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const result: number[] = [];
    for (const u of this.game.units.values()) {
      if (u.owner !== 0) continue;
      if (u.dead) continue;
      const screen = new THREE.Vector3(u.pos.x, u.pos.y, u.pos.z).project(this.game.camera.camera);
      const sx = (screen.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-screen.y * 0.5 + 0.5) * window.innerHeight;
      if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
        result.push(u.id);
      }
    }
    if (result.length > 0) {
      this.game.selectedUnits = this.shiftQueue ? [...new Set([...this.game.selectedUnits, ...result])] : result;
      this.game.selectedBuilding = null;
      this.game.selectedHeritage = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.game.selectedUnits] });
    }
  }

  refreshSelectionVisuals(): void {
    for (const u of this.game.units.values()) {
      const sel = this.game.selectedUnits.includes(u.id);
      u.selected = sel;
      const p = this.game.players[u.owner];
      u.view?.showSelectionColor(sel, p.color);
    }
    for (const b of this.game.buildings.values()) {
      const sel = this.game.selectedBuilding === b.id;
      b.selected = sel;
      const p = this.game.players[b.owner];
      b.view?.showSelectionColor(sel, p.color);
    }
  }

  /**
   * Only workers harvest. A selection without workers moves instead and warns, because a gather
   * marker followed by a plain move reads as a failed order.
   */
  private orderGather(units: Unit[], entityId: number, target: OrderTarget): void {
    const workers = units.filter((u) => u.kind === UnitKind.WORKER);
    if (workers.length === 0) {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
      this.game.hud?.showToast(t('hud.toast.noGather'), 'warning');
      this.game.audio.order();
      return;
    }
    this.markOrder(target, 'gather');
    this.game.executeCommand({
      kind: 'order',
      unitIds: workers.map((u) => u.id),
      order: { kind: OrderKind.GATHER, entityId },
      clear: !this.shiftQueue,
    });
    const others = units.filter((u) => u.kind !== UnitKind.WORKER);
    if (others.length > 0) this.issueMoveFormation(others, target);
    this.game.audio.order();
  }

  issueContextOrder(sx: number, sy: number): void {
    const units = this.game.selectedUnits
      .map((id: number) => this.game.units.get(id))
      .filter((u: Unit | undefined): u is Unit => !!u && !u.dead);
    if (units.length === 0) return;
    const picked = this.pickAt(sx, sy);
    const wp = this.screenToWorld(sx, sy);
    const target: OrderTarget = wp ? { x: wp.x, z: wp.z } : { x: this.mouse.x, z: this.mouse.y };

    // click on a resource node -> only workers gather; everyone else moves. Without a worker
    // the order would silently look like a failed gather, so warn and show the move marker.
    const node = this.pickResource(sx, sy);
    if (node) {
      this.orderGather(units, node.id, target);
      return;
    }
    if (picked.building) {
      const b = picked.building;
      // farm: workers gather food from it (only if it is complete)
      if (b.owner === 0 && b.isFarm && b.constructionComplete && b.foodAmount > 0) {
        this.orderGather(units, b.id, target);
        return;
      }
      if (b.owner !== 0) {
        // attack an enemy building
        this.markOrder({ x: b.pos.x, z: b.pos.z }, 'attack');
        for (const u of units) {
          this.game.orderUnit(u, { kind: OrderKind.ATTACK, entityId: b.id }, !this.shiftQueue);
        }
      } else if (this.shiftQueue) {
        // set rally point
        this.game.executeCommand({ kind: 'rally', buildingId: b.id, target });
      } else {
        for (const u of units) {
          if (u.kind === UnitKind.CARAVAN && b.kind === BuildingKind.MARKET && b.constructionComplete) {
            const origin = [...this.game.buildings.values()]
              .filter(
                (market) =>
                  market.owner === u.owner && market.kind === BuildingKind.MARKET && !market.dead && market.id !== b.id,
              )
              .sort(
                (a, c) =>
                  Math.hypot(a.pos.x - u.pos.x, a.pos.z - u.pos.z) - Math.hypot(c.pos.x - u.pos.x, c.pos.z - u.pos.z),
              )[0];
            if (origin) {
              this.game.orderUnit(
                u,
                { kind: OrderKind.TRADE, entityId: b.id, origin: { x: origin.pos.x, z: origin.pos.z } },
                !this.shiftQueue,
              );
            }
          } else if (u.kind === UnitKind.WORKER && !b.constructionComplete) {
            this.game.orderUnit(u, { kind: OrderKind.BUILD, entityId: b.id }, !this.shiftQueue);
          } else if (u.kind === UnitKind.WORKER && b.isDropsite) {
            this.game.orderUnit(u, { kind: OrderKind.DELIVER, entityId: b.id }, !this.shiftQueue);
          } else if (b.garrisons > 0) {
            this.game.orderUnit(u, { kind: OrderKind.GARRISON, entityId: b.id }, !this.shiftQueue);
          } else {
            this.game.orderUnit(u, { kind: OrderKind.MOVE, target }, !this.shiftQueue);
          }
        }
      }
      return;
    }
    if (picked.unit && picked.unit.owner !== 0) {
      const enemyId = picked.unit.id;
      const target = { x: picked.unit.pos.x, z: picked.unit.pos.z };
      const canConvert = units.some((u: Unit) => isConverter(u.kind));
      this.markOrder(target, canConvert ? 'convert' : 'attack');
      for (const u of units) {
        if (canConvert && isConverter(u.kind)) {
          this.game.orderUnit(u, { kind: OrderKind.CONVERT, entityId: enemyId }, !this.shiftQueue);
        } else {
          this.game.orderUnit(u, { kind: OrderKind.ATTACK, entityId: enemyId }, !this.shiftQueue);
        }
      }
      return;
    }
    if (this.ctrlQueue) {
      // attack-move
      const goal = this.groundGoal(target, units[0]);
      this.markOrder(goal, 'attack');
      for (const u of units) {
        this.game.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target: goal }, !this.shiftQueue);
      }
    } else {
      const goal = this.groundGoal(target, units[0]);
      this.markOrder(goal, 'move');
      this.issueMoveFormation(units, goal);
    }
    this.game.audio.order();
  }

  /**
   * Destination of a move/attack-move order. A click on unwalkable ground (the sea, a cliff, the far
   * bank of the Supe) goes to the nearest walkable point the unit can reach, so the order finishes on
   * the shore instead of holding the unit "busy" forever.
   */
  private groundGoal(target: OrderTarget, from: Unit): OrderTarget {
    const pathfinder = this.game.pathfinder;
    if (pathfinder.isWalkable(target.x, target.z, from.owner)) return target;
    const component = pathfinder.componentAt(from.pos.x, from.pos.z);
    // Never snap to the far bank: without a component (unit embedded in an obstacle) search the map.
    const safe = component
      ? pathfinder.nearestWalkablePoint(target.x, target.z, 0, component, from.owner)
      : pathfinder.nearestWalkablePoint(target.x, target.z, 0, undefined, from.owner);
    return safe ?? target;
  }

  /** Visually mark the destination of an order on the ground. */
  private markOrder(target: OrderTarget, kind: MarkerKind): void {
    const y = this.game.terrain.getHeight(target.x, target.z);
    this.game.markers.spawn(target.x, y, target.z, kind);
  }

  /** Move/attack-move order to a world point (used by the minimap). */
  commandMoveToWorld(x: number, z: number, ctrlQueue = this.ctrlQueue, shiftQueue = this.shiftQueue): void {
    const units = this.game.selectedUnits
      .map((id: number) => this.game.units.get(id))
      .filter((u: Unit | undefined): u is Unit => !!u && !u.dead);
    if (units.length === 0) return;
    const target = this.groundGoal({ x, z }, units[0]);
    if (ctrlQueue) {
      this.markOrder(target, 'attack');
      for (const u of units) this.game.orderUnit(u, { kind: OrderKind.ATTACK_MOVE, target }, !shiftQueue);
    } else {
      this.markOrder(target, 'move');
      this.issueMoveFormation(units, target);
    }
    this.game.audio.order();
  }

  /** Line-formation movement: one shared A* path, per-unit final offsets. */
  private issueMoveFormation(units: Unit[], target: OrderTarget): void {
    const n = units.length;
    const yaw = Math.atan2(target.z - units[0].pos.z, target.x - units[0].pos.x);
    const spacing = 1.5;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    // One A* for the whole order; separation keeps the members from overlapping.
    const owner = units[0].owner;
    const shared = this.game.pathfinder.pathfind(units[0].pos.x, units[0].pos.z, target.x, target.z, owner);
    const slowest = Math.min(...units.map((u: Unit) => u.stats.speed));
    const spread = this.game.formationPreset === 'dispersed' ? spacing * 1.7 : spacing;
    let idx = 0;
    for (const u of units) {
      const r = Math.floor(idx / cols) - (rows - 1) / 2;
      const c = (idx % cols) - (cols - 1) / 2;
      idx++;
      let offset: { x: number; z: number };
      if (this.game.formationPreset === 'line') {
        const lineIndex = idx - 1 - (n - 1) / 2;
        offset = { x: -Math.sin(yaw) * lineIndex * spread, z: Math.cos(yaw) * lineIndex * spread };
      } else {
        offset = {
          x: Math.cos(yaw) * r * spread - Math.sin(yaw) * c * spread,
          z: Math.sin(yaw) * r * spread + Math.cos(yaw) * c * spread,
        };
      }
      // `issueGroupMove` clamps an unwalkable final goal in the unit's own component.
      u.issueGroupMove(target, shared, offset, slowest, !this.shiftQueue);
    }
  }

  private pickResource(sx: number, sy: number): ResourceNode | null {
    const ndc = new THREE.Vector2((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.game.camera.camera);
    let best: ResourceNode | null = null;
    let bestD = Infinity;
    // nodes with their own mesh (mine, well, hunt, fishing, berry and reserve trees)
    const meshes: THREE.Object3D[] = [];
    for (const n of this.game.resourceNodes.values()) {
      if (n.kind === 'tree' && n.treeSlot >= 0) continue;
      if (n.nodeView) meshes.push(n.nodeView.view);
    }
    const hits = this.raycaster.intersectObjects(meshes, true);
    for (const h of hits) {
      let cur: THREE.Object3D | null = h.object;
      while (cur) {
        let found: ResourceNode | null = null;
        for (const n of this.game.resourceNodes.values()) {
          if (n.nodeView?.view === cur) {
            found = n;
            break;
          }
        }
        if (found) {
          best = found;
          bestD = h.distance;
          break;
        }
        cur = cur.parent;
      }
      if (best) break; // ordered by distance: the first is the closest
    }
    // instanced trees
    const treeHits: { dist: number; id: number }[] = [];
    this.game.trees.raycast(this.raycaster, treeHits);
    for (const th of treeHits) {
      if (th.dist < bestD) {
        const n = this.game.resourceNodes.get(th.id);
        if (n) {
          bestD = th.dist;
          best = n;
        }
      }
    }
    if (best) return best;
    // A fishing ground is a ring of ripples on the water: a click anywhere inside the ring picks it.
    const waterLevel = this.game.terrain.waterLevel;
    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) > 1e-4) {
      const t = (waterLevel - ray.origin.y) / ray.direction.y;
      if (t > 0) {
        const x = ray.origin.x + ray.direction.x * t;
        const z = ray.origin.z + ray.direction.z * t;
        let nearest = FISHING_PICK_RADIUS;
        for (const n of this.game.resourceNodes.values()) {
          if (n.kind !== 'fishing' || n.dead) continue;
          const d = Math.hypot(n.pos.x - x, n.pos.z - z);
          if (d < nearest) {
            nearest = d;
            best = n;
          }
        }
      }
    }
    return best;
  }

  // --- construction ---

  startPlacement(kind: BuildingKind): void {
    // RTS standard: building requires selected workers
    if (!this.hasSelectedWorker()) {
      this.game.hud.showToast('Selecciona obreros para construir', 'warning');
      return;
    }
    const ctx = this.game.makeBuildContext(0);
    const ghost = new THREE.Group();
    this.placingBuilding = { kind, valid: false, ghost };
    this.game.scene.add(ghost);
    const ghostModel = buildModelForGhost(kind, ctx);
    ghost.add(ghostModel);
    const wp = this.screenToWorld(this.mouseScreen.x, this.mouseScreen.y);
    if (wp) this.updatePlacementGhost(wp.x, wp.z);
  }

  updatePlacementGhost(x: number, z: number): void {
    if (!this.placingBuilding) return;
    const stats = getBuildingStats(this.placingBuilding.kind, this.game.players[0].era);
    const foot = stats.size;
    const y = this.game.terrain.getHeight(x, z);
    const valid = this.game.canPlace(x, z, foot);
    this.placingBuilding.valid = valid;
    this.placingBuilding.ghost.position.set(x, y + 0.1, z);
    this.placingBuilding.ghost.visible = true;
    this.placingBuilding.ghost.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) mat.color.setHex(valid ? 0x33ff88 : 0xff4444);
      }
    });
  }

  /** Whether a building footprint would overlap the authored archaeological site. */
  siteBlocksConstruction(x: number, z: number, pad: number): boolean {
    const rects = this.game.siteDef?.buildKeepout ?? this.game.missionLayout?.site?.buildKeepout;
    if (!rects) return false;
    const size = this.game.settings.mapSize;
    return rects.some((rect: { x: number; z: number; rx: number; rz: number }) =>
      insideTerrainRect({ x: rect.x * size, z: rect.z * size, rx: rect.rx * size, rz: rect.rz * size }, x, z, pad),
    );
  }

  commitPlacement(x: number, z: number): void {
    if (!this.placingBuilding) return;
    const kind = this.placingBuilding.kind;
    this.cancelPlacement();
    this.placeAndOrder(kind, x, z);
  }

  /** Place one segment and send the selected workers to it. */
  private placeAndOrder(kind: BuildingKind, x: number, z: number): Building | null {
    const stats = getBuildingStats(kind, this.game.players[0].era);
    if (!this.game.canPlace(x, z, stats.size)) return null;
    const b = this.commandPlace(kind, x, z);
    if (!b) {
      this.game.hud.showToast('Recursos insuficientes', 'error');
      return null;
    }
    const builders = this.game.selectedUnits
      .map((id: number) => this.game.units.get(id))
      .filter((u: Unit | undefined): u is Unit => !!u && !u.dead && u.kind === UnitKind.WORKER);
    for (const u of builders) {
      this.game.executeCommand({
        kind: 'order',
        unitIds: [u.id],
        order: { kind: OrderKind.BUILD, entityId: b.id },
        clear: true,
      });
    }
    return b;
  }

  /** Wall drag: one segment every 2 m along the drag line. */
  commitWallLine(a: { x: number; z: number }, b: { x: number; z: number }): void {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const segments = Math.max(1, Math.ceil(length / WALL_SEGMENT_SPACING));
    let blocked = 0;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (!this.placeAndOrder(BuildingKind.WALL, x, z)) blocked++;
    }
    if (blocked > 0) this.game.hud.showToast(`${blocked} tramo(s) de muralla sin espacio`, 'warning');
  }

  /** Place a building for player 0 through the command layer; returns the new building. */
  private commandPlace(kind: BuildingKind, x: number, z: number): Building | null {
    const before = new Set(this.game.buildings.keys());
    if (!this.game.executeCommand({ kind: 'place', building: kind, x, z })) return null;
    for (const [id, b] of this.game.buildings) if (!before.has(id)) return b;
    return null;
  }

  cancelPlacement(): void {
    this.wallDragStart = null;
    if (this.placingBuilding) {
      this.game.scene.remove(this.placingBuilding.ghost);
      disposeModel(this.placingBuilding.ghost);
      this.placingBuilding = null;
    }
  }

  // --- keyboard ---

  private key(action: HotkeyAction): string {
    return keyFor(action, this.game.settings.hotkeys);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isTypingTarget(e.target)) return;
    // Holding an order key must not fire it ~30 times per second (issue 387).
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (this.game.gameEnded) return;
    if (k === this.key('pause')) {
      this.togglePause();
      return;
    }
    // do not process game shortcuts with a menu open or while paused
    if (this.game.paused || this.game.hud.hasBlockingOverlay()) return;
    const marker = /^f([1-4])$/.exec(k);
    if (marker) {
      const index = Number(marker[1]);
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const target = this.game.camera.getTarget();
        this.cameraMarks.set(index, { x: target.x, z: target.z });
        this.game.hud?.showToast(`Marcador de cámara F${index} guardado`, 'info');
        return;
      }
      // F1 keeps the legacy help shortcut; F2-F4 are bare recall keys.
      if (index > 1 && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const target = this.cameraMarks.get(index);
        if (target) this.game.camera.focusOn(target.x, target.z);
        return;
      }
    }
    if (k === this.key('toggleHelp') || k === '?' || k === 'f1') {
      e.preventDefault();
      this.game.hud.toggleHelp();
      return;
    }
    if (k === this.key('nextIdleWorker')) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) this.game.selectIdleWorkers();
      else this.game.cycleIdleWorker();
      return;
    }
    if (k === 'escape') {
      this.cancelPlacement();
      this.game.selectedUnits = [];
      this.game.selectedBuilding = null;
      this.game.selectedHeritage = null;
      this.refreshSelectionVisuals();
      return;
    }
    // control groups (Ctrl/Alt+n assign, n recall, Shift+n add)
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const n = Number(e.key);
      if (e.ctrlKey || e.metaKey || e.altKey) this.assignControlGroup(n);
      else if (e.shiftKey) this.addToControlGroup(n);
      else this.recallControlGroup(n);
      return;
    }
    if (k === this.key('centerBase')) {
      const center = [...this.game.buildings.values()].find((b) => b.owner === 0 && b.kind === BuildingKind.CENTER);
      if (center) this.game.camera.focusOn(center.pos.x, center.pos.z);
    }
    if (k === this.key('followUnit')) {
      if (this.game.selectedUnits.length > 0) {
        const u = this.game.units.get(this.game.selectedUnits[0]);
        if (u) this.game.camera.follow(u.id);
      }
    }
    if (k === this.key('lastBattle')) {
      const lastEvt = this.game.lastBattleEvent;
      if (lastEvt) {
        const ent = this.game.units.get(lastEvt) ?? this.game.buildings.get(lastEvt);
        if (ent) this.game.camera.focusOn(ent.pos.x, ent.pos.z);
      }
    }
    // select the whole army (own combat units)
    if (k === this.key('selectArmy')) {
      const army = [...this.game.units.values()].filter(
        (u: Unit) => u.owner === 0 && !u.dead && u.kind !== UnitKind.WORKER,
      );
      this.game.selectedUnits = army.map((u: Unit) => u.id);
      this.game.selectedBuilding = null;
      this.refreshSelectionVisuals();
      bus.emit('unit:selected', { ids: [...this.game.selectedUnits] });
      this.game.audio.select();
      return;
    }
    // numeric controls for panels
    if (k === this.key('techTree')) {
      e.preventDefault();
      this.game.hud.showTechTree();
      return;
    }
    if (k === this.key('buildFarm')) this.startPlacement(BuildingKind.FARM);
    if (k === this.key('buildHouse')) this.startPlacement(BuildingKind.HOUSE);
    if (this.game.hud.triggerHotkey(k)) e.preventDefault();
  };

  private wallDragStart: { x: number; z: number } | null = null;
  private controlGroups = new Map<number, number[]>();
  private cameraMarks = new Map<number, { x: number; z: number }>();
  private lastGroupN = 0;
  private lastGroupTap = 0;

  private assignControlGroup(n: number): void {
    const ids = this.game.selectedUnits.filter((id: number) => {
      const u = this.game.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.controlGroups.set(n, ids);
    this.game.hud?.showToast(ids.length > 0 ? `Grupo ${n} · ${ids.length} unidades` : `Grupo ${n} vacío`, 'info');
  }

  private addToControlGroup(n: number): void {
    const cur = this.controlGroups.get(n) ?? [];
    const add = this.game.selectedUnits.filter((id: number) => {
      const u = this.game.units.get(id);
      return u && !u.dead && u.owner === 0;
    });
    this.controlGroups.set(n, [...new Set([...cur, ...add])]);
    this.game.hud?.showToast(`Añadido al grupo ${n}`, 'info');
  }

  private recallControlGroup(n: number): void {
    const ids = (this.controlGroups.get(n) ?? []).filter((id: number) => {
      const u = this.game.units.get(id);
      return u && !u.dead;
    });
    if (ids.length === 0) return;
    this.game.selectedUnits = ids;
    this.game.selectedBuilding = null;
    this.refreshSelectionVisuals();
    bus.emit('unit:selected', { ids: [...ids] });
    this.game.audio.select();
    const now = performance.now();
    if (this.lastGroupN === n && now - this.lastGroupTap < 400) {
      const u = this.game.units.get(ids[0]);
      if (u) this.game.camera.focusOn(u.pos.x, u.pos.z);
    }
    this.lastGroupN = n;
    this.lastGroupTap = now;
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    void e;
  };

  togglePause(): void {
    if (!this.game.paused && this.game.hud.hasBlockingOverlay()) return;
    this.game.paused = !this.game.paused;
    this.game.hud.setPaused(this.game.paused);
  }

  getPaused(): boolean {
    return this.game.paused;
  }

  /** True once the match has been decided (victory/defeat). */
  hasEnded(): boolean {
    return this.game.gameEnded;
  }

  dispose(): void {
    if (this.game.headless) return;
    const canvas = this.game.renderer.domElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf);
  }
}

export function buildModelForGhost(kind: BuildingKind, ctx: BuildContext): THREE.Group {
  const def = BUILDING_DEFS[kind];
  const modelType = Object.values(def.eraModel)[0];
  const g = buildModel({ type: modelType?.type ?? 'center_steam' }, ctx);
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    m.vertexColors = false;
    m.needsUpdate = true;
  });
  return g;
}
