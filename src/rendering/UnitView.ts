import * as THREE from 'three';
import { EntityView } from '../entities/EntityView';
import {
  commanderAccent,
  commanderById,
  hasFieldMarker,
  type CommanderDef,
  type HeroPattern,
} from '../model/defs/commanders';
import { acquireRig } from './ModelAssets';
import type { RigInstance } from './RigInstance';
import { buildModel, disposeModel, type BuildContext } from '../model/ProceduralModel';
import { getUnitModel } from '../model/defs/units';
import {
  unitModelAsset,
  rigClipStateFor,
  RUN_CLIP_RATE_MAX,
  WALK_CLIP_RATE_MIN,
  WALK_CLIP_RATE_MAX,
} from '../model/defs/modelAssets';
import type { Unit } from '../entities/Unit';
import { FishingNetFx } from './FishingNetFx';
import {
  HERO_HIDDEN_PARTS,
  HERO_WEAPON_PARTS,
  createRigAttireTools,
  mergeColoredGeometry,
  type RigAttireTools,
} from './rigAttire';
import { limitShadowCasters } from './shadowCasters';
import { andeanSlingPieces } from './workerAttire';
import { clamp } from '../util/math';
import type { Resources } from '../core/types';

const CARRY_COLORS: Record<keyof Resources, number> = {
  food: 0xc8a04a,
  wood: 0x8a6a3a,
  silver: 0x9aa2aa,
  stone: 0x4ac6d8,
};

/** Presentation for one simulated unit: model/rig, pivots, carry bundle and bob. */
export class UnitView {
  readonly view: EntityView;
  rig: RigInstance | null = null;
  private gunPivot: THREE.Group | null = null;
  private turretPivot: THREE.Group | null = null;
  private legL: THREE.Group | null = null;
  private legR: THREE.Group | null = null;
  private armL: THREE.Group | null = null;
  private armR: THREE.Group | null = null;
  private headPivot: THREE.Group | null = null;
  private carryPivot: THREE.Group | null = null;
  private carryMat: THREE.MeshStandardMaterial | null = null;
  private gunBaseZ = 0;
  private workAnim = 0;
  private bobY = 0;
  private scene: THREE.Scene | null = null;
  private net: FishingNetFx | null = null;
  private heroAttire: RigAttireTools | null = null;
  private identityDressed = false;

  constructor(
    private readonly unit: Unit,
    ctx: BuildContext,
  ) {
    // `Unit.gender` already resolves a tagged commander before the id split.
    const choice = unitModelAsset(unit.kind, unit.era, ctx.civ.id, unit.id, unit.gender, unit.tag ?? '', ctx.missionId);
    this.rig = choice ? acquireRig(choice.asset, choice.variant) : null;
    const model = this.rig
      ? this.rig.root
      : buildModel({ ...getUnitModel(unit.kind, unit.era), gender: unit.gender }, ctx);
    this.view = new EntityView(model, unit.radius, unit, this.rig ? 'radius' : 'model');
    if (!this.rig) this.findPivots(model);
    this.ensureHeroIdentity();
  }

  /** Apply the hero/field-commander identity once, also for units whose tag arrives after the view (save/load). */
  private ensureHeroIdentity(): void {
    if (this.identityDressed) return;
    const commander = commanderById(this.unit.tag);
    if (!hasFieldMarker(commander)) return;
    this.identityDressed = true;
    this.view.group.scale.multiplyScalar(commander.hero ? 1.16 * (commander.bulk ?? 1) : 1.08);
    if (!commander.hero) return;
    this.dressHero(commander);
    // The hero's mantle and band are attached after the rig was built; re-pick the shadow silhouette.
    if (this.rig) limitShadowCasters(this.rig.root);
  }

