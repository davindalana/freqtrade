import { BotConfig, Candle, Trade, PairMarketInfo, BalanceItem, LogEntry, BotInstance } from '../types/freqtrade';
import { enrichCandlesWithIndicators } from '../services/indicators';

export const dualBotInstances: BotInstance[] = [
  {
    id: 'bot-1',
    name: 'BTC Weekly Swing',
    label: 'Bot 1: BTC Weekly Swing (LIVE)',
    port: 8083,
    mode: 'live',
    strategy: 'BTCWeeklySwingV2',
    timeframe: '4h',
    trading_mode: 'futures',
    margin_mode: 'isolated',
    leverage: 5.0,
    wallet_balance: 40.99,
    initial_capital: 39.90,
    status: 'ONLINE & HEALTHY',
    warp_status: 'Connected & Healthy',
    caffeinate_active: true,
    protections: ['LiquidationBufferProtection', 'MaxDrawdownProtection'],
    pairs: ['BTC/USDT:USDT']
  },
  {
    id: 'bot-2',
    name: 'RegimeTrendPullback',
    label: 'Bot 2: RegimeTrendPullback (DRY-RUN)',
    port: 8082,
    mode: 'dry_run',
    strategy: 'RegimeTrendPullback',
    timeframe: '1h',
    trading_mode: 'futures',
    margin_mode: 'isolated',
    leverage: 3.0,
    wallet_balance: 39.68,
    initial_capital: 39.68,
    status: 'ONLINE & HEALTHY',
    warp_status: 'Connected & Healthy',
    caffeinate_active: true,
    protections: ['CooldownPeriod', 'StoplossGuard', 'MaxDrawdownProtection', 'LowProfitPairs'],
    pairs: ['SOL/USDT:USDT', 'XRP/USDT:USDT', 'DOGE/USDT:USDT', 'SUI/USDT:USDT', 'AVAX/USDT:USDT', 'NEAR/USDT:USDT', 'LINK/USDT:USDT']
  }
];

export const initialConfigBot1: BotConfig = {
  version: '2026.4',
  bot_name: 'BTC-Weekly-Swing-Live',
  strategy: 'BTCWeeklySwingV2',
  timeframe: '4h',
  dry_run: false,
  dry_run_wallet: 40.99,
  stake_currency: 'USDT',
  stake_amount: 32.16,
  max_open_trades: 1,
  tradable_balance_ratio: 0.99,
  fiat_display_currency: 'USD',
  trading_mode: 'futures',
  margin_mode: 'isolated',
  stoploss: -0.0285, // $78,110.30 from $80,399.70
  trailing_stop: false,
  trailing_stop_positive: 0.02,
  trailing_stop_positive_offset: 0.03,
  trailing_only_offset_is_reached: true,
  minimal_roi: {
    '1440': 0.04,
    '720': 0.07,
    '0': 0.12
  },
  exchange: {
    name: 'Binance Futures (USDT-M)',
    pair_whitelist: ['BTC/USDT:USDT'],
    pair_blacklist: []
  },
  entry_pricing: {
    price_side: 'same',
    use_order_book: true,
    order_book_top: 1
  },
  exit_pricing: {
    price_side: 'same',
    use_order_book: true
  }
};

export const initialConfigBot2: BotConfig = {
  version: '2026.4',
  bot_name: 'RegimeTrendPullback-DryRun',
  strategy: 'RegimeTrendPullback',
  timeframe: '1h',
  dry_run: true,
  dry_run_wallet: 39.68,
  stake_currency: 'USDT',
  stake_amount: 15.00,
  max_open_trades: 2,
  tradable_balance_ratio: 0.99,
  fiat_display_currency: 'USD',
  trading_mode: 'futures',
  margin_mode: 'isolated',
  stoploss: -0.035,
  trailing_stop: true,
  trailing_stop_positive: 0.015,
  trailing_stop_positive_offset: 0.02,
  trailing_only_offset_is_reached: true,
  minimal_roi: {
    '120': 0.015,
    '60': 0.03,
    '0': 0.05
  },
  exchange: {
    name: 'Binance Futures (USDT-M)',
    pair_whitelist: ['SOL/USDT:USDT', 'XRP/USDT:USDT', 'DOGE/USDT:USDT', 'SUI/USDT:USDT', 'AVAX/USDT:USDT', 'NEAR/USDT:USDT', 'LINK/USDT:USDT'],
    pair_blacklist: []
  },
  entry_pricing: {
    price_side: 'same',
    use_order_book: true,
    order_book_top: 1
  },
  exit_pricing: {
    price_side: 'same',
    use_order_book: true
  }
};

