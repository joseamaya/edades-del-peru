import type { Resources } from '../core/types';

export type MarketAction = 'buy' | 'sell';
export const MARKET_TRADE_AMOUNT = 100;

const BASE_PRICE: Resources = { food: 1, wood: 0.8, silver: 1, stone: 1.4 };
const SPREAD = 0.1;
const IMPACT = 0.04;
const MIN_FACTOR = 0.45;
const MAX_FACTOR = 2.2;
const DECAY_SECONDS = 20;

/** Silver earned by a caravan for a route of this length; bounded for stable economy. */
export function tradeIncomeForDistance(distance: number): number {
  if (!Number.isFinite(distance)) return 10;
  return Math.max(10, Math.min(200, Math.round(distance)));
}

export interface MarketState {
  pressure: Resources;
}

export interface MarketQuote {
  action: MarketAction;
  resource: keyof Resources;
  amount: number;
  silver: number;
  unitPrice: number;
}

export function createMarketState(): MarketState {
  return { pressure: { food: 0, wood: 0, silver: 0, stone: 0 } };
}

function clampFactor(value: number): number {
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, value));
}

export function marketUnitPrice(state: MarketState, resource: keyof Resources): number {
  return BASE_PRICE[resource] * clampFactor(1 + state.pressure[resource]);
}

export function marketQuote(
  state: MarketState,
  resource: keyof Resources,
  action: MarketAction,
  amount = MARKET_TRADE_AMOUNT,
): MarketQuote {
  const unitPrice = marketUnitPrice(state, resource);
  const factor = action === 'buy' ? 1 + SPREAD : 1 - SPREAD;
  return {
    action,
    resource,
    amount,
    silver: Math.max(1, Math.round(unitPrice * amount * factor)),
    unitPrice: Math.round(unitPrice * 100) / 100,
  };
}

/** Apply a trade to a player's resources; the market pressure moves with the flow. */
export function applyMarketTrade(
  resources: Resources,
  state: MarketState,
  resource: keyof Resources,
  action: MarketAction,
  amount = MARKET_TRADE_AMOUNT,
): boolean {
  if (!(amount > 0)) return false;
  const quote = marketQuote(state, resource, action, amount);
  if (action === 'buy') {
    if (resources.silver < quote.silver) return false;
    resources.silver -= quote.silver;
    resources[resource] += amount;
    state.pressure[resource] = Math.min(MAX_FACTOR - 1, state.pressure[resource] + IMPACT);
  } else {
    if (resources[resource] < amount) return false;
    resources[resource] -= amount;
    resources.silver += quote.silver;
    state.pressure[resource] = Math.max(MIN_FACTOR - 1, state.pressure[resource] - IMPACT);
  }
  return true;
}

/** Prices drift back toward the base price over time. */
export function tickMarket(state: MarketState, dt: number): void {
  if (!(dt > 0)) return;
  const decay = Math.min(1, dt / DECAY_SECONDS);
  for (const key of ['food', 'wood', 'silver', 'stone'] as const) {
    state.pressure[key] += (0 - state.pressure[key]) * decay;
    if (Math.abs(state.pressure[key]) < 0.0001) state.pressure[key] = 0;
  }
}

export function serializeMarket(state: MarketState): Resources {
  return { ...state.pressure };
}

export function applyMarketSave(state: MarketState, saved: Resources | undefined): void {
  if (!saved) return;
  state.pressure = {
    food: Number.isFinite(saved.food) ? saved.food : 0,
    wood: Number.isFinite(saved.wood) ? saved.wood : 0,
    silver: Number.isFinite(saved.silver) ? saved.silver : 0,
    stone: Number.isFinite(saved.stone) ? saved.stone : 0,
  };
}
