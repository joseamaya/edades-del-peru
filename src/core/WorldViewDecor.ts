import * as THREE from 'three';
import { CulturalLandscape } from '../rendering/CulturalLandscape';
import { SacredCity } from '../rendering/SacredCity';
import { applyFowToObject } from '../rendering/FowMaterial';
import { ResourceNode } from '../entities/ResourceNode';
import { disposeStaticGltf } from '../rendering/StaticModel';
import { loadSceneryModel } from '../rendering/sceneryModels';
import { loadSiteModel } from '../rendering/siteModels';
import { mergeStaticByMaterial } from '../rendering/mergeStatic';
import { CaralCity } from '../rendering/architectureKit';
import { CARAL_CITY_BLOCKERS, CARAL_CITY_LAYOUT } from '../model/defs/caralCity';
import { loadDecorModel } from '../rendering/decorModels';
import { planProps, propCountFor } from '../model/defs/props';
import { planWildlife, faunaCountFor } from '../model/defs/wildlife';
import { attachFaunaKit } from '../rendering/faunaKit';
import { BuildingKind } from '../core/types';
import { getCiv } from '../model/defs/civs';
import type { MissionSite } from '../campaign/types';
import { archProfileFor } from '../model/defs/architecture';
import { LANDMARKS, PadSize, setpiecePadRadius } from '../model/defs/landmarks';
import { getPeriod } from '../model/defs/periods';
import { BuildContext, buildLandmarkModel } from '../model/ProceduralModel';
import type { SettlementPlan } from '../model/defs/settlementPlan';
import { type CaralCityPlan } from '../model/defs/setpieces';
import { SettlementOverlay } from '../rendering/SettlementOverlay';
import { SettlementDressing } from '../rendering/SettlementDressing';
import { planSettlementDressing } from '../model/defs/settlementDressing';
import {
  CARAL_VALLEY_PATH_WIDTH,
  planCaralValley,
  planCaralValleyFauna,
  planCaralValleyProps,
  type CaralValleyPlan,
  type CaralValleyQuery,
} from '../model/defs/caralValley';
import { distance2D, distanceToSegment } from '../util/math';
import { RNG, weightedPick } from '../util/rng';
import { type AuthoredSiteDef, type SiteHeritageProxy } from '../model/defs/sites';
import { getMission } from '../campaign/defs/campaign';

const AMBIENT_PROP_SEED = 7;
const AMBIENT_FAUNA_SEED = 13;
const FISHING_SCAN_MARGIN = 4;

/** World/mission decoration and opening spawns. Transitional host while Game is decomposed. */
/** Riparian fauna roosts keep this far from trees (crown radius plus their grazing orbit). */
const FAUNA_TREE_CLEARANCE = 7;

export class WorldViewDecor {
  constructor(private readonly game: any) {}

  reserveCaralValley(): void {
    if (this.game.siteDef?.environs?.valley !== 'caral' || this.game.caralValleyPlan) return;
    const base = this.game.missionLayout?.base;
    if (!base) return;
    const size = this.game.settings.mapSize;
    this.game.caralValleyBase = { x: base.x * size, z: base.z * size };
    this.game.caralValleyPlan = this.planCaralValleyAt(this.game.caralValleyBase.x, this.game.caralValleyBase.z);
  }

  applyAtmosphere(): void {
    const a = this.game.mapProfile.atmosphere;
    const o = this.game.missionAtmosphere;
    const skyTint = o?.skyTint ?? a.skyTint;
    const fogDensity = o?.fogDensity ?? a.fogDensity;
    const sunWarmth = o?.sunWarmth ?? a.sunWarmth;
    const tint = new THREE.Color(skyTint);
    this.game.terrain.setFogColor(tint);
    this.game.terrain.setFogDensity(fogDensity);
    this.game.water.setFog(skyTint, fogDensity);
    this.game.sky.setAtmosphere(skyTint, sunWarmth);
  }