  /**
   * Hero attire on the shared ayllu rig: the commander's accent on tunic, skirt/wrap and headband, a
   * cloth mantle that broadens the silhouette (longer on the Mamas) and a per-sibling prop/headdress.
   * The silhouette is a presentation abstraction; the dossier does not describe the Ayar's clothes.
   */
  private dressHero(commander: CommanderDef): void {
    const root = this.rig?.root;
    if (!root) return;
    const female = this.unit.gender === 'female';
    const accent = new THREE.Color(commanderAccent(commander));
    // Keep most of the accent on the cloth: the old near-cream lift made the eight siblings look bare.
    const cloth = accent.clone().lerp(new THREE.Color('#f0e2c8'), 0.18);
    const dark = accent.clone().multiplyScalar(0.5);
    const light = accent.clone().lerp(new THREE.Color('#efe0c0'), 0.5);
    const cream = new THREE.Color('#d8c39c');
    const tools = createRigAttireTools(root);
    this.heroAttire = tools;
    const accessoryMaterial = (): THREE.MeshStandardMaterial => {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05 });
      tools.ownedMaterials.push(material);
      return material;
    };
    const tint = (name: string, color: THREE.Color): void => tools.tint(name, color.getHex());
    tools.show(female ? 'attire_tunic_f' : 'attire_tunic_m', true);
    tools.show(female ? 'attire_skirt_f' : 'attire_wrap_m', true);
    // The hero's own headdress, sash and weapon replace the generic soldier kit; hiding it also
    // keeps the hero at a handful of draw calls at the strategic zoom. The lists are shared with the
    // consolidation's `dynamic` set so a new hero override cannot be merged into the rig.
    for (const name of HERO_HIDDEN_PARTS) tools.show(name, false);
    for (const name of HERO_WEAPON_PARTS) tools.show(name, commander.weapon === 'macana');
    // The rig caches its garment geometry per variant with the source colours baked into vertices, so the
    // visible cloth is one `rig:consolidated` mesh; its per-unit material carries the accent.
    const tunic = root.getObjectByName(female ? 'attire_tunic_f' : 'attire_tunic_m') as THREE.Mesh | null;
    const clothMap = (tunic?.material as THREE.MeshStandardMaterial | undefined)?.map?.uuid;
    const pattern = heroPatternTexture(commander.pattern);
    root.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || mesh.name !== 'rig:consolidated') return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!clothMap) {
        console.warn('[hero] no cloth map on the rig; the accent cannot tint the garments');
        return;
      }
      if (material.map?.uuid !== clothMap) return;
      material.color.copy(cloth);
      if (pattern) {
        material.map = pattern;
        material.needsUpdate = true;
      }
    });
    // The body under the tunic was painted with the palette tint when the rig was dressed; follow the hero
    // accent so a bulge through the longer uncu still reads as cloth, not as the soldier's tunic.
    this.rig?.setClothColors(cloth.getHex());
    if (commander.weapon === 'macana') {
      for (const name of ['attire_andean_macana', 'attire_andean_macana_head']) {
        const mesh = root.getObjectByName(name) as THREE.Mesh | null;
        if (!mesh?.isMesh) continue;
        mesh.scale.multiplyScalar(1.25);
        tint(name, dark);
      }
    }
    const head = tools.bone('Head');
    if (head) {
      const pieces: [THREE.BufferGeometry, THREE.Color][] = [];
      const headdress = commander.headdress ?? 'band';
      if (headdress !== 'none') {
        pieces.push([new THREE.TorusGeometry(0.1, 0.014, 6, 20), dark]);
      }
      if (headdress === 'feathers') {
        for (let i = 0; i < 3; i++) {
          const feather = new THREE.ConeGeometry(0.038, 0.3 - i * 0.04, 5).translate((i - 1) * 0.07, 0.24, -0.02);
          feather.rotateZ((i - 1) * 0.28);
          pieces.push([feather, i % 2 === 0 ? accent : cream]);
        }
      } else if (headdress === 'turban') {
        pieces.push([new THREE.CylinderGeometry(0.115, 0.11, 0.1, 12).translate(0, 0.17, 0), accent]);
      }
      const hair = commander.hair ?? 'loose';
      if (hair === 'bun') {
        const bun = new THREE.SphereGeometry(0.09, 8, 6);
        bun.scale(1, 0.8, 1);
        bun.translate(0, 0.12, -0.1);
        pieces.push([bun, new THREE.Color(0x2a1e16)]);
        pieces.push([new THREE.TorusGeometry(0.06, 0.012, 5, 12).rotateX(Math.PI / 2).translate(0, 0.14, -0.11), dark]);
      } else if (hair === 'braids') {
        for (const side of [-1, 1]) {
          pieces.push([
            new THREE.CylinderGeometry(0.025, 0.04, 0.52, 5).translate(side * 0.075, -0.16, -0.12),
            new THREE.Color(0x2a1e16),
          ]);
          pieces.push([
            new THREE.TorusGeometry(0.035, 0.01, 4, 8).rotateX(Math.PI / 2).translate(side * 0.075, -0.38, -0.12),
            dark,
          ]);
        }
      } else if (hair === 'topknot') {
        pieces.push([new THREE.SphereGeometry(0.065, 7, 5).translate(0, 0.27, 0.02), new THREE.Color(0x2a1e16)]);
        pieces.push([new THREE.TorusGeometry(0.05, 0.01, 4, 10).rotateX(Math.PI / 2).translate(0, 0.22, 0.02), dark]);
      }
      const merged = mergeColoredGeometry(pieces);
      if (merged) {
        const mesh = new THREE.Mesh(tools.track(merged), accessoryMaterial());
        mesh.name = 'attire_hero_head';
        tools.enableShadows(mesh);
        head.add(mesh);
      }
    }
    const spine = tools.bonePosition('spine_03');
    if (!spine) return;
    const clothPieces: [THREE.BufferGeometry, THREE.Color][] = [
      [
        new THREE.CylinderGeometry(
          0.22,
          0.34,
          commander.mantle === 'long' ? 0.58 : 0.46,
          10,
          1,
          true,
          Math.PI * 0.2,
          Math.PI * 1.5,
        ),
        light,
      ],
      [new THREE.BoxGeometry(0.09, 0.46, 0.025).rotateZ(0.62).translate(0, -0.02, 0.14), dark],
    ];
    if (commander.carryBundle) {
      clothPieces.push([new THREE.BoxGeometry(0.26, 0.3, 0.16).translate(0, -0.08, -0.22), cream]);
      clothPieces.push([new THREE.BoxGeometry(0.28, 0.06, 0.17).translate(0, 0.08, -0.22), dark]);
    }
    const torso = mergeColoredGeometry(clothPieces);
    if (torso) {
      const mesh = new THREE.Mesh(tools.track(torso), accessoryMaterial());
      mesh.name = 'attire_hero_cloth';
      tools.enableShadows(mesh);
      tools.attach('spine_03', mesh, new THREE.Vector3(spine.x, spine.y - 0.02, spine.z));
    }
    const hand = tools.bonePosition('hand_r');
    if (!hand) return;
    const wood = new THREE.Color(0x6b4a2f);
    const stone = new THREE.Color(0x8a8172);
    const propPieces: [THREE.BufferGeometry, THREE.Color][] = [];
    if (commander.weapon === 'staff') {
      propPieces.push([new THREE.CylinderGeometry(0.03, 0.036, 2.0, 6).translate(0, -0.55, 0), wood]);
      propPieces.push([new THREE.ConeGeometry(0.09, 0.26, 5).translate(0, 0.5, 0), accent]);
      propPieces.push([new THREE.SphereGeometry(0.05, 6, 5).translate(0, 0.38, 0), stone]);
    } else if (commander.weapon === 'maul') {
      propPieces.push([new THREE.CylinderGeometry(0.035, 0.04, 0.95, 6).translate(0, -0.3, 0), wood]);
      propPieces.push([new THREE.BoxGeometry(0.3, 0.2, 0.2).translate(0, -0.78, 0), stone]);
      propPieces.push([new THREE.CylinderGeometry(0.05, 0.05, 0.06, 6).translate(0, -0.68, 0), dark]);
    } else if (commander.weapon === 'sling') {
      propPieces.push(...andeanSlingPieces(accent));
    } else if (commander.weapon === 'digging') {
      propPieces.push([new THREE.CylinderGeometry(0.028, 0.034, 1.3, 6).translate(0, -0.35, 0), wood]);
      propPieces.push([new THREE.ConeGeometry(0.055, 0.22, 5).rotateX(Math.PI).translate(0, -1.0, 0), stone]);
    }
    const prop = mergeColoredGeometry(propPieces);
    if (prop) {
      const mesh = new THREE.Mesh(tools.track(prop), accessoryMaterial());
      mesh.name = 'attire_hero_weapon';
      tools.enableShadows(mesh);
      tools.attach('hand_r', mesh, hand.clone());
    }
    const attackClip = commander.weapon === 'sling' ? 'OverhandThrow' : 'Sword_Regular_A';
    this.rig?.setClipOverride('attack', attackClip);
  }

  attach(scene: THREE.Scene): void {
    this.scene = scene;
    this.view.attachTo(scene);
    this.view.setPosition(this.unit.pos.x, this.unit.pos.y, this.unit.pos.z);
  }

  private findPivots(model: THREE.Group): void {
    model.traverse((o) => {
      if (o.name === 'pivot:gun') {
        this.gunPivot = o as THREE.Group;
        this.gunBaseZ = this.gunPivot.position.z;
      }
      if (o.name === 'pivot:turret') this.turretPivot = o as THREE.Group;
      if (o.name === 'pivot:legL') this.legL = o as THREE.Group;
      if (o.name === 'pivot:legR') this.legR = o as THREE.Group;
      if (o.name === 'pivot:armL') this.armL = o as THREE.Group;
      if (o.name === 'pivot:armR') this.armR = o as THREE.Group;
      if (o.name === 'pivot:head') this.headPivot = o as THREE.Group;
      if (o.name === 'pivot:carry') {
        this.carryPivot = o as THREE.Group;
        for (const child of this.carryPivot.children) {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) continue;
          const m = (mesh.material as THREE.MeshStandardMaterial).clone();
          m.vertexColors = false;
          m.needsUpdate = true;
          mesh.material = m;
          if (!this.carryMat) this.carryMat = m;
        }
      }
    });
  }

  sync(dt: number, time: number): void {
    this.ensureHeroIdentity();
    const u = this.unit;
    this.animate(dt, time);
    this.carry();
    this.view.setPosition(u.pos.x, u.pos.y, u.pos.z);
    this.view.setFacing(u.yaw);
    this.view.group.position.y += this.bobY;
    this.view.updateHealth(u.hp / u.maxHp);
  }

  private animate(dt: number, time: number): void {
    const u = this.unit;
    if (this.rig) {
      const order = u.orderQueue[0]?.kind;
      const working = u.isWorkingNow();
      const speed = Math.hypot(u.vel.x, u.vel.z);
      // Preparing a field is digging with the stick, not raising a building: play the work clip.
      const tilling = working && order === 'build' && !!u.ctx?.buildings.get(u.orderQueue[0]?.entityId ?? -1)?.isFarm;
      const charging = order === 'attack' || order === 'attack_move';
      const running = this.rig.hasState('run') && (charging || speed > this.rig.runSpeedThreshold());
      const state = rigClipStateFor({
        moving: speed > 0.15,
        gathering: working && (order === 'gather' || tilling),
        building: working && order === 'build' && !tilling,
        attacking: u.isAttackingTarget() || (order === 'attack' && u.targetEntityId !== null),
        carrying: u.carryCountNow() > 0,
        running,
      });
      this.rig.play(state);
      if (!u.dead && u.hitReact > 0 && !this.rig.hitPlaying) this.rig.playHit();
      this.animateFishing(state === 'gather', time);
      const reference = this.rig.referenceSpeed(state);
      const maxRate = state === 'run' ? RUN_CLIP_RATE_MAX : WALK_CLIP_RATE_MAX;
      this.rig.setPlaybackRate(reference ? clamp(speed / reference, WALK_CLIP_RATE_MIN, maxRate) : 1);
      this.rig.update(dt);
      this.bobY = 0;
      return;
    }
    const walk = u.walkCycle;
    if (this.gunPivot) {
      const recoil = u.attackCooldown > u.stats.attackSpeed - 0.12 ? -0.15 : 0;
      this.gunPivot.position.z = this.gunBaseZ + recoil;
    }
    if (this.turretPivot) {
      let aimYaw = Math.sin(time * 0.6) * 0.05;
      if (u.targetEntityId !== null) {
        const target = u.ctx?.entitiesById?.get(u.targetEntityId) ?? u.ctx?.buildings?.get(u.targetEntityId);
        if (target) aimYaw = u.aimYawAt(target.pos.x, target.pos.z);
      }
      this.turretPivot.rotation.y = aimYaw;
    }
    this.bobY = 0;
    if (walk > 0.01) {
      const phase = walk * 3.2;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      if (this.legL) this.legL.rotation.x = s * 0.55;
      if (this.legR) this.legR.rotation.x = -s * 0.55;
      if (this.armL) this.armL.rotation.x = -s * 0.42;
      if (this.armR) this.armR.rotation.x = s * 0.42;
      if (this.headPivot) this.headPivot.rotation.x = c * 0.05;
      this.bobY = Math.abs(s) * 0.045;
    } else if (u.isWorkingNow()) {
      this.workAnim += dt;
      const chop = Math.abs(Math.sin(this.workAnim * 5.5));
      if (this.legL) this.legL.rotation.x = 0.12;
      if (this.legR) this.legR.rotation.x = -0.12;
      if (this.armR) this.armR.rotation.x = -0.15 - chop * 0.85;
      if (this.armL) this.armL.rotation.x = -0.25 - chop * 0.15;
      if (this.headPivot) this.headPivot.rotation.x = 0.14 + chop * 0.08;
      this.bobY = -chop * 0.02;
    } else {
      this.workAnim = this.workAnim + (0 - this.workAnim) * Math.min(1, dt * 8);
      const idle = Math.sin(time * 1.6 + ((u.id * 1.61803398875) % 10));
      if (this.legL) this.legL.rotation.x = idle * 0.03;
      if (this.legR) this.legR.rotation.x = -idle * 0.03;
      if (this.armL) this.armL.rotation.x = idle * 0.02;
      if (this.armR) this.armR.rotation.x = idle * 0.02;
      if (this.headPivot) this.headPivot.rotation.x = idle * 0.02;
      this.bobY = idle * 0.014;
    }
    if (this.armR) {
      if (u.targetEntityId !== null && walk <= 0.01 && u.orderQueue[0]?.kind === 'attack') {
        const recoil = u.attackCooldown > u.stats.attackSpeed - 0.12 ? -0.25 : 0;
        this.armR.rotation.x = -1.05 + recoil;
      } else if (this.gunPivot && walk <= 0.01 && u.orderQueue[0]?.kind === 'attack') {
        this.armR.rotation.x = -0.9;
      }
    }
  }

  /** A fisher casts a cotton net over the fishing ground and drags it back (presentation only). */
  private animateFishing(gathering: boolean, time: number): void {
    const u = this.unit;
    const ground = gathering && u.lastGather?.kind === 'fishing' ? u.lastGather : null;
    this.rig?.setGatherKind(ground ? 'fishing' : (u.lastGather?.kind ?? null));
    if (!ground || !this.scene) {
      this.net?.hide();
      return;
    }
    this.net ??= new FishingNetFx(this.scene);
    this.rig?.setNetInHand(this.net.update(time, u.id, u.pos, ground));
  }

  private carry(): void {
    const u = this.unit;
    const carrying = u.carryCountNow() > 0;
    const res = u.carriedResource();
    this.rig?.setCarrying(carrying, CARRY_COLORS[res]);
    if (!this.carryPivot) return;
    this.carryPivot.visible = carrying;
    if (carrying && this.carryMat) this.carryMat.color.setHex(CARRY_COLORS[res]);
  }

  dispose(): void {
    this.net?.dispose();
    this.net = null;
    if (this.view.group.parent) this.view.group.parent.remove(this.view.group);
    this.view.dispose();
    if (this.rig) {
      this.rig.dispose();
      this.rig = null;
    } else {
      disposeModel(this.view.group);
    }
    this.heroAttire?.dispose();
    this.heroAttire = null;
  }
}

/**
 * A small grayscale weave for the hero cloth. The material colour is the commander accent, so the
 * pattern only changes value; it is an abstraction of Andean textile geometry, not a specific garment.
 */
const HERO_PATTERNS = new Map<HeroPattern, THREE.DataTexture>();

function heroPatternTexture(pattern: HeroPattern | undefined): THREE.DataTexture | null {
  if (!pattern || pattern === 'plain') return null;
  const cached = HERO_PATTERNS.get(pattern);
  if (cached) return cached;
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value =
        pattern === 'stripes'
          ? x % 8 < 4
            ? 0.66
            : 0.96
          : pattern === 'checks'
            ? ((x >> 2) + (y >> 2)) % 2 === 0
              ? 0.7
              : 0.96
            : (x + y) % 8 < 2
              ? 0.62
              : (x + y) % 8 < 4
                ? 0.84
                : 0.96;
      const i = (y * size + x) * 4;
      data[i] = Math.round(value * 255);
      data[i + 1] = Math.round(value * 255);
      data[i + 2] = Math.round(value * 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  HERO_PATTERNS.set(pattern, texture);
  return texture;
}