// Exact open trade from Bot 1 (BTC Swing Live)
export const initialOpenTradesBot1: Trade[] = [
  {
    trade_id: 1,
    pair: 'BTC/USDT:USDT',
    is_open: true,
    open_date: '2026-10-27T10:15:00.000Z',
    open_timestamp: Date.now() - 28 * 60 * 60 * 1000,
    open_rate: 80399.70,
    current_rate: 80971.30,
    amount: 0.002, // 0.002 BTC (~$160 notional at 5x = ~$32 margin)
    stake_amount: 32.16,
    profit_ratio: 0.0334,
    profit_pct: 3.34,
    profit_abs: 1.0759,
    stop_loss_abs: 78110.30,
    stop_loss_ratio: -0.0285,
    initial_stop_loss_abs: 78110.30,
    initial_stop_loss_ratio: -0.0285,
    enter_tag: 'weekly_swing_pullback',
    fee_open: 0.0004,
    fee_close: 0.0004,
    min_rate: 80210.00,
    max_rate: 81150.00,
    trade_duration: 1680, // ~28 hours
    is_short: false,
    leverage: 5.0,
    liquidation_price: 65385.80
  }
];

export const initialOpenTradesBot2: Trade[] = []; // 0 open trades, waiting for setup

export const initialClosedTradesBot1: Trade[] = [
  {
    trade_id: 28,
    pair: 'BTC/USDT:USDT',
    is_open: false,
    open_date: '2026-10-22T08:00:00.000Z',
    open_timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    close_date: '2026-10-24T18:30:00.000Z',
    close_timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    open_rate: 76420.00,
    close_rate: 79850.00,
    current_rate: 80971.30,
    amount: 0.002,
    stake_amount: 30.50,
    profit_ratio: 0.0448 * 5.0, // 5x leverage
    profit_pct: 22.44,
    profit_abs: 6.84,
    stop_loss_abs: 74500.00,
    stop_loss_ratio: -0.025,
    initial_stop_loss_abs: 74500.00,
    initial_stop_loss_ratio: -0.025,
    exit_reason: 'roi',
    enter_tag: 'weekly_trend_bounce',
    fee_open: 0.0004,
    fee_close: 0.0004,
    min_rate: 76100.00,
    max_rate: 80100.00,
    trade_duration: 3510,
    is_short: false,
    leverage: 5.0,
    liquidation_price: 61800.00
  }
];

export const initialClosedTradesBot2: Trade[] = [
  {
    trade_id: 14,
    pair: 'XRP/USDT:USDT',
    is_open: false,
    open_date: '2026-10-26T12:00:00.000Z',
    open_timestamp: Date.now() - 36 * 60 * 60 * 1000,
    close_date: '2026-10-27T02:00:00.000Z',
    close_timestamp: Date.now() - 26 * 60 * 60 * 1000,
    open_rate: 0.5840,
    close_rate: 0.5720,
    current_rate: 0.5780,
    amount: 75.0,
    stake_amount: 14.60,
    profit_ratio: -0.0205 * 3.0,
    profit_pct: -6.15,
    profit_abs: -0.90,
    stop_loss_abs: 0.5720,
    stop_loss_ratio: -0.0205,
    initial_stop_loss_abs: 0.5720,
    initial_stop_loss_ratio: -0.0205,
    exit_reason: 'stop_loss',
    enter_tag: 'regime_breakout',
    fee_open: 0.0004,
    fee_close: 0.0004,
    min_rate: 0.5710,
    max_rate: 0.5890,
    trade_duration: 840,
    is_short: false,
    leverage: 3.0,
    liquidation_price: 0.4200
  }
];

