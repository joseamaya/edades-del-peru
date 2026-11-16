import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isKnownPhase, phaseOrder, type SitePhasePlan } from '../model/defs/sitePhases';
import {
  TAMBOTOCO_CAVE,
  TAMBOTOCO_CANCHAS,
  TAMBOTOCO_FIELDS,
  TAMBOTOCO_INTICANCHA,
  TAMBOTOCO_INTICANCHA_HUTS,
  TAMBOTOCO_PLAZA_RADIUS,
  TAMBOTOCO_SHRINE,
  TAMBOTOCO_SHRINE_HUTS,
  TAMBOTOCO_TERRACES,
  TAMBOTOCO_VILLAGES,
  type AylluHut,
} from '../model/defs/tambotocoLayout';
import {
  aylluHut,
  aylluSurfaceTextures,
  canchaPlot,
  caveMouth,
  pavedPlaza,
  retainingTerrace,
  shrinePlatform,
  shrineStone,
  terracedField,
  villageDressing,
  villagers,
  type Parts,
} from './aylluKit';
import type { Particles } from './Particles';

const PHASE_CAVE = 'cave';
const PHASE_SHRINE = 'huanacaure';
const PHASE_INTICANCHA = 'inticancha';
const PHASE_FOUNDED = 'fundada';

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
  private readonly material: THREE.MeshStandardMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];
  private phase = PHASE_CAVE;

  constructor(
    parent: THREE.Object3D,
    private readonly heightAt: (x: number, z: number) => number,
    private readonly baseY: number,
    private readonly plan: SitePhasePlan,
  ) {
    this.group.name = 'ayllu_site';
    parent.add(this.group);
    this.material = this.createMaterial();
    const ground = (x: number, z: number): number => this.heightAt(x, z) - baseY;

    const caveParts: Parts = [];
    caveMouth(caveParts, TAMBOTOCO_CAVE.x, TAMBOTOCO_CAVE.z, ground);
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
    this.addPhase(PHASE_CAVE, caveParts);

    // The huaca stone appears with the pilgrimage's arrival: the phase is the deed, not a label.
    const shrineParts: Parts = [];
    shrineStone(shrineParts, TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z, platformTop);
    this.life.push({
      x: TAMBOTOCO_SHRINE.x,
      z: TAMBOTOCO_SHRINE.z - 1.8,
      y: this.heightAt(TAMBOTOCO_SHRINE.x, TAMBOTOCO_SHRINE.z - 1.8) + 3.3,
      phase: PHASE_SHRINE,
      kind: 'fire',
    });
    this.addPhase(PHASE_SHRINE, shrineParts);

    // Inticancha in two steps. Act IV only traces it (paved plaza, altar and the four cancha plots) for
    // the player's store and houses; the living settlement (houses, terraces, fields, people, fire)
    // appears once the four canchas stand, never before the ayllus have built anything.
    const inticancha: Parts = [];
    const founded: Parts = [];
    const plaza = TAMBOTOCO_INTICANCHA;
    pavedPlaza(inticancha, plaza.x, plaza.z, TAMBOTOCO_PLAZA_RADIUS, ground);
    for (const cancha of TAMBOTOCO_CANCHAS) {
      canchaPlot(inticancha, cancha.dx, cancha.dz, plaza, ground);
    }
    this.addPhase(PHASE_INTICANCHA, inticancha);

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

  /** One material for the whole kit; the generated grain and normal break the flat faces. */
  private createMaterial(): THREE.MeshStandardMaterial {
    const { map, normalMap } = aylluSurfaceTextures();
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.93,
      metalness: 0,
      map,
      normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
    });
  }

  private addPhase(phase: string, parts: Parts): void {
    if (!parts.length) return;
    const merged = mergeGeometries(parts, false);
    parts.forEach((g) => g.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.name = `ayllu:${phase}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const group = new THREE.Group();
    group.add(mesh);
    this.group.add(group);
    this.geometries.push(merged);
    this.phases.push({ phase, group });
  }

  /** Show the pieces whose phase has been reached; the order is the site plan's, not the engine's. */
  setPhase(phase: string): void {
    this.phase = isKnownPhase(this.plan, phase) ? phase : this.plan.initial;
    for (const entry of this.phases) {
      entry.group.visible = phaseOrder(this.plan, entry.phase) <= phaseOrder(this.plan, this.phase);
    }
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
        color: source.kind === 'fire' ? 0xff8a2a : 0x9a958a,
        kind: source.kind,
        speed: source.kind === 'fire' ? 0.45 : 0.7,
        life: source.kind === 'fire' ? 0.9 : 3,
        size: source.kind === 'fire' ? 0.7 : 1.2,
        grow: source.kind === 'fire' ? 1 : 1.5,
        spread: source.kind === 'fire' ? 0.3 : 0.5,
      });
    };
    // Every nearby altar burns; two huts smoke per tick so the hamlet reads alive from the camera.
    for (const source of nearby) if (source.kind === 'fire') emit(source, 1);
    const smokes = nearby.filter((s) => s.kind === 'smoke');
    if (smokes.length) {
      emit(smokes[lifeTurn % smokes.length]!, 2);
      emit(smokes[(lifeTurn + 1) % smokes.length]!, 1);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const g of this.geometries) g.dispose();
    this.geometries.length = 0;
    this.material.dispose();
  }
}
