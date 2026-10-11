import type { GameEvents } from './types';

/** Bus de eventos tipado y global. */
export class EventBus<T extends Record<string, unknown> = Record<string, any>> {
  private map = new Map<keyof T, Set<(payload: any) => void>>();

  on<K extends keyof T>(event: K, fn: (payload: T[K]) => void): () => void {
    let set = this.map.get(event);
    if (!set) {
      set = new Set();
      this.map.set(event, set);
    }
    set.add(fn as (payload: any) => void);
    return () => this.off(event, fn);
  }

  off<K extends keyof T>(event: K, fn: (payload: T[K]) => void): void {
    this.map.get(event)?.delete(fn as (payload: any) => void);
  }

  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.map.get(event)?.forEach((fn) => fn(payload));
  }

  clear(): void {
    this.map.clear();
  }
}

export const bus = new EventBus<GameEvents>();