export function generateCandles(basePrice: number, volatility: number, count = 120): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const intervalMs = 15 * 60 * 1000;
  let currentClose = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const date = new Date(timestamp).toISOString();
    
    // Realistic macro upward drift toward $80,971 for BTC
    const drift = (count - i) / count * 0.008;
    const change = (Math.random() - 0.485 + drift) * volatility * currentClose;
    const open = currentClose;
    const close = Math.max(0.0001, open + change);
    const high = Math.max(open, close) + Math.random() * volatility * 0.6 * currentClose;
    const low = Math.min(open, close) - Math.random() * volatility * 0.6 * currentClose;
    const volume = Math.floor(basePrice * (80 + Math.random() * 300));

    candles.push({
      date,
      timestamp,
      open: Number(open.toFixed(basePrice < 2 ? 4 : 2)),
      high: Number(high.toFixed(basePrice < 2 ? 4 : 2)),
      low: Number(low.toFixed(basePrice < 2 ? 4 : 2)),
      close: Number(close.toFixed(basePrice < 2 ? 4 : 2)),
      volume
    });

    currentClose = close;
  }

  // Ensure last candle close matches current market price closely
  if (candles.length > 0) {
    candles[candles.length - 1].close = basePrice;
    candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, basePrice);
  }

  return enrichCandlesWithIndicators(candles);
}

export const sampleCandleData: Record<string, Candle[]> = {
  'BTC/USDT:USDT': generateCandles(80971.30, 0.004, 120),
  'SOL/USDT:USDT': generateCandles(176.40, 0.007, 120),
  'XRP/USDT:USDT': generateCandles(0.5780, 0.006, 120),
  'DOGE/USDT:USDT': generateCandles(0.1415, 0.008, 120),
  'SUI/USDT:USDT': generateCandles(2.0450, 0.009, 120),
  'AVAX/USDT:USDT': generateCandles(28.75, 0.007, 120),
  'NEAR/USDT:USDT': generateCandles(5.08, 0.008, 120),
  'LINK/USDT:USDT': generateCandles(14.65, 0.006, 120)
};

export const sampleMarketPairsBot2: PairMarketInfo[] = [
  { pair: 'BTC/USDT:USDT', price: 80971.30, change24h: 3.42, high24h: 81450.00, low24h: 79800.00, volume24h: 42100000000, spread: 0.005, volatility: 0.024, is_whitelisted: true },
  { pair: 'SOL/USDT:USDT', price: 176.40, change24h: -0.85, high24h: 181.20, low24h: 174.50, volume24h: 3450000000, spread: 0.015, volatility: 0.045, is_whitelisted: true },
  { pair: 'XRP/USDT:USDT', price: 0.5780, change24h: -1.25, high24h: 0.5910, low24h: 0.5710, volume24h: 1250000000, spread: 0.02, volatility: 0.038, is_whitelisted: true },
  { pair: 'DOGE/USDT:USDT', price: 0.1415, change24h: 1.10, high24h: 0.1460, low24h: 0.1380, volume24h: 1980000000, spread: 0.02, volatility: 0.052, is_whitelisted: true },
  { pair: 'SUI/USDT:USDT', price: 2.0450, change24h: 4.80, high24h: 2.1200, low24h: 1.9400, volume24h: 980000000, spread: 0.025, volatility: 0.065, is_whitelisted: true },
  { pair: 'AVAX/USDT:USDT', price: 28.75, change24h: -0.40, high24h: 29.80, low24h: 28.20, volume24h: 640000000, spread: 0.03, volatility: 0.042, is_whitelisted: true },
  { pair: 'NEAR/USDT:USDT', price: 5.08, change24h: 2.15, high24h: 5.25, low24h: 4.92, volume24h: 510000000, spread: 0.035, volatility: 0.058, is_whitelisted: true },
  { pair: 'LINK/USDT:USDT', price: 14.65, change24h: 0.75, high24h: 15.05, low24h: 14.30, volume24h: 430000000, spread: 0.025, volatility: 0.035, is_whitelisted: true }
];

