import { Vec3 } from '../sim/Vec3';
import { allocId } from '../sim/ids';
import type { ResourceKey } from '../core/types';
import type { ResourceNodeSave } from '../game/saveTypes';
import type { ResourceNodeView } from '../rendering/ResourceNodeView';

/** Resource node simulation state; the model lives in ResourceNodeView. */
export class ResourceNode {
  id = allocId();
  pos = new Vec3();
  resource!: ResourceKey;
  amount: number;
  maxAmount: number;
  depleted = false;
  dead = false;
  radius = 0;
  kind: 'tree' | 'mine' | 'well' | 'hunt' | 'fishing' | 'berry';
  treeSlot = -1;
  nodeView: ResourceNodeView | null = null;

  constructor(kind: ResourceNode['kind'], x: number, z: number, amount: number) {
    this.kind = kind;
    this.pos.set(x, 0, z);
    this.amount = this.maxAmount = amount;
    switch (kind) {
      case 'tree':
        this.resource = 'wood';
        this.radius = 0.6;
        break;
      case 'mine':
        this.resource = 'silver';
        this.radius = 1.1;
        break;
      case 'well':
        this.resource = 'stone';
        this.radius = 1.0;
        break;
      case 'hunt':
      case 'fishing':
      case 'berry':
        this.resource = 'food';
        this.radius = 0.7;
        break;
    }
  }

  placeTreeInstance(y: number): void {
    this.nodeView?.placeTreeInstance(y);
  }

  setVisibleEx(v: boolean): void {
    this.nodeView?.setVisible(v);
  }

  /** Subtract resource; if the tree is depleted, fell it. */
  subtract(amount: number): void {
    if (this.depleted) return;
    this.amount = Math.max(0, this.amount - amount);
    if (this.amount <= 0) {
      this.depleted = true;
      if (this.nodeView) this.nodeView.deplete();
      else this.dead = true;
    } else {
      this.nodeView?.syncHuntHerd();
    }
  }

  toSave(): ResourceNodeSave {
    return {
      id: this.id,
      kind: this.kind,
      x: this.pos.x,
      z: this.pos.z,
      amount: this.amount,
      maxAmount: this.maxAmount,
    };
  }

  applySave(s: ResourceNodeSave): void {
    this.id = s.id;
    this.maxAmount = Math.max(1, s.maxAmount ?? s.amount);
    this.amount = s.amount;
    this.nodeView?.syncHuntHerd();
  }

  remove(): void {
    if (this.dead) return;
    this.dead = true;
    this.nodeView?.dispose();
    this.nodeView = null;
  }

  update(time: number): void {
    this.nodeView?.update(time);
  }
}
