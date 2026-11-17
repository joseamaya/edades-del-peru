import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isKnownPhase, phaseOrder, standsAt, type SitePhasePlan } from '../model/defs/sitePhases';
import {
  TAMBOTOCO_CAVE,
  TAMBOTOCO_BRIDGES,
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_FIELDS,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_PATHS,
  TAMBOTOCO_PLAZA_RADIUS,
  TAMBOTOCO_SHRINE,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_TERRACES,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../model/defs/tambotocoLayout';
import {
  ageSurface,
  aylluHut,
  canchaPlot,
  caveMouth,
  pavedPlaza,
  retainingTerrace,
  shrinePlatform,
  shrineStone,
  stoneBridge,
  stonePath,
  surfaceDetail,
  terracedField,
  villageDressing,
  villagers,
  type Parts,
  type SurfaceFamily,
} from './aylluKit';
import type { Particles } from './Particles';
import { disposeStaticGltf } from './StaticModel';
import type { TambotocoHeroAssets, TambotocoHeroModel } from './tambotocoHeroKit';

const PHASE_CAVE = 'cave';
const PHASE_SHRINE = 'huanacaure';
const PHASE_INTICANCHA = 'inticancha';
const PHASE_FOUNDED = 'fundada';

/** Families without a generated detail map; they also drop out at strategic zoom. */
const NO_DETAIL_FAMILIES: ReadonlySet<SurfaceFamily> = new Set(['crops', 'cropsWet', 'people']);

/** Surface families that add nothing readable to the shadow silhouette (see `addPhase`). */
const NO_SHADOW_FAMILIES: ReadonlySet<SurfaceFamily> = new Set(['crops', 'cropsWet', 'people', 'wood']);
/** The late Inticancha phases also drop plaster, earth and loose rock to stay inside the 360-call cap. */
const NO_SHADOW_FAMILIES_LATE: ReadonlySet<SurfaceFamily> = new Set([
  ...NO_SHADOW_FAMILIES,
  'earth',
  'rock',
  'plaster',
]);

interface LifeSource {
  readonly x: number;
  readonly z: number;
  readonly y: number;
  readonly phase: string;
  readonly kind: 'smoke' | 'fire';
}

interface PhaseGroup {
  readonly phase: string;
  readonly group: THREE.Group;
}

/**
 * The ayllu world of the Tambotoco mission: the cave mouth, the Huanacaure shrine, three valley
 * hamlets and the planned Inticancha. The pieces come from `aylluKit`, which samples the terrain for
 * every plinth, terrace and field; positions live in `model/defs/tambotocoLayout.ts`.
 * Presentation only: the static geometry is merged per phase and the life particles are emitted
 * from `Game.updateCityLife`.
 */
export class AylluSite {
  readonly group = new THREE.Group();
  private readonly phases: PhaseGroup[] = [];
  private readonly life: LifeSource[] = [];
  private readonly materials = new Map<SurfaceFamily, THREE.MeshStandardMaterial>();
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly heroRoot = new THREE.Group();
  private readonly caveFallback = new THREE.Group();
  private readonly huacaFallback = new THREE.Group();
  private readonly caveHero = new THREE.Group();
  private readonly huacaHero = new THREE.Group();
  private readonly heroLods: { lod0: THREE.Group; lod1: THREE.Group }[] = [];
  private readonly heroObjects: THREE.Object3D[] = [];
  private phase = PHASE_CAVE;
  private detailVisible = true;
  private heroNear = true;
  private caveLoaded = false;
  private huacaLoaded = false;
  private huacaBase = 0;

  constructor(
    parent: THREE.Object3D,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly baseY: number,
    private readonly plan: SitePhasePlan,
  ) {
    this.group.name = 'ayllu_site';
    parent.add(this.group);
    this.heroRoot.name = 'ayllu_hero';
    this.caveFallback.name = 'ayllu_hero_cave_fallback';
    this.huacaFallback.name = 'ayllu_hero_huaca_fallback';
    this.caveHero.name = 'ayllu_hero_cave_glb';
    this.huacaHero.name = 'ayllu_hero_huaca_glb';
    this.heroRoot.add(this.caveFallback, this.huacaFallback, this.caveHero, this.huacaHero);
    this.group.add(this.heroRoot);
    this.group.userData.heroesReady = false;
    const ground = (x: number, z: number): number => this.heightAt(x, z) - baseY;

    const caveParts: Parts = [];
    const caveHero: Parts = [];
    caveMouth(caveHero, TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z, ground);
    this.addHeroParts('cave', caveHero);
    // No huts at the cave: the Ayar leave it with nothing built, and their workers raise the first camp.
    for (const dx of [-2.4, 2.4]) {
      this.life.push({
        x: TAMBOTOCO_CAVE.x + dx,
        z: TAMBOTOCO_CAVE.z + 2.6,
        y: this.heightAt(TAMBOTOCO_CAVE.x + dx, TAMBOTOCO_CAVE.z + 2.6) + 0.8,
        phase: PHASE_CAVE,
        kind: 'fire',
      });
    }
    this.life.push({
      x: TAMBOTOCO_CAVE.x,
      z: TAMBOTOCO_CAVE.z + 1.2,
      y: this.heightAt(TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z + 1.2) + 5.6,
      phase: PHASE_CAVE,
      kind: 'smoke',
    });
    const platformTop = shrinePlatform(caveParts, TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z, ground);
    villagers(caveParts, TAMBOTOCO_SHRINE.x - 1.8, platformTop, TAMBOTOCO_SHRINE.z + 1.8, 2);
    for (const h of TAMBOTOCO_SHRINE_HUTS) this.hut(caveParts, h, ground, PHASE_CAVE);
    for (const village of TAMBOTOCO_VILLAGES) {
      for (const h of village.huts) this.hut(caveParts, h, ground, PHASE_CAVE);
      const yard = villageDressing(caveParts, village.x, village.z, ground, 'village');
      villagers(caveParts, village.x, yard, village.z, 2);
      terracedField(caveParts, village.field, ground);
    }
    for (const path of TAMBOTOCO_PATHS.filter((p) => p.since === 'cave')) stonePath(caveParts, path, ground);
    for (const bridge of TAMBOTOCO_BRIDGES) stoneBridge(caveParts, bridge, ground);
    this.addPhase(PHASE_CAVE, caveParts);

    // The huaca stone appears with the pilgrimage's arrival: the phase is the deed, not a label.
    const shrineParts: Parts = [];
    shrineStone(shrineParts, TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z, platformTop);
    this.huacaBase = platformTop;
    this.addHeroParts('huaca', shrineParts);
    this.life.push({
      x: TAMBOTOCO_SHRINE.x,
      z: TAMBOTOCO_SHRINE.z - 1.8,
      y: this.heightAt(TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z - 1.8) + 3.3,
      phase: PHASE_SHRINE,
      kind: 'fire',
    });

    // Inticancha in two steps. Act IV only traces it (paved plaza, altar and the four cancha plots) for
    // the player's store and houses; the living settlement (houses, terraces, fields, people, fire)
    // appears once the four canchas stand, never before the ayllus have built anything.
    const plaza = TAMBOTOCO_INTICANCHA;
    const inticancha: Parts = [];
    pavedPlaza(inticancha, plaza.x, plaza.z, TAMBOTOCO_PLAZA_RADIUS, ground);
    const plazaPath = TAMBOTOCO_PATHS.find((p) => p.since === 'inticancha');
    if (plazaPath) stonePath(inticancha, plazaPath, ground);
    for (const cancha of TAMBOTOCO_CANCHAS) {
      canchaPlot(inticancha, cancha.dx, cancha.dz, plaza, ground);
    }
    this.addPhase(PHASE_INTICANCHA, inticancha, false);

    const founded: Parts = [];
    for (const terrace of TAMBOTOCO_TERRACES) retainingTerrace(founded, terrace, ground);
    for (const f of TAMBOTOCO_FIELDS) terracedField(founded, f, ground);
    for (const h of TAMBOTOCO_INTICANCHA_HUTS) this.hut(founded, h, ground, PHASE_FOUNDED);
    villageDressing(
      founded,
      plaza.x - 6.4,
      plaza.z + 4.4,
      ground,
      'village',
      false,
      ground(plaza.x - 6.4, plaza.z + 4.4),
    );
    villagers(founded, plaza.x, ground(plaza.x, plaza.z - 4), plaza.z - 4, 3);
    villagers(founded, plaza.x + 3, ground(plaza.x + 3, plaza.z + 3.5), plaza.z + 3.5, 2);
    this.life.push({
      x: plaza.x,
      z: plaza.z - 5,
      y: this.baseY + ground(plaza.x, plaza.z - 5) + 1.4,
      phase: PHASE_FOUNDED,
      kind: 'fire',
    });
    this.addPhase(PHASE_FOUNDED, founded);

    this.setPhase(this.plan.initial);
  }

  /** Draw one authored hut and register its smoke at the roof apex the kit reports. */
  private hut(parts: Parts, h: AylluHut, ground: (x: number, z: number) => number, phase: string): void {
    const { top } = aylluHut(parts, h, ground);
    if (!h.smoke) return;
    this.life.push({
      x: h.x,
      z: h.z,
      y: this.baseY + top + 0.3,
      phase,
      kind: 'smoke',
    });
  }

  /** One material per surface family; the generated detail set breaks the flat faces. */
  private materialFor(family: SurfaceFamily): THREE.MeshStandardMaterial {
    let material = this.materials.get(family);
    if (material) return material;
    const detail = surfaceDetail(family);
    const textured = !NO_DETAIL_FAMILIES.has(family);
    material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: detail.roughness,
      metalness: 0,
      map: textured ? detail.map : null,
      normalMap: textured ? detail.normalMap : null,
      normalScale: new THREE.Vector2(detail.normalScale, detail.normalScale),
    });
    this.materials.set(family, material);
    return material;
  }

  /** One group per phase; the meshes inside are split by place so frustum culling can drop them. */
  private phaseGroup(phase: string): THREE.Group {
    const existing = this.phases.find((entry) => entry.phase === phase);
    if (existing) return existing.group;
    const group = new THREE.Group();
    group.name = `ayllu:${phase}`;
    this.group.add(group);
    this.phases.push({ phase, group });
    return group;
  }

  /**
   * Merge one place of one phase per surface family. A single merged mesh per phase had a bounding
   * box across the whole 256 m site, so the cave drew the valley hamlets and the shadow pass with it.
   */
  private addPhase(phase: string, parts: Parts, castShadow = true): void {
    if (!parts.length) return;
    // Crops, villagers and wood add nothing to the shadow silhouette. The late Inticancha phases
    // also drop plaster/earth/rock; the cave and shrine keep their rock and earth shadows.
    const noShadow =
      phase === PHASE_INTICANCHA || phase === PHASE_FOUNDED ? NO_SHADOW_FAMILIES_LATE : NO_SHADOW_FAMILIES;
    this.addMergedParts(this.phaseGroup(phase), `ayllu:${phase}`, parts, castShadow, noShadow);
  }

  /** Build the procedural cave/huaca fallback; `setHeroAssets` hides it when the GLB arrives. */
  private addHeroParts(kind: 'cave' | 'huaca', parts: Parts): void {
    const group = kind === 'cave' ? this.caveFallback : this.huacaFallback;
    this.addMergedParts(group, `ayllu:hero:${kind}`, parts, true, NO_SHADOW_FAMILIES);
  }

  private addMergedParts(
    group: THREE.Group,
    name: string,
    parts: Parts,
    castShadow: boolean,
    noShadow: ReadonlySet<SurfaceFamily>,
  ): void {
    const byFamily = new Map<SurfaceFamily, THREE.BufferGeometry[]>();
    for (const geometry of parts) {
      const family = (geometry.userData.surface as SurfaceFamily | undefined) ?? 'stone';
      const bucket = byFamily.get(family);
      if (bucket) bucket.push(geometry);
      else byFamily.set(family, [geometry]);
    }
    for (const [family, geometries] of byFamily) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!merged) continue;
      // Bake contact AO and macro colour variation into the merged surface: a single material and
      // draw call per family, but the wall bases, roof edges and paved floors stop reading flat.
      // The ground callback is essential: the site uses absolute terrain heights, so a fixed Y would
      // never find the footing on the Pacaritambo slope.
      if (!NO_DETAIL_FAMILIES.has(family)) {
        ageSurface(merged, (x, z) => this.heightAt(x, z) - this.baseY);
      }
      const mesh = new THREE.Mesh(merged, this.materialFor(family));
      mesh.name = `${name}:${family}`;
      mesh.userData.family = family;
      mesh.castShadow = castShadow && !noShadow.has(family);
      mesh.receiveShadow = true;
      group.add(mesh);
      this.geometries.push(merged);
    }
  }

  /** Strategic-zoom LOD: the tiny crop rows and static villagers vanish before the site reads as a blob. */
  updateLod(zoom: number): void {
    const near = zoom < 70;
    if (near !== this.heroNear) {
      this.heroNear = near;
      for (const lod of this.heroLods) {
        lod.lod0.visible = near;
        lod.lod1.visible = !near;
      }
    }
    const detail = zoom < 82;
    if (detail === this.detailVisible) return;
    this.detailVisible = detail;
    for (const phase of this.phases) {
      for (const child of phase.group.children) {
        const family = child.userData.family as SurfaceFamily | undefined;
        if (family && NO_DETAIL_FAMILIES.has(family)) child.visible = detail;
      }
    }
  }

  /**
   * Replace the procedural cave/huaca with the loaded GLB. Both LODs must arrive; a missing pair
   * leaves the fallback visible, so the opening never loses its cave.
   */
  setHeroAssets(assets: TambotocoHeroAssets): void {
    if (assets.cave) {
      this.caveLoaded = true;
      this.addHeroModel(
        this.caveHero,
        assets.cave,
        TAMBOTOCO_CAVE.x,
        TAMBOTOCO_CAVE.z,
        this.heightAt(TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z) - this.baseY,
      );
    }
    if (assets.huaca) {
      this.huacaLoaded = true;
      this.addHeroModel(this.huacaHero, assets.huaca, TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z, this.huacaBase);
    }
    this.group.userData.heroesReady = true;
    this.setPhase(this.phase);
  }

  private addHeroModel(parent: THREE.Group, model: TambotocoHeroModel, x: number, z: number, y: number): void {
    const wrapper = new THREE.Group();
    wrapper.position.set(x, y, z);
    wrapper.add(model.lod0, model.lod1);
    model.lod0.visible = this.heroNear;
    model.lod1.visible = !this.heroNear;
    this.heroLods.push({ lod0: model.lod0, lod1: model.lod1 });
    this.heroObjects.push(model.lod0, model.lod1);
    parent.add(wrapper);
  }

  /** Show the pieces whose phase has been reached; the order is the site plan's, not the engine's. */
  setPhase(phase: string): void {
    this.phase = isKnownPhase(this.plan, phase) ? phase : this.plan.initial;
    for (const entry of this.phases) {
      entry.group.visible = phaseOrder(this.plan, entry.phase) <= phaseOrder(this.plan, this.phase);
    }
    const huacaVisible = standsAt(PHASE_SHRINE, this.phase, this.plan);
    this.caveFallback.visible = !this.caveLoaded;
    this.caveHero.visible = this.caveLoaded;
    this.huacaFallback.visible = !this.huacaLoaded && huacaVisible;
    this.huacaHero.visible = this.huacaLoaded && huacaVisible;
  }

  /**
   * Emit one cooking puff or altar flame near the camera, round-robin. Called from `Game.updateCityLife`
   * (the same presentation path as Caral), so the site inherits its distance cap and quiet phases.
   */
  updateLife(
    focus: { x: number; z: number },
    particles: Particles,
    lifeTurn: number,
    visibleAt: (x: number, z: number) => boolean,
  ): void {
    const nearby = this.life.filter(
      (s) =>
        phaseOrder(this.plan, s.phase) <= phaseOrder(this.plan, this.phase) &&
        Math.hypot(s.x - focus.x, s.z - focus.z) < 55 &&
        visibleAt(s.x, s.z),
    );
    if (!nearby.length) return;
    const emit = (source: LifeSource, count: number): void => {
      particles.emit({
        x: source.x,
        y: source.y,
        z: source.z,
        count,
        color: source.kind === 'fire' ? 0xff8a2a : 0x9a9488,
        kind: source.kind,
        speed: source.kind === 'fire' ? 0.45 : 0.7,
        life: source.kind === 'fire' ? 0.8 : 4,
        size: source.kind === 'fire' ? 0.5 : 0.7,
        grow: source.kind === 'fire' ? 1 : 1.3,
        spread: source.kind === 'fire' ? 0.3 : 0.5,
      });
    };
    // Every nearby altar burns; two huts smoke per tick so the hamlet reads alive from the camera.
    for (const source of nearby) if (source.kind === 'fire') emit(source, 1);
    const smokes = nearby.filter((s) => s.kind === 'smoke');
    if (smokes.length) {
      emit(smokes[lifeTurn % smokes.length]!, 1);
      emit(smokes[(lifeTurn + 1) % smokes.length]!, 1);
    }
  }

  /** Show the canal's effect on the crops: a visible wet-green shift when the acequia is flowing. */
  setIrrigated(wet: boolean): void {
    const crops = this.materials.get('cropsWet');
    if (crops) crops.color.setHex(wet ? 0xd8f0c4 : 0xffffff);
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const object of this.heroObjects) disposeStaticGltf(object);
    this.heroObjects.length = 0;
    this.heroLods.length = 0;
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
  }
}