export const sampleBalancesBot1: BalanceItem[] = [
  { currency: 'USDT', free: 8.83, used: 32.16, total: 40.99, est_stake: 40.99, est_usd: 40.99 },
  { currency: 'BTC', free: 0.002, used: 0.002, total: 0.002, est_stake: 161.94, est_usd: 161.94 }
];

export const sampleBalancesBot2: BalanceItem[] = [
  { currency: 'USDT', free: 39.68, used: 0, total: 39.68, est_stake: 39.68, est_usd: 39.68 }
];

export const initialLogs: LogEntry[] = [
  { id: '1', timestamp: '14:46:12', level: 'INFO', logger: 'monitor_portfolio', message: 'Dual-Bot Healthcheck OK. Bot 1 (Port 8083) and Bot 2 (Port 8082) connected.' },
  { id: '2', timestamp: '14:45:00', level: 'INFO', logger: 'btc_swing.worker', message: 'Heartbeat alive. Open order BTC/USDT:USDT long 5.0x. Rate: 80,971.30 USDT. PnL: +3.34% (+1.08 USDT).' },
  { id: '3', timestamp: '14:44:20', level: 'INFO', logger: 'btc_swing.freqtradebot', message: 'Liquidation price verified safe at 65,385.80 USDT. Stoploss locked at 78,110.30 USDT.' },
  { id: '4', timestamp: '14:43:00', level: 'INFO', logger: 'dryrun_altcoins.pairlist', message: 'RegimeTrendPullback scanning 7 Tier-1 coins (SOL, XRP, DOGE, SUI, AVAX, NEAR, LINK).' },
  { id: '5', timestamp: '14:42:15', level: 'INFO', logger: 'dryrun_altcoins.protections', message: 'Cooldown on XRP/USDT:USDT completed. 4 active protections standing guard.' },
  { id: '6', timestamp: '14:40:00', level: 'INFO', logger: 'cloudflare_warp', message: 'WARP tunnel status: Connected & Healthy. Endpoint traffic encrypted to Binance.' },
  { id: '7', timestamp: '14:38:00', level: 'INFO', logger: 'system.caffeinate', message: 'Anti-sleep daemon active: caffeinate -dims PID 48210.' }
];

export const sampleStrategies = [
  {
    name: 'BTCWeeklySwingV2',
    description: 'Weekly macro swing trading on BTC Futures with 5.0x isolated leverage, trailing risk ratchet, and deep pullback entries.',
    timeframe: '4h',
    stoploss: -0.0285,
    roi: { '1440': 0.04, '720': 0.07, '0': 0.12 },
    codeSnippet: `class BTCWeeklySwingV2(IStrategy):
    timeframe = '4h'
    can_short = False
    stoploss = -0.0285  # Hard stop at $78,110
    minimal_roi = {"1440": 0.04, "720": 0.07, "0": 0.12}

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Swing pullback off 4h EMA50 with weekly trend confirmation
        dataframe.loc[
            (dataframe['close'] > dataframe['ema200']) &
            (dataframe['rsi'] < 42) &
            (dataframe['volume'] > 0),
            'enter_long'] = 1
        return dataframe`
  },
  {
    name: 'RegimeTrendPullback',
    description: 'Disciplined multi-timeframe regime trend filter (4h EMA50 > EMA200 + 1h ADX > 20) with 4-tier protection guards.',
    timeframe: '1h',
    stoploss: -0.035,
    roi: { '120': 0.015, '60': 0.03, '0': 0.05 },
    codeSnippet: `class RegimeTrendPullback(IStrategy):
    timeframe = '1h'
    stoploss = -0.035
    minimal_roi = {"120": 0.015, "60": 0.03, "0": 0.05}

    def populate_entry_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:
        # Dual filter: 4h Regime trend + 1h ADX > 20 pullback
        dataframe.loc[
            (dataframe['ema50_4h'] > dataframe['ema200_4h']) &
            (dataframe['adx_1h'] > 20) &
            (dataframe['rsi'] < 35),
            'enter_long'] = 1
        return dataframe`
  }
];
