export type BotRunState = 'running' | 'stopped' | 'reload';
export type TradingMode = 'spot' | 'margin' | 'futures';
export type MarginMode = 'cross' | 'isolated' | '';
export type OrderType = 'market' | 'limit';
export type ExitReason = 'roi' | 'stop_loss' | 'trailing_stop_loss' | 'force_exit' | 'exit_signal' | 'emergency_exit';

export interface BotInstance {
  id: string;
  name: string;
  label: string;
  port: number;
  mode: 'live' | 'dry_run';
  strategy: string;
  timeframe: string;
  trading_mode: TradingMode;
  margin_mode: MarginMode;
  leverage: number;
  wallet_balance: number;
  initial_capital: number;
  status: 'ONLINE & HEALTHY' | 'STOPPED' | 'ERROR';
  warp_status: string;
  caffeinate_active: boolean;
  protections: string[];
  pairs: string[];
}

export interface BotConfig {
  version: string;
  bot_name: string;
  strategy: string;
  timeframe: string;
  dry_run: boolean;
  dry_run_wallet: number;
  stake_currency: string;
  stake_amount: number | 'unlimited';
  max_open_trades: number;
  tradable_balance_ratio: number;
  fiat_display_currency: string;
  trading_mode: TradingMode;
  margin_mode: MarginMode;
  stoploss: number;
  trailing_stop: boolean;
  trailing_stop_positive: number;
  trailing_stop_positive_offset: number;
  trailing_only_offset_is_reached: boolean;
  minimal_roi: Record<string, number>;
  exchange: {
    name: string;
    key?: string;
    secret?: string;
    pair_whitelist: string[];
    pair_blacklist: string[];
  };
  entry_pricing: {
    price_side: 'same' | 'other';
    use_order_book: boolean;
    order_book_top: number;
  };
  exit_pricing: {
    price_side: 'same' | 'other';
    use_order_book: boolean;
  };
}

export interface Trade {
  trade_id: number;
  pair: string;
  is_open: boolean;
  open_date: string;
  open_timestamp: number;
  open_rate: number;
  close_date?: string;
  close_timestamp?: number;
  close_rate?: number;
  current_rate: number;
  amount: number;
  stake_amount: number;
  profit_ratio: number;
  profit_pct: number;
  profit_abs: number;
  stop_loss_abs: number;
  stop_loss_ratio: number;
  initial_stop_loss_abs: number;
  initial_stop_loss_ratio: number;
  exit_reason?: ExitReason;
  enter_tag?: string | null;
  fee_open: number;
  fee_close: number;
  min_rate: number;
  max_rate: number;
  trade_duration?: number; // in minutes
  is_short: boolean;
  leverage: number;
  liquidation_price?: number;
}

export interface Candle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Calculated indicators
  ema20?: number;
  ema50?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  rsi?: number;
  macd?: number;
  macd_signal?: number;
  macd_hist?: number;
  buy_signal?: boolean;
  sell_signal?: boolean;
}

export interface BacktestSettings {
  strategy: string;
  pair: string;
  timeframe: string;
  timerange: string;
  stake_amount: number;
  starting_balance: number;
  max_open_trades: number;
  stoploss: number;
  trailing_stop: boolean;
  minimal_roi: Record<string, number>;
}

export interface BacktestMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  draw_trades: number;
  win_rate: number;
  total_profit_abs: number;
  total_profit_pct: number;
  avg_profit_pct: number;
  avg_duration_minutes: number;
  best_trade_pct: number;
  worst_trade_pct: number;
  max_drawdown_pct: number;
  max_drawdown_abs: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  profit_factor: number;
  expectancy: number;
  cagr: number;
  start_balance: number;
  final_balance: number;
}

export interface BacktestResult {
  run_id: string;
  strategy_name: string;
  timeframe: string;
  date_start: string;
  date_end: string;
  trades: Trade[];
  metrics: BacktestMetrics;
  equity_curve: { date: string; balance: number; drawdown: number }[];
  daily_profits: { date: string; profit_abs: number; profit_pct: number; trades: number }[];
  exit_reasons_breakdown: Record<string, { count: number; profit_abs: number; profit_pct: number }>;
}

export interface BalanceItem {
  currency: string;
  free: number;
  used: number;
  total: number;
  est_stake: number;
  est_usd: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  logger: string;
  message: string;
}

export interface PairMarketInfo {
  pair: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  spread: number;
  volatility: number;
  is_whitelisted: boolean;
}

export interface StrategyParamDef {
  name: string;
  description: string;
  category: 'buy' | 'sell' | 'roi' | 'stoploss';
  type: 'number' | 'boolean' | 'string';
  value: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
}