  addSiteHeritageProxies(parent: THREE.Group, proxies: readonly SiteHeritageProxy[]): void {
    // Pick-only volumes: the raycaster ignores material.visible, the renderer skips them (as an
    // invisible transparent double-sided box each one cost two draw calls).
    const material = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    for (const p of proxies) {
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), material);
      proxy.name = p.id;
      // Stand on the terrain (the site's terrace is above the landmark group's origin).
      const ground = this.game.terrain.getHeight(p.x, p.z) - parent.position.y;
      proxy.position.set(p.x, ground + p.h / 2 + 0.02, p.z);
      proxy.userData.heritageId = p.id;
      proxy.frustumCulled = false;
      parent.add(proxy);
    }
  }

  /** Block the source's monumental volumes while leaving plazas and paths walkable. */
  addSiteObstacles(def: AuthoredSiteDef): void {
    for (const blocker of def.blockers) {
      this.game.pathfinder.addObstacle({
        x: blocker.x,
        z: blocker.z,
        w: blocker.w + def.blockerPadding * 2,
        d: blocker.d + def.blockerPadding * 2,
      });
    }
  }

  /**
   * Bake the low residential/retaining walls into the navigation grid. Vertical
   * source faces that start near the floor are walls (including retaining
   * walls); roofs and plaza floors are horizontal, and the tall pyramid volumes
   * are already covered by the AABBs.
   */
  addSiteWallCollision(model: THREE.Object3D, baseY: number, def: AuthoredSiteDef): void {
    if (def.wallCollision.meshPatterns.length === 0) return;
    const corridor = def.walkableCorridor;
    const corridorFrom = corridor ? this.game.playerCenter(0) : null;
    const corridorTo = corridor ? def.anchor : null;
    const { cols, rows, cell } = this.game.pathfinder.grid;
    const mask = new Uint8Array(cols * rows);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const maxWallStartY = baseY + def.wallCollision.maxStartYAboveBase;
    model.updateWorldMatrix(true, true);
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || !mesh.geometry?.getAttribute('position')) return;
      if (!def.wallCollision.meshPatterns.some((pattern) => pattern.test(mesh.name))) return;
      const position = mesh.geometry.getAttribute('position');
      const index = mesh.geometry.getIndex();
      const count = index ? index.count : position.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i;
        const ib = index ? index.getX(i + 1) : i + 1;
        const ic = index ? index.getX(i + 2) : i + 2;
        a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const uz = b.z - a.z;
        const vx = c.x - a.x;
        const vy = c.y - a.y;
        const vz = c.z - a.z;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz);
        if (!len || Math.abs(ny) / len >= 0.35) continue;
        if (Math.min(a.y, b.y, c.y) > maxWallStartY) continue;
        const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x) / cell));
        const x1 = Math.min(cols - 1, Math.floor(Math.max(a.x, b.x, c.x) / cell));
        const z0 = Math.max(0, Math.floor(Math.min(a.z, b.z, c.z) / cell));
        const z1 = Math.min(rows - 1, Math.floor(Math.max(a.z, b.z, c.z) / cell));
        for (let z = z0; z <= z1; z++) {
          for (let x = x0; x <= x1; x++) {
            if (corridor) {
              const px = (x + 0.5) * cell;
              const pz = (z + 0.5) * cell;
              if (
                corridorFrom &&
                corridorTo &&
                distanceToSegment(px, pz, corridorFrom, corridorTo) <= corridor.width / 2
              )
                continue;
            }
            mask[z * cols + x] = 1;
          }
        }
      }
    });
    this.game.pathfinder.blockCells(mask);
  }

  /** Load the authored campaign site; monumental volumes block pathing, not the whole footprint. */
  spawnAuthoredSite(site: MissionSite): void {
    const def = this.game.siteDef;
    if (!def) {
      console.warn(`[site] missing authored definition for ${site.id}`);
      return;
    }
    const group = new THREE.Group();
    group.name = 'landmark';
    group.position.set(0, site.y ?? 0, 0);
    this.game.landmark = group;
    this.game.landmarkOwnsStatic = true;
    this.game.scene.add(group);
    if (site.focus) {
      this.game.siteFocus = {
        x: site.focus.x * this.game.settings.mapSize,
        z: site.focus.z * this.game.settings.mapSize,
      };
      this.game.siteCenter = { ...this.game.siteFocus };
    }
    this.game.siteAnchor = { ...def.anchor };
    this.addSiteObstacles(def);
    this.addSiteHeritageProxies(group, def.heritageProxies);
    const token = ++this.game.landmarkLoadToken;
    const current = (): boolean => token === this.game.landmarkLoadToken && this.game.landmark === group;
    let siteModel: THREE.Object3D | null = null;
    let cityShown = false;
    if (def.id === 'caral_site') {
      // The in-use city's houses are part of the simulation (headless too), independent of the kit load.
      for (const blocker of CARAL_CITY_BLOCKERS) {
        const pad = def.blockerPadding * 2;
        this.game.pathfinder.addObstacle({ x: blocker.x, z: blocker.z, w: blocker.w + pad, d: blocker.d + pad });
      }
      if (!this.game.headless) {
        // Blender architecture kit: the city in use replaces the ruins GLB, which stays the fallback until
        // the kit is ready and then only keeps its (hidden, still clickable) heritage nodes.
        const city = new CaralCity(CARAL_CITY_LAYOUT, (x, z) => this.game.terrain.getHeight(x, z) - (site.y ?? 0));
        city.setMayorPhase(this.game.sitePhase);
        this.game.caralCity = city;
        void city.load().then((ok) => {
          if (!current()) {
            city.dispose();
            return;
          }
          if (!ok) return;
          group.add(city.group);
          applyFowToObject(city.group, this.game.fowUniforms);
          cityShown = true;
          if (siteModel) siteModel.visible = false;
        });
      }
    }
    void loadSiteModel(def.id)
      .then((model) => {
        if (!current()) {
          disposeStaticGltf(model);
          return;
        }
        siteModel = model;
        model.name = def.modelName;
        model.scale.setScalar(def.scale);
        model.position.set(def.origin.x, 0, def.origin.z);
        model.traverse((object) => {
          if (def.hideNodePatterns?.some((pattern: RegExp) => pattern.test(object.name))) object.visible = false;
          if (def.doubleSidedPatterns?.some((pattern: RegExp) => pattern.test(object.name))) {
            const mesh = object as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) {
              material.side = THREE.DoubleSide;
              material.polygonOffset = true;
              material.polygonOffsetFactor = -2;
              material.polygonOffsetUnits = -2;
            }
          }
          const heritage = def.heritageNodeMap?.find((entry: { pattern: RegExp; id: string }) =>
            entry.pattern.test(object.name),
          );
          if (heritage) object.userData.heritageId = heritage.id;
        });
        group.add(model);
        group.updateMatrixWorld(true);
        this.addSiteWallCollision(model, site.y ?? 0, def);
        applyFowToObject(model, this.game.fowUniforms);
        this.enableLandmarkShadows(model);
        // After collision and heritage tagging: heritage nodes stay separate so they remain pickable.
        mergeStaticByMaterial(model, (mesh) => {
          for (let o: THREE.Object3D | null = mesh; o && o !== model; o = o.parent) {
            if (o.userData.heritageId) return true;
          }
          return false;
        });
        // Hidden objects stay raycastable, so the heritage nodes still answer clicks.
        if (cityShown) model.visible = false;
      })
      .catch((error: unknown) => {
        console.warn(`[site] failed to load authored ${def.id} site`, error);
      });
  }

  /** Frame the base, or the base/site midpoint for sites that need both in shot. */
  missionFraming(x: number, z: number): { x: number; z: number; height?: number } {
    const focus = this.game.siteFocus;
    if (this.game.siteDef?.framing === 'midpoint' && focus) {
      return { x: (x + focus.x) / 2, z: (z + focus.z) / 2, height: this.game.siteDef.cameraHeight };
    }
    if (this.game.siteDef?.framing === 'site-biased' && focus) {
      return {
        x: x * 0.75 + focus.x * 0.25,
        z: z * 0.75 + focus.z * 0.25,
        height: this.game.siteDef.cameraHeight + 10,
      };
    }
    if (this.game.siteDef?.framing === 'site' && focus) {
      return { x: focus.x, z: focus.z, height: this.game.siteDef.cameraHeight };
    }
    return { x, z, height: this.game.siteDef?.cameraHeight };
  }

  frameAuthoredSite(x: number, z: number): void {
    const framing = this.missionFraming(x, z);
    this.game.camera.moveTo(framing.x, framing.z, true);
    if (framing.height) this.game.camera.setHeight(framing.height);
  }

  spawnLandmark(): void {
    const id = this.game.mapProfile.landmark;
    if (!id) return;
    const def = LANDMARKS[id as keyof typeof LANDMARKS];
    const civ = getCiv(def.civ);
    const era = getPeriod(def.period).level;
    const ctx: BuildContext = {
      era,
      civ,
      playerColor: new THREE.Color(civ.colors.primary),
      arch: archProfileFor(civ.id, era),
    };
    const size = this.game.settings.mapSize;
    const rng = new RNG(this.game.settings.mapSeed * 131 + 11);
    const LANDMARK_CLEAR_RADIUS = 9;
    const clearOf = (px: number, pz: number, radius: number): boolean => {
      for (const b of this.game.buildings.values()) if (Math.hypot(b.pos.x - px, b.pos.z - pz) < radius) return false;
      for (const n of this.game.resourceNodes.values())
        if (Math.hypot(n.pos.x - px, n.pos.z - pz) < radius) return false;
      return true;
    };
    // The landmark footprint (Caral ~14 x 16, others ~12 x 16) must sit on a
    // broad, gentle pad, not on a cliff edge where its platform would clip.
    const footprintClear = (px: number, pz: number, radius = LANDMARK_CLEAR_RADIUS): boolean => {
      const h0 = this.game.terrain.getHeight(px, pz);
      if (this.game.terrain.isWater(px, pz) || this.game.terrain.isBeach(px, pz)) return false;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        for (const r of [4, radius]) {
          const x = px + Math.cos(a) * r;
          const z = pz + Math.sin(a) * r;
          if (this.game.terrain.isWater(x, z) || this.game.terrain.isBeach(x, z)) return false;
          if (Math.abs(this.game.terrain.getHeight(x, z) - h0) > 1.1) return false;
          if (this.game.terrain.getSlope(x, z) > 0.45) return false;
        }
      }
      return true;
    };
    const placeSetpiece = (radius: number): { x: number; z: number } | null => {
      const margin = radius + 4;
      for (let i = 0; i < 240; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(26, 36);
        const px = x + Math.cos(a) * r;
        const pz = z + Math.sin(a) * r;
        if (px < margin || px > size - margin || pz < margin || pz > size - margin) continue;
        if (!footprintClear(px, pz, radius)) continue;
        if (!clearOf(px, pz, radius + 2)) continue;
        return { x: px, z: pz };
      }
      return null;
    };
    let x = size / 2;
    let z = size / 2;
    let found = false;
    if (this.game.setpiecePlan) {
      x = this.game.setpiecePlan.mainPyramid.x;
      z = this.game.setpiecePlan.mainPyramid.z;
      found = true;
    }
    if (!found) {
      for (let i = 0; i < 140; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(0.22, 0.34) * size;
        const px = size / 2 + Math.cos(a) * r;
        const pz = size / 2 + Math.sin(a) * r;
        if (!footprintClear(px, pz)) continue;
        if (!clearOf(px, pz, LANDMARK_CLEAR_RADIUS)) continue;
        x = px;
        z = pz;
        found = true;
        break;
      }
    }
    if (!found) {
      const safe = this.game.findLandNear(size / 2, size / 2, Math.floor(size * 0.42));
      x = safe.x;
      z = safe.z;
    }
    const scenery = def.scenery;
    if (scenery) {
      const placeholder = new THREE.Group();
      placeholder.name = 'landmark';
      placeholder.position.set(x, this.landmarkPadHeight(x, z, scenery.padRadius) + 0.02, z);
      this.game.landmark = placeholder;
      this.game.landmarkOwnsStatic = true;
      this.game.scene.add(placeholder);
      const token = ++this.game.landmarkLoadToken;
      const mainRotation = this.game.setpiecePlan ? this.game.setpiecePlan.mainPyramid.yaw : rng.range(0, Math.PI * 2);
      void loadSceneryModel(scenery.model)
        .then((model) => {
          model.name = scenery.model;
          model.rotation.y = mainRotation;
          if (!this.attachScenery(placeholder, placeholder, model, token, undefined, scenery.model)) return;
          const pad = this.createLandmarkPad(scenery.padRadius, 'caral_landmark_pad');
          placeholder.add(pad);
          applyFowToObject(pad, this.game.fowUniforms);
        })
        .catch((error: unknown) => {
          console.warn('[landmark] failed to load Caral scenery; using procedural fallback', error);
          if (token !== this.game.landmarkLoadToken || this.game.landmark !== placeholder) return;
          this.game.landmarkLoadToken++;
          this.game.setpieceLoadToken++;
          this.clearLandmarkScenery(placeholder);
          const fallback = buildLandmarkModel(id, ctx);
          fallback.name = 'caral_ceremonial_fallback';
          fallback.rotation.y = mainRotation;
          this.enableLandmarkShadows(fallback);
          placeholder.add(fallback);
          applyFowToObject(fallback, this.game.fowUniforms);
          this.game.landmarkOwnsStatic = false;
          this.buildSacredCity(this.game.setpiecePlan);
        });
      const moduleToken = ++this.game.setpieceLoadToken;
      for (const setpiece of scenery.setpieces ?? []) {
        const planned = setpiece.placement
          ? this.game.setpiecePlan?.placements.find(
              (placement: { name?: string; modularAnchor?: boolean }) => placement.name === setpiece.placement,
            )
          : this.game.setpiecePlan?.placements.find(
              (placement: { name?: string; modularAnchor?: boolean }) => placement.modularAnchor,
            );
        const site = planned ?? placeSetpiece(setpiece.padRadius);
        if (!site || (this.game.setpiecePlan && setpiece.placement && !planned)) {
          console.warn(`[landmark] missing authored setpiece site for ${setpiece.model}`);
          this.fallbackSetpieces(placeholder);
          break;
        }
        const group = new THREE.Group();
        group.name = 'landmark_setpiece';
        group.position.set(
          site.x - x,
          this.landmarkPadHeight(site.x, site.z, setpiecePadRadius(setpiece)) + 0.02 - placeholder.position.y,
          site.z - z,
        );
        const rotation = planned?.yaw ?? rng.range(0, Math.PI * 2);
        group.rotation.y = rotation;
        placeholder.add(group);
        applyFowToObject(group, this.game.fowUniforms);
        void loadSceneryModel(setpiece.model)
          .then((model) => {
            model.name = setpiece.model;
            if (!this.attachScenery(placeholder, group, model, token, moduleToken, setpiece.model)) return;
            if (setpiece.platform === false) return;
            const pad = this.createLandmarkPad(setpiece.padRadius, 'caral_landmark_setpiece_pad', setpiece.padSize);
            group.add(pad);
            applyFowToObject(pad, this.game.fowUniforms);
          })
          .catch((error: unknown) => {
            console.warn(`[landmark] failed to load setpiece ${setpiece.model}; using procedural city`, error);
            if (token !== this.game.landmarkLoadToken || moduleToken !== this.game.setpieceLoadToken) return;
            this.fallbackSetpieces(placeholder);
          });
      }
      return;
    }
    const model = buildLandmarkModel(id, ctx);
    model.position.set(x, this.game.terrain.getHeight(x, z), z);
    model.rotation.y = this.game.setpiecePlan ? this.game.setpiecePlan.mainPyramid.yaw : rng.range(0, Math.PI * 2);
    model.name = 'landmark';
    this.enableLandmarkShadows(model);
    this.game.landmark = model;
    applyFowToObject(model, this.game.fowUniforms);
    this.game.scene.add(model);
  }

  attachScenery(
    placeholder: THREE.Group,
    parent: THREE.Object3D,
    model: THREE.Group,
    token: number,
    setpieceToken?: number,
    heritageId?: string,
  ): boolean {
    if (
      token !== this.game.landmarkLoadToken ||
      (setpieceToken !== undefined && setpieceToken !== this.game.setpieceLoadToken) ||
      this.game.landmark !== placeholder
    ) {
      disposeStaticGltf(model);
      return false;
    }
    if (heritageId) model.userData.heritageId = heritageId;
    parent.add(model);
    applyFowToObject(model, this.game.fowUniforms);
    return true;
  }

  clearLandmarkScenery(placeholder: THREE.Group): void {
    for (const child of [...placeholder.children]) {
      placeholder.remove(child);
      disposeStaticGltf(child);
    }
  }

  clearLandmarkSetpieces(placeholder: THREE.Group): void {
    for (const child of [...placeholder.children]) {
      if (child.name !== 'landmark_setpiece') continue;
      placeholder.remove(child);
      disposeStaticGltf(child);
    }
  }

  fallbackSetpieces(placeholder: THREE.Group): void {
    if (this.game.landmark !== placeholder) return;
    this.game.setpieceLoadToken++;
    this.clearLandmarkSetpieces(placeholder);
    this.buildSacredCity(this.game.setpiecePlan);
  }

  enableLandmarkShadows(root: THREE.Object3D): void {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
  }

  landmarkPadHeight(x: number, z: number, radius: number): number {
    let height = this.game.terrain.getHeight(x, z);
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2;
      for (const r of [radius * 0.5, radius]) {
        height = Math.max(height, this.game.terrain.getHeight(x + Math.cos(angle) * r, z + Math.sin(angle) * r));
      }
    }
    return height;
  }

  createLandmarkPad(radius: number, name: string, size?: PadSize): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 1, metalness: 0 });
    let pad: THREE.Mesh;
    if (size) {
      const topX = size.x / 2;
      const topZ = size.z / 2;
      const bottomX = topX + 3;
      const bottomZ = topZ + 3;
      const vertices = new Float32Array([
        -topX,
        1.5,
        -topZ,
        topX,
        1.5,
        -topZ,
        topX,
        1.5,
        topZ,
        -topX,
        1.5,
        topZ,
        -bottomX,
        -1.5,
        -bottomZ,
        bottomX,
        -1.5,
        -bottomZ,
        bottomX,
        -1.5,
        bottomZ,
        -bottomX,
        -1.5,
        bottomZ,
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex([0, 3, 2, 0, 2, 1, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
      geometry.computeVertexNormals();
      material.side = THREE.DoubleSide;
      material.flatShading = true;
      pad = new THREE.Mesh(geometry, material);
      pad.name = name;
      pad.position.y = -1.52;
      pad.receiveShadow = true;
      pad.userData.padSize = { ...size };
      pad.userData.padHeight = 3;
      return pad;
    }
    pad = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 2, 2.2, 32), material);
    pad.name = name;
    pad.position.y = -1.12;
    pad.receiveShadow = true;
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.2, radius + 0.1, 32),
      new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
    );
    rim.name = `${name}_rim`;
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = -0.005;
    rim.receiveShadow = true;
    pad.add(rim);
    return pad;
  }

  /**
   * Build the visual-only city plan (Caral Alto and Caral Bajo). The Great
   * Pyramid is already the map landmark; this layer adds the other five
   * pyramids, plazas, residential compounds and lower-half temples.
   */
  spawnSacredCity(): void {
    if (!this.game.setpiecePlan) return;
    this.buildSacredCity({
      ...this.game.setpiecePlan,
      placements: this.game.setpiecePlan.placements.filter(
        (placement: { modularReplaced?: boolean }) => !placement.modularReplaced,
      ),
    });
  }

  buildSacredCity(plan: CaralCityPlan | null): void {
    if (!plan) return;
    this.game.setpiece?.dispose();
    this.game.setpiece = new SacredCity(this.game.makeBuildContext(0), plan, this.game.terrain);
    this.game.setpiece.group.userData.proceduralLower = plan === this.game.setpiecePlan;
    this.game.setpiece.group.userData.placements = plan.placements.map((placement) => placement.name ?? placement.kind);
    applyFowToObject(this.game.setpiece.group, this.game.fowUniforms);
    this.game.scene.add(this.game.setpiece.group);
  }

  /**
   * Place the map's cultural landscape (roads, fields, plazas, canals; visual
   * only, deterministic). Derived from `seed + profile`, so it is regenerated on
   * load and never saved (like the terrain and the landmark).
   */
  spawnMissionDecor(): void {
    const decor = this.game.missionLayout?.decor;
    if (!decor) return;
    const owner = decor.at === 'enemy' ? 1 : 0;
    const center = [...this.game.buildings.values()].find(
      (b) => b.owner === owner && b.kind === BuildingKind.CENTER && !b.dead,
    );
    if (!center) return;
    const x = center.pos.x + decor.dx;
    const z = center.pos.z + decor.dz;
    const site = this.game.findLandNear(x, z, 18);
    const group = new THREE.Group();
    group.name = `mission_decor_${decor.model}`;
    group.position.set(site.x, this.game.terrain.getHeight(site.x, site.z), site.z);
    group.rotation.y = decor.yaw ?? 0;
    group.scale.setScalar(decor.scale ?? 1);
    if (decor.glb) group.userData.authoredGlb = decor.glb;
    this.game.scene.add(group);
    this.game.scenarioDecor = group;
    if (decor.glb) {
      void loadDecorModel(decor.glb)
        .then((model) => {
          if (this.game.scenarioDecor !== group) return;
          model.name = decor.glb!;
          group.add(model);
          this.enableLandmarkShadows(model);
          applyFowToObject(model, this.game.fowUniforms);
        })
        .catch((error: unknown) => {
          console.warn(`[decor] failed to load ${decor.glb}; using procedural fallback`, error);
          if (this.game.scenarioDecor !== group) return;
          const fallback = buildLandmarkModel(decor.model, this.game.makeBuildContext(owner));
          group.add(fallback);
          this.enableLandmarkShadows(fallback);
          applyFowToObject(fallback, this.game.fowUniforms);
        });
    } else {
      const model = buildLandmarkModel(decor.model, this.game.makeBuildContext(owner));
      group.add(model);
      this.enableLandmarkShadows(model);
      applyFowToObject(model, this.game.fowUniforms);
    }
  }

  spawnCanal(): void {
    const spec = this.game.missionLayout?.canal;
    if (!spec || !this.game.canalSite) return;
    const group = new THREE.Group();
    group.name = 'canal';
    if (spec.heritageId) group.userData.heritageId = spec.heritageId;
    const length = spec.length ?? 24;
    group.position.set(
      this.game.canalSite.x,
      this.game.terrain.getHeight(this.game.canalSite.x, this.game.canalSite.z),
      this.game.canalSite.z,
    );
    group.rotation.y = spec.yaw ?? 0;
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.12, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x2f6f7a, roughness: 0.45, metalness: 0.1 }),
    );
    water.name = 'canal_water';
    water.position.y = 0.08;
    water.receiveShadow = true;
    group.add(water);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x9a8460, roughness: 1, metalness: 0 });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.7, 0.5), wallMaterial);
      wall.name = 'canal_bank';
      wall.position.set(0, 0.35, side * 1.35);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }
    const gate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 3.2), wallMaterial);
    gate.name = 'canal_gate';
    gate.position.set(length / 2, 0.8, 0);
    gate.castShadow = true;
    gate.receiveShadow = true;
    group.add(gate);
    this.game.canalGate = gate;
    applyFowToObject(group, this.game.fowUniforms);
    this.game.scene.add(group);
    this.game.canalGroup = group;
    this.game.canalWater = water;
    this.game.updateCanalVisual();
  }

  spawnCulturalLandscape(): void {
    this.game.landscape = new CulturalLandscape(this.game.terrain, this.game.mapProfile, this.game.settings.mapSeed);
    applyFowToObject(this.game.landscape.group, this.game.fowUniforms);
    this.game.scene.add(this.game.landscape.group);
  }

  /** Keep authored city/canal footprints free of procedural resources and props. */
  spawnResources(): void {
    const s = this.game.settings;
    const rng = new RNG(this.game.settings.mapSeed * 31 + 1);
    const mapType = this.game.mapProfile.baseMapType;
    const variants = this.game.mapProfile.vegetation.variants;
    // Dense forests: a handful of tree clusters per biome instead of lone trees.
    // They also act as natural barriers, as in the reference RTS maps.
    const treeWeight = this.game.mapProfile.resources.tree;
    const clusters = Math.min(24, Math.max(6, Math.round(((s.mapSize * s.mapSize) / 1800) * (treeWeight / 0.4))));
    for (let c = 0; c < clusters; c++) {
      let cx = 0;
      let cz = 0;
      let found = false;
      for (let attempt = 0; attempt < 40 && !found; attempt++) {
        cx = rng.range(18, s.mapSize - 18);
        cz = rng.range(18, s.mapSize - 18);
        found = !this.game.terrain.isWater(cx, cz) && !this.game.isReserved(cx, cz);
      }
      if (!found) continue;
      const count = 20 + Math.floor(rng.float() * 9);
      const trees: { x: number; z: number }[] = [];
      for (let attempt = 0; attempt < count * 40 && trees.length < count; attempt++) {
        const x = cx + rng.range(-14, 14);
        const z = cz + rng.range(-14, 14);
        if (this.game.terrain.isWater(x, z) || this.game.isReserved(x, z)) continue;
        if (!this.game.pathfinder.isWalkable(x, z)) continue;
        // Tree obstacles cover a 3x3 cell block; keep 6.5 m between trunks so
        // every tree keeps a free stand point.
        if (trees.some((t) => distance2D(t.x, t.z, x, z) < 6.5)) continue;
        if (
          [...this.game.resourceNodes.values()].some(
            (n) => n.kind === 'tree' && distance2D(n.pos.x, n.pos.z, x, z) < 6.5,
          )
        )
          continue;
        trees.push({ x, z });
      }
      for (const t of trees) {
        const amount = rng.range(210, 270);
        const node = new ResourceNode('tree', t.x, t.z, amount);
        node.pos.y = this.game.terrain.getHeight(t.x, t.z);
        this.game.attachResourceNode(node, mapType, this.game.trees, variants);
        this.game.resourceNodes.set(node.id, node);
        this.game.registerResourceObstacle(node.id, t.x, t.z, 'tree');
      }
    }
    const n = Math.floor((s.mapSize * s.mapSize) / 1000);
    let placed = 0;
    let guard = 0;
    while (placed < n && guard++ < n * 4) {
      const x = rng.range(15, s.mapSize - 15);
      const z = rng.range(15, s.mapSize - 15);
      if (this.game.terrain.isWater(x, z) || this.game.isReserved(x, z) || !this.game.pathfinder.isWalkable(x, z))
        continue;
      const h = this.game.terrain.getHeight(x, z);
      const kind = this.pickResourceKind(rng, x, z, h);
      const minGap = kind === 'tree' ? 6 : 3;
      if ([...this.game.resourceNodes.values()].some((n) => distance2D(n.pos.x, n.pos.z, x, z) < minGap)) continue;
      const amount =
        kind === 'tree'
          ? rng.range(140, 220)
          : kind === 'mine'
            ? rng.range(300, 450)
            : kind === 'well'
              ? rng.range(250, 380)
              : kind === 'berry'
                ? rng.range(120, 180)
                : rng.range(200, 300);
      const node = new ResourceNode(kind, x, z, amount);
      node.pos.y = this.game.terrain.getHeight(x, z);
      this.game.attachResourceNode(node, mapType, this.game.trees, variants);
      this.game.resourceNodes.set(node.id, node);
      this.game.registerResourceObstacle(node.id, x, z, kind);
      placed++;
    }
    // hunting and fishing (counts from the profile)
    const huntCount = Math.max(0, Math.round(this.game.mapProfile.resources.hunt));
    for (let i = 0; i < huntCount; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (this.game.terrain.isWater(x, z) || this.game.isReserved(x, z)) continue;
      const node = new ResourceNode('hunt', x, z, rng.range(120, 180));
      node.pos.y = this.game.terrain.getHeight(x, z);
      this.game.attachResourceNode(node, mapType, undefined, variants);
      this.game.resourceNodes.set(node.id, node);
    }
    const fishingCount = Math.round(this.game.mapProfile.resources.fishing);
    for (let i = 0; i < fishingCount; i++) {
      const x = rng.range(20, s.mapSize - 20);
      const z = rng.range(20, s.mapSize - 20);
      if (!this.game.terrain.isWater(x, z)) continue;
      const node = new ResourceNode('fishing', x, z, rng.range(150, 220));
      node.pos.y = 0;
      this.game.attachResourceNode(node, mapType);
      this.game.resourceNodes.set(node.id, node);
    }
    // The random coastal samples can miss the few water cells near shore; a
    // scenario that depends on fishing asks for a guaranteed reachable supply.
    const mis = s.missionId ? getMission(s.missionId) : undefined;
    for (let i = 0; i < (mis?.guaranteedFishing ?? 0); i++) this.spawnFishingNearShore(rng);
  }

  /** Fill a scenario's minimum fishing supply after loading an older save. */
  ensureFishingGrounds(min: number): void {
    const have = [...this.game.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead).length;
    if (have >= min) return;
    const rng = new RNG((this.game.settings.mapSeed * 2654435761 + 97) >>> 0);
    for (let i = have; i < min; i++) this.spawnFishingNearShore(rng);
  }

  spawnFishingNearShore(rng: RNG): boolean {
    const size = this.game.settings.mapSize;
    const candidates: { x: number; z: number }[] = [];
    const existing = [...this.game.resourceNodes.values()].filter((n) => n.kind === 'fishing' && !n.dead);
    for (let x = FISHING_SCAN_MARGIN; x < size - FISHING_SCAN_MARGIN; x += 2) {
      for (let z = FISHING_SCAN_MARGIN; z < size - FISHING_SCAN_MARGIN; z += 2) {
        if (!this.game.terrain.isWater(x, z)) continue;
        if (existing.some((n) => distance2D(x, z, n.pos.x, n.pos.z) < 5)) continue;
        let nearLand = false;
        for (let i = 0; i < 8 && !nearLand; i++) {
          const a = (i / 8) * Math.PI * 2;
          nearLand = !this.game.terrain.isWater(x + Math.cos(a) * 5, z + Math.sin(a) * 5);
        }
        if (nearLand) candidates.push({ x, z });
      }
    }
    if (candidates.length === 0) return false;
    const spot = rng.pick(candidates);
    const node = new ResourceNode('fishing', spot.x, spot.z, rng.range(150, 220));
    node.pos.y = 0;
    this.game.attachResourceNode(node, this.game.mapProfile.baseMapType);
    this.game.resourceNodes.set(node.id, node);
    return true;
  }

  /**
   * Ambient life (visual only): scatter props and place fauna from the region
   * profile + seed. Deterministic and regenerated on load (not saved).
   */
  spawnAmbient(): void {
    const s = this.game.settings;
    const region = this.game.mapProfile.region;
    const heightAt = (x: number, z: number): number => this.game.terrain.getHeight(x, z);
    const propSeed = s.mapSeed * AMBIENT_PROP_SEED + 3;
    const faunaSeed = s.mapSeed * AMBIENT_FAUNA_SEED + 5;
    const query = {
      isWater: (x: number, z: number) => this.game.terrain.isWater(x, z) || this.game.isReserved(x, z),
      isBuildable: (x: number, z: number) =>
        this.game.terrain.isBuildable(x, z) && !this.game.isReserved(x, z) && !this.game.isStartReserved(x, z),
      getSlope: (x: number, z: number) => this.game.terrain.getSlope(x, z),
      getHeight: (x: number, z: number) => this.game.terrain.getHeight(x, z),
      isBeach: (x: number, z: number) => this.game.terrain.isBeach(x, z),
      getMoisture: (x: number, z: number) => this.game.terrain.getMoisture(x, z),
    };
    const propCount = propCountFor(s.mapSize);
    let placements = planProps(region, propSeed, s.mapSize, propCount, query);
    let fauna = planWildlife(region, faunaSeed, s.mapSize, faunaCountFor(region), query);
    if (this.game.siteDef?.environs?.valley === 'caral') {
      const base = this.game.caralValleyBase ?? this.game.playerCenter(0);
      const suppressedProps = new Set(this.game.siteDef.environs.suppressPropIds ?? []);
      placements = placements.filter((p) => !suppressedProps.has(p.id));
      placements.push(...planCaralValleyProps(this.game.settings.mapSeed, base, this.caralValleyQuery()));
      const suppressedFauna = new Set(this.game.siteDef.environs.suppressFaunaIds ?? []);
      fauna = fauna.filter((f) => !suppressedFauna.has(f.id));
      // Riparian deer and birds first, so the wildlife cap never drops them.
      // Keep the roosts out from under tree crowns so deer and birds stay readable from the camera.
      const valley = this.caralValleyQuery();
      const trees = [...this.game.resourceNodes.values()].filter((n) => n.kind === 'tree');
      const faunaQuery: CaralValleyQuery = {
        ...valley,
        isReserved: (x, z) =>
          valley.isReserved(x, z) || trees.some((t) => Math.hypot(t.pos.x - x, t.pos.z - z) < FAUNA_TREE_CLEARANCE),
      };
      fauna = [...planCaralValleyFauna(this.game.settings.mapSeed, base, faunaQuery), ...fauna];
    }
    this.game.props.place(placements, heightAt);
    this.game.wildlife.spawn(fauna, heightAt);
    if (!this.game.headless) void attachFaunaKit(this.game.wildlife);
  }

  /** Geography-driven resource pick: profile weights, gated by height, beach, moisture and slope. */
  pickResourceKind(rng: RNG, x: number, z: number, h: number): ResourceNode['kind'] {
    const w = this.game.mapProfile.resources;
    const beach = this.game.terrain.isBeach(x, z);
    const high = h > 6;
    const mid = h > 3;
    const moist = this.game.terrain.getMoisture(x, z);
    const slope = this.game.terrain.getSlope(x, z);
    const options: Array<[ResourceNode['kind'], number]> = [
      ['mine', w.mine * (high ? 2.5 : mid ? 1.5 : 0.5) * (0.6 + slope * 1.4)],
      ['tree', w.tree * (high ? 0.3 : 1) * (0.4 + moist)],
      ['well', w.well * (beach ? 0.05 : 0.8) * (0.6 + slope * 1.8) * (high ? 1.4 : 1)],
      ['berry', w.berry * (beach ? 1.2 : 0.7) * (0.5 + moist)],
    ];
    return weightedPick(rng, options) ?? 'tree';
  }

  /** Resolve a mission point against the player/enemy base, site, canal or landmark. */
  spawnMissionRoads(): void {
    const roads = this.game.missionLayout?.roads;
    if (!roads?.length) return;
    for (const overlay of this.game.settlements.filter((s: { group: { name: string } }) =>
      s.group.name.startsWith('mission-roads'),
    )) {
      overlay.dispose();
    }
    this.game.settlements = this.game.settlements.filter(
      (s: { group: { name: string } }) => !s.group.name.startsWith('mission-roads'),
    );
    const groups = new Map<number, typeof roads>();
    for (const road of roads as Array<{ width?: number; from: any; to: any }>) {
      const width = road.width ?? 4;
      groups.set(width, [...(groups.get(width) ?? []), road]);
    }
    let index = 0;
    for (const [width, group] of groups) {
      const plan: SettlementPlan = {
        center: this.game.siteCenter ?? this.game.playerCenter(0),
        dwellings: [],
        fields: [],
        roads: group.map((road: { from: any; to: any }) => ({
          from: this.game.resolveMissionPoint(road.from),
          to: this.game.resolveMissionPoint(road.to),
        })),
      };
      const overlay = new SettlementOverlay(plan, this.game.terrain, { roadWidth: width });
      overlay.group.name = index === 0 ? 'mission-roads' : `mission-roads-${width}`;
      applyFowToObject(overlay.group, this.game.fowUniforms);
      this.game.scene.add(overlay.group);
      this.game.settlements.push(overlay);
      this.game.excludeGroundCoverForOverlay(overlay);
      index++;
    }
  }

  /** Register a building as a pathfinding obstacle. */
  addSettlementOverlay(plan: SettlementPlan): void {
    if (this.game.headless) return;
    const overlay = new SettlementOverlay(plan, this.game.terrain);
    applyFowToObject(overlay.group, this.game.fowUniforms);
    this.game.scene.add(overlay.group);
    this.game.settlements.push(overlay);
    this.game.excludeGroundCoverForOverlay(overlay);
  }

  /** Household/ritual props around a base (visual only, deterministic, no obstacles). */
  addSettlementDressing(plan: SettlementPlan, player: number, profile: 'caral' | 'chavin'): void {
    if (this.game.headless) return;
    const placements = planSettlementDressing(
      plan,
      this.game.settings.mapSeed * 977 + player * 31 + 7,
      this.game.terrain,
      profile,
    );
    const dressing = new SettlementDressing(placements, (x, z) => this.game.terrain.getHeight(x, z));
    applyFowToObject(dressing.group, this.game.fowUniforms);
    this.game.scene.add(dressing.group);
    this.game.settlementDressing.push(dressing);
  }

  caralValleyQuery(): CaralValleyQuery {
    return {
      isWater: (px, pz) => this.game.terrain.isWater(px, pz),
      isBuildable: (px, pz) => this.game.terrain.isBuildable(px, pz),
      getSlope: (px, pz) => this.game.terrain.getSlope(px, pz),
      isReserved: (px, pz) => this.game.isReserved(px, pz),
    };
  }

  planCaralValleyAt(x: number, z: number): CaralValleyPlan {
    return planCaralValley(
      this.game.settings.mapSeed * 97 + 31,
      { x, z },
      this.caralValleyQuery(),
      this.caralValleySiteTarget() ?? undefined,
    );
  }

  /** Open ground just west of the Anfiteatro, derived from the authored proxy. */
  caralValleySiteTarget(): { x: number; z: number } | null {
    const anf = this.game.siteDef?.heritageProxies.find(
      (p: { id: string; x: number; w: number; z: number }) => p.id === 'caral_anfiteatro',
    );
    return anf ? { x: anf.x - anf.w / 2 - 4, z: anf.z } : null;
  }

  /** Visual-only riverside fields and paths; no entities, obstacles or yields. */
  addCaralValley(x: number, z: number): void {
    if (this.game.headless) return;
    const valley = this.game.caralValleyPlan ?? this.planCaralValleyAt(x, z);
    this.game.caralValleyPlan = valley;
    this.game.caralValleyBase ??= { x, z };
    if (!valley.fields.length && !valley.roads.length) return;
    const overlay = new SettlementOverlay(
      { center: { x, z }, dwellings: [], fields: valley.fields, roads: valley.roads },
      this.game.terrain,
      { roadWidth: CARAL_VALLEY_PATH_WIDTH, fieldBorders: true },
    );
    overlay.group.name = 'caral-valley';
    applyFowToObject(overlay.group, this.game.fowUniforms);
    this.game.scene.add(overlay.group);
    this.game.settlements.push(overlay);
    this.game.excludeGroundCoverForOverlay(overlay);
  }
}
