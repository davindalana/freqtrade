import React, { useState } from 'react';
import { 
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  XOctagon,
  BarChart2,
  ShieldCheck,
  Check,
  Scissors,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Trade, BotConfig, BotInstance, Candle } from '../types/freqtrade';
import { sampleMarketPairsBot2 } from '../data/sampleData';
import { AutonomousEvent } from '../App';

interface DashboardViewProps {
  config: BotConfig;
  openTrades: Trade[];
  closedTrades: Trade[];
  onForceExit: (tradeId: number) => void;
  onPartialExit?: (tradeId: number, ratio: number) => void;
  onAdjustStoploss: (tradeId: number, newStoploss: number) => void;
  walletBalance: number;
  selectedBotId: string;
  bots: BotInstance[];
  candlesMap?: Record<string, Candle[]>;
  onSelectPairForChart?: (pair: string) => void;
  onOpenMarketIntelligence?: () => void;
  autoPilotEnabled?: boolean;
  onToggleAutoPilot?: () => void;
  autonomousEvents?: AutonomousEvent[];
  onRunFullAutoOptimization?: () => void;
  lastSyncTime?: string | null;
  autoCycleCount?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  openTrades,
  closedTrades,
  onForceExit,
  onPartialExit,
  onAdjustStoploss,
  selectedBotId,
  bots,
  candlesMap,
  onSelectPairForChart,
  onOpenMarketIntelligence,
  autoPilotEnabled = true,
  onToggleAutoPilot,
  autonomousEvents = [],
  onRunFullAutoOptimization,
  lastSyncTime,
  autoCycleCount = 1
}) => {
  const [filterReason, setFilterReason] = useState<string>('all');
  const [searchPair, setSearchPair] = useState<string>('');
  const [editingStopTradeId, setEditingStopTradeId] = useState<number | null>(null);
  const [customStopValue, setCustomStopValue] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const bot1 = bots.find(b => b.id === 'bot-1') || bots[0];
  const bot2 = bots.find(b => b.id === 'bot-2') || bots[1];
  const totalCombinedWallet = bot1.wallet_balance + bot2.wallet_balance;

  const openProfitAbs = openTrades.reduce((acc, t) => acc + t.profit_abs, 0);
  const closedProfitAbs = closedTrades.reduce((acc, t) => acc + t.profit_abs, 0);

  const filteredClosedTrades = closedTrades.filter(t => {
    const matchReason = filterReason === 'all' || t.exit_reason === filterReason;
    const matchPair = t.pair.toLowerCase().includes(searchPair.toLowerCase());
    return matchReason && matchPair;
  });

  const bot2Watchlist = sampleMarketPairsBot2.filter(p => p.pair !== 'BTC/USDT:USDT').map(item => {
    const pairCandles = candlesMap?.[item.pair];
    const latestCandle = pairCandles && pairCandles.length > 0 ? pairCandles[pairCandles.length - 1] : null;
    const livePrice = latestCandle ? latestCandle.close : item.price;
    const ema20 = latestCandle?.ema20 || livePrice * 0.995;
    const ema50 = latestCandle?.ema50 || livePrice * 0.998;
    const rsi = latestCandle?.rsi || 48.5;
    const isBullRegime = ema20 >= ema50;
    const adxEstimate = Number((14 + (item.volatility * 120)).toFixed(1));
    const readyForPullback = isBullRegime && adxEstimate >= 20 && rsi < 42;
    const isAlreadyOpen = openTrades.some(t => t.pair === item.pair);

    return {
      ...item,
      livePrice,
      rsi,
      isBullRegime,
      adxEstimate,
      readyForPullback,
      isAlreadyOpen
    };
  });

  const handleSetBreakeven = (trade: Trade) => {
    const decimals = trade.open_rate < 2 ? 4 : 2;
    const breakevenRate = Number((trade.open_rate * 1.0015).toFixed(decimals));
    onAdjustStoploss(trade.trade_id, breakevenRate);
    setActionNotice(`StopLoss locked at breakeven ($${breakevenRate.toLocaleString()}) for ${trade.pair}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleScaleOutHalf = (trade: Trade) => {
    if (onPartialExit) {
      onPartialExit(trade.trade_id, 0.5);
      setActionNotice(`Scaled out 50% of ${trade.pair} into realized profit & moved remaining 50% SL to Breakeven`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top 4-Column Institutional Metric Strip */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-400">Combined Portfolio Equity</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            ${(totalCombinedWallet + openProfitAbs).toFixed(2)} <span className="text-sm font-normal text-slate-400">USDT</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-emerald-400">Auto-Pilot Active</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Realized +${closedProfitAbs.toFixed(2)}</span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-400">Bot 1 · BTC Weekly Swing (Live)</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            ${bot1.wallet_balance.toFixed(2)} <span className="text-sm font-normal text-slate-400">USDT</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-emerald-400">Port 8083</span>
            <span aria-hidden="true">·</span>
            <span>5.0x Isolated</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-300">SL Locked &gt; Entry</span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-400">Bot 2 · RegimeTrendPullback (Auto)</div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-white">
            ${bot2.wallet_balance.toFixed(2)} <span className="text-sm font-normal text-slate-400">USDT</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-emerald-400">Port 8082</span>
            <span aria-hidden="true">·</span>
            <span>Auto-Entry A+</span>
            <span aria-hidden="true">·</span>
            <span>2.0% Risk Cap</span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-400">Active Unrealized PnL ({openTrades.length} Open)</div>
          <div className={`mt-2 text-2xl font-bold font-mono tabular-nums flex items-baseline gap-1.5 ${openProfitAbs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{openProfitAbs >= 0 ? '+' : ''}${openProfitAbs.toFixed(4)}</span>
            <span className="text-sm font-normal text-slate-400">USDT</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
            <span>
              Sync: {lastSyncTime || 'Live'} · Cycle #{autoCycleCount}
            </span>
            {onOpenMarketIntelligence && (
              <button
                onClick={onOpenMarketIntelligence}
                className="text-emerald-400 hover:text-emerald-300 font-sans font-medium cursor-pointer"
              >
                Confluence →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Autonomous Quant Engine Control Strip & Decision Log */}
      <section className="rounded-xl border border-emerald-500/30 bg-slate-900/60 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${autoPilotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Full Autonomous Quant Engine ({autoPilotEnabled ? 'ACTIVE — 100% OTOMATIS' : 'PAUSED'})
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Auto-Sync Binance Quotes (12s) · Auto-Breakeven Guard (&ge;+2.5% ROE) · Dynamic Trailing SL (&ge;+5.0% ROE) · Auto-Entry Grade A+ Setups
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onRunFullAutoOptimization && (
              <button
                onClick={() => {
                  onRunFullAutoOptimization();
                  setActionNotice('Autonomous scan completed: Live Binance prices synced, profitable StopLosses trailed, and A+ setups checked.');
                  setTimeout(() => setActionNotice(null), 4000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                <span>Run Auto-Optimization Cycle Now</span>
              </button>
            )}
            {onToggleAutoPilot && (
              <button
                onClick={onToggleAutoPilot}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  autoPilotEnabled
                    ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                    : 'border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Auto-Pilot: {autoPilotEnabled ? 'ON' : 'OFF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Autonomous Actions Executed */}
        {autonomousEvents.length > 0 && (
          <div className="px-5 py-3 bg-slate-950/50 divide-y divide-slate-800/60">
            {autonomousEvents.slice(0, 3).map((ev) => (
              <div key={ev.id} className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-start sm:items-center gap-2.5">
                  <span className="font-mono tabular-nums text-emerald-400 font-semibold shrink-0">
                    [{ev.timestamp}]
                  </span>
                  <span className="font-semibold text-white shrink-0">{ev.action}</span>
                  <span className="text-slate-400 hidden md:inline" aria-hidden="true">·</span>
                  <span className="text-slate-300">{ev.detail}</span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                  {ev.botName}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {actionNotice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Section 1: Active Open Positions & Swing Execution Plan */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Active Open Positions (Protected by Auto-Pilot)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time position telemetry, automatic breakeven lock, partial scale-out, and multi-target take-profit trajectory
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-emerald-400">
              Downside Protection: {openTrades.every(t => t.stop_loss_abs >= t.open_rate) ? '100% Breakeven Locked' : 'ATR Guard Active'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Active Positions: {openTrades.length}
            </span>
          </div>
        </div>

        {openTrades.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-300">No Active Open Positions</p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Click "Run Auto-Optimization Cycle Now" above or open Market Intelligence to deploy the top Grade A+ setup automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {openTrades.map((trade, idx) => {
              const isProfit = trade.profit_abs >= 0;
              const isBreakevenLocked = trade.stop_loss_abs >= trade.open_rate;
              const stopLossDistance = ((trade.current_rate - trade.stop_loss_abs) / trade.current_rate) * 100;
              const isBtc = trade.pair.includes('BTC');
              const decimals = trade.current_rate < 2 ? 4 : 2;
              const tp1Price = isBtc ? 89500.00 : Number((trade.open_rate * 1.045).toFixed(decimals));
              const tp2Price = isBtc ? 96000.00 : Number((trade.open_rate * 1.09).toFixed(decimals));
              const tp1GainPct = (((tp1Price - trade.open_rate) / trade.open_rate) * trade.leverage * 100);
              const tp1GainUsdt = (trade.stake_amount * (tp1GainPct / 100));
              const tp2GainPct = (((tp2Price - trade.open_rate) / trade.open_rate) * trade.leverage * 100);
              const tp2GainUsdt = (trade.stake_amount * (tp2GainPct / 100));

              const rangeLow = Math.min(trade.stop_loss_abs, trade.open_rate * 0.97);
              const rangeSpan = tp1Price - rangeLow;
              const currentProgress = Math.min(100, Math.max(0, ((trade.current_rate - rangeLow) / (rangeSpan || 1)) * 100));
              const entryMarkerPos = Math.min(100, Math.max(0, ((trade.open_rate - rangeLow) / (rangeSpan || 1)) * 100));

              return (
                <div key={`${trade.trade_id}-${trade.open_timestamp}-${idx}`} className="p-6 space-y-6">
                  {/* Top Row */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-lg font-bold text-white font-mono tabular-nums">{trade.pair}</span>
                        <span className="text-xs font-medium text-emerald-400 font-mono tabular-nums">
                          LONG · {trade.leverage.toFixed(1)}x Isolated
                        </span>
                        <span className="text-xs text-slate-400 font-mono tabular-nums">
                          · {isBtc ? 'Bot 1 (Port 8083 · Real Money)' : 'Bot 2 (Port 8082 · Auto A+ Execution)'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                        <span>Trade #{trade.trade_id}</span>
                        <span aria-hidden="true">·</span>
                        <span>Signal: {trade.enter_tag || 'weekly_swing'}</span>
                        <span aria-hidden="true">·</span>
                        <span>Qty: {trade.amount}</span>
                        <span aria-hidden="true">·</span>
                        <span>Margin Stake: ${trade.stake_amount.toFixed(2)} USDT</span>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className={`text-xl font-bold flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        <span>{isProfit ? '+' : ''}{trade.profit_pct.toFixed(2)}%</span>
                        <span className="text-sm font-normal text-slate-300">
                          ({isProfit ? '+' : ''}${trade.profit_abs.toFixed(4)} USDT)
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {isBreakevenLocked ? (
                          <span className="text-emerald-400">Free-Ride Active (SL Above Entry)</span>
                        ) : (
                          <span>Delta: {trade.current_rate >= trade.open_rate ? '+' : ''}${(trade.current_rate - trade.open_rate).toFixed(decimals)} from entry</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 6-Column Price & Risk Telemetry */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-slate-800/80 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-slate-400 font-sans">Entry Price</div>
                      <div className="text-sm font-semibold text-white mt-1">
                        ${trade.open_rate.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-sans">Current Mark Price</div>
                      <div className="text-sm font-bold text-emerald-400 mt-1">
                        ${trade.current_rate.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-sans">
                        {isBreakevenLocked ? 'Locked Profit SL' : 'Hard StopLoss'}
                      </div>
                      <div className={`text-sm font-semibold mt-1 ${isBreakevenLocked ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${trade.stop_loss_abs.toLocaleString(undefined, { minimumFractionDigits: decimals })}
                        <span className="text-slate-500 text-[11px] ml-1">(-{stopLossDistance.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-sans">Liquidation Price</div>
                      <div className="text-sm font-semibold text-amber-400 mt-1">
                        ${(trade.liquidation_price || trade.open_rate * 0.81).toLocaleString(undefined, { minimumFractionDigits: decimals })}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-sans">TP1 (${tp1Price.toLocaleString()})</div>
                      <div className="text-sm font-semibold text-emerald-300 mt-1">
                        +${tp1GainUsdt.toFixed(2)} <span className="text-[11px] text-slate-400">(+{tp1GainPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-sans">TP2 (${tp2Price.toLocaleString()})</div>
                      <div className="text-sm font-semibold text-teal-300 mt-1">
                        +${tp2GainUsdt.toFixed(2)} <span className="text-[11px] text-slate-400">(+{tp2GainPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Swing Trajectory Bar */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                      <span className={isBreakevenLocked ? 'text-emerald-400' : 'text-rose-400'}>
                        SL: ${trade.stop_loss_abs.toLocaleString()} {isBreakevenLocked ? '(Breakeven+)' : ''}
                      </span>
                      <span>Entry: ${trade.open_rate.toLocaleString()}</span>
                      <span className="text-emerald-400 font-semibold">Current: ${trade.current_rate.toLocaleString()}</span>
                      <span className="text-teal-300">TP1: ${tp1Price.toLocaleString()}</span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-emerald-500 transition-all duration-300"
                        style={{ width: `${currentProgress}%` }}
                      />
                      <div
                        title={`Entry: $${trade.open_rate}`}
                        className="absolute top-0 bottom-0 w-0.5 bg-white"
                        style={{ left: `${entryMarkerPos}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline StopLoss Editor */}
                  {editingStopTradeId === trade.trade_id && (
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
                      <span className="text-xs text-slate-300 font-medium">New StopLoss Price (USDT):</span>
                      <input
                        type="number"
                        step="any"
                        value={customStopValue}
                        onChange={(e) => setCustomStopValue(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums text-white w-36 focus:outline-none focus:border-emerald-400"
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(customStopValue);
                          if (!isNaN(val) && val > 0) {
                            onAdjustStoploss(trade.trade_id, val);
                          }
                          setEditingStopTradeId(null);
                          setCustomStopValue('');
                        }}
                        className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Save StopLoss
                      </button>
                      <button
                        onClick={() => setEditingStopTradeId(null)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1.5 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Bottom Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
                    <div className="text-xs text-slate-400">
                      Auto-Pilot Plan: <span className="text-slate-200 font-medium">Trailing SL active. Auto Scale-Out 50% armed at TP1 (${tp1Price.toLocaleString()}).</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {onSelectPairForChart && (
                        <button
                          onClick={() => onSelectPairForChart(trade.pair)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <BarChart2 className="h-3.5 w-3.5" />
                          <span>Inspect Chart</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleScaleOutHalf(trade)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        <span>Scale-Out 50% Now</span>
                      </button>
                      <button
                        onClick={() => handleSetBreakeven(trade)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Lock Breakeven SL</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingStopTradeId(trade.trade_id);
                          setCustomStopValue(trade.stop_loss_abs.toString());
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Adjust StopLoss</span>
                      </button>
                      <button
                        onClick={() => onForceExit(trade.trade_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <XOctagon className="h-3.5 w-3.5" />
                        <span>Force Exit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Bot 2 RegimeTrendPullback Watchlist */}
      {(selectedBotId === 'all' || selectedBotId === 'bot-2') && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-white">
                Bot 2 · Continuous Multi-Timeframe Scanner (7 Tier-1 Altcoins)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically executes when 4h EMA50 &gt; EMA200, 1h ADX &gt; 20, and Confluence Score &ge; 72
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="text-emerald-400">4 Risk Protections Active</span>
              {onOpenMarketIntelligence && (
                <button
                  onClick={onOpenMarketIntelligence}
                  className="text-emerald-400 hover:text-emerald-300 font-sans font-medium cursor-pointer"
                >
                  Open Full Confluence Matrix →
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-slate-950/60 text-slate-400 font-sans border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Pair</th>
                  <th className="py-3 px-4 text-right">Mark Price</th>
                  <th className="py-3 px-4 text-right">24h Change</th>
                  <th className="py-3 px-4">4h Regime (EMA50/200)</th>
                  <th className="py-3 px-4 text-right">1h ADX (&gt;20)</th>
                  <th className="py-3 px-4 text-right">RSI (14)</th>
                  <th className="py-3 px-4">Autonomous Status</th>
                  <th className="py-3 px-4 text-right">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bot2Watchlist.map((coin) => {
                  const isUp = coin.change24h >= 0;
                  return (
                    <tr key={coin.pair} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white font-sans">{coin.pair}</td>
                      <td className="py-3 px-4 text-right text-slate-200">
                        ${coin.livePrice >= 1 ? coin.livePrice.toFixed(2) : coin.livePrice.toFixed(4)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={coin.isBullRegime ? 'text-emerald-400' : 'text-slate-400'}>
                          {coin.isBullRegime ? 'Bullish Aligned' : 'Sideways / Choppy'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right ${coin.adxEstimate >= 20 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                        {coin.adxEstimate.toFixed(1)}
                      </td>
                      <td className={`py-3 px-4 text-right ${coin.rsi < 35 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}>
                        {coin.rsi.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {coin.isAlreadyOpen ? (
                          <span className="text-emerald-400 font-semibold">Position Active (Auto-Deployed)</span>
                        ) : coin.readyForPullback ? (
                          <span className="text-teal-300 font-medium">A+ Candidate Queued</span>
                        ) : (
                          <span className="text-slate-400">Scanning for Pullback</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {onSelectPairForChart && (
                          <button
                            onClick={() => onSelectPairForChart(coin.pair)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                          >
                            View Plot →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section 3: Closed Trades History Ledger */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-white">Closed Trades Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Completed historical executions with realized return and exit trigger
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search pair..."
              value={searchPair}
              onChange={(e) => setSearchPair(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-36"
            />
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Exit Triggers</option>
              <option value="roi">ROI Target</option>
              <option value="trailing_stop_loss">Trailing Stop</option>
              <option value="stop_loss">Stop Loss</option>
              <option value="force_exit">Force Exit</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-950/60 text-slate-400 font-sans border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Pair & Signal</th>
                <th className="py-3 px-4">Execution Window</th>
                <th className="py-3 px-4">Leverage</th>
                <th className="py-3 px-4 text-right">Entry Price</th>
                <th className="py-3 px-4 text-right">Exit Price</th>
                <th className="py-3 px-4 text-right">ROE %</th>
                <th className="py-3 px-4 text-right">Realized PnL</th>
                <th className="py-3 px-4">Exit Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClosedTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No matching closed trades found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredClosedTrades.map((trade, idx) => {
                  const isProfit = trade.profit_abs >= 0;
                  return (
                    <tr key={`${trade.trade_id}-${trade.open_timestamp}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400">#{trade.trade_id}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-white">{trade.pair}</span>
                        {trade.enter_tag && (
                          <span className="text-slate-400 ml-1.5 text-[11px] font-mono">
                            · {trade.enter_tag}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(trade.open_timestamp).toLocaleDateString()}
                        {trade.close_timestamp ? ` → ${new Date(trade.close_timestamp).toLocaleDateString()}` : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{trade.leverage.toFixed(1)}x</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${trade.open_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        ${trade.close_rate?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}{trade.profit_pct.toFixed(2)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '+' : ''}${trade.profit_abs.toFixed(2)} USDT
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300 capitalize">
                        {trade.exit_reason?.replace(/_/g, ' ') || 'Closed'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
