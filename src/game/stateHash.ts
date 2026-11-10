import type { BuildingKind, Era, Order, UnitKind } from '../core/types';
import type { HarvestLedgerRow } from './saveTypes';

export interface HashUnit {
  id: number;
  owner: number;
  kind: UnitKind;
  pos: { x: number; z: number };
  hp: number;
  orderQueue: Order[];
}

export interface HashBuilding {
  id: number;
  owner: number;
  kind: BuildingKind;
  pos: { x: number; z: number };
  hp: number;
  constructionComplete: boolean;
  constructionProgress: number;
  productionQueue: { unit: UnitKind }[];
  researchQueue: unknown;
  foodAmount: number;
}

export interface HashResource {
  id: number;
  amount: number;
  depleted: boolean;
  dead: boolean;
}

export interface HashPlayer {
  id: number;
  era: Era;
  resources: { food: number; wood: number; silver: number; stone: number };
  populationUsed: number;
  techs: Set<string> | string[];
  alive: boolean;
}

export interface HashStateInput {
  units: Iterable<HashUnit>;
  buildings: Iterable<HashBuilding>;
  nodes: Iterable<HashResource>;
  players: HashPlayer[];
  rngState: number;
  markets?: { food: number; wood: number; silver: number; stone: number }[];
  /** Monotonic harvest ledger by node kind (see Game.harvested). */
  harvested?: HarvestLedgerRow[];
}

/** Stable order for the harvest ledger in the state hash (no locale-dependent comparison). */
function compareHarvestRows(a: HarvestLedgerRow, b: HarvestLedgerRow): number {
  return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
}

/** Stable 32-bit hash of the fields that define replay/gameplay state. */
export function stateHashOf(input: HashStateInput): number {
  const units = [...input.units]
    .filter((unit) => !(unit as { dead?: boolean }).dead)
    .sort((a, b) => a.id - b.id)
    .map((unit) => [
      unit.id,
      unit.owner,
      unit.kind,
      unit.pos.x,
      unit.pos.z,
      unit.hp,
      unit.orderQueue.map((order) => [
        order.kind,
        order.entityId ?? null,
        order.target?.x ?? null,
        order.target?.z ?? null,
      ]),
    ]);
  const buildings = [...input.buildings]
    .sort((a, b) => a.id - b.id)
    .map((building) => [
      building.id,
      building.owner,
      building.kind,
      building.pos.x,
      building.pos.z,
      building.hp,
      building.constructionComplete,
      building.constructionProgress,
      building.productionQueue.map((item) => item.unit),
      building.researchQueue,
      building.foodAmount,
    ]);
  const nodes = [...input.nodes]
    .filter((node) => !node.dead)
    .sort((a, b) => a.id - b.id)
    .map((node) => [node.id, node.amount, node.depleted]);
  const players = input.players.map((player) => [
    player.id,
    player.era,
    player.resources.food,
    player.resources.wood,
    player.resources.silver,
    player.resources.stone,
    player.populationUsed,
    [...player.techs].sort(),
    player.alive,
  ]);
  let hash = 0;
  const text = JSON.stringify({
    units,
    buildings,
    nodes,
    players,
    markets: input.markets ?? [],
    harvested: (input.harvested ?? []).slice().sort(compareHarvestRows),
    rng: input.rngState,
  });
  for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
  return hash >>> 0;
}
