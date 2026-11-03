import { describe, expect, it } from 'vitest';
import {
  applyMarketTrade,
  createMarketState,
  marketQuote,
  tickMarket,
  tradeIncomeForDistance,
  MARKET_TRADE_AMOUNT,
} from '../src/game/market';
import type { Resources } from '../src/core/types';

const bank = (silver: number, food = 0): Resources => ({ food, wood: 0, silver, stone: 0 });

describe('market', () => {
  it('quotes a spread around the unit price', () => {
    const state = createMarketState();
    const buy = marketQuote(state, 'food', 'buy');
    const sell = marketQuote(state, 'food', 'sell');
    expect(buy.amount).toBe(MARKET_TRADE_AMOUNT);
    expect(buy.silver).toBeGreaterThan(sell.silver);
    expect(sell.silver).toBeGreaterThan(0);
  });

  it('moves prices with supply and demand and decays back', () => {
    const state = createMarketState();
    const before = marketQuote(state, 'wood', 'buy').unitPrice;
    const resources = bank(10_000);
    expect(applyMarketTrade(resources, state, 'wood', 'buy')).toBe(true);
    const afterBuy = marketQuote(state, 'wood', 'buy').unitPrice;
    expect(afterBuy).toBeGreaterThan(before);
    for (let i = 0; i < 120; i++) tickMarket(state, 1);
    expect(marketQuote(state, 'wood', 'buy').unitPrice).toBeCloseTo(before, 1);
  });

  it('rejects trades the player cannot afford', () => {
    const state = createMarketState();
    expect(applyMarketTrade(bank(0), state, 'food', 'buy')).toBe(false);
    expect(applyMarketTrade(bank(0, 10), state, 'food', 'sell')).toBe(false);
  });

  it('earns more silver on longer caravan routes, bounded', () => {
    expect(tradeIncomeForDistance(20)).toBe(20);
    expect(tradeIncomeForDistance(100)).toBe(100);
    expect(tradeIncomeForDistance(1)).toBe(0);
    expect(tradeIncomeForDistance(7)).toBe(0);
    expect(tradeIncomeForDistance(10_000)).toBe(200);
  });
});
