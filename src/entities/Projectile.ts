import { Vec3, type Vector3Like } from '../sim/Vec3';

export interface ProjectileOptions {
  from: Readonly<Vector3Like>;
  target: Readonly<Vector3Like>;
  speed: number;
  damage: number;
  kind: string;
  owner: number;
  area?: number;
  arc?: number;
  targetId?: number;
  onHit?: (targetId: number | undefined) => void;
  getTargetPos?: () => Readonly<Vector3Like> | null;
}

/**
 * Ballistic/tracer projectile simulation. Rendering (mesh, light, trail and
 * impact pools) lives in `ProjectileView`; this class only advances state.
 */
export class Projectile {
  id = allocIdProj();
  pos = new Vec3();
  target = new Vec3();
  vel = new Vec3();
  dir = new Vec3(0, 0, 1);
  owner: number;
  damage: number;
  area: number;
  kind: string;
  dead = false;
  /** True when the projectile reached its target (the view emits an impact). */
  impact = false;
  speed: number;
  arc: number;
  travelled = 0;
  targetId?: number;
  private startY: number;
  private totalDist: number;
  private life = 8;
  private onHit?: (targetId: number | undefined) => void;
  private getTargetPos?: () => Readonly<Vector3Like> | null;
  private _tmpTarget = new Vec3();
  private _toTarget = new Vec3();

  constructor(opts: ProjectileOptions) {
    this.pos.copy(opts.from);
    this.target.copy(opts.target);
    this.owner = opts.owner;
    this.damage = opts.damage;
    this.area = opts.area ?? 0;
    this.kind = opts.kind;
    this.speed = opts.speed;
    this.arc = opts.arc ?? 0;
    this.startY = opts.from.y;
    this.totalDist = this.pos.distanceTo(this.target);
    this.targetId = opts.targetId;
    this.onHit = opts.onHit;
    this.getTargetPos = opts.getTargetPos;
  }

  update(dt: number): void {
    if (this.dead) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    // homing: re-aim at the target center if it is still alive (AoE2 arrows)
    if (this.targetId !== undefined && this.getTargetPos && this.kind !== 'howitzer_shell' && this.kind !== 'nuclear') {
      const tp = this.getTargetPos();
      if (tp) {
        this._tmpTarget.copy(tp);
        this._tmpTarget.y += 0.5;
        this.target.copy(this._tmpTarget);
      }
    }

    const toTarget = this._toTarget.subVectors(this.target, this.pos);
    const dist = toTarget.length();
    const step = this.speed * dt;
    if (dist < step) {
      this.pos.copy(this.target);
      this.hit();
      return;
    }

    this.dir.copy(toTarget).normalize();
    this.pos.addScaledVector(this.dir, step);
    this.travelled += step;

    // parabolic arc
    if (this.arc > 0) {
      const t = Math.min(this.travelled / this.totalDist, 1);
      this.pos.y = this.startY + (this.target.y - this.startY) * t + this.arc * 8 * Math.sin(Math.PI * t);
    }
  }

  private hit(): void {
    this.dead = true;
    this.impact = true;
    this.onHit?.(this.targetId);
  }
}

let projId = 1;

function allocIdProj(): number {
  return projId++;
}
