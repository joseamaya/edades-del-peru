/** Minimal mutable 3D vector for simulation state (no Three.js dependency). */
export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}

  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(v: Readonly<Vector3Like>): this {
    return this.set(v.x, v.y, v.z);
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  add(v: Readonly<Vector3Like>): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  addScaledVector(v: Readonly<Vector3Like>, scale: number): this {
    this.x += v.x * scale;
    this.y += v.y * scale;
    this.z += v.z * scale;
    return this;
  }

  subVectors(a: Readonly<Vector3Like>, b: Readonly<Vector3Like>): this {
    return this.set(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  length(): number {
    return Math.hypot(this.x, this.y, this.z);
  }

  distanceTo(v: Readonly<Vector3Like>): number {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  multiplyScalar(scale: number): this {
    this.x *= scale;
    this.y *= scale;
    this.z *= scale;
    return this;
  }

  normalize(): this {
    const length = this.length();
    if (length > 0) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
    }
    return this;
  }
}
