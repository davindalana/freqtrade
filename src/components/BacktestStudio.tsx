import React, { useState } from 'react';
import { Play, Download } from 'lucide-react';
import { BacktestResult, BotConfig } from '../types/freqtrade';
import { runBacktest } from '../services/backtester';
import { sampleStrategies } from '../data/sampleData';

interface BacktestStudioProps {
  config: BotConfig;
}

export const BacktestStudio: React.FC<BacktestStudioProps> = ({ config }) => {
  const [strategy, setStrategy] = useState<string>(config.strategy);
  const [pair, setPair] = useState<string>('BTC/USDT:USDT');
  const [timeframe, setTimeframe] = useState<string>(config.timeframe);
  const [timerange, setTimerange] = useState<string>('30d');
  const [startingBalance, setStartingBalance] = useState<number>(config.dry_run_wallet);
  const [stakeAmount, setStakeAmount] = useState<number>(typeof config.stake_amount === 'number' ? config.stake_amount : 32.16);
  const [maxTrades, setMaxTrades] = useState<number>(config.max_open_trades);
  const [stoploss, setStoploss] = useState<number>(config.stoploss);
  const [trailingStop, setTrailingStop] = useState<boolean>(config.trailing_stop);

  const [roiLadder] = useState<Record<string, number>>(config.minimal_roi);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<BacktestResult | null>(() => {
    return runBacktest({
      strategy: config.strategy,
      pair: 'BTC/USDT:USDT',
      timeframe: config.timeframe,
      timerange: '30d',
      stake_amount: 32.16,
      starting_balance: config.dry_run_wallet,
      max_open_trades: config.max_open_trades,
      stoploss: config.stoploss,
      trailing_stop: config.trailing_stop,
      minimal_roi: config.minimal_roi
    });
  });

  const handleRunBacktest = () => {
    setIsRunning(true);
    setProgress(15);

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 25;
      });
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      const res = runBacktest({
        strategy,
        pair,
        timeframe,
        timerange,
        stake_amount: stakeAmount,
        starting_balance: startingBalance,
        max_open_trades: maxTrades,
        stoploss,
        trailing_stop: trailingStop,
        minimal_roi: roiLadder
      });
      setResult(res);
      setIsRunning(false);
    }, 550);
  };

  const handleExportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freqtrade_backtest_${result.strategy_name}_${result.run_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Historical Strategy Backtesting</h1>
          <p className="text-xs text-slate-400 mt-1">
            Simulate strategy execution against historical OHLCV candles with stoploss, minimal ROI ladders, and risk-adjusted metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isRunning ? `Simulating (${progress}%)...` : 'Run Backtest Simulation'}</span>
          </button>

          {result && (
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Parameter Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300">01. Strategy & Market</h3>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Strategy Class</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              {sampleStrategies.map(s => (
                <option key={s.name} value={s.name}>{s.name} ({s.timeframe})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Futures Pair</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="BTC/USDT:USDT">BTC/USDT:USDT</option>
                <option value="SOL/USDT:USDT">SOL/USDT:USDT</option>
                <option value="XRP/USDT:USDT">XRP/USDT:USDT</option>
                <option value="SUI/USDT:USDT">SUI/USDT:USDT</option>
                <option value="AVAX/USDT:USDT">AVAX/USDT:USDT</option>
                <option value="NEAR/USDT:USDT">NEAR/USDT:USDT</option>
                <option value="LINK/USDT:USDT">LINK/USDT:USDT</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Timeframe</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="15m">15m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Timerange Window</label>
            <select
              value={timerange}
              onChange={(e) => setTimerange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="180d">Last 180 Days</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300">02. Capital & Position Sizing</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Starting Capital</label>
              <input
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Stake Amount</label>
              <input
                type="number"
                step="0.01"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Max Open Trades</label>
              <input
                type="number"
                value={maxTrades}
                onChange={(e) => setMaxTrades(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Hard Stoploss Ratio</label>
              <input
                type="number"
                step="0.005"
                value={stoploss}
                onChange={(e) => setStoploss(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={trailingStop}
                onChange={(e) => setTrailingStop(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs text-slate-300">Enable Positive Trailing Stoploss</span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-300">03. Minimal ROI Ladder</h3>
            <span className="text-xs text-slate-500 font-mono">Duration → Target</span>
          </div>

          <div className="divide-y divide-slate-800 border-t border-b border-slate-800">
            {Object.entries(roiLadder).map(([minutes, target]) => (
              <div key={minutes} className="flex items-center justify-between text-xs py-2.5 font-mono tabular-nums">
                <span className="text-slate-400">After {minutes} min</span>
                <span className="text-emerald-400 font-semibold">+{(target * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500">
            Automatically closes profitable positions once the elapsed duration meets the target threshold.
          </p>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="space-y-8">
          {/* 6-Column Divided Quantitative Summary Strip */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 font-mono tabular-nums">
            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Net Profit</div>
              <div className={`text-lg font-bold mt-1 ${result.metrics.total_profit_abs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.metrics.total_profit_abs >= 0 ? '+' : ''}${result.metrics.total_profit_abs.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {result.metrics.total_profit_pct >= 0 ? '+' : ''}{result.metrics.total_profit_pct.toFixed(2)}% Return
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Win Rate</div>
              <div className="text-lg font-bold text-white mt-1">
                {result.metrics.win_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {result.metrics.winning_trades}W · {result.metrics.losing_trades}L
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Profit Factor</div>
              <div className="text-lg font-bold text-teal-400 mt-1">
                {result.metrics.profit_factor.toFixed(2)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Gross Win / Loss
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Max Drawdown</div>
              <div className="text-lg font-bold text-rose-400 mt-1">
                -{result.metrics.max_drawdown_pct.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                -${result.metrics.max_drawdown_abs.toFixed(2)} USDT
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Sharpe / Sortino</div>
              <div className="text-lg font-bold text-slate-200 mt-1">
                {result.metrics.sharpe_ratio} / {result.metrics.sortino_ratio}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Risk-Adjusted
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs text-slate-400 font-sans">Avg Duration</div>
              <div className="text-lg font-bold text-amber-400 mt-1">
                {result.metrics.avg_duration_minutes}m
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {result.metrics.total_trades} Total Trades
              </div>
            </div>
          </div>

          {/* Equity Curve SVG Graph */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Cumulative Equity Curve</h3>
              <span className="text-xs font-mono tabular-nums text-emerald-400">
                Final Balance: ${result.metrics.final_balance.toFixed(2)} USDT
              </span>
            </div>

            <div className="relative w-full h-44">
              <svg viewBox="0 0 800 160" className="w-full h-full">
                <line x1="0" y1="40" x2="800" y2="40" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="800" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="800" y2="120" stroke="#1e293b" strokeDasharray="3 3" />

                {(() => {
                  const points = result.equity_curve;
                  if (points.length < 2) return null;
                  const balances = points.map(p => p.balance);
                  const min = Math.min(...balances) * 0.995;
                  const max = Math.max(...balances) * 1.005;
                  const stepX = 800 / (points.length - 1);

                  const pathD = points.map((p, i) => {
                    const x = i * stepX;
                    const y = 150 - ((p.balance - min) / (max - min || 1)) * 130;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ');

                  const areaD = `${pathD} L 800 160 L 0 160 Z`;

                  return (
                    <>
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#equityGrad)" />
                      <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" />
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Simulated Trades Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white">
                Simulated Trade Executions ({result.trades.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono tabular-nums">
                <thead className="bg-slate-950/60 text-slate-400 font-sans border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Pair</th>
                    <th className="py-3 px-4">Open Timestamp</th>
                    <th className="py-3 px-4">Close Timestamp</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4 text-right">Entry</th>
                    <th className="py-3 px-4 text-right">Exit</th>
                    <th className="py-3 px-4 text-right">Profit %</th>
                    <th className="py-3 px-4 text-right">Profit USDT</th>
                    <th className="py-3 px-4">Exit Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {result.trades.map((t, idx) => {
                    const isProfit = t.profit_abs >= 0;
                    return (
                      <tr key={`${t.trade_id}-${t.open_timestamp}-${idx}`} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-semibold text-white font-sans">{t.pair}</td>
                        <td className="py-2.5 px-4 text-slate-400">{t.open_date.slice(5, 16).replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 text-slate-400">{t.close_date?.slice(5, 16).replace('T', ' ')}</td>
                        <td className="py-2.5 px-4 text-slate-300">{t.trade_duration}m</td>
                        <td className="py-2.5 px-4 text-right text-slate-300">${t.open_rate.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right text-slate-300">${t.close_rate?.toFixed(2)}</td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}{t.profit_pct.toFixed(2)}%
                        </td>
                        <td className={`py-2.5 px-4 text-right font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${t.profit_abs.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-300 capitalize">
                          {t.exit_reason?.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
